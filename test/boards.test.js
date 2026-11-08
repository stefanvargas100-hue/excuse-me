// The leaderboard screen asks for the same board names the game writes scores to. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');
const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'online', 'boards.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
const { BOARD_TABS, boardIdFor, boardTitle } = m.exports;
const util = require('./harness.js');

test('tabs: Daily, Weekly, Classic and Challenge', () => {
  assert.deepStrictEqual(BOARD_TABS.map(t => t.id), ['daily', 'weekly', 'classic', 'challenge']);
});

test('daily and weekly boards use today and this week; classic has one board per stage', () => {
  const now = new Date(), y = now.getFullYear(), mo = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  assert.strictEqual(boardIdFor('daily', 0), 'daily:' + y + '-' + mo + '-' + d);
  assert.match(boardIdFor('weekly', 0), /^weekly:\d{4}-W\d{2}$/);
  assert.strictEqual(boardIdFor('classic', 0), 'classic:airport');
  assert.strictEqual(boardIdFor('classic', 1), 'classic:nyc');
  assert.strictEqual(boardIdFor('classic', 2), 'classic:shibuya');
});

test('the same names the game writes: daily and weekly runs submit with these keys', () => {
  const fs = require('fs'), src = fs.readFileSync(path.join(__dirname, '..', 'src', 'online', 'online.js'), 'utf8');
  assert.ok(src.includes("export const boardId = (mode, key) => mode + ':' + key;"), 'board id format unchanged');
});

test('titles say what you are looking at', () => {
  assert.match(boardTitle('daily', 0), /Today/i);
  assert.match(boardTitle('weekly', 0), /week/i);
  assert.match(boardTitle('classic', 1), /New York|Fifth/i);
});

test('the challenge tab points at this UTC week and the current rules version', () => {
  const { utcWeekKey } = require('./harness.js').load();
  assert.strictEqual(boardIdFor('challenge', 0), 'wchal:' + utcWeekKey(new Date()) + ':r1');
  assert.match(boardTitle('challenge', 0), /Weekly challenge/);
});
