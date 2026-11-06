/* ---------- which leaderboard to show ---------- */
// Same names the game writes scores to (see online.js boardId): daily:<date>, weekly:<week>, classic:<stage id>.
import { LEVELS } from '../config/levels.js';
import { todayKey, weekKey } from '../config/util.js';

export const BOARD_TABS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'classic', label: 'Classic' }
];

export function boardIdFor(tab, stage) {
  if (tab === 'daily') return 'daily:' + todayKey();
  if (tab === 'weekly') return 'weekly:' + weekKey();
  return 'classic:' + LEVELS[stage].id;
}

export function boardTitle(tab, stage) {
  if (tab === 'daily') return 'Today · same crowd for everyone';
  if (tab === 'weekly') return 'This week · same crowd for everyone';
  return LEVELS[stage].city + ' · ' + LEVELS[stage].name + ' · best score';
}
