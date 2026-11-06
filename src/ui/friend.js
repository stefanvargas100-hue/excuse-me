import { LEVELS } from '../config/levels.js';
import { $ } from '../dom.js';
import { duelUi, hostRoom, hostStart, inviteLink, joinRoom, leaveRoom, roomCode } from '../online/duel.js';
import { go } from './screens.js';

/* ---------- Race a friend: make a room or join one, then the host starts ---------- */
let stage = 0;
const view = id => { for (const v of ['friendHome', 'friendHost', 'friendJoin']) $(v).hidden = v !== id; };

function reset() {
  leaveRoom(); view('friendHome'); $('friendStatus').textContent = '';
  $('friendStart').disabled = true; $('friendShare').disabled = true; $('friendCode').textContent = '----';
  document.querySelectorAll('#friendStages .chip').forEach(c => { c.disabled = false; });
}

export function openFriend() { reset(); go('friend'); }

async function invite() {
  const url = inviteLink(), text = 'Race me in Excuse Me! Room ' + roomCode();
  try {
    if (navigator.share) await navigator.share({ title: 'Excuse Me', text, url });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text + ' ' + url); $('friendStatus').textContent = 'Invite link copied. Send it to your friend.'; }
  } catch (e) {}
}

export function initFriend() {
  const st = $('friendStages');
  LEVELS.forEach((L, i) => {
    const c = document.createElement('button'); c.type = 'button'; c.className = 'chip'; c.textContent = L.city; c.setAttribute('aria-pressed', String(i === 0));
    c.addEventListener('click', () => { stage = i; st.querySelectorAll('.chip').forEach((o, j) => o.setAttribute('aria-pressed', String(j === i))); });
    st.appendChild(c);
  });
  duelUi.status = t => { $('friendStatus').textContent = t; };
  duelUi.ready = name => { $('friendStatus').textContent = name + ' joined. Ready when you are.'; $('friendStart').disabled = false; };
  $('friendBack').addEventListener('click', leaveRoom);
  $('friendMake').addEventListener('click', async () => {
    view('friendHost'); st.querySelectorAll('.chip').forEach(c => { c.disabled = true; });
    const code = await hostRoom(stage);
    if (code) { $('friendCode').textContent = code; $('friendShare').disabled = false; } else { view('friendHome'); st.querySelectorAll('.chip').forEach(c => { c.disabled = false; }); }
  });
  $('friendJoinBtn').addEventListener('click', () => { view('friendJoin'); $('friendStatus').textContent = ''; $('friendInput').focus(); });
  $('friendGo').addEventListener('click', async () => { const ok = await joinRoom($('friendInput').value); if (ok) $('friendGo').disabled = true; else $('friendGo').disabled = false; });
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
