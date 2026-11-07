// One combo level every three passes; the same cap drives score, HUD and race pace.
export const COMBO_MAX = 16, COMBO_SPEED_PER = 0.04;
export const comboLevel = chain => Math.min(COMBO_MAX, 1 + Math.floor(Math.max(0, chain) / 3));
