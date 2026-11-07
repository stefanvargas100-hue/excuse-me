// Load test: N fake players on a throwaway Supabase channel, each sending `rate` position reports a second for `secs` seconds.
// Counts what each one receives and reports any server complaint. usage: node load.mjs N rate secs
const [N, RATE, SECS] = [Number(process.argv[2] || 8), Number(process.argv[3] || 5), Number(process.argv[4] || 12)];
const URL = 'https://hrsbzntphratlnkrevet.supabase.co', KEY = 'sb_publishable_FoFHiii4XagCq3-oi3ygQg_UcyZNoJn';
const code = 'LT' + Math.random().toString(36).slice(2, 4).toUpperCase().replace(/[^A-Z]/g, 'Q');
const topic = 'realtime:excuseme-' + code;
const stats = { sent: 0, got: 0, closed: 0, errors: [], perSec: [] };
let sec = 0, secCount = 0;
const clients = [];
function mk(i) {
  return new Promise(res => {
    const ws = new WebSocket(URL.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(KEY) + '&vsn=1.0.0');
    const c = { i, ws, ref: 0, n: 0 };
    const raw = (t, event, payload) => { try { ws.send(JSON.stringify({ topic: t, event, payload, ref: String(++c.ref) })); } catch (e) {} };
    c.raw = raw;
    ws.onopen = () => { raw(topic, 'phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [] } }); c.beat = setInterval(() => raw('phoenix', 'heartbeat', {}), 25000); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.event === 'phx_reply' && m.topic === topic && m.payload.status === 'ok' && !c.ok) { c.ok = true; res(c); }
      else if (m.event === 'broadcast') { stats.got++; secCount++; }
      else if (m.event === 'system' || (m.event === 'phx_reply' && m.payload && m.payload.status !== 'ok') || m.event === 'phx_error' || m.event === 'phx_close') stats.errors.push(i + ':' + m.event + ':' + JSON.stringify(m.payload).slice(0, 160));
    };
    ws.onclose = ev => { stats.closed++; stats.errors.push(i + ':ws closed ' + ev.code + ' ' + (ev.reason || '')); };
    ws.onerror = () => { stats.errors.push(i + ':ws error'); };
    setTimeout(() => res(c), 8000);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < N; i++) clients.push(await mk(i));
console.log('joined', clients.filter(c => c.ok).length, 'of', N, 'on', code);
const timer = setInterval(() => { stats.perSec.push(secCount); secCount = 0; }, 1000);
const senders = clients.map(c => setInterval(() => {
  c.n++; c.raw(topic, 'broadcast', { type: 'broadcast', event: 'pos', payload: { id: 'p' + c.i, n: c.n, x: 1.23, z: c.n * 0.4, vx: 0.1, s: 2.4 } }); stats.sent++;
}, 1000 / RATE));
await sleep(SECS * 1000);
senders.forEach(clearInterval); clearInterval(timer);
await sleep(1500);
const expectedDeliveries = stats.sent * (N - 1);
console.log(JSON.stringify({ N, RATE, SECS, sent: stats.sent, deliveriesExpected: expectedDeliveries, deliveriesGot: stats.got, closed: stats.closed, deliveriesPerSecond: stats.perSec.join(','), errors: [...new Set(stats.errors)].slice(0, 8) }, null, 1));
clients.forEach(c => { clearInterval(c.beat); try { c.ws.close(); } catch (e) {} });
process.exit(0);
