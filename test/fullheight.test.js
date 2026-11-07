// The picture must fill an iPhone home-screen app even when the phone reports a short page height. node --test
const test = require('node:test');
const assert = require('node:assert');
const esbuild = require('esbuild');
const path = require('path');

const { fullHeight } = new Function('module', 'exports', esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'render', 'fullheight.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text + '; return module.exports;')({ exports: {} }, {});

// iPhone 14 Pro Max: 430 x 932 points. The phone reported 874 (58 short), as in Stefan's screenshot.
const phone = { innerW: 430, innerH: 874, probe: 874, screenW: 430, screenH: 932, standalone: true };

test('home-screen app: uses the real screen height when the page height is short', () => {
  assert.strictEqual(fullHeight(phone), 932);
});
test('home-screen app: the tall 100vh measurement also counts', () => {
  assert.strictEqual(fullHeight({ ...phone, screenH: 0, probe: 932 }), 932);
});
test('in Safari or any browser the reported height is trusted (toolbars are real)', () => {
  assert.strictEqual(fullHeight({ ...phone, standalone: false }), 874);
});
test('landscape home-screen app uses the short side of the screen', () => {
  assert.strictEqual(fullHeight({ ...phone, innerW: 932, innerH: 390, probe: 390, screenH: 932, screenW: 430 }), 430);
});
test('a wild number is ignored (never more than 120 points taller than reported)', () => {
  assert.strictEqual(fullHeight({ ...phone, probe: 5000, screenH: 5000 }), 874);
});
