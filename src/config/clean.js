/* ---------- clean-race rewards (initial tuning values; change them here) ---------- */
export const CLEAN_SEGMENT_M = 100;            // metres walked without a bump for one clean segment
export const CLEAN_XP = [2, 4, 6, 8, 10];      // XP for the 1st, 2nd, ... segment since the last bump; the last value repeats
export const CLEAN_XP_CAP = 50;                // most bonus XP one finished bot race can pay
