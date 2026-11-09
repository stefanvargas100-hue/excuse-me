import { blockedPlayerName } from './name-filter.js';
// 24 matches the database and preserves all existing generated names.
export function cleanPlayerName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/ +/g, ' ');
  if ([...name].length < 3 || [...name].length > 24 || blockedPlayerName(name)) return null;
  return /^[\p{L}\p{M}\p{Nd} _-]+$/u.test(name) ? name : null;
}
