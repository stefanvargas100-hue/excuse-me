const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness.js');
const park = () => { const E = load(undefined, {seed: 33}); assert.equal(E.LEVELS[3]?.id, 'park'); E.setLevel(3); E.start('classic'); return E; };
test('Central Park appends a playable stage without changing existing indexes', () => {
  const E = park(); assert.equal(E.LEVELS.slice(0,4).map(l => l.id).join(','), 'airport,nyc,shibuya,park');
  assert.equal(E.LV.keep, 1); assert.equal(E.S.endless, true);
  E.S.pz = 650; E.S.me.z = 650; E.tick(1/30); assert.ok(E.S.pz > 650); E.render();
});
test('park variants draw at the promenade, bridge and race finish', () => {
  const E = park(); assert.equal(E.VARIANTS.park.map(v => v[0]).join(','), 'day,autumn,golden');
  E.start('race');
  for (const [v] of E.VARIANTS.park) { E.setVariant(v); for(const z of [0, 240, 258, 280, 510, 539]) { E.S.pz=z; E.S.me.z=z; assert.doesNotThrow(() => E.render()); } }
});
test('drawing park scenery leaves the run deterministic', () => {
  const run = draw => { const E=park(); for(let i=0;i<180;i++){E.tick(1/30);if(draw)E.render();} return JSON.stringify([E.S.pz,E.S.score,E.S.people.map(p=>[p.x,p.z])]); };
  assert.equal(run(true), run(false));
});
test('park furniture appears, fits its artwork, and leaves a clear middle route', () => {
  const E=park(); E.S.people=[];
  for(let z=0;z<900;z+=4)E.genChunk(z);
  const props=E.S.people.filter(p=>p.prop);
  for(const kind of ['bench','lamp','trash','pretzel','bikes','easel']) assert.ok(props.some(p=>p.prop===kind),kind);
  const sizes={bench:[0.7,0.26],lamp:[0.13,0.13],trash:[0.28,0.28],pretzel:[0.45,1],bikes:[0.75,0.45],easel:[0.45,0.35]};
  for(const p of props){assert.ok(p.z>=24); const [hx,hz]=sizes[p.prop]; assert.ok(hx, p.prop); for(const c of p.circles){assert.ok(Math.abs(c.ox)+c.r<=hx+0.03,p.prop+' width'); assert.ok(Math.abs(c.oz||0)+c.r<=hz+0.03,p.prop+' depth'); assert.ok(Math.abs(p.x+c.ox)-c.r>=1.5,p.prop+' centre clearance');}}
  assert.ok(E.S.people.some(p=>p.dog),'dog walkers');
  assert.ok(E.S.people.some(p=>p.jogger && p.x>0),'joggers keep right');
});
test('seeded park furniture repeats and all furniture draws', () => {
  const go=()=>{const E=park();E.S.people=[];E.S.seed='park-fixed';for(let z=24;z<500;z+=4)E.genChunk(z);return E;};
  const a=go(),b=go(); const sig=E=>JSON.stringify(E.S.people.map(p=>[p.prop,p.x,p.z])); assert.equal(sig(a),sig(b));
  for(const p of a.S.people.filter(p=>p.prop)){a.S.pz=p.z-8;a.S.me.z=a.S.pz;assert.doesNotThrow(()=>a.render());}
});
test('bridge railings contain player and bots, then release them beyond the bridge', () => {
  for(const mode of ['classic','race']) {const E=park(); E.start(mode); for(let i=0;i<120;i++)E.tick(1/30); E.S.pz=250;E.S.px=5;E.S.me.x=5;E.S.me.z=250;E.S.people=[];
    if(E.S.race)for(const b of E.S.race.bots){b.z=250;b.x=5;}
    E.tick(1/30);assert.ok(E.S.px<=3,'player inside bridge');
    if(E.S.race)for(const b of E.S.race.bots)assert.ok(b.x<=3,'bot inside bridge');
    E.S.pz=290;E.S.px=5;E.S.people=[];E.tick(1/30);assert.ok(E.S.px>4.8,'wide route restored');
  }
});
test('park carriage crosses, draws, has a fitted footprint and clears the path', () => {
  const E=park(); E.S.people=[];E.runEvent('carriage');const p=E.S.people.find(p=>p.prop==='carriage');assert.ok(p);
  for(const c of p.circles){assert.ok(Math.abs(c.ox)+c.r<=5);assert.ok(Math.abs(c.oz||0)+c.r<=0.75);}
  assert.doesNotThrow(()=>E.render());for(let i=0;i<900;i++){E.S.people=[p];E.S.pz=p.z-10;E.tick(1/30);}
  assert.ok(p.dead,'carriage exits');
});
test('crowds stay on the bridge and a park race can reach Bethesda', () => {
  const E=park(); E.start('race'); for(let i=0;i<120;i++)E.tick(1/30);
  E.S.people=[];for(let z=240;z<272;z+=4)E.genChunk(z);E.S.pz=250;E.S.me.z=250;E.tick(1/30);
  for(const p of E.S.people.filter(p=>!p.prop&&p.z>=240&&p.z<=276))assert.ok(Math.abs(p.x)<=3.05,'crowd inside railing');
  E.S.pz=E.LV.goal-0.05;E.S.me.z=E.S.pz;E.S.people=[];E.tick(1/30);assert.ok(E.S.race.finished,'race finished');assert.doesNotThrow(()=>E.render());
});
test('a complete park race reaches Bethesda through generated crowds', () => {
  const E=park();E.start('race');
  for(let i=0;i<12000&&!E.S.race.finished;i++)E.tick(1/30);
  assert.equal(E.S.race.finished,true);assert.ok(E.S.pz>=540);assert.ok(E.S.race.board.length>=4);
});
