// Every screen the menu code knows about must exist in the page, or opening any menu crashes on a real phone. node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');

test('each id in SCREENS has a matching element in index.html', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'screens.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = js.match(/const SCREENS = \[([^\]]+)\]/);
  assert.ok(m, 'found the SCREENS list');
  const ids = m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  assert.ok(ids.length >= 8);
  for (const id of ids) assert.ok(html.includes('id="' + id + '"'), 'index.html has #' + id);
});

test('each menu panel in index.html is in SCREENS, or Back cannot close it', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', 'screens.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const ids = js.match(/const SCREENS = \[([^\]]+)\]/)[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
  const panels = [...html.matchAll(/<div id="([^"]+)" class="panel"/g)].map(m => m[1]);
  assert.ok(panels.length >= 8);
  for (const p of panels) assert.ok(ids.includes(p), '#' + p + ' is missing from SCREENS');
});
