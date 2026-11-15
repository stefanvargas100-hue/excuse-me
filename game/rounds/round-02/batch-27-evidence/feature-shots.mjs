// Batch 27: one screenshot of each new stage feature in an emulated 390x844 phone (2x). Emulated, not a real phone.
//   node game/rounds/round-02/batch-27-evidence/feature-shots.mjs [out-folder]   (default: this folder)
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(process.argv[2] || dirname(fileURLToPath(import.meta.url)));
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await context.route(/supabase\.co/, r => r.abort());
  await context.addInitScript(() => { try { localStorage.setItem('excuseme_tut', '1'); } catch (e) {} });
  const page = await context.newPage();
  await page.goto(url); await page.waitForFunction(() => !!window.__excuse);
  await page.evaluate(() => document.fonts.ready);

  // Each scene: a fixed seed, a race with no bots, the camera parked where the feature is in view, then one frame drawn.
  const scenes = {
    'tsukiji-porter': () => {
      const E = window.__excuse, S = () => E.S;
      E.setLevel(7); E.start('race'); S().race.countT = 0; S().race.bots.length = 0;
      S().eventT = 999;
      const p = S().people.filter(q => q.porter).sort((a, b) => a.z - b.z)[0];
      for (let i = 0; i < 150; i++) { S().pz = p.z - 4; S().me.z = S().pz; S().px = p.x + (p.x > 0 ? -1.5 : 1.5); S().ghostT = 9; E.tick(1 / 60); }   // a few seconds: shoppers stop at the stalls
      E.render(); return 'porter at x ' + p.x.toFixed(2);
    },
    'skytree-lift': () => {
      const E = window.__excuse, S = () => E.S;
      E.setLevel(8); E.start('race'); S().race.countT = 0; S().race.bots.length = 0;
      S().eventT = 999; E.runEvent('lift'); const L = S().lifts;
      while (S().time < L[2].out + 4) { S().pz = Math.max(0, L[0].z - 40); S().me.z = S().pz; S().ghostT = 9; E.tick(1 / 60); }
      S().pz = L[0].z - 9; S().me.z = S().pz; S().px = -1; E.tick(1 / 60); E.render(); return L.length + ' passengers';
    },
    'baggage-waiters': () => {
      const E = window.__excuse, S = () => E.S;
      E.setLevel(10); E.start('race'); S().race.countT = 0; S().race.bots.length = 0; S().eventT = 999;
      const w = S().people.filter(q => q.waiting).sort((a, b) => a.z - b.z)[0] || (() => { for (let z = 14; z < 200; z += 4) E.genChunk(z); return S().people.filter(q => q.waiting).sort((a, b) => a.z - b.z)[0]; })();
      S().pz = w.z - 8; S().me.z = S().pz; S().px = -3; E.tick(1 / 60); E.render(); return 'group at z ' + w.z.toFixed(1);
    },
    'baggage-spill-past-group': () => {
      const E = window.__excuse, S = () => E.S;
      E.setLevel(10); E.start('race'); S().race.countT = 0; S().race.bots.length = 0; S().eventT = 999;
      for (let z = 14; z < 300; z += 4) E.genChunk(z);
      const g = S().people.filter(q => q.waiting).sort((a, b) => a.z - b.z)[1];
      S().pz = g.z - 74; E.runEvent('bagspill');   // the spill lands on the group's stretch and steps its lanes past the group
      S().pz = g.z - 12; S().me.z = S().pz; S().px = -2.5;
      for (let i = 0; i < 150; i++) { S().pz = g.z - 12; S().me.z = S().pz; S().ghostT = 9; E.tick(1 / 60); }
      E.render(); return 'spill beside group at z ' + g.z.toFixed(1);
    },
    'gatechange-boards': () => {
      const E = window.__excuse, S = () => E.S;
      E.setLevel(11); E.start('race'); S().race.countT = 0; S().race.bots.length = 0;
      S().pz = 40; S().me.z = 40; for (let i = 0; i < 60; i++) { S().pz = 40; S().me.z = 40; E.tick(1 / 60); }
      E.runEvent('gatechange'); S().px = 2; E.tick(1 / 60); E.render(); return 'boards until ' + S().boardFlipUntil.toFixed(1);
    }
  };
  for (const [name, fn] of Object.entries(scenes)) {
    const note = await page.evaluate(`(() => {
      let s = 2727; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      return (${fn.toString()})();
    })()`);
    for (const sel of ['#tutSkip']) if (await page.locator(sel).isVisible().catch(() => false)) await page.locator(sel).click();
    await page.screenshot({ path: resolve(out, name + '.jpg'), type: 'jpeg', quality: 82 });
    console.log(name + ': ' + note);
  }
} finally { await browser?.close(); await server.close(); }
