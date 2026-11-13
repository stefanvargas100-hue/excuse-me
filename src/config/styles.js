/* ---------- art styles: every stage is its own world, and the stages of one cup belong to one family ---------- */
// A style is a recipe, not artwork: how colours are remapped, how characters are shaped and shaded, and which set pieces go with it.
// Everything here is pure, so it can be tested without a canvas. The canvas side is in render/style.js.

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-6) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, clamp01(s), l];
}

function toRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (((h % 360) + 360) % 360) / 60, x = c * (1 - Math.abs(hp % 2 - 1)), m = l - c / 2;
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const hueGap = (a, b) => ((b - a + 540) % 360) - 180;                       // shortest signed way round the colour wheel
const pull = (h, to, t) => h + hueGap(h, to) * t;
const nearest = (h, list) => list.reduce((best, x) => (Math.abs(hueGap(h, x)) < Math.abs(hueGap(h, best)) ? x : best), list[0]);
const steps = (l, n, keep) => l * keep + (Math.round(l * n) / n) * (1 - keep);   // posterise: flat bands of tone, like printed ink
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const band = (v, stops) => { for (const [at, col] of stops) if (v < at) return col; return stops[stops.length - 1][1]; };
const same = (r, g, b) => [r, g, b];

/* ===== New York: the comic family ===== */

/* Fifth Avenue: superhero comic. Punchy flat colour in printed bands, heavy black ink, halftone dots, panel borders. */
const comicScene = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b);
  const c = clamp01((l - 0.5) * 1.3 + 0.5);
  const [R, G, B] = toRgb(h, clamp01(s * 1.7 + 0.08), steps(c, 5, 0.08));
  return [R, Math.round(G * 0.98), Math.round(B * 0.9)];                      // a little warm, like newsprint
};
const comicFig = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b);
  return toRgb(h, clamp01(s * 1.5 + 0.08), steps(clamp01((l - 0.5) * 1.25 + 0.52), 4, 0.12));
};

/* Central Park: Sunday funnies. Sunny, simple and round: fresh greens, sky blue, soft ink, big friendly heads. */
const funniesScene = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b);
  const hue = h > 60 && h < 170 ? pull(h, 112, 0.45) : h > 170 && h < 250 ? pull(h, 200, 0.4) : h;
  return toRgb(hue, clamp01(s * 1.55 + 0.14), steps(clamp01((l - 0.5) * 1.1 + 0.58), 5, 0.1));
};
const funniesFig = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b);
  return toRgb(h, clamp01(s * 1.4 + 0.1), steps(clamp01((l - 0.5) * 1.1 + 0.56), 4, 0.15));
};

/* Brooklyn Bridge: sunset pulp print. Four inks only, navy, teal, orange and cream, like an old travel poster. */
const PULP = [[0.2, rgb('#1b1a3a')], [0.4, rgb('#1f5b78')], [0.58, rgb('#d9572b')], [0.76, rgb('#f08f3c')], [0.9, rgb('#f9c46b')], [2, rgb('#ffeecb')]];
const pulpScene = (r, g, b) => band(lum(r, g, b), PULP);
const pulpFig = (r, g, b) => {                                               // people keep half their own colour so racers stay tellable
  const p = band(lum(r, g, b) * 0.92, PULP), [h, s, l] = toHsl(r, g, b), o = toRgb(h, clamp01(s * 1.2), steps(l, 4, 0.2));
  return [Math.round((p[0] + o[0]) / 2), Math.round((p[1] + o[1]) / 2), Math.round((p[2] + o[2]) / 2)];
};

/* Subway Platform: ink noir. Black, white and two greys, with one spot colour: red. */
const INK = [[0.13, rgb('#07070a')], [0.36, rgb('#26262d')], [0.62, rgb('#7d7d86')], [0.84, rgb('#c9c7c2')], [2, rgb('#f4f1ea')]];
const RED = rgb('#e3182d');
const isSignal = (h, s, l) => s > 0.55 && l > 0.25 && l < 0.8 && (h < 62 || h > 335);   // reds and safety yellows carry the spot colour
const inkScene = (r, g, b) => { const [h, s, l] = toHsl(r, g, b); return isSignal(h, s, l) ? RED : band(lum(r, g, b), INK); };
const inkFig = (r, g, b) => band(lum(r, g, b) * 0.55, INK);                   // the crowd: silhouettes cut out of the dark
const inkMe = (r, g, b) => { const v = lum(r, g, b); return v < 0.2 ? rgb('#07070a') : v > 0.8 ? rgb('#f4f1ea') : RED; };   // you are the red one

/* ===== Tokyo: the neon family ===== */

/* Shibuya Crossing: neo-noir. Rain-black streets, everything sunk into blue shadow, and only lights keep their colour. */
const NOIR_HUES = [345, 190, 38, 278];
const noirScene = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b), glow = clamp01((s - 0.45) / 0.2) * clamp01((l - 0.12) / 0.2);   // a light stays a light, however far down the street
  const dark = 0.012 + 0.3 * l * l + 0.06 * l, lit = 0.24 + 0.74 * l, L = dark + (lit - dark) * glow;
  if (glow > 0.3) return toRgb(pull(h, nearest(h, NOIR_HUES), 0.5), clamp01(s * 1.2 + 0.2), clamp01(L));
  return toRgb(pull(h, 228, 0.82), 0.3 + 0.3 * glow, clamp01(L));
};
const noirFig = (r, g, b) => {                                                // the crowd: near-silhouettes with a hint of their colour
  const [h, s, l] = toHsl(r, g, b);
  return toRgb(h, clamp01(s * 0.5 + 0.05), clamp01(0.04 + 0.32 * l));
};
const noirMe = (r, g, b) => {                                                 // you: still in shadow, but clearly the one in colour
  const [h, s, l] = toHsl(r, g, b);
  return toRgb(h, clamp01(s * 1.1 + 0.1), clamp01(0.1 + 0.6 * l));
};

/* Takeshita Street: neon pop. A candy-coloured arcade dusk: violet haze, hot pink and mint light, everything glowing. */
const POP_HUES = [322, 178, 52, 268];
const popScene = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b), glow = clamp01((s - 0.26) / 0.2) * clamp01((l - 0.2) / 0.2);
  const dark = 0.07 + 0.34 * l * l + 0.1 * l, lit = 0.34 + 0.5 * l, L = dark + (lit - dark) * glow;
  if (glow > 0.3) return toRgb(pull(h, nearest(h, POP_HUES), 0.6), clamp01(s * 1.4 + 0.3), clamp01(L));
  return toRgb(pull(h, 278, 0.85), 0.42, clamp01(L));
};
const popFig = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b);
  return toRgb(pull(h, nearest(h, POP_HUES), 0.25), clamp01(s * 1.25 + 0.12), clamp01(0.14 + 0.62 * l));
};

/* ===== Airport: the space family ===== */

/* Terminal B: space station. A brushed silver hull against black space; signs and shops become glowing holograms. */
const HOLO_HUES = [190, 28, 305, 150];
const lightOf = (s, l) => clamp01((s - 0.5) / 0.25) * clamp01((l - 0.3) / 0.25);
const spaceScene = (r, g, b) => {
  const [h, s, l] = toHsl(r, g, b), glow = lightOf(s, l);
  if (glow > 0.3) return toRgb(pull(h, nearest(h, HOLO_HUES), 0.55), 1, clamp01(0.5 + 0.16 * l));
  if (s > 0.25 && l < 0.45) return toRgb(pull(h, 222, 0.7), clamp01(s * 0.9 + 0.1), clamp01(0.06 + 0.5 * l));   // dark carpet and trim: deep navy
  if (l > 0.975) return [244, 250, 255];                                       // light panels
  return toRgb(214, 0.24 - 0.12 * l, clamp01(0.15 + 0.6 * l * l));            // everything else: brushed silver hull
};
const isSkin = (h, s, l) => h > 8 && h < 42 && s > 0.22 && s < 0.75 && l > 0.2 && l < 0.86;
const spaceFig = (r, g, b) => {                                               // clothes become pale suits that keep a tint of their colour
  const [h, s, l] = toHsl(r, g, b);
  if (isSkin(h, s, l)) return [r, g, b];
  return toRgb(h, clamp01(s * 0.7), clamp01(0.42 + 0.52 * l));
};

// scene / figure / figureMe: colour recipes for scenery, the crowd and (optionally) the player.
// fig: how characters are built. head/limb/body scale the classic proportions; ink is the outline weight (0 = none);
//   shade is 'soft' (rounded, three tones), 'cel' (two hard tones) or 'flat' (one tone); line is the outline colour.
//   Optional: rim (outline colours that vary from person to person), rain (umbrellas up), helmet (a visor over every head),
//   bubble (inked speech bubbles).
// sceneInk: outline upright scenery. fog / skyTop: replace the stage's own haze and sky colour.
// sky / ground / finish / backdrop / shadow: the set pieces in render/style.js that go with this world.
export const STYLES = {
  classic: { name: 'Classic', family: null, scene: same, figure: same,
    fig: { head: 1, limb: 1, body: 1, ink: 1, shade: 'soft', line: '#3a2a4d' } },

  comic: { name: 'Superhero comic', family: 'comic', scene: comicScene, figure: comicFig, sceneInk: { col: '#0d0b14', w: 2.4, far: 42 },
    sky: 'burst', finish: 'comic', shadow: 'dots',
    fig: { head: 1.12, limb: 1.1, body: 1.05, ink: 2.3, shade: 'cel', line: '#0d0b14', bubble: true } },
  funnies: { name: 'Sunday funnies', family: 'comic', scene: funniesScene, figure: funniesFig, sceneInk: { col: '#22304a', w: 2, far: 38 },
    sky: 'clouds', finish: 'funnies', shadow: 'dots', skyTop: '#3aa0f0',
    fig: { head: 1.3, limb: 1.16, body: 1.1, ink: 1.9, shade: 'flat', line: '#22304a', bubble: true } },
  pulp: { name: 'Sunset pulp print', family: 'comic', scene: pulpScene, figure: pulpFig, sceneInk: { col: '#1b1a3a', w: 2.2, far: 46 },
    sky: 'sun', finish: 'pulp', shadow: 'dots', skyTop: '#d9572b', fog: '#f9c46b',
    fig: { head: 1.04, limb: 1.04, body: 1.02, ink: 2.1, shade: 'cel', line: '#1b1a3a', bubble: true } },
  inknoir: { name: 'Ink noir', family: 'comic', scene: inkScene, figure: inkFig, figureMe: inkMe, sceneInk: { col: '#f4f1ea', w: 1.3, far: 30 },
    finish: 'inknoir', fog: '#101014',
    fig: { head: 0.98, limb: 0.96, body: 1, ink: 1.25, shade: 'flat', line: '#f4f1ea', bubble: true } },

  noir: { name: 'Neo-noir city', family: 'neon', scene: noirScene, figure: noirFig, figureMe: noirMe,
    sky: 'glowcloud', ground: 'wet', finish: 'noir', fog: '#0c0b18', skyTop: '#04030a', signs: ['ラーメン', '東京', 'カラオケ', '酒場', 'ホテル', '渋谷', '寿司', '薬局'],
    fig: { head: 0.95, limb: 0.93, body: 0.96, ink: 0.9, shade: 'cel', line: '#35e8ff', rim: ['#35e8ff', '#ff3d9a', '#ffb347', '#b26bff'], rain: true } },
  neonpop: { name: 'Neon pop', family: 'neon', scene: popScene, figure: popFig,
    sky: 'synthsun', ground: 'grid', finish: 'pop', fog: '#3a1466', skyTop: '#16063a', signs: ['カワイイ', 'クレープ', '原宿', 'ポップ', 'アイス', 'ゲーム'],
    fig: { head: 1.18, limb: 1.02, body: 1, ink: 1, shade: 'cel', line: '#ff5fc4', rim: ['#ff5fc4', '#5ffbf1', '#fff06a', '#c08bff'] } },

  space: { name: 'Space station', family: 'space', scene: spaceScene, figure: spaceFig,
    backdrop: 'space', ground: 'deck', finish: 'space', fog: '#9fb2cc',
    fig: { head: 1, limb: 1.24, body: 1.14, ink: 1, shade: 'soft', line: '#1b2a4a', helmet: true } }
};

// Each stage's own world, and the look a new stage in a known cup starts with.
export const STAGE_STYLE = { airport: 'space', nyc: 'comic', park: 'funnies', bridge: 'pulp', subway: 'inknoir', shibuya: 'noir', takeshita: 'neonpop', tsukiji: 'neonpop', skytree: 'neonpop', security: 'space', baggage: 'space', gatechange: 'space' };
export const CUP_STYLE = { 'New York': 'comic', Tokyo: 'noir', Airport: 'space' };

export const styleIdFor = lv => (lv && (STAGE_STYLE[lv.id] || CUP_STYLE[lv.city])) || 'classic';

const HEX6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i, HEX3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;
const h2 = n => (n < 16 ? '0' : '') + n.toString(16);

// One CSS colour in, the style's version out. fig: 0 scenery, 1 a character, 2 the player's own character.
// Opaque colours come back as #rrggbb and see-through ones as "rgba(r, g, b, a)":
// the exact forms a canvas hands back, so a colour read from the canvas can be recognised again.
export function mapColour(id, css, fig) {
  const st = STYLES[id];
  if (!st || id === 'classic' || typeof css !== 'string') return css;
  let r, g, b, a = null, m;
  if ((m = HEX6.exec(css))) { r = parseInt(m[1], 16); g = parseInt(m[2], 16); b = parseInt(m[3], 16); }
  else if ((m = HEX3.exec(css))) { r = parseInt(m[1], 16) * 17; g = parseInt(m[2], 16) * 17; b = parseInt(m[3], 16) * 17; }
  else if ((m = RGB.exec(css))) { r = Math.min(255, +m[1]); g = Math.min(255, +m[2]); b = Math.min(255, +m[3]); if (m[4] !== undefined) a = m[4]; }
  else return css;
  if (a !== null && +a === 0) return css;
  const o = (fig === 2 && st.figureMe ? st.figureMe : fig ? st.figure : st.scene)(r, g, b);
  return a === null || +a >= 1 ? '#' + h2(o[0]) + h2(o[1]) + h2(o[2]) : 'rgba(' + o[0] + ', ' + o[1] + ', ' + o[2] + ', ' + a + ')';
}
