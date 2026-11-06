/* ---------- online leaderboards (Supabase, plain web requests, no extra libraries) ----------
   Anonymous sign-in gives each phone a player id; scores are rows in the "scores" table.
   The server (see supabase/schema.sql) enforces one row per player per board, so the one-try rule is real.
   Everything fails quietly when offline: a score waits in a queue and is sent later. */

const ADJ = ['Brisk', 'Sneaky', 'Zippy', 'Polite', 'Swift', 'Nimble', 'Sunny', 'Cosmic', 'Mellow', 'Bouncy', 'Plucky', 'Speedy', 'Jolly', 'Clever', 'Breezy', 'Lucky'];
const NOUN = ['Pigeon', 'Commuter', 'Tourist', 'Courier', 'Walker', 'Sprinter', 'Dodger', 'Weaver', 'Wanderer', 'Rambler', 'Skater', 'Jogger', 'Drifter', 'Hopper', 'Strider', 'Racer'];

export function createBoard({ fetch, url, key, store }) {
  const KEY_SESSION = 'excuseme_online_session', KEY_NAME = 'excuseme_online_name', KEY_QUEUE = 'excuseme_online_queue';
  const read = (k, fb) => { try { const v = store.get(k, null); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } };
  const write = (k, v) => { try { store.set(k, JSON.stringify(v)); } catch (e) {} };
  const base = { apikey: key, 'Content-Type': 'application/json' };

  function playerName() {
    let n = read(KEY_NAME, null);
    if (!n) { n = ADJ[Math.floor(Math.random() * ADJ.length)] + ' ' + NOUN[Math.floor(Math.random() * NOUN.length)] + ' ' + (10 + Math.floor(Math.random() * 90)); write(KEY_NAME, n); }
    return n;
  }

  // An anonymous player: created once, then remembered on this phone.
  async function session() {
    const s = read(KEY_SESSION, null);
    if (s && s.user_id && s.access_token) {
      if (!s.expires_at || s.expires_at > Date.now() + 30000) return s;
      const r = await fetch(url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: base, body: JSON.stringify({ refresh_token: s.refresh_token }) });
      if (r.ok) { const j = await r.json(); return save(j); }
    }
    const r = await fetch(url + '/auth/v1/signup', { method: 'POST', headers: base, body: JSON.stringify({}) });
    if (!r.ok) throw new Error('sign-in failed');
    return save(await r.json());
  }
  function save(j) {
    const s = { user_id: j.user.id, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in || 3600) * 1000 };
    write(KEY_SESSION, s); return s;
  }

  async function send(item) {
    const s = await session();
    // "best" boards (classic stages) keep one row per player and the server only ever raises it; one-try boards refuse a second row
    const r = await fetch(url + '/rest/v1/scores' + (item.best ? '?on_conflict=user_id,board' : ''), {
      method: 'POST',
      headers: { ...base, Authorization: 'Bearer ' + s.access_token, Prefer: item.best ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' },
      body: JSON.stringify({ user_id: s.user_id, board: item.board, score: item.score, name: item.name })
    });
    if (r.status === 409) return 'duplicate';   // this player already has a score on this board: the first try stands
    if (!r.ok) throw new Error('send failed ' + r.status);
    return 'sent';
  }

  // Try now; if the network or server is down, keep it in the queue for flush().
  async function submit(board, score) {
    const item = { board, score: Math.max(0, Math.floor(score)), name: playerName() };
    try { return await send(item); }
    catch (e) {
      const q = read(KEY_QUEUE, []);
      if (!q.some(x => x.board === board)) { q.push(item); write(KEY_QUEUE, q); }
      return 'queued';
    }
  }

  // Classic stages: your best score so far. While offline, only the highest waiting score per stage is kept.
  async function submitBest(board, score) {
    const item = { board, score: Math.max(0, Math.floor(score)), name: playerName(), best: true };
    try { return await send(item); }
    catch (e) {
      const q = read(KEY_QUEUE, []), old = q.find(x => x.board === board);
      if (old) old.score = Math.max(old.score, item.score); else q.push(item);
      write(KEY_QUEUE, q);
      return 'queued';
    }
  }

  async function flush() {
    const q = read(KEY_QUEUE, []); if (!q.length) return;
    const left = [];
    for (const item of q) { try { await send(item); } catch (e) { left.push(item); } }
    write(KEY_QUEUE, left);
  }

  async function top(board, limit) {
    try {
      const me = read(KEY_SESSION, null);
      const r = await fetch(url + '/rest/v1/scores?select=user_id,name,score&board=eq.' + encodeURIComponent(board) + '&order=score.desc&limit=' + (limit || 10), { headers: { ...base, Authorization: 'Bearer ' + key } });
      if (!r.ok) return [];
      const rows = await r.json();
      return rows.map(x => ({ name: x.name, score: x.score, you: !!me && x.user_id === me.user_id }));
    } catch (e) { return []; }
  }

  return { submit, submitBest, flush, top, playerName };
}
