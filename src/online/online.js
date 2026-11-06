// Wires the leaderboard client into the game. Public values only: the "publishable" key is safe to ship in a web page.
import { $ } from '../dom.js';
import { store } from '../save/store.js';
import { createBoard } from './board.js';

const URL = 'https://hrsbzntphratlnkrevet.supabase.co';
const KEY = 'sb_publishable_FoFHiii4XagCq3-oi3ygQg_UcyZNoJn';

const net = typeof fetch === 'function' ? createBoard({ fetch: (...a) => fetch(...a), url: URL, key: KEY, store }) : null;

export const boardId = (mode, key) => mode + ':' + key;

export function flushScores() { if (net) net.flush(); }

let sending = Promise.resolve();

// After a daily or weekly run: send the score (the server keeps only the first try).
export function submitRun(mode, key, score) {
  if (!net) return;
  sending = net.submit(boardId(mode, key), score).catch(() => {});
}

// After a new classic best: keep your best score per stage on the server.
export function submitBestRun(stageId, score) {
  if (!net) return;
  sending = net.submitBest(boardId('classic', stageId), score).catch(() => {});
}

// On the results screen: once the score is sent, show the top of that board.
export async function showRunBoard(mode, key) { await sending; return showTop(boardId(mode, key)); }

export async function showTop(id) {
  const bd = $('dayBoard'); if (!net || !bd) return;
  const rows = await net.top(id, 5);
  bd.innerHTML = '';
  if (!rows.length) { bd.hidden = true; return; }
  rows.forEach((r, i) => {
    const li = document.createElement('li'); if (r.you) li.className = 'me';
    li.textContent = (i + 1) + '. ' + r.name + ' · ' + r.score.toLocaleString('en-US') + (r.you ? ' (you)' : '');
    bd.appendChild(li);
  });
  bd.hidden = false;
}
