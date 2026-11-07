import { clamp } from '../config/util.js';
import { ctx, cv } from '../dom.js';
import { fullHeight } from './fullheight.js';



/* ---------- viewport and camera ---------- */
export let W = 0, H = 0, DPR = 1, F = 300, HOR = 0, CX = 0;
// How much bigger than a 390 x 760 phone the window is. Stickers, menus and on-canvas text scale by this, so a big phone,
// a tablet or a PC window gets a bigger interface; small phones stay at 1.
export let UI = 1;

// Third-person chase camera: behind and above the player. VX/VY/VZ is the camera position used by all drawing.
export const CAM_BACK = 3.6, CAM_UP = 2.8;

export let VX = 0, VZ = -CAM_BACK, VY = CAM_UP;

// A hidden box exactly 100vh tall: in a home-screen app that is the full screen even when innerHeight comes back short.
let probeEl = null;
function probeHeight() {
  try { if (!probeEl) { probeEl = document.createElement('div'); probeEl.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none'; document.body.appendChild(probeEl); } return probeEl.offsetHeight || 0; } catch (e) { return 0; }
}
function measureHeight() {
  const standalone = (window.navigator && window.navigator.standalone === true) || !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const scr = window.screen || {};
  return fullHeight({ innerW: window.innerWidth, innerH: window.innerHeight, probe: standalone ? probeHeight() : 0, screenW: scr.width || 0, screenH: scr.height || 0, standalone });
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  F = Math.min(W * 0.85, H * 0.75);
  UI = clamp(Math.min(W / 390, H / 760), 1, 2);
  try { document.documentElement.style.setProperty('--ui', UI.toFixed(3)); document.documentElement.style.setProperty('--appH', H + 'px'); } catch (e) {}
}

export function setCX(v) { CX = v; }
export function setF(v) { F = v; }
export function setH(v) { H = v; }
export function setHOR(v) { HOR = v; }
export function setVX(v) { VX = v; }
export function setVY(v) { VY = v; }
export function setVZ(v) { VZ = v; }
export function setW(v) { W = v; }

export function init() {
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize); resize();
  setTimeout(resize, 300); setTimeout(resize, 1200);   // iOS settles on the real size a moment after launch
}
