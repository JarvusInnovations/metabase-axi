# Command: playground

Turn a SQL string into a Metabase question URL a human can open, tweak, and chart. The
hand-off command: the agent has the SQL, the person wants to explore it in the UI.

## Invocation

```
metabase-axi playground <sql|-> [flags]
```

Flags: `--display <type>` (default `table`), `--db <id>`, `--instance <name>`.

A lone `-` reads the SQL from stdin, matching [query](query.md).

## Data Requirements

**No API call.** The URL is constructed locally:

1. Build the question payload
   `{ dataset_query: { type: "native", native: { query, template_tags: {} }, database? },
   display, parameters: [], visualization_settings: {}, type: "question" }`.
2. Base64-encode the JSON payload.
3. Emit `<instance.url>/question#<base64>`.

Metabase reads the fragment client-side, so nothing is persisted and no question is saved.
Only the instance **URL** is needed — not credentials — so this command resolves the
instance but never builds a client and never authenticates.

## Display Rules

- `instance:`, `display:`, and `url:` — the URL is the payload, emitted last and unwrapped
  so it can be copied or clicked without parsing, per
  [Content first](../principles.md#tokens-are-the-budget).
- The SQL is **not** echoed back: the caller just supplied it, and long SQL would dominate
  the output for no information gain.
- A fragment URL can be long. It is never truncated — a truncated URL is a broken URL. If
  the encoded payload exceeds ~8000 characters the command still emits it, with a `help[]`
  warning that some browsers may reject it and suggesting a saved card instead.

## Actions

Read-only and offline: no request reaches Metabase, so nothing can be mutated or made
expensive. Resolves non-risky — with no API call and no mutation there is no wrong-target
cost beyond a URL pointing at the wrong host, and the echoed `instance:` catches that.

## Navigation

- `query <sql>` to run the same SQL and get rows instead of a link.
- `playground -` to pipe SQL straight from a file or a previous command.

## Principles

**Inherited:**

- [Tokens are the budget](../principles.md#tokens-are-the-budget) — three fields, no echoed
  input.
- [Surface the contract, don't hide Metabase](../principles.md#surface-the-contract-dont-hide-metabase)
  — emits a real Metabase question URL, not a tool-specific abstraction.

**Local:**

- **A link is not a result.** This command deliberately does not execute the query. Handing
  back a URL *and* rows would double the cost of both paths and blur which one the caller
  asked for.
