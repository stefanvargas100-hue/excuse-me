// Side routes exist only in races. Local x coordinates are shared, but route IDs isolate floors.
const STAGES = {
  takeshita: [{ id: 'back-alley', name: 'BACK ALLEY', entrance: 70, exit: 260, level: 'same', difficulty: 'easy', shape: { entryX: 2.6, entryWidth: 1.1, entryLength: 6, stairs: 0, cruise: 1, stairSpeed: 1, lengthScale: 1.01 } }],
  subway: [{ id: 'mezzanine', name: 'MEZZANINE', entrance: 80, exit: 300, level: 'up', difficulty: 'hard', shape: { entryX: 3.3, entryWidth: 1.3, entryLength: 6, stairs: 10, cruise: 1.24, stairSpeed: .65 } }]
};
export const sideRoutes = id => STAGES[id] || [];
export const sameRoute = (a, b) => (a.route || '') === (b.route || '');
export function updateRoute(id, racer, previousZ) {
  const routes = sideRoutes(id), active = routes.find(r => r.id === racer.route);
  if (active && racer.z < active.exit) return;
  racer.route = '';
  for (const r of routes) if (previousZ <= r.entrance + r.shape.entryLength && racer.z >= r.entrance && racer.z < r.entrance + r.shape.entryLength && Math.abs(racer.x - r.shape.entryX) <= r.shape.entryWidth / 2) { racer.route = r.id; break; }
}
export function routeSpeed(id, racer) {
  const r = sideRoutes(id).find(r => r.id === racer.route);
  if (!r) return 1;
  return racer.z < r.entrance + r.shape.stairs || racer.z >= r.exit - r.shape.stairs ? r.shape.stairSpeed : r.shape.cruise / (r.shape.lengthScale || 1);
}
