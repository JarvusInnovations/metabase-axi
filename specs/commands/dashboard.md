# Command: dashboard

List and inspect dashboards. Tier 1 is read-only; create/update is Tier 2.

## Invocation

```
metabase-axi dashboard list [flags]
metabase-axi dashboard view <id> [flags]
```

Flags: `list`: `--collection <id>`, `--archived`, `--limit <n>`, `--instance <name>`.
`view`: `--instance <name>`.

## Data Requirements

- `list` → `GET /api/dashboard`.
- `view` → `GET /api/dashboard/:id` — full structure: `dashcards[]`, `parameters[]`, `tabs[]`.

## Display Rules

- `list`: `dashboards[N]{id,name,collection,cards}` — `cards` = dashcard count; `[N of M]`
  cap + `help[]`.
- `view`: header (`id,name,collection,tabs`) + `cards[N]{card_id,name,viz,tab}` (one row per
  dashcard) + `parameters[N]{name,type}` (the dashboard's filters). Large dashboards capped;
  `--json-out` dumps the full structure to a file.
- Tabs: when present, group dashcards by tab; otherwise omit the `tab` column.

## Actions

Read-only. Default profile acceptable. (Executing individual dashcards is deferred; use
`card run <card_id>` for a listed card.)

## Navigation

- `dashboard view <id>` → `card run <card_id>` for any listed card; `card view <card_id>`
  to inspect its query.
- `search <q> --type dashboard` to find by name.

## Principles

**Inherited:**

- [Surface the contract, don't hide Metabase](../principles.md#surface-the-contract-dont-hide-metabase)
  — uses Metabase's dashcard/parameter/tab vocabulary and real ids.
