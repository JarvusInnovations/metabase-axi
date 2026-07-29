# API: Conventions

The contract between metabase-axi and the Metabase HTTP API. Individual command specs
reference this rather than restating auth/error/pagination rules. Grounded in the Metabase
OpenAPI spec (OpenAPI 3.1, ~647 operations; this tool covers the analyst subset).

## Base URL & client

All requests go to `<profile.url>/api/...`. A single `fetch`-based client
(`src/metabase/client.ts`) owns: base-URL joining, auth headers, JSON encode/decode,
timeout, and error mapping. Default request timeout: 30s (queries may set a longer,
per-command override).

## Authentication

Resolved per [credential-resolution](../behaviors/credential-resolution.md). Two schemes:

| Scheme | Header | Source |
|---|---|---|
| **API key** (primary) | `X-API-Key: <key>` | profile `api_key` or `METABASE_API_KEY` |
| **Session** (fallback) | `X-Metabase-Session: <token>` | from `POST /api/session` |

Session flow: `POST /api/session` with `{ username, password }` → `{ id: <token> }`. Cache
the token in the profile. On any `401`, discard the cached session token and re-authenticate
once transparently; if that fails (or for API-key auth), surface an `AUTH` error.

## Error envelope

Metabase returns errors as non-2xx with a JSON or text body (`{ message, ... }` or a bare
string, e.g. a SQL error). The client maps these to `AxiError` with a code and actionable
suggestions (see [principles.md#surface-the-contract-dont-hide-metabase](../principles.md#surface-the-contract-dont-hide-metabase)):

| HTTP / condition | AxiError code | Suggestion gist |
|---|---|---|
| 401 / expired session | `AUTH` | `metabase-axi doctor`; re-run `auth login`/check key |
| 403 | `FORBIDDEN` | the API key/user lacks permission for this object |
| 404 | `NOT_FOUND` | check the id; `search`/`list` to find it |
| 400 + SQL/MBQL error | `QUERY_ERROR` | echo the server's query error verbatim in the message |
| network/timeout | `UNREACHABLE` | check instance URL / VPN; `doctor` |
| missing creds/profile | `CONFIG` | `auth add`/set env vars |

A failed **query** (`status: "failed"` in a 2xx body) is a `QUERY_ERROR`, not a transport
error — surface `data.error` from the result body.

## Query & data endpoints (Tier 1 core)

| Method · Path | Purpose |
|---|---|
| `POST /api/dataset` | Run an ad-hoc dataset query (native or MBQL). Body = `{ database, type, native\|query }`. Returns a [query result](../data-model.md#query-result). No caching. |
| `POST /api/dataset/:format` | Same, exporting to `csv` \| `json` \| `xlsx`. Body is form-encoded `query=<json>`. Returns the file bytes. |
| `POST /api/card/:id/query` | Execute a saved card. Optional body `{ parameters: [...] }`. Returns a query result. |
| `POST /api/card/:id/query/:format` | Execute a card, exporting to `csv`/`json`/`xlsx`. |
| `POST /api/dataset/parameter/values` | Resolve allowed values for a query parameter. |

## Discovery & metadata endpoints

| Method · Path | Purpose |
|---|---|
| `GET /api/database` | List databases (`{ data: [...] }` or array, per version — client normalizes). |
| `GET /api/database/:id/metadata` | Tables → fields with types for one database (schema introspection). |
| `GET /api/card` | List cards. Filter via `?f=<filter>` (`all`, `mine`, `archived`, `database`, `table`, …). |
| `GET /api/card/:id` | Full card incl. `dataset_query` and template-tags. |
| `GET /api/dashboard` | List dashboards. |
| `GET /api/dashboard/:id` | Full dashboard incl. dashcards, parameters, tabs. |
| `GET /api/collection` | List collections (`?namespace=` optional). |
| `GET /api/search?q=` | Cross-entity search; items carry a `model` discriminator. |
| `GET /api/user/current` | Current user — used by `doctor`/profile cache to validate auth. |

## Row limits, pagination & truncation

- Metabase caps dataset rows server-side (default ~2000; absolute max configurable). The
  tool does **not** page through unbounded result sets by default.
- The tool applies its own **display cap** (token budget) on top of whatever the server
  returns, and always announces truncation. Full data is retrieved via the export path,
  not by enlarging the inline display. See
  [result-export-and-truncation](../behaviors/result-export-and-truncation.md).
- List endpoints that return large arrays are display-capped the same way, with a
  `help[]` line pointing at a filter or `--limit`.

## Idempotency & safety

- All Tier-1 commands are **read-only** (`GET`, or `POST` for query execution which does
  not mutate state). They are safe to re-run.
- `POST /api/dataset` and `POST /api/card/:id/query` execute queries: they can be
  **expensive**. For these, [Never guess which instance](../principles.md#never-guess-which-instance)
  applies — the resolved instance is always echoed, and an explicit instance is required
  when ambiguous.
### Mutating endpoints (Tier 2+)

Mutations are the exception per [Read-first, mutation-explicit](../principles.md#read-first-mutation-explicit).
Every mutating command obeys all four rules:

1. **Risky resolution, always.** Mutations pass `risky: true` to instance resolution, so an
   ambiguous target stops the command instead of falling back to the default profile. The
   resolved instance is echoed in the output like any data-bearing command.
2. **Fetch-modify-PUT for updates.** Metabase's `PUT` endpoints replace the object, so a
   partial body silently drops fields. An update always `GET`s the current object, merges
   only the flags the caller supplied, and `PUT`s the merged whole. Never construct a `PUT`
   body from flags alone.
3. **Creates echo identity; updates echo the diff.** A create returns the new `id` and a
   `url` the operator can open. An update reports which fields actually changed
   (`changed[]`); a no-op update says so rather than reporting phantom success.
4. **Destructive ops require `--yes`.** Anything that removes or archives (`delete`,
   `remove-card`) refuses to run without an explicit `--yes`, and its refusal names the
   object it would have affected. Confirmation is a flag, not a prompt — the caller is an
   agent, and a blocking prompt would hang it.

| Method · Path | Purpose |
|---|---|
| `POST /api/dashboard` | Create a dashboard. Body `{ name, description?, collection_id?, collection_position?, parameters? }`. |
| `GET /api/card/:id/dashboards` | Dashboards that embed a card — dependency check before editing it. |

Idempotency: `POST` creates are **not** idempotent (a re-run makes a second object), so a
create never auto-retries. `PUT` updates and `DELETE`s are idempotent and safe to re-run.

## Notes

- Prefer `POST /api/dataset` over re-saving cards for ad-hoc exploration — it never
  persists anything.
- `native_form` in a result lets MBQL queries report the compiled SQL; surface it when
  present so the agent can see what actually ran.
