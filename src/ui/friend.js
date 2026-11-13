import { stageGroups, groupLabel, groupAvailable, cupPresets, syncBotOptions } from './friend-groups.js';
import { LEVELS } from '../config/levels.js';
import { DIFFICULTIES } from '../sim/race.js';
import { $ } from '../dom.js';
import { MAX_PLAYERS, duelUi, hostRoom, hostStart, inviteLink, isHost, joinRoom, leaveRoom, roomCode, roomElim, setRoomElim, roomLevel, setRoomLevel, setRoomReady, roomLobbyState, canStartRoom, setRoomCup, roomCup, friendCup, friendCupStandings, friendCupIsOver, PROTO } from '../online/duel.js';
import { go } from './screens.js';

/* ---------- Race friends: make a room or join one, see who is in, then the host starts ---------- */
let stage = 0, playerCount = 0;
// Location presets keep their tracks in LEVELS order.
const presets = cupPresets(LEVELS);
let cupStages = [...presets[0].indices], cupLevel = 1;
const groups = [];
let openCity = LEVELS[0].city;

const stageName = i => (LEVELS[i] ? LEVELS[i].name : '?');
const cupLine = c => {
  const named = c && c.valid ? c.stages.map(stageName).join(', ') : null, diff = c && DIFFICULTIES[c.difficulty];
  return 'Friend Cup' + (named ? ': ' + LEVELS[c.stages[0]].city + ' (' + c.stages.length + ' races): ' + named : '') + (diff ? ' · ' + diff.name + ' bots' : '');
};
function sendCup() { setRoomCup({ stages: cupStages.slice(), difficulty: cupLevel, bots: roomCup()?.bots ?? 'fill' }); }
const st = () => document.querySelectorAll('#friendStages .chip');
const view = id => { for (const v of ['friendHome', 'friendHost', 'friendGuest', 'friendJoin']) $(v).hidden = v !== id; };

function reset() {
  leaveRoom(); view('friendHome'); $('friendStatus').textContent = '';
  $('friendStart').disabled = true; $('friendShare').disabled = true; $('friendCode').textContent = '----'; $('friendCodeG').textContent = '----';
  $('friendGo').disabled = false;
  $('friendReady').hidden = true;
  cupStages = [...presets[0].indices]; cupLevel = 1; openCity = LEVELS[stage].city;
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
  const n = playerCount = players.length;
  const lobby = roomLobbyState(), mine = players.find(p => p.me);
  $('friendStart').disabled = !canStartRoom();
  $('friendStart').textContent = lobby.busy ? 'Preparing race...' : canStartRoom() ? 'Start race (' + n + ' players)' : 'Start race';
  $('friendReady').hidden = !n || isHost() || lobby.phase === 'running';
  $('friendReady').disabled = lobby.pending || (!lobby.canReady && !(mine?.ready && lobby.busy));
  $('friendReady').textContent = lobby.pending ? 'Confirming...' : mine?.ready ? 'Not ready' : 'Ready';
  $('friendReady').setAttribute('aria-pressed', String(!!mine?.ready));
  const cfg = roomCup(), format = cfg ? 2 : roomElim() ? 1 : 0, code = roomCode();
  const shown = cfg ? cupLine(cfg) : stageName(roomLevel()) + (roomElim() ? ' · Elimination' : '');
  document.querySelectorAll('#friendFormat .chip').forEach((c, i) => c.setAttribute('aria-pressed', String(i === format)));
  if (isHost()) showStages(cfg);
  if (isHost() && code) $('friendShare').textContent = cfg ? 'Send invite · ' + code : 'Send invite';   // a Cup setup needs the room, so the code moves into the button
  const diff = cfg && DIFFICULTIES[cfg.difficulty];
  if (isHost() && n) $('friendStatus').textContent = cfg && !cfg.valid ? 'Choose a location preset.' :
    (cfg ? 'Friend Cup · ' + (diff ? diff.name : '?') + ' bots' : shown) + '. ' + (n < 2 ? 'Waiting for friends to join...' : cfg ? n + ' players, ' + (cfg.botCount ? cfg.botCount + ' bots' : 'no bots') + '. Ready when you are.' : n < MAX_PLAYERS ? n + ' in the room. Start now or wait for more.' : 'Room is full. Ready when you are.');
  if (!isHost() && n) { view('friendGuest'); $('friendCodeG').textContent = roomCode(); $('friendStatus').textContent = (cfg ? shown : 'Stage: ' + shown) + '. Waiting for the host to start...'; }
}

// Cups select a whole location; plain races keep expandable track groups.
function showStages(cfg) {
  st().forEach(o => {
    const j = Number(o.dataset.stage);
    const at = cupStages.indexOf(j);
    o.textContent = cfg && at >= 0 ? (at + 1) + '. ' + stageName(j) : stageName(j);
    o.setAttribute('aria-pressed', String(cfg ? at >= 0 : j === roomLevel()));
    o.disabled = false;
  });
  for (const g of groups) {
    g.button.textContent = cfg ? g.city + ' Cup · ' + g.indices.length + ' races: ' + g.indices.map(stageName).join(', ') : groupLabel(LEVELS, g, roomLevel(), false);
    g.button.setAttribute('aria-pressed', String(!!cfg && cfg.stages[0] === g.indices[0]));
    g.button.parentElement.hidden = !groupAvailable(g, !!cfg);
    g.button.setAttribute('aria-expanded', String(g.city === openCity)); g.tracks.hidden = !!cfg || g.city !== openCity;
  }
  $('friendCupBots').hidden = !cfg;
  const select = $('friendBotCount');
  if (cfg) syncBotOptions(select, playerCount, cfg.bots, () => document.createElement('option'));
  $('friendCupLevel').hidden = !cfg;
  $('friendHost').classList.toggle('cup', !!cfg);
  $('friendHost').classList.toggle('full', !!cfg && st().length > 0 && playerCount >= MAX_PLAYERS);
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
    let group = groups.find(g => g.city === L.city);
    if (!group) {
      const box = document.createElement('div'), button = document.createElement('button'), tracks = document.createElement('div');
      box.className = 'friendStageGroup'; button.type = 'button'; button.className = 'friendCity'; tracks.className = 'friendTracks';
      group = { ...stageGroups(LEVELS).find(g => g.city === L.city), button, tracks }; groups.push(group); box.append(button, tracks); stBox.appendChild(box);
      button.addEventListener('click', () => { if (roomCup()) { cupStages = [...group.indices]; sendCup(); return; } openCity = openCity === L.city ? null : L.city; showStages(roomCup()); });
    }
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.dataset.stage = String(i); c.textContent = L.name; c.setAttribute('aria-pressed', String(i === 0));
    c.addEventListener('click', () => {
      if (roomCup()) return;
      stage = i; setRoomLevel(i); showStages(null);
    });
    group.tracks.appendChild(c);
  });
  showStages(null);
  $('friendBotCount').addEventListener('change', e => { const cfg = roomCup(); if (cfg) setRoomCup({ ...cfg, bots: e.target.value === 'fill' ? 'fill' : Number(e.target.value) }); });
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
