/* Pure Friend Cup rules. Setup is shareable JSON; rounds contain host-decided results. */
import { pointsFor, rankRows } from './cup.js';
import { BOT_NAMES } from '../config/names.js';

export const FRIEND_CUP_RULES = 2, CUP_RACES = 4, CUP_RACERS = 8, BOT_LEVELS = 3;
const text = x => typeof x === 'string' && x.trim().length > 0 && x.length <= 24;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const stagesOK = x => Array.isArray(x) && x.length === CUP_RACES && new Set(x).size === CUP_RACES && Array.from(x).every(s => Number.isInteger(s) && s >= 0 && s <= 5);
const difficultyOK = x => Number.isInteger(x) && x >= 0 && x < BOT_LEVELS;

// Copy only protocol fields. Network input is untrusted, including property access.
export function cleanSetup(raw) {
  try {
    if (!object(raw) || !text(raw.seed) || !stagesOK(raw.stages) || !difficultyOK(raw.difficulty) || !Array.isArray(raw.racers) || (raw.racers.length < 2 || raw.racers.length > CUP_RACERS)) return null;
    const racers = [], ids = new Set(), names = new Set();
    let players = 0, bots = 0;
    for (const r of raw.racers) {
      if (!object(r) || !text(r.id) || !text(r.name) || ids.has(r.id) || typeof r.bot !== 'boolean' || typeof r.left !== 'boolean' || r.left) return null;
      ids.add(r.id);
      if (r.bot) {
        if (r.id !== 'bot:' + bots++ || names.has(r.name.toLowerCase()) || !BOT_NAMES.includes(r.name)) return null;
      } else {
        if (bots || r.id.startsWith('bot:')) return null;
        players++;
      }
      names.add(r.name.toLowerCase());
      racers.push({ id: r.id, name: r.name, bot: r.bot, left: r.left });
    }
    if (players < 2 || players > CUP_RACERS) return null;
    return { seed: raw.seed, stages: [...raw.stages], difficulty: raw.difficulty, racers };
  } catch { return null; }
}

export function newFriendCup(options) {
  try {
    if (!object(options)) return null;
    const { seed, stages, difficulty, players, rand } = options;
    if (!Array.isArray(players) || players.length < 2 || players.length > CUP_RACERS || typeof rand !== 'function') return null;
    const bots = options.bots === undefined ? CUP_RACERS - players.length : options.bots;
    if (!Number.isInteger(bots) || bots < 0 || bots > CUP_RACERS - players.length) return null;
    const racers = players.map(p => ({ id: p.id, name: p.name, bot: false, left: false }));
    const used = new Set(players.map(p => typeof p.name === 'string' ? p.name.toLowerCase() : ''));
    const pool = BOT_NAMES.filter(n => !used.has(n.toLowerCase()));
    for (let i = 0; racers.length < players.length + bots; i++) {
      const value = rand();
      if (!Number.isFinite(value) || value < 0 || value >= 1) return null;
      const name = pool.splice(Math.floor(value * pool.length), 1)[0];
      racers.push({ id: 'bot:' + i, name, bot: true, left: false });
    }
    const setup = cleanSetup({ seed, stages, difficulty, racers });
    return setup ? { ...setup, rounds: [], ended: false } : null;
  } catch { return null; }
}

export const cupRacers = cup => cup.racers.map(r => ({ ...r }));
export const friendCupOver = cup => cup.ended || cup.rounds.length >= CUP_RACES;
export const currentStage = cup => friendCupOver(cup) ? null : cup.stages[cup.rounds.length];
// Race numbers are one-based in the shared seed protocol.
export const raceSeed = cup => cup.seed + ':race' + (cup.rounds.length + 1);

export function addRace(cup, rows) {
  if (friendCupOver(cup) || !Array.isArray(rows) || rows.length !== cup.racers.length) return null;
  const ids = new Set(cup.racers.map(r => r.id)), places = new Set(), byId = new Map();
  for (const r of rows) {
    if (!object(r) || !ids.delete(r.id) || !Number.isInteger(r.place) || r.place < 1 || r.place > cup.racers.length || places.has(r.place) || !(r.time === null || (typeof r.time === 'number' && Number.isFinite(r.time) && r.time >= 0 && r.time <= 3600))) return null;
    places.add(r.place);
    byId.set(r.id, { id: r.id, place: r.place, time: r.time });
  }
  return { ...cup, rounds: [...cup.rounds, cup.racers.map(r => byId.get(r.id))] };
}

export function playerLeft(cup, id) {
  return { ...cup, racers: cup.racers.map(r => r.id === id && !r.bot ? { ...r, bot: true, left: true } : { ...r }) };
}
export const hostLeft = cup => ({ ...cup, ended: true });

export function standings(cup) {
  const rows = cup.racers.map(r => ({ ...r, points: 0, wins: 0, last: 99, time: 0 }));
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const round of cup.rounds) for (const result of round) {
    const row = byId.get(result.id);
    row.points += pointsFor(result.place);
    row.wins += result.place === 1 ? 1 : 0;
    row.last = result.place;
    row.time += result.time === null ? 1e6 : result.time;
  }
  return rankRows(rows);
}
