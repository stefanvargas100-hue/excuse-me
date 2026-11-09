const test = require('node:test');
const assert = require('node:assert/strict');
test('a simulated Cup completes all four races after the host leaves race two', async()=>{
  const {simulate}=await import('../tools/room-sim.mjs');
  const r=await simulate(3,true,2);
  for(const g of r.active) {
    assert.equal(g.friendCup().rounds.length,4);
    assert.equal(g.friendCup().ended,false);
    assert.equal(g.lobbyPlayers().filter(p=>p.host).length,1);
    assert.equal(g.lobbyPlayers().find(p=>p.host).id,r.active[0].lobbyPlayers().find(p=>p.me).id);
  }
});
