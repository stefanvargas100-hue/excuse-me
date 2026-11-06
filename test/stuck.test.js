// "I got stuck on the side wall": checks that leftover input can never trap the player. node --test
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('./harness.js');

const DT = 1 / 30;
function started(mode) { const E = load(); E.setLevel(0); E.start(false, mode || 'classic'); return E; }
const key = (E, type, k) => E.fire(type, { key: k });
function walkTo(E, ticks) { for (let i = 0; i < ticks; i++) { E.S.people.length = 0; E.tick(DT); } }   // empty corridor: only the walls matter

test('holding into the wall, then pressing the other way, gets you off the wall', () => {
  const E = started();
  key(E, 'keydown', 'ArrowRight'); walkTo(E, 150);
  const wall = E.S.px; assert.ok(wall > 5, 'reached the right wall: ' + wall);
  key(E, 'keydown', 'ArrowLeft'); walkTo(E, 30);   // the right key is still down; the newest key wins
  assert.ok(E.S.px < wall - 1, 'left the wall, now at ' + E.S.px.toFixed(2));
});

test('losing focus (alt-tab, notification) releases held keys', () => {
  const E = started();
  key(E, 'keydown', 'ArrowRight'); walkTo(E, 30);
  E.fire('blur', {});
  const x = E.S.px; walkTo(E, 60);
  assert.ok(Math.abs(E.S.px - x) < 1.2, 'drifted by only the slide-out: ' + (E.S.px - x).toFixed(2));
  assert.strictEqual(E.keys.l || E.keys.r, false);
});

test('a key released while another is held does not leave a stale direction', () => {
  const E = started();
  key(E, 'keydown', 'ArrowLeft'); key(E, 'keydown', 'ArrowRight'); key(E, 'keyup', 'ArrowRight'); walkTo(E, 60);
  assert.ok(E.S.px < -0.5, 'still steering left after releasing right: ' + E.S.px.toFixed(2));
});

test('steering never leaves the corridor on any stage', () => {
  for (const lv of [0, 1, 2]) {
    const E = load(); E.setLevel(lv); E.start(false, 'classic');
    key(E, 'keydown', 'ArrowRight'); walkTo(E, 200); const r = E.S.px;
    key(E, 'keyup', 'ArrowRight'); key(E, 'keydown', 'ArrowLeft'); walkTo(E, 400); const l = E.S.px;
    assert.ok(r < E.LEVELS[lv].half && l > -E.LEVELS[lv].half, 'inside the walls on stage ' + lv + ': ' + r + ' ' + l);
  }
});
