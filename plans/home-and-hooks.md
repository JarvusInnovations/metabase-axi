---
status: planned
depends: [config-and-auth, discovery, cards-and-dashboards]
specs:
  - specs/commands/home.md
  - specs/commands/setup.md
issues: []
---

# Plan: home view, SessionStart hooks & skill

## Scope

The content-first home view, the `setup hooks` installer, and the agent skill — the things
that make metabase-axi present itself in a session. In: `src/commands/{home,setup}.ts`,
`skills/metabase-axi/SKILL.md`, the home-on-no-args wiring. Depends on the read endpoints
existing so home can show real recent content. Out: nothing further in the MVP — this closes it.

## Implements

- `specs/commands/home.md` — orientation pull (user, db count, recent cards/dashboards),
  onboarding fallback when unconfigured, resilience on unreachable/auth failure, `help[]`
  including `--help` / `<command> --help`.
- `specs/commands/setup.md` — `setup hooks` over `installSessionStartHooks`.

## Approach

1. `home.ts`: cache-first profile summary; small recent-cards/dashboards pulls; degrade to a
   status line + `doctor` hint on failure; onboarding view when no profile/creds; never throw.
2. `setup.ts`: `installSessionStartHooks({marker:"metabase-axi", binaryNames:["metabase-axi"]})`;
   idempotent; works with no profile configured.
3. `SKILL.md` built from CLI metadata (follow family `build:skill` pattern if adopted).

## Validation

- [ ] `metabase-axi` (no args) shows instance + status + recent content + `help[]`, and the
      `help[]` includes `--help` and `<command> --help` examples.
- [ ] With no profile configured, home shows the onboarding view and exits 0 (never throws).
- [ ] On an unreachable instance, home degrades gracefully with a `doctor` suggestion.
- [ ] `setup hooks` installs hooks (Claude Code/Codex/OpenCode) idempotently and works with
      no profile present.
- [ ] A new session injects the home payload via the hook.

## Risks / unknowns

- **Hook payload latency** — home must stay cache-backed and fast; cap the recent pulls.

## Notes

## Follow-ups
