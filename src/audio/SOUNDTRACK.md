# Instrumental club soundtrack

Six original procedural compositions, synthesized locally through Web Audio. No vocals, samples, downloads, or external music services.

| Track | BPM | Direction |
| --- | --- | --- |
| Tokyo Sunset | 150 | Warm melodic night drive; rising hook and spacious plucks |
| Terminal Velocity | 148 | Bright minor-key club pulse with syncopated bass |
| Fifth Avenue Afterhours | 154 | Skipping bass groove and descending late-night melody |
| Neon Overdrive | 158 | Forward saw lead, climbing arpeggio, harder drop |
| Glass Skyline | 152 | Bell-like melody over extended minor harmony |
| Last Train to Sunrise | 160 | Fast closing track with a climbing, answering hook |

Each song has 64 bars (96�104 seconds): four-bar opening, melody entrance, arpeggio layers from bar 17, occasional upper-register phrase answers from bar 25, eight-bar breakdown from bar 33, eight-bar build from bar 41, full return from bar 49, and four-bar exit. The next song starts at the arrangement boundary, using its own tempo. This is a beat-boundary handoff, not a DJ crossfade.

Map sets stay local throughout a run and alternate their opener on replay:

- Airport: Terminal Velocity / Glass Skyline ? bright plucks and open pads.
- New York: Fifth Avenue Afterhours / Last Train to Sunrise ? busier bass and faster grooves.
- Tokyo: Tokyo Sunset / Neon Overdrive ? warm night-drive melody and a harder neon lead.

Gameplay changes commit on bar boundaries, without changing the current song's tempo:

- Chains and close calls smoothly brighten bass and add percussion.
- Bursts, dashes, slipstream boosts and powerups bring in faster arpeggios. Short actions are captured until the next bar.
- Rush hour and the last 15 seconds of a timed classic run add syncopated toms and hats. A race's unused timer cannot trigger this.
- The final 15% of a race lifts the hook an octave and restores drums even in a breakdown. Endless distance cannot trigger a false finale.
- Bumps and slips take priority for a softer bar, keeping the pulse and melody while reducing percussion.
- Music returns to its normal arrangement when the action settles. Mute/unmute preserves the song and sequence position; pause suspends scheduling.

Harmony now uses a consistent natural minor scale for bass, chord voicings, hooks and arpeggios. Pads sustain before release, melodic delays are filtered, and pad/arpeggio panning creates stereo space. Claps and lead levels are reduced to leave space for gameplay sounds. Existing music/SFX volume and mute controls apply.

Verification: score tests cover all six full arrangements, note/gain/duration bounds, distinct hooks, low-intensity melodies, key consistency, map selection, gameplay priorities, and short-action capture. A playback integration test checks the audio graph's scheduling, bar changes, suspended context, mute/unmute and map-specific rotation over a long run. The full game suite passed (336 tests), followed by the additional playback test.

Chrome's native OfflineAudioContext also rendered 14-second opening-to-boost excerpts of each song, including the actual playback graph, compressor, filters, delay and stereo panning. All six produced finite, non-silent stereo samples without clipping (peaks 0.256?0.279 at default volume; RMS 0.0385?0.0401). These excerpts do not establish peak levels across every possible arrangement or volume setting. Automated rendering is not a listening pass: headphone/small-speaker balance and musical feel still need human audition.
