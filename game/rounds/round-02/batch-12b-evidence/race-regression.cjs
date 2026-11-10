const assert = require('node:assert/strict');
const { load } = require('../../../../test/harness.js');
const e = load(); e.start('race'); e.S.race.countT = 0;
let maxCharge = 0, maxBoost = 0;
for (let i=0;i<60;i++) {
  e.S.people=[]; e.S.race.bots=[]; e.S.nextChunk=1e9;
  const p=e.mkPerson(e.S.px,e.S.pz+2.5); p.vz=3; p.vx=0;
  assert.ok(e.S.people.includes(p), 'target actually exists in people');
  e.tick(1/30); maxCharge=Math.max(maxCharge,e.S.draftC); maxBoost=Math.max(maxBoost,e.S.draftT);
}
console.log({maxCharge,maxBoost});
assert.ok(maxBoost>0, 'pre-batch ordinary race walker drafting must remain available');
