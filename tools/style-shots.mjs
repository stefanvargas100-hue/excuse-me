// Art-style review shots: every stage in the classic look and in its cup's art style, plus the characters in each style,
// laid out as before/after sheets. Emulated phone, not a real one.  node tools/style-shots.mjs [out-folder]
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const out = resolve(process.argv[2] || 'style-shots');
await mkdir(out, { recursive: true });
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
  const levels = await page.evaluate(() => window.__excuse.LEVELS.map(l => ({ id: l.id, city: l.city, name: l.name })));
  const shots = [];
  for (let i = 0; i < levels.length; i++) {
    for (const look of ['classic', 'style']) {
      const styleId = await page.evaluate(({ i, look }) => {
        const E = window.__excuse;
        E.forceStyle(look === 'classic' ? 'classic' : null);
        Math.random = (() => { let s = 4242; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();   // the same crowd in both looks
        E.setLevel(i); E.start('race'); E.S.race.countT = 0;
        for (let n = 0; n < (i === 0 ? 250 : 420); n++) E.tick(1 / 60);
        E.render();
        return E.styleId();
      }, { i, look });
      for (const sel of ['#tutSkip']) if (await page.locator(sel).isVisible().catch(() => false)) await page.locator(sel).click();
      const file = `${levels[i].id}-${look}.png`;
      await page.screenshot({ path: resolve(out, file) });
      shots.push({ ...levels[i], look, styleId, file });
    }
  }
  await page.evaluate(() => window.__excuse.forceStyle(null));

  // characters: the same lineup rows in each style
  const lp = await context.newPage();
  await lp.setViewportSize({ width: 1180, height: 900 });
  const styles = ['classic', 'comic', 'funnies', 'pulp', 'inknoir', 'noir', 'neonpop', 'space'];
  for (const s of styles) {
    await lp.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => raf(() => cb(650)); });
    await lp.goto(`${url}/?lineup&style=${s}`);
    await lp.getByRole('button', { name: 'Big', exact: true }).click();
    await lp.evaluate(() => document.fonts.ready);
    for (const view of ['Back']) {
      await lp.getByRole('button', { name: view, exact: true }).click();
      await lp.waitForTimeout(250);
      const box = await lp.locator('canvas').last().boundingBox();
      await lp.screenshot({ path: resolve(out, `people-${s}-${view.toLowerCase()}.png`), clip: { x: box.x, y: box.y, width: Math.min(box.width, 1180), height: 310 } });
    }
  }

  // before/after sheets, one per cup
  const b64 = async f => 'data:image/png;base64,' + (await readFile(resolve(out, f))).toString('base64');
  const sheet = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const cities = [...new Set(levels.map(l => l.city))];
  for (const city of cities) {
    const ls = levels.filter(l => l.city === city);
    const styleId = shots.find(s => s.city === city && s.look === 'style').styleId;
    let html = `<body style="margin:0;padding:18px;background:#f4efe6;font-family:Arial,sans-serif;color:#222;width:${ls.length * 2 * 258 + 20}px"><h2 style="margin:0 0 12px">${city} cup: each stage in the classic look (left) and as its own world (right)</h2><div style="display:flex;gap:18px">`;
    for (const l of ls) {
      html += `<div><div style="font-weight:700;margin-bottom:6px">${l.name}: ${shots.find(s => s.id === l.id && s.look === "style").styleId}</div><div style="display:flex;gap:6px">`;
      for (const look of ['classic', 'style']) html += `<img src="${await b64(`${l.id}-${look}.png`)}" style="width:240px;border:1px solid #999">`;
      html += '</div></div>';
    }
    html += '</div></body>';
    await sheet.setContent(html); await sheet.waitForTimeout(150);
    await (await sheet.$('body')).screenshot({ path: resolve(out, `sheet-${city.toLowerCase().replace(/\W+/g, '-')}.png`) });
  }
  let html = '<body style="margin:0;padding:18px;background:#f4efe6;font-family:Arial,sans-serif;color:#222;width:1190px"><h2 style="margin:0 0 12px">Characters and clothing in each art style (back view, then front view)</h2>';
  for (const s of styles) for (const v of ['back']) html += `<div style="font-weight:700;margin:10px 0 4px">${s} (${v})</div><img src="${await b64(`people-${s}-${v}.png`)}" style="width:1180px;border:1px solid #999">`;
  await sheet.setContent(html + '</body>'); await sheet.waitForTimeout(150);
  await (await sheet.$('body')).screenshot({ path: resolve(out, 'sheet-people.png') });
  console.log('Saved ' + shots.length + ' stage shots, character rows and sheets to ' + out);
} finally { await browser?.close(); await server.close(); }
