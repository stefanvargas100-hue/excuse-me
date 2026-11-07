// B2: bots say "Excuse me" under the player's rules. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');
const DT = 1 / 30;

function setup(opts = {}) {
  const E = load(undefined, { seed: opts.seed || 7 }); if (opts.level !== undefined) E.storage.excuseme_botlvl = String(opts.level);
  E.setLevel(opts.stage || 0); E.start('race'); for (let i = 0; i < 91; i++) E.tick(DT);
  E.S.people.length = 0; return E;
}
const aside = p => (p.aside || 0) > 0;

test('a bot clears eligible people ahead of it and in its lane, like the player does', () => {
  const E = setup(); const b = E.S.race.bots[0]; b.x = -1; b.z = 20;
  const ahead = [1.5, 3, 4.5].map(d => E.mkPerson(b.x + 0.2, b.z + d));
  const behind = E.mkPerson(b.x, b.z - 2), wide = E.mkPerson(b.x + 3, b.z + 3), far = E.mkPerson(b.x, b.z + 12);
  E.S.people.push(...ahead, behind, wide, far);
  assert.ok(E.botExcuseMe(b) > 0);
  assert.ok(ahead.every(aside), 'the three ahead step aside');
  assert.ok(!aside(behind) && !aside(wide) && !aside(far));
});

test('a bot helps with at most four people, and never moves a resistant one', () => {
  const E = setup(); const b = E.S.race.bots[0]; b.x = 0; b.z = 20;
  const rival = E.mkPerson(b.x, b.z + 1); rival.rival = true;
  const crowd = [2, 2.5, 3, 3.5, 4, 4.5].map(d => E.mkPerson(b.x, b.z + d));
  E.S.people.push(rival, ...crowd);
  E.botExcuseMe(b);
  assert.ok(!aside(rival), 'rivals refuse');
  assert.ok(crowd.filter(aside).length <= 4);
});

test('people behind the airport glass are out of reach', () => {
  const E = setup(); const b = E.S.race.bots[0]; b.x = 1.0; b.z = 35;
  const beyond = E.mkPerson(2.6, 37), clear = E.mkPerson(1.0, 37);
  E.S.people.push(beyond, clear);
  E.botExcuseMe(b);
  assert.ok(aside(clear)); assert.ok(!aside(beyond), 'glass between them');
});

test('a bot has the same cooldown as the player (5.5 s, 3.5 s when well timed)', () => {
  const E = setup(); const b = E.S.race.bots[0]; b.x = 0; b.z = 20;
  const p = E.mkPerson(b.x, b.z + 1.5); E.S.people.push(p);
  assert.ok(E.botExcuseMe(b) > 0);
  assert.ok(b.shoutCD >= 3.4 && b.shoutCD <= 5.5, 'cooldown ' + b.shoutCD);
  p.aside = 0; assert.strictEqual(E.botExcuseMe(b), 0, 'cooling down');
  assert.ok(!aside(p));
});

test('two bots calling on the same person in one step cannot stack the push', () => {
  const E = setup(); const [a, b] = E.S.race.bots; a.x = 0; a.z = 20; b.x = 0.2; b.z = 20;
  const p = E.mkPerson(0.1, 21.5); E.S.people.push(p);
  E.botExcuseMe(a); const dir = p.asideDir, amt = p.aside;
  E.botExcuseMe(b);
  assert.strictEqual(p.asideDir, dir); assert.ok(p.aside <= amt + 1e-9);
});

test('the player is not helped or hindered in the cooldown sense: bot calls leave the player shout alone', () => {
  const E = setup(); const b = E.S.race.bots[0]; b.x = 0; b.z = 20;
  E.S.people.push(E.mkPerson(b.x, b.z + 2)); const cd = E.S.shoutCD;
  E.botExcuseMe(b);
  assert.strictEqual(E.S.shoutCD, cd);
});

test('difficulty: Hard bots call far more often than Easy bots, and Easy still sometimes does', () => {
  const count = lvl => {   // one bot, someone always standing in its way, 60 s: only the readiness to call differs
    const E = setup({ level: lvl, seed: 11 }); E.S.race.bots.length = 1; const b = E.S.race.bots[0];
    assert.strictEqual(E.S.race.diff.name, ['Easy', 'Medium', 'Hard'][lvl]);
    for (let i = 0; i < 1800; i++) { const p = E.mkPerson(b.x, b.z + 3); p.vz = 0; E.S.people.length = 0; E.S.people.push(p); E.tick(DT); b.bumpT = 0; }
    return b.calls || 0;
  };
  const easy = count(0), hard = count(2);
  assert.ok(hard >= easy * 1.5, 'hard ' + hard + ' vs easy ' + easy);
  assert.ok(easy > 0, 'easy bots do use it, sparingly');
});

test('a fixed seed gives the same bot calls and crowd every time', () => {
  const run = () => {
    const E = setup({ level: 2, seed: 5 }); const calls = [];
    for (let i = 0; i < 900; i++) { E.tick(DT); }
    return JSON.stringify([E.S.race.bots.map(b => [b.calls || 0, +b.z.toFixed(2)]), E.S.people.slice(0, 20).map(p => [+p.x.toFixed(2), +p.z.toFixed(2)])]);
  };
  const a = run(); assert.strictEqual(a, run());
  assert.ok(JSON.parse(a)[0].reduce((n, b) => n + b[0], 0) > 0, 'the run contains bot calls');
});

