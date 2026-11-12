# Batch 17g: verify combined update playtest publication

Verifier: Codex defaults, evidence only (routine verification; low risk). Read AGENTS.md and .github/workflows/deploy.yml. The expected pushed develop SHA is given in the dispatch; it is also the commit that added this file (`git log --format=%H -1 -- game/rounds/round-02/batch-17g-publication-check.md`). If the two differ, or origin/develop is not at that SHA, stop and report.

Verify that the Tests run for that exact SHA succeeds, that its downstream Pages deployment succeeds, and that https://stefanvargas100-hue.github.io/excuse-me/playtest/ plus its referenced main JS return HTTP 200 with the expected embedded short build ID. The Pages workflow SHA can be main; distinguish it from the develop build marker. Main has not been merged. Do not claim publication without matching HTTP evidence.

Publication scope (all of it is in this build): cap treatment A with the compatibility/stat-display companion (PROTO 9, new competition identities), the airport crowd generation correction, and the Host/Cup changes (host Start without Ready, animated +round award, cumulative Cup totals).

May edit only game/rounds/round-02/reports/batch-17g-publication-check.md and game/rounds/round-02/batch-17g-evidence/ on your own branch. No production or dependency changes, deployment commands, live service writes, database work, subagents or local full-suite rerun. Reading and waiting on CI is allowed; do not poll Orca. Allow up to 25 minutes for CI and propagation, then report partial with the exact unresolved stage. Commit a report of at most 10 lines with run URLs, timestamps, served marker and evidence, and return the report path.

Publication does not establish real-phone feel, human balance, actual transport reconnect/reload, dropped-ack browser cancellation, installed service-worker updates or deployed-schema acceptance. The shared fit findings and the later visual pass remain queued.
