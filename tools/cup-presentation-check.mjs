import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const evidence = 'game/rounds/round-02/batch-10c-evidence';
mkdirSync(evidence, { recursive: true });
const server = await createServer({ base: '/playtest/', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 320 ? 568 : 844 }, hasTouch: true, isMobile: true });
    await context.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
    await context.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
      localStorage.setItem('excuseme_tut', JSON.stringify('1'));
      localStorage.setItem('excuseme_online_name', JSON.stringify('Hurried Tourist 88'));
      window.awardAnimations = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        const a = animate.apply(this, args);
        if (this.id === 'sChain') window.awardAnimations.push(a);
        return a;
      };
    });
    const pages = [], active = new Set();
    await context.exposeBinding('roomSend', async ({ page }, event, data) => {
      await Promise.all(pages.filter(p => p !== page && active.has(p)).map(p => p.evaluate(({ event, data }) => window.deliverRoom(event, data), { event, data })));
    });
    for (let i = 0; i < 8; i++) {
      const page = await context.newPage(); pages.push(page);
      // RAF is deliberately stopped so simulation is driven only by explicit ticks.
      const wait = page.waitForFunction.bind(page);
      page.waitForFunction = (fn, arg, options) => wait(fn, arg, { polling: 50, ...options });
      await page.goto(origin + '/playtest/');
      await page.waitForFunction(() => window.__excuse);
      await page.evaluate(async i => {
        const E = window.__excuse;
        localStorage.setItem('excuseme_online_name', JSON.stringify('Hurried Tourist ' + (80 + i)));
        const handlers = [];
        window.deliverRoom = (ev, data) => handlers.forEach(h => h(ev, data));
        E.useRoomFactory(() => ({ join: async () => {}, leave() {}, onMessage: f => handlers.push(f), onClose() {}, send: (ev, data) => { window.roomSend(ev, data); } }));
        document.getElementById('playBtn').click();
        [...document.querySelectorAll('#playList button')].find(b => b.textContent.includes('Race friends')).click();
      }, i);
      active.add(page);
    }
    const [host, guest] = pages;
    await host.locator('#friendMake').click();
    await host.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('friendCode').textContent));
    const code = await host.locator('#friendCode').textContent();
    for (const page of pages.slice(1)) {
      await page.locator('#friendJoinBtn').click();
      await page.locator('#friendInput').fill(code); await page.locator('#friendGo').click();
      await page.locator('#friendGuest').waitFor({ state: 'visible' });
    }
    await host.evaluate(async () => { const { setRoomCup } = await import('/playtest/src/online/duel.js'); setRoomCup({ stages: [2, 0, 4, 1], difficulty: 2 }); });
    await host.waitForFunction(() => window.__excuse.lobbyPlayers().length === 8);
    for (const p of pages.slice(1)) await p.waitForFunction(() => window.__excuse.roomLobbyState().canReady);
    assert.equal(await host.evaluate(() => window.__excuse.canStartRoom()), false, 'unready guests block Start');
    const shotControl = async (p, selector, name) => {
      const button = p.locator(selector); await button.scrollIntoViewIfNeeded();
      assert.equal(await button.isEnabled(), true, name + ' must be enabled');
      const b = await button.boundingBox(); assert.ok(b.y >= 0 && b.y + b.height <= (width === 320 ? 568 : 844));
      await p.screenshot({ path: `${evidence}/${name}-${width}.png` });
    };
    await shotControl(guest, '#friendReady', 'enabled-ready');
    await guest.locator('#friendReady').click();
    for (const p of pages.slice(2)) await p.evaluate(() => window.__excuse.setRoomReady(true));
    await host.waitForFunction(() => window.__excuse.canStartRoom());
    await shotControl(host, '#friendStart', 'enabled-start');
    await host.locator('#friendStart').click();
    for (const p of pages) await p.waitForFunction(() => window.__excuse.state === 'play');
    const seeds = await Promise.all(pages.map(p => p.evaluate(() => window.__excuse.S.seed)));
    assert.equal(new Set(seeds).size, 1);
    // Finish all humans through the actual game loop; host publishes authoritative standings.
    const finish = async p => p.evaluate(() => {
      const E = window.__excuse; E.S.race.countT = 0; E.S.people.length = 0; E.S.nextChunk = 1e9;
      for (let n = 0; n < 15; n++) E.tick(1 / 30);
      E.S.pz = E.LV.goal + 1; for (let n = 0; n < 40; n++) E.tick(1 / 30);
    });
    await finish(guest);
    assert.equal(await guest.locator('#sChain').textContent(), 'Pending');
    assert.equal(await guest.locator('#sBest').textContent(), '0');
    for (const p of [host, ...pages.slice(2)]) await finish(p);
    await host.waitForFunction(() => document.getElementById('sChain').textContent !== 'Pending');
    await guest.waitForFunction(() => document.getElementById('sChain').textContent !== 'Pending');
    assert.equal(await host.locator('#again').isEnabled(), true);
    await host.evaluate(() => Promise.all(window.awardAnimations.map(a => a.finished)));
    const scoresBefore = await host.evaluate(() => JSON.stringify(window.__excuse.S.duel.cup.model));
    const animationCount = await host.evaluate(() => window.awardAnimations.length);
    await host.evaluate(async () => {
      const E = window.__excuse;
      E.S.duel = { ...E.S.duel, cup: { ...E.S.duel.cup, model: JSON.parse(JSON.stringify(E.S.duel.cup.model)) } };
      const { refreshDuelResults } = await import('/playtest/src/sim/game.js');
      refreshDuelResults(); refreshDuelResults();
    });
    assert.equal(await host.evaluate(() => window.awardAnimations.length), animationCount);
    assert.equal(await host.evaluate(() => JSON.stringify(window.__excuse.S.duel.cup.model)), scoresBefore);
    assert.match(await host.locator('#endEyebrow').textContent(), /race 1 of 4/);
    assert.match(await host.locator('#again').textContent(), /Start race 2/);
    await host.locator('#again').scrollIntoViewIfNeeded();
    await host.screenshot({ path: `${evidence}/stable-friend-round1-${width}.png` });
    await host.locator('#again').click();
    await host.waitForFunction(() => window.__excuse.state === 'play');
    // Local Cup uses the same presentation and Web Animation API.
    await context.clearCookies();
    const local = await context.newPage(); await local.goto(origin + '/playtest/');
    await local.waitForFunction(() => window.__excuse, null, { polling: 50 });
    for (const mode of ['default', 'calm', 'reduced']) {
      await local.emulateMedia({ reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
      await local.evaluate(async mode => {
        const { setCalm } = await import('/playtest/src/sim/state.js'); setCalm(mode === 'calm');
        window.awardAnimations = []; window.__excuse.startCup();
      }, mode);
      await finish(local);
      assert.equal(await local.evaluate(() => window.awardAnimations.length), mode === 'default' ? 1 : 0);
      assert.equal(await local.locator('#next').isEnabled(), true);
      await local.evaluate(() => Promise.all(window.awardAnimations.map(a => a.finished)));
      assert.equal(await local.locator('#sChain').textContent(), '+10 points');
      assert.equal(await local.locator('#next').isEnabled(), true);
      await local.screenshot({ path: `${evidence}/stable-local-${mode}-${width}.png` });
      await local.locator('#next').click(); assert.equal(await local.evaluate(() => window.__excuse.state), 'play');
    }
    results.push({ width, readyAndStartClicked: true, synchronizedSeed: seeds[0], stableAwardAnimations: animationCount, scoresUnchangedOnReplacement: true, currentRace: 1, nextRace: 2, localModes: ['default', 'calm', 'reduced'] });
    await context.close();
  }
  writeFileSync(`${evidence}/browser.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); await server.close(); }
