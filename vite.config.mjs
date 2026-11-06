import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// After the build, fill the service worker with the exact list of files to cache offline and a version
// that changes whenever any file changes, so players always get the newest game and never a stale mix.
function offlineCache() {
  return {
    name: 'offline-cache',
    apply: 'build',
    closeBundle() {
      const dist = 'dist', files = [];
      (function walk(dir) {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p); else if (f !== 'sw.js') files.push(relative(dist, p).split(sep).join("/"));
        }
      })(dist);
      files.sort();
      const hash = createHash('sha1');
      for (const f of files) hash.update(f).update(readFileSync(join(dist, f)));
      const sw = readFileSync(join(dist, 'sw.js'), 'utf8')
        .replace('__CACHE_VERSION__', hash.digest('hex').slice(0, 10))
        .replace('__PRECACHE_FILES__', JSON.stringify(['./', ...files]));
      writeFileSync(join(dist, 'sw.js'), sw);
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineCache()],
  build: {
    target: 'es2020',
    rollupOptions: { output: { entryFileNames: 'assets/main.js', chunkFileNames: 'assets/[name].js' } }
  }
});
