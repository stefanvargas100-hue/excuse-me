// Original instrumental club set. Notes in hooks are semitones above the tonic;
// null is a rest. Each 64-bar arrangement lasts about 100 seconds.
const make = (name, bpm, root, chords, hook, bass, arp, color) => ({
  name, bpm, root, chords, hook, bass, arp, color, bars: 64
});
export const TRACKS = [
  make('Tokyo Sunset', 150, 54, [0, -4, -7, -5],
    [12,null,19,16,null,14,12,null,7,null,11,14,16,null,14,11,12,null,19,21,19,null,16,14,12,null,11,7,9,11,14,null],
    [0,6,10,14], [0,7,12,16,19,16,12,7], 'triangle'),
  make('Terminal Velocity', 148, 57, [0, -5, -4, -7],
    [12,null,12,15,19,null,22,19,17,null,15,12,10,null,7,null,12,15,19,null,24,null,22,19,17,15,null,14,12,null,10,7],
    [2,5,8,10,14], [0,12,7,15,12,19,15,7], 'sine'),
  make('Fifth Avenue Afterhours', 154, 50, [0, -2, -5, -7],
    [12,null,15,null,19,17,null,15,12,null,10,12,null,7,10,null,15,null,19,22,null,19,17,15,14,null,12,10,7,null,10,14],
    [0,3,6,10,11,14], [0,7,10,15,19,15,10,7], 'triangle'),
  make('Neon Overdrive', 158, 54, [0, -7, -4, -5],
    [12,19,null,24,22,null,19,16,14,null,16,19,12,null,11,7,12,19,24,null,26,24,22,19,16,null,14,11,12,null,19,null],
    [2,6,7,10,14], [0,7,12,19,16,12,7,4], 'sawtooth'),
  make('Glass Skyline', 152, 52, [0, -4, -5, -7],
    [19,null,16,14,12,null,7,11,14,null,16,19,23,null,19,null,24,null,23,19,16,14,null,12,11,null,14,16,19,null,14,11],
    [2,6,9,14], [0,11,16,19,23,19,16,11], 'sine'),
  make('Last Train to Sunrise', 160, 59, [0, -5, -7, -4],
    [12,null,14,15,19,null,17,15,14,10,12,null,7,null,10,14,15,19,22,null,24,22,19,17,15,null,14,10,12,null,7,null],
    [0,2,6,10,13,14], [0,7,10,12,15,19,22,19], 'triangle')
];

// Each map keeps two complementary songs instead of cycling into another city's set.
const PLAYLISTS = { airport: [1, 4], nyc: [2, 5], bridge: [5, 2], subway: [2, 5], shibuya: [0, 3] };
export function trackForMap(map, visit = 0) {
  const list = PLAYLISTS[map] || PLAYLISTS.airport;
  return list[((visit % list.length) + list.length) % list.length];
}

export function gameplayMix(s = {}, goal = 500) {
  const boost = s.burstT > 0 || s.dashT > 0 || s.draftT > 0 || s.puT > 0;
  const finish = !!s.race && !s.endless && s.pz / goal >= 0.85;
  // Races have no timer failure; endless distance must never trigger a false finale.
  const pressure = !!s.rush || (!s.race && s.timeLeft > 0 && s.timeLeft < 15);
  const recovery = s.bumpT > 0 || s.slipT > 0;
  const mode = recovery ? 'recovery' : finish ? 'finish' : boost ? 'boost' : pressure ? 'pressure' : 'cruise';
  const energy = Math.max(0.15, Math.min(1, 0.15 + Math.min(12, s.chain || 0) * 0.045 +
    (s.heat || 0) * 0.55 + (boost ? 0.35 : 0) + (pressure ? 0.25 : 0) + (finish ? 0.4 : 0)));
  return { mode, energy: recovery ? 0.18 : energy };
}

const SCALE = [0, 2, 3, 5, 7, 8, 10];
// Resolve passing tones into the song's natural minor key (ties resolve downward).
function inKey(note, tonic) {
  for (let d = 0; d <= 2; d++) {
    if (SCALE.includes(((note - d - tonic) % 12 + 12) % 12)) return note - d;
    if (SCALE.includes(((note + d - tonic) % 12 + 12) % 12)) return note + d;
  }
  return note;
}

// Pure score shared by live playback and verification. Mode changes are latched
// by the player on bar boundaries; intensity can brighten the mix continuously.
export function scoreStep(track, step, intensity = 0.15, mode = 'cruise') {
  const st = ((step % (track.bars * 16)) + track.bars * 16) % (track.bars * 16);
  const bar = Math.floor(st / 16), s = st % 16, beat = 60 / track.bpm;
  const recovery = mode === 'recovery', driving = mode === 'boost' || mode === 'finish';
  const pressure = mode === 'pressure', finale = mode === 'finish';
  // A boost or final sprint brings back the drums during the ambient breakdown.
  const breakdown = bar >= 32 && bar < 40 && !driving && !pressure;
  const build = bar >= 40 && bar < 48, intro = bar < 4, outro = bar >= 60;
  const root = track.root + track.chords[Math.floor(bar / 2) % track.chords.length];
  const energy = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0.15;
  const events = [];
  const add = (kind, gain, duration, note) => events.push({ kind, gain, duration,
    ...(note === undefined ? {} : { note: kind === 'bass' ? note : inKey(note, track.root) }) });
  if (!breakdown && s % 4 === 0 && !(build && bar === 47 && s >= 8 && !driving)) add('kick', recovery ? 0.48 : 0.72, 0.28);
  if (!breakdown && s % 4 === 2) add('hat', recovery ? 0.05 : 0.095, 0.09);
  if (!intro && !breakdown && !recovery && (s === 4 || s === 12)) add('clap', 0.12, 0.16);
  if (!intro && !outro && !breakdown && !recovery && (energy > 0.45 || driving || pressure || bar >= 48) && s % 2 === 1) add('hat', 0.03, 0.035);
  if (!breakdown && track.bass.includes(s)) add('bass', recovery ? 0.095 : 0.15, beat * (s % 4 === 2 ? 0.42 : 0.3), root - 24 < 28 ? root - 12 : root - 24);
  if (s === 0) {
    // Derive thirds and ninths from the song key rather than imposing a minor
    // voicing on every chord. Pads sit above the kick and sub bass.
    for (const n of [0, 7, 16, 26]) add('pad', breakdown ? 0.025 : 0.014, beat * 3.8, root + n);
  }
  if ((!intro || driving) && (!outro || finale) && (!build || bar < 46 || driving)) {
    const h = track.hook[st % track.hook.length];
    if (h !== null && (s % 2 === 0 || !breakdown)) {
      // Answer the hook an octave up once per phrase, not for eight bars straight.
      const lift = (bar % 8 === 7 && bar >= 24 && !recovery) || finale;
      const note = track.root + h + (lift ? 12 : 0);
      add('lead', recovery ? 0.032 : breakdown ? 0.04 : 0.055, beat * 0.48, note);
    }
  }
  if (!intro && !breakdown && !outro && !recovery && (bar >= 16 || energy > 0.65 || driving) && s % (driving ? 1 : 2) === 0) {
    add('arp', 0.021 + energy * 0.007, beat * 0.21, root + track.arp[(Math.floor(s / 2) + Math.floor(bar / 4)) % 8]);
  }
  // Pressure adds a low syncopated tom instead of merely turning everything up.
  if (pressure && !intro && (s === 3 || s === 11 || s === 14)) add('tom', 0.075, beat * 0.35, root - 12);
  if ((bar % 8 === 7 || build) && !breakdown && !recovery && s >= (build ? 8 : 14) && s % (bar === 47 ? 1 : 2) === 0) add('clap', 0.05 + (s / 16) * 0.035, 0.07);
  return events;
}
// Capture short dashes between audio scheduling frames. Changes commit only
// at the next bar; lower-priority snapshots cannot erase an unplayed accent.
export function createPerformance() {
  const priority = { cruise: 0, pressure: 1, boost: 2, finish: 3, recovery: 4 };
  let mode = 'cruise', latest = 'cruise', pending = 'cruise';
  return {
    get mode() { return mode; },
    set(mix) {
      latest = mix.mode;
      if (priority[latest] >= priority[pending]) pending = latest;
    },
    bar() { mode = pending; pending = latest; }
  };
}
