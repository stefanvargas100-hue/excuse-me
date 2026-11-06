// Rematch after a live race: two games joined by a pretend room. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
const tick = (...Es) => { for (const E of Es) E.tick(DT); };
const settle = () => new Promise(r => setTimeout(r, 5));

// A pretend room that connects every game that joins it.
function hub() {
  const members = [];
  return () => {
    const me = { handlers: [], closers: [], joined: false };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => { if (!me.joined) return; const copy = JSON.parse(JSON.stringify(d)); for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, copy))); },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: f => me.closers.push(f)
    };
    return me.api;
  };
}

async function pair() {
  const H = hub(), host = load(), guest = load();
  host.useRoomFactory(H); guest.useRoomFactory(H);
  const code = await host.hostRoom(1);
  await guest.joinRoom(code); await settle();
  host.hostStart(); await settle();
  return { host, guest, code };
}
const finish = (E, other) => { E.S.pz = E.LEVELS[1].goal - 12; let t = 0; while (E.state === 'play' && t++ < 30 * 600) { E.tick(DT); other.tick(DT); } for (let i = 0; i < 60; i++) { E.tick(DT); other.tick(DT); } };

test('both phones start the same race from the room', async () => {
  const { host, guest, code } = await pair();
  assert.strictEqual(host.state, 'play'); assert.strictEqual(guest.state, 'play');
  assert.strictEqual(host.S.seed, code + ':1'); assert.strictEqual(guest.S.seed, code + ':1');
  assert.strictEqual(host.S.race.bots.length, 1); assert.strictEqual(guest.S.race.bots.length, 1);
});

test('rematch needs both players; then the host starts a new race with a new crowd on the same stage', async () => {
  const { host, guest, code } = await pair();
  for (let i = 0; i < 100; i++) tick(host, guest);
  finish(host, guest); await settle();
  assert.strictEqual(host.state, 'won');
  guest.requestRematch(); await settle();
  assert.strictEqual(host.S.seed, code + ':1', 'one player asking is not enough');
  assert.strictEqual(guest.S.seed, code + ':1');
  host.requestRematch(); await settle();
  assert.strictEqual(host.S.seed, code + ':2'); assert.strictEqual(guest.S.seed, code + ':2');
  assert.strictEqual(host.state, 'play'); assert.strictEqual(guest.state, 'play');
  assert.strictEqual(host.S.race.countT > 0, true, 'a fresh countdown');
  assert.strictEqual(host.S.pz, 0);
  assert.strictEqual(host.S.race.bots.length, 1);
  assert.ok(Math.abs(host.S.race.bots[0].z) < 1e-9, 'friend back on the line');
});

test('either player can ask first, including the host', async () => {
  const { host, guest, code } = await pair();
  finish(host, guest);
  host.requestRematch(); await settle();
  assert.strictEqual(host.S.seed, code + ':1');
  guest.requestRematch(); await settle();
  assert.strictEqual(guest.S.seed, code + ':2'); assert.strictEqual(host.S.seed, code + ':2');
});

test('asking again twice does not start two races, and a second rematch works', async () => {
  const { host, guest, code } = await pair();
  finish(host, guest);
  host.requestRematch(); host.requestRematch(); guest.requestRematch(); await settle();
  assert.strictEqual(host.S.seed, code + ':2');
  finish(host, guest);
  guest.requestRematch(); host.requestRematch(); await settle();
  assert.strictEqual(host.S.seed, code + ':3'); assert.strictEqual(guest.S.seed, code + ':3');
});

test('a friend who left cannot be rematched', async () => {
  const { host, guest, code } = await pair();
  finish(host, guest);
  guest.leaveRoom(); await settle();
  host.requestRematch(); await settle();
  assert.strictEqual(host.S.seed, code + ':1', 'nothing started');
  assert.strictEqual(host.rematchState(), 'gone');
});

test('a stray start message is ignored unless you asked for a rematch', async () => {
  const { host, guest, code } = await pair();
  for (let i = 0; i < 60; i++) tick(host, guest);
  host.duelReceive('start', { level: 0, seed: 'zzzz:9' });
  assert.strictEqual(guest.S.seed, code + ':1');
  assert.strictEqual(guest.rematchState(), 'idle');
});

test('rematch state: idle, then waiting for them, then they asked', async () => {
  const { host, guest } = await pair();
  finish(host, guest); await settle();
  assert.strictEqual(guest.rematchState(), 'idle');
  host.requestRematch(); await settle();
  assert.strictEqual(host.rematchState(), 'waiting');
  assert.strictEqual(guest.rematchState(), 'asked');
});
