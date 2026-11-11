// Independent bounded review: no writes to builder evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {runCase} = require('../../../../tools/build-bot-trial.cjs');
const raw = require('../batch-17a-evidence/bot-results.json').rows;
const summary = require('../batch-17a-evidence/bot-summary.json').summary;
const repeated = [];
for (const level of [1,5,6]) for (const treatment of ['legacy','A']) {
  const row = runCase({level,seed:42,kit:'speed',rotation:0,treatment});
  const saved = raw.find(r=>r.level===level&&r.seed===42&&r.kit==='speed'&&r.rotation===0&&r.treatment===treatment&&!r.normal&&!r.collisions);
  assert.deepEqual(row,saved);
  repeated.push(row);
}
const a = raw.filter(r=>r.level===1&&r.kit==='speed'&&r.treatment==='A'&&!r.normal&&!r.collisions);
const pairs = a.map(r=>[r.bots.find(b=>b.look.build==='large'),raw.find(x=>x.level===r.level&&x.seed===r.seed&&x.rotation===r.rotation&&x.kit===r.kit&&x.treatment==='legacy'&&!x.normal&&!x.collisions).bots.find(b=>b.look.build==='large')]);
assert.equal(pairs.length,15);
assert.ok(pairs.every(p=>p.every(b=>b.done&&!b.timeout)));
const mean = xs=>xs.reduce((a,b)=>a+b,0)/xs.length;
const delta = mean(pairs.map(([a,b])=>a.finishTime-b.finishTime));
const recorded = summary.find(s=>s.id==='controlled/1/speed/large');
assert.equal(delta,recorded.delta.mean);
assert.equal(mean(pairs.map(p=>p[0].finishTime)),recorded.timesA);
assert.equal(mean(pairs.map(p=>p[1].finishTime)),recorded.timesLegacy);
const counts = {ordinary:0,ordinaryFinished:0,probe:0,probeTimeout:0};
for(const r of raw) for(const b of r.bots) {
  if(r.collisions){counts.probe++;counts.probeTimeout+=+b.timeout;}
  else {counts.ordinary++;counts.ordinaryFinished+=+b.done;}
}
assert.deepEqual(counts,{ordinary:630,ordinaryFinished:630,probe:18,probeTimeout:18});
fs.writeFileSync(__dirname+'/repeated.json',JSON.stringify({repeated,counts,independentFifthLargeDelta:delta},null,2)+'\n');
console.log('Six full legacy/A rows match exactly; independent 15-pair Fifth large mean '+delta+'; counts '+JSON.stringify(counts));
