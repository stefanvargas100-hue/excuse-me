/* ---------- the friend's runner ---------- 
   The friend's phone reports its position about ten times a second. Between reports we keep them walking at their last speed
   (for a moment only), and ease what we draw toward that, so they glide instead of jumping. */

const MAX_EXTRAPOLATE = 0.8;   // seconds; if reports stop, they stop too, rather than running off alone
const EASE = 12;               // how quickly the drawn position follows the target (per second)

export function createRemote() {
  let last = null, seenAt = 0, shown = null, shownAt = 0;

  function target(now) {
    const dt = Math.min(MAX_EXTRAPOLATE, Math.max(0, now - seenAt));
    return { x: last.x + last.vx * dt * 0.5, z: last.z + last.s * dt, vx: last.vx, s: last.s, route: typeof last.route === 'string' ? last.route : '' };
  }
  return {
    push(snap, now) { if (last && snap.n <= last.n) return; last = snap; seenAt = now; },
    sample(now) {
      if (!last) return null;
      const t = target(now);
      if (!shown) { shown = { x: t.x, z: t.z }; shownAt = now; }
      else {
        const dt = Math.max(0, now - shownAt); shownAt = now;
        const gap = Math.abs(t.z - shown.z), k = 1 - Math.exp(-dt * (gap > 4 ? EASE * 2 : EASE));   // a big gap closes faster
        shown.x += (t.x - shown.x) * k; shown.z += (t.z - shown.z) * k;
      }
      return { x: shown.x, z: shown.z, vx: t.vx, speed: t.s, route: t.route };
    },
    lastSeen: () => seenAt,
    reset() { last = null; shown = null; }
  };
}
