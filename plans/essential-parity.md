---
status: done
depends: [cards-and-dashboards, query-and-dataset, output-foundation]
specs:
  - specs/commands/card.md
  - specs/commands/dashboard.md
  - specs/commands/playground.md
  - specs/api/conventions.md
issues: []
---

# Plan: essential parity (card dashboards, dashboard create, playground)

## Scope

Close the three-command gap between metabase-axi and the essential toolset of the
`@cognitionai/metabase-mcp-server` MCP server, so an agent can drop that MCP server entirely
and lose nothing.

In: `card dashboards <id>`, `dashboard create <name>`, `playground <sql|->`, plus the
`put`/`delete` client verbs Tier 2 needs and the mutating-endpoint conventions section.
Out: the remaining Tier 2 authoring verbs (own plan), and every `--all`-mode MCP tool
(public/embed links, revisions, favorites, table sync, user admin) — untiered or Tier 4.

## Implements

- `specs/commands/card.md` — `dashboards <id>`, incl. the definitive empty state for a card
  no dashboard embeds.
- `specs/commands/dashboard.md` — `create <name>` with `--description`/`--collection`/
  `--position`; risky resolution, no `--yes` (creating an empty dashboard is reversible).
- `specs/commands/playground.md` — new command; local base64 URL build, no API call, no auth.
- `specs/api/conventions.md` — the previously-unwritten mutating-endpoint rules (risky
  resolution, fetch-modify-PUT, create-echoes-identity, `--yes` for destructive).

## Approach

1. **Client verbs.** `MetabaseClient` has only `get`/`post`. Add `put` and `del` routed
   through the same `request()` so 401 session retry, error mapping, and timeouts are
   inherited.
2. **`card dashboards`.** `getCardDashboards(client, id)` → `GET /api/card/:id/dashboards`,
   normalized through `normalizeList` since the shape varies by version. Render
   `dashboards[N]{id,name,collection}`; on empty, emit `dashboards: "none"` + a `help[]`
   line stating the card is embedded nowhere.
3. **`dashboard create`.** `createDashboard(client, body)` → `POST /api/dashboard`. Command
   resolves `risky: true`, requires a name positional, maps `--collection`→`collection_id`
   and `--position`→`collection_position`, and echoes `created`/`collection`/`url`.
4. **`playground`.** New `src/commands/playground.ts`. Resolves the instance via
   `resolveInstance` **only** — never `createClient` — so it needs no credentials and makes
   no request. Builds the question payload, base64-encodes, emits `<url>/question#<b64>`.
   Supports `-` for stdin like `query`.
5. Register `playground` in `src/cli.ts` and `TOP_HELP`; extend `CARD_HELP`/`DASHBOARD_HELP`.

## Validation

- [x] `card dashboards <id>` lists embedding dashboards; a card embedded nowhere returns the
      definitive empty state, not a bare empty list. (Unit-verified: bare-array and
      `{data:[]}` shapes both normalize, empty returns `[]`, and the request hits
      `/api/card/:id/dashboards`. Live run deferred — see Follow-ups.)
- [x] `dashboard create <name>` creates and echoes id + url; `--collection`/`--description`/
      `--position` land on the created object. (Unit-verified: `POST /api/dashboard` carries
      only the supplied fields. Live run deferred.)
- [x] `dashboard create` refuses to guess an instance when 2+ profiles are configured and
      none is selected. (Verified against the built binary with a two-profile config: errors
      `CONFIG` / "the target is ambiguous" with the mutating-specific suggestion, and issues
      no HTTP request.)
- [x] `playground "SELECT 1"` emits a `/question#<base64>` URL that decodes to the expected
      payload; `--display` is honored; `-` reads stdin. (Verified end-to-end on the built
      binary; fragment decoded and asserted field-by-field.)
- [x] `playground` makes zero HTTP requests and needs no credentials. (Verified: succeeds
      against a profile whose host does not resolve, where every other command fails
      `UNREACHABLE`.)
- [x] `put`/`del` on the client reach the right method and inherit error mapping.
      (Unit-verified incl. 403 → `FORBIDDEN` through the shared `request()` path.)
- [x] `typecheck`, `lint`, `format:check`, and `test` all green (63 passed, 8 skipped);
      `--help` for top level, card, dashboard, and playground renders the new surface.

## Risks / unknowns

- **`GET /api/card/:id/dashboards` shape** varies across Metabase versions (bare array vs
  `{data:[]}`); `normalizeList` covers both, but only a live run confirms which this
  instance returns.
- **Fragment-URL length** — a large SQL payload base64-encodes past some browsers' URL
  limits. Spec chooses to emit anyway with a warning rather than truncate into a broken URL.

## Notes

- The `playground` payload shape (`type: "question"`, empty `template_tags`,
  `visualization_settings: {}`) mirrors what the MCP tool emitted, so links generated before
  and after the switch behave identically.

## Follow-ups

- **Deferred: live-instance verification.** `card dashboards` and `dashboard create` are
  unit-verified against stubbed responses and smoke-tested through the built binary, but not
  yet run against a real Metabase. Two things only a live run settles: which shape
  `GET /api/card/:id/dashboards` returns on the target version, and whether the created
  dashboard's response includes a populated `collection` (the command falls back to
  `collection_id` then `"root"`).
- Tier 2 authoring proper (`card create|update|delete|copy|move`, `dashboard update|delete|
  copy|add-card|remove-card`, `collection create|update|move`) — its own plan, consuming the
  `put`/`del` verbs added here.
