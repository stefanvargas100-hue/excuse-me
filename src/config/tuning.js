import { clamp, randn } from './util.js';



/* ---------- tuning ---------- */
export const CEIL = 4.6;

export const R_PLAYER = 0.25;
          // player hitbox radius (m)
export const R_BODY = 0.25;
            // person body hitbox radius (m)
export const R_LUGGAGE = 0.17;
         // rolling suitcase hitbox radius (m)
export const BASE = 3.0, BOOST = 5.4;
  // player walking speeds (m/s)
export const LAT_MAX = 2.4, LAT_ACC = 7.0;
 // held-steer top speed and acceleration: reversing takes time
export const REGEN = 9;
                // stamina recharge per second (0-100)
export const CHAIN_WINDOW = 2.2;
       // seconds to land the next pass and keep a chain
// Crowd walking speeds follow measured pedestrian data: about 1.3 m/s on average, groups slower.
export const walkSpeed = (m = 1.32, sd = 0.2) => clamp(m + randn() * sd, 0.75, 2.1);
