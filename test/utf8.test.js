const test = require('node:test');
const assert = require('node:assert/strict');
const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join } = require('node:path');

// Windows tools can save files in the local code page. Vite then fails with a misleading error, so catch it here.
test('every source, test and tool file is valid UTF-8', () => {
  const bad = [];
  const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(m?js|css|html|json)$/.test(f)) { try { new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(p)); } catch { bad.push(p); } } } };
  for (const d of ['src', 'test', 'tools']) walk(d);
  for (const f of ['index.html', 'style.css']) try { new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(f)); } catch { bad.push(f); }
  assert.deepEqual(bad, [], 'save these as UTF-8: ' + bad.join(', '));
});
