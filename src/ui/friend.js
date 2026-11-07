import { LEVELS } from '../config/levels.js';
import { $ } from '../dom.js';
import { MAX_PLAYERS, duelUi, hostRoom, hostStart, inviteLink, isHost, joinRoom, leaveRoom, roomCode, roomLevel, setRoomLevel } from '../online/duel.js';
import { go } from './screens.js';

/* ---------- Race friends: make a room or join one, see who is in, then the host starts ---------- */
let stage = 0;
const st = () => document.querySelectorAll('#friendStages .chip');
const view = id => { for (const v of ['friendHome', 'friendHost', 'friendGuest', 'friendJoin']) $(v).hidden = v !== id; };

function reset() {
  leaveRoom(); view('friendHome'); $('friendStatus').textContent = '';
  $('friendStart').disabled = true; $('friendShare').disabled = true; $('friendCode').textContent = '----'; $('friendCodeG').textContent = '----';
  $('friendGo').disabled = false;
}

export function openFriend() { reset(); go('friend'); }

// the list of who is in the room: eight slots in two columns, empty ones dashed; the host's Start needs at least one friend
function showRoster(players) {
  document.querySelectorAll('.friendroster').forEach(ul => {
    ul.textContent = '';
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = players[i], li = document.createElement('li');
      if (p) { li.textContent = (p.host ? '★ ' : '') + p.name + (p.me ? ' (you)' : '') + (p.status === 'reconnecting' ? ' · reconnecting' : ''); if (p.me) li.className = 'me'; } else { li.textContent = 'waiting...'; li.className = 'empty'; }
      ul.appendChild(li);
    }
  });
  const n = players.length;
  $('friendStart').disabled = !(isHost() && n >= 2);
  $('friendStart').textContent = n >= 2 ? 'Start race (' + n + ' players)' : 'Start race';
  const stageName = LEVELS[roomLevel()].city;
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
  $('friendBack').addEventListener('click', leaveRoom);
  $('friendMake').addEventListener('click', async () => {
    view('friendHost');
    const code = await hostRoom(stage);
    if (code) { $('friendCode').textContent = code; $('friendShare').disabled = false; } else view('friendHome');
  });
  $('friendJoinBtn').addEventListener('click', () => { view('friendJoin'); $('friendStatus').textContent = ''; $('friendInput').focus(); });
  $('friendGo').addEventListener('click', async () => {
    $('friendGo').disabled = true;
    const ok = await joinRoom($('friendInput').value);
    if (!ok) $('friendGo').disabled = false;
  });
  $('friendInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('friendGo').click(); });
  $('friendShare').addEventListener('click', invite);
  $('friendStart').addEventListener('click', hostStart);
  // an invite link opens straight into joining
  const m = typeof location !== 'undefined' ? /[?&]room=([A-Za-z0-9]{4})/.exec(location.search) : null;
  if (m) {
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    reset(); go('friend'); view('friendJoin'); $('friendInput').value = m[1].toUpperCase();
    $('friendGo').click();
  }
}
