import {paintTsukiji} from './tsukiji.js';
import {paintSecurity} from './security.js';
import {paintBaggage} from './baggage.js';
import {paintGateChange} from './gatechange.js';
import {paintSkytree} from './skytree.js';
import { paintTakeshita } from './takeshita.js';
import { sameRoute } from '../config/side-routes.js';
import { drawSideRoutes, drawSideRouteMarkers } from './side-routes.js';
import { FOGCSS, LV } from '../config/levels.js';
import { clamp } from '../config/util.js';
import { ctx } from '../dom.js';
import { CAM_BACK, CAM_UP, CX, F, H, HOR, VX, VY, VZ, W, setCX, setF, setHOR, setVX, setVY, setVZ } from './camera.js';
import { FONT } from './draw.js';
import { drawPerson, rrect } from './figures.js';
import { pruneFlows, drawPops, radarTop, zoneGuide } from './hud.js';
import { drawBelts, drawGlass, drawPowerups, drawSlipstream, drawStrips, glassPanels } from './slipstream.js';
import { nycSteam } from './nycdetail.js';
import { refreshWeather, weatherGrade } from './weather.js';
import { chainShards, confetti, fxGround, shakeOffset } from './fx.js';
import { drawCars, paintAirport, paintNYC, paintShibuya } from './world.js';
import { S, calm, camBob, state } from '../sim/state.js';
import { paintBridge } from './bridge.js';
import { paintPark } from './park.js';
import { paintSubway } from './subway.js';
import { visibleGhosts } from '../sim/replay.js';
import { styleBackdrop, styleBegin, styleEnd, styleFinish, styleGround } from './style.js';



export function render() {
  refreshWeather();
  const F0 = F;
  const live = S.live && camBob && !calm;
  const watched = S.race?.spectate?.target;
  setVX(watched ? watched.x : S.camX); setVZ((watched ? watched.z : S.pz) - CAM_BACK); setVY(CAM_UP);
  setHOR(H * 0.34 + (live ? (1 - Math.cos(S.step)) * H * 0.0012 : 0));
  setCX(W / 2);
  ctx.save();
  const shake = shakeOffset(); if (shake) ctx.translate(shake[0], shake[1]);
  styleBegin();   // the cup's art style recolours everything drawn from here to styleEnd
  ctx.fillStyle = FOGCSS; ctx.fillRect(-W, -H, 3 * W, 3 * H);
  styleBackdrop();
  if (LV.id === 'airport') paintAirport(); else if (LV.id === 'nyc') paintNYC(); else if (LV.id === 'park') paintPark(); else if (LV.id === 'bridge') paintBridge(); else if (LV.id === 'subway') paintSubway(); else if (LV.id === 'takeshita') paintTakeshita(); else if(LV.id==='tsukiji')paintTsukiji(); else if(LV.id==='skytree')paintSkytree(); else if(LV.id==='security')paintSecurity(); else if(LV.id==='baggage')paintBaggage(); else if(LV.id==='gatechange')paintGateChange(); else paintShibuya();
  if (LV.id === 'nyc') { drawCars(); nycSteam(); }
  drawBelts();
  drawStrips();
  if (!S.route) drawPowerups();
  fxGround();
  if(!['tsukiji','skytree','security','baggage','gatechange'].includes(LV.id))styleGround();
  drawSideRoutes();
  for (const p of S.people) if (p.prop === 'spill' && (!S.race || sameRoute(watched || S, p))) drawPerson(p);   // puddles lie under everyone
  const list = S.people.filter(p => p.prop !== 'spill').concat([S.me], S.race ? S.race.bots : [], visibleGhosts(), glassPanels()).sort((a, b) => b.z - a.z);
  for (const p of list.filter(p => !S.race || sameRoute(watched || S,p))) { if (p.glass) drawGlass(p); else drawPerson(p); }
  drawSlipstream();
  styleEnd(); styleFinish();
  weatherGrade();
  chainShards();
  ctx.restore();
  confetti();

  if (S.boostV > 0.25 && !calm) {
    const R = Math.max(W, H), cx = W / 2, cy = H * 0.45, f = Math.floor(S.clock * 14);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.18 * S.boostV).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = i * 0.393 + 0.1, r1 = R * (0.46 + 0.12 * (((i * 7 + f) % 5) / 5)), r2 = r1 + R * 0.1;
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    }
    ctx.stroke();
  }
  setF(F0);
  if (state === 'over') {
    const a = clamp(0.35 - S.overT * 0.5, 0, 0.35);
    if (a > 0) { ctx.fillStyle = 'rgba(255,77,79,' + a.toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
  }
  if (state === 'play') { zoneGuide(); pruneFlows(); }
  if (state !== 'ready') drawPops();
  if (S.banner && state === 'play') {
    // Race HUD sits at the bottom; leave the route sign and pause control above this banner.
    const b = S.banner, a = b.t < 0.2 ? b.t / 0.2 : b.t > 2.0 ? (2.4 - b.t) / 0.4 : 1, y = S.race ? 180 : radarTop + 112;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.font = '700 24px ' + FONT;
    const mt = ctx.measureText(b.text), tw = (mt && mt.width) || 200;
    ctx.fillStyle = 'rgba(15,27,45,0.82)'; rrect(W / 2 - tw / 2 - 16, y - 18, tw + 32, 36, 8); ctx.fill();
    ctx.fillStyle = b.color; ctx.fillRect(W / 2 - tw / 2 - 16, y - 18, 5, 36);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.text, W / 2 + 2, y + 1);
    ctx.globalAlpha = 1;
  }
  drawSideRouteMarkers();
}
