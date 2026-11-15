// Batch 27: the 8 stages without new features keep exactly the same people for the same seed, in a bot race and a Daily run.
// The fixture was recorded on develop before the batch by game/rounds/round-02/batch-27-evidence/crowd-fixture.js.  node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const { record } = require('../game/rounds/round-02/batch-27-evidence/crowd-fixture.js');
const fixture = require('../game/rounds/round-02/batch-27-evidence/unchanged-crowd.json');

test('the 8 unchanged stages produce the same crowd as develop did before batch 27', () => {
  const now = record();
  for (const id of Object.keys(fixture)) assert.deepEqual(now[id], fixture[id], id + ' changed');
  assert.equal(Object.keys(fixture).length, 8);
});
