import { Music, init as initAudio } from './audio/music.js';
import { LEVELS, setLevel } from './config/levels.js';
import { $ } from './dom.js';
import { action, init as initInput, keys, onTap } from './input/input.js';
import { init as initCamera } from './render/camera.js';
import { drawPreview, init as initPreview } from './render/preview.js';
import { render } from './render/render.js';
import { shout } from './sim/actions.js';
import { hasPlayed, start, tick } from './sim/game.js';
import { mk, runEvent } from './sim/people.js';
import { racePace } from './sim/race.js';
import { BODIES, BUILDS, ITEM_STATS, fitOf, effects, statsOf } from './config/stats.js';
import { LOOK } from './save/progress.js';
import { CHALLENGES, isLocked, setUnlockListener, tallyOf, track, trackMax } from './save/challenges.js';
import { addPop } from './sim/scoring.js';
import { S, reset, state } from './sim/state.js';
import { buildLevels, hud, init as initMenus } from './ui/menus.js';
import { weekKey } from './config/util.js';



let lastT = performance.now();

const dtHist = [];

function frame(now) {
  const raw = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  dtHist.push(raw); if (dtHist.length > 4) dtHist.shift();
  const dt = raw > 0.04 ? raw : dtHist.reduce((a, b) => a + b, 0) / dtHist.length;   // average the last few frames; keep real long gaps
  // slow motion runs on real time so it always lasts the same
  S.slowT -= dt; S.slow += ((S.slowT > 0 ? 1 : 0) - S.slow) * Math.min(1, dt * (S.slowT > 0 ? 14 : 5));
  S.breakFlash = Math.max(0, S.breakFlash - dt);
  const gdt = dt * (1 - 0.68 * S.slow);
  const n = Math.max(1, Math.ceil(gdt / 0.0167));
  if (state !== 'paused') for (let i = 0; i < n; i++) tick(gdt / n);
  render(); hud();
  Music.update(dt);
  if (!$('look').hidden) drawPreview(now);
  requestAnimationFrame(frame);
}

// A challenge finished: say so on the spot, and list it on the end screen.
setUnlockListener(c => { if (!S) return; S.unlocked.push(c.name); addPop('UNLOCKED: ' + c.name.toUpperCase(), '#ff6b9d', 26); Music.sfx('win'); });

// Wire up listeners only now that every module has finished loading (keeps load order from mattering).
initCamera();
initInput();
initPreview();
initAudio();
initMenus();

reset();

buildLevels();

window.__excuse = { tick, reset, start, setLevel, get S() { return S; }, get state() { return state; }, keys, action, onTap, render, drawPreview, LEVELS, runEvent, shout, weekKey, hasPlayed, CHALLENGES, isLocked, tallyOf, track, trackMax, racePace, fitOf, BODIES, BUILDS, ITEM_STATS, effects, statsOf, LOOK, mkPerson: (x, z) => mk(x, z, { hx: 0, hz: 1, v0: 1 }) };

requestAnimationFrame(frame);
