import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const out = resolve(process.argv[2] || 'lineup-shots');
await mkdir(out, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 6200 }, deviceScaleFactor: 1 });
  await page.route(/^https?:\/\/([^/]+\.)?supabase\.co\//i, r => r.abort());
  // Repeat the same walking poses in before/after runs without changing game code.
  await page.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => raf(() => cb(650)); });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/?lineup`);
  await page.getByRole('button', { name: 'Big', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  const LOOK_OPTS = await page.evaluate(async () => (await import('/src/save/progress.js')).LOOK_OPTS);
  const counts = [6, ...['shirtType','pantsType','shoeType','hat','eyes','nose','mouth','hairStyle','pack','skin','hair'].map(k => LOOK_OPTS.find(o => o.key === k).vals.length)];
  for (const size of ['big', 'game']) {
    if (size === 'game') await page.getByRole('button', { name: 'Game size', exact: true }).click();
    const scale = size === 'big' ? 1 : .62, cellH = Math.round(215 * scale * 1.2) + 22;
    const cols = Math.floor(1280 / Math.round(110 * scale * 1.4));
    for (const body of ['male', 'female']) {
      const label = await page.getByRole('button', { name: /Items on:/ }).textContent();
      if (!label.toLowerCase().endsWith(body) || (body === 'male' && label.includes('Female'))) await page.getByRole('button', { name: /Items on:/ }).click();
      for (const view of ['Back','Side','Front']) {
        await page.getByRole('button', { name: view, exact: true }).click();
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const box = await page.locator('canvas').last().boundingBox();
        let y = 0;
        for (let i = 0; i < counts.length; i++) {
          const height = 30 + Math.ceil(counts[i] / cols) * cellH + 6;
          const title = ({1:'tops',2:'bottoms',3:'shoes',9:'backs'})[i];
          if (title) await page.screenshot({ path: resolve(out, `${size}-${body}-${view.toLowerCase()}-${title}.png`), clip: { x: box.x, y: box.y + y, width: box.width, height } });
          y += height;
        }
      }
    }
  }
  console.log(`Saved 48 section screenshots to ${out}`);
} finally { await browser?.close(); await server.close(); }

