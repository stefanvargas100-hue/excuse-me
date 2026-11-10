// Friends swap their best ghosts when a room race starts, and keep them on their own phones. Pretend room. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load, readyPlayers } = require('./harness.js');

const settle = () => new Promise(r => setTimeout(r, 5));
const messages = [];
function hub() {
  const members = [];
  return () => {
    const me = { handlers: [], joined: false };
    me.api = {
      join: async () => { me.joined = true; members.push(me); },
      send: (ev, d) => { messages.push([ev,d]); if (!me.joined) return; const copy = JSON.parse(JSON.stringify(d)); for (const o of members) if (o !== me) Promise.resolve().then(() => o.handlers.forEach(h => h(ev, copy))); },
      leave: () => { me.joined = false; const i = members.indexOf(me); if (i >= 0) members.splice(i, 1); },
      onMessage: f => me.handlers.push(f), onClose: () => {}
    };
    return me.api;
  };
}
const own = meters => { const p = []; for (let t = 0, z = 0; z <= meters; t += 0.4, z = t * 3) p.push(0.5, +z.toFixed(1)); return JSON.stringify(p); };   // a recorded run, 0.4 s steps
async function room(n) {
  const H = hub(), games = [];
  for (let i = 0; i < n; i++) { const g = load(); g.useRoomFactory(H); games.push(g); }
  const code = await games[0].hostRoom(1);                                  // stage 1 = nyc
  for (let i = 1; i < n; i++) { await games[i].joinRoom(code); await settle(); }
  await settle();
  await readyPlayers(games);
  return games;
}
const names = g => g.lobbyPlayers().map(p => p.name);
const stored = (g, key) => { try { return JSON.parse(g.storage[key] || '[]'); } catch (e) { return []; } };

test('when the host starts, each friend\'s best classic and race ghosts for the stage reach the others, under the friend\'s name', async () => {
  const [host, guest] = await room(2);
  host.storage['excuseme_ghost_nyc:cm2'] = own(300); host.storage['excuseme_ghost_race_nyc'] = own(500);
  guest.storage['excuseme_ghost_nyc:cm2'] = own(200);
  host.hostStart(); await settle(); await settle();
  const hostName = host.lobbyPlayers().find(p => p.me).name, guestName = guest.lobbyPlayers().find(p => p.me).name;
  const gc = stored(guest, 'excuseme_fg_classic_nyc:cm2'), gr = stored(guest, 'excuseme_fg_race_nyc');
  assert.ok(messages.some(([ev,d]) => ev === 'ghost' && d.kind === 'classic:cm2'), 'wire kind isolates new ghosts from old clients');
  assert.strictEqual(gc.length, 1); assert.strictEqual(gc[0].name, hostName);
  assert.strictEqual(gr.length, 1, 'race ghost too');
  const hc = stored(host, 'excuseme_fg_classic_nyc:cm2');
  assert.strictEqual(hc.length, 1); assert.strictEqual(hc[0].name, guestName);
  assert.strictEqual(stored(host, 'excuseme_fg_race_nyc').length, 0, 'the guest had no race ghost to give');
  assert.strictEqual(gc[0].step, 2, 'thinned for sending');
  assert.ok(gc[0].pts.length < JSON.parse(host.storage['excuseme_ghost_nyc:cm2']).length / 3);
});

test('a ghost from someone who is not in the room, or a broken one, is ignored', async () => {
  const [host, guest] = await room(2);
  const good = { step: 2, pts: [0, 0, 0, 6, 0, 12] };
  host.injectRoomMessage('ghost', { id: 'stranger1', kind: 'classic:cm2', rules: 'cm2', level: 1, ghost: good });
  assert.strictEqual(stored(host, 'excuseme_fg_classic_nyc:cm2').length, 0, 'not in the roster');
  const guestId = guest.lobbyPlayers().find(p => p.me).id;
  host.injectRoomMessage('ghost', { id: guestId, kind: 'classic:cm2', rules: 'cm2', level: 1, ghost: { step: 2, pts: [0, 0, 999, 5] } });
  host.injectRoomMessage('ghost', { id: guestId, kind: 'bogus', level: 1, ghost: good });
  host.injectRoomMessage('ghost', { id: guestId, kind: 'classic:cm2', rules: 'cm2', level: 99, ghost: good });
  host.injectRoomMessage('ghost', { id: guestId, kind: 'classic:cm2', rules: 'cm2', level: 1 });
  assert.strictEqual(stored(host, 'excuseme_fg_classic_nyc:cm2').length, 0, 'bad ghosts thrown away');
  host.injectRoomMessage('ghost', { id: guestId, kind: 'classic:cm2', rules: 'cm2', level: 1, name: 'Evil <script>', ghost: good });
  const kept = stored(host, 'excuseme_fg_classic_nyc:cm2');
  assert.strictEqual(kept.length, 1);
  assert.strictEqual(kept[0].name, guest.lobbyPlayers().find(p => p.me).name, 'the name comes from the room list, not from the message');
});

test('a friend sending again replaces their old ghost, and four friends at most are kept', async () => {
  const games = await room(4);
  const host = games[0], good = n => ({ step: 2, pts: [0, 0, 0, n] });
  const ids = games.slice(1).map(g => g.lobbyPlayers().find(p => p.me).id);
  for (let i = 0; i < 3; i++) host.injectRoomMessage('ghost', { id: ids[i], kind: 'classic:cm2', rules: 'cm2', level: 1, ghost: good(100 + i) });
  host.injectRoomMessage('ghost', { id: ids[0], kind: 'classic:cm2', rules: 'cm2', level: 1, ghost: good(500) });
  const list = stored(host, 'excuseme_fg_classic_nyc:cm2');
  assert.strictEqual(list.length, 3);
  assert.strictEqual(list.find(e => e.pts[3] === 500) !== undefined, true, 'the newer ghost of the first friend');
});
test('legacy and mismatched Classic ghost messages are isolated',async()=>{const [host,guest]=await room(2);const id=guest.lobbyPlayers().find(p=>p.me).id;for(const rules of [undefined,'cm1','cm3'])host.injectRoomMessage('ghost',{id,kind:'classic',level:1,rules,ghost:{step:2,pts:[0,0,0,20]}});assert.strictEqual(stored(host,'excuseme_fg_classic_nyc:cm2').length,0);});
