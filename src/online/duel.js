/* ---------- live race with 1 to 7 friends (a room of up to 8 phones) ----------
   The host makes a room code, friends join with the code or a link, the host presses Start. All phones then build the same
   seeded crowd and send each other their position several times a second. Nothing is stored; the room disappears when everyone leaves.
   Every message carries the sender's id. Only the host's roster and start messages count, and anything from an unknown id is ignored. */
import { LEVELS, LV, setLevel } from '../config/levels.js';
import { $ } from '../dom.js';
import { LOOK, LOOK_OPTS } from '../save/progress.js';
import { store } from '../save/store.js';
import { start, syncDuelPause, forfeitDuel, refreshDuelResults, elimReceive, elimAbort } from '../sim/game.js';
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
let generation = 0, sessionId = '', rosterRev = 0, receivedRev = -1, disconnectedAt = null, retrying = false;
const retired = new Set(), started = new Set();
let hiddenAt = null;
let outcomeRev = 0, receivedOutcome = -1;
let raceElim = false;     // elimination format: the host picks it, guests learn it from the roster
// Room protocol version. Race layouts (route zones, checkpoints) must be identical on every phone, so phones on different builds
// refuse each other instead of racing on different crowds. Raise it whenever a change would make layouts or rules differ.
export const PROTO = 2;
let myId = '', hostId = '', roster = [];        // roster: [{ id, name, look }], the host first, me included
let inRoster = false, raced = false, hostGone = false, lastStatus = '', joinWaiter = null;
let wantMe = false; const wants = new Set();    // rematch: everyone still in the room has to ask
const seenAt = {};                              // id -> last time we heard from them (ms)
const ui = { status: () => {}, roster: () => {} };
const say = t => { lastStatus = t; ui.status(t, !!room && raced && !S?.race?.finished); };
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
export function startDuel({ seed, level, friends, friend, send, roster: ids, meId, elim }) {
  setLevel(level);
  const list = friends || (friend ? [{ id: 'friend', ...friend }] : []);
  const peers = {}, order = [];
  for (const f of list) { peers[f.id] = { name: cleanName(f.name), look: cleanLook(f.look), remote: createRemote(), fin: null, bye: false }; order.push(f.id); }
  const names = order.map(i => peers[i].name);
  // start line: the room list says who stands where (me first when no list is given)
  const lineUp = ids && ids.length ? ids : ['me', ...order], slotOf = {};
  lineUp.forEach((id, i) => { slotOf[id === meId ? 'me' : id] = i; });
  // ten reports a second for one friend; five with more (measured 2026-11-07: a full room of 8 at 5 a second lost nothing on the free plan)
  const d = { elim: !!elim, elimHost: false, pausers: new Set(), pauseSeq: 0, refresh: showRematch, seed, peers, order, slotOf, meId: meId || 'me', count: lineUp.length, title: names.length === 1 ? names[0] : names.length + ' friends', send, n: 0, sendT: 0, sendEvery: order.length > 1 ? 0.2 : 0.1 };
  start('race', null, { duel: d });
  return d;
}

// Messages from the other phones while racing. The sender's id picks whose runner it is.
export function duelReceive(ev, data) {
  const d = S && S.duel; if (!d || !data || typeof data !== 'object') return;
  const id = cleanId(data.id) || (d.order.length === 1 ? d.order[0] : null), P = id && d.peers[id];
  if (!P || (data.race !== undefined && data.race !== d.seed)) return;
  if (P.bye && P.fin == null && ev !== 'bye') return;
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
    if (ft !== null && ft > 0 && P.fin == null) { P.fin = ft; d.pausers.delete(id); syncDuelPause(); }
  } else if (ev === 'bye') { P.bye = true; d.pausers.delete(id); syncDuelPause(); }
}

/* ---- the room before the race ---- */
function closeRoom() {
  const old = room; room = null; generation++;
  if (tick) { clearInterval(tick); tick = null; }
  if (old) {
    const d = S && S.duel;
    try { old.send('bye', { id: myId, session: sessionId, race: raced && d ? d.seed : undefined, ft: raced && d ? d.finish : undefined, outcomes: role === 'host' && raced ? outcomeRows() : undefined }); } catch (e) {}
    old.leave();
    if (raced && d && !S.race.finished) forfeitDuel();
  }
  sessionId = ''; rosterRev = 0; receivedRev = -1; outcomeRev = 0; receivedOutcome = -1; disconnectedAt = null; retrying = false; hiddenAt = null; retired.clear(); started.clear();
  room = null; role = null; code = ''; hostId = ''; myId = ''; roster = []; inRoster = false; raced = false; hostGone = false; wantMe = false; wants.clear(); raceElim = false;
  for (const k in seenAt) delete seenAt[k];
  if (joinWaiter) { const w = joinWaiter; joinWaiter = null; w(false); }
  ui.roster([]);
  ui.status(lastStatus, false);
  showRematch();
}
const sendRoster = () => room && room.send('roster', { proto: PROTO, id: myId, session: sessionId, rev: ++rosterRev, level: levelIdx, players: roster,
  elim: raceElim, activeRace: raced && S?.duel ? { seed: S.duel.seed, level: levelIdx, countT: S.race.countT, elim: !!S.duel.elim } : null });
const changed = () => { ui.roster(lobbyPlayers()); ui.status(lastStatus, !!room && raced && !S?.race?.finished); showRematch(); };

// While present, the existing lobby host settles terminal results. Retain them even after
// a player leaves, so a missed finish/bye can be repaired without database storage.
function outcomeRows() {
  const d = S.duel;
  return [{ id: myId, ft: d.finish ?? null, dnf: !!d.dnf }, ...d.order.map(id => ({ id, ft: d.peers[id].fin, dnf: d.peers[id].fin == null && d.peers[id].bye }))];
}
function publishOutcomes() {
  if (room && role === 'host' && raced) room.send('outcomes', { id: myId, session: sessionId, race: S.duel.seed, rev: ++outcomeRev, outcomes: outcomeRows() });
}
function applyOutcomes(rows) {
  const d = S.duel;
  for (const row of (Array.isArray(rows) ? rows : []).slice(0, MAX_PLAYERS)) {
    if (!row || typeof row !== 'object') continue;
    const ft = num(row.ft, 3600);
    if (row.id === myId) {
      if (row.dnf === true) { forfeitDuel(); d.dnf = true; d.finish = null; refreshDuelResults(); say('DNF · the host could not confirm this finish. Create a new room.'); }
    } else if (d.peers[row.id]) {
      const p = d.peers[row.id];
      if (ft !== null && ft > 0) { p.fin = ft; p.bye = false; }
      else if (row.dnf === true) { p.fin = null; p.bye = true; }
      if (p.bye || p.fin != null) d.pausers.delete(row.id);
    }
  }
  refreshDuelResults(); changed();
}

function onMessage(ev, data) {
  if (!data || typeof data !== 'object') data = {};
  const from = cleanId(data.id);
  if (from && from === myId) return;
  if (sessionId && data.session && data.session !== sessionId) return;
  if (retired.has(from)) return;
  if (from && roster.some(p => p.id === from)) seenAt[from] = Date.now();
  if (ev === 'hello') {
    if (role !== 'host' || !from) return;
    if (data.proto !== PROTO) { room.send('full', { id: myId, to: from, why: 'version' }); return; }   // a phone on another build cannot share a crowd with us
    if (roster.some(p => p.id === from)) { sendRoster(); return; }
    if (roster.length >= MAX_PLAYERS || raced) { room.send('full', { id: myId, to: from, why: raced ? 'started' : 'full' }); return; }
    roster.push({ id: from, name: cleanName(data.name), look: cleanLook(data.look) });
    seenAt[from] = Date.now();
    sendRoster(); changed();
  } else if (ev === 'roster') {
    if (role !== 'guest' || !from || (hostId && from !== hostId)) return;
    if (data.proto !== PROTO) { if (!inRoster) { closeRoom(); say('The host is on a different version of the game. Reload both phones to update, then try again.'); } return; }
    if (Number.isInteger(data.rev) && data.rev <= receivedRev) return;
    const players = (Array.isArray(data.players) ? data.players : []).slice(0, MAX_PLAYERS)
      .map(p => ({ id: cleanId(p && p.id), name: cleanName(p && p.name), look: cleanLook(p && p.look) })).filter(p => p.id);
    if (!players.length || players[0].id !== from) return;
    if (!players.some(p => p.id === myId)) { if (inRoster) { closeRoom(); say('You were removed from the room.'); } return; }
    if (raced) for (const p of roster) if (!players.some(next => next.id === p.id)) duelReceive('bye', { id: p.id });
    hostId = from; roster = players; inRoster = true; hostGone = false;
    seenAt[from] = Date.now();
    if (data.session) sessionId = data.session;
    if (Number.isInteger(data.rev)) receivedRev = data.rev;
    if (disconnectedAt === null && !raced) say('Connected. Waiting for the host.');
    if (Number.isInteger(data.level) && LEVELS[data.level]) levelIdx = data.level;
    raceElim = data.elim === true;
    for (const id of [...wants]) if (!roster.some(p => p.id === id)) wants.delete(id);
    if (joinWaiter) { const w = joinWaiter; joinWaiter = null; w(true); }
    const active = data.activeRace;
    if (active && typeof active.seed === 'string' && Number.isInteger(active.level) && LEVELS[active.level] &&
        (!raced || wantMe) && !started.has(active.seed)) {
      beginRace(active.level, active.seed.slice(0, 40), active.elim === true);
      if (Number.isFinite(active.countT) && active.countT > 0) S.race.countT = Math.min(S.race.countT, active.countT);
      else { forfeitDuel(); S.duel.send('dnf', {}); say('Missed the start · DNF. Create a new room to race again.'); }
    }
    changed();
  } else if (ev === 'full') {
    if (role === 'guest' && !inRoster && data.to === myId && joinWaiter) {
      const w = joinWaiter; joinWaiter = null;
      say(data.why === 'started' ? 'That room already started a race. Ask the host for a new room.' : data.why === 'version' ? 'The host is on a different version of the game. Reload both phones to update, then try again.' : 'That room is full (' + MAX_PLAYERS + ' players).'); w(false);
    }
  } else if (ev === 'rematch') {
    if (data.race && (!S || !S.duel || data.race !== S.duel.seed)) return;
    if (!from || !roster.some(p => p.id === from)) return;
    wants.add(from); maybeRematch(); changed();
  } else if (ev === 'bye') {
    if (!from || !roster.some(p => p.id === from)) return;
    if (raced && data.race && data.race !== S.duel.seed) return;
    if (raced && data.ft) duelReceive('fin', data);
    if (raced && from === hostId) applyOutcomes(data.outcomes);
    if (from === hostId && role === 'guest') {
      if (!raced) { closeRoom(); say('The host left the room.'); return; }
      hostGone = true; elimAbort();
      say(S?.duel?.elim ? 'Host left. The elimination race is over.' : 'Host left. Finish this race; create a new room for another.');
    }
    roster = roster.filter(p => p.id !== from); wants.delete(from);
    retired.add(from);
    duelReceive(ev, data);
    refreshDuelResults();
    if (role === 'host') { sendRoster(); maybeRematch(); }
    changed();
  } else if (ev === 'start') {
    if (role !== 'guest' || from !== hostId || !inRoster || (raced && !wantMe)) return;
    if (data.proto !== PROTO) { say('The host is on a different version of the game. Reload both phones to update, then try again.'); return; }
    if (typeof data.seed !== 'string' || !Number.isInteger(data.level) || !LEVELS[data.level]) return;
    if (started.has(data.seed)) return;
    beginRace(data.level, data.seed.slice(0, 40), data.elim === true);
  } else if (ev === 'elim') {
    // the host's ordered list of eliminated racers: only the host, only for this race. Applying it is idempotent (known entries are
    // skipped), so repeated, late or reordered copies change nothing and a lost copy is repaired by the next one.
    if (role !== 'guest' || from !== hostId || !S?.duel?.elim || data.race !== S.duel.seed) return;
    elimReceive(Array.isArray(data.out) ? data.out.slice(0, MAX_PLAYERS) : []); changed();
  } else if (ev === 'dnf') {
    if (!S || !S.duel || data.race !== S.duel.seed) return;
    duelReceive('bye', data); say((S.duel.peers[from]?.name || 'Racer') + ' did not finish.'); refreshDuelResults(); changed(); publishOutcomes();
  } else if (ev === 'outcomes') {
    if (role !== 'guest' || from !== hostId || !S?.duel || data.race !== S.duel.seed || !Number.isInteger(data.rev) || data.rev <= receivedOutcome) return;
    receivedOutcome = data.rev; applyOutcomes(data.outcomes);
  } else if (ev === 'ghost') receiveGhost(from, data);
  else {
    if ((ev === 'pos' || ev === 'fin') && S && S.duel && data.race !== S.duel.seed) return;
    duelReceive(ev, data); if (ev === 'fin') { refreshDuelResults(); publishOutcomes(); }
  }
}
export const injectRoomMessage = onMessage;

function beginRace(level, seed, elim = false) {
  started.add(seed);
  receivedOutcome = -1;
  wantMe = false; wants.clear(); raced = true;
  const id = myId;
  const epoch = generation;
  const d = startDuel({ seed, level, elim, friends: others(), roster: roster.map(p => p.id), meId: id, send: (ev, payload) => {
    if (epoch !== generation) return;
    if (ev === 'fin' && !S.duel.dnf && S.duel.finish == null) S.duel.finish = payload.ft;
    if (room) room.send(ev, { id, ...payload, race: seed, session: sessionId });
    if (ev === 'fin') { refreshDuelResults(); publishOutcomes(); }
  } });
  d.managed = true; d.beganAt = Date.now(); d.elimHost = role === 'host';
  for (const p of roster) seenAt[p.id] = Date.now();
  sendMyGhosts(level);
  changed();
  say('Live race · keep this app open.');
  if (document.hidden) {
    forfeitDuel(); d.send('dnf', {});
    say('Race ended · DNF because this phone left the game.');
  }
}

// Every 2 seconds: guests say hello (join retry and keepalive); the host sends the roster and drops phones that went quiet.
function heartbeat() {
  if (!room) return;
  const now = Date.now();
  if (raced && S?.duel && (state === 'play' || state === 'paused')) S.duel.send('pause', { seed: S.duel.seed, n: S.duel.pauseSeq, paused: S.duel.pausers.has(myId) });
  if (disconnectedAt !== null) {
    if (now - disconnectedAt > STALE_MS) {
      if (raced) forfeitDuel();
      closeRoom(); say('Connection lost. Rejoin a lobby or create a new room.'); return;
    }
    if (!retrying && !document.hidden) reconnect();
  }
  const d = raced && S && S.duel;
  if (d) {
    if (d.finish != null) d.send('fin', { ft: d.finish });
    if (d.dnf) d.send('dnf', {});
    if (wantMe) room.send('rematch', { id: myId, session: sessionId, race: d.seed });
    for (const id of d.order) {
      const p = d.peers[id];
      if (!p.bye && p.fin == null && (now - (seenAt[id] ?? d.beganAt) > STALE_MS || now - d.beganAt > 10 * 60 * 1000)) {
        duelReceive('bye', { id }); say(p.name + ' lost connection · DNF.'); refreshDuelResults();
      }
    }
    if (now - d.beganAt > 10 * 60 * 1000 && !S.race.finished) {
      forfeitDuel(); d.send('dnf', {}); say('Race timed out · DNF.');
    }
    publishOutcomes();
    if (d.elim && d.elimHost && S.race.elim && S.race.elim.out.length) d.send('elim', { rev: ++S.race.elim.rev, out: S.race.elim.out.map(o => o.id) });
  }
  if (role === 'guest') {
    room.send('hello', { proto: PROTO, id: myId, name: myName(), look: LOOK });
    if (inRoster && !hostGone && seenAt[hostId] && now - seenAt[hostId] > STALE_MS) {
      if (!raced) { closeRoom(); say('Lost contact with the host.'); } else { hostGone = true; elimAbort(); say(S?.duel?.elim ? 'Host lost connection. The elimination race is over.' : 'Host lost connection. Finish this race; create a new room for another.'); changed(); }
    }
  } else if (role === 'host') {
    const gone = others().filter(p => seenAt[p.id] && now - seenAt[p.id] > STALE_MS);
    if (gone.length) { roster = roster.filter(p => !gone.includes(p)); for (const p of gone) { wants.delete(p.id); retired.add(p.id); } maybeRematch(); changed(); }
    if (roster.length > 1) sendRoster();
  }
  if (room) changed();
}

function bindRoom(r, epoch) {
  r.onMessage((ev, data) => { if (room === r && generation === epoch) onMessage(ev, data); });
  r.onClose(() => {
    if (room !== r || generation !== epoch) return;
    if (disconnectedAt === null) disconnectedAt = Date.now();
    say('Connection interrupted. Reconnecting (up to 30 seconds)...'); changed();
  });
}

async function reconnect() {
  retrying = true;
  const epoch = generation, previous = room, replacement = roomFactory();
  room = replacement; bindRoom(replacement, epoch); previous.leave();
  try {
    await replacement.join(code);
    if (generation !== epoch || room !== replacement) { replacement.leave(); return; }
    disconnectedAt = null;
    say('Connected again.');
    if (role === 'host') sendRoster();
    else room.send('hello', { proto: PROTO, id: myId, name: myName(), look: LOOK, session: sessionId });
    changed();
  } catch (e) { /* heartbeat retries within the original grace period */ }
  finally { if (generation === epoch) retrying = false; }
}

async function connect(c, r) {
  closeRoom();
  room = roomFactory(); role = r; code = c; myId = newId();
  const current = room, epoch = generation;
  if (r === 'host') sessionId = newId();
  bindRoom(current, epoch);
  await current.join(c);
  if (generation !== epoch || room !== current) { current.leave(); throw new Error('cancelled'); }
  tick = setInterval(heartbeat, KEEPALIVE_MS); if (tick && tick.unref) tick.unref();
}

export async function hostRoom(level) {
  levelIdx = level;
  say('Making a room...');
  const pending = connect(makeCode(), 'host'), epoch = generation;
  try { await pending; } catch (e) { if (generation === epoch) { closeRoom(); say('Could not connect. Check your internet and try again.'); } return null; }
  roster = [{ id: myId, name: myName(), look: LOOK }]; hostId = myId; inRoster = true;
  say('Waiting for friends to join...'); changed();
  return code;
}
export async function joinRoom(c) {
  c = cleanCode(c); if (c.length !== 4) { say('Type the 4 letter code.'); return false; }
  say('Joining ' + c + '...');
  const pending = connect(c, 'guest'), epoch = generation;
  try { await pending; } catch (e) { if (generation === epoch) { closeRoom(); say('Could not connect. Check the code and your internet.'); } return false; }
  const ok = await new Promise(resolve => {
    joinWaiter = resolve;
    room.send('hello', { proto: PROTO, id: myId, name: myName(), look: LOOK });
    const t = setTimeout(() => { if (joinWaiter === resolve) { joinWaiter = null; say('Nobody answered. Check the code and try again.'); resolve(false); } }, JOIN_WAIT_MS);
    if (t && t.unref) t.unref();
  });
  if (generation !== epoch) return false;
  if (!ok) { const keep = lastStatus; closeRoom(); say(keep); return false; }
  return true;   // the roster screen shows the stage and who is in
}

export const lobbyPlayers = () => (room && inRoster ? roster.map(p => ({ id: p.id, name: p.name, look: p.look, me: p.id === myId, host: p.id === hostId,
  status: p.id === myId ? (disconnectedAt === null ? 'connected' : 'reconnecting') : Date.now() - (seenAt[p.id] ?? Date.now()) > 6000 ? 'reconnecting' : 'connected' })) : []);
export const lobbyStatus = () => lastStatus;
export const roomLevel = () => levelIdx;
// The host can change the stage any time before Start; everyone sees it on the next roster.
export function setRoomLevel(i) { if (role !== 'host' || !room || raced || !LEVELS[i]) return; levelIdx = i; sendRoster(); changed(); }
export const isHost = () => role === 'host';
// Format of the next race: the host picks it before Start; guests learn it from the roster.
export const roomElim = () => raceElim;
export function setRoomElim(v) { if (role !== 'host' || !room || raced) return; raceElim = !!v; sendRoster(); changed(); }

// After a race everyone presses Rematch; the host then starts a new race on the same stage.
export function rematchCounts() { const o = others(); return { asked: o.filter(p => wants.has(p.id)).length, total: o.length }; }
export function rematchState() {
  const { asked, total } = rematchCounts();
  if (!room || !total || hostGone || (S && S.duel && (S.duel.dnf || others().some(p => S.duel.peers[p.id]?.bye)))) return 'gone';
  if (disconnectedAt !== null) return 'waiting';
  if (wantMe && asked === total) return 'starting';
  return wantMe ? 'waiting' : asked > 0 ? 'asked' : 'idle';
}
function showRematch() {
  const b = $('again'); if (!b || !S || !S.duel) return;
  const st = rematchState(), c = rematchCounts();
  b.textContent = st === 'gone' ? 'Create a new room to race again' : disconnectedAt !== null ? 'Reconnecting...' : st === 'waiting' ? 'Waiting for others (' + (c.asked + 1) + '/' + (c.total + 1) + ')' : st === 'asked' ? 'Accept rematch' : 'Rematch';
  b.disabled = st === 'waiting' || st === 'starting';
}
function maybeRematch() {
  const o = others();
  if (role === 'host' && room && disconnectedAt === null && wantMe && o.length && o.every(p => wants.has(p.id)) && rematchState() !== 'gone') {
    const seed = code + ':' + (++raceNo);
    room.send('start', { proto: PROTO, id: myId, session: sessionId, level: levelIdx, seed, elim: raceElim }); beginRace(levelIdx, seed, raceElim);
  }
}
export function requestRematch() {
  if (!room || !others().length || hostGone || wantMe || rematchState() === 'gone' || disconnectedAt !== null) return;
  wantMe = true; room.send('rematch', { id: myId, session: sessionId, race: S.duel.seed }); maybeRematch(); showRematch();
}
export function hostStart() {
  if (role !== 'host' || !room || disconnectedAt !== null || others().length < 1 || raced) return;
  const seed = code + ':' + (++raceNo);
  room.send('start', { proto: PROTO, id: myId, session: sessionId, level: levelIdx, seed, elim: raceElim });
  beginRace(levelIdx, seed, raceElim);
}
export function leaveRoom() { closeRoom(); }
export const inviteLink = () => location.origin + location.pathname + '?room=' + code;
export const roomCode = () => code;
export { ui as duelUi };

document.addEventListener('visibilitychange', () => {
  if (!room) return;
  if (document.hidden) {
    hiddenAt = Date.now();
    if (raced && S && S.duel && !S.race.finished) {
      forfeitDuel(); S.duel.send('dnf', {});
      say('Race ended · DNF because this phone left the game.');
    }
  } else {
    if (hiddenAt !== null && Date.now() - hiddenAt > STALE_MS && !raced) {
      closeRoom(); say('Lobby expired while away. Rejoin or create a new room.'); return;
    }
    hiddenAt = null; heartbeat();
  }
});
