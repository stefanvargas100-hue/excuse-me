// Batch 26: a guest briefly loses the connection in the middle of a Friend Cup and rejoins; the host then asks for race 2. Simulated connection only. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require('./harness.js');

const DT = 1 / 30, STAGES = [2, 6, 7, 8];   // Tokyo preset
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);

// A pretend Realtime room. It logs every message. A socket can be cut: it stops receiving and sending, and its close handlers run.
function hub() {
  const members = [], H = { log: [], sockets: [] };
  let made = 0;
  H.factory = () => {
    const me = { handlers: [], closers: [], joined: false, idx: made++ };
    H.sockets.push(me);
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => {
        if (!me.joined) return;
        const text = JSON.stringify(d), copy = JSON.parse(text);
        H.log.push({ ev, data: copy, from: me.idx });
        for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text))));
      },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: f => me.closers.push(f)
    };
    return me.api;
  };
  H.cut = sock => { sock.joined = false; const i = members.indexOf(sock); if (i >= 0) members.splice(i, 1); sock.closers.forEach(f => f()); };
  return H;
}
const me = g => g.lobbyPlayers().find(p => p.me).id;
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
async function finishOrder(games, order) {
  for (const i of order) { if (games[i].state === 'play') games[i].S.pz = games[i].LV.goal + 1; tickAll(games, 3); await settle(); }
  await settle();
}
const table = g => g.friendCupStandings().map(r => [r.id, r.points]);

async function setup(opts) {
  const H = hub(), games = [];
  for (let i = 0; i < 2; i++) { const g = load(undefined, opts); g.useRoomFactory(H.factory); games.push(g); }
  const code = await games[0].hostRoom(0);
  assert.strictEqual(await games[1].joinRoom(code), true); await settle(); await settle();
  return { H, games, host: games[0], guest: games[1] };
}

// Host plus 1 guest, Tokyo Cup. Race 1 starts, the guest drops and rejoins, both finish. Returns before the host asks for race 2.
// The rejoin makes the guest probe the host's clock, and that probe reads both phones' clocks at the same instant. Real phones share
// real time, so the two clocks agree at that instant. This fixture has one fake clock per phone, so it must advance them in step:
// hostFirst puts the host's clock level with the guest's before the guest probes; otherwise the guest reads a clock 2000 ms behind.
async function raceOneWithDrop(hostFirst) {
  const L = await setup({ clock: true });
  assert.strictEqual(L.host.setRoomCup({ stages: STAGES, difficulty: 1 }), true); await settle();
  await readyPlayers(L.games);
  L.host.hostStart(); await settle(); await settle(); quiet(L.games);
  for (const g of L.games) g.advance(2000); await settle();
  const id = me(L.guest);
  L.H.cut(L.H.sockets[1]);   // the guest's connection drops; its next heartbeat reconnects
  if (hostFirst) { L.host.advance(2000); L.guest.advance(2000); await settle(); }
  else { L.guest.advance(2000); await settle(); L.host.advance(2000); await settle(); }
  assert.equal(me(L.guest), id); assert.equal(L.H.sockets.length, 3, 'the guest opened a replacement socket');
  await finishOrder(L.games, [0, 1]); tickAll(L.games, 300); await settle();
  assert.equal(L.guest.friendCup().rounds.length, 1); assert.equal(J(table(L.guest)), J(table(L.host)));
  return L;
}
const ask = async L => { const n = L.H.log.length; L.host.requestRematch(); await settle(); await settle(); return L.H.log.slice(n).filter(m => m.ev.startsWith('lobby:')).map(m => m.from + ':' + m.ev); };

test('guest drops and rejoins in Cup race 1: the host asking for race 2 puts the guest in play', async () => {
  const L = await raceOneWithDrop(true);
  const trace = await ask(L);
  assert.equal(L.guest.state, 'play', trace.join(' '));
  assert.equal(L.guest.S.seed, L.host.S.seed); assert.ok(trace.includes('2:lobby:prepared'), 'the guest answers the start');
});

// The old fixture's order. The guest probes while the host's fake clock is 2000 ms behind, so its clock reading is 2000 ms off and
// stays so until the next probe. A guest with a wrong clock refuses the start ("Start missed"), by design. That cannot happen on
// real phones, but the guest still recovers: once the old reading is older than 6.5 s the guest's heartbeat probes again, and the host's second ask starts the race.
test('a guest holding a skewed clock reading refuses race 2 once, then recovers after the next probe', async () => {
  const L = await raceOneWithDrop(false);
  const first = await ask(L);
  assert.equal(L.guest.state, 'won', 'the skewed guest refuses the start: ' + first.join(' ')); assert.ok(!first.includes('2:lobby:prepared'));
  for (let i = 0; i < 5; i++) { L.host.advance(2000); L.guest.advance(2000); await settle(); }   // the host gives up the start; the skewed reading ages out (6500 ms) and the guest probes again
  const second = await ask(L);
  assert.equal(L.guest.state, 'play', second.join(' ')); assert.equal(L.guest.S.seed, L.host.S.seed);
});
