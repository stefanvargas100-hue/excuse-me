import { Music, init as initAudio } from './audio/music.js';
import { LEVELS, LV, setLevel } from './config/levels.js';
import { $ } from './dom.js';
import { action, init as initInput, keys, onTap, touches } from './input/input.js';
import { init as initCamera } from './render/camera.js';
import { drawPreview, init as initPreview } from './render/preview.js';
import { render } from './render/render.js';
import { shout } from './sim/actions.js';
import { hasPlayed, pauseGame, quitRun, start, tick, toMenu } from './sim/game.js';
import { genChunk, mk, runEvent } from './sim/people.js';
import { draftCharge, draftMul, racePace } from './sim/race.js';
import { powerMul } from './sim/powerups.js';
import { setTopGhostFetcher, visibleGhost, visibleGhosts } from './sim/replay.js';
import { BODIES, BUILDS, ITEM_STATS, fitOf, effects, statsOf } from './config/stats.js';
import { LOOK } from './save/progress.js';
import { rotatingList } from './save/rotating.js';
import { account, setLevelUpListener } from './save/level.js';
import { modOf } from './sim/modifiers.js';

import { CHALLENGES, isLocked, nextGoal, tallySnapshot, setRotatingListener, setUnlockListener, tallyOf, track, trackMax } from './save/challenges.js';
import { addPop, nearMul, onPass } from './sim/scoring.js';
import { S, calm, reset, state } from './sim/state.js';
import { buildLevels, hud, init as initMenus } from './ui/menus.js';
import { init as initScreens } from './ui/screens.js';
import { weekKey } from './config/util.js';
import { duelReceive, roomLevel, setRoomLevel, hostRoom, hostStart, injectRoomMessage, joinRoom, leaveRoom, lobbyPlayers, lobbyStatus, rematchState, requestRematch, startDuel, useRoomFactory } from './online/duel.js';
import { initFriend } from './ui/friend.js';
import { pickVariant, setVariant, variantOf, VARIANTS } from './render/weather.js';



let lastT = performance.now();

const dtHist = [];

function frame(now) {
  const raw = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  dtHist.push(raw); if (dtHist.length > 4) dtHist.shift();
  const dt = raw > 0.04 ? raw : dtHist.reduce((a, b) => a + b, 0) / dtHist.length;   // average the last few frames; keep real long gaps
  // slow motion runs on real time so it always lasts the same
  S.slowT -= dt; S.slow += ((S.slowT > 0 ? 1 : 0) - S.slow) * Math.min(1, dt * (S.slowT > 0 ? 14 : 5));
  S.breakFlash = Math.max(0, S.breakFlash - dt);
  let gdt = dt * (1 - 0.68 * S.slow);
  if (S.hitStop > 0) { S.hitStop -= dt; if (!calm) gdt = 0; }
  Music.wind(state === 'play' && S.race ? (S.draftT > 0 ? 0.7 : draftCharge(S)) : 0);
  const n = Math.max(1, Math.ceil(gdt / 0.0167));
  if (state !== 'paused') for (let i = 0; i < n; i++) tick(gdt / n);
  render(); hud();
  Music.update(dt);
  if (!$('look').hidden) drawPreview(now);
  requestAnimationFrame(frame);
}

// A challenge finished: say so on the spot, and list it on the end screen.
setRotatingListener(c => { if (!S) return; addPop('CHALLENGE DONE: ' + c.text.toUpperCase(), '#2ec4b6', 22); Music.sfx('win'); });
setLevelUpListener((l, rewards) => { if (!S) return; addPop('LEVEL UP! ' + l, '#ffd166', 30); for (const r of rewards) addPop('NEW ' + r.kind.toUpperCase() + ': ' + (r.name || r.glyph), '#ffd166', 20); Music.sfx('win'); });
setUnlockListener(c => { if (!S) return; S.unlocked.push(c.name); addPop('UNLOCKED: ' + c.name.toUpperCase(), '#ff6b9d', 26); Music.sfx('win'); });

// Wire up listeners only now that every module has finished loading (keeps load order from mattering).
initScreens();
initCamera();
initInput();
initPreview();
initAudio();
initMenus();
initFriend();

reset();

buildLevels();

window.__excuse = { setVariant, variantOf, VARIANTS, pickVariant, setTopGhostFetcher, visibleGhosts, visibleGhost, genChunk, touches, onPass, nearMul, roomLevel, setRoomLevel, get LV() { return LV; }, injectRoomMessage, lobbyPlayers, lobbyStatus, draftMul, powerMul, xp: () => account.xp(), account, startDuel, duelReceive, hostRoom, hostStart, joinRoom, leaveRoom, rematchState, requestRematch, useRoomFactory, nextGoal, tallySnapshot, modOf, rotatingList, tick, reset, start, setLevel, get S() { return S; }, get state() { return state; }, keys, action, onTap, render, drawPreview, LEVELS, runEvent, shout, weekKey, hasPlayed, pauseGame, quitRun, toMenu, CHALLENGES, isLocked, tallyOf, track, trackMax, racePace, fitOf, BODIES, BUILDS, ITEM_STATS, effects, statsOf, LOOK, mkPerson: (x, z) => mk(x, z, { hx: 0, hz: 1, v0: 1 }) };

requestAnimationFrame(frame);

// Review tool: add ?lineup to the address to see every body and clothing item side by side.
if (typeof location !== 'undefined' && location.search.includes('debug')) import('./dev/debugview.js').then(m => m.openDebug());
if (typeof location !== 'undefined' && location.search.includes('lineup')) import('./dev/lineup.js').then(m => m.openLineup());
