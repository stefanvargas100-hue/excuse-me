// Friend Cup host handover: when the host leaves, the first remaining player in roster order hosts, and the Cup carries on.
// Simulated connection only, no phones. node --test test/host-handover.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, readyPlayers } = require('./harness.js');

const DT = 1 / 30, STAGES = [2, 0, 4, 1];
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);

// A pretend Realtime room that logs every message. H.drop(event, data, targetIndex) loses a message for one phone.
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
        H.log.push({ ev, data: copy, from: me.idx });
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
const hostOf = g => g.lobbyPlayers().find(p => p.host)?.id;
const amHost = g => !!g.lobbyPlayers().find(p => p.me)?.host;
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
const botsOf = g => g.S.race.bots.filter(b => b.aiBot);
const table = g => g.friendCupStandings().map(r => [r.id, r.points]);

// n phones, a Cup set up, race 1 running.
async function cup(n, opts = {}) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(undefined, opts.load); g.useRoomFactory(H.factory); games.push(g); }
  const code = await games[0].hostRoom(0);
  for (let i = 1; i < n; i++) { assert.equal(await games[i].joinRoom(code), true); await settle(); }
  await settle();
  assert.equal(games[0].setRoomCup({ stages: STAGES, difficulty: 1 }), true); await settle();
  await readyPlayers(games);
  games[0].hostStart(); await settle(); await settle();
  quiet(games);
  return { H, games, code, ids: games.map(me) };
}
async function finishAll(games) {
  for (const g of games) { if (g.state === 'play') g.S.pz = g.LV.goal + 1; tickAll(games, 3); await settle(); }
  await settle();
}
// The host presses Start for the next race. A fresh coordinator may need a moment to check clocks, so it tries a few times.
async function nextRace(host, games) {
  for (let i = 0; i < 10 && host.rematchState() === 'idle'; i++) { host.requestRematch(); await settle(); await settle(); }
  quiet(games);
}

test('a new host is chosen identically on every phone, and the Cup carries on', async () => {
  const L = await cup(4), { games, ids } = L, [old, ...rest] = games;
  tickAll(games, 6); await settle();
  await finishAll(games);
  const after1 = J(table(rest[0]));
  await nextRace(old, games);
  tickAll(games, 6); await settle();
  old.leaveRoom(); await settle(); await settle();
  for (const g of rest) {
    assert.equal(hostOf(g), ids[1], 'the first remaining player in roster order hosts');
    assert.equal(g.lobbyPlayers().filter(p => p.host).length, 1);
    assert.equal(amHost(g), g === rest[0]);
    assert.equal(g.friendCup().ended, false, 'the Cup is not over');
    assert.equal(g.friendCup().racers.find(r => r.id === ids[0]).left, true, 'the old host is marked as left');
    assert.equal(g.state, 'play', 'race 2 goes on');
  }
  assert.equal(J(table(rest[0])), after1, 'standings carry over');
  assert.match(rest[1].lobbyStatus(), /now hosting/);
});

test('the new host runs the bots from where they were, guests see them move, and the Cup finishes', async () => {
  const L = await cup(3), { H, games, ids } = L, [old, nh, guest] = games;
  for (let i = 0; i < 12; i++) { tickAll(games, 5); await settle(); }
  const z0 = nh.S.race.bots.map(b => [b.peerId, b.z]);   // bots and the old host's runner
  old.leaveRoom(); await settle(); await settle();
  const bots = botsOf(nh);
  assert.equal(bots.length, 6, 'five bots and the old host\'s runner');
  assert.ok(bots.every(b => !b.remote), 'the new host really runs them');
  for (const [id, z] of z0) assert.ok(Math.abs(nh.S.race.bots.find(b => b.peerId === id).z - z) < 1.5, 'from the last known position');
  const sent = H.log.length;
  for (let i = 0; i < 12; i++) { tickAll([nh, guest], 5); await settle(); }
  assert.ok(H.log.slice(sent).some(m => m.ev === 'bots' && m.from === 1), 'the new host sends the bots');
  for (const b of botsOf(guest)) {
    const real = nh.S.race.bots.find(x => x.peerId === b.peerId);
    assert.ok(real.z > z0.find(r => r[0] === b.peerId)[1] + 1, 'walking on the new host: ' + real.z);
    assert.ok(Math.abs(real.z - b.z) < 3, 'the guest sees it where the new host has it: ' + real.z + ' vs ' + b.z);
  }
  await finishAll([nh, guest]);
  for (let k = 1; k < 4; k++) { await nextRace(nh, [nh, guest]); tickAll([nh, guest], 6); await settle(); await finishAll([nh, guest]); }
  for (const g of [nh, guest]) {
    assert.equal(g.friendCup().rounds.length, 4, 'all four races');
    assert.equal(g.friendCupOver(), true);
    assert.equal(g.friendCup().ended, false, 'finished, not abandoned');
  }
  assert.equal(J(table(guest)), J(table(nh)));
  assert.ok(nh.friendCup().rounds[0].find(r => r.id === ids[0]).place, 'the old host still has a place in race 1');
});

test('a bot that already finished keeps its time and does not finish again', async () => {
  const L = await cup(3), { games } = L, [old, nh, guest] = games;
  tickAll(games, 6); await settle();
  const bot = botsOf(old)[0], id = bot.peerId;
  bot.z = old.LV.goal + 0.5;
  for (let i = 0; i < 6; i++) { tickAll(games, 5); await settle(); }
  const ft = nh.S.duel.peers[id].fin;
  assert.ok(ft > 0, 'the guests know the bot finished');
  old.leaveRoom(); await settle(); await settle();
  for (let i = 0; i < 12; i++) { tickAll([nh, guest], 5); await settle(); }
  assert.equal(nh.S.duel.peers[id].fin, ft);
  await finishAll([nh, guest]);
  for (const g of [nh, guest]) assert.equal(g.friendCup().rounds[0].find(r => r.id === id).time, ft, 'the time stays');
});

test('the host leaving between races: the next host starts the next race, alone or with others', async () => {
  for (const n of [2, 3]) {
    const L = await cup(n), { games, ids } = L, [old, ...rest] = games;
    tickAll(games, 6); await settle();
    await finishAll(games);
    tickAll(games, 40); await settle();
    old.leaveRoom(); await settle(); await settle();
    assert.equal(amHost(rest[0]), true);
    assert.equal(rest[0].rematchState(), 'idle', 'the new host can start race 2 (' + n + ' humans)');
    await nextRace(rest[0], rest);
    for (const g of rest) { assert.equal(g.state, 'play'); assert.equal(g.S.seed, g.friendCup().seed + ':race2'); }
    assert.ok(rest[0].S.race.bots.find(b => b.peerId === ids[0]).aiBot, 'a bot runs for the old host');
    tickAll(rest, 6); await settle();
    await finishAll(rest);
    for (const g of rest) assert.equal(g.friendCup().rounds.length, 2);
  }
});

test('a countdown is cancelled when the host leaves, never half-run, and the new host restarts it', async () => {
  const L = await cup(3), { H, games } = L, [old, nh, guest] = games;
  tickAll(games, 6); await settle();
  await finishAll(games);
  old.requestRematch(); await settle(); await settle();
  const seed = old.friendCup().seed + ':race2';
  for (const g of games) { assert.equal(g.S.seed, seed); assert.ok(g.S.race.countT > 0, 'counting down'); }
  old.leaveRoom(); await settle(); await settle();
  const cut = H.log.length;
  for (const g of [nh, guest]) {
    assert.notEqual(g.state, 'play', 'the start is cancelled on every phone');
    assert.equal(g.friendCup().rounds.length, 1);
  }
  assert.equal(nh.rematchState(), 'idle', 'the new host can start it again');
  assert.equal(guest.rematchState(), 'waiting');
  tickAll([nh, guest], 30); await settle();
  await nextRace(nh, [nh, guest]);
  for (const g of [nh, guest]) { assert.equal(g.state, 'play', 'race 2 runs'); assert.equal(g.S.seed, seed); assert.ok(!g.S.duel.dnf, "not a DNF"); }
  assert.ok(!H.log.slice(cut).some(m => m.ev === 'dnf' && m.data.race === seed), 'nobody reported a DNF for the cancelled start');
  tickAll([nh, guest], 6); await settle();
  await finishAll([nh, guest]);
  const round = nh.friendCup().rounds[1];
  for (const g of [nh, guest]) assert.ok(round.find(r => r.id === me(g)).time > 0, 'both finish race 2 with a time, not a DNF');
  assert.equal(J(table(guest)), J(table(nh)));
});

// Batch 06d. Each phone's countdown ends at a slightly different moment, so the host leaving right at GO must not split the room:
// the new host decides once for the whole room, and every phone follows, whatever its own countdown says.
async function boundary(hostCount, guestCount) {
  const L = await cup(3), { games } = L, [old, nh, guest] = games;
  tickAll(games, 6); await settle();
  await finishAll(games);
  old.requestRematch(); await settle(); await settle();
  const seed = old.friendCup().seed + ':race2';
  for (const [g, t] of [[nh, hostCount], [guest, guestCount]]) { g.S.duel.startRemaining = null; g.S.race.countT = t; g.S.people.length = 0; g.S.nextChunk = 1e9; }
  old.leaveRoom(); await settle(); await settle();   // each phone hears it with its own countdown where it was set
  tickAll([nh, guest], 6); await settle(); tickAll([nh, guest], 6); await settle();   // a countdown still running reaches GO
  const racing = g => g.state === 'play' && g.S.seed === seed && !g.S.duel.cancelled;
  assert.equal(racing(nh), racing(guest), 'both race, or neither does (new host ' + hostCount + ', guest ' + guestCount + ')');
  assert.equal(racing(nh), hostCount === 0, 'the new host decides: a race under way goes on, a countdown is cancelled');
  if (!racing(nh)) {
    assert.equal(nh.rematchState(), 'idle', 'the new host can start it again');
    await nextRace(nh, [nh, guest]);
    for (const g of [nh, guest]) assert.ok(racing(g), 'the restart runs everywhere');
  }
  await finishAll([nh, guest]);
  for (const g of [nh, guest]) assert.equal(g.friendCup().rounds.length, 2, 'race 2 finishes');
  const round = nh.friendCup().rounds[1];
  for (const g of [nh, guest]) assert.ok(round.find(r => r.id === me(g)).time > 0, 'with a time, not a DNF');
  assert.equal(J(table(guest)), J(table(nh)));
}
test('countdown boundary: new host racing, guest a frame from GO: both race on', () => boundary(0, 0.1));
test('countdown boundary: new host a frame from GO, guest racing: both cancel and restart', () => boundary(0.1, 0));
test('countdown boundary: both racing: both race on', () => boundary(0, 0));
test('countdown boundary: both counting down: both cancel and restart', () => boundary(0.1, 0.1));

test('after a cancelled race-1 countdown the end screen shows race 1 about to restart', async () => {
  const L = await cup(3, { load: { dom: true } }), { games } = L, [old, nh, guest] = games;
  for (const g of games) { g.S.duel.startRemaining = null; g.S.race.countT = 2; }
  old.leaveRoom(); await settle(); await settle();
  tickAll([nh, guest], 40); await settle();
  for (const g of [nh, guest]) {
    assert.match(g.element('endEyebrow').textContent, /race 1 of 4/);
    assert.doesNotMatch(g.element('endEyebrow').textContent, /race 0/);
    assert.match(g.element('endTitle').textContent, /Race 1 restarts/);
  }
  assert.match(nh.element('again').textContent, /Start race 1/);
});

test('a cancelled start sends no result for that race', async () => {
  const L = await cup(3, { load: { clock: true } }), { H, games } = L, [old, nh, guest] = games;
  tickAll(games, 6); await settle();
  await finishAll(games);
  old.requestRematch(); await settle(); await settle();
  const seed = old.friendCup().seed + ':race2';
  old.leaveRoom(); await settle(); await settle();
  const cut = H.log.length;
  for (let i = 0; i < 3; i++) { nh.advance(2000); guest.advance(2000); await settle(); }
  assert.ok(!H.log.slice(cut).some(m => ['dnf', 'fin', 'pos', 'bots'].includes(m.ev) && m.data.race === seed), 'no DNF or position for the cancelled start');
});

test('a fake host claim is ignored', async () => {
  const L = await cup(4), { games, ids } = L, [old, nh, a, b] = games;
  tickAll(games, 6); await settle();
  const fakeRoster = (id, rev) => ({ proto: nh.PROTO, id, rev, level: 0, players: [id, ...ids.filter(x => x !== id)].map(x => ({ id: x, name: 'X' })) });
  // while the host is here
  a.injectRoomMessage('roster', fakeRoster(ids[3], 999)); await settle();
  assert.equal(hostOf(a), ids[0]);
  old.leaveRoom(); await settle(); await settle();
  // after the handover, someone other than the next in line claims the role
  for (const g of [nh, a]) {
    g.injectRoomMessage('roster', fakeRoster(ids[3], 999)); await settle();
    const m = { ...nh.friendCup(), id: ids[3], proto: nh.PROTO, rev: 9999, setup: { seed: nh.friendCup().seed, stages: nh.friendCup().stages, difficulty: 1, racers: nh.friendCup().racers.map(r => ({ ...r, bot: r.left ? false : r.bot, left: false })) }, rounds: [], left: [] };
    g.injectRoomMessage('cup', m); await settle();
    assert.equal(hostOf(g), ids[1], 'the claim changes nothing');
    assert.equal(g.friendCup().racers.find(r => r.id === ids[0]).left, true);
  }
  assert.equal(amHost(nh), true);
  assert.equal(amHost(b), false);
  // the old host's own messages count for nothing any more
  a.injectRoomMessage('roster', fakeRoster(ids[0], 99999)); await settle();
  assert.equal(hostOf(a), ids[1]);
});

test('the host going silent: the same handover after the timeout', async () => {
  const L = await cup(3, { load: { clock: true } }), { H, games, ids } = L, [, nh, guest] = games;
  tickAll(games, 6); await settle();
  H.drop = (ev, d) => d.id === ids[0];   // nothing from the host gets through
  for (let i = 0; i < 17; i++) { nh.advance(2000); guest.advance(2000); await settle(); }
  for (const g of [nh, guest]) {
    assert.equal(hostOf(g), ids[1]);
    assert.equal(g.friendCup().ended, false);
    assert.equal(g.state, 'play');
  }
  await finishAll([nh, guest]);
  assert.equal(nh.friendCup().rounds.length, 1);
  assert.equal(guest.friendCup().rounds.length, 1);
});

test('the old host coming back does not take the role back', async () => {
  const L = await cup(3, { load: { clock: true } }), { H, games, ids, code } = L, [old, nh, guest] = games;
  tickAll(games, 6); await settle();
  H.drop = (ev, d) => d.id === ids[0];
  for (let i = 0; i < 17; i++) { nh.advance(2000); guest.advance(2000); await settle(); }
  assert.equal(hostOf(guest), ids[1]);
  H.drop = null;   // the old host is heard again, still believing it hosts
  for (let i = 0; i < 4; i++) { for (const g of games) g.advance(2000); tickAll(games, 3); await settle(); }
  for (const g of [nh, guest]) {
    assert.equal(hostOf(g), ids[1], 'the new host keeps the role');
    assert.equal(g.friendCup().racers.find(r => r.id === ids[0]).left, true);
  }
  assert.equal(amHost(old), false, 'the old host stands down');
  assert.match(old.lobbyStatus(), /hosting/);
  const again = load(); again.useRoomFactory(H.factory);
  assert.equal(await again.joinRoom(code), false, 'and cannot rejoin the Cup');
});

test('plain friend races keep today\'s rule: the host leaving ends the room', async () => {
  const H = hub(), games = [];
  for (let i = 0; i < 3; i++) { const g = load(); g.useRoomFactory(H.factory); games.push(g); }
  const code = await games[0].hostRoom(0);
  for (const g of games.slice(1)) { await g.joinRoom(code); await settle(); }
  await readyPlayers(games); games[0].hostStart(); await settle(); await settle();
  games[0].leaveRoom(); await settle();
  for (const g of games.slice(1)) { assert.equal(amHost(g), false); assert.equal(g.rematchState(), 'gone'); }
});

test('the simulated room completes a Cup after the host leaves race 2', async () => {
  const { simulate } = await import('../tools/room-sim.mjs');
  const r = await simulate({ humans: 3, hostLeaves: true, raceSeconds: 3 });
  for (const g of r.active) {
    assert.equal(g.friendCup().rounds.length, 4);
    assert.equal(g.friendCup().ended, false);
    assert.equal(hostOf(g), me(r.active[0]));
  }
  assert.ok(r.table.host.sent.average > 0 && r.table.guest.received.peak > 0);
});

// Rejected or unrelated updates must leave the handover decision pending.
for (const kind of ['stale revision', 'wrong protocol', 'unrelated attempt']) {
  test('pending countdown decision survives ' + kind, async () => {
    const { H, games } = await cup(3), [old, nh, guest] = games;
    tickAll(games, 6); await settle(); await finishAll(games);
    await nextRace(old, games);
    nh.S.duel.startRemaining = guest.S.duel.startRemaining = null;
    nh.S.race.countT = 0.1; guest.S.race.countT = 0;
    H.drop = (ev, d, target) => ev === 'cup' && d.id === me(nh) && !!d.start && target === 2;
    old.leaveRoom(); await settle(); await settle();
    const valid = H.log.filter(m => m.ev === 'cup' && m.from === 1 && m.data.start).at(-1).data;
    const invalid = JSON.parse(J(valid));
    if (kind === 'stale revision') { invalid.rev = -1; invalid.start.seed = 'unrelated:race1'; }
    if (kind === 'wrong protocol') { invalid.proto = -1; invalid.start.cancel = false; }
    if (kind === 'unrelated attempt') invalid.start.seed = 'unrelated:race1';
    guest.injectRoomMessage('cup', invalid); await settle();
    assert.ok(!guest.S.duel.cancelled, 'invalid decision cannot cancel the guest');
    // An accepted unrelated envelope advances rev, so healing arrives in a newer envelope.
    const healing = kind === 'unrelated attempt' ? { ...valid, rev: valid.rev + 1 } : valid;
    guest.injectRoomMessage('cup', healing); await settle();
    assert.equal(guest.S.duel.cancelled, true, 'valid decision still cancels the pending start');
    assert.equal(guest.state, nh.state, 'all phones converge');
    guest.injectRoomMessage('cup', healing); await settle();
    assert.equal(guest.S.duel.cancelled, true, 'duplicate cancellation is harmless');
    H.drop = null;
    const seed = guest.S.duel.seed;
    await nextRace(nh, [nh, guest]); tickAll([nh, guest], 6); await settle();
    for (const g of [nh, guest]) { assert.equal(g.S.duel.seed, seed); assert.equal(g.state, 'play'); }
    guest.injectRoomMessage('cup', healing);
    await settle();
    assert.ok(!guest.S.duel.cancelled, 'stale decision cannot cancel a restarted attempt with the same seed');
    await finishAll([nh, guest]);
    for (const g of [nh, guest]) assert.equal(g.friendCup().rounds.length, 2);
    assert.equal(J(table(guest)), J(table(nh)));
  });
}
