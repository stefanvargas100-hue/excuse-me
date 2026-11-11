/* ---------- run options: what a single run is allowed to change ----------
   Every run has a category. 'standard' is the ordinary game (Classic, Daily, Weekly, races) and behaves exactly as it always has.
   Other categories ('practice', 'challenge') keep their results away from ordinary progress and records.
   rules is a version of the competitive rules/course geometry: bump it when a change would make old times or ghosts unfair to compare. */
import { classicTag, CLASSIC_RULES } from './classic-rules.js';
import { courseTag } from '../config/routes.js';
export const RULES_VERSION = 2;

const ALL = { xp: true, progress: true, records: true, scores: true, ghosts: true };
const NONE = { xp: false, progress: false, records: false, scores: false, ghosts: false };
// progress: challenge tallies, rotating challenges and unlocks. records: personal bests. scores: online boards. ghosts: saved/shown ghosts.
// elimination: pays XP and counts ordinary progress, but a different format leaves no race record, ghost or board entry.
export const POLICIES = { standard: ALL, practice: NONE, challenge: { ...NONE }, cup: { ...NONE }, friendcup: { ...NONE }, elimination: { xp: true, progress: true, records: false, scores: false, ghosts: false } };

// opts: { category, rules, seed, outfit }. Unknown categories fall back to the strictest policy, never to the permissive one.
export function makeRun(opts) {
  const o = opts || {}, category = o.category || 'standard';
  return {
    category, rules: o.rules || RULES_VERSION,
    seed: o.seed == null ? null : String(o.seed),
    outfit: o.outfit ? { ...o.outfit } : null,
    policy: { ...(POLICIES[category] || NONE) }
  };
}

// Storage key for a record. Standard rules-1 records keep their original key so existing saves are untouched;
// any other category or rules version gets its own, so times and ghosts are never compared across them.
export const recordKey = (base, run = makeRun()) => (run.category === 'standard' && run.rules === 1 ? base : base + ':' + run.category + ':r' + run.rules);

// The same identity is used by own ghosts, room senders and friend storage.
export const ghostKeyFor = (kind, id, run) => recordKey((kind === 'race' ? 'excuseme_ghost_race_' : 'excuseme_ghost_') + id + (kind === 'race' ? courseTag(id) : classicTag), run);
export const friendGhostKey = (kind, id) => ghostKeyFor(kind, id).replace('excuseme_ghost_', 'excuseme_fg_' + (kind === 'race' ? '' : 'classic_'));
export const ghostIdentity = (kind, id) => ({kind: kind === 'race' ? 'race' : 'classic' + classicTag, rules: kind === 'race' ? RULES_VERSION : CLASSIC_RULES, stage: id, course: kind === 'race' ? courseTag(id) : ''});
// Migration 0003 allows a single colon, then a <=35-character identifier.
export const raceBoardId = id => 'race:' + id + courseTag(id).replaceAll(':', '_') + '_r' + RULES_VERSION;
