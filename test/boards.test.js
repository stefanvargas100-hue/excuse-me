// The leaderboard screen asks for the same board names the game writes scores to. node --test
const test = require('node:test');
const assert = require('node:assert');
const path = require('path'), esbuild = require('esbuild');
const out = esbuild.buildSync({ entryPoints: [path.join(__dirname, '..', 'src', 'online', 'boards.js')], bundle: true, format: 'cjs', write: false, logLevel: 'silent' }).outputFiles[0].text;
const m = { exports: {} }; new Function('module', 'exports', 'require', out)(m, m.exports, require);
const { BOARD_TABS, boardIdFor, boardTitle } = m.exports;
const util = require('./harness.js');

test('tabs: Daily, Weekly, Classic and Challenge', () => {
  assert.deepStrictEqual(BOARD_TABS.map(t => t.id), ['daily', 'weekly', 'classic', 'challenge', 'race']);
});

test('daily and weekly boards use today and this week; classic has one board per stage', () => {
  const now = new Date(), y = now.getFullYear(), mo = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
  assert.strictEqual(boardIdFor('daily', 0), 'daily:' + y + '-' + mo + '-' + d + ':mp3');
  assert.match(boardIdFor('weekly', 0), /^weekly:\d{4}-W\d{2}:mp3$/);
  assert.strictEqual(boardIdFor('classic', 0), 'classic:airport:cm3');
  assert.strictEqual(boardIdFor('classic', 1), 'classic:nyc:cm3');
  assert.strictEqual(boardIdFor('classic', 2), 'classic:shibuya:cm3');
});

test('menu, results and submission agree, without double suffixing', () => {
 const out=esbuild.buildSync({entryPoints:[path.join(__dirname,'../src/online/online.js')],bundle:true,format:'cjs',write:false,logLevel:'silent'}).outputFiles[0].text;
 const vm=require('vm'), m={exports:{}};vm.runInNewContext(out,{module:m,exports:m.exports,localStorage:{getItem:()=>null},window:{},document:{getElementById:()=>require('./harness').stub()},navigator:{}});
 for(const mode of ['daily','weekly']) { const board=boardIdFor(mode,0), key=board.slice(mode.length+1);assert.equal(m.exports.boardId(mode,key),board);assert.equal(m.exports.boardId(mode,key.replace(':mp3','')),board); }
});

test('titles say what you are looking at', () => {
  assert.match(boardTitle('daily', 0), /Today/i);
  assert.match(boardTitle('weekly', 0), /week/i);
  assert.match(boardTitle('classic', 1), /New York|Fifth/i);
});

test('the challenge tab points at this UTC week and the current rules version', () => {
  const { utcWeekKey } = require('./harness.js').load();
  assert.strictEqual(boardIdFor('challenge', 0), 'wchal:' + utcWeekKey(new Date()) + ':r2');
  assert.match(boardTitle('challenge', 0), /Weekly challenge/);
});
