---
status: planned
depends: [config-and-auth, output-foundation]
specs:
  - specs/commands/database.md
  - specs/commands/search.md
  - specs/commands/collection.md
  - specs/api/conventions.md
issues: []
---

# Plan: discovery — db schema, search, collections

## Scope

The "find and understand the data" commands. In: `src/metabase/{database,search,collection}.ts`
clients and `src/commands/{database,search,collection}.ts`. Centerpiece is `db schema`
(schema introspection — the MCP gap). Out: card/dashboard listing (next plan).

## Implements

- `specs/commands/database.md` — `db list`, `db schema <id|name>` with `--table`/`--search`
  filters; output usable directly for writing a query.
- `specs/commands/search.md` — `search <q>` with `--type`, model-discriminated results.
- `specs/commands/collection.md` — `collection list` with `--parent`/`--namespace`.

## Approach

1. `database.ts`: `listDatabases()` (normalize shape); `databaseMetadata(id)` → tables→fields.
   `db schema` groups by table, renders `fields[]{name,base_type,semantic_type}`, filters by
   `--table`/`--search`, offers `--json-out` for full metadata.
2. `search.ts`: `search(q, models)` → `GET /api/search`; render `results[]{model,id,name,
   collection}`; route `help[]` to the per-model viewer.
3. `collection.ts`: `listCollections(ns)` → derive `parent` from `location`; `--parent`
   scopes to direct children.

## Validation

- [ ] `db list` shows id/name/engine/table-count.
- [ ] `db schema <id>` lists tables with fields + base/semantic types; `--table`/`--search`
      filter correctly; large schema suggests narrowing + `--json-out`.
- [ ] `search "<term>"` returns mixed models with correct discriminators; `--type card`
      filters; empty query gives a definitive empty state.
- [ ] `collection list` shows the tree flatly; `--parent <id>` scopes to children + echoes
      parent.
- [ ] All three echo the resolved `instance:` and stay within token caps.

## Risks / unknowns

- **Metadata size** — big databases produce huge metadata; rely on caps + `--table`/`--json-out`.
- **Search model coverage** — confirm which `model` values the target Metabase version
  returns.

## Notes

## Follow-ups
