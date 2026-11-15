// Batch 27: bot races of 4 on each changed stage, seeds 1 to 20. Every bot must finish, and none may be stuck: no 6 s stretch
// in which it moves less than 1.5 m, and few slip-throughs (the race's safety net for a bot pinned against someone for 1.8 s).
// slips counts only that safety net (ghostT set to exactly STUCK_GHOST, 0.8 s); clears counts Clear power-ups, which set ghostT too.
//   node game/rounds/round-02/batch-27-evidence/bot-sweep.js [stage-id ...]   (default: all four; prints JSON lines)
const { load } = require('../../../../test/harness.js');
const STAGES = ['tsukiji', 'skytree', 'baggage', 'gatechange'];
const DT = 1 / 30, WINDOW = 6, MIN_MOVE = 1.5;

function race(id, seed) {
  const E = load(undefined, { seed }); E.storage.excuseme_botlvl = String(seed % 3);
  E.setLevel(E.LEVELS.findIndex(l => l.id === id));
  E.start('race', undefined, { cup: { model: { bots: [] } } }); E.S.cup = null; E.S.race.countT = 0;
  E.S.race.bots.splice(4); const bots = E.S.race.bots;
  const mark = bots.map(b => ({ z: b.z, t: 0 })), worst = bots.map(() => Infinity), slips = bots.map(() => 0), clears = bots.map(() => 0), was = bots.map(() => 0);
  for (let i = 0; i < 400 / DT && !bots.every(b => b.done); i++) {
    E.S.pz = Math.max(0, Math.min(...bots.filter(b => !b.done).map(b => b.z)) - 20); E.S.me.z = E.S.pz;
    E.tick(DT);
    bots.forEach((b, k) => {
      if (b.ghostT === 0.8) slips[k]++;   // the stuck rule sets exactly 0.8 after this tick's countdown
      else if (b.ghostT > (was[k] || 0)) clears[k]++;
      was[k] = b.ghostT;
      if (b.done) return;
      if (E.S.time - mark[k].t >= WINDOW) { worst[k] = Math.min(worst[k], b.z - mark[k].z); mark[k] = { z: b.z, t: E.S.time }; }
    });
  }
  return { id, seed, diff: seed % 3, done: bots.every(b => b.done), times: bots.map(b => b.done ? +b.finishT.toFixed(1) : null), worstMove: +Math.min(...worst).toFixed(2), slips, clears };
}

module.exports = { race, STAGES, MIN_MOVE };
if (require.main === module) {
  for (const id of process.argv.slice(2).length ? process.argv.slice(2) : STAGES) {
    const rows = [];
    for (let seed = 1; seed <= 20; seed++) rows.push(race(id, seed));
    const times = rows.flatMap(r => r.times).filter(t => t !== null).sort((a, b) => a - b);
    const stuck = rows.filter(r => !r.done || r.worstMove < MIN_MOVE);
    console.log(JSON.stringify({ id, races: rows.length, allDone: rows.every(r => r.done), stuck: stuck.map(r => r.seed), median: times[Math.floor(times.length / 2)], maxSlips: Math.max(...rows.flatMap(r => r.slips)), totalSlips: rows.flatMap(r => r.slips).reduce((a, b) => a + b, 0), totalClears: rows.flatMap(r => r.clears).reduce((a, b) => a + b, 0), rows }));
  }
}
