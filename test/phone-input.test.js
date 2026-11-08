const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

function touch(game, type, cancelable = true) {
  const ev = { type, cancelable, defaultPrevented: false, touches: [],
    preventDefault() { if (this.cancelable && !this.passive) this.defaultPrevented = true; } };
  game.element('game').dispatchEvent(ev);
  return ev.defaultPrevented;
}

test('repeated dash touches block native pan and zoom throughout a race', () => {
  const g = load(null, { dom: true }); g.start('race');
  for (let tap = 0; tap < 6; tap++) {
    for (const phase of ['touchstart', 'touchmove', 'touchend'])
      assert.equal(touch(g, phase), true, `${phase} must suppress native gestures`);
  }
  assert.equal(touch(g, 'touchmove', false), false, 'noncancelable browser events are left alone');
  g.pauseGame();
  assert.equal(touch(g, 'touchstart'), false, 'menu gestures remain available');
});

test('submitting a room code dismisses input focus before joining', async () => {
  const g = load(null, { dom: true });
  await g.element('friendJoinBtn').click();
  const input = g.element('friendInput'); let blurred = false;
  const original = input.blur; input.blur = () => { blurred = true; original(); };
  input.value = '----'; await g.element('friendGo').click();
  assert.equal(blurred, true, 'even a failed join dismisses the phone keyboard');
});

test('starting a race releases any remaining menu input focus', () => {
  const g = load(null, { dom: true });
  const input = g.element('friendInput'); input.focus(); let blurred = false;
  const original = input.blur; input.blur = () => { blurred = true; original(); };
  g.start('race');
  assert.equal(blurred, true, 'hidden menu input must not retain keyboard focus');
});
