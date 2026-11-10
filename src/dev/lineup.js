// Character lineup: every body type and clothing item side by side, drawn by the game's own figure code.
// Open the game with ?lineup on the end of the address. Not linked from any menu; it is a review tool.
import { setCtx, ctx as mainCtx } from '../dom.js';
import { DPR, F, H, HOR, CX, VX, VY, VZ, W, setCX, setF, setH, setHOR, setVX, setVY, setVZ, setW } from '../render/camera.js';
import { drawPerson } from '../render/figures.js';
import { LOOK_OPTS } from '../save/progress.js';
import { applyBuild, dress } from '../sim/people.js';
import { setShowHB, showHB } from '../sim/state.js';
import { STYLE_IDS, forceStyle, forcedStyle, styleBegin, styleEnd, styleName } from '../render/style.js';

const BASE = { body: 'm', build: 'medium', shirtType: 'tee', pantsType: 'jeans', shoeType: 'sneakers', shirt: '#ffcf1f', pants: '#1e3a5f', shoe: '#f4f6f8',
  skin: '#c68863', hair: '#3b2a1e', hairStyle: 'short', hat: 'none', showHead: '1', pack: 'none', gear: '#d6336c' };

const opt = key => LOOK_OPTS.find(o => o.key === key);
const chips = key => opt(key).vals.map(v => ({ name: v[1], look: { [key]: v[0] } }));
const dots = (key, nameOf) => opt(key).vals.map((v, i) => ({ name: nameOf + ' ' + (i + 1), look: { [key]: typeof v === 'object' ? v.c : v } }));

const SECTIONS = [
  { title: 'Bodies', items: ['m', 'f'].flatMap(b => ['small', 'medium', 'large'].map(s => ({ name: (b === 'm' ? 'Male ' : 'Female ') + s, look: { body: b, build: s } }))) },
  { title: 'Tops', items: chips('shirtType') },
  { title: 'Bottoms', items: chips('pantsType') },
  { title: 'Shoes', items: chips('shoeType') },
  { title: 'Headpieces', items: chips('hat').map(i => ({ ...i, look: { ...i.look, hairStyle: 'short' } })) },
  { title: 'Eyes (close-up, front)', zoom: true, items: chips('eyes') },
  { title: 'Noses (close-up, front)', zoom: true, items: chips('nose') },
  { title: 'Mouths (close-up, front)', zoom: true, items: chips('mouth') },
  { title: 'Hair styles', items: chips('hairStyle') },
  { title: 'Backs', items: chips('pack') },
  { title: 'Skin tones', items: dots('skin', 'Skin') },
  { title: 'Hair colours', items: dots('hair', 'Hair') }
];

const DARK_LOOKS = { noir: '#141127', neonpop: '#2a1052', inknoir: '#1c1c22' };   // cell backgrounds for the night-time art styles
const VIEWS = [['back', 'Back', 0, 1], ['side', 'Side', 1, 0], ['front', 'Front', 0, -1], ['spin', 'Spin', 0, 0]];
const SIZES = [['game', 'Game size', 0.62], ['big', 'Big', 1]];

export function openLineup() {
  const root = document.createElement('div');
  root.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fdf6ec;overflow-y:auto;overflow-x:hidden;font-family:"Patrick Hand",sans-serif;color:#3a2a4d';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:sticky;top:0;z-index:2;background:#fdf6ec;padding:8px;display:flex;gap:6px;flex-wrap:wrap;border-bottom:2px solid #3a2a4d';
  root.appendChild(bar);
  const cv = document.createElement('canvas'); cv.style.display = 'block'; root.appendChild(cv);
  document.body.appendChild(root);

  let view = 0, size = 1, walking = true, body = 'm', look = Math.max(0, STYLE_IDS.indexOf(forcedStyle()));
  const btn = (label, on) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = 'font:inherit;font-size:15px;padding:4px 10px;border:2px solid #3a2a4d;border-radius:8px;background:#fff;color:inherit'; b.onclick = on; bar.appendChild(b); return b; };
  const viewBtns = VIEWS.map((v, i) => btn(v[1], () => { view = i; mark(); }));
  const sizeBtns = SIZES.map((s, i) => btn(s[1], () => { size = i; layout(); mark(); }));
  const walkBtn = btn('Walking', () => { walking = !walking; mark(); });
  const bodyBtn = btn('Items on: Male', () => { body = body === 'm' ? 'f' : 'm'; people.clear(); bodyBtn.textContent = 'Items on: ' + (body === 'm' ? 'Male' : 'Female'); });
  const lookBtn = btn('Look: ' + styleName(STYLE_IDS[look]), () => { look = (look + 1) % STYLE_IDS.length; lookBtn.textContent = 'Look: ' + styleName(STYLE_IDS[look]); });   // the art style of each cup
  btn('Close', () => { running = false; root.remove(); });
  const mark = () => {
    viewBtns.forEach((b, i) => { b.style.background = i === view ? '#ffd84d' : '#fff'; });
    sizeBtns.forEach((b, i) => { b.style.background = i === size ? '#ffd84d' : '#fff'; });
    walkBtn.style.background = walking ? '#ffd84d' : '#fff';
  };

  let cellW = 0, cellH = 0, cols = 1, rows = [], total = 0;
  const layout = () => {
    const sc = SIZES[size][2], width = root.clientWidth;
    cellW = Math.round(110 * sc * 1.4); cellH = Math.round(215 * sc * 1.2) + 22;
    cols = Math.max(1, Math.floor(width / cellW)); cellW = width / cols;
    rows = []; let y = 0;
    for (const sec of SECTIONS) {
      rows.push({ y, title: sec.title }); y += 30;
      sec.cells = sec.items.map((it, i) => ({ it, x: (i % cols) * cellW, y: y + Math.floor(i / cols) * cellH }));
      y += Math.ceil(sec.items.length / cols) * cellH + 6;
    }
    total = y;
    cv.style.width = width + 'px'; cv.style.height = total + 'px';
    cv.width = Math.round(width * DPR); cv.height = Math.round(total * DPR);
  };
  layout(); mark();
  addEventListener('resize', layout);

  const people = new Map();
  const personFor = (it) => {
    let p = people.get(it);
    if (!p) {
      p = Object.assign({ x: 0, z: 0, vx: 0, vz: 0, phase: 0, t: 0, h: 1.76, lug: 0, lugCol: '#000000', dog: 0, phone: false, fast: false,
        rival: false, tele: false, hit: false, isMe: false, fx: 0, fz: 1, circles: [] }, BASE, { body }, it.look);
      applyBuild(p); dress(p); people.set(it, p);
    }
    return p;
  };

  let running = true;
  const frame = now => {
    if (!running) return;
    const pctx = cv.getContext('2d'), sc = SIZES[size][2], t = now / 1000;
    const saved = [mainCtx, W, H, F, HOR, CX, VX, VZ, VY, showHB];
    setCtx(pctx); setShowHB(false);
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0); pctx.clearRect(0, 0, cv.width, cv.height);
    const top = root.scrollTop - 300, bottom = root.scrollTop + root.clientHeight + 300;
    const feetY = (cellH - 22) * 0.9, lookId = STYLE_IDS[look], keepStyle = forcedStyle();
    for (const sec of SECTIONS) {
      const head = rows.find(r => r.title === sec.title);
      pctx.fillStyle = '#3a2a4d'; pctx.font = '22px "Permanent Marker", sans-serif'; pctx.textAlign = 'left'; pctx.textBaseline = 'top';
      pctx.fillText(sec.title, 10, head.y + 4);
      for (const c of sec.cells) {
        if (c.y + cellH < top || c.y > bottom) continue;
        pctx.save(); pctx.translate(c.x, c.y);
        pctx.fillStyle = DARK_LOOKS[lookId] || (lookId === 'space' ? '#cfdbea' : lookId === 'pulp' ? '#f9c46b' : null) || 'rgba(58,42,77,0.06)'; pctx.fillRect(3, 3, cellW - 6, cellH - 6); pctx.beginPath(); pctx.rect(3, 3, cellW - 6, cellH - 26); pctx.clip();
        const p = personFor(c.it), v = VIEWS[view];
        const ang = v[0] === 'spin' ? t * 0.9 : null;
        p.fx = ang === null ? v[2] : Math.sin(ang); p.fz = ang === null ? v[3] : -Math.cos(ang);
        const sp = walking ? 1.3 : 0; p.vx = p.fx * sp; p.vz = p.fz * sp; p.walkA = walking ? 1 : 0;
        p.phase = t * 5.5; p.x = 0; p.z = 0;
        // same camera as the Customize preview, scaled so the whole figure sits in the cell
        const f = 262 * sc * 1.2 * (sec.zoom ? 2.3 : 1), feet = sec.zoom ? (cellH - 22) * 0.42 + 1.63 * f / 3 : feetY;
        if (sec.zoom) { p.fx = 0; p.fz = -1; p.vx = 0; p.vz = 0; p.walkA = 0; }
        setW(cellW); setH(cellH); setF(f); setVX(0); setVZ(-3); setVY(1.0); setCX(cellW / 2); setHOR(feet - f / 3);
        forceStyle(lookId); styleBegin(); drawPerson(p); styleEnd(); forceStyle(keepStyle);
        pctx.restore(); pctx.save(); pctx.translate(c.x, c.y);
        pctx.globalAlpha = 1; pctx.fillStyle = DARK_LOOKS[lookId] ? '#e9e4ff' : '#3a2a4d'; pctx.font = '14px "Patrick Hand", sans-serif'; pctx.textAlign = 'center'; pctx.textBaseline = 'alphabetic';
        pctx.fillText(c.it.name, cellW / 2, cellH - 10, cellW - 8);
        pctx.restore();
      }
    }
    setCtx(saved[0]); setW(saved[1]); setH(saved[2]); setF(saved[3]); setHOR(saved[4]); setCX(saved[5]); setVX(saved[6]); setVZ(saved[7]); setVY(saved[8]); setShowHB(saved[9]);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
