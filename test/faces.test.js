// Face options (eyes, nose, mouth). node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');
const { load } = require('./harness');

function bundle(file) {
  const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', file)], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
  return m.exports;
}
const { FACE_PARTS, FACE_DEFAULT, cleanFace, randomFace } = bundle('src/config/faces.js');

test('every face part has options and the default is one of them', () => {
  for (const part of ['eyes', 'nose', 'mouth']) {
    assert.ok(FACE_PARTS[part].length >= 3, part + ' has choices');
    assert.ok(FACE_PARTS[part].some(o => o[0] === FACE_DEFAULT[part]), part + ' default is a real option');
  }
});

test('cleanFace repairs missing or unknown values (old saves, bad data)', () => {
  assert.deepStrictEqual(cleanFace({}), FACE_DEFAULT);
  assert.deepStrictEqual(cleanFace({ eyes: 'nuke', nose: 5, mouth: null }), FACE_DEFAULT);
  assert.strictEqual(cleanFace({ eyes: 'happy' }).eyes, 'happy');
});

test('random faces are always valid and vary', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const f = randomFace(Math.random);
    for (const part of ['eyes', 'nose', 'mouth']) assert.ok(FACE_PARTS[part].some(o => o[0] === f[part]));
    seen.add(f.eyes + f.nose + f.mouth);
  }
  assert.ok(seen.size > 10, 'variety: ' + seen.size);
});

test('every body, face and view draws without errors', () => {
  const E = load('test/entries/draw-entry.js'.replace(/^/, path.join(__dirname, '..') + path.sep));
  const n = E.drawAll();
  assert.ok(n >= 2 * 4 * 4 * 4 * 3, 'drew all combinations: ' + n);
});
