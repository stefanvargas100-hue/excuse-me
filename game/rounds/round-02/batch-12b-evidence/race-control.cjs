const fs=require('node:fs'), Module=require('node:module'), path=require('node:path');
const filename=path.resolve('test/harness.js');
const m=new Module(filename,module); m.filename=filename; m.paths=module.paths;
// Control changes only the generated in-memory bundle, never production files.
m._compile(fs.readFileSync(filename,'utf8').replace('.outputFiles[0].text;', ".outputFiles[0].text.replace('(S.lesson || p.racer) && ', '');"),filename);
const e=m.exports.load(); e.start('race'); e.S.race.countT=0;
let maxBoost=0;
for(let i=0;i<60;i++) {e.S.people=[];e.S.race.bots=[];e.S.nextChunk=1e9;const p=e.mkPerson(e.S.px,e.S.pz+2.5);p.vz=3;p.vx=0;e.tick(1/30);maxBoost=Math.max(maxBoost,e.S.draftT);}
require('node:assert/strict').ok(maxBoost>0,'restoring original race condition restores pedestrian draft');
console.log({restoredConditionMaxBoost:maxBoost});
