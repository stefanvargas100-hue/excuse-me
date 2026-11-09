import { preview } from 'vite';
import { chromium } from 'playwright';
import { fitProblems } from './fit-rules.mjs';

const sizes = [
  { width: 320, height: 568, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 1280, height: 800, touch: false },
];
const selfTest = process.argv.includes('--self-test');
let server, browser, problems = 0, checked = 0, detected = 0;
const line = (size, screen, element, problem) => {
  console.log(`${size} | ${screen} | ${element} | ${problem.replace(/[\r\n]+/g, ' ')}`);
  problems++;
};

async function measure(page, screen) {
  await page.locator(`#${screen}`).waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  return page.evaluate(id => {
    const root = document.getElementById(id);
    const visible = el => {
      const s = getComputedStyle(el);
      return el.getClientRects().length && s.visibility !== 'hidden' && s.visibility !== 'collapse' && s.opacity !== '0';
    };
    const splitWords = el => {
      const words = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) {
        if (!visible(node.parentElement)) continue;
        for (const match of node.textContent.matchAll(/[\p{L}\p{N}]+/gu)) {
          const range = document.createRange();
          range.setStart(node, match.index); range.setEnd(node, match.index + match[0].length);
          const rects = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0);
          if (rects.some(r => Math.abs(r.top - rects[0].top) > 1)) words.push(match[0]);
        }
      }
      return [...new Set(words)];
    };
    const controlText = el => {
      const rects = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode());) {
        if (!node.textContent.trim() || !visible(node.parentElement)) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        rects.push(...[...range.getClientRects()].filter(r => r.width && r.height));
      }
      const r = el.getBoundingClientRect();
      return { textLeft: rects.length ? Math.min(...rects.map(r => r.left)) : r.left,
        textRight: rects.length ? Math.max(...rects.map(r => r.right)) : r.right };
    };
    const canScrollY = el => {
      if (getComputedStyle(el).position === 'fixed') return false;
      const r = el.getBoundingClientRect();
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        // An outer scroller cannot reveal content clipped inside a fixed inner panel.
        if (/hidden|clip/.test(style.overflowY) && (r.top < bounds.top || r.bottom > bounds.bottom)) return false;
        if (/auto|scroll/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight &&
            bounds.top < innerHeight && bounds.bottom > 0 &&
            parent.scrollHeight - parent.clientHeight - parent.scrollTop >= r.bottom - Math.min(bounds.bottom, innerHeight)) return true;
      }
      return false;
    };
    const box = el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const panel = el.parentElement?.closest('.card, .panel');
      const bounds = panel?.getBoundingClientRect();
      return { element: el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().replace(/\s+/g, '.') : ''),
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), panel: bounds ? { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom } : null,
        left: r.left, top: r.top, right: r.right, bottom: r.bottom,
        clientWidth: el.clientWidth, scrollWidth: style.overflowX === 'visible' ? el.clientWidth : el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: style.overflowY === 'visible' ? el.clientHeight : el.scrollHeight };
    };
    return {
      boxes: [document.documentElement, document.body, root, ...root.querySelectorAll('*')]
        .filter(el => visible(el) && el.clientWidth > 0 && el.clientHeight > 0).map(box),
      controls: [...root.querySelectorAll('button, a[href], input, select, textarea, [role="button"]')].filter(visible).map(el => ({ ...box(el), ...controlText(el), canScrollY: canScrollY(el), splitWords: splitWords(el) })),
    };
  }, screen);
}

try {
  server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
  const address = server.httpServer.address();
  const url = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch();
  for (const viewport of sizes) {
    const size = `${viewport.width}x${viewport.height}`;
    // A non-persistent context has no cookies or saves from previous runs/sizes.
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, isMobile: viewport.touch });
    await context.route(/^https?:\/\/([^/]+\.)?supabase\.co(?::\d+)?\//i, route => route.abort());
    // Keep a valid generated-length name reproducible, including its small-screen fit.
    await context.addInitScript(() => {
      if (!localStorage.getItem('excuseme_online_name')) localStorage.setItem('excuseme_online_name', JSON.stringify('Breezy Commuter 37'));
    });
    const page = await context.newPage();
    page.setDefaultTimeout(4000);
    const home = async () => { await page.goto(url); await page.locator('#playBtn').waitFor({ state: 'visible' }); };
    const click = selector => page.locator(selector).click();
    const play = async () => { await home(); await click('#playBtn'); };
    const race = async () => { await play(); await page.locator('#playList button').filter({ hasText: 'Race vs bots' }).click(); };
    const savedBest = async () => page.evaluate(() => {
      const E = window.__excuse; E.setLevel(0); E.start('race');
      E.S.race.countT = 0; E.S.people.length = 0; E.S.time = 140; E.S.pz = E.LV.goal + 1;
      for (let i = 0; i < 90; i++) E.tick(1 / 60);
    });
    const routes = [
      ['start', home], ['play', play],
      ...[['practice', 'practiceBtn'], ['friend', null], ['boards', 'boardsBtn'], ['howto', 'howBtn'], ['settings', 'setBtn'], ['look', 'lookBtn'], ['chal', 'chalBtn'], ['profile', 'profBtn']].map(([id, button]) => [id, async () => {
        if (id === 'friend') { await play(); await page.locator('#playList button').filter({ hasText: 'Race friends' }).click(); }
        else { await home(); await click('#' + button); }
      }]),
      ['stages', race],
      ['stages saved best', async () => {
        await home(); await savedBest(); await race();
        await page.locator('#levels button').filter({ hasText: /Gold|Silver|Bronze/ }).first().waitFor();
      }],
      ['race end', async () => {
        await home(); await savedBest();
        await page.evaluate(() => {
          const E = window.__excuse; E.setLevel(0); E.start('race');
          E.S.race.countT = 0; E.S.people.length = 0; E.S.time = 120; E.S.pz = E.LV.goal + 1;
          E.S.unlocked = ['Red trainers'];
          for (let i = 0; i < 90; i++) E.tick(1 / 60);
        });
        await page.locator('#unlockNote').filter({ hasText: 'Unlocked:' }).waitFor();
      }],
      ['NYC Cup', async () => { await race(); await page.locator('#raceFormat button').filter({ hasText: 'NYC Cup' }).click(); await page.locator('#levels button').filter({ hasText: 'NYC Cup' }).waitFor(); }],
      ['challenge', async () => { await race(); await page.locator('#raceFormat button').filter({ hasText: 'Weekly' }).click(); await click('#levels button'); }],
      ['pause', async () => { await play(); await page.locator('#playList button').filter({ hasText: 'Classic' }).click(); await page.locator('#levels button').first().click(); await page.waitForTimeout(1000); await click('#pauseBtn'); }],
      ['end', async () => {
        await home();
        await page.evaluate(() => {
          const E = window.__excuse; E.startCup();
          E.S.race.countT = 0; E.S.people.length = 0;
          for (let i = 0; i < 14; i++) E.tick(1 / 30);
          E.S.pz = E.LV.goal + 1;
          for (let i = 0; i < 90; i++) E.tick(1 / 30);
        });
      }],
    ];
    for (const [name, open] of routes) {
      try {
        await open();
        const screen = name === 'NYC Cup' || name === 'stages saved best' ? 'stages' : name === 'race end' ? 'end' : name;
        const m = await measure(page, screen);
        checked++;
        for (const p of fitProblems(m, viewport)) line(size, name, p.element + ' ' + JSON.stringify(p.text), p.problem + ' (' + p.overflow.toFixed(2) + 'px)');
        if (name === 'practice') {
          const next = page.locator('#practicePager button[aria-label="Next page"]');
          let number = 1;
          while (await next.isVisible() && await next.isEnabled()) {
            await next.click(); number++; checked++;
            for (const p of fitProblems(await measure(page, screen), viewport))
              line(size, name + ' page ' + number, p.element + ' ' + JSON.stringify(p.text), p.problem + ' (' + p.overflow.toFixed(2) + 'px)');
          }
        }
        if (selfTest && name === 'start') {
          await page.evaluate(() => {
            const el = document.createElement('button'); el.id = 'fit-self-test'; el.textContent = 'Overflow probe';
            el.style.cssText = 'position:fixed;left:calc(100vw + 20px);top:0;width:100px;height:40px';
            const clip = document.createElement('div'); clip.id = 'fit-self-clip'; clip.textContent = 'Clipped probe';
            clip.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:20px;overflow:hidden;line-height:120px';
            const text = document.createElement('button'); text.id = 'fit-self-text'; text.textContent = 'Elimination';
            text.style.cssText = 'position:fixed;left:100px;top:0;width:48px;padding:0;font:20px monospace;white-space:nowrap;overflow:visible';
            const below = document.createElement('button'); below.id = 'fit-self-below'; below.textContent = 'Below screen';
            below.style.cssText = 'position:fixed;left:0;top:calc(100vh + 20px);width:100px;height:40px';
            document.getElementById('start').append(el, clip, text, below);
          });
          const injected = fitProblems(await measure(page, screen), viewport);
          const caught = (element, problem) => injected.some(p => p.element === element && p.problem === problem);
          for (const [element, problem] of [['#fit-self-test', 'control off-screen'], ['#fit-self-clip', 'vertical overflow'], ['#fit-self-text', 'text outside control'], ['#fit-self-below', 'control off-screen']]) {
            if (!caught(element, problem)) console.error(size + ' | self-test missed ' + element + ' | ' + problem);
          }
          if (caught('#fit-self-test', 'control off-screen') && caught('#fit-self-clip', 'vertical overflow') && caught('#fit-self-text', 'text outside control') && caught('#fit-self-below', 'control off-screen')) detected++;
          await page.locator('#fit-self-test').evaluate(el => el.remove());
          await page.locator('#fit-self-clip').evaluate(el => el.remove());
          await page.locator('#fit-self-text').evaluate(el => el.remove());
          await page.locator('#fit-self-below').evaluate(el => el.remove());
        }
      } catch (error) { line(size, name, '-', `could not check: ${error.message.split('\n')[0]}`); }
    }
    await context.close();
  }
  console.log(`Summary: ${checked} screen checks, ${problems} problems${selfTest ? `; self-test detected ${detected}/${sizes.length} sizes with injected problems caught` : ''}`);
  process.exitCode = selfTest ? (detected === sizes.length ? 0 : 1) : (problems ? 1 : 0);
} catch (error) {
  line('-', '-', '-', error.message);
  console.log(`Summary: ${checked} screen checks, ${problems} problems`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.httpServer.close(resolve));
}
