# Round 02, batch 07b: continue side routes (follow-up to the same worker)

Your build failure (`ENOENT scandir dist` in the offline-cache `closeBundle` hook) looks local to your workspace: on `develop` at the batch 08 merge, `npm run build` passes and 632 tests pass. Delete `dist`, then run `npm run build` once more. If it passes, note it in your report and carry on with the rest of `batch-07-side-routes-takeshita.md`: Subway medal times, then part 2, Takeshita Street. If the build fails again, report the full error and stop.
