---
status: planned
depends: [config-and-auth, output-foundation, query-and-dataset]
specs:
  - specs/commands/card.md
  - specs/commands/dashboard.md
  - specs/api/conventions.md
issues: []
---

# Plan: cards & dashboards (read/execute)

## Scope

Saved-question and dashboard browsing + card execution. In: `src/metabase/{card,dashboard}.ts`
and `src/commands/{card,dashboard}.ts` — `card list|view|run`, `dashboard list|view`. Out:
creating/editing cards or dashboards (Tier 2). `card run` reuses query-result rendering from
`query-and-dataset`.

## Implements

- `specs/commands/card.md` — `list` (filters), `view` (query + params), `run` (execute +
  preview/export, expensive-op guard).
- `specs/commands/dashboard.md` — `list`, `view` (dashcards + parameters + tabs).

## Approach

1. `card.ts`: `listCards(filter)`, `getCard(id)`, `runCard(id, params, format?)` →
   `POST /api/card/:id/query(/:format)`. `card run` renders via the shared query-result
   renderer; `card view` shows native SQL inline or an MBQL summary + declared params.
2. `dashboard.ts`: `listDashboards()`, `getDashboard(id)`; `view` renders
   `cards[]{card_id,name,viz,tab}` + `parameters[]{name,type}`, grouping by tab when present;
   `--json-out` dumps full structure.
3. Wire `help[]` cross-links: card view→run, dashboard view→`card run <card_id>`.

## Validation

- [ ] `card list --mine` / `--archived` / `--db` filter correctly with capped output.
- [ ] `card view <id>` shows the query text + parameters; long SQL truncates with marker.
- [ ] `card run <id>` renders identically to `query` results and honors `--json-out`/`--csv-out`/`--params`/
      `--limit` + the expensive-op instance guard.
- [ ] `dashboard list` shows id/name/collection/card-count.
- [ ] `dashboard view <id>` lists dashcards with viz + parameters; tabs grouped when present.
- [ ] `help[]` cross-links resolve to runnable commands.

## Risks / unknowns

- **Parameter mapping** — parameterized cards need correct `{parameters}` shape; cover with
  a parameterized fixture.

## Notes

## Follow-ups
