# Command: search

Cross-entity search to locate cards, dashboards, collections, and tables by text when the
id is unknown.

## Invocation

```
metabase-axi search <query> [flags]
```

Flags: `--type <models>` (comma-separated, drawn from
`card|dashboard|collection|table|dataset`), `--limit <n>`, `--instance <name>`.

Parsed strictly per [flag-parsing-and-errors](../behaviors/flag-parsing-and-errors.md): an
unknown `--type` model is a `VALIDATION_ERROR` listing the allowed values, never an
unfiltered search.

## Data Requirements

`GET /api/search?q=<query>` (+ `models=` from `--type`). Items carry a `model`
discriminator (see [search result](../data-model.md#search-result-cross-entity)).

## Display Rules

- `results[N]{model,id,name,collection}` — `model` distinguishes the entity kind; capped
  with `[N of M]` + `help[]` for narrowing by `--type` or refining the query.
- Definitive empty state: `message: 0 results for "<query>"` + a `help[]` suggestion.

## Actions

Read-only. Default profile acceptable.

## Navigation

Each result routes to its viewer by `model`: `card view|run <id>`, `dashboard view <id>`,
`collection list` (filtered), `db schema` (for `table`). `help[]` emits the exact next
command for the top result kinds.

## Principles

**Inherited:**

- [Tokens are the budget](../principles.md#tokens-are-the-budget) — minimal columns,
  capped, with narrowing hints.
