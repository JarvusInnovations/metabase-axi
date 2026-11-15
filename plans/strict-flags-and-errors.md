---
status: done
depends: [output-foundation, query-and-dataset, cards-and-dashboards, discovery, config-and-auth]
specs:
  - specs/behaviors/flag-parsing-and-errors.md
  - specs/behaviors/result-export-and-truncation.md
  - specs/api/conventions.md
  - specs/architecture.md
issues: [6]
---

# Plan: strict flag parsing, `formatError`, and the export `=` form

## Scope

Bring argument handling and error reporting in line with the jarvus-axi house style
(issue #6, "Should fix" items, plus two of the "Smaller" ones).

In:

- Replace the lenient `parseArgs` in `src/flags.ts` with the strict per-command parser
  (ported from nexudus-axi `src/flags.ts`), with one declaration table for every command and
  subcommand. Add an optional-value flag kind for the `*-out` exports.
- Route every command through it; validate numeric values (`--limit`, ids) and the
  `search --type` models.
- Add an exported `formatError` (ported from nexudus-axi `src/cli.ts`) and pass it to
  `runAxiCli`.
- Fix the `query` help example (`--csv-out=/tmp/orders.csv`) and make the space form an
  error that names the `=` form.
- Reword `notImplemented()` so it no longer points at `specs/` and `plans/`.
- `chmod 0600` the config file after each write.
- A no-credentials smoke test of the built binary in CI.

Out (each its own plan):

- Generating `--help`, home hints and the skill from one `reference.ts` with a `docs:check`
  gate. Help stays hand-written here; a test keeps it in step with the flag table.
- The `--version` fast path (needs an `axi-sdk-js` bump for the `fast-path` subpath).
- Rejecting contradictory flags (`--mine` with `--archived`, `--mbql` with a SQL positional,
  `--table` with `--search`).
- Hardening the auto-export directory (per-user dir, exclusive create).

## Implements

- `specs/behaviors/flag-parsing-and-errors.md` — all of it.
- `specs/behaviors/result-export-and-truncation.md` — path only with `=`; space form is
  `USAGE`; export flags refused on commands without export; `--json` hints `--json-out`.
- `specs/api/conventions.md` — exit-code split between failed operations (1) and malformed
  invocations (2).
- `specs/architecture.md` — config file mode re-applied after each write.

## Approach

- `src/flags.ts`: `FlagSpec { value, boolean, optional, deprecated, positionals, usage,
  noInstance }`, `parseFlags(command, argv, spec)`, `parseSubcommand(...)`, accessors
  (`str`, `bool`, `int`, `requirePositional`, `intPositional`, `choices`), and the per-command
  tables. `--instance` is a global value flag except where `noInstance` is set. Unknown-flag
  classification (deprecated hint, `--json`, an export flag on a command without it, short
  flags) lives in the one rejection function so the wording cannot drift, and the "export is
  available on" list is computed from the table.
- Optional-value flags: bare → auto path; `--x-out=path` → explicit; a path-looking token
  after a bare flag → `USAGE` naming `--x-out=<token>`; any other following token stays a
  positional, and if it turns out to be an extra one the error names the `=` form too.
- `src/cli.ts`: `formatError` with `USAGE_CODES = {USAGE, UNKNOWN_FLAG, VALIDATION_ERROR}`
  → exit 2, non-`AxiError` → `INTERNAL_ERROR` + `doctor` hint.
- Commands: swap `parseArgs`/`strFlag`/`numFlag`/`hasFlag` for the new parser; parse before
  any config read or request.
- Tests: parser unit tests, a sweep of every table entry with `--bogus`, a
  declared-flags-versus-`--help` comparison in both directions, `formatError` unit tests,
  the export space form, config mode, `notImplemented` wording.

## Validation

- [x] Every command and subcommand rejects an unknown flag with `UNKNOWN_FLAG`, exit 2, and
      a message listing that command's flags (sweep test over the table).
- [x] Extra positionals, a value flag without a value, a switch with a value and a repeated
      flag fail as `USAGE`; non-numeric `--limit`/ids and unknown `--type` models fail as
      `VALIDATION_ERROR`; all before any config read or request.
- [x] `--csv-out /tmp/x.csv` fails as `USAGE` naming `--csv-out=/tmp/x.csv`;
      `card run --csv-out 42` keeps `42` as the id; `--csv-out=path` and bare `--csv-out`
      still export.
- [x] `formatError` maps `USAGE`/`UNKNOWN_FLAG`/`VALIDATION_ERROR` to exit 2, other
      `AxiError`s to 1, and wraps a raw throw as `INTERNAL_ERROR` with a `doctor` hint and no
      stack trace; it is wired into `runAxiCli`.
- [x] Every declared flag appears in its command's `--help`, and every flag in `--help` is
      declared.
- [x] The `query` help example uses `--csv-out=/tmp/orders.csv`.
- [x] `notImplemented()` says "coming in an upcoming release" and names no repo paths.
- [x] Writing the config over an existing `0644` file leaves it `0600`.
- [x] CI runs a real command on the built binary with no credentials and requires a
      structured error with no stack trace.
- [x] lint, format check, typecheck, build and the full test suite are green.

## Risks / unknowns

- **Breaking for sloppy callers** — invocations that passed undeclared flags or extra
  positionals used to run and now exit 2. That is the point, but it is a breaking change and
  is marked as one.
- **Dash-led SQL** — a SQL positional starting with `-- comment` must stay a positional;
  covered by the flag-shape rule and a test.
- **Over-strict value checks** — `search --type` is limited to the models the spec lists.

## Notes

- **`dashboard list --archived` was documented but never read.** The old parser accepted it
  and the command returned the unarchived list. Rather than guess at an unverified endpoint
  filter, the flag is declared `planned` and refused as `USAGE` ("not available yet"); help
  and the command spec say so.
- **Missing positionals moved from `VALIDATION_ERROR` to `USAGE`** to match the house code
  table. The exit code is 2 either way.
- **`query --mbql --db <name>`** used to report `--db` as missing because only a numeric
  `--db` was read on that path; it now resolves names like the native-SQL path.
- **Flag shape decides flag-ness.** Only `--<letter>` or a lone `-x` is a flag, so a SQL
  positional that opens with `-- comment` parses as SQL. This differs from the nexudus-axi
  parser (any dash-led token) and follows the house lexical rules.
- **Path-looking heuristic for the space form:** no whitespace, and contains a slash, starts
  with `~` or `.`, or ends in `.json|.csv|.xlsx|.tsv|.txt`. Anything else after a bare
  export flag stays a positional; if it then overflows the positional count the error still
  names the `=` form.
- Tests run the CLI in-process (`runAxiCli` with a captured stdout and a temp config dir);
  the built binary is exercised by the CI smoke step.
- otter-axi shares the old `src/flags.ts`; `src/flags.ts` (parser half), `formatError` in
  `src/cli.ts` and `test/flags.test.ts` port directly.

## Follow-ups

- **Deferred** — one `reference.ts` generating `--help`, home hints and the skill, with a
  `docs:check` gate (issue #6, "Smaller").
- **Deferred** — `--version` fast path; needs an `axi-sdk-js` bump for the `fast-path`
  subpath (issue #6, "Smaller").
- **Deferred** — reject contradictory flags (`--mine` with `--archived`, `--mbql` with a SQL
  positional or `--params`, `--table` with `--search`, `--api-key` with `--username`).
- **Deferred** — build `dashboard list --archived`, or drop it from the spec.
- **Deferred** — harden auto-exports to the gws-axi form (per-user `0700` dir, exclusive
  create, `export_error:`), and execute every printed `Run …` hint in a test.
- **Deferred** — `readConfig` returns an empty default for a config that fails to parse, so
  the next write replaces it; should be `CONFIG_INVALID` (fail-closed).
