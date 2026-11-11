const { spawnSync } = require('node:child_process');
for (let i = 0; i < 20; i++) {
  const r = spawnSync(process.execPath, ['--test', '--test-name-pattern=Classic pickups continue', 'test/classic-movement.test.js'], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('Failed iteration', i + 1, r.stdout, r.stderr); process.exit(1); }
}
console.log('20/20 isolated pickup lifecycle runs passed, with play-state, collection, real-tick expiry and reset assertions.');
