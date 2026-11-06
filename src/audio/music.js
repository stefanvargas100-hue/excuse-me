import { LEVELS, LV } from '../config/levels.js';
import { store } from '../save/store.js';
import { pauseGame } from '../sim/game.js';
import { state } from '../sim/state.js';



/* ---------- music: a procedural 148-158 BPM track whose energy follows your chain and close calls ---------- */
export const Music = (() => {
  let windO = null, windG = null, musicOut = null, sfxOut = null, musicVol = parseFloat(store.get('excuseme_musicvol', '1')), sfxVol = parseFloat(store.get('excuseme_sfxvol', '1'));
  let ac = null, master = null, sfxBus = null, noiseBuf = null, playing = false, next = 0, step = 0, I = 0.15, target = 0.15;
  let enabled = store.get('excuseme_snd', '1') !== '0', song = LEVELS[0].music;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function init() {
    if (ac) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
      musicOut = ac.createGain(); musicOut.gain.value = musicVol; musicOut.connect(comp);
      sfxOut = ac.createGain(); sfxOut.gain.value = sfxVol; sfxOut.connect(comp);
      master = ac.createGain(); master.gain.value = 0; master.connect(musicOut);
      sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(sfxOut);
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; return false; }
    return true;
  }
  function kick(t, v, out) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(out || master); o.start(t); o.stop(t + 0.3);
  }
  function noise(t, dur, v, type, freq, q, out) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(out || master); src.start(t); src.stop(t + dur + 0.02);
  }
  function sweep(t, f0, f1, dur, v) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + dur + 0.02);
  }
  function tone(t, midi, dur, v, type, cut, out) {
    const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = type; o.frequency.value = mtof(midi); f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function schedule(st, t) {
    const s16 = 60 / song.bpm / 4, bar = Math.floor(st / 16) % 4, s = st % 16, ch = song.prog[bar];
    if (s % 4 === 0) kick(t, 0.85);
    if (s % 4 === 2) noise(t, 0.05, 0.1 + 0.1 * I, 'highpass', 8000);
    if (I > 0.4 && s % 2 === 1) noise(t, 0.03, 0.04 + 0.06 * I, 'highpass', 9000);
    if (I > 0.3 && (s === 4 || s === 12)) noise(t, 0.14, 0.05 + 0.2 * I, 'bandpass', 1800, 0.8);
    if (s % 4 === 2) tone(t, ch[0] - 24, s16 * 1.8, 0.2, 'sawtooth', 260 + 2400 * I);
    if (s % 4 === 3 && I > 0.5) tone(t, ch[0] - 24, s16 * 0.9, 0.1, 'sawtooth', 260 + 2400 * I);
    if (I > 0.55) { const arp = [0, 1, 2, 1]; tone(t, ch[arp[s % 4]] + 12 + (s >= 8 && I > 0.85 ? 12 : 0), s16 * 0.8, 0.045 * I, 'square', 1800 + 2000 * I); }
    if (s === 0) for (const n of ch) tone(t, n, s16 * 15, 0.022, 'triangle', 1200);
  }
  // Background ambience per level: crowd murmur, plus announcements, traffic, horns or crossing chirps.
  let amb = [], ambLevel = null, ambT = 0, ambT2 = 0;
  function loopNoise(type, freq, q, vol) {
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.value = 0; g.gain.setTargetAtTime(vol, ac.currentTime, 0.8);
    src.connect(f); f.connect(g); g.connect(sfxBus); src.start();
    amb.push({ src, g, f });
  }
  function ambStart(id) {
    ambStop(); ambLevel = id; ambT = 4 + Math.random() * 6; ambT2 = 10 + Math.random() * 10;
    loopNoise('bandpass', id === 'shibuya' ? 900 : 650, 0.6, 0.05);            // crowd murmur
    if (id === 'nyc') loopNoise('lowpass', 180, 0.7, 0.09);                      // traffic rumble
    if (id === 'airport') loopNoise('lowpass', 120, 0.7, 0.03);                  // air handling hum
  }
  function ambStop() {
    for (const a of amb) { try { a.g.gain.setTargetAtTime(0, ac.currentTime, 0.2); a.src.stop(ac.currentTime + 0.8); } catch (e) {} }
    amb = []; ambLevel = null;
  }
  function ambEvents(dt) {
    if (!ambLevel) return;
    for (const a of amb) if (a.f.type === 'bandpass') a.f.frequency.setTargetAtTime(560 + Math.random() * 260, ac.currentTime, 0.4);
    ambT -= dt; ambT2 -= dt;
    const t = ac.currentTime;
    if (ambLevel === 'airport' && ambT <= 0) { ambT = 18 + Math.random() * 14; tone(t, 76, 0.7, 0.05, 'sine', 4000, sfxBus); tone(t + 0.45, 72, 0.9, 0.05, 'sine', 4000, sfxBus); tone(t + 0.9, 67, 1.1, 0.05, 'sine', 4000, sfxBus); }
    if (ambLevel === 'nyc' && ambT <= 0) { ambT = 6 + Math.random() * 9; tone(t, 60, 0.22, 0.03, 'square', 1200, sfxBus); tone(t, 64, 0.22, 0.03, 'square', 1200, sfxBus); if (Math.random() < 0.5) { tone(t + 0.3, 60, 0.4, 0.03, 'square', 1200, sfxBus); tone(t + 0.3, 64, 0.4, 0.03, 'square', 1200, sfxBus); } }
    if (ambLevel === 'nyc' && ambT2 <= 0) {
      ambT2 = 25 + Math.random() * 20;
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      for (let i = 0; i < 6; i++) { o.frequency.setValueAtTime(700, t + i * 0.5); o.frequency.linearRampToValueAtTime(1050, t + i * 0.5 + 0.25); o.frequency.linearRampToValueAtTime(700, t + i * 0.5 + 0.5); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 3.1);
    }
  }
  return {
    ambStart(id) { if (!enabled || !init()) return; ambStart(id); },
    ambStop() { if (ac) ambStop(); },
    chirp() { if (!ac || !enabled || ac.state !== 'running') return; const t = ac.currentTime; for (let i = 0; i < 8; i++) tone(t + i * 0.16, i % 2 ? 98 : 101, 0.09, 0.025, 'sine', 6000, sfxBus); },
    start(m) {
      song = m || song;
      if (!enabled || !init()) return;
      if (ac.resume) ac.resume();
      playing = true; next = ac.currentTime + 0.08; step = 0; I = 0.15; target = 0.15;
      master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0.24, ac.currentTime, 0.3);
    },
    stop() { if (!ac) return; playing = false; master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, 0.25); },
    update(dt) {
      if (ac && ac.state === 'running') ambEvents(dt);
      if (!ac || !playing) return;
      I += (target - I) * Math.min(1, dt * 1.5);
      if (next < ac.currentTime - 0.2) next = ac.currentTime + 0.05;
      const s16 = 60 / song.bpm / 4;
      while (next < ac.currentTime + 0.12) { schedule(step, next); next += s16; step++; }
    },
    target(v) { target = v; },
    sfx(kind) {
      if (!ac || !enabled || ac.state !== 'running') return;
      const t = ac.currentTime;
      if (kind === 'whoosh') sweep(t, 500, 2600, 0.28, 0.22);
      else if (kind === 'razor') { sweep(t, 900, 5200, 0.22, 0.3); tone(t, 88, 0.12, 0.05, 'square', 4000, sfxBus); }
      else if (kind === 'dash') sweep(t, 300, 1500, 0.18, 0.14);
      else if (kind === 'combo') { tone(t, 81, 0.08, 0.05, 'square', 3000, sfxBus); tone(t + 0.08, 88, 0.12, 0.05, 'square', 3000, sfxBus); }
      else if (kind === 'bump') { kick(t, 1, sfxBus); noise(t, 0.25, 0.35, 'lowpass', 500, 0, sfxBus); }
      else if (kind === 'shout') { tone(t, 79, 0.1, 0.06, 'triangle', 4000, sfxBus); tone(t + 0.1, 84, 0.14, 0.06, 'triangle', 4000, sfxBus); }
      else if (kind === 'oof') { noise(t, 0.12, 0.3, 'lowpass', 900, 0, sfxBus); sweep(t, 340, 120, 0.16, 0.2); }
      else if (kind === 'perfect') { tone(t, 88, 0.09, 0.07, 'triangle', 5000, sfxBus); tone(t + 0.07, 95, 0.16, 0.07, 'triangle', 5000, sfxBus); }
      else if (kind === 'tick') tone(t, 96, 0.05, 0.06, 'square', 5000, sfxBus);
      else if (kind === 'step') noise(t, 0.035, 0.05, 'highpass', 2200, 0, sfxBus);
      else if (kind === 'slow') { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(420, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.5); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.6); }
      else if (kind === 'win') [69, 73, 76, 81].forEach((m, i) => tone(t + i * 0.1, m, 0.35, 0.07, 'triangle', 3000, sfxBus));
    },
    setEnabled(v) { enabled = v; store.set('excuseme_snd', v ? '1' : '0'); if (!v) { this.stop(); this.ambStop(); } else if (state === 'play' || state === 'paused') { this.start(LV.music); this.ambStart(LV.id); } },
    get enabled() { return enabled; },
    get musicVol() { return musicVol; },
    get sfxVol() { return sfxVol; },
    setMusicVol(v) { musicVol = v; store.set('excuseme_musicvol', String(v)); if (musicOut) musicOut.gain.value = v; },
    setSfxVol(v) { sfxVol = v; store.set('excuseme_sfxvol', String(v)); if (sfxOut) sfxOut.gain.value = v; },
    // Drafting whistle: level 0 is silent, and it climbs in pitch and volume as the slipstream builds.
    wind(level) {
      if (!ac || !enabled || ac.state !== 'running') return;
      if (!windO) {
        windO = ac.createOscillator(); windG = ac.createGain(); const f = ac.createBiquadFilter();
        windO.type = 'sine'; f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.3; windG.gain.value = 0;
        windO.connect(f); f.connect(windG); windG.connect(sfxBus); windO.start();
      }
      const t = ac.currentTime;
      windG.gain.setTargetAtTime(level > 0.03 ? 0.008 + 0.03 * level : 0, t, 0.15);
      windO.frequency.setTargetAtTime(320 + 380 * level, t, 0.2);
    },
    suspend() { if (ac && ac.suspend) ac.suspend(); },
    resume() { if (ac && ac.resume && playing) ac.resume(); }
  };
})();


export function init() {
  if (document.addEventListener) document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state === 'play') pauseGame(); else Music.suspend(); } });
}
