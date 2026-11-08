const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function landmarks() {
  const boxes = [], labels = [];
  const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {} });
  const env = { Math, ctx, LV: { half: 4.5, id: 'shibuya' }, S: { clock: 0, waveT: 4 }, calm: false,
    VZ: 250, F: 500, TAU: Math.PI * 2, hex: x => x, scl: x => x, mixc: x => x,
    clamp: (x, a, b) => Math.max(a, Math.min(b, x)), P: (x, y, z) => [x, y],
    sub: (a, b) => [a - 250, b - 250], poly() {}, fq() {}, wq() {},
    box3D: (...a) => boxes.push(a), wallText: (...a) => labels.push(a), label() {} };
  vm.createContext(env);
  const source = fs.readFileSync('src/render/landmarks.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  vm.runInContext(source, env);
  return { env, boxes, labels };
}

test('the real 3 metre scenery loop draws both cathedral towers and the central portal', () => {
  const { env, boxes, labels } = landmarks();
  for (let za = 327; za >= 300; za -= 3) env.cathedralSeg(za, za + 3);
  assert.equal(boxes.filter(b => b[3] === 62).length, 2, 'both towers appear');
  assert.ok(labels.some(a => a[0] === "ST PATRICK'S"), 'central facade appears');
});

test('scramble announcement follows a wave, fades and resets for a new run', () => {
  const { env } = landmarks();
  assert.equal(env.scrambleFlash(), 0);
  env.S.clock = 1; env.S.waveT = 10;
  assert.equal(env.scrambleFlash(), 1);
  env.S.clock = 4;
  assert.equal(env.scrambleFlash(), 0);
  env.S = { clock: 0, waveT: 10 };
  assert.equal(env.scrambleFlash(), 0);
});
