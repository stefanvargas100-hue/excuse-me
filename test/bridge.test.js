const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');
function bridge(mode='classic',seed=42){const E=load(undefined,{seed});assert.equal(E.LEVELS[4]?.id,'bridge');E.setLevel(4);E.start(mode);return E;}
test('bridge appends fifth stage and supports its three looks throughout the course',()=>{
 const E=bridge();assert.equal(E.LEVELS.map(l=>l.id).join(','),'airport,nyc,shibuya,park,bridge,subway,takeshita,tsukiji,skytree');
 assert.equal(E.VARIANTS.bridge.map(v=>v[0]).join(','),'day,golden,mist');
 for(const mode of ['classic','race']){E.start(mode);for(const [v]of E.VARIANTS.bridge){E.setVariant(v);for(const z of [0,170,190,210,350,410,590,700]){E.S.pz=z;E.S.me.z=z;E.render();}}}
});
test('bridge drawing never changes the simulation',()=>{
 const go=draw=>{const E=bridge();for(let i=0;i<180;i++){E.tick(1/30);if(draw)E.render();}return JSON.stringify([E.S.pz,E.S.score,E.S.people.map(p=>[p.x,p.z])]);};assert.equal(go(true),go(false));
});
test('classic continues beyond the bridge race finish',()=>{const E=bridge();E.S.pz=700;E.S.me.z=700;E.S.people=[];E.tick(1/30);assert.ok(E.S.endless&&E.S.pz>700);});
test('bridge furniture fits the promenade and leaves the centre and tower approaches clear',()=>{
 const E=bridge();E.S.people=[];for(let z=0;z<900;z+=4)E.genChunk(z);
 for(const k of ['bench','trash','tripod','barrier'])assert.ok(E.S.people.some(p=>p.prop===k),k);
 const limits={bench:[0.7,0.26],trash:[0.28,0.28],tripod:[0.4,0.35],barrier:[0.95,0.1]};
 for(const p of E.S.people.filter(p=>p.prop)){assert.ok(p.z>=24);assert.ok(!((p.z>170&&p.z<220)||(p.z>390&&p.z<440)),'tower clear');const [hx,hz]=limits[p.prop];for(const c of p.circles){assert.ok(Math.abs(c.ox)+c.r<=hx+0.03);assert.ok(Math.abs(c.oz||0)+c.r<=hz+0.05);assert.ok(Math.abs(p.x+c.ox)-c.r>=1.5);}}
 assert.ok(E.S.people.some(p=>p.photo),'photo tourists');
});
test('both tower portals contain runners and bots, and release them afterward',()=>{
 const E=bridge('race');E.S.race.countT=0;
 for(const z of [195,415]){E.S.pz=z;E.S.px=4.2;E.S.people=[];for(const b of E.S.race.bots){b.z=z;b.x=4.2;}E.tick(1/30);assert.ok(Math.abs(E.S.px)<=2.7);for(const b of E.S.race.bots)assert.ok(Math.abs(b.x)<=2.7);}
 E.S.pz=445;E.S.px=4;E.S.people=[];E.tick(1/30);assert.ok(E.S.px>3.8);
});
test('bridge route choices avoid towers and keep records versioned',()=>{
 const E=bridge('race');const zones=E.routeZones('bridge');assert.equal(zones.length,2);
 for(const z of zones){assert.ok(Math.abs(z.z-195)>35&&Math.abs(z.z-415)>35);const op=E.routeOpenings('bridge',z);assert.ok(op.every(([a,b])=>b-a>=1));}
 E.S.race.countT=0;E.S.pz=601;E.S.people=[];E.tick(1/30);assert.ok(E.storage['excuseme_race_best_bridge:rt1:standard:r2']);
});
test('a full generated bridge race reaches Manhattan',()=>{
 const E=bridge('race');for(let i=0;i<15000&&!E.S.race.finished;i++)E.tick(1/30);assert.equal(E.S.race.finished,true);assert.ok(E.S.pz>=600);
});
