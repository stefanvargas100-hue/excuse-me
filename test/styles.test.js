// Art styles: each cup (group of stages) has its own look. This covers the rules, not the looks. node --test test/styles.test.js
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const { load } = require('./harness');
const ST = load(path.join(__dirname, 'entries/styles-entry.js'));
const E = load();

test('every stage is its own world: a style of its own, from the family its cup belongs to', () => {
  const families = new Map(), seen = new Set();
  for (const lv of E.LEVELS) {
    const id = ST.styleIdFor(lv);
    assert.ok(ST.STYLES[id], lv.name + ' has no style');
    assert.notEqual(id, 'classic', lv.name + ' fell back to the classic look');
    assert.ok(!seen.has(id), lv.name + ' shares its style with another stage');
    seen.add(id);
    const fam = ST.STYLES[id].family;
    assert.ok(fam, id + ' has no family');
    if (families.has(lv.city)) assert.equal(fam, families.get(lv.city), lv.name + ' is not in the same family as the rest of ' + lv.city);
    families.set(lv.city, fam);
  }
  assert.equal(new Set(families.values()).size, families.size, 'two cups share one family');
});

test('a new stage in a known cup starts with that cup\'s look until it gets a world of its own', () => {
  for (const lv of E.LEVELS) assert.equal(ST.STYLES[ST.styleIdFor({ id: 'brand-new', city: lv.city })].family, ST.STYLES[ST.styleIdFor(lv)].family);
});
test('a stage from an unknown cup keeps the classic look', () => {
  assert.equal(ST.styleIdFor({ city: 'Atlantis' }), 'classic');
});

test('the classic look leaves every colour exactly as written', () => {
  for (const c of ['#ffcf1f', 'rgb(1,2,3)', 'rgba(15,27,45,0.18)', 'red'])
    for (const fig of [false, true]) assert.equal(ST.mapColour('classic', c, fig), c);
});

test('a style recolours hex and rgb colours into a colour the canvas reads back unchanged', () => {
  for (const id of Object.keys(ST.STYLES)) {
    if (id === 'classic') continue;
    for (const fig of [false, true]) {
      assert.match(ST.mapColour(id, '#cdd5dc', fig), /^#[0-9a-f]{6}$/);
      assert.match(ST.mapColour(id, 'rgb(205,213,220)', fig), /^#[0-9a-f]{6}$/);
      assert.equal(ST.mapColour(id, '#cdd5dc', fig), ST.mapColour(id, 'rgb(205,213,220)', fig));
    }
  }
});

test('see-through colours keep their transparency, and fully clear ones are left alone', () => {
  for (const id of Object.keys(ST.STYLES)) {
    if (id === 'classic') continue;
    assert.match(ST.mapColour(id, 'rgba(15,27,45,0.18)', false), /^rgba\(\d+, \d+, \d+, 0\.18\)$/);
    assert.equal(ST.mapColour(id, 'rgba(0,0,0,0)', false), 'rgba(0,0,0,0)');
  }
});

test('anything that is not a plain colour passes through untouched', () => {
  for (const id of Object.keys(ST.STYLES)) for (const c of ['red', 'transparent', 'hsl(10,50%,50%)', '']) assert.equal(ST.mapColour(id, c, false), c);
});

test('colours stay readable: every style keeps light and dark apart, for scenery, the crowd and the player', () => {
  for (const id of Object.keys(ST.STYLES)) for (const fig of [0, 1, 2]) assert.notEqual(ST.mapColour(id, '#101010', fig), ST.mapColour(id, '#f0f0f0', fig), id + ' ' + fig);
});

test('character shapes stay within sensible limits in every style', () => {
  for (const [id, s] of Object.entries(ST.STYLES)) {
    for (const k of ['head', 'limb', 'body']) assert.ok(s.fig[k] >= 0.8 && s.fig[k] <= 1.4, id + ' ' + k);
    assert.ok(s.fig.ink >= 0 && s.fig.ink <= 2.5, id + ' ink');
    assert.ok(['soft', 'cel', 'flat'].includes(s.fig.shade), id + ' shade');
  }
});

for (const [i, name] of [[0, 'Terminal B'], [1, 'Fifth Avenue'], [2, 'Shibuya Crossing'], [3, 'Central Park'], [4, 'Brooklyn Bridge'], [5, 'Subway Platform'], [6, 'Takeshita Street']]) {
  test(name + ': drawing in its art style does not change the run', () => {
    const run = draw => {
      const G = load(undefined, { seed: 99 });
      G.setLevel(i); G.start('classic');
      for (let n = 0; n < 600; n++) { G.tick(1 / 30); if (draw && n % 4 === 0) G.render(); }
      return [G.S.pz, G.S.px, G.S.score, G.S.people.length];
    };
    assert.deepEqual(run(true), run(false));
  });
}
