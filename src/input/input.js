import { cv } from '../dom.js';
import { W } from '../render/camera.js';
import { shout, tryBurst, tryDash } from '../sim/actions.js';
import { S, state } from '../sim/state.js';



/* ---------- input ---------- */
// Touch zones: hold the left or right half of the screen to steer (one thumb each).
// Double tap one side to dash that way. Double tap BOTH sides together to burst forward. Both cost stamina.
const ZONE = 0.5, DOUBLE_MS = 300, PAIR_MS = 110, BOTH_DOUBLE_MS = 450;

export const COST_BURST = 30, COST_DASH = 20, BURST_T = 1.2, DASH_T = 0.22, DASH_V = 5.0;

export const touches = new Map();

const lastTap = { L: -9999, R: -9999 };

const lastDown = { L: -9999, R: -9999 };

export let lastBoth = -9999, pendingDash = null;

export const keys = { l: false, r: false, last: '' };   // last = the direction pressed most recently, which wins if both are down

const lastKey = { l: -9999, r: -9999 };

const zoneOf = x => x < W * ZONE ? 'L' : 'R';

export function onTap(z, now) {
  const other = z === 'L' ? 'R' : 'L';
  lastDown[z] = now;
  if (now - lastDown[other] < PAIR_MS) {            // both thumbs tapped together
    pendingDash = null;
    lastTap.L = lastTap.R = -9999;
    if (now - lastBoth < BOTH_DOUBLE_MS) { action('M'); lastBoth = -9999; } else lastBoth = now;
    return;
  }
  if (now - lastTap[z] < DOUBLE_MS) { pendingDash = { z, at: now + PAIR_MS }; lastTap[z] = -9999; }
  else lastTap[z] = now;
}

// Hold BOTH thumbs down for a moment to say "Excuse me" (holding both cancels the steering, so your line does not change).
export const HOLD_BOTH_S = 0.25;
let holdT = 0, holdDone = false;
export function holdTick(dt) {
  let l = false, r = false;
  for (const z of touches.values()) { if (z === 'L') l = true; else r = true; }
  if (!(l && r)) { holdT = 0; holdDone = false; return; }
  holdT += dt;
  if (holdT >= HOLD_BOTH_S && !holdDone) { holdDone = true; shout(); }
}

export function action(z) {
  if (state !== 'play') return;
  if (S.duel?.startRemaining && S.race.countT > 0) return;
  if (z === 'M') tryBurst(); else tryDash(z === 'L' ? -1 : 1);
}

const swipes = new Map();

const up = e => { touches.delete(e.pointerId); swipes.delete(e.pointerId); };

export function setLastBoth(v) { lastBoth = v; }
export function setPendingDash(v) { pendingDash = v; }

export function init() {
  // Some WebKit versions still interpret rapid taps on a positioned canvas as browser
  // gestures despite touch-action. Pointer events remain the sole game-input source.
  const blockNativeGesture = e => { if (state === 'play' && e.cancelable) e.preventDefault(); };
  for (const type of ['touchstart', 'touchmove', 'touchend'])
    cv.addEventListener(type, blockNativeGesture, { passive: false });
  cv.addEventListener('pointerdown', e => {
    if (state !== 'play') return;
    const z = zoneOf(e.clientX);
    touches.set(e.pointerId, z);
    swipes.set(e.pointerId, { y: e.clientY, t: performance.now(), done: false });
    onTap(z, performance.now());
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });   // pointerId -> start point, for swipe-up
  cv.addEventListener('pointermove', e => {
    const sw = swipes.get(e.pointerId);
    if (!sw || sw.done || state !== 'play') return;
    if (sw.y - e.clientY > 50 && performance.now() - sw.t < 450) { sw.done = true; shout(); }
  });
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase(), now = performance.now();
    const isL = k === 'arrowleft' || k === 'a', isR = k === 'arrowright' || k === 'd';
    if (isL) { keys.l = true; keys.last = 'l'; if (!e.repeat) { if (now - lastKey.l < DOUBLE_MS) action('L'); lastKey.l = now; } }
    if (isR) { keys.r = true; keys.last = 'r'; if (!e.repeat) { if (now - lastKey.r < DOUBLE_MS) action('R'); lastKey.r = now; } }
    if ((k === 'arrowup' || k === 'w') && !e.repeat) action('M');
    if ((k === 'e' || k === ' ') && !e.repeat && state === 'play') shout();
    if (state === 'play' && (k === ' ' || k.startsWith('arrow'))) e.preventDefault();
  });
  // Never let a missed release trap the player against a wall: drop all held input whenever the page loses focus or a touch ends.
  const releaseAll = () => { keys.l = keys.r = false; touches.clear(); swipes.clear(); };
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  cv.addEventListener('lostpointercapture', up);
  const touchEnd = e => { if (!e.touches || e.touches.length === 0) { touches.clear(); swipes.clear(); } };
  window.addEventListener('touchend', touchEnd); window.addEventListener('touchcancel', touchEnd);
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') keys.l = false;
    if (k === 'arrowright' || k === 'd') keys.r = false;
  });
}
