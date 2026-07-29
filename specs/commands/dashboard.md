# Command: dashboard

List and inspect dashboards; create empty ones. `list`/`view` are read-only Tier 1;
`create` is the first Tier 2 authoring verb. Update/delete remain Tier 2 roadmap.

## Invocation

```
metabase-axi dashboard list [flags]
metabase-axi dashboard view <id> [flags]
metabase-axi dashboard create <name> [flags]
```

Flags: `list`: `--collection <id>`, `--archived`, `--limit <n>`, `--instance <name>`.
`view`: `--instance <name>`.
`create`: `--description <text>`, `--collection <id>`, `--position <n>`, `--instance <name>`.

## Data Requirements

- `list` → `GET /api/dashboard`.
- `view` → `GET /api/dashboard/:id` — full structure: `dashcards[]`, `parameters[]`, `tabs[]`.
- `create` → `POST /api/dashboard`, body `{ name, description?, collection_id?,
  collection_position? }`. Per
  [mutating endpoints](../api/conventions.md#mutating-endpoints-tier-2), a create is not
  idempotent and never auto-retries.

## Display Rules

- `list`: `dashboards[N]{id,name,collection,edited}` — `[N of M]` cap + `help[]`. (Dashcard
  count is shown in `view`, not `list`: the list endpoint does not include dashcards, and
  fetching each one to count would be N+1 — omitted here per "show what's available".)
- `view`: header (`id,name,collection,tabs`) + `cards[N]{card_id,name,viz,tab}` (one row per
  dashcard) + `parameters[N]{name,type}` (the dashboard's filters). Large dashboards capped;
  `--json-out` dumps the full structure to a file.
- Tabs: when present, group dashcards by tab; otherwise omit the `tab` column.
- `create`: echoes `created: <id>: <name>`, the resolved `collection`, and a `url` to open
  it. The new dashboard is empty, so `help[]` points at the next step rather than implying
  it holds cards.

## Actions

`list`/`view` are read-only; the default profile is acceptable. (Executing individual
dashcards is deferred; use `card run <card_id>` for a listed card.)

`create` **mutates** — it resolves risky, so an ambiguous instance stops the command rather
than creating a dashboard on a guessed target. It is the one write verb here that needs no
`--yes`: creating an empty dashboard destroys nothing and is trivially reversible.

## Navigation

- `dashboard view <id>` → `card run <card_id>` for any listed card; `card view <card_id>`
  to inspect its query.
- `dashboard create <name>` → `dashboard view <id>` to confirm it landed.
- `search <q> --type dashboard` to find by name.

## Principles

**Inherited:**

- [Surface the contract, don't hide Metabase](../principles.md#surface-the-contract-dont-hide-metabase)
  — uses Metabase's dashcard/parameter/tab vocabulary and real ids.
- [Read-first, mutation-explicit](../principles.md#read-first-mutation-explicit) — `create`
  is deliberate and risk-resolved; `list`/`view` stay frictionless.
