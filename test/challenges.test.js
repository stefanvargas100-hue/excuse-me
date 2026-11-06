// Challenges and the clothing catalogue. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;

test('every unlockable has a challenge, and every challenge rewards a real option', () => {
  const E = load();
  for (const c of E.CHALLENGES) {
    assert.ok(c.target > 0 && c.text, c.id);
    const slot = E.ITEM_STATS[c.key];
    if (slot) assert.ok(c.val in slot, c.id + ' has stats');
  }
  const ids = E.CHALLENGES.map(c => c.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'one challenge per item');
});

test('the catalogue is wide: each slot has several starter and unlockable choices', () => {
  const E = load();
  for (const slot of ['hat', 'shirtType', 'pantsType', 'shoeType', 'pack']) {
    const all = Object.keys(E.ITEM_STATS[slot]), locked = all.filter(v => E.isLocked(slot, v));
    assert.ok(all.length - locked.length >= 1, slot + ' has something free');
    assert.ok(locked.length >= 3 || slot === 'pack', slot + ' has things to earn');
  }
});

test('stars no longer unlock anything: only finishing the challenge does', () => {
  const E = load();
  assert.strictEqual(E.isLocked('hat', 'crown'), true);
  for (let i = 0; i < 9; i++) E.track('winsMH');
  assert.strictEqual(E.isLocked('hat', 'crown'), true, '9 of 10 wins is not enough');
  E.track('winsMH');
  assert.strictEqual(E.isLocked('hat', 'crown'), false);
});

test('playing builds tallies: passes, and best distance in classic only', () => {
  const E = load(); E.setLevel(2); E.start('classic');
  for (let i = 0; i < 600 && E.state === 'play'; i++) { for (const p of E.S.people) if (Math.abs(p.z - E.S.pz) < 0.9) p.x = E.S.px + 2; E.tick(DT); }
  assert.ok(E.tallyOf('far_shibuya') >= 20, 'distance: ' + E.tallyOf('far_shibuya'));
  assert.ok(E.tallyOf('passes') > 0, 'passes: ' + E.tallyOf('passes'));
  const R = load(); R.setLevel(2); R.start('race');
  for (let i = 0; i < 300; i++) R.tick(DT);
  assert.strictEqual(R.tallyOf('far_shibuya'), 0, 'a race does not count toward classic distance');
});

test('tallies survive into the next run, and an unlock is announced on the spot', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  E.track('bursts', 199);
  E.start('classic');
  assert.strictEqual(E.tallyOf('bursts'), 199);
  E.track('bursts');
  assert.ok(E.S.unlocked.includes('80s acid wash'));
  assert.strictEqual(E.isLocked('pantsType', 'acid'), false);
});

test('winning a race counts by difficulty, and a clean win is its own challenge', () => {
  const win = lvl => {
    const E = load(); E.storage.excuseme_botlvl = String(lvl); E.setLevel(2); E.start('race');
    for (let i = 0; i < 91; i++) E.tick(DT);
    E.S.race.bots.length = 0; E.S.pz = E.LEVELS[2].goal - 0.5; E.S.people.length = 0; E.S.nextChunk = 1e9;
    for (let i = 0; i < 30 && E.state === 'play'; i++) { E.S.people.length = 0; E.tick(DT); }
    return E;
  };
  const easy = win(0), hard = win(2);
  assert.strictEqual(easy.tallyOf('wins'), 1);
  assert.strictEqual(easy.tallyOf('winsMH'), 0);
  assert.strictEqual(easy.tallyOf('cleanWins'), 0);
  assert.strictEqual(hard.tallyOf('winsHard'), 1);
  assert.strictEqual(hard.tallyOf('winsMH'), 1);
  assert.strictEqual(hard.tallyOf('cleanWins'), 1);
});

test('every clothing combination draws without errors', () => {
  const E = load(); E.setLevel(0); E.start('classic');
  for (let i = 0; i < 30; i++) E.tick(DT);
  const I = E.ITEM_STATS;
  for (const shirtType of Object.keys(I.shirtType)) for (const pantsType of Object.keys(I.pantsType)) {
    const shoes = Object.keys(I.shoeType), hats = Object.keys(I.hat), packs = Object.keys(I.pack), n = shirtType.length + pantsType.length;
    Object.assign(E.LOOK, { shirtType, pantsType, shoeType: shoes[n % shoes.length], hat: hats[n % hats.length], pack: packs[n % packs.length], showHead: '1' });
    E.reset(); E.tick(DT); E.render(); E.drawPreview(1000);
  }
});
