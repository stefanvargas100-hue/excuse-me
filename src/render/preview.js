import { BODIES, BUILDS, ITEM_STATS, STYLE_NAMES, fitOf, styleLabel, STAT_CAP, statHint, statDetails, statsOf } from '../config/stats.js';
import { $, ctx, setCtx } from '../dom.js';
import { CX, DPR, F, H, HOR, VX, VY, VZ, W, setCX, setF, setH, setHOR, setVX, setVY, setVZ, setW } from './camera.js';
import { drawPerson } from './figures.js';
import { CHALLENGES, challengeFor, doneCount, isLocked, tallyOf } from '../save/challenges.js';
import { LOOK, LOOK_OPTS } from '../save/progress.js';
import { store } from '../save/store.js';
import { makeMe } from '../sim/people.js';
import { S, setShowHB, showHB } from '../sim/state.js';
import { back, go, pageInto, relayoutWith } from '../ui/screens.js';



/* ---------- character preview ---------- */
let PV = null;

// Customize is split into body areas. Each opens its own screen: choices first, colours underneath.
const AREAS = [
  { id: 'body', name: 'Body', fixed: ['body', 'build'], colors: 'skin' },
  { id: 'face', name: 'Face', fixed: ['eyes', 'nose', 'mouth'] },
  { id: 'hair', name: 'Hair', fixed: ['hairStyle'], colors: 'hair' },
  { id: 'top', name: 'Top', paged: 'shirtType', colors: 'shirt' },
  { id: 'bottoms', name: 'Bottoms', paged: 'pantsType', colors: 'pants' },
  { id: 'shoes', name: 'Shoes', paged: 'shoeType', colors: 'shoe' },
  { id: 'head', name: 'Headpiece', fixed: ['showHead'], paged: 'hat', colors: 'gear' },
  { id: 'back', name: 'Back', paged: 'pack', colors: 'gear' }
];
const optOf = key => LOOK_OPTS.find(o => o.key === key);
const nameOf = (o, val) => { const v = o.vals.find(x => Array.isArray(x) && x[0] === val); return v ? v[1] : ''; };

// Live bars for the three race stats. They only change with build and gear types, never with colours.
function renderStats(tryOn) {
  const box = $('statBars'); if (!box) return;
  const now = statsOf(LOOK), s = tryOn ? statsOf({ ...LOOK, ...tryOn }) : now;
  const values = statDetails(s), was = statDetails(now);
  const row = (name, key, field, unit, help = '') => {
    const points = s[key], cls = points > 0 ? 'up' : points < 0 ? 'down' : '';
    const fmt = v => (field === 'accel90' ? '~' : '') + v.toFixed(unit === 'mph' ? 1 : 2) + ' ' + unit;
    const label = tryOn && s[key] !== now[key] ? fmt(was[field]) + ' &rarr; ' + fmt(values[field]) : fmt(values[field]);
    return '<div class="stat"><div class="statl"><span>' + name + '</span><span class="' + cls + '">' + label + '</span></div>' + (help ? '<div class="stathelp">' + help + '</div>' : '') + '<div class="statb"><i class="' + cls + '" style="width:' + ((points + STAT_CAP) / (2 * STAT_CAP) * 100).toFixed(0) + '%"></i></div></div>';
  };
  const fit = fitOf({ ...LOOK, ...tryOn }), why = [];
  if (fit.stylePts) why.push(fit.count === 5 ? 'Full ' + STYLE_NAMES[fit.style] + ' set' : fit.count + ' ' + STYLE_NAMES[fit.style] + ' pieces');
  if (fit.focusPts) why.push(fit.focus + ' focus');
  const fitRow = '<div class="fit' + (fit.boost ? ' on' : '') + '"><b>Fit check ' + (fit.boost ? '+' + fit.boost : '0') + '</b> ' + (why.join(', ') || 'Match 3 pieces, or stack one stat') + '</div>';
  box.innerHTML = '<div class="statn">' + (tryOn ? 'If you wore it - race only' : 'Race stats - flat ground') + '</div>' + row('Top burst', 'speed', 'burstMph', 'mph', 'Walk ' + values.walkMph.toFixed(1) + ' mph; boosts extra') + row('0-90% speed', 'accel', 'accel90', 's') + row('Stamina refill', 'rec', 'refillSeconds', 's', 'Empty to full, while walking') + row('Bump slowdown', 'rec', 'bumpSeconds', 's') + fitRow;
}

function refreshLook() {
  store.set('excuseme_look', JSON.stringify(LOOK));
  PV = makeMe();
  renderStats();
  if (S) { const m = makeMe(); m.x = S.me.x; m.z = S.me.z; m.fx = S.me.fx; m.fz = S.me.fz; S.me = m; }
}

// Try on a locked item: the character and bars change, nothing is equipped, and the challenge for it is shown.
function tryLocked(key, val) {
  const saved = LOOK[key], c = challengeFor(key, val), stats = ITEM_STATS[key] && ITEM_STATS[key][val];
  LOOK[key] = val; PV = makeMe(); LOOK[key] = saved;
  renderStats(stats ? { [key]: val } : null);
  setNote(c.name + ' is locked. ' + c.text + ' (' + Math.min(tallyOf(c.tally), c.target).toLocaleString('en-US') + ' / ' + c.target.toLocaleString('en-US') + ').' + (stats ? '' : ' Looks only.'), true);
}

function setNote(text, locked) { const n = $('lockInfo'); n.textContent = text; n.classList.toggle('on', !!locked); }

// The preview turns on its own; drag it to turn it yourself. The Face area looks at the face, Back shows the back, Shoes looks at the feet.
let spin = 0, lastNow = 0, dragX = null, heldUntil = 0;
function hookDrag(pc) {
  if (pc.dataset.drag) return; pc.dataset.drag = '1'; pc.style.touchAction = 'none';
  pc.addEventListener('pointerdown', e => { dragX = e.clientX; if (pc.setPointerCapture) pc.setPointerCapture(e.pointerId); });
  pc.addEventListener('pointermove', e => { if (dragX === null) return; spin += (e.clientX - dragX) * 0.02; dragX = e.clientX; heldUntil = performance.now() + 1500; });
  const up = () => { dragX = null; }; pc.addEventListener('pointerup', up); pc.addEventListener('pointercancel', up);
}
const VIEW = { face: { zoom: 2.4, focus: 1.6, front: true }, back: { zoom: 1.15, focus: 1.1, back: true }, shoes: { zoom: 1.9, focus: 0.25 }, head: { zoom: 2.0, focus: 1.6 } };

export function drawPreview(now) {
  const pc = $('preview');
  if (!pc || !pc.getContext) return;
  if (!PV) PV = makeMe();
  if (pc.addEventListener) hookDrag(pc);
  const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now;
  if (dragX === null && now > heldUntil) spin += dt * 0.7;
  const view = (currentArea && VIEW[currentArea.id]) || null;
  const pctx = pc.getContext('2d'), pw = 170, ph = 210;
  if (pc.width !== Math.round(pw * DPR)) { pc.width = Math.round(pw * DPR); pc.height = Math.round(ph * DPR); }
  const saved = [ctx, W, H, F, HOR, CX, VX, VZ, VY, showHB];
  setCtx(pctx); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, pw, ph);
  const zoom = view ? view.zoom : 1, f = 262 * zoom, hor = view ? ph * 0.52 - (1.0 - view.focus) * f / 3 : 92;
  setW(pw); setH(ph); setF(f); setVX(0); setVZ(-3); setVY(1.0); setCX(pw / 2); setHOR(hor); setShowHB(false);
  const a = view && view.front && dragX === null && now > heldUntil ? 0 : view && view.back && dragX === null && now > heldUntil ? Math.PI : spin;
  const still = view && (view.front || view.zoom > 1.5);   // stand still for close-ups
  PV.fx = Math.sin(a); PV.fz = -Math.cos(a); PV.vx = still ? 0 : PV.fx * 1.3; PV.vz = still ? 0 : PV.fz * 1.3; PV.walkA = still ? 0 : 1; PV.x = 0; PV.z = 0;
  PV.phase = now / 1000 * 5.5;
  drawPerson(PV);
  setCtx(saved[0]); setW(saved[1]); setH(saved[2]); setF(saved[3]); setHOR(saved[4]); setCX(saved[5]); setVX(saved[6]); setVZ(saved[7]); setVY(saved[8]); setShowHB(saved[9]);
}

// One choice: a chip with its trade-off, or a colour dot. Locked ones can still be tapped to try them on.
function optionButton(o, v, siblings) {
  const b = document.createElement('button'); b.type = 'button';
  const isObj = o.type === 'color' && typeof v === 'object', val = o.type === 'color' ? (isObj ? v.c : v) : v[0];
  const locked = isLocked(o.key, val), ch = challengeFor(o.key, val);
  if (o.type === 'color') { b.className = 'sw'; b.style.background = val; b.setAttribute('aria-label', isObj ? v.name : o.label + ' ' + val); }
  else {
    b.className = 'chip'; b.textContent = v[1];
    const stats = o.key === 'body' ? BODIES[val] : o.key === 'build' ? BUILDS[val] : ITEM_STATS[o.key] && ITEM_STATS[o.key][val];
    if (stats) { const hint = document.createElement('small'); const tag = styleLabel(o.key, val); hint.textContent = (tag ? tag + ' · ' : '') + statHint(stats); b.appendChild(hint); }
  }
  if (locked) {
    b.classList.add('locked');
    b.setAttribute('aria-label', ch.name + ', locked. ' + ch.text);
    if (o.type === 'color') b.textContent = '?';
  }
  b.setAttribute('aria-pressed', String(LOOK[o.key] === val));
  b.addEventListener('click', () => {
    if (locked) { tryLocked(o.key, val); return; }
    LOOK[o.key] = val;
    siblings.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    setNote(DEFAULT_NOTE);
    refreshLook();
  });
  siblings.push(b);
  return b;
}

const DEFAULT_NOTE = 'Tap a locked item to try it on and see its stats. Colours never change stats.';

function groupLabel(text) { const d = document.createElement('div'); d.className = 'optl'; d.textContent = text; return d; }

function openArea(area) {
  $('lookTitle').textContent = area.name;
  $('lookCats').hidden = true; $('lookEdit').hidden = false;
  currentArea = area;
  setNote(DEFAULT_NOTE);
  const draw = () => {
    const fixed = $('optFixed'); fixed.innerHTML = '';
    for (const key of area.fixed || []) {
      const o = optOf(key), row = document.createElement('div'), btns = [];
      row.className = 'optrow'; row.appendChild(groupLabel(o.label));
      const wrap = document.createElement('div'); wrap.className = 'chips n' + o.vals.length;
      for (const v of o.vals) wrap.appendChild(optionButton(o, v, btns));
      row.appendChild(wrap); fixed.appendChild(row);
    }
    const colors = $('optColors'); colors.innerHTML = '';
    if (area.colors) {
      const o = optOf(area.colors), btns = [], wrap = document.createElement('div');
      colors.appendChild(groupLabel(o.label));
      wrap.className = 'sws';
      for (const v of o.vals) wrap.appendChild(optionButton(o, v, btns));
      colors.appendChild(wrap);
    }
    const box = $('optPaged'), ctrl = $('optPager');
    if (area.paged) {
      const o = optOf(area.paged), btns = [], nodes = o.vals.map(v => optionButton(o, v, btns));
      box.hidden = false; $('optPagedLabel').textContent = o.label;
      pageInto(box, nodes, ctrl, n => n.getAttribute('aria-pressed') === 'true');
    } else { box.innerHTML = ''; box.hidden = true; $('optPagedLabel').textContent = ''; ctrl.style.visibility = 'hidden'; }
  };
  draw();
  relayoutWith(draw);
}

let currentArea = null;

function openAreas() {
  currentArea = null;
  $('lookTitle').textContent = 'Customize';
  $('lookEdit').hidden = true; $('lookCats').hidden = false;
  setNote(doneCount() + ' of ' + CHALLENGES.length + ' items unlocked. Pick an area to change.');
  refreshLook();
  const box = $('lookCats'); box.innerHTML = '';
  for (const area of AREAS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tile';
    const main = area.paged || (area.fixed && area.fixed[area.fixed.length - 1]);
    b.textContent = area.name;
    const now = document.createElement('small'); now.textContent = nameOf(optOf(main), LOOK[main]); b.appendChild(now);
    b.addEventListener('click', () => openArea(area));
    box.appendChild(b);
  }
}

function openLook() { go('look'); openAreas(); }

export function init() {
  $('lookBtn').addEventListener('click', openLook);
  $('endLook').addEventListener('click', openLook);
  $('lookBack').addEventListener('click', () => { if (currentArea) openAreas(); else { refreshLook(); back(); } });
}
