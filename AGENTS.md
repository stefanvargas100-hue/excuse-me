# Studio rules

Every agent reads this. Keep it short: it costs tokens on every run.

**Game:** see `game/vision.md`. **Lead agents:** read `studio/lead-playbook.md`, then `game/status.md`.

## Workers
Your batch plan is your brief. Read it, the files it names, and nothing else unless the task truly needs it.

- **Edit only what the plan allows.** If the fix needs another file, stop and report rather than widening the change.
- **Read narrowly.** Search first, then open only the relevant lines. Do not read `game/archive/` unless the plan names it.
- **Test first** for behaviour changes: follow `studio/skills/test-first/SKILL.md`.
- **Keep output small.** While working, run only related tests: `node --test test/<name>.test.js`. Run `npm test` once at the end (about 3 minutes) and show only the summary and any failures. Then run `npm run build` and `git diff --check`.
- **Stop after 2 failed attempts** at the same problem and report what you tried. Do not keep spending tokens.
- **Git:** commit only to your own branch. Never push to `main` or the lead branch, and never force-push.
- **Never do these unless the plan says so:** touch the live database, run `tools/loadtest.mjs`, deploy, add a dependency, or start subagents.
- **Be exact about evidence.** Tests, browser emulation and real phones are different things. Never report a check you did not run.

On Windows PowerShell, use `npm.cmd` instead of `npm`.

## Final report: 10 lines at most
```text
Outcome:     done | partial | blocked
Branch:      name and commit
Changed:     one line
Checks:      focused tests, full suite, build, with results
Not checked: anything left for a browser, phone or person
Off plan:    files or decisions outside the plan, or "none"
Trouble:     what cost you the most time or tokens, or "none"
```
