/* ---------- which leaderboard to show ---------- */
// Same names the game writes scores to (see online.js boardId): daily:<date>, weekly:<week>, classic:<stage id>.
import { LEVELS } from '../config/levels.js';
import { todayKey, weekKey } from '../config/util.js';
import { CHALLENGE_RULES, boardNameFor, utcWeekKey } from '../config/challenge.js';

export const BOARD_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'classic', label: 'Classic' },
  { id: 'challenge', label: 'Challenge' }
];

export function boardIdFor(tab, stage) {
  if (tab === 'daily') return 'daily:' + todayKey();
  if (tab === 'weekly') return 'weekly:' + weekKey();
  if (tab === 'challenge') return boardNameFor(utcWeekKey(), CHALLENGE_RULES);
  return 'classic:' + LEVELS[stage].id;
}

export function boardTitle(tab, stage) {
  if (tab === 'daily') return 'Today · same crowd for everyone';
  if (tab === 'weekly') return 'This week · same crowd for everyone';
  if (tab === 'challenge') return 'Weekly challenge · best time · same course and outfit';
  return LEVELS[stage].city + ' · ' + LEVELS[stage].name + ' · best score';
}
