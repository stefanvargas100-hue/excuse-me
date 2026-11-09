import { LEVELS } from '../config/levels.js';
import { DIFFICULTIES } from '../sim/race.js';
import { $ } from '../dom.js';
import { MAX_PLAYERS, duelUi, hostRoom, hostStart, inviteLink, isHost, joinRoom, leaveRoom, roomCode, roomElim, setRoomElim, roomLevel, setRoomLevel, setRoomReady, roomLobbyState, canStartRoom, setRoomCup, roomCup, friendCup, friendCupStandings, friendCupIsOver, PROTO } from '../online/duel.js';
import { go } from './screens.js';

/* ---------- Race friends: make a room or join one, see who is in, then the host starts ---------- */
let stage = 0;
// Cup setup on the host's phone: stages in race order, and the bots' difficulty. Friend Cups use stages 0-4 for now.
let cupStages = [], cupLevel = 1;
const CUP_STAGE_MAX = 4, CUP_RACES = 4;
const stageName = i => (LEVELS[i] ? LEVELS[i].name : '?');
const cupLine = c => {
  const named = c && c.valid ? c.stages.map(stageName).join(', ') : null, diff = c && DIFFICULTIES[c.difficulty];
  return 'Friend Cup' + (named ? ': ' + named : '') + (diff ? ' · ' + diff.name + ' bots' : '');
};
function sendCup() { setRoomCup({ stages: cupStages.slice(), difficulty: cupLevel }); }
const st = () => document.querySelectorAll('#friendStages .chip');
const view = id => { for (const v of ['friendHome', 'friendHost', 'friendGuest', 'friendJoin']) $(v).hidden = v !== id; };

function reset() {
  leaveRoom(); view('friendHome'); $('friendStatus').textContent = '';
  $('friendStart').disabled = true; $('friendShare').disabled = true; $('friendCode').textContent = '----'; $('friendCodeG').textContent = '----';
  $('friendGo').disabled = false;
  $('friendReady').hidden = true;
  cupStages = []; cupLevel = 1;
}

export function openFriend() { reset(); go('friend'); }

// the list of who is in the room: eight slots in two columns, empty ones dashed; the host's Start needs at least one friend
function showRoster(players) {
  document.querySelectorAll('.friendroster').forEach(ul => {
    ul.textContent = '';
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = players[i], li = document.createElement('li');
      if (p) {
        li.textContent = (p.host ? '★ ' : '') + p.name + (p.me ? ' (you)' : '');
        const detail = document.createElement('small');
        const labels = { good: 'Good connection', slow: 'Slow connection', checking: 'Checking', reconnecting: 'Reconnecting', update: 'Update game' };
        detail.textContent = (p.ready ? 'Ready' : 'Not ready') + ' · ' + (labels[p.connection] || 'Checking connection') + (p.latencyMs == null ? '' : ' · ' + p.latencyMs + ' ms');
        li.appendChild(detail); if (p.me) li.className = 'me';
      } else { li.textContent = 'waiting...'; li.className = 'empty'; }
      ul.appendChild(li);
    }
  });
  const n = players.length;
  const lobby = roomLobbyState(), mine = players.find(p => p.me);
  $('friendStart').disabled = !canStartRoom();
  $('friendStart').textContent = lobby.busy ? 'Preparing race...' : canStartRoom() ? 'Start race (' + n + ' players)' : n >= 2 ? 'Ready ' + players.filter(p => p.ready).length + '/' + n : 'Start race';
  $('friendReady').hidden = !n || lobby.phase === 'running';
  $('friendReady').disabled = lobby.pending || (!lobby.canReady && !(mine?.ready && lobby.busy));
  $('friendReady').textContent = lobby.pending ? 'Confirming...' : mine?.ready ? 'Not ready' : 'Ready';
  $('friendReady').setAttribute('aria-pressed', String(!!mine?.ready));
  const cfg = roomCup(), format = cfg ? 2 : roomElim() ? 1 : 0, code = roomCode();
  const shown = cfg ? cupLine(cfg) : stageName(roomLevel()) + (roomElim() ? ' · Elimination' : '');
  document.querySelectorAll('#friendFormat .chip').forEach((c, i) => c.setAttribute('aria-pressed', String(i === format)));
  if (isHost()) showStages(cfg);
  if (isHost() && code) $('friendShare').textContent = cfg ? 'Send invite · ' + code : 'Send invite';   // a Cup setup needs the room, so the code moves into the button
  const diff = cfg && DIFFICULTIES[cfg.difficulty];
  if (isHost() && n) $('friendStatus').textContent = cfg && !cfg.valid ? 'Friend Cup: pick ' + (CUP_RACES - cupStages.length) + ' more stage' + (CUP_RACES - cupStages.length === 1 ? '' : 's') + ', in race order.' :
    (cfg ? 'Friend Cup · ' + (diff ? diff.name : '?') + ' bots' : shown) + '. ' + (n < 2 ? 'Waiting for friends to join...' : cfg ? n + ' players, ' + (8 - n) + ' bots. Ready when you are.' : n < MAX_PLAYERS ? n + ' in the room. Start now or wait for more.' : 'Room is full. Ready when you are.');
  if (!isHost() && n) { view('friendGuest'); $('friendCodeG').textContent = roomCode(); $('friendStatus').textContent = (cfg ? shown : 'Stage: ' + shown) + '. Waiting for the host to start...'; }
}

// The stage buttons: one stage for a race, or four in race order for a Cup (the number shows each one's race).
function showStages(cfg) {
  st().forEach((o, j) => {
    const at = cupStages.indexOf(j);
    o.textContent = cfg && at >= 0 ? (at + 1) + '. ' + stageName(j) : stageName(j);
    o.setAttribute('aria-pressed', String(cfg ? at >= 0 : j === roomLevel()));
    o.disabled = !!cfg && j > CUP_STAGE_MAX;
  });
  $('friendCupLevel').hidden = !cfg;
  $('friendHost').classList.toggle('cup', !!cfg);
  $('friendHost').classList.toggle('full', !!cfg && st().length > 0 && document.querySelectorAll('#friendHost .friendroster li:not(.empty)').length >= MAX_PLAYERS);
  document.querySelectorAll('#friendCupLevel .chip').forEach((c, i) => c.setAttribute('aria-pressed', String(!!cfg && i === cfg.difficulty)));
}

async function invite() {
  const url = inviteLink(), text = 'Race me in Excuse Me! Room ' + roomCode();
  try {
    if (navigator.share) await navigator.share({ title: 'Excuse Me', text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); $('friendStatus').textContent = 'Invite link copied. Send it to your friends.'; }
  } catch (e) {}
}

export function initFriend() {
  // test and fit-check hooks: main.js builds window.__excuse after this runs
  Promise.resolve().then(() => { if (window.__excuse) Object.assign(window.__excuse, { setRoomCup, roomCup, friendCup, friendCupStandings, friendCupOver: friendCupIsOver, PROTO }); });
  const stBox = $('friendStages');
  LEVELS.forEach((L, i) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = L.name; c.setAttribute('aria-pressed', String(i === 0));
    c.addEventListener('click', () => {
      if (roomCup()) {   // Cup: tap stages in race order; tap a chosen one again to take it out
        const at = cupStages.indexOf(i);
        if (at >= 0) cupStages.splice(at, 1); else if (cupStages.length < CUP_RACES && i <= CUP_STAGE_MAX) cupStages.push(i);
        sendCup(); return;
      }
      stage = i; setRoomLevel(i); st().forEach((o, j) => o.setAttribute('aria-pressed', String(j === i)));
    });
    stBox.appendChild(c);
  });
  duelUi.status = (t, live) => { $('friendStatus').textContent = t; $('liveStatus').textContent = t; $('liveStatus').hidden = !live || !t; };
  duelUi.roster = players => {
    if (players.length) showRoster(players);
    else if (!$('friendGuest').hidden) { view('friendHome'); $('friendStart').disabled = true; }   // the host closed the room on us
  };
  document.querySelectorAll('#friendFormat .chip').forEach((c, i) => c.addEventListener('click', () => {
    if (i === 2) { if (!roomCup()) { cupStages = []; sendCup(); } }
    else { setRoomElim(i === 1); setRoomLevel(stage); }
  }));
  document.querySelectorAll('#friendCupLevel .chip').forEach((c, i) => c.addEventListener('click', () => { cupLevel = i; sendCup(); }));
  $('friendBack').addEventListener('click', leaveRoom);
  $('friendMake').addEventListener('click', async () => {
    view('friendHost');
    const code = await hostRoom(stage);
    if (code) { $('friendCode').textContent = code; $('friendShare').disabled = false; } else view('friendHome');
  });
  $('friendJoinBtn').addEventListener('click', () => { view('friendJoin'); $('friendStatus').textContent = ''; $('friendInput').focus(); });
  $('friendGo').addEventListener('click', async () => {
    $('friendInput').blur();   // dismiss the phone keyboard before the lobby replaces this view
    $('friendGo').disabled = true;
    const ok = await joinRoom($('friendInput').value);
    if (!ok) $('friendGo').disabled = false;
  });
  $('friendInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('friendGo').click(); });
  $('friendShare').addEventListener('click', invite);
  $('friendStart').addEventListener('click', hostStart);
  $('friendReady').addEventListener('click', () => setRoomReady(!lobbyPlayersReady()));
  // an invite link opens straight into joining
  const m = typeof location !== 'undefined' ? /[?&]room=([A-Za-z0-9]{4})/.exec(location.search) : null;
  if (m) {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    reset(); go('friend'); view('friendJoin'); $('friendInput').value = m[1].toUpperCase();
    $('friendGo').click();
  }
}

const lobbyPlayersReady = () => roomLobbyState().ready;
