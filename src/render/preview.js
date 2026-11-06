import { BODIES, BUILDS, ITEM_STATS, STAT_CAP, statHint, statPercents, statsOf } from '../config/stats.js';
import { $, ctx, setCtx } from '../dom.js';
import { CX, DPR, F, H, HOR, VX, VY, VZ, W, setCX, setF, setH, setHOR, setVX, setVY, setVZ, setW } from './camera.js';
import { drawPerson } from './figures.js';
import { CHALLENGES, challengeFor, doneCount, isLocked, tallyOf } from '../save/challenges.js';
import { LOOK, LOOK_OPTS } from '../save/progress.js';
import { store } from '../save/store.js';
import { makeMe } from '../sim/people.js';
import { S, setShowHB, showHB } from '../sim/state.js';



/* ---------- character preview ---------- */
let PV = null;

// Live bars for the three race stats. They only change with build and gear types, never with colours.
function renderStats(tryOn) {
  const box = $('statBars'); if (!box) return;
  const now = statsOf(LOOK), s = tryOn ? statsOf({ ...LOOK, ...tryOn }) : now, pc = statPercents(s), was = statPercents(now);
  const fmtPct = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10) + '%';
  const row = (name, key) => {
    const points = s[key], cls = points > 0 ? 'up' : points < 0 ? 'down' : '';
    const label = tryOn && s[key] !== now[key] ? fmtPct(was[key]) + ' to ' + fmtPct(pc[key]) : fmtPct(pc[key]);
    return '<div class="stat"><div class="statl"><span>' + name + '</span><span class="' + cls + '">' + label + '</span></div><div class="statb"><i class="' + cls + '" style="width:' + ((points + STAT_CAP) / (2 * STAT_CAP) * 100).toFixed(0) + '%"></i></div></div>';
  };
  box.innerHTML = '<div class="statn">' + (tryOn ? 'If you wore it' : 'Race stats') + '</div>' + row('Top speed', 'speed') + row('Acceleration', 'accel') + row('Recovery', 'rec');
}

// Try on a locked item: the character and bars change, nothing is equipped, and the challenge for it is shown.
function tryLocked(key, val) {
  const saved = LOOK[key], c = challengeFor(key, val), info = $('lockInfo'), stats = ITEM_STATS[key] && ITEM_STATS[key][val];
  LOOK[key] = val; PV = makeMe(); LOOK[key] = saved;
  renderStats(stats ? { [key]: val } : null);
  info.hidden = false;
  info.textContent = c.name + ' is locked. ' + c.text + ' (' + Math.min(tallyOf(c.tally), c.target).toLocaleString('en-US') + ' / ' + c.target.toLocaleString('en-US') + ').' + (stats ? '' : ' Looks only, no stat change.');
}

function refreshLook() {
  store.set('excuseme_look', JSON.stringify(LOOK));
  PV = makeMe();
  renderStats();
  if (S) { const m = makeMe(); m.x = S.me.x; m.z = S.me.z; m.fx = S.me.fx; m.fz = S.me.fz; S.me = m; }
}

export function drawPreview(now) {
  const pc = $('preview');
  if (!pc || !pc.getContext) return;
  if (!PV) PV = makeMe();
  const pctx = pc.getContext('2d'), pw = 170, ph = 210;
  if (pc.width !== Math.round(pw * DPR)) { pc.width = Math.round(pw * DPR); pc.height = Math.round(ph * DPR); }
  const saved = [ctx, W, H, F, HOR, CX, VX, VZ, VY, showHB];
  setCtx(pctx); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, pw, ph);
  setW(pw); setH(ph); setF(262); setVX(0); setVZ(-3); setVY(1.0); setCX(pw / 2); setHOR(92); setShowHB(false);
  const a = now / 1000 * 0.7;
  PV.fx = Math.sin(a); PV.fz = -Math.cos(a); PV.vx = PV.fx * 1.3; PV.vz = PV.fz * 1.3; PV.x = 0; PV.z = 0;
  PV.phase = now / 1000 * 5.5;
  drawPerson(PV);
  setCtx(saved[0]); setW(saved[1]); setH(saved[2]); setF(saved[3]); setHOR(saved[4]); setCX(saved[5]); setVX(saved[6]); setVZ(saved[7]); setVY(saved[8]); setShowHB(saved[9]);
}

function buildLook() {
  const box = $('opts'); box.innerHTML = '';
  for (const o of LOOK_OPTS) {
    const row = document.createElement('div'); row.className = 'opt';
    const lab = document.createElement('div'); lab.className = 'optl'; lab.textContent = o.label; row.appendChild(lab);
    const wrap = document.createElement('div'); wrap.className = 'sws'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', o.label);
    for (const v of o.vals) {
      const b = document.createElement('button'); b.type = 'button';
      const isObj = o.type === 'color' && typeof v === 'object';
      const val = o.type === 'color' ? (isObj ? v.c : v) : v[0];
      const locked = isLocked(o.key, val), ch = challengeFor(o.key, val);
      if (o.type === 'color') { b.className = 'sw'; b.style.background = val; b.setAttribute('aria-label', isObj ? v.name : o.label + ' ' + val); }
      else {
        b.className = 'chip'; b.textContent = v[1];
        const stats = o.key === 'body' ? BODIES[val] : o.key === 'build' ? BUILDS[val] : ITEM_STATS[o.key] && ITEM_STATS[o.key][val];
        if (stats) { const hint = document.createElement('small'); hint.textContent = statHint(stats); b.appendChild(hint); }
      }
      if (locked) {
        b.classList.add('locked');
        b.setAttribute('aria-label', ch.name + ', locked. ' + ch.text);
        if (o.type === 'color') b.textContent = '?';
      }
      b.setAttribute('aria-pressed', String(LOOK[o.key] === val));
      b.addEventListener('click', () => {
        if (locked) { tryLocked(o.key, val); return; }
        $('lockInfo').hidden = true;
        LOOK[o.key] = val;
        wrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        refreshLook();
      });
      wrap.appendChild(b);
    }
    row.appendChild(wrap); box.appendChild(row);
  }
}

let lookFrom = 'start';

function openLook(from) {
  lookFrom = from;
  $('lockInfo').hidden = true;
  $('starNote').textContent = doneCount() + ' of ' + CHALLENGES.length + ' items unlocked. Tap a locked item to try it on and see its stats. Colours never change stats.';
  buildLook(); refreshLook(); $(from).hidden = true; $('look').hidden = false; }


export function init() {
  $('lookBtn').addEventListener('click', () => openLook('start'));
  $('endLook').addEventListener('click', () => openLook('end'));
  $('lookDone').addEventListener('click', () => { $('look').hidden = true; refreshLook(); $(lookFrom).hidden = false; });
}
