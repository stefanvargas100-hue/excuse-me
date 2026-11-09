/* ---------- which leaderboard to show ---------- */
// Same names the game writes scores to (see online.js boardId): daily:<date>, weekly:<week>, classic:<stage id>.
import { LEVELS } from '../config/levels.js';
import { todayKey, weekKey } from '../config/util.js';
import { CHALLENGE_RULES, boardNameFor, utcWeekKey } from '../config/challenge.js';

export const BOARD_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'classic', label: 'Classic' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'race', label: 'Race' }
];

export function boardIdFor(tab, stage) {
  if (tab === 'race') return 'race:' + LEVELS[stage].id;
  if (tab === 'daily') return 'daily:' + todayKey();
  if (tab === 'weekly') return 'weekly:' + weekKey();
  if (tab === 'challenge') return boardNameFor(utcWeekKey(), CHALLENGE_RULES);
  return 'classic:' + LEVELS[stage].id;
}

export function boardTitle(tab, stage) {
  if (tab === 'race') return LEVELS[stage].city + ' - ' + LEVELS[stage].name + ' - best time - friendly board';
  if (tab === 'daily') return 'Today · same crowd for everyone';
  if (tab === 'weekly') return 'This week · same crowd for everyone';
  if (tab === 'challenge') return 'Weekly challenge · best time · same course and outfit';
  return LEVELS[stage].city + ' · ' + LEVELS[stage].name + ' · best score';
}

// Enable only after the Director applies and verifies migration 0003.
export const RACE_SUBMIT_ENABLED = false;
export const raceBoardNotice = () => RACE_SUBMIT_ENABLED ? '' : 'Race boards coming soon.';
// Inverted milliseconds reuse the existing highest-score-first storage and best-score trigger.
export const validRaceTime = ms => Number.isFinite(ms) && ms >= 1 && ms <= 2000000;
export const encodeRaceTime = ms => 2000000 - Math.round(ms);
export const fmtRaceScore = score => {
  const cs = Math.floor((2000000 - score) / 10);
  return Math.floor(cs / 6000) + ':' + String(Math.floor(cs / 100) % 60).padStart(2, '0') + '.' + String(cs % 100).padStart(2, '0');
};
