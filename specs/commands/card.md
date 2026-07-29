# Command: card

Saved questions. Tier 1 is read/execute only; create/update is Tier 2.

## Invocation

```
metabase-axi card list [flags]
metabase-axi card view <id>
metabase-axi card run <id> [flags]
metabase-axi card dashboards <id> [flags]
```

Flags:

- `list`: `--mine`, `--archived`, `--db <id>`, `--collection <id>`, `--limit <n>`,
  `--instance <name>`.
- `run`: `--params <json>`, `--limit <n>`, `--json-out`/`--csv-out`/`--xlsx-out`, `--instance <name>`.
- `dashboards`: `--limit <n>`, `--instance <name>`.

## Data Requirements

- `list` → `GET /api/card` (`?f=` filter from flags: `all`/`mine`/`archived`/`database`/`table`).
- `view` → `GET /api/card/:id` — full card incl. `dataset_query`, `display`, template-tags.
- `run` → `POST /api/card/:id/query` (+ `/:format` for export). Optional `{parameters}`.
- `dashboards` → `GET /api/card/:id/dashboards` — dashboards embedding this card.

## Display Rules

- `list`: `cards[N]{id,name,collection,type,edited}` — `type` = native/MBQL, `edited`
  relative. Capped with `[N of M]` + `help[]` for filtering.
- `view`: header fields (`id,name,collection,db,display,query_type`) + the query text
  (native SQL inline, or MBQL summary) + declared parameters. Long SQL truncated with marker.
- `run`: identical to [query](query.md) result rendering — preview table + optional export
  - echoed `instance:`/`rows:`/`time:`.
- `dashboards`: `dashboards[N]{id,name,collection}`. A card embedded nowhere returns a
  definitive empty state (`dashboards: none`) plus a `help[]` line saying the card is
  unused — never a bare empty list, per
  [Surface the contract](../principles.md#surface-the-contract-dont-hide-metabase).

## Actions

- All read-only. `run` executes the card's query; **potentially expensive**, so
  [Never guess which instance](../principles.md#never-guess-which-instance) applies as in
  [query](query.md).
- `dashboards` is the **dependency check before editing a card**: it answers "what breaks
  if I change this?" Cheap (one `GET`), so it resolves non-risky like other reads.

## Navigation

- `card view <id>` → `card run <id>` to execute it; `query` to adapt its SQL ad-hoc.
- `card view <id>` → `card dashboards <id>` to see what depends on it before editing.
- `search <q>` to find a card by name when the id is unknown.

## Principles

**Inherited:**

- [Read-first, mutation-explicit](../principles.md#read-first-mutation-explicit).
- [Preview to stdout, full data to a file](../principles.md#preview-to-stdout-full-data-to-a-file)
  (for `run`).
