// Batch 24 browser evidence: a host page and a real joined guest page over a local relay (adapted from batch-22-evidence/capture.mjs).
// Captures the host lobby bot controls in Race and Elimination, a guest mid-race seeing bots, and results with bots, at 320x568 and 390x844.
// Run: node game/rounds/round-02/batch-24-evidence/capture.mjs
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const evidence = 'game/rounds/round-02/batch-24-evidence';
const server = await createServer({ base: '/playtest/', server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
let browser; const results = [];
// Where the lobby controls are, and whether a phone can reach them (inside the page width, not clipped).
const controls = page => page.evaluate(() => {
  const box = el => { const r = el.getBoundingClientRect(); return { id: el.id || el.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inWidth: r.x >= 0 && r.right <= innerWidth, clipped: el.scrollWidth > el.clientWidth + 1 }; };
  // the room screen is a scrolling card: Start is fully visible without scrolling when it ends inside the card while the card is at the top
  const card = document.getElementById('friendStart').closest('.card'), cr = card.getBoundingClientRect(), st = document.getElementById('friendStart').getBoundingClientRect();
  const fit = { id: 'card', scrollable: card.scrollHeight - card.clientHeight, cardBottom: Math.round(cr.bottom), startBottom: Math.round(st.bottom), scrollTop: card.scrollTop, startVisible: card.scrollTop === 0 && st.top >= cr.top && st.bottom <= cr.bottom - parseFloat(getComputedStyle(card).borderBottomWidth), inWidth: true, clipped: false };
  return [fit, ...[document.getElementById('friendBotCount'), ...document.querySelectorAll('#friendCupLevel .chip'), document.getElementById('friendStart')].filter(el => el.getClientRects().length).map(box)];
});
const tickBoth = async (pages, rounds, frames = 3) => { for (let i = 0; i < rounds; i++) for (const p of pages) await p.evaluate(n => { const g = window.__excuse; for (let k = 0; k < n; k++) g.tick(1 / 30); }, frames); };
try {
  browser = await chromium.launch();
  for (const width of [320, 390]) {
    const height = width === 320 ? 568 : 844, shot = (page, name) => page.screenshot({ path: `${evidence}/${width}-${name}.png` });
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    await context.route('**/*', r => new URL(r.request().url()).origin === origin ? r.continue() : r.abort());
    await context.addInitScript(() => { window.requestAnimationFrame = () => 0; localStorage.setItem('excuseme_tut', JSON.stringify('1')); });
    const pages = [], active = new Set();
    await context.exposeBinding('roomSend', async ({ page }, event, data) => { await Promise.all(pages.filter(p => p !== page && active.has(p)).map(p => p.evaluate(({ event, data }) => window.deliverRoom(event, data), { event, data }))); });
    for (let i = 0; i < 2; i++) {
      const page = await context.newPage(); pages.push(page);
      await page.goto(origin + '/playtest/'); await page.waitForFunction(() => window.__excuse, null, { polling: 50 });
      await page.evaluate(async i => { const E = window.__excuse; localStorage.setItem('excuseme_online_name', JSON.stringify(['Host', 'Guest'][i])); const handlers = []; window.deliverRoom = (ev, data) => handlers.forEach(h => h(ev, data)); E.useRoomFactory(() => ({ join: async () => {}, leave() {}, onMessage: f => handlers.push(f), onClose() {}, send: (ev, data) => { window.roomSend(ev, data); } })); (await import('/playtest/src/ui/friend.js')).openFriend(); }, i);
      active.add(page);
    }
    const [host, guest] = pages;
    await host.locator('#friendMake').click(); await host.waitForFunction(() => /^[A-Z2-9]{4}$/.test(document.getElementById('friendCode').textContent), null, { polling: 50 });
    const code = await host.locator('#friendCode').textContent();
    await guest.locator('#friendJoinBtn').click(); await guest.locator('#friendInput').fill(code); await guest.locator('#friendGo').click(); await guest.locator('#friendGuest').waitFor({ state: 'visible' });

    // the host lobby: bot controls in Race, then Elimination, set through the real controls
    await host.locator('#friendBotCount').selectOption('3');
    await host.locator('#friendCupLevel button').filter({ hasText: 'Hard' }).click();
    await guest.waitForFunction(() => window.__excuse.roomBots().botCount === 3 && window.__excuse.roomBots().difficulty === 2, null, { polling: 50 });
    await shot(host, 'host-lobby-race');
    results.push({ width, screen: 'host lobby race', status: await host.locator('#friendStatus').textContent(), controls: await controls(host) });
    await host.locator('#friendFormat button').filter({ hasText: 'Elimination' }).click();
    await guest.waitForFunction(() => window.__excuse.roomElim() && window.__excuse.roomBots().botCount === 3, null, { polling: 50 });
    await shot(host, 'host-lobby-elim');
    results.push({ width, screen: 'host lobby elimination', status: await host.locator('#friendStatus').textContent(), controls: await controls(host) });
    await shot(guest, 'guest-lobby-elim');
    results.push({ width, screen: 'guest lobby elimination', status: await guest.locator('#friendStatus').textContent() });
    await host.locator('#friendFormat button').filter({ hasText: 'Race' }).click();
    await guest.waitForFunction(() => !window.__excuse.roomElim() && window.__excuse.roomBots().botCount === 3, null, { polling: 50 });

    // a plain race with 3 Hard bots
    await guest.locator('#friendReady').click();
    await host.waitForFunction(() => window.__excuse.canStartRoom(), null, { polling: 50 });
    await host.locator('#friendStart').click();
    for (const page of pages) await page.waitForFunction(() => window.__excuse.state === 'play', null, { polling: 50 });
    for (const page of pages) await page.evaluate(() => { window.__excuse.S.race.countT = 0; });
    await tickBoth(pages, 60);
    const field = page => page.evaluate(() => window.__excuse.S.race.bots.filter(b => b.aiBot).map(b => ({ id: b.peerId, name: b.name, z: Math.round(b.z * 10) / 10, remote: b.remote })));
    const hostBots = await field(host), guestBots = await field(guest);
    assert.equal(guestBots.length, 3); assert.deepEqual(guestBots.map(b => b.name), hostBots.map(b => b.name));
    assert.ok(guestBots.every(b => b.remote && b.z > 1), 'the guest draws the host\'s bots, moving');
    // put the guest's runner just behind the bots so the camera shows them
    await guest.evaluate(() => { const g = window.__excuse, z = Math.min(...g.S.race.bots.filter(b => b.aiBot).map(b => b.z)); g.S.pz = Math.max(0, z - 3); g.S.me.z = g.S.pz; g.tick(1 / 30); g.render(); });
    await shot(guest, 'guest-race');
    results.push({ width, screen: 'guest mid-race', hostBots, guestBots });

    // everyone in: two bots ahead of the players, one behind
    const finish = (page, who) => page.evaluate(who => { const g = window.__excuse; if (who === 'me') { g.S.pz = g.LV.goal + 1; } else { g.S.race.bots.find(b => b.peerId === who).z = g.LV.goal + 0.5; } }, who);
    for (const [page, who] of [[host, 'bot:0'], [guest, 'me'], [host, 'bot:2'], [host, 'me'], [host, 'bot:1']]) { await finish(page, who); await tickBoth(pages, 4); }
    await tickBoth(pages, 20);
    for (const page of pages) await page.locator('#end').waitFor({ state: 'visible' });
    const board = page => page.evaluate(() => window.__excuse.S.race.board.map(r => ({ id: r.id, name: r.name, done: r.done })));
    const hb = await board(host), gb = await board(guest);
    assert.deepEqual(hb.map(r => r.id), gb.map(r => r.id), 'same places on both phones'); assert.ok(gb.every(r => r.done));
    for (const page of pages) await page.evaluate(() => window.__excuse.render());
    await shot(guest, 'guest-results'); await shot(host, 'host-results');
    const endText = page => page.evaluate(() => document.getElementById('end').innerText.replace(/\s+/g, ' ').slice(0, 400));
    results.push({ width, screen: 'results', hostBoard: hb, guestBoard: gb, guestEnd: await endText(guest), hostEnd: await endText(host) });
    await context.close();
  }
  for (const r of results) if (r.controls) assert.ok(r.controls.every(c => c.inWidth && !c.clipped), 'lobby controls fit: ' + JSON.stringify(r.controls));
  for (const r of results) if (r.controls && r.width === 390) assert.ok(r.controls[0].startVisible, 'Start fully visible without scrolling at 390x844: ' + JSON.stringify(r.controls[0]));
  writeFileSync(evidence + '/capture.json', JSON.stringify(results, null, 2)); console.log('captured', results.length, 'checks');
} finally { if (browser) await browser.close(); await server.close(); }
