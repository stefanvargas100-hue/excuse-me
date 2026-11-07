// Wires the leaderboard client into the game. Public values only: the "publishable" key is safe to ship in a web page.
import { $ } from '../dom.js';
import { store } from '../save/store.js';
import { account } from '../save/level.js';
import { packGhost } from '../sim/ghostshare.js';
import { createBoard } from './board.js';

const URL = 'https://hrsbzntphratlnkrevet.supabase.co';
const KEY = 'sb_publishable_FoFHiii4XagCq3-oi3ygQg_UcyZNoJn';

const net = typeof fetch === 'function' ? createBoard({ fetch: (...a) => fetch(...a), url: URL, key: KEY, store, profile: () => ({ level: account.level(), title: account.title().name, pic: account.pic().glyph }) }) : null;

export const boardId = (mode, key) => mode + ':' + key;

export function flushScores() { if (net) net.flush(); }

let sending = Promise.resolve();

// After a daily or weekly run: send the score (the server keeps only the first try).
export function submitRun(mode, key, score) {
  if (!net) return;
  sending = net.submit(boardId(mode, key), score).catch(() => {});
}

// After a new classic best: keep your best score per stage on the server.
// If that puts you in the top 3, your ghost goes up too (the server only keeps ghosts of the top 3).
export function submitBestRun(stageId, score, path) {
  if (!net) return;
  const board = boardId('classic', stageId);
  sending = net.submitBest(board, score).catch(() => {}).then(() => { const g = packGhost(path); return g ? net.submitGhost(board, score, g) : null; }).catch(() => {});
}

// On the results screen: once the score is sent, show the top of that board.
export async function showRunBoard(mode, key) { await sending; return showTop(boardId(mode, key)); }

export async function showTop(id) {
  const bd = $('dayBoard'); if (!net || !bd) return;
  const rows = await net.top(id, 3);
  bd.innerHTML = '';
  if (!rows.length) { bd.hidden = true; return; }
  rows.forEach((r, i) => {
    const li = document.createElement('li'); if (r.you) li.className = 'me';
    li.textContent = (i + 1) + '. ' + (r.pic ? r.pic + ' ' : '') + r.name + ' · Lv ' + r.level + ' · ' + r.score.toLocaleString('en-US');
    bd.appendChild(li);
  });
  bd.hidden = false;
}

// Top scores of any board, for the leaderboard screen.
export async function loadBoard(id, limit) { return net ? net.top(id, limit || 20) : []; }

export const myName = () => (net ? net.playerName() : 'Player');

// Top-3 ghosts: stored on the server only for the three best players of a classic stage. Fails quietly if the server part is not set up.
export async function fetchTopGhosts(stageId) { return net ? net.topGhosts(boardId('classic', stageId)) : []; }
