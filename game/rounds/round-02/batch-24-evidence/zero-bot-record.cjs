// Batch 24c: records everything a room with no bots does, so a build can be compared with the one before room bots.
// Two scenarios, three phones each, over a pretend room: a plain race (finish order guest 2, host, guest 1) and an
// Elimination race (guest 2 then guest 1 cut). Every message is kept in send order with its full payload, plus every
// friend ghost each phone stored, and the places or eliminations on every phone.
// Math.random runs from a fixed seed and Date.now is frozen (harness options seed and clock), so ids, room codes, crowds
// and positions repeat exactly. Normalised: only the value of each "proto" field (the room protocol number) becomes "PROTO".
// Write a fixture: node game/rounds/round-02/batch-24-evidence/zero-bot-record.cjs <out.json>
const path = require('path'), fs = require('fs');
const { load, readyPlayers } = require(path.join(__dirname, '../../../../test/harness.js'));

const DT = 1 / 30, SEED = 2424;
const settle = () => new Promise(r => setTimeout(r, 5));
const J = x => JSON.stringify(x);
// a recorded run of `meters`, 0.4 s steps, as ghostroom.test.js makes them
const own = meters => { const p = []; for (let t = 0, z = 0; z <= meters; t += 0.4, z = t * 3) p.push(0.5, +z.toFixed(1)); return J(p); };
const normal = v => Array.isArray(v) ? v.map(normal) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'proto' ? 'PROTO' : normal(x)])) : v;

function hub() {
  const members = [], H = { log: [] };
  let made = 0;
  H.factory = () => {
    const me = { handlers: [], joined: false, idx: made++ };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => {
        if (!me.joined) return;
        const text = J(d);
        H.log.push({ from: me.idx, ev, data: normal(JSON.parse(text)) });
        for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, JSON.parse(text))));
      },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
    };
    return me.api;
  };
  return H;
}
const idOf = g => g.lobbyPlayers().find(p => p.me).id;
async function room(n) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) {
    const g = load(undefined, { dom: true, seed: SEED, clock: true }); g.useRoomFactory(H.factory);
    // stage 1 is Fifth Avenue (nyc): each phone has its own best classic and race runs to swap
    g.storage['excuseme_ghost_nyc:cm3:standard:r2'] = own(200 + 50 * i);
    g.storage['excuseme_ghost_race_nyc:rt1:standard:r2'] = own(400 + 50 * i);
    games.push(g);
  }
  const code = await games[0].hostRoom(1);
  for (let i = 1; i < n; i++) { if (!(await games[i].joinRoom(code))) throw new Error('join failed'); await settle(); }
  await settle();
  return { H, games, host: games[0], ids: games.map(idOf) };
}
const quiet = games => { for (const g of games) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };
const tickAll = (games, frames = 1) => { for (let i = 0; i < frames; i++) for (const g of games) g.tick(DT); };
async function drive(L, zs, frames) {
  for (let f = 0; f < frames; f++) {
    L.games.forEach((g, i) => { if (g.state === 'play' && zs[i] != null) { g.S.pz = zs[i]; g.S.me.z = zs[i]; g.S.speed = 0; g.S.vx = 0; } });
    tickAll(L.games, 1);
    if (f % 5 === 4) await settle();
  }
  await settle();
}
const ghosts = L => L.games.map(g => Object.fromEntries(Object.keys(g.storage).filter(k => k.startsWith('excuseme_fg_')).sort().map(k => [k, JSON.parse(g.storage[k])])));
// `before(L)` runs in the lobby before anyone readies: the room-bots test uses it to add bots and take them away again.
async function record(before) {
  const plain = await room(3);
  if (before) await before(plain);
  await readyPlayers(plain.games);
  plain.host.hostStart(); await settle(); await settle(); quiet(plain.games);
  tickAll(plain.games, 6); await settle();
  for (const i of [2, 0, 1]) { plain.games[i].S.pz = plain.games[i].LV.goal + 1; tickAll(plain.games, 3); await settle(); }
  tickAll(plain.games, 3); await settle(); await settle();
  const places = plain.games.map(g => g.S.race.board.map(r => plain.ids.indexOf(r.id)));
  const e = await room(3);
  e.host.setRoomElim(true); await settle();
  if (before) await before(e);
  await readyPlayers(e.games);
  e.host.hostStart(); await settle(); await settle(); quiet(e.games);
  const c = Array.from(e.host.S.race.elim.cps);
  await drive(e, [c[0] + 5, c[0] - 10, c[0] - 40], 80);
  await drive(e, [c[1] + 5, c[1] - 10, null], 80);
  const out = e.games.map(g => g.S.race.elim.out.map(o => e.ids.indexOf(o.id)));
  const result = {
    plain: { places, ghosts: ghosts(plain), messages: plain.H.log },
    elim: { out, ghosts: ghosts(e), messages: e.H.log }
  };
  for (const g of [...plain.games, ...e.games]) g.leaveRoom();
  return JSON.parse(J(result));
}
module.exports = { record };
if (require.main === module) record().then(r => { fs.writeFileSync(process.argv[2], J(r, null, 1) + '\n'); console.log('plain', r.plain.messages.length, 'messages; elim', r.elim.messages.length); });
