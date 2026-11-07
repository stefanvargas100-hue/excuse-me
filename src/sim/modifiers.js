/* ---------- daily modifiers: one twist per day, the same for everyone, so the daily board stays fair ---------- */
export const MODS = [
  { id: 'rush', name: 'Rush hour all day', text: 'The crowd never thins out.' },
  { id: 'tired', name: 'Tired legs', text: 'Stamina recovers at 40% speed. Close calls matter more.' },
  { id: 'phones', name: 'Heads down', text: 'Most people are on their phones. They drift, and may not hear you.' }
];
export const TIRED_REGEN = 0.4;
export const PHONE_SHARE = 0.65;

// Rotates through the list day by day. `key` is a date like 2026-11-06.
export function modOf(key) {
  const [y, m, d] = key.split('-').map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return MODS[((day % MODS.length) + MODS.length) % MODS.length];
}

// The modifier of the run being started: set before the first crowd is built, cleared for every other mode.
export let activeMod = null;
export const setMod = id => { activeMod = id; };
