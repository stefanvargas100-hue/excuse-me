const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
function load() {
  const code = esbuild.buildSync({ entryPoints: ['src/audio/soundtrack.js'], bundle: true, format: 'cjs', write: false }).outputFiles[0].text;
  const m = { exports: {} }; new Function('module', 'exports', code)(m, m.exports); return m.exports;
}
test('six distinct fast instrumental songs have audible hooks and safe event values throughout their arrangements', () => {
  const { TRACKS, scoreStep } = load();
  assert.equal(TRACKS.length, 6);
  assert.equal(new Set(TRACKS.map(t => t.name)).size, 6);
  assert.equal(new Set(TRACKS.map(t => JSON.stringify(t.hook))).size, 6);
  for (const track of TRACKS) {
    assert.ok(track.bpm >= 148 && track.bpm <= 160);
    let leads = 0, kicks = 0;
    for (let step = 0; step < track.bars * 16; step++) {
      const events = scoreStep(track, step, 0.15);
      for (const e of events) {
        assert.ok(Number.isFinite(e.gain) && e.gain > 0 && e.gain <= 0.85);
        assert.ok(Number.isFinite(e.duration) && e.duration > 0);
        if (e.kind === 'lead') leads++;
        if (e.kind === 'kick') kicks++;
        if (e.note !== undefined) assert.ok(e.note >= 24 && e.note <= 100);
      }
    }
    assert.ok(leads > 100, track.name + ' has a melody even during calm play');
    assert.ok(kicks > 100);
    assert.deepEqual(scoreStep(track, 0, 0.5), scoreStep(track, track.bars * 16, 0.5));
    assert.notDeepEqual(scoreStep(track, 2, 0.5), scoreStep(track, 34 * 16 + 2, 0.5), 'breakdown changes instrumentation');
  }
});

test('map playlists keep their identity across replays and long runs', () => {
  const { trackForMap } = load();
  for (const [map, expected] of [['airport', [1,4]], ['nyc', [2,5]], ['shibuya', [0,3]]]) {
    assert.deepEqual([0,1,2,3].map(n => trackForMap(map, n)), [...expected, ...expected]);
  }
});

test('gameplay distinguishes boosts, pressure, recovery and a real race finish', () => {
  const { gameplayMix } = load();
  const calm = { chain: 0, heat: 0, timeLeft: 90, pz: 0 };
  assert.equal(gameplayMix(calm, 500).mode, 'cruise');
  for (const flag of ['burstT', 'dashT', 'draftT', 'puT']) {
    const mix = gameplayMix({ ...calm, [flag]: 1 }, 500);
    assert.equal(mix.mode, 'boost'); assert.ok(mix.energy > gameplayMix(calm, 500).energy);
  }
  assert.equal(gameplayMix({ ...calm, rush: true }, 500).mode, 'pressure');
  assert.equal(gameplayMix({ ...calm, bumpT: 1, burstT: 1 }, 500).mode, 'recovery');
  assert.equal(gameplayMix({ ...calm, race: {}, pz: 460 }, 500).mode, 'finish');
  assert.equal(gameplayMix({ ...calm, endless: true, pz: 900 }, 500).mode, 'cruise');
  assert.equal(gameplayMix({ ...calm, race: {}, timeLeft: -5 }, 500).mode, 'cruise');
  assert.equal(gameplayMix({ ...calm, timeLeft: 10 }, 500).mode, 'pressure');
});

test('gameplay changes the score without silencing the beat or melody; harmony stays in key', () => {
  const { TRACKS, scoreStep } = load();
  for (const track of TRACKS) {
    const scores = mode => Array.from({length: 16}, (_, s) => scoreStep(track, 8 * 16 + s, 0.5, mode)).flat();
    assert.notDeepEqual(scores('boost'), scores('cruise'));
    assert.notDeepEqual(scores('pressure'), scores('cruise'));
    assert.notDeepEqual(scores('finish'), scores('cruise'));
    assert.ok(scores('recovery').some(e => e.kind === 'kick'));
    assert.ok(scores('recovery').some(e => e.kind === 'lead'));
    assert.ok(scores('recovery').filter(e => e.kind === 'lead').every(e => e.gain < 0.05));
    for (let s = 0; s < track.bars * 16; s++) {
      for (const e of scoreStep(track, s, 1, 'boost')) {
        if (['lead','pad','arp','bass'].includes(e.kind)) {
          assert.ok([0,2,3,5,7,8,10].includes(((e.note-track.root)%12+12)%12), track.name+' stays in its key');
        }
      }
    }
  }
});

test('brief boosts survive until the next bar and recovery takes priority', () => {
  const { createPerformance } = load();
  const p = createPerformance();
  p.set({mode:'boost', energy:0.8});
  p.set({mode:'cruise', energy:0.15});
  assert.equal(p.mode, 'cruise', 'no off-beat layer change');
  p.bar(); assert.equal(p.mode, 'boost');
  p.bar(); assert.equal(p.mode, 'cruise', 'one bar of boost, then settle');
  p.set({mode:'boost', energy:0.8}); p.set({mode:'recovery', energy:0.18});
  p.set({mode:'pressure', energy:0.7}); p.bar(); assert.equal(p.mode, 'recovery');
  p.bar(); assert.equal(p.mode, 'pressure');
});
