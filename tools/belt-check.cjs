const {load}=require('../test/harness.js');
function run(seed, source) {
 const E=load(source,{seed}); E.setLevel(0); E.start(false,'race');
 const initial=E.S.people.filter(p=>!p.prop&&p.x>3.9&&p.x<=5.9&&p.z>30&&p.z<76).map(p=>({x:p.x,z:p.z}));
 for(let i=0;i<91;i++)E.tick(1/30);
 E.S.pz=28;let seen=0,bad=0,first=null;
 for(let i=0;i<360;i++){E.S.pz=Math.min(E.S.pz,29);const before=new Map(E.S.people.map(p=>[p,{x:p.x,z:p.z}]));E.tick(1/30);if(i%15)continue;for(const p of E.S.people)if(!p.prop&&p.z>30&&p.z<76){seen++;if(p.x>3.9&&p.x<=5.9){bad++;first??={frame:i,before:before.get(p),x:p.x,z:p.z,vx:p.vx,vz:p.vz,free:p.free,locked:p.locked,hz:p.hz};}}}
 return {seed,seen,bad,fail:bad>seen*.03,initial,first};
}
if(require.main===module){for(let s=1;s<=Number(process.argv[2]||100);s++){const r=run(s,process.argv[3]);console.log(JSON.stringify(r));if(r.fail)break;}}
module.exports={run};
