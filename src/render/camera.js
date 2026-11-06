import { clamp } from '../config/util.js';
import { ctx, cv } from '../dom.js';



/* ---------- viewport and camera ---------- */
export let W = 0, H = 0, DPR = 1, F = 300, HOR = 0, CX = 0;
// How much bigger than a 390 x 760 phone the window is. Stickers, menus and on-canvas text scale by this, so a big phone,
// a tablet or a PC window gets a bigger interface; small phones stay at 1.
export let UI = 1;

// Third-person chase camera: behind and above the player. VX/VY/VZ is the camera position used by all drawing.
export const CAM_BACK = 3.6, CAM_UP = 2.8;

export let VX = 0, VZ = -CAM_BACK, VY = CAM_UP;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  F = Math.min(W * 0.85, H * 0.75);
  UI = clamp(Math.min(W / 390, H / 760), 1, 2);
  try { document.documentElement.style.setProperty('--ui', UI.toFixed(3)); } catch (e) {}
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
  window.addEventListener('resize', resize); resize();
}
