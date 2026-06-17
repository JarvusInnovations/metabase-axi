---
status: planned
depends: [config-and-auth, output-foundation]
specs:
  - specs/commands/query.md
  - specs/api/conventions.md
  - specs/data-model.md
issues: []
---

# Plan: query command + dataset client

## Scope

Ad-hoc query execution — the centerpiece of the analyst MVP. In: `src/metabase/dataset.ts`
(`POST /api/dataset` + `/:format`, parameter values) and `src/commands/query.ts` (native
SQL, stdin `-`, `--mbql`, `--db`, `--params`, preview + export). Out: saved-card execution
(reuses this rendering in `cards-and-dashboards`).

## Implements

- `specs/commands/query.md` — full invocation surface, result rendering, QUERY_ERROR
  handling, expensive-op instance guard.
- `specs/api/conventions.md` — dataset + export endpoints.
- `specs/data-model.md` — dataset query + query result shapes.

## Approach

1. `src/metabase/dataset.ts`: `runDataset({database,native|mbql,params})` →
   `POST /api/dataset`; `exportDataset(query, format)` → `POST /api/dataset/:format`
   returning bytes; `parameterValues()`.
2. `src/commands/query.ts`: parse SQL arg / stdin `-` / `--mbql`; resolve `--db` (id or
   name, single-db fallback); build the dataset query; run; render preview via
   `output-foundation`; on `--out`/`--json-out` call the export path; surface `native_form`
   for MBQL; map `status:failed` → `QUERY_ERROR` with verbatim server text.
3. Apply the expensive-op instance guard from `instance-resolution`.

## Validation

- [ ] `query "SELECT 1 AS n"` against a configured db shows a 1-row preview with `cols`
      types and echoed `instance:`/`database:`/`rows:`/`time:`.
- [ ] `echo "SELECT …" | query -` reads SQL from stdin.
- [ ] `query --mbql '{…}'` runs MBQL and surfaces compiled SQL when present.
- [ ] A result over the cap truncates with `rows: N of M`; `--limit` raises the preview.
- [ ] `query "…" --out /tmp/r.csv` writes CSV, preview unchanged, `jq`/`wrote:` lines shown.
- [ ] A bad SQL string yields a `QUERY_ERROR` carrying the server's message verbatim.
- [ ] With 2+ profiles and no `--instance`/env, `query` stops (expensive-op guard).

## Risks / unknowns

- **`--db` resolution UX** — name→id lookup needs a db list; cache or fetch once.
- **Large/expensive queries** — rely on Metabase's server-side row cap; document it; do not
  auto-paginate.

## Notes

## Follow-ups
