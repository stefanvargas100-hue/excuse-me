import { courseTag } from '../config/routes.js';
import { sideRoutes } from '../config/side-routes.js';
/* ---------- live race with 1 to 7 friends (a room of up to 8 phones) ----------
   The host makes a room code, friends join with the code or a link, the host presses Start. All phones then build the same
   seeded crowd and send each other their position several times a second. Nothing is stored; the room disappears when everyone leaves.
   Every message carries the sender's id. Only the host's roster and start messages count, and anything from an unknown id is ignored. */
import { LEVELS, LV, setLevel } from '../config/levels.js';
import { $ } from '../dom.js';
import { LOOK, LOOK_OPTS } from '../save/progress.js';
import { store } from '../save/store.js';
import { start, syncDuelPause, forfeitDuel, refreshDuelResults, elimReceive, elimAbort } from '../sim/game.js';
import { CUP_RACES, CUP_RACERS, addRace, cleanSetup, currentStage, friendCupOver, hostLeft, newFriendCup, playerLeft, raceSeed, standings as cupTable } from '../sim/friendcup.js';
import { DIFFICULTIES, cupBotLook, cupTakeOver, standings as raceRows } from '../sim/race.js';
import { S, state } from '../sim/state.js';
import { packGhost, saveFriendGhost } from '../sim/ghostshare.js';
import { createRoom, cleanCode, makeCode } from './room.js';
import { createRemote } from './remote.js';
import { createBoard } from './board.js';
import { cleanPlayerName } from './names.js';
import { createStartCoordinator, START_PROTOCOL } from './start-sync.js';

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
  return cleanPlayerName(raw) || 'Friend';
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
let lobby = null, startTimer = null, lobbyNow = () => performance.now();
let lobbyNotice = '';
export const useLobbyClock = f => { lobbyNow = f; };
let outcomeRev = 0, receivedOutcome = -1;
let raceElim = false;     // elimination format: the host picks it, guests learn it from the roster
/* Friend Cup. As with elimination, the host decides and sends the whole list: the setup, every finished race and who has left.
   Every phone rebuilds its copy from that one message, so a lost, repeated or late copy heals by itself on the next one. */
let cup = null;           // the Cup being played: the host's own, or the copy rebuilt from the host's last good message
let cupCfg = null;        // what the host has picked so far: { stages, difficulty }, null when the format is not Cup
let cupRev = 0, cupReceived = -1;
// After a host handover the new host makes one decision for the whole room about the race that was starting: { seed, cancel }.
// It travels in every Cup message until the next race begins. Guests follow it for the race they had at the handover, never their own countdown.
let handoverStart = null, awaitingStart = null;
const cupLooks = {};      // id -> look, kept so a bot taking over from a player still looks like them
const RACE_SEED = /:race\d+$/;
// Room protocol version. Race layouts and the start handshake must be identical on every phone, so phones on different builds
// refuse each other instead of racing on different crowds. Raise it whenever a change would make layouts or rules differ.
export const PROTO = 7;
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
    let pts = null; try { pts = JSON.parse(store.get((kind === 'race' ? 'excuseme_ghost_race_' : 'excuseme_ghost_') + L.id + (kind === 'race' && sideRoutes(L.id).length ? courseTag(L.id) : ''), 'null')); } catch (e) {}
    const g = packGhost(pts); if (g) room.send('ghost', { id: myId, kind, level, ghost: g });
  }
}
function receiveGhost(from, data) {
  const p = from && roster.find(r => r.id === from);   // only people in this room; their name comes from the room list
  if (!p || !LEVELS[data.level] || (data.kind !== 'classic' && data.kind !== 'race')) return;
  saveFriendGhost(store, data.kind, LEVELS[data.level].id, p.name, data.ghost);
}

/* ---- one race at a time ---- */
export function startDuel({ seed, level, friends, friend, send, roster: ids, meId, elim, cup: cupRun }) {
  setLevel(level);
  const list = friends || (friend ? [{ id: 'friend', ...friend }] : []);
  const peers = {}, order = [];
  for (const f of list) { peers[f.id] = { name: cleanName(f.name), look: cleanLook(f.look), remote: createRemote(), fin: null, bye: false, ai: !!f.ai }; order.push(f.id); }
  const names = order.map(i => peers[i].name);
  // start line: the room list says who stands where (me first when no list is given)
  const lineUp = ids && ids.length ? ids : ['me', ...order], slotOf = {};
  lineUp.forEach((id, i) => { slotOf[id === meId ? 'me' : id] = i; });
  // ten reports a second for one friend; five with more (measured 2026-11-07: a full room of 8 at 5 a second lost nothing on the free plan)
  const d = { cup: cupRun || null, botN: 0, elim: !!elim, elimHost: false, pausers: new Set(), pauseSeq: 0, refresh: showRematch, seed, peers, order, slotOf, meId: meId || 'me', count: lineUp.length, title: names.length === 1 ? names[0] : names.length + ' friends', send, n: 0, sendT: 0, sendEvery: order.length > 1 || cupRun ? 0.2 : 0.1 };
  start('race', null, { duel: d });
  return d;
}

// Messages from the other phones while racing. The sender's id picks whose runner it is.
export function duelReceive(ev, data) {
  const d = S && S.duel; if (!d || !data || typeof data !== 'object') return;
  const id = cleanId(data.id) || (d.order.length === 1 ? d.order[0] : null), P = id && d.peers[id];
  if (!P || (data.race !== undefined && data.race !== d.seed)) return;
  if (P.ai || (P.bye && P.fin == null && ev !== 'bye')) return;   // bots only ever move through the host's combined message
  if (ev === 'pause') {
    if (data.seed !== d.seed || !Number.isInteger(data.n) || data.n < 0 || data.n <= (P.pauseSeq ?? -1) || typeof data.paused !== 'boolean' || P.bye) return;
    P.pauseSeq = data.n;
    if (data.paused) d.pausers.add(id); else d.pausers.delete(id);
    syncDuelPause();
  } else if (ev === 'pos') {
    const n = num(data.n, 1e9), x = num(data.x, 20), z = num(data.z, LV.goal + 20), vx = num(data.vx, 20), s = num(data.s, 20);
    if ([n, x, z, vx, s].some(v => v === null)) return;
    P.remote.push({ n, x, z, vx, s: Math.max(0, s), route: sideRoutes(LV.id).some(r => r.id === data.route && z >= r.entrance && z < r.exit) ? data.route : "" }, S.clock);
  } else if (ev === 'fin') {
    const ft = num(data.ft, 3600);
    if (ft !== null && ft > 0 && P.fin == null) { P.fin = ft; d.pausers.delete(id); syncDuelPause(); }
  } else if (ev === 'bye') { P.bye = true; d.pausers.delete(id); syncDuelPause(); }
}

/* ---- the room before the race ---- */
function closeRoom() {
  if (startTimer) { clearInterval(startTimer); startTimer = null; }
  if (lobby) { lobby.close(); lobby = null; }
  lobbyNotice = '';
  const old = room; room = null; generation++;
  if (tick) { clearInterval(tick); tick = null; }
  if (old) {
    const d = S && S.duel;
    try { old.send('bye', { id: myId, session: sessionId, race: raced && d ? d.seed : undefined, ft: raced && d ? d.finish : undefined, outcomes: role === 'host' && raced ? outcomeRows() : undefined, ...(role === 'host' && raced && cup ? { cup: cupMessage() } : {}) }); } catch (e) {}
    old.leave();
    if (raced && d && d.cup) { d.cup.host = false; d.cup.model = hostLeft(d.cup.model); }   // this phone is out of the room: the Cup is over here
    if (raced && d && !S.race.finished) forfeitDuel();
  }
  cup = null; cupCfg = null; cupRev = 0; cupReceived = -1; handoverStart = null; awaitingStart = null; for (const k in cupLooks) delete cupLooks[k];
  sessionId = ''; rosterRev = 0; receivedRev = -1; outcomeRev = 0; receivedOutcome = -1; disconnectedAt = null; retrying = false; hiddenAt = null; retired.clear(); started.clear();
  room = null; role = null; code = ''; hostId = ''; myId = ''; roster = []; inRoster = false; raced = false; hostGone = false; wantMe = false; wants.clear(); raceElim = false;
  for (const k in seenAt) delete seenAt[k];
  if (joinWaiter) { const w = joinWaiter; joinWaiter = null; w(false); }
  ui.roster([]);
  ui.status(lastStatus, false);
  showRematch();
}
const lobbyMembers = () => roster.map(p => ({ id: p.id, protocol: p.protocol || 0 }));
const sendRoster = () => {
  if (!room) return;
  ensureLobby(); lobby.setPlayers(lobbyMembers(), levelIdx, raceElim);
  room.send('roster', { proto: PROTO, elim: raceElim, id: myId, session: sessionId, rev: ++rosterRev, level: levelIdx, players: roster, lobby: lobby.snapshot(), ...(cupCfg ? { cupCfg: { stages: cupCfg.stages, difficulty: cupCfg.difficulty } } : {}) });
};
const changed = () => {
  ui.roster(lobbyPlayers());
  if (room && inRoster && !raced && lobby && disconnectedAt === null) {
    const view = lobby.view(), stage = cupCfg ? cupSummary() : LEVELS[levelIdx].name;
    lastStatus = lobbyNotice || (cupCfg && !validCup(cupCfg) ? (role === 'host' ? 'Friend Cup: pick 4 different stages, in race order.' : 'Friend Cup · the host is choosing stages.') :!view.compatible ? 'Update the game on every phone before joining.' : view.busy ? 'Preparing race. Keep the game open.' :
      roster.length < 2 ? 'Waiting for friends to join...' : lobby.canStart() || view.players.every(p => p.ready) ? stage + ' · Everyone is ready. ' + (role === 'host' ? 'Press Start race.' : 'Waiting for the host.') :
      'Connected · ' + stage + ' · Choose Ready when you are set.');
  }
  ui.status(lastStatus, !!room && raced && !S?.race?.finished); showRematch();
};

function ensureLobby() {
  if (lobby || !myId || !hostId) return;
  const epoch = generation;
  lobby = createStartCoordinator({ id: myId, hostId, now: () => lobbyNow(),
    send: (ev, payload) => { if (room && epoch === generation) room.send('lobby:' + ev, { ...payload, id: myId, session: sessionId }); },
    allowStart: () => !document.hidden && (cup || cupCfg ? cupCanRun() : !raced || wantMe),
    allowAgreed: () => raced && (cup ? cupCanRun() : wantMe),
    onExpired: plan => {
      if (epoch !== generation) return;
      if (room) room.send('bye', { id: myId, session: sessionId, race: plan.seed });
      closeRoom(); say('Start could not be confirmed. Rejoin the room.');
    },
    onStart: plan => {
      if (epoch !== generation) return;
      lobbyNotice = '';
      beginRace(plan.level, plan.seed, plan);
      if (epoch !== generation) return;
      if (plan.late) { forfeitDuel(); S.duel.send('dnf', {}); say('Missed the start · DNF. Create a new room.'); }
    },
    onNotice: text => {
      if (epoch !== generation) return;
      if (!raced && lobby && !lobby.view().compatible) { closeRoom(); say(text); return; }
      lobbyNotice = text; say(text);
    },
    onChange: () => {
      if (epoch !== generation) return;
      changed();
      const view = lobby?.view();
      if (view && (view.busy || (view.deadline !== null && view.deadline > lobbyNow())) && !startTimer) {
        startTimer = setInterval(() => {
          if (epoch !== generation || !lobby) return;
          lobby.tick(); const v = lobby.view();
          if (!v.busy && (v.deadline === null || lobbyNow() > v.deadline + 500)) { clearInterval(startTimer); startTimer = null; }
        }, 200);
        if (startTimer?.unref) startTimer.unref();
      }
    }
  });
}

// While present, the existing lobby host settles terminal results. Retain them even after
// a player leaves, so a missed finish/bye can be repaired without database storage.
function outcomeRows() {
  const d = S.duel;
  return [{ id: myId, ft: d.finish ?? null, dnf: !!d.dnf }, ...d.order.map(id => ({ id, ft: d.peers[id].fin, dnf: d.peers[id].fin == null && d.peers[id].bye }))];
}
function publishOutcomes() {
  if (room && role === 'host' && raced) room.send('outcomes', { id: myId, session: sessionId, race: S.duel.seed, rev: ++outcomeRev, outcomes: outcomeRows() });
}
// Is this phone up to date for the next race? A phone that missed the last results refuses, so the start is cancelled rather than half-run.
const cupCanRun = () => !!cup && !friendCupOver(cup) && !hostGone && !started.has(raceSeed(cup));
const validCup = c => !!c && !!newFriendCup({ seed: 'check', stages: c.stages, difficulty: c.difficulty, players: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }], rand: () => 0 });
// What the room says about the Cup being set up. The host sees the stages on the buttons; guests need them spelled out.
function cupSummary() {
  const diff = DIFFICULTIES[cupCfg.difficulty], bots = diff ? ' · ' + diff.name + ' bots' : '';
  return role === 'host' || !validCup(cupCfg) ? 'Friend Cup' + bots : 'Friend Cup: ' + cupCfg.stages.map(s => LEVELS[s].name).join(', ') + bots;
}
const leftIds = c => c.racers.filter(r => r.left).map(r => r.id);
// The whole Cup so far. The setup goes as first agreed: cleanSetup refuses racers marked as left, so they travel in their own list.
function cupMessage() {
  const racers = cup.racers.map(r => (r.left ? { ...r, bot: false, left: false } : r));
  return { id: myId, session: sessionId, proto: PROTO, rev: ++cupRev, setup: { seed: cup.seed, stages: cup.stages, difficulty: cup.difficulty, racers }, rounds: cup.rounds, left: leftIds(cup), ...(handoverStart ? { start: handoverStart } : {}) };
}
const publishCup = () => { if (room && role === 'host' && cup) room.send('cup', cupMessage()); };
const rememberLooks = () => { for (const p of roster) cupLooks[p.id] = p.look; };
function syncCupRun() {
  const d = S?.duel;
  if (d?.cup && cup) d.cup.model = cup;
  if (d?.cup) refreshDuelResults();
  changed();
}
// Rebuilds a Cup from a message, or returns null. Nothing is kept from a message with anything wrong in it.
function cupFromMessage(m, sender = hostId) {
  try {
    if (!m || m.proto !== PROTO || !Array.isArray(m.rounds) || m.rounds.length > CUP_RACES || !Array.isArray(m.left)) return null;
    const setup = cleanSetup(m.setup);
    if (!setup || setup.racers[0].id !== (cup?.racers[0].id || hostId) || !setup.racers.some(r => r.id === myId && !r.bot)) return null;
    if (setup.racers.some(r => !r.bot && (cleanId(r.id) !== r.id || cleanName(r.name) !== r.name))) return null;
    let c = { ...setup, rounds: [], ended: false };
    for (const rows of m.rounds) { c = addRace(c, rows); if (!c) return null; }
    for (const id of m.left) {
      if (id === sender || !setup.racers.some(r => r.id === id && !r.bot)) return null;
      c = playerLeft(c, id);
    }
    return c;
  } catch (e) { return null; }
}
function receiveCup(data) {
  if (role !== 'guest' || !Number.isInteger(data.rev) || data.rev <= cupReceived) return;
  const next = cupFromMessage(data);
  if (!next) return;
  if (raced && cup) {
    // Once racing, the setup is settled and results only ever grow.
    const fixed = c => JSON.stringify([c.seed, c.stages, c.difficulty, c.racers.map(r => [r.id, r.name])]);
    if (fixed(next) !== fixed(cup) || next.rounds.length < cup.rounds.length) return;
  }
  cupReceived = data.rev;
  cup = hostGone ? hostLeft(next) : next;
  if (leftIds(cup).includes(myId)) { closeRoom(); say('You were removed from the room.'); return; }
  for (const id of leftIds(cup)) cupRacerGone(id);
  if (!friendCupOver(cup)) levelIdx = currentStage(cup);
  syncCupRun();
  followStart(data.start);
}
// A player has gone. Their name and points stay, and a bot runs for them: straight away if they were mid-race.
function cupRacerGone(id) {
  if (!cup) return;
  cup = playerLeft(cup, id); retired.add(id);
  const d = S?.duel, P = d?.cup && d.order.includes(id) ? d.peers[id] : null;
  if (P) { d.pausers.delete(id); syncDuelPause(); }
  if (!P || P.ai) return;
  P.ai = true;
  if (P.fin != null || P.bye) return;   // already finished or out of this race
  const b = cupTakeOver(id, P.look);
  if (b && role !== 'host') { P.remote = createRemote(); P.remote.push({ n: 0, x: b.x, z: b.z, vx: b.vx, s: b.speed }, S.clock); }
}
// The host has gone. Every phone picks the same new host from the roster it already has: the first remaining player in roster
// order. No message can nominate a host, and the old host is retired, so nothing more from them counts, even if they come back.
function cupHostGone() {
  const old = hostId, d = S?.duel;
  let cancelled = false;
  cupRacerGone(old); wants.delete(old);   // their runner becomes a bot, like any player who leaves
  const next = roster.find(p => p.id !== old && !retired.has(p.id) && cup.racers.some(r => r.id === p.id && !r.left));
  if (!next) { cup = hostLeft(cup); hostGone = true; syncCupRun(); return; }   // nobody real is left: the Cup ends as before
  hostId = next.id; role = myId === hostId ? 'host' : 'guest'; hostGone = false;
  roster = [next, ...roster.filter(p => p !== next && p.id !== old && !retired.has(p.id))];
  rosterRev = 0; receivedRev = -1; outcomeRev = 0; receivedOutcome = -1; cupRev = Math.max(cupRev, cupReceived); cupReceived = -1;
  // The old host's start coordinator closes for good, so a start it was preparing can never be released. The new one names the new host.
  if (startTimer) { clearInterval(startTimer); startTimer = null; }
  if (lobby) { lobby.close(); lobby = null; }
  lobbyNotice = '';
  if (role === 'host' && !friendCupOver(cup)) {
    // Decide once, from this phone alone: a race already under way here goes on; a countdown, or a start this phone never got, is cancelled.
    const seed = raceSeed(cup), mine = d?.cup && d.seed === seed && !d.cancelled;
    handoverStart = { seed, cancel: !(mine && S.race.countT <= 0) };
    if (mine && handoverStart.cancel) { cancelStart(d); cancelled = true; }
  }
  if (role === 'guest') awaitingStart = d || null;
  if (d?.cup && !d.cancelled) {
    d.cup.host = role === 'host';
    for (const id of d.order) {
      const P = d.peers[id];
      if (!P.ai) continue;
      if (role === 'host') {
        // Run each bot from where this phone last saw it. A bot that already finished keeps its time.
        const b = cupTakeOver(id, P.look);
        if (b && P.fin != null && !b.done) { b.done = true; b.finishT = P.fin; }
      } else if (P.fin == null) {
        // The new host counts its bot reports from 1 again, so start each bot's track afresh from where it stands.
        const b = S.race.bots.find(o => o.peerId === id);
        P.remote = createRemote(); if (b) P.remote.push({ n: 0, x: b.x, z: b.z, vx: b.vx, s: b.speed }, S.clock);
      }
    }
  }
  ensureLobby();
  if (!cancelled) say('The host left. ' + (role === 'host' ? 'You are now hosting.' : next.name + ' is now hosting.'));
  if (role === 'host') { publishCup(); sendRoster(); cupDecide(); }
  syncCupRun();
}
// A start that had not run when the host left: nothing more is sent for it, and the new host starts the same race again.
function cancelStart(d) {
  d.cancelled = true; started.delete(d.seed); d.startRemaining = null; S.race.countT = 0;
  forfeitDuel(); d.dnf = false; d.finish = null; d.cup.race = cup.rounds.length; d.cup.host = role === 'host';
  refreshDuelResults();
  say('Start cancelled: the host left. ' + (role === 'host' ? 'You are now hosting: start the race again.' : (roster.find(p => p.id === hostId)?.name || 'The new host') + ' is now hosting and will start it again.'));
}
// A guest follows the new host's decision about the race it had when the host left.
function followStart(s) {
  const d = awaitingStart;
  if (!d || !s || typeof s !== 'object' || typeof s.seed !== 'string' || typeof s.cancel !== 'boolean') return;
  if (s.seed !== d.seed && s.seed !== raceSeed(cup)) return;
  awaitingStart = null;
  if (S?.duel !== d || d.cancelled) return;   // a newer race has begun since: the decision is old news
  if (d.seed === s.seed) { if (s.cancel) cancelStart(d); return; }
  // The room races on, but this phone never got that start: a late release is a missed start, as in any race.
  if (!s.cancel && s.seed === raceSeed(cup)) { closeRoom(); say('Start could not be confirmed. Rejoin the room.'); }
}
// Everyone real has finished or dropped out: the host settles the places. A bot still walking is placed by how far it got.
function cupDecide() {
  const d = S?.duel;
  if (role !== 'host' || !cup || !d?.cup || d.cancelled || friendCupOver(cup) || d.seed !== raceSeed(cup)) return;
  if (d.finish == null && !d.dnf) return;
  if (!d.order.every(id => d.peers[id].ai || d.peers[id].fin != null || d.peers[id].bye)) return;
  const next = addRace(cup, raceRows().map((r, i) => ({ id: r.id, place: i + 1, time: r.done && r.finishT != null ? r.finishT : null })));
  if (!next) return;
  cup = next;
  if (!friendCupOver(cup)) levelIdx = currentStage(cup);
  publishCup(); sendRoster();
  syncCupRun();
}
function cupNextRace() {
  const a = cupAction();
  if (a.state !== 'idle') return;
  if (!others().length) { beginRace(currentStage(cup), raceSeed(cup), null); return; }   // the start handshake needs two phones; alone, there is nobody to agree with
  publishCup();
  if (!lobby.start(raceSeed(cup), { agreed: true })) say('A phone is not connected yet. Try again in a moment.');
  showRematch();
}
// What the end screen's button does in a Cup. A finished Cup never offers a rematch.
function cupAction() {
  const C = S?.duel?.cup, m = C?.model;
  if (!m || !room || hostGone || friendCupOver(m)) return { state: 'gone', label: 'Set up a new Cup', disabled: false };
  if (m.rounds.length < C.race) return { state: 'waiting', label: 'Waiting for racers', disabled: true };
  if (role !== 'host') return { state: 'waiting', label: 'Waiting for host', disabled: true };
  if (disconnectedAt !== null) return { state: 'waiting', label: 'Reconnecting...', disabled: true };
  if (lobby?.view().busy) return { state: 'starting', label: 'Starting...', disabled: true };
  return { state: 'idle', label: 'Start race ' + (m.rounds.length + 1) + ' · ' + LEVELS[currentStage(m)].name, disabled: false };
}
// Bot positions from the host, all or nothing. Rows about someone not yet known to be a bot wait for the Cup message that says so.
function receiveBots(data) {
  const d = S.duel, n = num(data.n, 1e9), rows = data.rows;
  if (n === null || n < 1 || !Number.isInteger(n) || !Array.isArray(rows) || rows.length >= CUP_RACERS) return;
  const clean = [];
  for (const row of rows) {
    if (!Array.isArray(row) || (row.length !== 6 && row.length !== 7) || !d.order.includes(row[0])) return;
    const x = num(row[1], 20), z = num(row[2], LV.goal + 20), vx = num(row[3], 20), s = num(row[4], 20), ft = row[5] === null ? null : num(row[5], 3600);
    if ([x, z, vx, s].some(v => v === null) || (row[5] !== null && (ft === null || ft <= 0))) return;
    clean.push({ P: d.peers[row[0]], x, z, vx, s: Math.max(0, s), ft, route: sideRoutes(LV.id).some(r => r.id === row[6] && z >= r.entrance && z < r.exit) ? row[6] : "" });
  }
  let finished = false;
  for (const { P, x, z, vx, s, ft, route } of clean) {
    if (!P.ai || P.bye) continue;
    P.remote.push({ n, x, z, vx, s, route }, S.clock);
    if (ft !== null && P.fin == null) { P.fin = ft; finished = true; }
  }
  if (finished) refreshDuelResults();
}

function applyOutcomes(rows) {
  const d = S.duel;
  for (const row of (Array.isArray(rows) ? rows : []).slice(0, MAX_PLAYERS)) {
    if (!row || typeof row !== 'object') continue;
    const ft = num(row.ft, 3600);
    if (row.id === myId) {
      if (row.dnf === true) { forfeitDuel(); d.dnf = true; d.finish = null; refreshDuelResults(); say('DNF · the host could not confirm this finish. Create a new room.'); }
    } else if (d.order.includes(row.id)) {
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
  if (ev.startsWith('lobby:')) { if (lobby) lobby.receive(ev.slice(6), data); return; }
  if (ev === 'hello') {
    if (role !== 'host' || !from) return;
    if (data.proto !== PROTO) { room.send('full', { id: myId, to: from, why: 'version' }); return; }   // a phone on another build cannot share a crowd with us
    if (roster.some(p => p.id === from)) { sendRoster(); return; }
    if (roster.length >= MAX_PLAYERS || raced) { room.send('full', { id: myId, to: from, why: raced ? 'started' : 'full' }); return; }
    roster.push({ id: from, name: cleanName(data.name), look: cleanLook(data.look), protocol: data.startProtocol || 0 });
    seenAt[from] = Date.now();
    sendRoster(); changed();
  } else if (ev === 'roster') {
    if (role !== 'guest' || !from || (hostId && from !== hostId)) return;
    if (data.proto !== PROTO) { if (!inRoster) { closeRoom(); say('Update the game on both phones: the host is on a different version. Then try again.'); } return; }
    if (Number.isInteger(data.rev) && data.rev <= receivedRev) return;
    const players = (Array.isArray(data.players) ? data.players : []).slice(0, MAX_PLAYERS)
      .map(p => ({ id: cleanId(p && p.id), name: cleanName(p && p.name), look: cleanLook(p && p.look), protocol: p?.protocol || 0 })).filter(p => p.id);
    if (!players.length || players[0].id !== from) return;
    if (!players.some(p => p.id === myId)) { if (inRoster) { closeRoom(); say('You were removed from the room.'); } return; }
    if (raced) for (const p of roster) if (!players.some(next => next.id === p.id)) { if (S?.duel?.cup) cupRacerGone(p.id); else duelReceive('bye', { id: p.id }); }
    hostId = from; roster = players; inRoster = true; hostGone = false;
    seenAt[from] = Date.now();
    if (data.session) sessionId = data.session;
    if (Number.isInteger(data.rev)) receivedRev = data.rev;
    if (disconnectedAt === null && !raced) say('Connected. Waiting for the host.');
    if (Number.isInteger(data.level) && LEVELS[data.level]) levelIdx = data.level;
    raceElim = data.elim === true;
    if (!raced) {
      const c = data.cupCfg;
      cupCfg = c ? { stages: Array.isArray(c.stages) ? c.stages.slice(0, 8) : [], difficulty: c.difficulty } : null;
      if (!cupCfg) cup = null; else rememberLooks();
    }
    for (const id of [...wants]) if (!roster.some(p => p.id === id)) wants.delete(id);
    if (joinWaiter) { const w = joinWaiter; joinWaiter = null; w(true); }
    ensureLobby(); lobby.acceptSnapshot(data.lobby);
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
    // A goodbye sent from another race carries no result for this one. The Cup host's still hands the Cup over.
    const otherRace = raced && data.race && data.race !== S.duel.seed, handover = raced && !!cup && from === hostId && role === 'guest';
    if (otherRace && !handover) return;
    if (raced && data.ft && !otherRace) duelReceive('fin', data);
    if (raced && from === hostId && !otherRace) applyOutcomes(data.outcomes);
    if (raced && from === hostId && data.cup) receiveCup(data.cup);   // the host's last word heals a result this phone missed
    if (handover) cupHostGone();
    else if (from === hostId && role === 'guest') {
      if (!raced) { closeRoom(); say('The host left the room.'); return; }
      hostGone = true; elimAbort();
      say(S?.duel?.elim ? 'Host left. The elimination race is over.' : 'Host left. Finish this race; create a new room for another.');
    }
    roster = roster.filter(p => p.id !== from); wants.delete(from);
    retired.add(from);
    if (raced && S?.duel?.cup && from !== hostId) { cupRacerGone(from); if (role === 'host') publishCup(); } else duelReceive(ev, data);
    refreshDuelResults();
    if (role === 'host') { sendRoster(); maybeRematch(); cupDecide(); }
    changed();
  } else if (ev === 'start') {
    if (role === 'guest' && from === hostId && !raced) say('Update the game on every phone before starting.');
  } else if (ev === 'elim') {
    if (role !== 'guest' || from !== hostId || !S?.duel?.elim || data.race !== S.duel.seed) return;
    elimReceive(Array.isArray(data.out) ? data.out.slice(0, MAX_PLAYERS) : []); changed();
  } else if (ev === 'dnf') {
    if (!S || !S.duel || data.race !== S.duel.seed) return;
    duelReceive('bye', data); say((S.duel.peers[from]?.name || 'Racer') + ' did not finish.'); refreshDuelResults(); changed(); publishOutcomes(); cupDecide();
  } else if (ev === 'outcomes') {
    if (role !== 'guest' || from !== hostId || !S?.duel || data.race !== S.duel.seed || !Number.isInteger(data.rev) || data.rev <= receivedOutcome) return;
    receivedOutcome = data.rev; applyOutcomes(data.outcomes);
  } else if (ev === 'cup') {
    if (role === 'host' && raced && cup && from && from === others().find(p => !retired.has(p.id))?.id) {
      // This phone was the host, went quiet, and the room moved on: only the player next in line can say so, and only if their Cup marks us as gone.
      const next = cupFromMessage(data, from);
      if (next && leftIds(next).includes(myId) && !leftIds(next).includes(from)) {
        const name = roster.find(p => p.id === from)?.name || 'Another player';
        closeRoom(); say('You lost connection. ' + name + ' is hosting now.');
      }
      return;
    }
    if (from !== hostId) return;
    receiveCup(data);
  } else if (ev === 'bots') {
    if (role !== 'guest' || from !== hostId || !S?.duel?.cup || data.race !== S.duel.seed) return;
    receiveBots(data);
  } else if (ev === 'ghost') { if (!cup && !cupCfg) receiveGhost(from, data); }
  else {
    if ((ev === 'pos' || ev === 'fin') && S && S.duel && data.race !== S.duel.seed) return;
    duelReceive(ev, data); if (ev === 'fin') { refreshDuelResults(); publishOutcomes(); cupDecide(); }
  }
}
export const injectRoomMessage = onMessage;

function beginRace(level, seed, schedule) {
  if (started.has(seed)) return;
  // The stage and seed of a Cup race come from the Cup. A start that disagrees with this phone's copy is refused, never half-run.
  if (RACE_SEED.test(seed) !== !!cup || (cup && (seed !== raceSeed(cup) || level !== currentStage(cup)))) {
    closeRoom(); say('Start could not be confirmed. Rejoin the room.'); return;
  }
  raceElim = schedule?.elim === true;
  started.add(seed); handoverStart = null; awaitingStart = null;
  receivedOutcome = -1;
  wantMe = false; wants.clear(); raced = true;
  const id = myId;
  const epoch = generation;
  const cupRun = cup ? { host: role === 'host', difficulty: cup.difficulty, model: cup, race: cup.rounds.length + 1 } : null;
  const field = cup ? cup.racers.map((r, i) => ({ id: r.id, name: r.name, ai: r.bot, look: cupLooks[r.id] || cupBotLook(i, cup.seed) })).filter(r => r.id !== id) : others();
  const d = startDuel({ seed, level, elim: raceElim, friends: field, roster: cup ? cup.racers.map(r => r.id) : roster.map(p => p.id), meId: id, cup: cupRun, send: (ev, payload) => {
    if (epoch !== generation || S.duel?.cancelled) return;   // a start cancelled by a host handover reports nothing
    if (ev === 'fin' && !S.duel.dnf && S.duel.finish == null) S.duel.finish = payload.ft;
    if (room) room.send(ev, { id, ...payload, race: seed, session: sessionId });
    if (ev === 'fin') { refreshDuelResults(); publishOutcomes(); }
    if (ev === 'fin' || ev === 'dnf') cupDecide();
  } });
  d.managed = true; d.beganAt = Date.now(); d.elimHost = role === 'host';
  if (schedule) d.startRemaining = () => Math.max(0, (schedule.startAtLocal - schedule.now()) / 1000);
  for (const p of roster) seenAt[p.id] = Date.now();
  if (!cup) sendMyGhosts(level);   // a Cup leaves no ghosts
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
  if (lobby) lobby.tick();
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
      if (p.ai) continue;
      const silent = now - (seenAt[id] ?? d.beganAt) > STALE_MS;
      if (d.cup && !hostGone && p.fin == null && !p.bye) {   // in a Cup the host decides who has gone, and guests learn it from the host
        if (role === 'host' && silent) { cupRacerGone(id); say(p.name + ' lost connection. A bot takes over.'); publishCup(); cupDecide(); continue; }
        if (role !== 'host') continue;
      }
      if (!p.bye && p.fin == null && (silent || now - d.beganAt > 10 * 60 * 1000)) {
        duelReceive('bye', { id }); say(p.name + ' lost connection · DNF.'); refreshDuelResults();
      }
    }
    if (now - d.beganAt > 10 * 60 * 1000 && !S.race.finished) {
      forfeitDuel(); d.send('dnf', {}); say('Race timed out · DNF.');
    }
    publishOutcomes(); cupDecide();
    if (d.elim && d.elimHost && S.race.elim && S.race.elim.out.length) d.send('elim', { rev: ++S.race.elim.rev, out: S.race.elim.out.map(o => o.id) });
  }
  if (role === 'host' && cup) publishCup();   // the whole Cup so far, every time: this is what heals a lost result
  if (role === 'guest') {
    room.send('hello', { proto: PROTO, id: myId, name: myName(), look: LOOK, startProtocol: START_PROTOCOL });
    if (inRoster && !hostGone && seenAt[hostId] && now - seenAt[hostId] > STALE_MS) {
      if (raced && cup) { cupHostGone(); changed(); } else if (!raced) { closeRoom(); say('Lost contact with the host.'); } else { hostGone = true; elimAbort(); say(S?.duel?.elim ? 'Host lost connection. The elimination race is over.' : 'Host lost connection. Finish this race; create a new room for another.'); changed(); }
    }
  } else if (role === 'host') {
    const gone = others().filter(p => seenAt[p.id] && now - seenAt[p.id] > STALE_MS);
    if (gone.length) {
      roster = roster.filter(p => !gone.includes(p));
      for (const p of gone) { wants.delete(p.id); retired.add(p.id); if (cup) cupRacerGone(p.id); }
      if (cup) publishCup();
      maybeRematch(); changed();
    }
    if (roster.length > 1) sendRoster();
  }
  if (room) changed();
}

function bindRoom(r, epoch) {
  r.onMessage((ev, data) => { if (room === r && generation === epoch) onMessage(ev, data); });
  r.onClose(() => {
    if (room !== r || generation !== epoch) return;
    if (disconnectedAt === null) disconnectedAt = Date.now();
    if (lobby) lobby.setConnected(false);
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
    if (lobby) lobby.setConnected(true);
    say('Connected again.');
    if (role === 'host') sendRoster();
    else room.send('hello', { proto: PROTO, id: myId, name: myName(), look: LOOK, session: sessionId, startProtocol: START_PROTOCOL });
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
  roster = [{ id: myId, name: myName(), look: LOOK, protocol: START_PROTOCOL }]; hostId = myId; inRoster = true;
  sendRoster();
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
    room.send('hello', { proto: PROTO, id: myId, name: myName(), look: LOOK, startProtocol: START_PROTOCOL });
    const t = setTimeout(() => { if (joinWaiter === resolve) { joinWaiter = null; say('Nobody answered. Check the code and try again.'); resolve(false); } }, JOIN_WAIT_MS);
    if (t && t.unref) t.unref();
  });
  if (generation !== epoch) return false;
  if (!ok) { const keep = lastStatus; closeRoom(); say(keep); return false; }
  return true;   // the roster screen shows the stage and who is in
}

export const lobbyPlayers = () => (room && inRoster ? roster.map(p => {
  const info = lobby?.view().players.find(r => r.id === p.id);
  const stale = p.id === myId ? disconnectedAt !== null : Date.now() - (seenAt[p.id] ?? Date.now()) > 6000;
  return { id: p.id, name: p.name, look: p.look, me: p.id === myId, host: p.id === hostId, ready: !!info?.ready,
    status: stale ? 'reconnecting' : 'connected', connection: stale ? 'reconnecting' : info?.status || 'checking', latencyMs: info?.rtt ?? null };
}) : []);
export const roomLobbyState = () => lobby?.view() || { phase: 'idle', compatible: false, canReady: false, ready: false, pending: false, busy: false };
export function setRoomReady(ready) {
  if (!inRoster || raced || document.hidden || !lobby) return false;
  const previous = lobbyNotice; lobbyNotice = '';
  const ok = lobby.setReady(ready);
  if (!ok) lobbyNotice = previous;
  return ok;
}
export const canStartRoom = () => !!(!raced && lobby?.canStart() && (!cupCfg || validCup(cupCfg)));
export const lobbyStatus = () => lastStatus;
export const roomLevel = () => levelIdx;
// The host can change the stage any time before Start; everyone sees it on the next roster.
export function setRoomLevel(i) { if (role !== 'host' || !room || raced || cupCfg || !LEVELS[i]) return; levelIdx = i; sendRoster(); changed(); }
export const isHost = () => role === 'host';
// Format of the next race: the host picks it before Start; guests learn it from the roster.
export const roomElim = () => raceElim;
export function setRoomElim(v) { if (role !== 'host' || !room || raced) return; cupCfg = null; cup = null; raceElim = !!v; sendRoster(); changed(); }
// Format Cup: the host's choice of stages and bot difficulty, or null to leave the format. Guests see it on the roster and must ready again after any change.
export function setRoomCup(cfg) {
  if (role !== 'host' || !room || raced || (!cfg && !cupCfg)) return false;
  cup = null;
  cupCfg = cfg ? { stages: Array.isArray(cfg.stages) ? cfg.stages.slice(0, 8) : [], difficulty: cfg.difficulty } : null;
  if (cupCfg) { raceElim = false; if (validCup(cupCfg)) levelIdx = cupCfg.stages[0]; }
  ensureLobby();
  lobby.setPlayers(lobbyMembers(), -1, raceElim);   // the start code clears Ready when the level changes, so step away and back
  sendRoster(); changed();
  return true;
}
export const roomCup = () => (cupCfg ? { stages: [...cupCfg.stages], difficulty: cupCfg.difficulty, valid: validCup(cupCfg) } : null);
export const friendCup = () => cup;
export const friendCupStandings = () => (cup ? cupTable(cup) : []);
export const friendCupIsOver = () => !!cup && friendCupOver(cup);

// After a race everyone presses Rematch; the host then starts a new race on the same stage.
export function rematchCounts() { const o = others(); return { asked: o.filter(p => wants.has(p.id)).length, total: o.length }; }
export function rematchState() {
  if (S?.duel?.cup) return cupAction().state;
  const { asked, total } = rematchCounts();
  if (!room || !total || hostGone || (S && S.duel && (S.duel.dnf || others().some(p => S.duel.peers[p.id]?.bye)))) return 'gone';
  if (disconnectedAt !== null) return 'waiting';
  if (wantMe && asked === total) return 'starting';
  return wantMe ? 'waiting' : asked > 0 ? 'asked' : 'idle';
}
function showRematch() {
  const b = $('again'); if (!b || !S || !S.duel) return;
  if (S.duel.cup) { const a = cupAction(); b.textContent = a.label; b.disabled = a.disabled; return; }
  const st = rematchState(), c = rematchCounts();
  b.textContent = st === 'gone' ? 'Create a new room to race again' : disconnectedAt !== null ? 'Reconnecting...' : st === 'waiting' ? 'Waiting for others (' + (c.asked + 1) + '/' + (c.total + 1) + ')' : st === 'asked' ? 'Accept rematch' : 'Rematch';
  b.disabled = st === 'waiting' || st === 'starting';
}
function maybeRematch() {
  const o = others();
  if (role === 'host' && room && disconnectedAt === null && wantMe && o.length && o.every(p => wants.has(p.id)) && rematchState() !== 'gone' && !lobby?.view().busy) {
    lobby?.start(code + ':' + (raceNo + 1), { agreed: true }) && raceNo++;
  }
}
export function requestRematch() {
  if (S?.duel?.cup) { cupNextRace(); return; }
  if (!room || !others().length || hostGone || wantMe || rematchState() === 'gone' || disconnectedAt !== null) return;
  wantMe = true; room.send('rematch', { id: myId, session: sessionId, race: S.duel.seed }); maybeRematch(); showRematch();
}
export function hostStart() {
  if (role !== 'host' || !room || disconnectedAt !== null || !canStartRoom()) return;
  if (cupCfg) {
    rememberLooks();
    cup = newFriendCup({ seed: code + '-' + newId(), stages: cupCfg.stages, difficulty: cupCfg.difficulty, players: roster.map(p => ({ id: p.id, name: cleanName(p.name) })), rand: Math.random });
    if (!cup) return;
    publishCup();   // guests refuse the start until they have this
    if (!lobby.start(raceSeed(cup))) cup = null;
    return;
  }
  if (lobby.start(code + ':' + (raceNo + 1))) raceNo++;
}
export function leaveRoom() { closeRoom(); }
export const inviteLink = () => location.origin + location.pathname + '?room=' + code;
export const roomCode = () => code;
export { ui as duelUi };

document.addEventListener('visibilitychange', () => {
  if (!room) return;
  if (document.hidden) {
    hiddenAt = Date.now();
    if (!raced) lobby?.setReady(false);
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
