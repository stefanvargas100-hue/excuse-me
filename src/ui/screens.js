import { $ } from '../dom.js';

/* ---------- menu screens: one full screen at a time, tap in and back out, nothing ever scrolls ---------- */
const SCREENS = ['start', 'play', 'stages', 'friend', 'boards', 'howto', 'settings', 'look', 'chal', 'profile', 'pause', 'end'];
let stack = [];
let onResize = null;

export function hideMenus() {
  // iOS can keep a hidden form control focused and pan the page around its keyboard.
  document.activeElement?.blur?.();
  for (const id of SCREENS) $(id).hidden = true;
  stack = []; onResize = null;
}

// Open a screen on top of the one showing now.
export function go(id) {
  for (const s of SCREENS) if (!$(s).hidden) { if (s !== id) stack.push(s); $(s).hidden = true; }
  $(id).hidden = false;
  onResize = null;
}

export function back() {
  const here = SCREENS.find(s => !$(s).hidden), to = stack.pop() || 'start';
  if (here) $(here).hidden = true;
  $(to).hidden = false;
  onResize = null;
}

// Lay out a screen again if the phone rotates or the browser bars change the height.
export function relayoutWith(fn) { onResize = fn; }
export function init() { window.addEventListener('resize', () => { if (onResize) requestAnimationFrame(() => { if (onResize) onResize(); }); }); }   // waits a frame so the interface scale has updated first

// Fills a box with as many items as fit, and splits the rest into pages with arrows. The box must already be on screen.
export function pageInto(box, nodes, ctrl, isStart) {
  ctrl.innerHTML = '';
  const mk = (txt, label, d) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pagebtn'; b.textContent = txt; b.setAttribute('aria-label', label);
    b.addEventListener('click', () => show(cur + d));
    return b;
  };
  const prev = mk('‹', 'Previous page', -1), next = mk('›', 'Next page', 1), num = document.createElement('span');
  ctrl.appendChild(prev); ctrl.appendChild(num); ctrl.appendChild(next);
  ctrl.style.visibility = 'visible';   // the buttons take space, so they must be there before the fit is measured
  let cur = 0;
  const pages = [[]];
  box.innerHTML = '';
  for (const n of nodes) {
    box.appendChild(n);
    if (box.scrollHeight > box.clientHeight + 1 && pages[pages.length - 1].length) {
      pages.push([]);
      box.innerHTML = '';
      box.appendChild(n);
    }
    pages[pages.length - 1].push(n);
  }
  if (isStart) { const at = pages.findIndex(p => p.some(isStart)); if (at > 0) cur = at; }
  function show(i) {
    cur = Math.max(0, Math.min(pages.length - 1, i));
    box.innerHTML = '';
    for (const n of pages[cur]) box.appendChild(n);
    num.textContent = (cur + 1) + ' / ' + pages.length;
    prev.disabled = cur === 0; next.disabled = cur === pages.length - 1;
  }
  ctrl.style.visibility = pages.length > 1 ? 'visible' : 'hidden';
  show(cur);
}
