const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('offline installation bypasses stale browser HTTP cache for game files', async () => {
  const handlers = {}, requests = [];
  const source = fs.readFileSync('public/sw.js', 'utf8').replace('__PRECACHE_FILES__', JSON.stringify(['./', 'assets/main.js']));
  vm.runInNewContext(source, {
    Request: class { constructor(url, options) { this.url = url; this.cache = options?.cache; } },
    self: { addEventListener: (name, fn) => handlers[name] = fn, skipWaiting() {} },
    caches: { open: async () => ({ addAll: async files => requests.push(...files) }) }
  });
  let installed;
  handlers.install({ waitUntil: work => installed = work });
  await installed;
  assert.equal(requests.length, 2);
  assert.ok(requests.every(r => r.cache === 'reload'), 'every precached file bypasses the old HTTP cache');
});
