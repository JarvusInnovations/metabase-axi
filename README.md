<h1 align="center">metabase-axi</h1>

<p align="center">An <a href="https://axi.md">AXI</a>-compliant CLI for <a href="https://www.metabase.com/">Metabase</a> — built for agents.</p>

`metabase-axi` wraps the Metabase HTTP API in an agent-ergonomic CLI: token-efficient
[TOON](https://toonformat.dev/) output, schema introspection so you can write correct
queries, capped result previews with full-data export to a file, and named instance
profiles so you never query the wrong deployment by accident.

It leads with the **analyst** workflow — run SQL/MBQL, execute saved questions, introspect
schema, search content, and browse dashboards/collections from the terminal.

> Status: early development. The spec is the source of truth — see [`specs/`](specs/) — and
> work-in-flight is tracked in [`plans/`](plans/). Built with [specops](https://github.com/JarvusInnovations/specops).

## Setup

```sh
metabase-axi auth add prod --url https://metabase.example.org --api-key mb_...
```

Mint an API key in Metabase admin (Settings → API keys). Credentials are stored in
`~/.config/metabase-axi/config.json`; `METABASE_URL` + `METABASE_API_KEY` (or
`METABASE_USERNAME`/`METABASE_PASSWORD`) override the file for CI/cron. Verify with
`metabase-axi doctor`.

## Commands

| Command | What |
|---|---|
| `metabase-axi` | Home view: active instance + recent content + suggestions |
| `metabase-axi query <sql>` | Run native SQL or MBQL; preview + export |
| `metabase-axi card list\|view\|run` | List, inspect, and execute saved questions |
| `metabase-axi db list\|schema` | List databases; introspect tables/fields |
| `metabase-axi search <q>` | Find cards, dashboards, collections, tables |
| `metabase-axi dashboard list\|view` | List and inspect dashboards |
| `metabase-axi collection list` | Browse the collection tree |
| `metabase-axi auth\|doctor` | Credentials + health |
| `metabase-axi setup hooks` | Install the SessionStart ambient hook |

## Development

```sh
asdf install          # bun + nodejs per .tool-versions
bun install
bun run build         # tsc -> dist/
bun run test          # vitest
bun run dev -- query "SELECT 1"   # run from source
```

## License

MIT © Jarvus Innovations
