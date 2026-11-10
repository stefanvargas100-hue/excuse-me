import { classicTag } from '../sim/classic-rules.js';
import { RACE_SUBMIT_ENABLED, encodeRaceTime, validRaceTime } from './boards.js';
// Wires the leaderboard client into the game. Public values only: the "publishable" key is safe to ship in a web page.
import { $ } from '../dom.js';
import { PLAYTEST } from '../config/channel.js';
import { store } from '../save/store.js';
import { account } from '../save/level.js';
import { packGhost } from '../sim/ghostshare.js';
import { createBoard } from './board.js';
import { CHALLENGE_SUBMIT_ENABLED, boardNameFor, encodeChallengeTime, fmtChallengeScore, validChallengeTime } from '../config/challenge.js';

const URL = 'https://hrsbzntphratlnkrevet.supabase.co';
const KEY = 'sb_publishable_FoFHiii4XagCq3-oi3ygQg_UcyZNoJn';

// The playtest behaves as if offline, so it never signs up a player or posts a score to the live boards.
const offlineFetch = () => Promise.reject(new Error('playtest'));
const net = typeof fetch === 'function' ? createBoard({ fetch: PLAYTEST ? offlineFetch : (...a) => fetch(...a), url: URL, key: KEY, store, profile: () => ({ level: account.level(), title: account.title().name, pic: account.pic().glyph }) }) : null;

export const boardId = (mode, key) => mode + ':' + key + (mode === 'classic' ? classicTag : '');

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

// After a weekly-challenge finish: your best time of the week goes to its own board (the server only ever keeps the best). Off until
// the database update is applied; see config/challenge.js.
export function submitChallenge(week, rules, ms) {
  if (!net || !CHALLENGE_SUBMIT_ENABLED || !validChallengeTime(ms)) return;
  sending = net.submitBest(boardNameFor(week, rules), encodeChallengeTime(ms)).catch(() => {});
}

export function submitRaceTime(stageId, ms) {
  if (!net || PLAYTEST || !RACE_SUBMIT_ENABLED || !validRaceTime(ms)) return;
  sending = net.submitBest(boardId('race', stageId), encodeRaceTime(ms)).catch(() => {});
}

// On the results screen: once the score is sent, show the top of that board.
export async function showRunBoard(mode, key) { await sending; return showTop(boardId(mode, key), mode === 'wchal' ? fmtChallengeScore : undefined); }

export async function showTop(id, fmt) {
  const bd = $('dayBoard'); if (!net || !bd) return;
  const rows = await net.top(id, 3);
  bd.innerHTML = '';
  if (!rows.length) { bd.hidden = true; return; }
  rows.forEach((r, i) => {
    const li = document.createElement('li'); if (r.you) li.className = 'me';
    li.textContent = (i + 1) + '. ' + (r.pic ? r.pic + ' ' : '') + r.name + ' · Lv ' + r.level + ' · ' + (fmt ? fmt(r.score) : r.score.toLocaleString('en-US'));
    bd.appendChild(li);
  });
  bd.hidden = false;
}

// Top scores of any board, for the leaderboard screen.
export async function loadBoard(id, limit) { return id.startsWith('race:') && (!RACE_SUBMIT_ENABLED || PLAYTEST) ? [] : net ? net.top(id, limit || 20) : []; }

export const myName = () => (net ? net.playerName() : 'Player');

// Top-3 ghosts: stored on the server only for the three best players of a classic stage. Fails quietly if the server part is not set up.
export async function fetchTopGhosts(stageId) { return net ? net.topGhosts(boardId('classic', stageId)) : []; }
