// Friend Cup in a room: host setup, host-run bots, results that heal, players and hosts leaving. Simulated connection only. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers, PROTO } = require('./harness.js');

const DT = 1 / 30, STAGES = [1, 3, 4, 5], POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);

// A pretend Realtime room. It logs every message, and H.drop(event, data, targetIndex) can lose one for one phone.
function hub() {
  const members = [], H = { log: [], drop: null };
  let made = 0;
  H.factory = () => {
    const me = { handlers: [], joined: false, idx: made++ };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => {
        if (!me.joined) return;
        const text = JSON.stringify(d), copy = JSON.parse(text);
        H.log.push({ ev, data: copy, bytes: text.length, from: me.idx });
        for (const o of members) if (o !== me && !(H.drop && H.drop(ev, copy, o.idx))) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text))));
      },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
    };
    return me.api;
  };
  return H;
}
const me = g => g.lobbyPlayers().find(p => p.me).id;

// n phones in a room, nobody ready yet. opts: { load: options for load(), names: saved names, beforeJoin(game, i) }
async function room(n, opts = {}) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) {
    const g = load(undefined, opts.load); g.useRoomFactory(H.factory);
    if (opts.names) g.storage.excuseme_online_name = J(opts.names[i]);
    if (opts.beforeJoin) opts.beforeJoin(g, i);
    games.push(g);
  }
  const code = await games[0].hostRoom(0);
  for (let i = 1; i < n; i++) { assert.strictEqual(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  return { H, games, host: games[0], guests: games.slice(1), code, ids: games.map(me) };
}
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
// A room whose host has set up a Cup and started race 1.
async function cup(n, opts = {}) {
  const L = await room(n, opts);
  L.stages = opts.stages || STAGES; L.difficulty = opts.difficulty ?? 1;
  assert.strictEqual(L.host.setRoomCup({ stages: L.stages, difficulty: L.difficulty }), true);
  await settle();
  await readyPlayers(L.games);
  L.host.hostStart(); await settle(); await settle();
  quiet(L.games);
  return L;
}
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
// Phones cross the line in the given order, a few frames apart.
async function finishOrder(games, order) {
  for (const i of order) { if (games[i].state === 'play') { games[i].S.pz = games[i].LV.goal + 1; } tickAll(games, 3); await settle(); }
  await settle();
}
const next = async L => { L.host.requestRematch(); await settle(); await settle(); quiet(L.games); };
const table = g => g.friendCupStandings().map(r => [r.id, r.points]);
const botsOf = g => g.S.race.bots.filter(b => b.aiBot);
const human = g => g.S.race.bots.filter(b => !b.aiBot);
const cupMessages = H => H.log.filter(m => m.ev === 'cup');

/* ---- setup ---- */
test('the host sets up a Cup and guests see what was chosen; stages show their name, not the city', async () => {
  const { host, guests, games, ids } = await room(3);
  host.setRoomCup({ stages: STAGES, difficulty: 2 }); await settle();
  assert.deepStrictEqual(JSON.parse(J(host.roomCup())), { stages: STAGES, difficulty: 2, bots: 'fill', botCount: 5, valid: true });
  for (const g of guests) assert.deepStrictEqual(JSON.parse(J(g.roomCup())), { stages: STAGES, difficulty: 2, bots: 'fill', botCount: 5, valid: true });
  for (const g of games) assert.strictEqual(g.roomLevel(), STAGES[0], 'the room is on the first stage');
  await readyPlayers(games);
  host.hostStart(); await settle(); await settle();
  for (const g of games) {
    assert.strictEqual(g.state, 'play');
    assert.strictEqual(g.S.run.category, 'friendcup');
    assert.strictEqual(g.LV.id, g.LEVELS[STAGES[0]].id);
    assert.strictEqual(g.S.seed, g.friendCup().seed + ':race1');
    assert.strictEqual(g.friendCup().racers.length, 8);
    assert.strictEqual(g.S.race.bots.length, 7, 'seven other racers on every phone');
  }
  assert.deepStrictEqual(Array.from(host.friendCup().racers.slice(0, 3).map(r => r.id)), ids);
});

test('guests are told which stages and bots the host picked; the host is told what is missing', async () => {
  const { host, guests, games } = await room(2);
  host.setRoomCup({ stages: [0, 1], difficulty: 2 }); await settle();
  assert.match(host.lobbyStatus(), /choose a location preset/);
  assert.match(guests[0].lobbyStatus(), /host is choosing/);
  host.setRoomCup({ stages: STAGES, difficulty: 2 }); await settle();
  await readyPlayers(games);
  assert.match(guests[0].lobbyStatus(), /Friend Cup: New York \(4 races\): Fifth Avenue, Central Park, Brooklyn Bridge, Subway Platform · Hard bots/);
  assert.match(host.lobbyStatus(), /Friend Cup · Hard bots/);
});

test('the room status names the stage rather than the city', async () => {
  const { host, games } = await room(2);
  host.setRoomLevel(3); await settle();
  await readyPlayers(games);
  assert.match(host.lobbyStatus(), /Central Park/);
  assert.doesNotMatch(host.lobbyStatus(), /New York/);
});

test('a Cup cannot start with one real player, or without 4 different stages', async () => {
  const solo = await room(1);
  solo.host.setRoomCup({ stages: STAGES, difficulty: 1 });
  solo.host.setRoomReady(true); solo.host.hostStart(); await settle();
  assert.strictEqual(solo.host.friendCup(), null);
  assert.notStrictEqual(solo.host.state, 'play');

  const L = await room(2);
  for (const stages of [[0, 1, 2], [0, 0, 1, 2], [0, 1, 2, 9]]) {
    L.host.setRoomCup({ stages, difficulty: 1 }); await settle();
    assert.strictEqual(L.host.roomCup().valid, false);
    await readyPlayers(L.games);
    assert.strictEqual(L.host.canStartRoom(), false);
    L.host.hostStart(); await settle();
    assert.strictEqual(L.host.friendCup(), null, 'nothing started: ' + stages);
    assert.notStrictEqual(L.host.state, 'play');
    for (const g of L.games) g.setRoomReady(false);
    await settle();
  }
});

test('changing the Cup after everyone is ready asks everyone to ready again', async () => {
  const { host, games } = await room(2);
  host.setRoomCup({ stages: STAGES, difficulty: 1 }); await settle();
  await readyPlayers(games);
  assert.strictEqual(host.canStartRoom(), true);
  host.setRoomCup({ stages: STAGES, difficulty: 2 }); await settle();
  assert.strictEqual(host.canStartRoom(), false, 'a guest agreed to Medium, not Hard');
  await readyPlayers(games);
  assert.strictEqual(host.canStartRoom(), true);
});

test('normal friend races are untouched: standard run, no Cup or bot messages, no Cup fields on the roster', async () => {
  const { H, host, games } = await room(2);
  await readyPlayers(games);
  host.hostStart(); await settle(); quiet(games);
  tickAll(games, 30); await settle();
  for (const g of games) { assert.strictEqual(g.S.run.category, 'standard'); assert.strictEqual(g.S.duel.cup, null); }
  assert.ok(!H.log.some(m => m.ev === 'cup' || m.ev === 'bots'));
  assert.ok(H.log.filter(m => m.ev === 'roster').every(m => !('cupCfg' in m.data)));
});

/* ---- whole Cups ---- */
for (const n of [2, 3, 8]) {
  test('a full 4-race Cup with ' + n + ' phones', async () => {
    const L = await cup(n), { games, host, guests, ids } = L;
    const seed = host.friendCup().seed;
    const expected = Object.fromEntries(ids.map(id => [id, 0]));
    for (let k = 0; k < 4; k++) {
      for (const g of games) {
        assert.strictEqual(g.state, 'play', 'race ' + (k + 1));
        assert.strictEqual(g.S.seed, seed + ':race' + (k + 1));
        assert.strictEqual(g.LV.id, g.LEVELS[STAGES[k]].id, 'the stage the host chose');
        assert.strictEqual(g.S.run.category, 'friendcup');
        assert.strictEqual(g.S.race.bots.length, 7);
        assert.strictEqual(botsOf(g).length, 8 - n, 'bots fill the room to 8');
        assert.strictEqual(g.friendCup().rounds.length, k);
      }
      tickAll(games, 6); await settle();
      const order = games.map((_, i) => (i + k) % n);   // a different winner each race
      await finishOrder(games, order);
      order.forEach((i, place) => { expected[ids[i]] += POINTS[place]; });
      for (const g of games) {
        assert.strictEqual(g.friendCup().rounds.length, k + 1, 'results reached everyone');
        assert.strictEqual(J(table(g)), J(table(host)), 'every phone shows the same table');
        for (const [id, pts] of table(g)) if (id in expected) assert.strictEqual(pts, expected[id], 'points for ' + id);
      }
      for (const g of guests) { g.requestRematch(); await settle(); assert.notStrictEqual(g.state, 'play', 'a guest cannot start the next race'); }
      if (k < 3) {
        assert.strictEqual(host.rematchState(), 'idle');
        await next(L);
      }
    }
    for (const g of games) { assert.strictEqual(g.friendCupOver(), true); assert.strictEqual(g.rematchState(), 'gone', 'no rematch after race 4'); }
    host.requestRematch(); await settle();
    for (const g of games) assert.notStrictEqual(g.state, 'play', 'and nothing starts a fifth race');
  });
}

test('the host can start the next race only after the results are in', async () => {
  const L = await cup(2), { games, host } = L;
  await finishOrder(games, [0]);
  assert.strictEqual(host.friendCup().rounds.length, 0, 'the guest is still racing');
  assert.strictEqual(host.rematchState(), 'waiting');
  host.requestRematch(); await settle();
  assert.strictEqual(games[1].S.seed, host.friendCup().seed + ':race1');
  await finishOrder(games, [1]);
  assert.strictEqual(host.friendCup().rounds.length, 1);
  assert.strictEqual(host.rematchState(), 'idle');
});

test('between races the end screen shows the Cup and the right button on each phone', async () => {
  const L = await cup(2, { load: { dom: true } }), { games } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [1, 0]);
  tickAll(games, 40); await settle();
  const [h, g] = games, stage = h.LEVELS[STAGES[1]].name;
  assert.strictEqual(h.element('again').textContent, 'Start race 2 · ' + stage);
  assert.strictEqual(h.element('again').disabled, false);
  assert.strictEqual(g.element('again').textContent, 'Waiting for host');
  assert.strictEqual(g.element('again').disabled, true);
  assert.match(g.element('endEyebrow').textContent, /Friend Cup/);
  assert.strictEqual(g.element('sBest').textContent, '10', 'the winner has 10 points');
  assert.strictEqual(h.element('next').hidden, true);
  assert.strictEqual(g.element('end').hidden, false);
});

test('final standings offer a new Cup, not a rematch', async () => {
  const L = await cup(2, { load: { dom: true } }), { games } = L;
  for (let k = 0; k < 4; k++) { tickAll(games, 6); await settle(); await finishOrder(games, [0, 1]); if (k < 3) await next(L); }
  tickAll(games, 40); await settle();
  for (const g of games) {
    assert.doesNotMatch(g.element('again').textContent, /Rematch/);
    assert.match(g.element('again').textContent, /new Cup/);
    assert.match(g.element('endEyebrow').textContent, /final/i);
    const model=g.friendCup(),before=J(model),mine=me(g);
    const total=model.rounds.reduce((sum,round)=>sum+POINTS[round.find(r=>r.id===mine).place-1],0);
    assert.strictEqual(g.element('sBest').textContent,String(total));
    assert.strictEqual(g.element('sChain').textContent,'+'+POINTS[model.rounds[3].find(r=>r.id===mine).place-1]+' points');
    tickAll([g],40);assert.strictEqual(J(g.friendCup()),before);
  }
  assert.match(games[0].element('endTitle').textContent, /Cup winner/);
});

/* ---- bots ---- */
test('bots run on the host and appear on guests through one combined message', async () => {
  const L = await cup(3), { H, games, host, guests } = L;
  const hostBots = botsOf(host);
  assert.strictEqual(hostBots.length, 5);
  assert.ok(hostBots.every(b => !b.remote), 'the host really runs them');
  for (const g of guests) {
    assert.strictEqual(botsOf(g).length, 5);
    assert.ok(botsOf(g).every(b => b.remote), 'guests only draw them');
    assert.deepStrictEqual(Array.from(botsOf(g).map(b => b.name)).sort(), Array.from(hostBots.map(b => b.name)).sort());
  }
  // each phone agrees on who stands where, bots included
  for (const b of hostBots) for (const g of guests) {
    const o = botsOf(g).find(x => x.peerId === b.peerId);
    assert.ok(Math.hypot(o.x - b.x, o.z - b.z) < 0.05, 'same start spot');
    assert.strictEqual(o.hairStyle, b.hairStyle, 'same look'); assert.strictEqual(o.shirtType, b.shirtType, 'same look'); assert.strictEqual(o.build, b.build, 'same look');
  }
  const z0 = botsOf(guests[0]).map(b => b.z);
  for (let i = 0; i < 12; i++) { tickAll(games, 5); await settle(); }
  for (const b of botsOf(guests[0])) {
    assert.ok(b.z > z0[0] + 1, 'moving on a guest phone: ' + b.z);
    const real = hostBots.find(x => x.peerId === b.peerId);
    assert.ok(Math.abs(real.z - b.z) < 2.5, 'close to where the host has it: ' + real.z + ' vs ' + b.z);
  }
  assert.ok(H.log.filter(m => m.ev === 'bots').every(m => m.from === 0), 'only the host sends bots');
  const pos = H.log.filter(m => m.ev === 'pos' && m.from === 0).length, bots = H.log.filter(m => m.ev === 'bots').length;
  assert.ok(Math.abs(pos - bots) <= 1, 'one combined message per position report: ' + pos + ' / ' + bots);
});

test('bots use the Cup difficulty, and the saved setting neither applies nor changes', async () => {
  const L = await cup(2, { difficulty: 0, beforeJoin: g => { g.storage.excuseme_botlvl = '2'; } });
  for (const g of L.games) {
    assert.strictEqual(g.S.race.diff.name, 'Easy');
    assert.strictEqual(g.storage.excuseme_botlvl, '2', 'the saved setting is left alone');
  }
  assert.ok(botsOf(L.host).every(b => b.diff.name === 'Easy'));
});

test('bots keep running and reporting after the host has finished, and a finished bot shows on guests', async () => {
  const L = await cup(2), { games, host } = L, guest = games[1];
  tickAll(games, 6); await settle();
  await finishOrder(games, [0]);
  assert.strictEqual(host.state, 'won');
  const z0 = botsOf(host)[0].z;
  for (let i = 0; i < 6; i++) { tickAll(games, 5); await settle(); }
  assert.ok(botsOf(host)[0].z > z0 + 0.5, 'the host stays in charge of the bots');
  const lead = botsOf(host)[0];
  lead.z = host.LV.goal + 0.5;
  for (let i = 0; i < 4; i++) { tickAll(games, 5); await settle(); }
  assert.strictEqual(lead.done, true);
  assert.ok(guest.S.duel.peers[lead.peerId].fin > 0, 'the guest learned its finish time');
  await finishOrder(games, [1]);
  const row = host.friendCup().rounds[0].find(r => r.id === lead.peerId);
  assert.strictEqual(row.place, 2, 'host, then the bot that finished, ahead of the guest who finished later');
  assert.ok(row.time > 0);
});

/* ---- fairness ---- */
test('host-run bots give the host nothing a guest lacks', async () => {
  const L = await cup(2, { difficulty: 2 }), { games, host } = L, guest = games[1];
  for (const g of games) assert.strictEqual(g.S.race.pickups.length, 0, 'no pickups: they are not shared between phones');

  // bots are not solid to anyone: a guest walks straight through one, like the host does
  const b = botsOf(guest)[0]; guest.S.px = b.x; guest.S.pz = 10; b.z = 10.2; b.speed = 0;
  tickAll([guest], 15);
  assert.ok(guest.S.pz > b.z + 0.5, 'walked past it: ' + guest.S.pz + ' / ' + b.z);

  // a bot treats a guest on its tail the way it treats the host
  const hb = botsOf(host)[0]; hb.z = 40; hb.x = 1;
  host.S.pz = 5;
  const guestRunner = human(host)[0];
  host.duelReceive('pos', { id: L.ids[1], n: 999, x: 0.9, z: 38.5, vx: 0, s: 2 }); guestRunner.x = 0.9; guestRunner.z = 38.5;
  host.tick(DT);
  assert.ok(hb.pressT > 0, 'the guest behind it counts');
  assert.ok(Math.abs(hb.pressX - guestRunner.x) < 0.2, 'and it moves away from the guest, not the host');
  hb.pressT = 0; hb.z = 60; hb.x = 1; host.S.px = 0.9; host.S.pz = 58.5; guestRunner.z = 5;
  host.duelReceive('pos', { id: L.ids[1], n: 1000, x: 0.9, z: 5, vx: 0, s: 2 });
  host.tick(DT);
  assert.ok(hb.pressT > 0, 'the host behind it counts the same');

  // bots do not clear a path through the host's crowd that guests do not get
  const hb2 = botsOf(host)[1]; hb2.z = 80; hb2.x = 0; hb2.speed = 2; hb2.bumpT = 0; hb2.ghostT = 0;
  host.S.pz = 5; host.S.px = 0;
  const p = host.mkPerson(0, 80.3); host.S.people.push(p);
  for (let i = 0; i < 30; i++) { host.tick(DT); if (hb2.bumps) break; }
  assert.strictEqual(p.hit, false, 'a bot does not shove the crowd on the host phone');
  assert.ok(!hb2.calls, 'and does not call people aside');
});

test('a guest beating the host counts the same, and same-named friends stay separate', async () => {
  const L = await cup(2, { names: ['Sam', 'Sam'] }), { games, host, ids } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [1, 0]);
  const rows = host.friendCup().rounds[0];
  assert.strictEqual(rows.find(r => r.id === ids[1]).place, 1);
  assert.strictEqual(rows.find(r => r.id === ids[0]).place, 2);
  const st = games[1].friendCupStandings();
  assert.strictEqual(st.filter(r => r.name === 'Sam').length, 2, 'both Sams listed, and no bot takes the name');
  assert.strictEqual(st.find(r => r.id === ids[1]).points, 10);
  assert.strictEqual(st.find(r => r.id === ids[0]).points, 8);
});

test('nothing is paid or recorded in a Cup', async () => {
  const L = await cup(2), { H, games, host, ids } = L;
  const before = games.map(g => ({ xp: g.xp(), tally: J(g.tallySnapshot()), store: J(g.storage) }));
  host.injectRoomMessage('ghost', { proto: PROTO,  id: ids[1], kind: 'race', level: 0, ghost: 'abc' });
  games[1].injectRoomMessage('ghost', { proto: PROTO,  id: ids[0], kind: 'race', level: 0, ghost: 'abc' });
  for (let k = 0; k < 4; k++) {
    tickAll(games, 6); await settle();
    for (const g of games) { g.track('passes'); g.track('wins'); }   // what a pass or a win would record in an ordinary race
    await finishOrder(games, [0, 1]);
    if (k < 3) await next(L);
  }
  tickAll(games, 40); await settle();
  games.forEach((g, i) => {
    assert.strictEqual(g.xp(), before[i].xp, 'no XP');
    assert.strictEqual(J(g.tallySnapshot()), before[i].tally, 'no tallies');
    assert.strictEqual(J(g.storage), before[i].store, 'nothing saved: no records, ghosts or boards');
  });
  assert.ok(!H.log.some(m => m.ev === 'ghost'), 'no ghosts swapped');
});

/* ---- leaving ---- */
test('a guest leaving mid-race: a bot takes over from where they were, with their name and points', async () => {
  const L = await cup(3), { games, host, guests, ids } = L;
  for (let k = 0; k < 1; k++) { tickAll(games, 6); await settle(); await finishOrder(games, [2, 0, 1]); await next(L); }
  const leaver = games[2], id = ids[2], name = leaver.lobbyPlayers().find(p => p.me).name, points = table(host).find(r => r[0] === id)[1];
  assert.strictEqual(points, 10);
  for (let i = 0; i < 12; i++) { for (const g of games) if (g === leaver) { g.S.pz = 30; } tickAll(games, 2); await settle(); }
  const runner = host.S.race.bots.find(b => b.peerId === id);
  assert.ok(runner.z > 25, 'the host knew where they were: ' + runner.z);
  const z0 = runner.z;
  leaver.leaveRoom(); await settle();
  assert.strictEqual(host.S.race.bots.find(b => b.peerId === id), runner, 'the same runner, not a new one');
  assert.strictEqual(runner.remote, false); assert.strictEqual(runner.aiBot, true);
  assert.ok(Math.abs(runner.z - z0) < 1, 'from their last known position');
  assert.strictEqual(runner.name, name);
  assert.strictEqual(runner.diff.name, 'Medium', 'at the Cup difficulty');
  const other = guests[0], shown = other.S.race.bots.find(b => b.peerId === id);
  assert.ok(shown, 'the other guest still sees them');
  for (let i = 0; i < 12; i++) { tickAll([host, other], 5); await settle(); }
  assert.ok(runner.z > z0 + 1, 'the bot walks on: ' + z0 + ' to ' + runner.z);
  assert.ok(Math.abs(shown.z - runner.z) < 3, 'and the other guest sees it walking: ' + shown.z + ' / ' + runner.z);
  assert.strictEqual(other.friendCup().racers.find(r => r.id === id).left, true);
  assert.strictEqual(table(other).find(r => r[0] === id)[1], 10, 'points kept');
  // the race ends for the humans who are left, and the bot earns points from then on
  await finishOrder([host, other], [0, 1]);
  assert.strictEqual(host.friendCup().rounds.length, 2);
  assert.ok(table(host).find(r => r[0] === id)[1] > 10, 'keeps earning');
  assert.strictEqual(J(table(other)), J(table(host)));
});

test('a guest leaving between races: a bot runs for them from the next race, and nobody can rejoin', async () => {
  const L = await cup(3), { H, games, host, guests, ids, code } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [2, 0, 1]);
  const id = ids[2];
  games[2].leaveRoom(); await settle();
  assert.strictEqual(table(host).find(r => r[0] === id)[1], 10);
  assert.strictEqual(host.rematchState(), 'idle');
  L.games = [host, guests[0]];
  await next(L);
  const bot = host.S.race.bots.find(b => b.peerId === id);
  assert.ok(bot && bot.aiBot && !bot.remote, 'a bot runs for them');
  assert.strictEqual(botsOf(host).length, 6);
  assert.ok(guests[0].S.race.bots.find(b => b.peerId === id).aiBot);
  // the old identity is ignored, and a fresh join is refused
  const size = host.lobbyPlayers().length;
  host.injectRoomMessage('hello', { proto: PROTO,  id, proto: host.PROTO, name: 'Back' }); await settle();
  assert.strictEqual(host.lobbyPlayers().length, size);
  const again = load(); again.useRoomFactory(H.factory);
  assert.strictEqual(await again.joinRoom(code), false);
  assert.match(again.lobbyStatus(), /already started/);
});

test('the last guest leaving: the host plays on against bots, and can still start the next race', async () => {
  const L = await cup(2), { games, host, ids } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [0, 1]);
  games[1].leaveRoom(); await settle();
  await next({ host, games: [host] });
  assert.strictEqual(host.state, 'play', 'race 2 starts with just the host');
  assert.strictEqual(botsOf(host).length, 7);
  assert.ok(host.S.race.bots.find(b => b.peerId === ids[1]).aiBot);
  quiet([host]);
  await finishOrder([host], [0]);
  assert.strictEqual(host.friendCup().rounds.length, 2);
});

test('a guest who goes silent is treated as leaving', async () => {
  const L = await cup(3, { load: { clock: true } }), { games, host, ids } = L;
  tickAll(games, 6); await settle();
  for (let i = 0; i < 16; i++) { host.advance(2000); games[1].advance(2000); await settle(); }
  const runner = host.S.race.bots.find(b => b.peerId === ids[2]);
  assert.ok(runner, 'still on the road');
  assert.strictEqual(runner.aiBot, true); assert.strictEqual(runner.remote, false);
  assert.strictEqual(host.friendCup().racers.find(r => r.id === ids[2]).left, true);
  assert.strictEqual(games[1].friendCup().racers.find(r => r.id === ids[2]).left, true);
});

// Round 2 batch 06: the host leaving no longer ends the Cup. The next player in roster order hosts (more in host-handover.test.js).
test('the host leaving mid-race: the next player hosts, the bots carry on, and the race counts', async () => {
  const L = await cup(3, { load: { dom: true } }), { games, host, guests, ids } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [1, 0, 2]);
  await next(L);
  tickAll(games, 6); await settle();
  host.leaveRoom(); await settle();
  for (const g of guests) {
    assert.strictEqual(g.state, 'play', 'everyone finishes the current race');
    assert.strictEqual(g.friendCupOver(), false);
    assert.strictEqual(g.friendCup().ended, false);
    assert.strictEqual(g.friendCup().racers.find(r => r.id === ids[0]).left, true);
  }
  tickAll(guests, 10); await settle();
  for (const g of guests) assert.strictEqual(botsOf(g).length, 6, 'the bots, and a bot for the old host, keep running');
  await finishOrder(guests, [0, 1]);
  tickAll(guests, 40); await settle();
  const [h, g] = guests;
  for (const x of guests) {
    assert.notStrictEqual(x.element('endTitle').textContent, 'Host left');
    assert.strictEqual(x.friendCup().rounds.length, 2, 'the race counts');
  }
  assert.strictEqual(J(table(g)), J(table(h)));
  assert.match(h.element('again').textContent, /Start race 3/);
  assert.strictEqual(g.element('again').textContent, 'Waiting for host');
});

test('the host leaving between races: the last guest hosts and plays on against bots', async () => {
  const L = await cup(2, { load: { dom: true } }), { games, host } = L, guest = games[1];
  tickAll(games, 6); await settle();
  await finishOrder(games, [0, 1]);
  tickAll(games, 40); await settle();
  host.leaveRoom(); await settle();
  assert.strictEqual(guest.friendCup().ended, false);
  assert.strictEqual(guest.friendCup().rounds.length, 1);
  assert.notStrictEqual(guest.element('endTitle').textContent, 'Host left');
  assert.match(guest.element('again').textContent, /Start race 2/);
});

test('the host going silent hands the Cup over the same way', async () => {
  const L = await cup(2, { load: { clock: true } }), { games } = L, guest = games[1];
  tickAll(games, 6); await settle();
  L.H.drop = () => true;   // everything from now on is lost
  for (let i = 0; i < 17; i++) { guest.advance(2000); await settle(); }
  assert.strictEqual(guest.friendCup().ended, false);
  assert.strictEqual(guest.lobbyPlayers().find(p => p.me).host, true);
  assert.strictEqual(guest.state, 'play');
});

/* ---- results that heal ---- */
test('a lost result heals by itself on the next report', async () => {
  const L = await cup(3, { load: { clock: true } }), { H, games, host, guests } = L;
  tickAll(games, 6); await settle();
  H.drop = (ev, d, to) => ev === 'cup' && to === 2;   // the third phone misses every result
  await finishOrder(games, [0, 1, 2]);
  assert.strictEqual(guests[0].friendCup().rounds.length, 1);
  assert.strictEqual(guests[1].friendCup().rounds.length, 0, 'it really did miss it');
  H.drop = null;
  host.advance(2000); await settle();
  assert.strictEqual(guests[1].friendCup().rounds.length, 1, 'healed');
  assert.strictEqual(J(table(guests[1])), J(table(host)));
});

test('a phone that missed the results will not start the next race on old information; the next try works', async () => {
  const L = await cup(2), { H, games, host } = L, guest = games[1];
  tickAll(games, 6); await settle();
  H.drop = (ev, d, to) => ev === 'cup' && to === 1;
  await finishOrder(games, [0, 1]);
  assert.strictEqual(guest.friendCup().rounds.length, 0);
  const seed = guest.S.seed;
  host.requestRematch(); await settle(); await settle();
  assert.strictEqual(guest.S.seed, seed, 'the guest does not jump ahead');
  assert.notStrictEqual(host.S.seed, host.friendCup().seed + ':race2', 'and the host does not run off alone');
  H.drop = null;
  const m = cupMessages(H).at(-1);
  guest.injectRoomMessage('cup', m.data); await settle();
  assert.strictEqual(guest.friendCup().rounds.length, 1);
});

test('repeated and late results change nothing', async () => {
  const L = await cup(2), { H, games, host } = L, guest = games[1];
  tickAll(games, 6); await settle();
  const early = cupMessages(H).at(-1).data;
  await finishOrder(games, [0, 1]);
  const after = cupMessages(H).at(-1).data, state = J(guest.friendCup());
  assert.strictEqual(after.rounds.length, 1);
  guest.injectRoomMessage('cup', after); await settle();            // a repeat
  assert.strictEqual(J(guest.friendCup()), state);
  guest.injectRoomMessage('cup', early); await settle();            // a late, older copy
  assert.strictEqual(J(guest.friendCup()), state);
  guest.injectRoomMessage('cup', { proto: PROTO,  ...early, rev: after.rev + 50 }); await settle();   // older results with a newer number
  assert.strictEqual(J(guest.friendCup()), state, 'results never go backwards');
  await next(L);
  tickAll(games, 6); await settle();
  await finishOrder(games, [1, 0]);
  guest.injectRoomMessage('cup', after); await settle();
  assert.strictEqual(guest.friendCup().rounds.length, 2);
  assert.strictEqual(J(table(guest)), J(table(host)));
});

/* ---- bad input ---- */
test('mismatched versions: the update message, and Cup messages from another version are ignored', async () => {
  const L = await room(2), { host, guests, H } = L;
  assert.strictEqual(host.PROTO, PROTO);
  const newer = load(); newer.useRoomFactory(H.factory);
  const before = host.lobbyPlayers().length;
  host.injectRoomMessage('hello', { proto: PROTO,  id: 'oldphone', proto: host.PROTO - 1, name: 'Old' }); await settle();
  assert.strictEqual(host.lobbyPlayers().length, before);
  const full = H.log.filter(m => m.ev === 'full').at(-1);
  assert.strictEqual(full.data.why, 'version');

  host.setRoomCup({ stages: STAGES, difficulty: 1 }); await settle();
  await readyPlayers(L.games);
  host.hostStart(); await settle(); await settle();
  const m = cupMessages(H).at(-1).data, state = J(guests[0].friendCup());
  guests[0].injectRoomMessage('cup', { proto: PROTO,  ...m, rev: m.rev + 5, proto: host.PROTO - 1, rounds: [] }); await settle();
  assert.strictEqual(J(guests[0].friendCup()), state);
});

test('a malformed setup is dropped before a Cup exists, and no race can start from it', async () => {
  const L = await room(2), { host, guests, ids } = L, guest = guests[0];
  host.setRoomCup({ stages: STAGES, difficulty: 1 }); await settle();
  const racers = [{ id: ids[0], name: 'Host', bot: false, left: false }, { id: ids[1], name: 'Guest', bot: false, left: false }];
  ['Mia', 'Leo', 'Ava', 'Zoe', 'Noah', 'Yuki'].forEach((name, i) => racers.push({ id: 'bot:' + i, name, bot: true, left: false }));
  const setup = { seed: 'abcd-efgh', stages: [1, 3, 4, 5], difficulty: 1, racers };
  const send = (over, base = {}) => guest.injectRoomMessage('cup', { proto: PROTO,  id: ids[0], proto: host.PROTO, rev: 1000 + send.n++, left: [], rounds: [], setup, ...base, ...over });
  send.n = 0;
  const bad = [
    { setup: null }, { setup: 7 }, { setup: {} }, { setup: { ...setup, stages: [0, 0, 1, 2] } }, { setup: { ...setup, stages: [0, 1, 2] } }, { setup: { ...setup, stages: [0, 1, 2, 9] } },
    { setup: { ...setup, difficulty: 7 } }, { setup: { ...setup, racers: racers.slice(0, 1) } }, { setup: { ...setup, racers: [...racers.slice(0, 7), { ...racers[7], name: 'Not a bot name' }] } },
    { setup: { ...setup, racers: [racers[1], racers[0], ...racers.slice(2)] } },                        // this phone's host is not first
    { setup: { ...setup, racers: [racers[0], { ...racers[1], id: 'someoneelse' }, ...racers.slice(2)] } }, // this phone is not in it
    { setup: { ...setup, racers: racers.map((r, i) => i === 0 ? { ...r, id: 'BAD ID' } : r) } }, { rounds: 'x' }, { left: 'x' }, { left: ['nobody'] }, { left: [ids[0]] }, { rev: 'x' }, { proto: 1 }
  ];
  for (const b of bad) { send(b); await settle(); assert.strictEqual(guest.friendCup(), null, 'dropped: ' + J(b).slice(0, 80)); }
  send({ id: ids[1] }); await settle();
  assert.strictEqual(guest.friendCup(), null, 'not from the host');
  send({}); await settle();
  assert.ok(guest.friendCup(), 'the good one is accepted');
});

test('malformed results are dropped whole, never partly applied', async () => {
  const L = await cup(2), { H, games, host, ids } = L, guest = games[1];
  tickAll(games, 6); await settle();
  await finishOrder(games, [0, 1]);
  await next(L);
  tickAll(games, 6); await settle();
  await finishOrder(games, [0, 1]);
  const m = cupMessages(H).at(-1).data, state = J(guest.friendCup()), [r1, r2] = m.rounds;
  assert.strictEqual(m.rounds.length, 2);
  let rev = m.rev + 10;
  const bad = [
    { rounds: [r1, r2, [...r2.slice(0, 7)]] }, { rounds: [r1, r2, r2.map(r => ({ ...r, place: 1 }))] }, { rounds: [r1, r2, r2.map((r, i) => i ? r : { ...r, id: 'nobody' })] },
    { rounds: [r1, r2, r2.map((r, i) => i ? r : { ...r, time: -4 })] }, { rounds: [r1, r2, r2.map((r, i) => i ? r : { ...r, time: 'fast' })] }, { rounds: [r1, r2, r2.map((r, i) => i ? r : { ...r, place: 9 })] },
    { rounds: [r1, r2, 'nope'] }, { rounds: [r1, r2, null] }, { rounds: [r1, r2, r1, r2, r1] }, { rounds: { length: 3 } },
    { setup: { ...m.setup, seed: 'different' } }, { setup: { ...m.setup, difficulty: (m.setup.difficulty + 1) % 3 } }
  ];
  for (const b of bad) { guest.injectRoomMessage('cup', { proto: PROTO,  ...m, rev: rev++, ...b }); await settle(); assert.strictEqual(J(guest.friendCup()), state, 'dropped: ' + J(b).slice(0, 80)); }
  guest.injectRoomMessage('cup', { proto: PROTO,  ...m, rev: rev++, id: ids[1] }); guest.injectRoomMessage('cup', { proto: PROTO,  ...m, rev: rev++, id: 'zzzzzzzz' }); await settle();
  assert.strictEqual(J(guest.friendCup()), state, 'nobody but the host');
  host.injectRoomMessage('cup', { proto: PROTO,  ...m, rev: rev++, rounds: [], id: ids[1] }); await settle();
  assert.strictEqual(host.friendCup().rounds.length, 2, 'the host never takes results from anyone');
});

test('malformed bot messages are dropped whole', async () => {
  const L = await cup(3), { games, ids } = L, guest = games[1];
  tickAll([guest], 6);
  const seed = guest.S.seed, peer = id => guest.S.duel.peers[id];
  const good = ['bot:0', 1, 5, 0, 2, null], msg = o => ({ proto: PROTO, id: ids[0], race: seed, n: 5, rows: [good], ...o });
  const bad = [
    { rows: 'x' }, { rows: [good, 'x'] }, { rows: [good, ['bot:1', 1, 5, 0, 2]] }, { rows: [good, ['bot:1', 'a', 5, 0, 2, null]] }, { rows: [good, ['bot:1', 1e6, 5, 0, 2, null]] }, { rows: [good, ['bot:1', NaN, 5, 0, 2, null]] },
    { rows: [good, ['bot:1', 1, 5, 0, 99, null]] }, { rows: [good, ['nobody', 1, 5, 0, 2, null]] }, { rows: [good, ['__proto__', 1, 5, 0, 2, null]] }, { rows: [good, [ids[1], 1, 5, 0, 2, null]] }, { rows: [good, ['bot:1', 1, 5, 0, 2, -3]] },
    { rows: Array.from({ length: 8 }, () => good) }, { n: 'x' }, { n: -1 }, { race: 'other:race1' }, { id: ids[2] }
  ];
  for (const b of bad) {
    guest.injectRoomMessage('bots', msg(b)); await settle();
    assert.strictEqual(peer('bot:0').remote.lastSeen(), 0, 'nothing applied: ' + J(b).slice(0, 80));
    assert.strictEqual(peer('bot:0').fin, null);
  }
  assert.strictEqual(({}).fin, undefined, 'nothing leaked onto Object');
  guest.injectRoomMessage('bots', msg({})); await settle();
  assert.ok(peer('bot:0').remote.lastSeen() > 0, 'the good one is');
  // a friend still racing is not steered by the bot message
  const friend = guest.S.race.bots.find(b => b.peerId === ids[2]);
  guest.injectRoomMessage('bots', msg({ n: 6, rows: [[ids[2], 1, 60, 0, 2, 3]] })); await settle();
  assert.strictEqual(peer(ids[2]).remote.lastSeen(), 0, 'real players report for themselves');
  assert.strictEqual(peer(ids[2]).fin, null);
  assert.ok(friend.z < 1);
});

test('a guest cannot fake a bot by sending under its id', async () => {
  const L = await cup(2), { games, host, ids } = L;
  tickAll(games, 3);
  const b = botsOf(host)[0], z = b.z;
  host.injectRoomMessage('pos', { proto: PROTO,  id: 'bot:0', n: 99, x: 0, z: 100, vx: 0, s: 1, race: host.S.seed });
  host.injectRoomMessage('fin', { proto: PROTO,  id: 'bot:0', ft: 1, race: host.S.seed });
  host.injectRoomMessage('bots', { proto: PROTO,  id: ids[1], race: host.S.seed, n: 9, rows: [['bot:0', 0, 100, 0, 1, 1]] });
  await settle();
  tickAll([host], 1);
  assert.ok(b.z < z + 1); assert.strictEqual(b.done, false);
});

/* ---- measure ---- */
test('measure: a host with 7 bots stays within the message budget', async () => {
  // A Cup needs 2 real players, so 7 host-run bots means the guest has left and a bot runs for them too.
  const L = await cup(2, { load: { clock: true } }), { H, host } = L, games = [host];
  tickAll(L.games, 6); await settle();
  L.games[1].leaveRoom(); await settle();
  assert.strictEqual(botsOf(host).length, 7);
  H.log.length = 0;
  const SECONDS = 20;
  for (let s = 0; s < SECONDS; s++) {
    for (let f = 0; f < 30; f++) { tickAll(games, 1); if (f % 5 === 4) await settle(); }
    if (s % 2 === 1) { host.advance(2000); await settle(); }
  }
  const mine = H.log.filter(m => m.from === 0), bots = mine.filter(m => m.ev === 'bots'), pos = mine.filter(m => m.ev === 'pos');
  const counts = {}; for (const m of mine) counts[m.ev] = (counts[m.ev] || 0) + 1;
  const largest = Math.max(...bots.map(m => m.bytes)), cups = mine.filter(m => m.ev === 'cup');
  console.log('# measure (simulated connection, host alone after the guest left, 7 host-run bots): host sends ' + (mine.length / SECONDS).toFixed(1) + ' msg/s, ' + (bots.length / SECONDS).toFixed(1) + ' bots/s, ' + (pos.length / SECONDS).toFixed(1) + ' pos/s; combined bot message ' + largest + ' bytes; cup message ' + Math.max(...cups.map(m => m.bytes)) + ' bytes; ' + J(counts));
  assert.ok(bots.length / SECONDS >= 4 && bots.length / SECONDS <= 6, 'about 5 combined messages a second: ' + bots.length / SECONDS);
  assert.ok(Math.abs(bots.length - pos.length) <= 1, 'the same rate as pos');
  assert.ok(largest < 8192, 'under 8 KB: ' + largest);
  assert.ok(bots.every(m => m.data.rows.length === 7), 'all seven in each message: ' + J([...new Set(bots.map(m => m.data.rows.length))]));
});

test('measure: the largest Cup results message stays under 8 KB', async () => {
  const names = Array.from({ length: 8 }, (_, i) => 'Breezy Commuter Long ' + i);
  const L = await cup(8, { names }), { H, games } = L;
  for (let k = 0; k < 4; k++) { tickAll(games, 3); await settle(); await finishOrder(games, games.map((_, i) => i)); if (k < 3) await next(L); }
  const largest = Math.max(...cupMessages(H).map(m => m.bytes));
  console.log('# measure (simulated connection, 8 phones, long names): final results message ' + largest + ' bytes');
  assert.ok(largest < 8192, 'under 8 KB: ' + largest);
});

for (const departure of ['leave', 'timeout']) {
  test('a Cup pauser who departs by ' + departure + ' releases the remaining racers', async () => {
    const L = await cup(3, { load: { clock: true } }), { host, games, ids } = L;
    tickAll(games, 6); await settle();
    games[2].pauseGame(); await settle();
    assert.strictEqual(host.state, 'paused');
    assert.strictEqual(games[1].state, 'paused');
    if (departure === 'leave') { games[2].leaveRoom(); await settle(); }
    else for (let i = 0; i < 16; i++) { host.advance(2000); games[1].advance(2000); await settle(); }
    for (const g of [host, games[1]]) {
      assert.strictEqual(g.S.duel.pausers.has(ids[2]), false, 'departed vote removed');
      assert.strictEqual(g.state, 'play', 'the Cup resumes');
      assert.strictEqual(g.friendCup().racers.find(r => r.id === ids[2]).left, true);
    }
  });
}

test('a finished Cup racer pruned by heartbeat is left on every phone and a bot next race', async () => {
  const L = await cup(3, { load: { clock: true } }), { host, games, ids } = L;
  tickAll(games, 6); await settle();
  await finishOrder(games, [2, 0, 1]);
  assert.strictEqual(host.friendCup().rounds.length, 1);
  for (let i = 0; i < 16; i++) { host.advance(2000); games[1].advance(2000); await settle(); }
  assert.ok(!host.lobbyPlayers().some(p => p.id === ids[2]), 'heartbeat pruned the silent racer');
  for (const g of [host, games[1]]) {
    const racer = g.friendCup().racers.find(r => r.id === ids[2]);
    assert.strictEqual(racer.left, true, 'finished departure reaches everyone');
    assert.strictEqual(racer.bot, true);
  }
  await next({ host, games: [host, games[1]] });
  const runner = host.S.race.bots.find(b => b.peerId === ids[2]);
  assert.ok(runner.aiBot && !runner.remote, 'host runs the takeover immediately');
  assert.ok(games[1].S.race.bots.find(b => b.peerId === ids[2]).aiBot);
});

test('Friend Cup shows a round award separately from total after human finishers',async()=>{
 const L=await cup(2,{load:{dom:true}});await finishOrder(L.games,[0,1]);
 tickAll(L.games,300);await settle();
 for(const g of L.games){const total=g.friendCupStandings().find(r=>r.id===me(g)).points;
 assert.equal(g.element('sChain').textContent,'+'+total+' points');}
});

test('Friend Cup Pending, authoritative redraw and fresh duel replacement never reaward',async()=>{
 const L=await cup(2,{load:{dom:true,presentation:true}});const [h,g]=L.games; let animations=0;
 g.element('sChain').animate=()=>{animations++;};
 await finishOrder(L.games,[1]);tickAll(L.games,40);await settle();
 assert.equal(g.element('sChain').textContent,'Pending');assert.equal(g.element('sBest').textContent,'0');assert.equal(animations,0);
 await finishOrder(L.games,[0]);tickAll(L.games,40);await settle();
 assert.equal(g.element('sChain').textContent,'+10 points');assert.equal(animations,1);
 const before=J(g.friendCup());g.refreshDuelResults();assert.equal(animations,1);
 const message=JSON.parse(J(cupMessages(L.H).at(-1).data));message.rev+=1;
 g.injectRoomMessage('cup',message);await settle();assert.equal(J(g.friendCup()),before);assert.equal(animations,1);
 g.S.duel={...g.S.duel,cup:{...g.S.duel.cup,model:JSON.parse(before)}};g.refreshDuelResults();
 assert.equal(animations,1,'fresh equivalent duel must not repeat visual award');
 assert.equal(J(g.friendCup()),before);assert.equal(g.element('sChain').textContent,'+10 points');
 await next(L);await finishOrder(L.games,[1,0]);tickAll(L.games,40);await settle();
 assert.equal(animations,2);assert.equal(g.element('sChain').textContent,'+10 points');assert.equal(g.element('sBest').textContent,'20');
});
for(const mode of ['calm','reduced']) test('Friend Cup '+mode+' preserves award, totals and immediate controls',async()=>{
 const L=await cup(2,{load:{dom:true,presentation:true}});let animations=0;
 for(const g of L.games){g.element('sChain').animate=()=>{animations++;};if(mode==='calm')g.setCalm(true);else g.reduceMotion(true);}
 await finishOrder(L.games,[0,1]);tickAll(L.games,40);await settle();
 assert.equal(animations,0);for(const g of L.games)assert.match(g.element('sChain').textContent,/^\+[1-9][0-9]* points$/);
 assert.equal(L.host.element('again').disabled,false);await next(L);assert.equal(L.host.state,'play');
});

test('DNF retains its placed award; incomplete results show Pending and zero total',async()=>{
 const L=await cup(2,{load:{dom:true,presentation:true}});const [h,g]=L.games;
 // This is the existing production forfeit action, exported only by the test harness.
 g.forfeitDuel();g.S.duel.send('dnf',{});tickAll(L.games,40);await settle();
 assert.equal(g.element('sScore').textContent,'DNF');assert.equal(g.element('sChain').textContent,'Pending');
 assert.equal(g.element('sBest').textContent,'0');await finishOrder(L.games,[0]);tickAll(L.games,40);await settle();
 const m=g.friendCup(),mine=m.rounds[0].find(r=>r.id===me(g));
 assert.equal(mine.time,null);assert.equal(g.element('sChain').textContent,'+'+POINTS[mine.place-1]+' points');
 const before=J(m);g.refreshDuelResults();assert.equal(J(g.friendCup()),before);
});

test('custom bot config is shared, clamped on joining and stays explicit on leaving', async()=>{
 const L=await room(2); const {host,H,code}=L;
 host.setRoomCup({stages:STAGES,difficulty:1,bots:6});await settle();
 assert.equal(L.guests[0].roomCup().botCount,6);
 const joiner=load();joiner.useRoomFactory(H.factory);await joiner.joinRoom(code);await settle();
 assert.equal(host.roomCup().bots,5);assert.equal(joiner.roomCup().botCount,5);
 joiner.leaveRoom();await settle();assert.equal(host.roomCup().botCount,5);
 host.setRoomCup({stages:STAGES,difficulty:1});await settle();assert.equal(host.roomCup().botCount,6);
 for(const bots of [-1,7,1.5,'bad',null]) {assert.equal(host.setRoomCup({stages:STAGES,difficulty:1,bots}),false);}
});
for(const bots of [0,3]) test('four simulated races with '+bots+' bots',async()=>{
 const L=await room(2);L.host.setRoomCup({stages:STAGES,difficulty:1,bots});await settle();
 await readyPlayers(L.games);L.host.hostStart();await settle();await settle();quiet(L.games);
 for(let k=0;k<4;k++){ await finishOrder(L.games,[0,1]);tickAll(L.games,300);await settle();if(k<3)await next(L); }
 for(const g of L.games){assert.equal(g.friendCup().racers.length,2+bots);assert.equal(g.friendCup().rounds.length,4);}
 assert.equal(J(table(L.host)),J(table(L.guests[0])));
});
for(const bots of [0,2]) test('guest summary uses middle dot and real count for '+bots+' bots',async()=>{const L=await room(3);L.host.setRoomCup({stages:STAGES,difficulty:1,bots});await settle();const text=L.guests[0].lobbyStatus();assert.ok(text.includes(' \u00b7 3 players, '+(bots ? '2 bots':'no bots')),text);assert.ok(!text.includes(' ? '));});
for (const change of ['join','leave']) for (const bots of ['fill',2]) test('setup count uses setup players after '+change+' with '+bots+' bots',async()=>{
 const L=await room(change==='join'?2:3);const guest=L.guests[0];
 L.host.setRoomCup({stages:STAGES,difficulty:1,bots});await settle();
 const oldRoster=JSON.parse(JSON.stringify(L.H.log.filter(m=>m.ev==='roster').at(-1).data));
 if(change==='join'){const g=load();g.useRoomFactory(L.H.factory);await g.joinRoom(L.code);await settle();L.games.push(g);}else{L.games.pop().leaveRoom();await settle();}
 await readyPlayers(L.games);L.H.drop=(ev,d,to)=>to===1&&(ev==='cup'||ev==='start'||ev.startsWith('lobby:'));
 L.host.hostStart();await settle();
 const packet=JSON.parse(JSON.stringify(cupMessages(L.H).at(-1).data));
 guest.injectRoomMessage('roster',{...oldRoster,rev:oldRoster.rev+1000});
 guest.injectRoomMessage('cup',packet);await settle();
 assert.ok(guest.friendCup(),'honest setup remains accepted despite stale roster');
 assert.equal(guest.friendCup().racers.length,bots==='fill'?8:L.games.length+bots);
});
test('received invalid bot values stay inert and cannot authorize a setup',async()=>{
 const L=await room(2);L.host.setRoomCup({stages:STAGES,difficulty:1,bots:0});await settle();
 const base=JSON.parse(JSON.stringify(L.H.log.filter(m=>m.ev==='roster').at(-1).data));
 await readyPlayers(L.games);L.H.drop=ev=>ev==='cup'||ev==='start'||ev.startsWith('lobby:');L.host.hostStart();await settle();
 const packet=cupMessages(L.H).at(-1).data;let rev=base.rev+1000;
 for(const bots of [undefined,null,{}, {toString:null},-1,8,1.5,'2']){
  L.guests[0].injectRoomMessage('roster',{...base,rev:rev++,cupCfg:{...base.cupCfg,bots}});
  assert.equal(L.guests[0].roomCup().valid,false);assert.equal(L.guests[0].roomCup().botCount,null);
  assert.match(L.guests[0].lobbyStatus(),/host is choosing/);
  L.guests[0].injectRoomMessage('cup',packet);assert.equal(L.guests[0].friendCup(),null);
 }
 L.guests[0].injectRoomMessage('roster',{...base,rev:rev++});
 L.guests[0].injectRoomMessage('cup',packet);assert.ok(L.guests[0].friendCup());
 L.guests[0].injectRoomMessage('roster',{...base,rev:rev++,cupCfg:{...base.cupCfg,bots:{toString:null}}});
 assert.equal(L.guests[0].friendCup(),null,'invalid config clears a cached pre-start setup');
 L.guests[0].injectRoomMessage('roster',{...base,rev:rev++,cupCfg:null});
 L.guests[0].injectRoomMessage('cup',packet);assert.equal(L.guests[0].friendCup(),null,'no config cannot authorize any setup');
});
for(const change of ['join','leave']) test('honest Cup still starts after a pre-start '+change,async()=>{
 const L=await room(change==='join'?2:3);L.host.setRoomCup({stages:STAGES,difficulty:1,bots:2});await settle();
 if(change==='join'){const g=load();g.useRoomFactory(L.H.factory);await g.joinRoom(L.code);await settle();L.games.push(g);}else{L.games.pop().leaveRoom();await settle();}
 await readyPlayers(L.games);L.host.hostStart();await settle();await settle();
 for(const g of L.games){assert.equal(g.state,'play');assert.equal(g.friendCup().racers.length,L.games.length+2);}
});

for(const stages of [[1,3,4,5],[2,6,7,8]]) for(const bots of [0,6]) test('preset simulated Cup '+stages+' bots '+bots,async()=>{
 const L=await room(2); L.host.setRoomCup({stages,difficulty:1,bots});await settle();await readyPlayers(L.games);L.host.hostStart();await settle();await settle();quiet(L.games);
 for(let k=0;k<stages.length;k++){
 assert.equal(L.host.LV.id,L.host.LEVELS[stages[k]].id);
 await finishOrder(L.games,[0,1]);
 await settle();assert.equal(L.host.friendCup().rounds.length,k+1,'the completed race must be recorded');
 assert.equal(J(table(L.games[1])),J(table(L.host)));
 if(k+1<stages.length)await next(L);
 }
 assert.equal(L.host.friendCupOver(),true);for(const row of L.host.friendCupStandings()) assert.equal(row.points,L.host.friendCup().rounds.reduce((sum,round)=>sum+POINTS[round.find(r=>r.id===row.id).place-1],0));
});
test('preset change clears ready and four-race state heals after missed results',async()=>{
 const L=await room(2);L.host.setRoomCup({stages:STAGES,difficulty:1,bots:0});await settle();await readyPlayers(L.games);
 L.host.setRoomCup({stages:[2,6,7,8],difficulty:1,bots:0});await settle();assert.equal(L.games[1].lobbyPlayers().find(p=>p.me).ready,false);
 await readyPlayers(L.games);L.host.hostStart();await settle();await settle();quiet(L.games);for(let i=0;i<4;i++){if(i)await next(L);await finishOrder(L.games,[0,1]);}
 const msg=cupMessages(L.H).at(-1).data;L.games[1].injectRoomMessage('cup',{...msg,rev:msg.rev+10});await settle();assert.equal(L.games[1].friendCup().rounds.length,4);assert.equal(L.games[1].friendCupOver(),true);
});
