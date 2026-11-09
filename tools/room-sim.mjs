// A simulated Friend Cup room: N phones in one process on the same pretend connection the tests use. No Supabase.
// Each phone is a full copy of the game. They play a 4-race Cup of 8 racers (N humans, the rest bots), and every message
// sent and received is counted per phone per simulated second.
//   node tools/room-sim.mjs            prints the message table for 2, 4 and 8 humans, and 4 humans with the host leaving in race 2
// The humans stand still (nobody steers), so a race is a fixed number of seconds and then everyone crosses the line together.
// Position reports go out on the game clock whether a runner moves or not, so the message rates are the real ones.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { load, readyPlayers } = require('../test/harness.js');

const DT = 1 / 30, FRAMES = 30;   // 30 game frames make one simulated second
const settle = () => new Promise(r => setTimeout(r, 1));
const me = g => g.lobbyPlayers().find(p => p.me)?.id;

export async function simulate({ humans = 4, hostLeaves = false, raceSeconds = 30 } = {}) {
  let second = 0;
  const members = [], phones = [];
  const bump = (list, n = 1) => { list[second] = (list[second] || 0) + n; };
  const games = [];
  for (let i = 0; i < humans; i++) {
    const phone = { sent: [], received: [], from: 0, to: Infinity }, g = load(undefined, { clock: true });
    phones.push(phone);
    g.useRoomFactory(() => {
      const m = { handlers: [], phone };
      return {
        join: async () => { members.push(m); },
        leave: () => { const k = members.indexOf(m); if (k >= 0) members.splice(k, 1); },
        onMessage: f => m.handlers.push(f), onClose: () => {},
        send: (ev, data) => {
          if (!members.includes(m)) return;
          bump(phone.sent);
          const text = JSON.stringify(data);
          for (const o of members) if (o !== m) { bump(o.phone.received); Promise.resolve().then(() => o.handlers.forEach(f => f(ev, JSON.parse(text)))); }
        }
      };
    });
    games.push(g);
  }
  // One simulated second: 30 frames on every phone still in the room, and the 2-second heartbeat on every other second.
  let active = [...games];
  const run = async () => {
    for (let f = 0; f < FRAMES; f++) { for (const g of active) g.tick(DT); if (f % 6 === 5) await settle(); }
    if (second % 2 === 1) for (const g of active) g.advance(2000);
    await settle(); second++;
  };
  const quiet = () => { for (const g of active) if (g.S?.race) { g.S.race.countT = 0; g.S.people.length = 0; g.S.nextChunk = 1e9; } };

  const code = await games[0].hostRoom(0);
  for (const g of games.slice(1)) { if (!await g.joinRoom(code)) throw Error('a phone could not join'); await settle(); }
  games[0].setRoomCup({ stages: [0, 1, 2, 3], difficulty: 1 }); await settle();
  await readyPlayers(games);
  games[0].hostStart(); await settle(); await settle();
  let host = games[0];
  for (let race = 0; race < 4; race++) {
    const seed = host.friendCup().seed + ':race' + (race + 1);
    if (!active.every(g => g.state === 'play' && g.S.seed === seed)) throw Error('race ' + (race + 1) + ' did not start on every phone');
    quiet();
    for (let s = 0; s < raceSeconds; s++) {
      if (hostLeaves && race === 1 && s === Math.floor(raceSeconds / 2)) {
        phones[games.indexOf(host)].to = second;
        host.leaveRoom(); active = active.filter(g => g !== host); await settle(); await settle();
        host = active.find(g => g.lobbyPlayers().find(p => p.me)?.host);
        if (!host || !active.every(g => g.lobbyPlayers().find(p => p.host)?.id === me(host))) throw Error('the phones did not agree on a new host');
      }
      await run();
    }
    for (const g of active) g.S.pz = g.LV.goal + 1;
    await run();
    if (host.friendCup().rounds.length !== race + 1) throw Error('the Cup did not settle race ' + (race + 1));
    if (race < 3) {
      // The host presses Start. A coordinator new after a handover may need a moment to check clocks, so it keeps trying.
      for (let k = 0; k < 10 && host.rematchState() === 'idle'; k++) { host.requestRematch(); await settle(); await settle(); if (host.rematchState() === 'idle') await run(); }
    }
  }
  for (const p of phones) if (p.to === Infinity) p.to = second;
  const stats = (list, from, to) => {
    const v = []; for (let s = from; s < to; s++) v.push(list[s] || 0);
    return { average: +(v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)).toFixed(1), peak: Math.max(0, ...v) };
  };
  const phone = i => ({ sent: stats(phones[i].sent, phones[i].from, phones[i].to), received: stats(phones[i].received, phones[i].from, phones[i].to) });
  const total = key => { const sum = []; for (const p of phones) p[key].forEach((n, s) => { sum[s] = (sum[s] || 0) + (n || 0); }); return stats(sum, 0, second); };
  const table = { humans, hostLeaves, seconds: second, room: { sent: total('sent'), received: total('received') }, host: phone(0), guest: phone(humans - 1), newHost: hostLeaves ? phone(1) : null };
  return { games, active, table };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const f = s => s.average + ' / ' + s.peak;
  const rows = ['| Humans | Host leaves | Seconds | Room sent | Room received | Host sent | Host received | Guest sent | Guest received | New host sent | New host received |',
    '|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const [humans, hostLeaves] of [[2, false], [4, false], [8, false], [4, true]]) {
    const { table: t } = await simulate({ humans, hostLeaves });
    rows.push('| ' + [humans, hostLeaves ? 'race 2' : 'no', t.seconds, f(t.room.sent), f(t.room.received), f(t.host.sent), f(t.host.received), f(t.guest.sent), f(t.guest.received), t.newHost ? f(t.newHost.sent) : '-', t.newHost ? f(t.newHost.received) : '-'].join(' | ') + ' |');
  }
  console.log('Messages per second, average / peak. "Received" counts every copy delivered to a phone.\n' + rows.join('\n'));
}
