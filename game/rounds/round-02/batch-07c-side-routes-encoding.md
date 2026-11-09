# Round 02, batch 07c: the build failure is a file encoding (follow-up to the same worker)

The lead found the cause. `src/render/side-routes.js` is not UTF-8: the `·` in `label(r.name+' · REJOIN ...` is the single Windows code-page byte 0xB7. Vite fails on that file, and the offline-cache `closeBundle` hook then hides the real error with `ENOENT scandir dist`.

1. Merge local `develop` into your branch. It adds `test/utf8.test.js`, which fails on this file.
2. Re-save the file as UTF-8, without changing anything else. In PowerShell, `Set-Content` writes the code page, so use your file-edit tool or `-Encoding utf8`. Check every other file you wrote the same way.
3. Run `node --test test/utf8.test.js` and `npm run build`. Both must pass.
4. Carry on with the rest of `batch-07-side-routes-takeshita.md`: Subway medal times, then part 2, Takeshita Street. The stop rule starts again at zero for new problems.
