---
status: planned
depends: [scaffold]
specs:
  - specs/behaviors/output-rendering.md
  - specs/behaviors/result-export-and-truncation.md
issues: [32]
---

# Plan: Output foundation (TOON rendering + export)

## Scope

The shared output layer every data command uses. In: `src/output.ts` (TOON helpers —
`renderList`, `renderHelp`, `truncate`, `joinBlocks`, header lines), the preview/cap logic,
and the per-format `--json-out`/`--csv-out`/`--xlsx-out` full-export-to-file behavior with the `jq` `help[]`
hint and auto-path generation. Out: the actual queries that produce data (later plans) —
this plan provides the rendering/export primitives + unit tests against fixtures.

## Implements

- `specs/behaviors/output-rendering.md` — TOON block shapes, minimal schemas, relative time,
  explicit counts, definitive empty states, secret/path handling.
- `specs/behaviors/result-export-and-truncation.md` — `PREVIEW_ROW_CAP`, truncation markers,
  `--json-out`/`--csv-out`/`--xlsx-out` file writing, auto-generated path,
  `wrote:`/`columns:`/`jq` help lines. Realizes the AXI #32 stance.

## Approach

1. `src/output.ts`: thin wrappers over `@toon-format/toon` + SDK output; helpers for header
   lines (`instance:`, `database:`, `rows:`, `time:`), capped tables, truncation markers.
2. Export module: a `writeExport(result, {path, format})` where `format` comes from the
   explicit flag (no extension inference); routes csv/xlsx to the Metabase native-export
   bytes (passed in by callers) and json to a serialized payload, generates
   `<config>/exports/<ts>-<kind>.<ext>` when no path given, and returns the
   `wrote:`/`columns:`/`jq`-hint metadata for the caller to render.
3. Flag parsing helpers for `--json-out[=path]`/`--csv-out[=path]`/`--xlsx-out[=path]`/
   `--limit` (at most one `*-out` per invocation).

## Validation

- [ ] Rendering a >cap result shows exactly `PREVIEW_ROW_CAP` rows + `rows: N of M` marker.
- [ ] Cell text over the char cap shows `… (truncated, N chars total)`.
- [ ] `--json-out` with no path writes to an auto-generated file and reports it.
- [ ] `--csv-out foo.csv` / `--json-out foo.json` write the correct format;
      `wrote:`/`columns:`/`jq` help lines appear; stdout preview is unchanged by the
      presence of a `*-out` flag.
- [ ] Combining two `*-out` flags in one invocation is a validation error.
- [ ] No secret values appear in any rendered output; home paths collapse to `~`.
- [ ] vitest fixtures cover preview cap, truncation, empty state, and each export format.

## Risks / unknowns

- **Auto-path location** — exports land under `<config-dir>/exports/`; ensure the dir is
  created on demand and the resolved path is reported clearly.
- **xlsx bytes** — binary export passes through untouched; ensure no UTF-8 mangling.

## Notes

## Follow-ups
