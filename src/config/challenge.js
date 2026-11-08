import { hashStr, mulberry32 } from './util.js';
import { randomLoadout } from './stats.js';

/* ---------- weekly challenge: one course, one supplied outfit, one clock for everybody ----------
   A challenge week runs Monday 00:00 UTC to Sunday 23:59 UTC, whatever the phone's own clock and time zone say. The stage, the
   crowd seed and the outfit (body, build, headpiece, top, bottoms, shoes, back item: everything that has stats) come only from the
   week id and the rules version. Your saved outfit and unlocks play no part. CHALLENGE_RULES goes up when the course, rules or
   supplied-outfit recipe change, which starts a separate board and separate personal bests. */
export const CHALLENGE_RULES = 1;

// Submission to the online board stays off until supabase/migrations/0002_weekly_challenge.sql has been applied and checked
// against the real database (the SQL could not be run during development). The time trial itself works offline either way.
export const CHALLENGE_SUBMIT_ENABLED = false;

// The ISO week (Thursday rule) of a moment, in UTC: '2026-W46'.
export const utcWeekKey = date => {
  const d = date || new Date(), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return y + '-W' + String(w).padStart(2, '0');
};

// Milliseconds until the next Monday 00:00 UTC.
export function challengeRemainingMs(date) {
  const d = date || new Date(), t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), day = new Date(t).getUTCDay() || 7;
  return t + (8 - day) * 86400000 - d.getTime();
}

// Airport and Shibuya only: every part of their crowd is seeded from the course. (New York's crossing waves are not yet.)
const STAGES = [0, 2];

export function challengeFor(week) {
  const seed = 'wchal:' + week + ':r' + CHALLENGE_RULES, rng = mulberry32(hashStr(seed + ':outfit'));
  const body = rng() < 0.5 ? 'm' : 'f';
  return { week, rules: CHALLENGE_RULES, level: STAGES[hashStr(seed + ':stage') % STAGES.length], seed, outfit: { body, ...randomLoadout(rng) } };
}

// The score the server stores: higher is better, so a faster time scores more.
const SCORE_BASE = 2000000, MIN_MS = 20000, MAX_MS = 600000;
export const encodeChallengeTime = ms => SCORE_BASE - Math.round(ms);
export const decodeChallengeTime = score => SCORE_BASE - score;
// The same plausibility band the database enforces. It stops mistakes, not cheating: a phone can still report any time in the band.
export const validChallengeTime = ms => Number.isFinite(ms) && ms >= MIN_MS && ms <= MAX_MS;
export const boardNameFor = (week, rules) => 'wchal:' + week + ':r' + rules;
export const fmtChallengeScore = score => { const t = decodeChallengeTime(score) / 1000; return Math.floor(t / 60) + ':' + (t % 60 < 10 ? '0' : '') + (t % 60).toFixed(1); };
