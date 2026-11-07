/* ---------- live race with 1 to 7 friends (a room of up to 8 phones) ----------
   The host makes a room code, friends join with the code or a link, the host presses Start. All phones then build the same
   seeded crowd and send each other their position several times a second. Nothing is stored; the room disappears when everyone leaves.
   Every message carries the sender's id. Only the host's roster and start messages count, and anything from an unknown id is ignored. */
import { LEVELS, LV, setLevel } from '../config/levels.js';
import { $ } from '../dom.js';
import { LOOK, LOOK_OPTS } from '../save/progress.js';
import { store } from '../save/store.js';
import { start, syncDuelPause } from '../sim/game.js';
import { S, state } from '../sim/state.js';
import { packGhost, saveFriendGhost } from '../sim/ghostshare.js';
import { createRoom, cleanCode, makeCode } from './room.js';
import { createRemote } from './remote.js';
import { createBoard } from './board.js';

const URL = 'https://hrsbzntphratlnkrevet.supabase.co';
const KEY = 'sb_publishable_FoFHiii4XagCq3-oi3ygQg_UcyZNoJn';

/* ---- what we accept from the other phones: never trust it ---- */
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
const cleanId = v => (typeof v === 'string' && /^[a-z0-9]{4,12}$/.test(v) ? v : null);
const newId = () => { let s = ''; while (s.length < 8) s += Math.random().toString(36).slice(2); return s.slice(0, 8); };
// a number within a sane range, or null: out-of-range reports are thrown away, not trimmed
const num = (v, lim) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= lim ? v : null);

/* ---- room state ---- */
export const MAX_PLAYERS = 8;
// Phones slow a page's timers right down when you switch apps (say, to copy the code), so "silent" has to mean a long time.
const KEEPALIVE_MS = 2000, STALE_MS = 30000, JOIN_WAIT_MS = 6000;

let room = null, role = null, code = '', levelIdx = 0, tick = null, raceNo = 0;
let myId = '', hostId = '', roster = [];        // roster: [{ id, name, look }], the host first, me included
let inRoster = false, raced = false, hostGone = false, lastStatus = '', joinWaiter = null;
let wantMe = false; const wants = new Set();    // rematch: everyone still in the room has to ask
const seenAt = {};                              // id -> last time we heard from them (ms)
const ui = { status: () => {}, roster: () => {} };
const say = t => { lastStatus = t; ui.status(t); };
let roomFactory = opts => createRoom({ WebSocket: window.WebSocket, url: URL, key: KEY, ...opts });
export const useRoomFactory = f => { roomFactory = f; };

const myName = () => { try { return createBoard({ fetch: () => Promise.reject(), url: URL, key: KEY, store }).playerName(); } catch (e) { return 'Racer'; } };
const others = () => roster.filter(p => p.id !== myId);

/* ---- ghosts: friends in a room swap their best runs for the stage, and keep them on their own phone (nothing goes to a server) ---- */
function sendMyGhosts(level) {
  const L = LEVELS[level]; if (!L || !room) return;
  for (const kind of ['classic', 'race']) {
    let pts = null; try { pts = JSON.parse(store.get((kind === 'race' ? 'excuseme_ghost_race_' : 'excuseme_ghost_') + L.id, 'null')); } catch (e) {}
    const g = packGhost(pts); if (g) room.send('ghost', { id: myId, kind, level, ghost: g });
  }
}
function receiveGhost(from, data) {
  const p = from && roster.find(r => r.id === from);   // only people in this room; their name comes from the room list
  if (!p || !LEVELS[data.level] || (data.kind !== 'classic' && data.kind !== 'race')) return;
  saveFriendGhost(store, data.kind, LEVELS[data.level].id, p.name, data.ghost);
}

/* ---- one race at a time ---- */
export function startDuel({ seed, level, friends, friend, send, roster: ids, meId }) {
  setLevel(level);
  const list = friends || (friend ? [{ id: 'friend', ...friend }] : []);
  const peers = {}, order = [];
  for (const f of list) { peers[f.id] = { name: cleanName(f.name), look: cleanLook(f.look), remote: createRemote(), fin: null, bye: false }; order.push(f.id); }
  const names = order.map(i => peers[i].name);
  // start line: the room list says who stands where (me first when no list is given)
  const lineUp = ids && ids.length ? ids : ['me', ...order], slotOf = {};
  lineUp.forEach((id, i) => { slotOf[id === meId ? 'me' : id] = i; });
  // ten reports a second for one friend; five with more (measured 2026-11-07: a full room of 8 at 5 a second lost nothing on the free plan)
  const d = { pausers: new Set(), pauseSeq: 0, refresh: showRematch, seed, peers, order, slotOf, meId: meId || 'me', count: lineUp.length, title: names.length === 1 ? names[0] : names.length + ' friends', send, n: 0, sendT: 0, sendEvery: order.length > 1 ? 0.2 : 0.1 };
  start('race', null, { duel: d });
  return d;
}

// Messages from the other phones while racing. The sender's id picks whose runner it is.
export function duelReceive(ev, data) {
  const d = S && S.duel; if (!d || !data || typeof data !== 'object') return;
  const id = cleanId(data.id) || (d.order.length === 1 ? d.order[0] : null), P = id && d.peers[id];
  if (!P) return;
  if (ev === 'pause') {
    if (data.seed !== d.seed || !Number.isInteger(data.n) || data.n < 0 || data.n <= (P.pauseSeq ?? -1) || typeof data.paused !== 'boolean' || P.bye) return;
    P.pauseSeq = data.n;
    if (data.paused) d.pausers.add(id); else d.pausers.delete(id);
    syncDuelPause();
  } else if (ev === 'pos') {
    const n = num(data.n, 1e9), x = num(data.x, 20), z = num(data.z, LV.goal + 20), vx = num(data.vx, 20), s = num(data.s, 20);
    if ([n, x, z, vx, s].some(v => v === null)) return;
    P.remote.push({ n, x, z, vx, s: Math.max(0, s) }, S.clock);
  } else if (ev === 'fin') {
    const ft = num(data.ft, 3600);
    if (ft !== null && ft > 0) P.fin = ft;
  } else if (ev === 'bye') { P.bye = true; d.pausers.delete(id); syncDuelPause(); }
}

/* ---- the room before the race ---- */
function closeRoom() {
  if (tick) { clearInterval(tick); tick = null; }
  if (room) { try { room.send('bye', { id: myId }); } catch (e) {} room.leave(); }
  room = null; role = null; code = ''; hostId = ''; myId = ''; roster = []; inRoster = false; raced = false; hostGone = false; wantMe = false; wants.clear();
  for (const k in seenAt) delete seenAt[k];
  if (joinWaiter) { const w = joinWaiter; joinWaiter = null; w(false); }
  ui.roster([]);
}
const sendRoster = () => room && room.send('roster', { id: myId, level: levelIdx, players: roster });
const changed = () => { ui.roster(lobbyPlayers()); showRematch(); };

function onMessage(ev, data) {
  if (!data || typeof data !== 'object') data = {};
  const from = cleanId(data.id);
  if (from && from === myId) return;
  if (from) seenAt[from] = Date.now();
  if (ev === 'hello') {
    if (role !== 'host' || !from) return;
    if (roster.some(p => p.id === from)) return;   // already in: this was only a keepalive
    if (roster.length >= MAX_PLAYERS || raced) { room.send('full', { id: myId, to: from, why: raced ? 'started' : 'full' }); return; }
    roster.push({ id: from, name: cleanName(data.name), look: cleanLook(data.look) });
    sendRoster(); changed();
  } else if (ev === 'roster') {
    if (role !== 'guest' || !from || (hostId && from !== hostId)) return;
    const players = (Array.isArray(data.players) ? data.players : []).slice(0, MAX_PLAYERS)
      .map(p => ({ id: cleanId(p && p.id), name: cleanName(p && p.name), look: cleanLook(p && p.look) })).filter(p => p.id);
    if (!players.length || players[0].id !== from) return;
    if (!players.some(p => p.id === myId)) { if (inRoster) { closeRoom(); say('You were removed from the room.'); } return; }
    if (raced) for (const p of roster) if (!players.some(next => next.id === p.id)) duelReceive('bye', { id: p.id });
    hostId = from; roster = players; inRoster = true; hostGone = false;
    if (Number.isInteger(data.level) && LEVELS[data.level]) levelIdx = data.level;
    for (const id of [...wants]) if (!roster.some(p => p.id === id)) wants.delete(id);
    if (joinWaiter) { const w = joinWaiter; joinWaiter = null; w(true); }
    changed();
  } else if (ev === 'full') {
    if (role === 'guest' && !inRoster && data.to === myId && joinWaiter) {
      const w = joinWaiter; joinWaiter = null;
      say(data.why === 'started' ? 'That room already started a race. Ask the host for a new room.' : 'That room is full (' + MAX_PLAYERS + ' players).'); w(false);
    }
  } else if (ev === 'rematch') {
    if (!from || !roster.some(p => p.id === from)) return;
    wants.add(from); maybeRematch(); changed();
  } else if (ev === 'bye') {
    if (!from) return;
    if (from === hostId && role === 'guest') {
      if (!raced) { closeRoom(); say('The host left the room.'); return; }
      hostGone = true;
    }
    roster = roster.filter(p => p.id !== from); wants.delete(from);
    duelReceive(ev, data);
    if (role === 'host') { sendRoster(); maybeRematch(); }
    changed();
  } else if (ev === 'start') {
    if (role !== 'guest' || from !== hostId || !inRoster || (raced && !wantMe)) return;
    if (typeof data.seed !== 'string' || !Number.isInteger(data.level) || !LEVELS[data.level]) return;
    beginRace(data.level, data.seed.slice(0, 40));
  } else if (ev === 'ghost') receiveGhost(from, data);
  else duelReceive(ev, data);
}
export const injectRoomMessage = onMessage;

function beginRace(level, seed) {
  wantMe = false; wants.clear(); raced = true;
  const id = myId;
  startDuel({ seed, level, friends: others(), roster: roster.map(p => p.id), meId: id, send: (ev, d) => { if (room) room.send(ev, { id, ...d }); } });
  sendMyGhosts(level);
  changed();
}

// Every 2 seconds: guests say hello (join retry and keepalive); the host sends the roster and drops phones that went quiet.
function heartbeat() {
  if (!room) return;
  const now = Date.now();
  // Repeat each racer's own pause vote with its sequence number, so one lost message cannot leave the room running or stuck.
  if (raced && S?.duel && (state === 'play' || state === 'paused')) room.send('pause', { id: myId, seed: S.duel.seed, n: S.duel.pauseSeq, paused: S.duel.pausers.has(myId) });
  if (role === 'guest') {
    room.send('hello', { id: myId, name: myName(), look: LOOK });
    if (inRoster && !hostGone && seenAt[hostId] && now - seenAt[hostId] > STALE_MS) {
      if (!raced) { closeRoom(); say('Lost contact with the host.'); } else { hostGone = true; duelReceive('bye', { id: hostId }); changed(); }
    }
  } else if (role === 'host') {
    const gone = others().filter(p => seenAt[p.id] && now - seenAt[p.id] > STALE_MS);
    if (gone.length) { for (const p of gone) duelReceive('bye', { id: p.id }); roster = roster.filter(p => !gone.includes(p)); for (const p of gone) wants.delete(p.id); maybeRematch(); changed(); }
    if (roster.length > 1) sendRoster();
  }
}

async function connect(c, r) {
  closeRoom();
  room = roomFactory(); role = r; code = c; myId = newId();
  room.onMessage(onMessage);
  room.onClose(() => { if (!room) return; say('Connection lost.'); if (S && S.duel) for (const k of S.duel.order) duelReceive('bye', { id: k }); });
  await room.join(c);
  tick = setInterval(heartbeat, KEEPALIVE_MS); if (tick && tick.unref) tick.unref();
  if (r === 'guest') room.send('hello', { id: myId, name: myName(), look: LOOK });
}

export async function hostRoom(level) {
  levelIdx = level;
  say('Making a room...');
  try { await connect(makeCode(), 'host'); } catch (e) { closeRoom(); say('Could not connect. Check your internet and try again.'); return null; }
  roster = [{ id: myId, name: myName(), look: LOOK }]; hostId = myId; inRoster = true;
  say('Waiting for friends to join...'); changed();
  return code;
}
export async function joinRoom(c) {
  c = cleanCode(c); if (c.length !== 4) { say('Type the 4 letter code.'); return false; }
  say('Joining ' + c + '...');
  try { await connect(c, 'guest'); } catch (e) { closeRoom(); say('Could not connect. Check the code and your internet.'); return false; }
  const ok = await new Promise(resolve => {
    joinWaiter = resolve;
    const t = setTimeout(() => { if (joinWaiter === resolve) { joinWaiter = null; say('Nobody answered. Check the code and try again.'); resolve(false); } }, JOIN_WAIT_MS);
    if (t && t.unref) t.unref();
  });
  if (!ok) { const keep = lastStatus; closeRoom(); say(keep); return false; }
  return true;   // the roster screen shows the stage and who is in
}

export const lobbyPlayers = () => (room && inRoster ? roster.map(p => ({ id: p.id, name: p.name, look: p.look, me: p.id === myId, host: p.id === hostId })) : []);
export const lobbyStatus = () => lastStatus;
export const roomLevel = () => levelIdx;
// The host can change the stage any time before Start; everyone sees it on the next roster.
export function setRoomLevel(i) { if (role !== 'host' || !room || raced || !LEVELS[i]) return; levelIdx = i; sendRoster(); changed(); }
export const isHost = () => role === 'host';

// After a race everyone presses Rematch; the host then starts a new race on the same stage.
export function rematchCounts() { const o = others(); return { asked: o.filter(p => wants.has(p.id)).length, total: o.length }; }
export function rematchState() {
  const { asked, total } = rematchCounts();
  if (!room || !total || hostGone) return 'gone';
  if (wantMe && asked === total) return 'starting';
  return wantMe ? 'waiting' : asked > 0 ? 'asked' : 'idle';
}
function showRematch() {
  const b = $('again'); if (!b || !S || !S.duel) return;
  const st = rematchState(), c = rematchCounts();
  b.textContent = st === 'gone' ? (hostGone ? 'Host left' : 'Everyone left') : st === 'waiting' ? 'Waiting for others (' + (c.asked + 1) + '/' + (c.total + 1) + ')' : st === 'asked' ? 'Accept rematch' : 'Rematch';
  b.disabled = st === 'gone' || st === 'waiting' || st === 'starting';
}
function maybeRematch() {
  const o = others();
  if (role === 'host' && room && wantMe && o.length && o.every(p => wants.has(p.id))) {
    const seed = code + ':' + (++raceNo);
    room.send('start', { id: myId, level: levelIdx, seed }); beginRace(levelIdx, seed);
  }
}
export function requestRematch() {
  if (!room || !others().length || hostGone || wantMe) return;
  wantMe = true; room.send('rematch', { id: myId }); maybeRematch(); showRematch();
}
export function hostStart() {
  if (role !== 'host' || !room || others().length < 1 || raced) return;
  const seed = code + ':' + (++raceNo);
  room.send('start', { id: myId, level: levelIdx, seed });
  beginRace(levelIdx, seed);
}
export function leaveRoom() { closeRoom(); }
export const inviteLink = () => location.origin + location.pathname + '?room=' + code;
export const roomCode = () => code;
export { ui as duelUi };
