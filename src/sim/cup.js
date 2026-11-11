/* ---------- NYC Cup: the pure scoring model (no game state, no storage) ----------
   Four bot races in a fixed order. A cup is a plain object: { seed, bots: [names], rounds: [{ place, time, board? }] }.
   A round's board is optional: [{ name, me?, place, time? }] for every racer, so the table can score the bots too. */
export const CUP_RULES = 4;                       // bump when the format, points or stages change: records are filed per version
export const CUP_STAGES = [1, 5, 3, 4];              // Fifth Avenue, Subway Platform, Central Park, Brooklyn Bridge (indexes in LEVELS)
const POINTS = [10, 8, 6, 5, 4, 3, 2, 1], XP = [60, 45, 35, 25, 20, 15, 10, 5];

export const pointsFor = place => POINTS[place - 1] || 0;
export const cupXp = place => XP[place - 1] || 0;

export const newCup = ({ seed, bots }) => ({ seed: String(seed), bots: [...bots], rounds: [] });
export const cupDone = c => c.rounds.length >= CUP_STAGES.length;
export function addRound(c, r) {
  if (cupDone(c)) throw new Error('cup is complete');
  return { ...c, rounds: [...c.rounds, { place: r.place, time: r.time, board: r.board ? r.board.map(x => ({ ...x })) : null }] };
}
export const cupPoints = c => c.rounds.reduce((s, r) => s + pointsFor(r.place), 0);
export const cupTime = c => c.rounds.reduce((s, r) => s + r.time, 0);
export const cupWins = c => c.rounds.filter(r => r.place === 1).length;

// Points, then round wins, then the better (lower) final-round place, then the lower total time.
export const rankRows = rows => [...rows].sort((a, b) => b.points - a.points || b.wins - a.wins || a.last - b.last || a.time - b.time);

// Everyone's totals so far, in cup order. Rounds without a board (tests, partial data) score only the player.
export function cupTable(c) {
  const rows = new Map(), row = (name, me) => { if (!rows.has(name)) rows.set(name, { name, me: !!me, points: 0, wins: 0, last: 99, time: 0 }); return rows.get(name); };
  row('You', true); for (const n of c.bots) row(n, false);
  for (const r of c.rounds) {
    const board = r.board || [{ name: 'You', me: true, place: r.place, time: r.time }];
    for (const b of board) {
      const x = row(b.me ? 'You' : b.name, b.me);
      x.points += pointsFor(b.place); x.wins += b.place === 1 ? 1 : 0; x.last = b.place;
      x.time += b.me ? r.time : (b.time == null ? 1e6 : b.time);   // a bot that had not finished has no time: it loses time tie-breaks
    }
  }
  return rankRows([...rows.values()]);
}
export const cupPlace = c => cupTable(c).findIndex(r => r.me) + 1;

// Personal best: more points, then less time. Stored as 'points:seconds'.
export const betterCup = (a, b) => !b || a.points > b.points || (a.points === b.points && a.time < b.time);
export const encodeCup = r => r.points + ':' + r.time.toFixed(2);
export function decodeCup(s) {
  const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(String(s || ''));
  return m ? { points: +m[1], time: +m[2] } : null;
}
