/* ---------- live rooms (Supabase Realtime, plain WebSocket, no extra libraries) ----------
   Two phones join the same channel by room code and pass small messages to each other. Nothing is stored on the server.
   The socket and timers are passed in, so tests can use a pretend server. */
import { PLAYTEST } from '../config/channel.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L: easy to read out loud
export const makeCode = (rand = Math.random) => { let c = ''; for (let i = 0; i < 4; i++) c += ALPHABET[Math.floor(rand() * ALPHABET.length)]; return c; };
export const cleanCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

export function createRoom({ WebSocket, url, key, setInterval: si, clearInterval: ci, joinTimeoutMs = 8000 }) {
  const setI = si || ((f, ms) => setInterval(f, ms)), clearI = ci || (id => clearInterval(id));
  let ws = null, topic = '', joined = false, ref = 0, beat = null, closedFired = false;
  let serial = 0, cancelJoin = null;
  const handlers = [], closers = [];

  const raw = (t, event, payload) => { if (ws) { try { ws.send(JSON.stringify({ topic: t, event, payload, ref: String(++ref) })); } catch (e) {} } return ref; };
  function fireClose() { if (closedFired) return; closedFired = true; joined = false; if (beat) { clearI(beat); beat = null; } const socket = ws; if (socket) { try { socket.close(); } catch (e) {} } closers.forEach(f => f()); }

  function join(code) {
    leave();
    const attempt = ++serial;
    return new Promise((resolve, reject) => {
      topic = 'realtime:excuseme-' + (PLAYTEST ? 'playtest-' : '') + cleanCode(code); closedFired = false;
      const wsUrl = url.replace(/^http/, 'ws') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(key) + '&vsn=1.0.0';
      let joinRef = null, timer = null, settled = false, heartbeatRef = null;
      const done = (ok, err) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); cancelJoin = null; if (ok) resolve(); else { leave(); reject(err || new Error('could not join')); } };
      cancelJoin = () => done(false, new Error('cancelled'));
      try { ws = new WebSocket(wsUrl); } catch (e) { done(false, e); return; }
      timer = setTimeout(() => done(false, new Error('timed out')), joinTimeoutMs);
      ws.onopen = () => {
        if (attempt !== serial) return;
        joinRef = String(ref + 1);
        raw(topic, 'phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [] } });
        beat = setI(() => {
          if (attempt !== serial) return;
          if (heartbeatRef !== null) { fireClose(); return; }
          heartbeatRef = String(raw('phoenix', 'heartbeat', {}));
        }, 10000);
      };
      ws.onmessage = ev => {
        if (attempt !== serial || closedFired) return;
        let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
        if (m.topic === 'phoenix' && m.event === 'phx_reply' && m.ref === heartbeatRef && m.payload?.status === 'ok') { heartbeatRef = null; return; }
        if (m.topic !== topic) return;
        if (m.event === 'phx_reply' && m.ref === joinRef) {
          if (m.payload && m.payload.status === 'ok') { joined = true; done(true); } else done(false, new Error('join refused'));
        } else if (m.event === 'broadcast' && m.payload && m.payload.event) {
          handlers.forEach(f => f(m.payload.event, m.payload.payload));
        } else if (m.event === 'phx_close' || m.event === 'phx_error') { if (!settled) done(false, new Error('channel error')); fireClose(); }
      };
      ws.onerror = () => { if (attempt !== serial) return; if (!settled) done(false, new Error('connection failed')); else fireClose(); };
      ws.onclose = () => { if (attempt !== serial) return; done(false, new Error('connection closed')); fireClose(); };
    });
  }

  const send = (event, payload) => { if (joined) raw(topic, 'broadcast', { type: 'broadcast', event, payload }); };
  function leave() { serial++; const cancel = cancelJoin; cancelJoin = null; const w = ws; ws = null; joined = false; if (beat) { clearI(beat); beat = null; } if (w) { try { w.close(); } catch (e) {} } if (cancel) cancel(); }

  return { join, send, leave, onMessage: f => handlers.push(f), onClose: f => closers.push(f), get joined() { return joined; } };
}
