import { LEVELS } from '../config/levels.js';
import { $ } from '../dom.js';
import { MAX_PLAYERS, duelUi, hostRoom, hostStart, inviteLink, isHost, joinRoom, leaveRoom, roomCode, roomElim, setRoomElim, roomLevel, setRoomLevel, setRoomReady, roomLobbyState, canStartRoom } from '../online/duel.js';
import { go } from './screens.js';

/* ---------- Race friends: make a room or join one, see who is in, then the host starts ---------- */
let stage = 0;
const st = () => document.querySelectorAll('#friendStages .chip');
const view = id => { for (const v of ['friendHome', 'friendHost', 'friendGuest', 'friendJoin']) $(v).hidden = v !== id; };

function reset() {
  leaveRoom(); view('friendHome'); $('friendStatus').textContent = '';
  $('friendStart').disabled = true; $('friendShare').disabled = true; $('friendCode').textContent = '----'; $('friendCodeG').textContent = '----';
  $('friendGo').disabled = false;
  $('friendReady').hidden = true;
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
  const stageName = LEVELS[roomLevel()].city + (roomElim() ? ' ? Elimination' : '');
  document.querySelectorAll('#friendFormat .chip').forEach((c, i) => c.setAttribute('aria-pressed', String((i === 1) === roomElim())));
  if (isHost()) st().forEach((o, j) => o.setAttribute('aria-pressed', String(j === roomLevel())));
  if (isHost() && n) $('friendStatus').textContent = stageName + '. ' + (n < 2 ? 'Waiting for friends to join...' : n < MAX_PLAYERS ? n + ' in the room. Start now or wait for more.' : 'Room is full. Ready when you are.');
  if (!isHost() && n) { view('friendGuest'); $('friendCodeG').textContent = roomCode(); $('friendStatus').textContent = 'Stage: ' + stageName + '. Waiting for the host to start...'; }
}

async function invite() {
  const url = inviteLink(), text = 'Race me in Excuse Me! Room ' + roomCode();
  try {
    if (navigator.share) await navigator.share({ title: 'Excuse Me', text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); $('friendStatus').textContent = 'Invite link copied. Send it to your friends.'; }
  } catch (e) {}
}

export function initFriend() {
  const stBox = $('friendStages');
  LEVELS.forEach((L, i) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = L.city; c.setAttribute('aria-pressed', String(i === 0));
    c.addEventListener('click', () => { stage = i; setRoomLevel(i); st().forEach((o, j) => o.setAttribute('aria-pressed', String(j === i))); });
    stBox.appendChild(c);
  });
  duelUi.status = (t, live) => { $('friendStatus').textContent = t; $('liveStatus').textContent = t; $('liveStatus').hidden = !live || !t; };
  duelUi.roster = players => {
    if (players.length) showRoster(players);
    else if (!$('friendGuest').hidden) { view('friendHome'); $('friendStart').disabled = true; }   // the host closed the room on us
  };
  document.querySelectorAll('#friendFormat .chip').forEach((c, i) => c.addEventListener('click', () => setRoomElim(i === 1)));
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
