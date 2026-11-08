const test = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const vm = require('node:vm');

async function bundleAudio() {
  return (await esbuild.build({
    stdin: { contents: "export { Music } from './src/audio/music.js'; export { LEVELS } from './src/config/levels.js';", resolveDir: process.cwd() },
    bundle: true, format: 'iife', globalName: 'audioTest', write: false,
    plugins: [{ name: 'isolate-audio', setup(b) {
      b.onResolve({filter: /(?:sim\/(?:game|state)|save\/store)\.js$/}, args => ({path: args.path, namespace:'mock'}));
      b.onLoad({filter: /.*/, namespace:'mock'}, args => ({contents:
        args.path.includes('store') ? "export const store = {get:(k,f)=>f,set(){}};" :
        args.path.includes('state') ? "export const state = 'play';" : "export function pauseGame(){}"
      }));
    }}]
  })).outputFiles[0].text;
}
module.exports = { bundleAudio };

test('playback follows map pairs, applies gameplay on bars, and preserves song on unmute', async () => {
  let context, starts = 0;
  const param = () => ({value:0, setValueAtTime(v,t){ assert.ok(Number.isFinite(v)&&t>=0); },
    exponentialRampToValueAtTime(v,t){assert.ok(v>0&&t>=0);},
    cancelScheduledValues(){}, setTargetAtTime(v,t,c){assert.ok(Number.isFinite(v)&&t>=0&&c>0);}});
  const node = () => ({gain:param(), frequency:param(), Q:param(), pan:param(), delayTime:param(),
    connect(){}, disconnect(){}, start(t=0){assert.ok(t>=0); starts++;}, stop(t){assert.ok(t>=0);}});
  class AudioContext {
    constructor(){ context=this; this.currentTime=0; this.sampleRate=22050; this.state='running'; this.destination=node(); }
    createGain=node; createOscillator=node; createBiquadFilter=node; createDynamicsCompressor=node;
    createStereoPanner=node; createDelay=node; createBufferSource=node;
    createBuffer(ch,n){ return {getChannelData:()=>new Float32Array(n)}; }
    resume(){this.state='running';} suspend(){this.state='suspended';}
  }
  const sandbox={window:{AudioContext},console}; vm.createContext(sandbox);
  vm.runInContext(await bundleAudio(),sandbox);
  const {Music,LEVELS}=sandbox.audioTest;
  Music.start(LEVELS[2].music); assert.equal(Music.track,'Tokyo Sunset');
  Music.update(0.05);
  Music.gameplay({burstT:1,timeLeft:90},360);
  assert.equal(Music.mode,'cruise');
  for(let i=1;i<40;i++){context.currentTime=i*0.05; Music.update(0.05);}
  assert.equal(Music.mode,'boost');
  const before=starts; Music.suspend(); Music.update(1); assert.equal(starts,before);
  Music.resume();
  Music.setEnabled(false); Music.setEnabled(true); assert.equal(Music.track,'Tokyo Sunset');
  for(let i=40;i<2200;i++){context.currentTime=i*0.05; Music.update(0.05);}
  assert.equal(Music.track,'Neon Overdrive','a long Tokyo run remains in the Tokyo set');
  Music.start(LEVELS[0].music); assert.equal(Music.track,'Terminal Velocity');
  Music.start(LEVELS[0].music); assert.equal(Music.track,'Glass Skyline');
  Music.start(LEVELS[1].music); assert.equal(Music.track,'Fifth Avenue Afterhours');
});
