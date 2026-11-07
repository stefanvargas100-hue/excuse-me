/* ---------- full-screen height for an iPhone home-screen app ----------
   iOS often reports a page height shorter than the screen in a home-screen app, which left a pale bar under the game.
   In that mode there are no browser bars, so the screen is the right size: take the tallest of the reported height,
   the 100vh height and the screen height, but never trust a number more than MAX_EXTRA taller than what was reported. */
const MAX_EXTRA = 120;

export function fullHeight({ innerW, innerH, probe = 0, screenW = 0, screenH = 0, standalone }) {
  if (!standalone) return innerH;
  const portrait = innerW <= innerH;
  const sh = portrait ? Math.max(screenW, screenH) : Math.min(screenW, screenH);
  let h = innerH;
  for (const c of [probe, sh]) if (c > h && c - innerH <= MAX_EXTRA) h = c;
  return h;
}
