const test = require('node:test'), assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const moduleCopy = { exports: {} };
new Function('module', 'exports', buildSync({ entryPoints: ['src/sim/friendcup.js'], bundle: true, format: 'cjs', write: false }).outputFiles[0].text)(moduleCopy, moduleCopy.exports);
const C = moduleCopy.exports;
const J = x => JSON.parse(JSON.stringify(x));
const setup = (n = 2) => ({ seed: 'friends', stages: [4, 0, 2, 1], difficulty: 1, players: Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: i < 2 ? 'mia' : 'Friend' + i })), rand: () => 0 });
const make = n => C.newFriendCup(setup(n));
const rows = c => C.cupRacers(c).map((r, i) => ({ id: r.id, place: i + 1, time: i === 7 ? null : 60 + i }));
const freeze = x => { if (x && typeof x === 'object') { Object.values(x).forEach(freeze); Object.freeze(x); } return x; };

test('2 through 8 players get ordered, unique bots and independent same-name friends', () => {
  assert.deepEqual([C.FRIEND_CUP_RULES, C.CUP_RACES, C.CUP_RACERS, C.BOT_LEVELS], [1, 4, 8, 3]);
  for (let n = 2; n <= 8; n++) {
    const c = make(n), racers = C.cupRacers(c);
    assert.equal(racers.length, 8);
    assert.deepEqual(racers.slice(0, n).map(r => r.id), setup(n).players.map(p => p.id));
    const bots = racers.slice(n);
    assert.deepEqual(bots.map(r => r.id), bots.map((_, i) => 'bot:' + i));
    assert.equal(new Set(bots.map(r => r.name.toLowerCase())).size, bots.length);
    assert.ok(bots.every(r => r.bot && !r.left && r.name.toLowerCase() !== 'mia'));
    assert.deepEqual(C.standings(c).map(r => r.id), racers.map(r => r.id));
  }
});

test('four races score all racers fairly and finish identically on two phones', () => {
  let a = make(), b = make();
  for (let i = 0; i < 4; i++) {
    assert.equal(C.currentStage(a), setup().stages[i]);
    assert.equal(C.raceSeed(a), 'friends:race' + (i + 1));
    const board = freeze(rows(a)); freeze(a);
    a = C.addRace(a, board); b = C.addRace(b, J(board).reverse());
    assert.deepEqual(a, b);
  }
  assert.equal(C.friendCupOver(a), true); assert.equal(C.currentStage(a), null);
  assert.equal(C.addRace(a, rows(a)), null);
  assert.deepEqual(C.standings(a).map(r => [r.points, r.wins, r.last, r.time]), [40,32,24,20,16,12,8,4].map((p,i) => [p,i===0?4:0,i+1,i===7?4e6:4*(60+i)]));
});

test('leaving preserves identity and totals, takeover keeps earning, and host exit counts only finished races', () => {
  const first = freeze(C.addRace(make(), rows(make()))), left = C.playerLeft(first, 'p0');
  assert.equal(C.cupRacers(first)[0].bot, false);
  assert.deepEqual(C.standings(left)[0], { ...C.standings(first)[0], bot: true, left: true });
  const next = C.addRace(left, rows(left)); assert.equal(C.standings(next)[0].points, 20);
  assert.deepEqual(C.playerLeft(left, 'p0'), left); assert.deepEqual(C.playerLeft(left, 'unknown'), left);
  assert.deepEqual(C.playerLeft(left, 'bot:0'), left);
  const ended = C.hostLeft(first);
  assert.equal(C.friendCupOver(ended), true); assert.equal(C.currentStage(ended), null);
  assert.equal(C.addRace(ended, rows(ended)), null); assert.deepEqual(C.standings(ended), C.standings(first));
});

test('setup rejects malformed network values without throwing and strips extra fields', () => {
  const c = make(), raw = { ...c, extra: 'discard' };
  const clean = C.cleanSetup(raw);
  assert.deepEqual(Object.keys(clean).sort(), ['difficulty','racers','seed','stages']);
  const bad = [{ ...raw, stages: [0, 1, 2, ,] }, null, undefined, true, 4, 'bad', [], {}, { ...raw, seed: 4 }, { ...raw, seed: 'x'.repeat(25) }, { ...raw, stages: [0,0,1,2] }, { ...raw, stages: [0,1,2,6] }, { ...raw, difficulty: 3 }, { ...raw, racers: [] }];
  for (const key of ['id', 'name']) for (const value of [null, 4, '', 'x'.repeat(25)]) bad.push({ ...raw, racers: raw.racers.map((r,i) => i ? r : { ...r, [key]: value }) });
  bad.push({ ...raw, racers: raw.racers.map(r => ({ ...r, id: 'same' })) }, { ...raw, racers: raw.racers.map(r => ({ ...r, bot: true })) }, { ...raw, racers: raw.racers.map(r => ({ ...r, left: 'yes' })) });
  for (const value of bad) assert.equal(C.cleanSetup(value), null);
  clean.racers[0].name = 'changed'; clean.stages[0] = 3;
  assert.equal(c.racers[0].name, 'mia'); assert.equal(c.stages[0], 4);
});

test('invalid local setups and race rows are rejected without changing inputs', () => {
  for (const patch of [{ players: [] }, { players: setup(1).players }, { players: setup(9).players }, { players: [{ id: 'a', name: 'a' }, { id: 'a', name: 'b' }] }, { players: [{ id: 'bot:0', name: 'a' }, { id: 'b', name: 'b' }] }, { difficulty: -1 }, { difficulty: 1.5 }, { stages: [0,1,2] }, { rand: null }]) assert.equal(C.newFriendCup({ ...setup(), ...patch }), null);
  const c = freeze(make()), good = rows(c);
  const bad = [null, {}, [], good.slice(1), [...good, good[0]], good.map(r => ({...r, place: 1})), good.map(r => ({...r, id: 'unknown'}))];
  for (const time of [undefined, -1, 3601, Infinity, NaN, '60']) bad.push(good.map((r,i) => i ? r : {...r,time}));
  for (const place of [0,9,1.5,'1']) bad.push(good.map((r,i) => i ? r : {...r,place}));
  for (const board of bad) assert.equal(C.addRace(c, board), null);
  assert.ok(C.addRace(c, good.map((r,i) => ({ ...r, time: i ? 3600 : 0 }))));
});

test('Subway Platform is valid in a shared Friend Cup setup and race order', () => {
  let c = C.newFriendCup({ ...setup(), stages: [1, 5, 3, 4] });
  assert.ok(c);
  assert.deepEqual(C.cleanSetup(c).stages, [1, 5, 3, 4]);
  c = C.addRace(c, rows(c));
  assert.equal(C.currentStage(c), 5);
});
