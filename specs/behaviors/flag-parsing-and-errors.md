# Behavior: Flag parsing, usage errors & exit codes

## Rule

Every command **declares** the flags and positional arguments it takes, and one strict parser
enforces the declaration **before any network call or file write**. Anything undeclared is
refused by name with exit code 2 and the valid flags listed inline — never silently dropped.
Every failure reaches stdout as one structured TOON error; a stack trace never does.

> Why: a silently ignored flag is worse than an error. A misspelled filter (`--colection 12`)
> runs unfiltered, the agent gets plausible output it believes was filtered, and carries on
> with wrong data. Listing the valid flags in the error collapses the correction from two
> turns into one.

## Applies To

Every command and subcommand. The declarations live in one table (`src/flags.ts`) so that
rejection is consistent and a test can walk it.

## Details

### What is rejected

| Input | Code | The error says |
|---|---|---|
| Unknown flag | `UNKNOWN_FLAG` | ``valid flags for `<cmd>`: --a, --b (--help and --instance always allowed)`` |
| A known-but-wrong flag (`--json`, an export flag on a command without export, a short flag) | `UNKNOWN_FLAG` | a targeted hint in place of the list |
| Value flag with no value (`--limit` at the end, or followed by another flag) | `USAGE` | which flag |
| Switch given a value (`--mine=yes`) | `USAGE` | that it takes none |
| The same flag given twice | `USAGE` | which flag |
| Missing or extra positional argument | `USAGE` | the usage line |
| Export path in the space form (`--csv-out ./x.csv`) | `USAGE` | the `=` form to use instead |
| Unknown subcommand | `VALIDATION_ERROR` | the valid subcommands |
| Unknown or malformed *value* (`--limit abc`, a non-numeric card id, an unknown `--type` model) | `VALIDATION_ERROR` | what was expected / the allowed values |

### Lexical rules

- `--flag value` and `--flag=value` both work for value flags. The export flags
  (`--json-out`, `--csv-out`, `--xlsx-out`) take an **optional** value and only with `=`; see
  [result-export-and-truncation](result-export-and-truncation.md#full-export-file-opt-in).
- Only `--<letter>…` (or a single-letter `-x`) reads as a flag. Dash-led free text — a SQL
  string starting with `-- comment`, `-5`, the stdin marker `-` — is a positional.
- A value flag followed by a flag-shaped token is a missing value, not a value.
- `--` ends flag parsing; everything after it is positional.
- There are no short flags. `-h`, `-n` and the like fail with a hint naming the long form.

### Always-allowed flags

`--help` is valid on every command. `--instance <name>` is the global instance selector and
is accepted without per-command declaration on every command that talks to an instance; the
unknown-flag message names both so an agent does not conclude they are unsupported. The
commands that never resolve an instance (`auth add|list|use|remove`, `setup hooks`) refuse
`--instance` like any other unknown flag, and their message does not offer it.

### Error shape and exit codes

Errors are TOON on stdout:

```
error: unknown flag --colection for `card list`
code: UNKNOWN_FLAG
help[1]: "valid flags for `card list`: --archived, --collection, --db, --limit, --mine (--help and --instance always allowed)"
```

| Class | Codes | Exit |
|---|---|---|
| Malformed invocation | `USAGE`, `UNKNOWN_FLAG`, `VALIDATION_ERROR` | 2 |
| Failed operation | `AUTH`, `FORBIDDEN`, `NOT_FOUND`, `QUERY_ERROR`, `UNREACHABLE`, `CONFIG`, … (see [api/conventions.md](../api/conventions.md#error-envelope)) | 1 |
| Anything not anticipated | `INTERNAL_ERROR` | 1 |

An unexpected throw (a bug, a dependency error) is wrapped as `INTERNAL_ERROR` with the
message `unexpected failure: <message>` and a hint to run `metabase-axi doctor`. Raw stack
traces never reach stdout, where an agent would try to read them as data.

### Commands that are specified but not built

A command that exists in the spec but not yet in the release says it is **coming in an
upcoming release** and points at commands that work today. It never points at `specs/` or
`plans/` — an agent using the published package does not have them.

## Principles

**Inherited:**

- [Surface the contract, don't hide Metabase](../principles.md#surface-the-contract-dont-hide-metabase)
  — echoing what was understood includes refusing what was not.
- [Never guess which instance](../principles.md#never-guess-which-instance) — the same
  stance applied to arguments: never guess what a dropped flag meant.

**Local:**

- **Refuse, don't drop.** An argument the command does not understand is an error naming the
  argument and the fix. Promote to `principles.md` if a second behavior needs it.
