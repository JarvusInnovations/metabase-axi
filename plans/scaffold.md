---
status: planned
depends: []
specs:
  - specs/architecture.md
  - specs/README.md
issues: []
---

# Plan: Project scaffold

## Scope

Stand up the empty-but-runnable `metabase-axi` package matching the `*-axi` family layout.
In: `package.json`, `tsconfig.json`, `.tool-versions`, `bin/metabase-axi.ts`, `src/cli.ts`
(`runAxiCli` wiring + `TOP_HELP`), `src/meta.ts`, command-stub registration, build/test
scripts, `README.md`, `LICENSE`. Out: real command logic (later plans), API client
(`config-and-auth`), output helpers (`output-foundation`).

## Implements

- `specs/architecture.md` — tech stack, project layout, CLI shape (`runAxiCli` options),
  the command surface registration (stubs returning a "not implemented" notice).

## Approach

1. `package.json`: `type: module`, `bin`, deps `axi-sdk-js@^0.1.7` + `@toon-format/toon`,
   dev deps `typescript`/`vitest`/`@types/node`; scripts `build`/`dev`/`test` per family.
2. `.tool-versions` via `asdf set bun latest && asdf set nodejs latest`; `tsconfig.json`
   (ES2022/Node16) copied from family conventions.
3. `bin/metabase-axi.ts` → `main()`; `src/cli.ts` wires `runAxiCli({description,version,
   topLevelHelp,home,commands,getCommandHelp,resolveContext})` with all Tier-0/1 commands
   registered as stubs.
4. `src/meta.ts` (`DESCRIPTION`, `readVersion`). Placeholder `home` returning the
   onboarding view.
5. `README.md` skeleton, MIT `LICENSE`.

## Validation

- [ ] `bun run build` produces `dist/` with no type errors.
- [ ] `metabase-axi --help` prints `TOP_HELP`; `metabase-axi --version` prints the version.
- [ ] Every Tier-0/1 command is registered and returns a structured "not implemented yet"
      notice (no crash).
- [ ] `metabase-axi` (no args) runs the placeholder home without throwing.
- [ ] `vitest run` passes (a smoke test for help/version/unknown-command).

## Risks / unknowns

- **SDK version drift** — pin `axi-sdk-js` to the version verified in architecture.md.

## Notes

## Follow-ups
