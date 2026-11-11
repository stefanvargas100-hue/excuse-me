import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output = 'game/rounds/round-02/batch-12c-evidence';
const server = await createServer({ base: '/playtest/', server: { host: '127.0.0.1', port: 5179, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const external = [];
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:5179') { external.push(url.href); return route.abort(); }
      return route.continue();
    });
    await page.addInitScript(() => {
      localStorage.setItem('excuseme_tut', '1');
      localStorage.setItem('excuseme_best_airport', '123');
      window.swCalls = 0;
      if (navigator.serviceWorker) navigator.serviceWorker.register = () => { window.swCalls++; return Promise.reject(Error('unexpected SW registration')); };
    });
    await page.goto('http://127.0.0.1:5179/playtest/');
    await page.waitForFunction(() => window.__excuse);
    const channel = await page.evaluate(async () => {
      const { PLAYTEST } = await import('/playtest/src/config/channel.js');
      const { store } = await import('/playtest/src/save/store.js');
      store.set('batch12c_probe', 'prefixed');
      const online = await import('/playtest/src/online/online.js');
      online.submitBestRun('airport', 123, [0, 0, 0, 20]);
      const rows = await online.loadBoard('classic:airport:cm2');
      return { PLAYTEST, path: location.pathname, tag: document.querySelector('#playtestTag')?.textContent,
        seeded: localStorage.getItem('playtest:seeded'), liveProbe: localStorage.getItem('batch12c_probe'),
        playtestProbe: localStorage.getItem('playtest:batch12c_probe'), liveBest: localStorage.getItem('excuseme_best_airport'),
        rows, caches: await caches.keys(), registrations: (await navigator.serviceWorker.getRegistrations()).length,
        controlled: !!navigator.serviceWorker.controller, swCalls: window.swCalls };
    });
    assert.equal(channel.PLAYTEST, true); assert.equal(channel.path, '/playtest/'); assert.match(channel.tag, /^PLAYTEST /);
    assert.equal(channel.seeded, '1'); assert.equal(channel.liveProbe, null); assert.equal(channel.playtestProbe, 'prefixed');
    assert.equal(channel.liveBest, '123'); assert.deepEqual(channel.rows, []);
    assert.deepEqual(channel.caches, []); assert.equal(channel.registrations, 0); assert.equal(channel.controlled, false); assert.equal(channel.swCalls, 0);
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('playtest:excuseme_online_queue') || '[]').some(r => r.board === 'classic:airport:cm2'));
    assert.equal(await page.evaluate(() => localStorage.getItem('excuseme_online_queue')), null);
    for (const build of ['small', 'medium', 'large']) {
      const data = await page.evaluate(build => {
        const e = window.__excuse; e.LOOK.build = build; e.start('classic');
        e.S.people = []; e.S.nextChunk = 1e9; e.S.pz = 50;
        e.S.pickups = [{ x: 0, z: 58, type: 'boost', taken: false }]; e.render();
        return { build, stats: e.S.moveStats, pickup: e.S.pickups[0] };
      }, build);
      await page.screenshot({ path: `${output}/${width}-${build}-pickup.png` });
      const effect = await page.evaluate(() => {
        const e = window.__excuse, s = e.S; s.pickups[0].z = s.pz + .01; e.tick(.01);
        s.chain = 50; s.lastPassT = s.time; e.onPass(e.mkPerson(.65, s.pz)); e.render();
        return { boost: e.powerMul(s), slow: s.slowT, hitStop: s.hitStop, combo: s.chain };
      });
      await page.screenshot({ path: `${output}/${width}-${build}-effect.png` });
      assert.equal(effect.boost, 1.6); assert.equal(effect.slow, 0); assert.equal(effect.hitStop, 0); assert.equal(effect.combo, 51);
      console.log(JSON.stringify({ width, ...data, effect }));
    }
    assert.ok(!external.some(url => url.includes('supabase')), 'offline client never attempted server access');
    console.log(JSON.stringify({ width, channel, blockedExternalRequests: external }));
    await page.close();
  }
} finally { await browser.close(); await server.close(); }
