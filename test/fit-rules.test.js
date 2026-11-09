const { test } = require('node:test');
const assert = require('node:assert/strict');
const rules = import('../tools/fit-rules.mjs');
const viewport = { width: 320, height: 568 };
const clean = () => ({ boxes: [{ element: 'screen', left: 0, top: 0, right: 320, bottom: 568, clientWidth: 320, scrollWidth: 320, clientHeight: 568, scrollHeight: 568 }], controls: [] });
test('fitting content and edge-aligned controls pass', async () => {
  const m = clean(); m.controls.push({ element: 'button', left: 0, top: 0, right: 320, bottom: 568 });
  assert.deepEqual((await rules).fitProblems(m, viewport), []);
});
test('horizontal overflow and vertically scrolling nested content are reported', async () => {
  const m = clean(); m.boxes[0].scrollWidth = 340; m.boxes[0].scrollHeight = 600;
  assert.deepEqual((await rules).fitProblems(m, viewport).map(p => p.problem), ['horizontal overflow', 'vertical overflow']);
});
test('partly and fully off-screen controls on every edge are reported', async () => {
  const m = clean();
  m.controls = [ [-1, 0, 20, 20], [0, -1, 20, 20], [310, 0, 330, 20], [0, 560, 20, 580], [400, 600, 420, 620] ].map((r, i) => ({ element: String(i), left:r[0], top:r[1], right:r[2], bottom:r[3] }));
  assert.equal((await rules).fitProblems(m, viewport).filter(p => p.problem === 'control off-screen').length, 5);
});
test('content outside the viewport is reported even with clipping', async () => {
  const m = clean(); m.boxes[0].right = 330; m.boxes[0].bottom = 580;
  assert.equal((await rules).fitProblems(m, viewport).length, 2);
});
test('two pixel scroll rounding passes but six pixels is reported with magnitude and text', async () => {
  const m = clean(); m.boxes[0].scrollWidth += 2; m.boxes[0].scrollHeight += 2;
  assert.deepEqual((await rules).fitProblems(m, viewport), []);
  m.boxes[0].scrollHeight += 4; m.boxes[0].text = 'A descriptive card title';
  const [p] = (await rules).fitProblems(m, viewport);
  assert.equal(p.overflow, 6); assert.equal(p.text, m.boxes[0].text);
});
test('controls must stay inside nearest panel even within viewport, with strict edges', async () => {
  const m = clean();
  m.controls = [{ element: 'button', left: 19.9, right: 300, top: 20, bottom: 40, panel: { left: 20, right: 299.9 } }];
  assert.equal((await rules).fitProblems(m, viewport)[0].problem, 'control outside panel');
});
