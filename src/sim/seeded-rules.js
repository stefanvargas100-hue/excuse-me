import { todayKey, weekKey } from '../config/util.js';
export const SEEDED_RULES = 'mp2';
export const isSeeded = mode => mode === 'daily' || mode === 'weekly';
// Idempotent for callers holding an already captured key. Never used to rewrite queues.
export const seededKey = period => String(period).endsWith(':' + SEEDED_RULES) ? String(period) : period + ':' + SEEDED_RULES;
export function seededIdentity(mode, period = mode === 'weekly' ? weekKey() : todayKey()) {
  if (!isSeeded(mode)) return null;
  const key = seededKey(period);
  return Object.freeze({ mode, period, rules: SEEDED_RULES, key, board: mode + ':' + key, scoreKey: 'excuseme_' + mode + '_' + key });
}
export const movementEnabled = mode => mode === 'classic' || isSeeded(mode);
