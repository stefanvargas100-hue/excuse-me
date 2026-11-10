import { sideRoutes } from './side-routes.js';

// Fixed route-local stations, independent of the main-floor seeded stream.
// Clear stairs and rejoin aprons; existing barrier art and collision circles are reused.
export function routePopulation(id, z0, z1) {
  const out = [];
  for (const r of sideRoutes(id)) {
    const hard = r.difficulty === 'hard', gap = hard ? 30 : 52;
    for (let z = r.entrance + 30, n = 0; z < r.exit - 24; z += gap, n++) {
      const side = n % 2 ? -1 : 1;
      for (const p of [
        { x: side * (hard ? 1.35 : 2.5), z, prop: 'barrier' },
        { x: -side * (hard ? 1.25 : 2.2), z: z + 8, v0: hard ? .65 : .4 }
      ]) if (p.z >= z0 && p.z < z1) out.push({ ...p, route: r.id, routeMin: r.entrance + 20, routeMax: r.exit - 20 });
    }
  }
  return out;
}
