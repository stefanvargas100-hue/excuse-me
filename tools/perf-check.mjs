import { preview } from 'vite';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

export function summarize(samples) {
  assert(samples.length > 0, 'No frame samples');
  const sorted = [...samples].sort((a, b) => a - b), n = sorted.length;
  return { median: (sorted[Math.floor((n - 1) / 2)] + sorted[Math.floor(n / 2)]) / 2,
    p95: sorted[Math.ceil(n * 0.95) - 1],
    over33: 100 * samples.filter(ms => ms > 33).length / n };
}

async function main() {
  const selfTest = process.argv.includes('--self-test');
  // This also checks the statistics independently of browser scheduling.
  assert.deepEqual(summarize([10, 20, 40, 50]), { median: 30, p95: 50, over33: 50 });
  let server, browser;
  try {
    server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
    browser = await chromium.launch();
    const url = `http://127.0.0.1:${server.httpServer.address().port}`;
    console.log('| Racers | CPU | Run | Frames | Seconds | rAF median ms | rAF p95 ms | >33 ms % | Work median ms | Work p95 ms |');
    console.log('|---|---|---|---|---|---|---|---|---|---|');
    // Interleave field sizes to reduce drift from desktop load over the run.
    for (const rate of [1, 4, 6]) for (let run = 1; run <= 3; run++) for (const racers of [4, 8]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      try {
        await context.route(/^https?:\/\/([^/]+\.)?supabase\.co(?::\d+)?\//i, route => route.abort());
        await context.addInitScript(({ delay }) => {
          const nativeRAF = window.requestAnimationFrame.bind(window);
          // main.js registers its loop immediately after exporting __excuse.
          // Capture its identity at registration: production minifies its name.
          // Work excludes this harness and injected delay, and excludes browser paint/GPU.
          window.__perf = { active: false, intervals: [], work: [], previous: null, started: null, elapsed: 0, error: null };
          let gameCallback;
          window.requestAnimationFrame = callback => {
            if (!gameCallback && window.__excuse) gameCallback = callback;
            return nativeRAF(timestamp => {
            const p = window.__perf, gameFrame = callback === gameCallback;
            if (!gameFrame || !p.active) return callback(timestamp);
            const E = window.__excuse;
            if (E.state !== 'play' || E.S.race.finished || E.S.race.countT > 0) {
              p.error = 'Race stopped or countdown active during sampling'; p.active = false;
              return callback(timestamp);
            }
            if (p.started === null) p.started = performance.now();
            if (p.previous !== null) p.intervals.push(timestamp - p.previous);
            p.previous = timestamp;
            const before = performance.now();
            callback(timestamp);
            p.work.push(performance.now() - before);
            if (delay) { const until = performance.now() + delay; while (performance.now() < until) {} }
            p.elapsed = performance.now() - p.started;
            if (p.elapsed >= 20000) p.active = false;
            });
          };
        }, { delay: selfTest ? 40 : 0 });
        const page = await context.newPage();
        await page.goto(url);
        await page.waitForFunction(() => !!window.__excuse);
        await page.evaluate(async racers => {
          await document.fonts.ready;
          const E = window.__excuse;
          if (racers === 8) E.startCup();
          else { E.setLevel(1); E.start('race'); }
          assertStage();
          function assertStage() {
            if (E.LV !== E.LEVELS[1] || E.S.race.bots.length !== racers - 1) throw new Error('Wrong stage or racer count');
          }
          E.S.race.countT = 0;
        }, racers);
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        await page.evaluate(() => { window.__perf.active = true; });
        await page.waitForFunction(() => !window.__perf.active, { }, { timeout: 60000, polling: 250 });
        const result = await page.evaluate(() => window.__perf);
        assert.equal(result.error, null);
        assert(result.elapsed >= 20000, 'Must sample at least 20 real seconds');
        const frames = summarize(result.intervals), work = summarize(result.work);
        if (selfTest) {
          assert(frames.median >= 39, 'Self-test missed 40 ms delay in median');
          assert(frames.over33 >= 90, 'Self-test missed delayed frames');
        }
        console.log(`| ${racers} | ${rate === 1 ? 'none' : rate + 'x'} | ${run} | ${result.intervals.length} | ${(result.elapsed / 1000).toFixed(2)} | ${frames.median.toFixed(2)} | ${frames.p95.toFixed(2)} | ${frames.over33.toFixed(2)} | ${work.median.toFixed(2)} | ${work.p95.toFixed(2)} |`);
      } finally { await context.close(); }
    }
    if (selfTest) console.log('Self-test passed: every run detected the injected 40 ms delay (excluded from Work).');
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.httpServer.close(resolve));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
