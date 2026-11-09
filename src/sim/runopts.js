/* ---------- run options: what a single run is allowed to change ----------
   Every run has a category. 'standard' is the ordinary game (Classic, Daily, Weekly, races) and behaves exactly as it always has.
   Other categories ('practice', 'challenge') keep their results away from ordinary progress and records.
   rules is a version of the competitive rules/course geometry: bump it when a change would make old times or ghosts unfair to compare. */
export const RULES_VERSION = 1;

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
export const recordKey = (base, run) => (!run || (run.category === 'standard' && run.rules === RULES_VERSION) ? base : base + ':' + run.category + ':r' + run.rules);
