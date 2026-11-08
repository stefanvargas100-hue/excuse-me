import { addPop } from './scoring.js';
import { banner } from './actions.js';
import { S } from './state.js';

/* ---------- elimination races ----------
   The field races as usual, but at evenly spaced checkpoints the racer furthest behind is out. When the lead racer crosses a
   checkpoint, exactly one racer (last place at that moment) is eliminated; a checkpoint never eliminates two, and a step never
   handles more than one checkpoint. The last racer left wins on the spot. Ties: greatest progress survives; an exact tie
   keeps the lower start slot (you are slot 0). */
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
  const R = S.race;
  R.bots.forEach((b, i) => { b.slot = i + 1; });
  R.elim = { cps: elimCheckpoints(R.bots.length + 1, goal), next: 0, out: [], warned: -1, over: false };
}

function alive() {
  const R = S.race, rows = [];
  if (!R.elim.out.some(o => o.me)) rows.push({ slot: 0, z: S.pz, me: true, name: 'You', color: '#ffcf1f' });
  for (const b of R.bots) rows.push({ slot: b.slot, z: b.z, name: b.name, color: b.color, bot: b });
  return rows;
}

// One step. Returns { type: 'out', k } when you are eliminated, { type: 'win' } when you are the last one standing, else null.
export function stepElim() {
  const R = S.race, E = R && R.elim;
  if (!E || E.over || E.next >= E.cps.length) return null;
  const rows = alive(), lead = Math.max(...rows.map(r => r.z)), cp = E.cps[E.next];
  if (lead >= cp - ELIM_WARN_M && E.warned < E.next) {
    E.warned = E.next;
    const last = elimLast(rows);
    banner('ELIMINATION AHEAD · ' + (last.me ? 'YOU ARE LAST' : last.name.toUpperCase() + ' IS LAST'), '#ff4d4f');
  }
  if (lead < cp) return null;
  const loser = elimLast(rows);
  E.next++;
  E.out.push({ slot: loser.slot, me: !!loser.me, name: loser.name, color: loser.color, z: loser.z, k: E.next });
  if (loser.me) { E.over = true; return { type: 'out', k: E.next }; }
  R.bots.splice(R.bots.indexOf(loser.bot), 1);   // out of the race: it no longer moves, collides, drafts or takes pickups
  addPop(loser.name.toUpperCase() + ' ELIMINATED', '#ff4d4f', 26);
  if (rows.length - 1 === 1) { E.over = true; return { type: 'win' }; }
  return null;
}

// Rows for the standings: racers still in, furthest first, then the eliminated, latest first.
export function elimRows(live) {
  const E = S.race.elim;
  const out = E.out.slice().reverse().map(o => ({ name: o.name, z: o.z, me: o.me, color: o.color, done: false, dnf: false, out: o.k, finishT: null }));
  return [...live.sort((a, b) => b.z - a.z), ...out];
}
