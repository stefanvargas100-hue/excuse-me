import { LEVELS } from '../config/levels.js';
import { BODIES, BUILDS, ITEM_STATS, STAT_CAP, statHint, statPercents, statsOf } from '../config/stats.js';
import { $, ctx, setCtx } from '../dom.js';
import { CX, DPR, F, H, HOR, VX, VY, VZ, W, setCX, setF, setH, setHOR, setVX, setVY, setVZ, setW } from './camera.js';
import { drawPerson } from './figures.js';
import { LOOK, LOOK_OPTS, totalStars } from '../save/progress.js';
import { store } from '../save/store.js';
import { makeMe } from '../sim/people.js';
import { S, setShowHB, showHB } from '../sim/state.js';



/* ---------- character preview ---------- */
let PV = null;

// Live bars for the three race stats. They only change with build and gear types, never with colours.
function renderStats() {
  const box = $('statBars'); if (!box) return;
  const s = statsOf(LOOK), pc = statPercents(s), row = (name, points, pct) => {
    const sign = pct > 0 ? '+' : '', cls = points > 0 ? 'up' : points < 0 ? 'down' : '';
    return '<div class="stat"><div class="statl"><span>' + name + '</span><span class="' + cls + '">' + sign + (Math.round(pct * 10) / 10) + '%</span></div><div class="statb"><i class="' + cls + '" style="width:' + ((points + STAT_CAP) / (2 * STAT_CAP) * 100).toFixed(0) + '%"></i></div></div>';
  };
  box.innerHTML = '<div class="statn">Race stats</div>' + row('Top speed', s.speed, pc.speed) + row('Acceleration', s.accel, pc.accel) + row('Recovery', s.rec, pc.rec);
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
      const req = isObj ? v.req : o.type === 'chip' ? (v[2] || 0) : 0;
      const locked = req > totalStars();
      if (o.type === 'color') { b.className = 'sw'; b.style.background = val; b.setAttribute('aria-label', isObj ? v.name : o.label + ' ' + val); }
      else {
        b.className = 'chip'; b.textContent = v[1];
        const stats = o.key === 'body' ? BODIES[val] : o.key === 'build' ? BUILDS[val] : ITEM_STATS[o.key] && ITEM_STATS[o.key][val];
        if (stats) { const hint = document.createElement('small'); hint.textContent = statHint(stats); b.appendChild(hint); }
      }
      if (locked) {
        b.disabled = true; b.classList.add('locked');
        b.title = 'Unlock with ' + req + ' stars'; b.setAttribute('aria-label', (isObj ? v.name : (v[1] || val)) + ', locked, needs ' + req + ' stars');
        b.textContent = o.type === 'color' ? req + '★' : v[1] + ' · ' + req + '★';
      }
      b.setAttribute('aria-pressed', String(LOOK[o.key] === val));
      b.addEventListener('click', () => {
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
  const t = totalStars();
  $('starNote').textContent = '★ ' + t + ' of ' + LEVELS.length * 3 + ' stars. ' + (t < 9 ? 'Earn stars in each level to unlock more gear.' : 'Everything unlocked.');
  buildLook(); refreshLook(); $(from).hidden = true; $('look').hidden = false; }


export function init() {
  $('lookBtn').addEventListener('click', () => openLook('start'));
  $('endLook').addEventListener('click', () => openLook('end'));
  $('lookDone').addEventListener('click', () => { $('look').hidden = true; $(lookFrom).hidden = false; });
}
