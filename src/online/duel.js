/* ---------- live 1v1 race with a friend ----------
   Host makes a room code, the friend joins with the code or a link, the host presses Start. Both phones then build the same
   seeded crowd and send each other their position ten times a second. Nothing is stored; the room disappears when both leave. */
import { LEVELS, LV, setLevel } from '../config/levels.js';
import { $ } from '../dom.js';
import { LOOK, LOOK_OPTS } from '../save/progress.js';
import { store } from '../save/store.js';
import { start, toMenu } from '../sim/game.js';
import { S } from '../sim/state.js';
import { go, back } from '../ui/screens.js';
import { createRoom, cleanCode, makeCode } from './room.js';
import { createRemote } from './remote.js';
import { createBoard } from './board.js';

const URL = 'https://hrsbzntphratlnkrevet.supabase.co';
const KEY = 'sb_publishable_FoFHiii4XagCq3-oi3ygQg_UcyZNoJn';

/* ---- what we accept from the other phone: never trust it ---- */
const HEX = /^#[0-9a-f]{6}$/i;
export function cleanLook(raw) {
  const out = {}, src = raw && typeof raw === 'object' ? raw : {};
  for (const o of LOOK_OPTS) {
    const v = src[o.key];
    if (o.type === 'color') out[o.key] = typeof v === 'string' && HEX.test(v) ? v : (typeof o.vals[0] === 'string' ? o.vals[0] : o.vals[0].c);
    else { const ok = o.vals.map(x => x[0]); out[o.key] = ok.includes(v) ? v : ok[0]; }
  }
  return out;
}
export function cleanName(raw) {
  const s = typeof raw === 'string' ? raw.replace(/[^\p{L}\p{N} ._'-]/gu, '').trim().slice(0, 24) : '';
  return s || 'Friend';
}
// a number within a sane range, or null: out-of-range reports are thrown away, not trimmed
const num = (v, lim) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? v : null);

/* ---- one race at a time ---- */
let room = null, role = null, code = '', friend = null, levelIdx = 0, helloTimer = null, raceNo = 0;
let wantMe = false, wantThem = false, friendGone = false;   // rematch: both have to ask
let net = null;   // the running race's link, same object as S.duel
const ui = { status: () => {}, ready: () => {} };
let roomFactory = opts => createRoom({ WebSocket: window.WebSocket, url: URL, key: KEY, ...opts });
export const useRoomFactory = f => { roomFactory = f; };

const myName = () => { try { return createBoard({ fetch: () => Promise.reject(), url: URL, key: KEY, store }).playerName(); } catch (e) { return 'Racer'; } };

export function startDuel({ seed, level, friend: f, send }) {
  setLevel(level);
  const d = { refresh: showRematch, seed, name: cleanName(f.name), look: cleanLook(f.look), send, remote: createRemote(), n: 0, sendT: 0, fin: null, bye: false };
  net = d;
  start('race', null, { duel: d });
  return d;
}

// Messages from the friend's phone while racing.
export function duelReceive(ev, data) {
  const d = S && S.duel; if (!d) return;
  if (ev === 'pos') {
    if (!data || typeof data !== 'object') return;
    const n = num(data.n, 1e9), x = num(data.x, 20), z = num(data.z, LV.goal + 20), vx = num(data.vx, 20), s = num(data.s, 20);
    if ([n, x, z, vx, s].some(v => v === null)) return;
    d.remote.push({ n, x, z, vx, s: Math.max(0, s) }, S.clock);
  } else if (ev === 'fin') {
    const ft = data && num(data.ft, 3600);
    if (ft !== null && ft > 0) d.fin = ft;
  } else if (ev === 'bye') d.bye = true;
}

/* ---- the room before the race ---- */
function closeRoom() {
  wantMe = wantThem = friendGone = false;
  if (helloTimer) { clearInterval(helloTimer); helloTimer = null; } if (room) { try { room.send('bye', {}); } catch (e) {} room.leave(); } room = null; friend = null; role = null; code = ''; }

function onMessage(ev, data) {
  if (ev === 'hello') {
    const first = !friend;
    friend = { name: cleanName(data && data.name), look: cleanLook(data && data.look) };
    if (first) { sayHello(); if (role === 'host') ui.ready(friend.name); else ui.status('Connected to ' + friend.name + '. Waiting for them to start.'); }
  } else if (ev === 'rematch') { wantThem = true; maybeRematch(); showRematch();
  } else if (ev === 'bye') { friendGone = true; wantThem = false; showRematch(); duelReceive(ev, data);
  } else if (ev === 'start' && role === 'guest' && friend && (wantMe || !racing())) {
    if (!data || typeof data.seed !== 'string' || !Number.isInteger(data.level) || !LEVELS[data.level]) return;
    beginRace(data.level, data.seed.slice(0, 40));
  } else if (ev === 'start' && role === 'host') { /* ignore */ }
  else duelReceive(ev, data);
}
// a race is running right now (not finished, not in the lobby)
const racing = () => !!(S && S.duel && S.race && !S.race.finished);
const sayHello = () => room && room.send('hello', { name: myName(), look: LOOK });

function beginRace(level, seed) {
  wantMe = wantThem = false;
  startDuel({ seed, level, friend, send: (ev, d) => { if (room) room.send(ev, d); } });
}

async function connect(c, r) {
  closeRoom();
  room = roomFactory(); role = r; code = c;
  room.onMessage(onMessage);
  room.onClose(() => { if (room) { ui.status('Connection lost.'); if (S && S.duel) S.duel.bye = true; } });
  await room.join(c);
  // keep saying hello until the other phone answers (they may join a moment later)
  sayHello();
  helloTimer = setInterval(() => { if (friend) { clearInterval(helloTimer); helloTimer = null; } else sayHello(); }, 2000);
}

export async function hostRoom(level) {
  levelIdx = level;
  ui.status('Making a room...');
  try { await connect(makeCode(), 'host'); } catch (e) { ui.status('Could not connect. Check your internet and try again.'); return null; }
  ui.status('Waiting for your friend...');
  return code;
}
export async function joinRoom(c) {
  c = cleanCode(c); if (c.length !== 4) { ui.status('Type the 4 letter code.'); return false; }
  ui.status('Joining ' + c + '...');
  try { await connect(c, 'guest'); } catch (e) { ui.status('Could not connect. Check the code and your internet.'); return false; }
  ui.status('Joined. Waiting for your friend...');
  return true;
}
// After a race both players press Rematch; the host then starts a new race on the same stage.
export const rematchState = () => (!room || !friend || friendGone ? 'gone' : wantMe && wantThem ? 'starting' : wantMe ? 'waiting' : wantThem ? 'asked' : 'idle');
function showRematch() {
  const b = $('again'); if (!b || !S || !S.duel) return;
  const st = rematchState();
  b.textContent = st === 'gone' ? 'Friend left' : st === 'waiting' ? 'Waiting for friend...' : st === 'asked' ? 'Accept rematch' : 'Rematch';
  b.disabled = st === 'gone' || st === 'waiting' || st === 'starting';
}
function maybeRematch() {
  if (role === 'host' && wantMe && wantThem && friend && !friendGone) { const seed = code + ':' + (++raceNo); room.send('start', { level: levelIdx, seed }); beginRace(levelIdx, seed); }
}
export function requestRematch() {
  if (!room || !friend || friendGone || wantMe) return;
  wantMe = true; room.send('rematch', {}); maybeRematch(); showRematch();
}
export function hostStart() {
  if (role !== 'host' || !friend || !room) return;
  const seed = code + ':' + (++raceNo);
  room.send('start', { level: levelIdx, seed });
  beginRace(levelIdx, seed);
}
export function leaveRoom() { closeRoom(); }
export const inviteLink = () => location.origin + location.pathname + '?room=' + code;
export const roomCode = () => code;
export { ui as duelUi };
