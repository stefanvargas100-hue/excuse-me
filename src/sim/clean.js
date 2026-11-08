import { CLEAN_SEGMENT_M, CLEAN_XP, CLEAN_XP_CAP } from '../config/clean.js';
import { addPop } from './scoring.js';
import { S } from './state.js';

/* ---------- clean races: every CLEAN_SEGMENT_M metres walked without a bump is a clean segment ----------
   A bump restarts the distance and the tier (the next segment pays the first value again) but keeps what is already earned.
   The XP is banked while you run and paid once, when you finish a bot race. */
export const newClean = () => ({ dist: 0, walked: 0, segs: 0, streak: 0, bonus: 0 });

// Adds metres actually walked (not belt-carried, not while stationary) and awards every threshold passed.
export function stepClean(metres) {
  const C = S.clean;
  if (!C || !(metres > 0)) return;
  C.walked += metres; C.dist += metres;
  while (C.dist >= CLEAN_SEGMENT_M) {
    C.dist -= CLEAN_SEGMENT_M; C.segs++;
    const pay = Math.min(CLEAN_XP[Math.min(C.streak, CLEAN_XP.length - 1)], CLEAN_XP_CAP - C.bonus);
    C.streak++; C.bonus += pay;
    addPop('CLEAN x' + C.segs + (S.duel || !S.run.policy.xp ? '' : pay > 0 ? ' +' + pay + ' XP' : ' MAX'), '#5ee6a8', 24);
  }
}

// A bump: the distance and tier restart.
export function breakClean() { const C = S.clean; if (C) { C.dist = 0; C.streak = 0; } }

// XP to add when the race is finished: bot races only, and only where the run may pay XP.
export const cleanBonusFor = s => (s.clean && !s.duel && s.run.policy.xp ? s.clean.bonus : 0);
// Medal: no bumps, and at least one clean segment walked.
export const cleanMedal = s => !!s.clean && s.clean.segs > 0 && s.bumps === 0;
