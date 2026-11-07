/* ---------- sharing ghosts: packing, checking and keeping the ghosts of friends ----------
   A ghost is a list of positions [x, z, x, z, ...] sampled every `step` seconds. Your own is recorded every 0.4 s; a ghost that
   is sent to someone else is thinned to one sample every 2 s, which is plenty to see a runner and keeps messages small.
   Whatever comes from another phone or the server is checked here before it is used. Only these are ever kept for other
   people: friends you raced in a room (on your phone only) and the top 3 of a classic stage (fetched, never stored). */
export const OWN_STEP = 0.4, SHARE_STEP = 2.0, MAX_FRIEND_GHOSTS = 4, MAX_SHARED_NUMBERS = 1600;

export function packGhost(pts, step = OWN_STEP) {
  if (!Array.isArray(pts) || pts.length < 4) return null;
  const every = Math.max(1, Math.round(SHARE_STEP / step)), out = [];
  const n = Math.floor(pts.length / 2);
  for (let i = 0; i < n; i += every) out.push(pts[i * 2], pts[i * 2 + 1]);
  // always keep the last point, so the record distance is exact
  if ((n - 1) % every !== 0) out.push(pts[(n - 1) * 2], pts[(n - 1) * 2 + 1]);
  return { step: every * step, pts: out.slice(0, MAX_SHARED_NUMBERS) };
}

// Returns a clean { step, pts } or null. Anything odd (wrong types, wild positions, too long) is thrown away, not repaired.
export function cleanGhost(g) {
  if (!g || typeof g !== 'object') return null;
  const step = g.step, pts = g.pts;
  if (typeof step !== 'number' || !Number.isFinite(step) || step < 0.2 || step > 5) return null;
  if (!Array.isArray(pts) || pts.length < 4 || pts.length > MAX_SHARED_NUMBERS || pts.length % 2) return null;
  let lastZ = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i], z = pts[i + 1];
    if (typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    if (Math.abs(x) > 30 || z < -5 || z > 6000 || z < lastZ - 5) return null;
    lastZ = z;
  }
  return { step, pts: pts.slice() };
}

export const cleanFriendName = raw => {
  const s = typeof raw === 'string' ? raw.replace(/[^\p{L}\p{N} ._'-]/gu, '').trim().slice(0, 24) : '';
  return s || 'Friend';
};

const friendKey = (kind, levelId) => 'excuseme_fg_' + (kind === 'race' ? 'race' : 'classic') + '_' + levelId;
const readList = (store, key) => { try { const v = JSON.parse(store.get(key, '[]')); return Array.isArray(v) ? v : []; } catch (e) { return []; } };

// Friends' ghosts for one stage: newest first, at most MAX_FRIEND_GHOSTS.
export function friendGhosts(store, kind, levelId) {
  return readList(store, friendKey(kind, levelId)).map(e => { const g = cleanGhost(e); return g && typeof e.name === 'string' ? { name: cleanFriendName(e.name), ...g, t: +e.t || 0 } : null; }).filter(Boolean)
    .sort((a, b) => b.t - a.t).slice(0, MAX_FRIEND_GHOSTS);
}

// A friend's newer ghost replaces their older one; the oldest friend is dropped when there are too many.
export function saveFriendGhost(store, kind, levelId, name, ghost, now = Date.now()) {
  const g = cleanGhost(ghost); if (!g) return false;
  const nm = cleanFriendName(name), key = friendKey(kind, levelId);
  const list = friendGhosts(store, kind, levelId).filter(e => e.name !== nm);
  list.unshift({ name: nm, step: g.step, pts: g.pts, t: now });
  try { store.set(key, JSON.stringify(list.slice(0, MAX_FRIEND_GHOSTS))); } catch (e) { return false; }
  return true;
}
