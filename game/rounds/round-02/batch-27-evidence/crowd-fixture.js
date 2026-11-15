// Batch 27: records the crowd of one fixed seed on each of the 8 stages this batch must not change, so a test can prove
// they stay exactly the same. Two runs per stage: a bot race (4 racers) and a seeded Daily run.
//   node game/rounds/round-02/batch-27-evidence/crowd-fixture.js [out.json]   (no argument: print the JSON)
const crypto = require('node:crypto');
const path = require('node:path');
const { load } = require('../../../../test/harness.js');

const UNCHANGED = ['airport', 'nyc', 'shibuya', 'park', 'bridge', 'subway', 'takeshita', 'security'];
const SNAPS = [300, 900, 1800, 2700];   // ticks at 1/30 s
const digest = E => {
  const rows = E.S.people.map(p => [p.x, p.z, p.vx, p.vz, p.prop || '', p.v0]);
  return { n: rows.length, sha: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 24) };
};

function race(i) {
  const E = load(undefined, { seed: 27 }); E.storage.excuseme_botlvl = '1'; E.setLevel(i);
  E.start('race'); E.S.race.countT = 0;
  E.S.race.bots.splice(3);   // the player and three bots
  const out = {};
  for (let t = 1; t <= SNAPS[SNAPS.length - 1]; t++) {
    const live = E.S.race.bots.filter(b => !b.done);
    E.S.pz = live.length ? Math.max(0, Math.min(...live.map(b => b.z)) - 8) : E.S.pz; E.S.me.z = E.S.pz;
    E.tick(1 / 30);
    if (SNAPS.includes(t)) out[t] = { ...digest(E), bots: E.S.race.bots.map(b => +b.z.toFixed(6)) };
  }
  return out;
}

function daily(i) {
  const E = load(undefined, { seed: 27, date: new Date('2026-11-14T12:00:00Z') }); E.setLevel(i);
  E.start('daily');
  const out = { seed: E.S.seed };
  for (let t = 1; t <= SNAPS[SNAPS.length - 1]; t++) {
    E.S.pz += 3 / 30; E.S.me.z = E.S.pz; E.S.ghostT = 9;   // a steady walker who never collides
    E.tick(1 / 30);
    if (SNAPS.includes(t)) out[t] = digest(E);
  }
  return out;
}

function record() {
  const E = load(undefined, { seed: 1 }), res = {};
  for (const id of UNCHANGED) { const i = E.LEVELS.findIndex(l => l.id === id); res[id] = { race: race(i), daily: daily(i) }; }
  return res;
}
module.exports = { record, UNCHANGED };
if (require.main === module) {
  const json = JSON.stringify(record(), null, 1);
  if (process.argv[2]) require('node:fs').writeFileSync(path.resolve(process.argv[2]), json + '\n'); else console.log(json);
}
