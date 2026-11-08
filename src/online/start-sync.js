// Room coordination only: no simulation, browser globals, persistence or database access.
export const START_PROTOCOL = 2;
const LEAD = 3000, MARGIN = 500, RETRY = 200, PROBE = 2000, FRESH = 6500;
const finite = Number.isFinite;
const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((id, i) => id === b[i]);

export function createStartCoordinator({ id, hostId, now, send, onStart = () => {}, onChange = () => {}, onNotice = () => {}, onExpired = () => {}, allowStart = () => true, allowAgreed = () => false }) {
  const host = id === hostId;
  let players = [], level = 0, config = 0, revision = 0, received = -1, phase = 'idle', connected = true, compatible = true, closed = false;
  let wish = false, readySeq = 0, round = 0, highestRound = 0, plan = null, localDeadline = null, lastRetry = -Infinity, lastProbe = -Infinity;
  let nonce = 0, samples = [], outstanding = new Map(), prepared = new Set(), committed = new Set(), launched = new Set();
  const member = who => players.find(p => p.id === who);
  const changed = () => { if (!closed) onChange(); };
  const emit = (event, data = {}) => { if (connected && !closed) send(event, { ...data, protocol: START_PROTOCOL }); };
  const best = () => samples.filter(s => now() - s.at <= FRESH).sort((a, b) => a.rtt - b.rtt)[0];
  const clock = () => host || !!best();
  const quality = p => !connected && p.id === id ? 'reconnecting' : !p.connected ? 'reconnecting' : p.protocol !== START_PROTOCOL ? 'update' : !p.clock ? 'checking' : p.rtt > 150 ? 'slow' : 'good';
  const busy = () => phase === 'preparing' || phase === 'committing';
  const snapshot = () => ({ protocol: START_PROTOCOL, config, rev: revision, level, players: players.map(p => ({ ...p })), phase, plan: plan ? { ...plan, ids: [...plan.ids], phase } : null });
  function publish() { revision++; emit('state', snapshot()); changed(); }
  function clear(reason, announce = false) {
    const old = plan;
    phase = 'idle'; plan = null; localDeadline = null; prepared.clear(); committed.clear(); wish = false;
    if (host) {
      config++; readySeq = 0;
      for (const p of players) { p.ready = false; p.n = -1; }
      if (announce && old) emit('cancel', { planId: old.id, reason });
      publish();
    } else changed();
    if (reason) onNotice(reason);
  }
  function setPlayers(ids, nextLevel) {
    if (!host || closed) return;
    const input = ids.map(p => typeof p === 'string' ? { id: p, protocol: START_PROTOCOL } : p);
    if (!input.length || input[0].id !== hostId || input.length > 8 || new Set(input.map(p => p.id)).size !== input.length) return;
    if (same(input.map(p => p.id), players.map(p => p.id)) && level === nextLevel) return;
    const old = players;
    players = input.map(p => ({ id: p.id, ready: false, n: -1, protocol: p.id === id ? START_PROTOCOL : p.protocol || 0, connected: true, clock: p.id === id || !!old.find(o => o.id === p.id)?.clock, rtt: old.find(o => o.id === p.id)?.rtt ?? null, seen: now() }));
    level = nextLevel;
    if (busy()) clear('Room changed. Everyone must ready again.', true);
    else { config++; wish = false; readySeq = 0; publish(); }
  }
  function report() {
    const sample = best();
    emit('ready', { config, n: readySeq, ready: wish, clock: !!sample, rtt: sample?.rtt ?? null });
  }
  function setReady(ready) {
    if (closed || !connected || !compatible || typeof ready !== 'boolean' || (ready && (!clock() || phase !== 'idle'))) return false;
    wish = ready; readySeq++;
    if (host) {
      const p = member(id); if (!p) return false;
      p.ready = ready; p.n = readySeq;
      if (!ready && busy()) clear('Start cancelled. Everyone must ready again.', true); else publish();
    } else { report(); changed(); }
    return true;
  }
  function canStart() {
    return host && connected && compatible && phase === 'idle' && players.length >= 2 && players.every(p => p.ready && p.connected && p.clock && p.protocol === START_PROTOCOL && (p.id === id || now() - p.seen <= FRESH));
  }
  function sendPlan() {
    if (!plan) return;
    lastRetry = now(); emit(phase === 'preparing' ? 'prepare' : phase === 'committing' ? 'commit' : 'go', { plan: { ...plan, ids: [...plan.ids] } });
  }
  function start(seed, { agreed = false } = {}) {
    if (!host || busy() || !connected || closed) return false;
    if (agreed && !launched.size) return false;
    if (agreed && (phase === 'running' || phase === 'idle')) {
      phase = 'idle'; for (const p of players) p.ready = true; wish = true;
    }
    if (!canStart() || typeof seed !== 'string' || seed.length > 40) return false;
    plan = { id: config + ':' + (++round), round, config, seed, level, ids: players.map(p => p.id), startAt: now() + LEAD, agreed };
    phase = 'preparing'; localDeadline = plan.startAt; prepared = new Set([id]); committed = new Set([id]); publish(); sendPlan();
    return true;
  }
  function validPlan(p) {
    return p && typeof p.id === 'string' && Number.isInteger(p.round) && p.round > 0 && p.config === config && p.level === level &&
      typeof p.seed === 'string' && p.seed.length > 0 && p.seed.length <= 40 && finite(p.startAt) && same(p.ids, players.map(p => p.id));
  }
  function launch() {
    if (!plan || launched.has(plan.id)) return;
    launched.add(plan.id); highestRound = Math.max(highestRound, plan.round); phase = 'running';
    onStart({ ...plan, startAtLocal: localDeadline, now, late: now() >= localDeadline }); changed();
  }
  function acceptPlan(event, p) {
    if (!validPlan(p) || !compatible || !connected || !allowStart() || p.round < highestRound) return;
    if (event === 'prepare') {
      if (launched.has(p.id)) return;
      if (!plan || plan.id !== p.id) {
        if ((!wish && !(p.agreed === true && allowAgreed())) || !clock() || p.round <= highestRound) return;
        plan = { ...p, ids: [...p.ids] }; localDeadline = p.startAt - best().offset; highestRound = p.round;
        if (localDeadline - now() > LEAD + 1000 || localDeadline <= now() + MARGIN) { clear('Start missed. Ready again.'); return; }
        phase = 'preparing'; changed();
      }
      emit('prepared', { planId: p.id, config });
    } else if (plan?.id === p.id && !launched.has(p.id)) {
      if (event === 'commit') {
        if (now() >= localDeadline - MARGIN) { emit('nack', { planId: p.id }); return; }
        phase = 'committing'; emit('committed', { planId: p.id, config }); changed();
      } else if (event === 'go') launch();
    }
  }
  function acceptSnapshot(s) {
    if (host || closed || !s || s.protocol !== START_PROTOCOL) { if (!host) { compatible = false; changed(); onNotice('Update the game on every phone before joining this room.'); } return; }
    if (!Number.isInteger(s.rev) || s.rev <= received || !Number.isInteger(s.config) || !Array.isArray(s.players) || !s.players.some(p => p.id === id) || s.players[0]?.id !== hostId || s.players.length > 8) return;
    compatible = true; received = s.rev;
    const reset = config !== s.config;
    config = s.config; level = s.level; players = s.players.map(p => ({ ...p }));
    if (reset) { wish = false; readySeq = 0; if (busy()) { plan = null; phase = 'idle'; } }
    else {
      // A host can clear an acknowledged ready state after silence. Accept that
      // decision, but never overwrite a newer local request still in flight.
      const confirmed = member(id);
      if (Number.isInteger(confirmed.n) && confirmed.n >= readySeq) { wish = confirmed.ready === true; readySeq = confirmed.n; }
    }
    if (s.phase === 'idle' && busy()) { plan = null; phase = 'idle'; wish = false; }
    if (s.plan) {
      if (s.phase === 'preparing') acceptPlan('prepare', s.plan);
      else if (s.phase === 'committing') acceptPlan('commit', s.plan);
      else if (s.phase === 'running') acceptPlan('go', s.plan);
    }
    tick(); changed();
  }
  function receive(event, data) {
    if (closed || !data || typeof data !== 'object') return;
    const from = data.id;
    if (event === 'state') { if (from === hostId) acceptSnapshot(data); return; }
    if (data.protocol !== START_PROTOCOL || !member(from) || from === id) return;
    if (host) {
      const p = member(from); p.seen = now(); p.connected = true;
      if (event === 'ping' && data.to === id && Number.isInteger(data.nonce)) {
        emit('pong', { to: from, nonce: data.nonce, hostTime: now() }); return;
      }
      if (event === 'ready') {
        if (data.config !== config || !Number.isInteger(data.n) || data.n < p.n || typeof data.ready !== 'boolean' || (data.n === p.n && data.ready !== p.ready)) return;
        // A confirmed rematch vote survives the automatic not-ready report caused
        // by a departed member's new roster revision. Connection checks still apply.
        p.n = data.n; p.ready = data.ready || (busy() && plan?.agreed === true && p.ready); p.protocol = START_PROTOCOL;
        p.clock = data.clock === true && finite(data.rtt) && data.rtt >= 0 && data.rtt <= 1000;
        p.rtt = p.clock ? Math.round(data.rtt) : null;
        if ((!p.ready || !p.clock) && busy()) clear('Start cancelled. Check connections and ready again.', true); else publish();
      } else if (plan && data.planId === plan.id && data.config === config && busy()) {
        if (event === 'prepared') prepared.add(from);
        if (event === 'committed') committed.add(from);
        if (now() >= plan.startAt - MARGIN) { clear('Start cancelled. A phone did not confirm in time. Ready again.', true); return; }
        if (phase === 'preparing' && players.every(p => prepared.has(p.id))) { phase = 'committing'; publish(); sendPlan(); }
        if (phase === 'committing' && players.every(p => committed.has(p.id))) { phase = 'running'; publish(); sendPlan(); launch(); }
      } else if (event === 'nack' && plan?.id === data.planId && busy()) clear('Start cancelled. A phone was not ready in time.', true);
    } else if (from === hostId) {
      if (event === 'pong' && data.to === id && outstanding.has(data.nonce)) {
        const sent = outstanding.get(data.nonce); outstanding.delete(data.nonce);
        const rtt = now() - sent;
        if (!finite(data.hostTime) || rtt < 0 || rtt > 1000) return;
        samples.push({ rtt, offset: data.hostTime - (sent + now()) / 2, at: now() }); samples = samples.slice(-5); report(); changed();
      } else if (event === 'cancel' && plan?.id === data.planId && !launched.has(plan.id)) clear(typeof data.reason === 'string' ? data.reason.slice(0, 120) : 'Start cancelled. Ready again.');
      else if (['prepare', 'commit', 'go'].includes(event)) acceptPlan(event, data.plan);
    }
  }
  function tick() {
    if (closed || !connected) return;
    if (!host && compatible && member(id) && now() - lastProbe >= PROBE) {
      lastProbe = now(); const n = ++nonce; outstanding.set(n, now());
      for (const [key, sent] of outstanding) if (now() - sent > FRESH) outstanding.delete(key);
      emit('ping', { to: hostId, nonce: n }); report();
    }
    if (host) {
      const stale = players.filter(p => p.id !== id && p.connected && now() - p.seen > FRESH);
      if (stale.length) { for (const p of stale) { p.connected = false; p.ready = false; p.clock = false; } if (busy()) clear('Start cancelled. A phone lost connection.', true); else publish(); }
      if (busy() && now() >= plan.startAt - MARGIN) clear('Start cancelled. A phone did not confirm in time. Ready again.', true);
      else if (plan && now() - lastRetry >= RETRY && (busy() || now() < plan.startAt + 500)) sendPlan();
    } else if (busy() && now() > localDeadline + 500) {
      const expired = plan;
      clear('Start could not be confirmed. Rejoin the room.'); onExpired(expired);
    }
  }
  function setConnected(value) {
    connected = value;
    if (!value) { samples = []; outstanding.clear(); lastProbe = -Infinity; if (host) clear('Connection interrupted. Ready again after reconnecting.', true); else { if (busy()) clear('Connection interrupted. Ready again after reconnecting.'); wish = false; readySeq++; } }
    if (value) { tick(); if (!host) report(); }
    changed();
  }
  function view() {
    const sample = best();
    return { phase, compatible, ready: connected && wish && !!member(id)?.ready, pending: !host && wish !== !!member(id)?.ready, canReady: connected && compatible && clock() && phase === 'idle', rtt: host ? null : sample ? Math.round(sample.rtt) : null,
      players: players.map(p => {
        const shown = { ...p, ready: p.id === id ? connected && wish && p.ready : p.ready };
        if (!host && p.id === id) { shown.clock = !!sample; shown.rtt = sample ? Math.round(sample.rtt) : null; }
        return { ...shown, status: quality(shown) };
      }), busy: busy(), deadline: localDeadline };
  }
  return { setPlayers, snapshot, acceptSnapshot, receive, setReady, canStart, start, tick, setConnected, view, close() { closed = true; outstanding.clear(); } };
}
