# Round 02, batch 06b: finish the host handover

**Builder:** to be chosen by the Director: Claude Opus, high (the model routing default for tricky online work), or a fresh Codex worker. Why: the Codex draft stopped after two failed fixes.
**Risk:** high. Second review: yes, by the other model, before merging.

## Start from
Branch `stefanvargas100-hue/host-handover` at `b5e751a`. Its plan is `batch-06-host-handover.md`, and all its rules, allowed files and done-when still apply. Read its report, `reports/batch-06-host-handover.md`, first.

## What is left
1. **The next race after a handover does not start.** In the draft, a transfer stalls race 3, and `readyPlayers` cannot be used while the start coordinator's phase is running. The new host needs a clean start coordinator that names itself as host, created from the shared roster. Every guest must then accept its start, and a stale coordinator from the old host must never release a start.
2. **Missing tests:** a countdown is cancelled when the host leaves and the new host restarts it; a fake host claim is ignored; the old host returning stays a guest.
3. **The simulated room** (`tools/room-sim.mjs`) must complete a full Cup, then produce the message table for 2, 4 and 8 humans, and for 4 humans with the host leaving in race 2.
4. **The full suite:** the draft had 6 failures, 2 of them said to be encoding problems. Every one must pass, or be explained with evidence that it also fails on `develop`.

## Done when
As in batch 06, with the message table in the report.
