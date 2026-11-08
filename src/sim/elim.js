import { addPop } from './scoring.js';
import { banner } from './actions.js';
import { S } from './state.js';

/* ---------- elimination races ----------
   The field races as usual, but at evenly spaced checkpoints the racer furthest behind is out. When the lead racer crosses a
   checkpoint, exactly one racer (last place at that moment) is eliminated; a checkpoint never eliminates two, and a step never
   handles more than one checkpoint. The last racer left wins on the spot. Ties: greatest progress survives; an exact tie
   keeps the lower start slot.

   Against bots the game decides by itself. In a friend room the HOST decides (the other phones only know where racers were a
   moment ago) and broadcasts the whole ordered list of eliminated racers; every phone applies that list in order, so a lost,
   repeated or late message cannot make phones disagree. If the host is eliminated they keep deciding for the others. */
export const ELIM_WARN_M = 25;   // the warning starts when the leader is this close to the next checkpoint

// n racers need n - 1 checkpoints, at k/n of the course.
export const elimCheckpoints = (n, goal) => { const out = []; for (let k = 1; k < n; k++) out.push(Math.round(goal * k / n)); return out; };

// Last place among rows [{ slot, z }]: least progress; on an exact tie the higher slot goes.
export function elimLast(rows) {
  let worst = null;
  for (const r of rows) if (!worst || r.z < worst.z || (r.z === worst.z && r.slot > worst.slot)) worst = r;
  return worst;
}

export function initElim(goal) {
  const R = S.race, D = S.duel;
  R.bots.forEach((b, i) => { b.slot = D ? (D.slotOf[b.peerId] ?? i + 1) : i + 1; });
  R.elim = { cps: elimCheckpoints(R.bots.length + 1, goal), next: 0, out: [], warned: -1, over: false, meOut: false, rev: 0, meSlot: D ? D.slotOf.me : 0, meId: D ? D.meId : 'me' };
}

// Racers still in the race.
function alive() {
  const R = S.race, E = R.elim, rows = [];
  if (!E.meOut) rows.push({ slot: E.meSlot, id: E.meId, z: S.pz, me: true, name: 'You', color: '#ffcf1f' });
  for (const b of R.bots) rows.push({ slot: b.slot, id: b.peerId ?? 'b' + b.slot, z: b.z, name: b.name, color: b.color, bot: b });
  return rows;
}

// Takes one racer out. Returns { type: 'out', k } when that is you, { type: 'win' } when you are the last one standing, else null.
function take(row) {
  const R = S.race, E = R.elim;
  E.next++;
  E.out.push({ id: row.id, slot: row.slot, me: !!row.me, name: row.name, color: row.color, z: row.z, k: E.next });
  let ev = null;
  if (row.me) { E.meOut = true; ev = { type: 'out', k: E.next }; }
  else {
    if (row.bot && R.bots.includes(row.bot)) R.bots.splice(R.bots.indexOf(row.bot), 1);   // out of the race: it no longer moves, collides, drafts or takes pickups
    addPop(row.name.toUpperCase() + ' ELIMINATED', '#ff4d4f', 26);
  }
  const left = alive();
  if (left.length <= 1) { E.over = true; if (!ev && left[0] && left[0].me) ev = { type: 'win' }; }
  else if (row.me && !S.duel) E.over = true;   // against bots nothing more happens once you are out
  return ev;
}

export const elimIds = () => S.race.elim.out.map(o => o.id);

// One step of the game loop.
export function stepElim() {
  const R = S.race, E = R && R.elim, D = S.duel;
  if (!E || E.over || E.next >= E.cps.length) return null;
  if (D && D.pausers.size) return null;   // a paused room stands still: nobody is eliminated
  const rows = alive();
  if (D && rows.length === 1 && rows[0].me) { E.over = true; return { type: 'win' }; }   // everyone else has left
  if (!rows.length) return null;
  const lead = Math.max(...rows.map(r => r.z)), cp = E.cps[E.next];
  if (lead >= cp - ELIM_WARN_M && E.warned < E.next && !E.meOut) {
    E.warned = E.next;
    const last = elimLast(rows);
    banner('ELIMINATION AHEAD · ' + (last.me ? 'YOU ARE LAST' : last.name.toUpperCase() + ' IS LAST'), '#ff4d4f');
  }
  if (D && !D.elimHost) return null;   // guests wait for the host's decision
  if (lead < cp) return null;
  const ev = take(elimLast(rows));
  if (D) D.send('elim', { rev: ++E.rev, out: elimIds() });
  return ev;
}

// A guest applies the host's ordered list. Already-known entries are skipped, so repeats and reordered copies change nothing.
export function applyElimList(ids) {
  const R = S.race, E = R && R.elim, D = S.duel;
  if (!E || !Array.isArray(ids)) return null;
  let ev = null;
  for (let i = E.next; i < ids.length && i < E.cps.length && !E.over; i++) {
    const id = ids[i];
    if (typeof id !== 'string' || E.out.some(o => o.id === id)) break;
    let row = alive().find(r => r.id === id);
    if (!row) {   // already gone from this phone (left or lost connection): it still uses up this checkpoint
      const p = D && D.peers[id]; if (!p) break;
      row = { id, slot: D.slotOf[id] ?? 99, name: p.name, color: '#9ca3af', z: 0 };
    }
    ev = take(row) || ev;
  }
  return ev;
}

// Rows for the standings against bots: racers still in, furthest first, then the eliminated, latest first.
export function elimRows(live) {
  const E = S.race.elim;
  const out = E.out.slice().reverse().map(o => ({ name: o.name, z: o.z, me: o.me, color: o.color, done: false, dnf: false, out: o.k, finishT: null }));
  return [...live.sort((a, b) => b.z - a.z), ...out];
}

// The same for a friend room: still in, then eliminated (latest first), then those who left.
export function duelElimRows() {
  const D = S.duel, E = S.race.elim;
  const live = alive().map(r => ({ name: r.name, z: r.z, me: !!r.me, color: r.color, done: false, dnf: false, slot: r.slot })).sort((a, b) => b.z - a.z || a.slot - b.slot);
  const out = E.out.slice().reverse().map(o => ({ name: o.name, z: o.z, me: o.me, color: o.color, done: false, dnf: false, out: o.k }));
  const left = D.order.filter(id => D.peers[id].bye && !E.out.some(o => o.id === id)).map(id => ({ name: D.peers[id].name, z: 0, me: false, color: '#9ca3af', done: false, dnf: true }));
  return [...live, ...out, ...left];
}
