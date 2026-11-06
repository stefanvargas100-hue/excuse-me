// Face parts: looks only, no stats, nothing locked.
export const FACE_PARTS = {
  eyes: [['dot', 'Dots'], ['round', 'Round'], ['happy', 'Happy'], ['sleepy', 'Sleepy']],
  nose: [['none', 'None'], ['button', 'Button'], ['pointy', 'Pointy'], ['big', 'Big']],
  mouth: [['smile', 'Smile'], ['grin', 'Grin'], ['flat', 'Flat'], ['open', 'Open']]
};

export const FACE_DEFAULT = { eyes: 'dot', nose: 'none', mouth: 'smile' };

const PARTS = ['eyes', 'nose', 'mouth'];

// A full face from whatever was saved or received: anything missing or unknown becomes the default.
export function cleanFace(o) {
  const out = {};
  for (const k of PARTS) out[k] = o && FACE_PARTS[k].some(v => v[0] === o[k]) ? o[k] : FACE_DEFAULT[k];
  return out;
}

// A random face for crowd people. r is a function returning a number from 0 up to (not including) 1.
export function randomFace(r) {
  const out = {};
  for (const k of PARTS) out[k] = FACE_PARTS[k][Math.floor(r() * FACE_PARTS[k].length)][0];
  return out;
}
