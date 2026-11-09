# Game studio

A reusable way to build a game with one human director, one lead agent and short-lived workers on Claude or Codex.

## What is reusable
| Path | Purpose | Copied to a new game? |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | Rules for every agent | Yes |
| `.codex/config.toml` | Leaves Codex plugins and apps out of worker startup | Yes |
| `studio/` | Lead process, model routing, templates, skills | Yes |
| `game/` | Vision, roadmap, decisions, area guides, rounds | No: start empty |

## Status
Trial version. It stays inside Excuse Me until it has run 1-2 successful rounds, then moves to its own template repo.

## Starting a new game
1. Copy `AGENTS.md`, `CLAUDE.md`, `.codex/` and `studio/` into the new repo. Add the `skills.config` settings in `studio/model-routing.md` if this is a new machine.
2. Create `game/` with `vision.md`, `roadmap.md`, `decisions.md`, `status.md`, `failures.md`, `areas/` and `rounds/`.
3. Set the lead branch name and test commands in `game/status.md`, and adjust the commands in `AGENTS.md`.
4. Start one lead session per game. Games share the same usage limits, so stagger their busy periods.

## What improves over time
Lessons that apply to any game go in `studio/`, so the next game starts stronger. Lessons about one game stay in its `game/` folder.
