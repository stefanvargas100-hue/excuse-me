import { CARCOLS, hex } from '../config/colour.js';
import { LV } from '../config/levels.js';
import { R, pick, rnd } from '../config/util.js';
import { S } from './state.js';



/* ---------- traffic (Fifth Avenue, visual only) ---------- */
export const CAR_LANES = [{ x: -6.4, dir: -1, idx: 0 }, { x: -9.4, dir: -1, idx: 1 }, { x: -12.4, dir: 1, idx: 2 }];

export function spawnCar(L, z) {
  const taxi = R() < 0.45;
  S.cars.push({ x: L.x + rnd(-0.2, 0.2), z, v: L.dir * rnd(7, 11), col: hex(taxi ? '#f2c200' : pick(CARCOLS)), taxi, front: L.dir < 0 });
}

export function updCars(dt) {
  if (LV.id !== 'nyc') return;
  for (const c of S.cars) c.z += c.v * dt;
  S.cars = S.cars.filter(c => c.z > S.pz - 20 && c.z < S.pz + 110);
  for (const L of CAR_LANES) {
    S.carT[L.idx] -= dt;
    if (S.carT[L.idx] <= 0) { spawnCar(L, L.dir < 0 ? S.pz + 100 : S.pz - 15); S.carT[L.idx] = rnd(1.4, 3.4); }
  }
}
