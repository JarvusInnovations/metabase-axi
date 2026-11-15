/**
 * Strict per-command argument parsing (specs/behaviors/flag-parsing-and-errors.md).
 *
 * Each command declares the flags and positionals it takes; anything else is refused by
 * name, before any config read or request, with the valid flags listed so one turn
 * self-corrects. A silently dropped flag is worse than an error: the caller gets plausible
 * output it believes was filtered, and acts on it.
 *
 * Ported from the family's reference parser (nexudus-axi `src/flags.ts`), with an
 * optional-value flag kind for the `*-out` exports.
 */
import { AxiError } from "axi-sdk-js";

const BIN = "metabase-axi";

export interface FlagSpec {
  /** Flags that take a value, e.g. `--limit 10` or `--limit=10`. */
  value?: string[];
  /** Flags that are standalone switches, e.g. `--archived`. */
  boolean?: string[];
  /**
   * Flags that may carry a value with `=` and only with `=`: `--csv-out` or
   * `--csv-out=./q4.csv` (specs/behaviors/result-export-and-truncation.md). A following
   * token is never consumed as the value.
   */
  optional?: string[];
  /** Renamed, removed or commonly guessed flags mapped to a targeted hint. */
  deprecated?: Record<string, string>;
  /**
   * Flags that are specified but not built yet, mapped to what works today. They parse bare
   * or with a value and fail as USAGE with "not available yet" — never silently ignored.
   */
  planned?: Record<string, string>;
  /**
   * How many positional arguments the command accepts: a count, or `"many"` for a variadic
   * tail. Defaults to 0. Extras fail as USAGE rather than being dropped.
   */
  positionals?: number | "many";
  /** Usage line shown when positionals are wrong. */
  usage?: string;
  /**
   * The command never resolves an instance (e.g. `auth use`), so the global `--instance`
   * is refused like any other unknown flag and the error does not offer it.
   */
  noInstance?: boolean;
}

export interface Parsed {
  positional: string[];
  /** `true` for a switch or a bare optional-value flag; the string for a given value. */
  flags: Record<string, string | true>;
}

/** `--help` is universal and never reported as unknown (AXI §6). */
const HELP_FLAG = "--help";

/**
 * The global instance selector (specs/behaviors/instance-resolution.md): accepted on every
 * command without per-command declaration, unless the command sets `noInstance`.
 */
const INSTANCE_FLAG = "--instance";

/** The export flags, shared by every command that offers a full-data file. */
export const EXPORT_FLAGS = ["--json-out", "--csv-out", "--xlsx-out"] as const;

/** A token that reads as a long flag: `--limit`, `--csv-out=x` — not `---` or `-- note`. */
const LONG_FLAG = /^--[A-Za-z][A-Za-z0-9-]*(=|$)/;
/** A single-letter short flag (`-n`). Not house style; recognized only to hint the long form. */
const SHORT_FLAG = /^-[A-Za-z]$/;

function isFlagToken(token: string): boolean {
  return LONG_FLAG.test(token) || SHORT_FLAG.test(token);
}

/**
 * Whether the token after a bare `*-out` flag was meant as its path: no whitespace, and
 * either path-shaped or carrying an export extension. SQL strings and ids never match.
 */
function looksLikePath(token: string): boolean {
  if (/\s/.test(token)) return false;
  return (
    token.includes("/") ||
    token.includes("\\") ||
    token.startsWith("~") ||
    token.startsWith(".") ||
    /\.(json|csv|xlsx|tsv|txt)$/i.test(token)
  );
}

function spaceFormError(flag: string, token: string): AxiError {
  return new AxiError(`${flag} takes its path with =: ${flag}=${token}`, "USAGE", [
    `Run again with ${flag}=${token}, or ${flag} alone for an auto-named file in the temp dir`,
  ]);
}

/** Commands whose declaration offers the given export flag, e.g. `query, card run`. */
function commandsOffering(flag: string): string {
  return Object.entries(ALL_FLAG_SPECS)
    .filter(([, spec]) => spec.optional?.includes(flag))
    .map(([command]) => command)
    .join(", ");
}

/**
 * Parse argv for one command, rejecting anything not declared.
 *
 * An unrecognized flag fails with exit code 2 and lists the valid flags inline, which
 * collapses the agent's correction from two turns into one.
 */
export function parseFlags(command: string, argv: string[], spec: FlagSpec): Parsed {
  const valueFlags = new Set(spec.value ?? []);
  const boolFlags = new Set(spec.boolean ?? []);
  const optionalFlags = new Set(spec.optional ?? []);
  const deprecated = spec.deprecated ?? {};
  const takesInstance = !spec.noInstance;
  const always = takesInstance ? "--help and --instance always allowed" : "--help always allowed";

  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  /** The positional that directly followed a bare optional flag, by flag. */
  const optionalFollowers: Record<string, string> = {};

  // The one rejection function: every "this flag is not for this command" message is
  // classified here so the wording cannot drift between commands, and every suggestion is
  // true of the command printing it.
  const unknown = (name: string): never => {
    const known = [
      ...valueFlags,
      ...boolFlags,
      ...[...optionalFlags].map((f) => `${f}[=<path>]`),
    ].sort();
    const validLine =
      known.length > 0
        ? `valid flags for \`${command}\`: ${known.join(", ")} (${always})`
        : `\`${command}\` takes no flags (${always})`;

    let hint: string | undefined = deprecated[name];
    if (hint === undefined && name === "--json") {
      hint = optionalFlags.has("--json-out")
        ? "--json is not supported (stdout is always TOON); use --json-out[=<path>] to write the full result to a file"
        : `--json is not supported (stdout is always TOON); --json-out is available on: ${commandsOffering("--json-out")}`;
    }
    if (hint === undefined && (EXPORT_FLAGS as readonly string[]).includes(name)) {
      hint = `\`${command}\` has no ${name}; ${name} is available on: ${commandsOffering(name)}`;
    }
    if (hint === undefined && name === "-h") {
      hint = `-h is not a flag of this tool; run \`${BIN} ${command} --help\``;
    }
    if (hint === undefined && SHORT_FLAG.test(name)) {
      hint = `short flags are not supported; ${validLine}`;
    }

    throw new AxiError(`unknown flag ${name} for \`${command}\``, "UNKNOWN_FLAG", [
      hint ?? validLine,
    ]);
  };

  const set = (name: string, value: string | true): void => {
    if (flags[name] !== undefined) {
      throw new AxiError(`${name} was given more than once`, "USAGE", [
        `Pass ${name} once to \`${BIN} ${command}\``,
      ]);
    }
    flags[name] = value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;

    if (arg === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }

    // Only `--<letter>` (or a lone `-x`) starts a flag. Dash-led free text — a SQL string
    // opening with `-- comment`, `-5`, the stdin marker `-` — is a positional.
    if (!isFlagToken(arg)) {
      positional.push(arg);
      continue;
    }

    if (arg === HELP_FLAG) {
      flags[HELP_FLAG] = true;
      continue;
    }

    // Support both `--db=6` and `--db 6`.
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const inlineValue = eq === -1 ? undefined : arg.slice(eq + 1);

    if (spec.planned && Object.hasOwn(spec.planned, name)) {
      throw new AxiError(
        `${name} is not available yet for \`${command}\` — coming in an upcoming release`,
        "USAGE",
        [spec.planned[name]!],
      );
    }

    if (boolFlags.has(name)) {
      if (inlineValue !== undefined) {
        throw new AxiError(`${name} is a switch and takes no value`, "USAGE", [
          `Run \`${BIN} ${command} ${name}\` without a value`,
        ]);
      }
      set(name, true);
      continue;
    }

    if (optionalFlags.has(name)) {
      if (inlineValue !== undefined) {
        if (inlineValue === "") {
          throw new AxiError(`${name}= needs a path after the =`, "USAGE", [
            `Pass ${name} alone for an auto-named file in the temp dir, or ${name}=<path>`,
          ]);
        }
        set(name, inlineValue);
        continue;
      }
      set(name, true);
      // Never consume the next token: it may be the command's own positional (an id).
      const next = argv[i + 1];
      if (next !== undefined && next !== "--" && !isFlagToken(next)) {
        if (looksLikePath(next)) throw spaceFormError(name, next);
        optionalFollowers[name] = next;
      }
      continue;
    }

    if (valueFlags.has(name) || (takesInstance && name === INSTANCE_FLAG)) {
      if (inlineValue !== undefined) {
        if (inlineValue === "") {
          throw new AxiError(`${name} requires a value`, "USAGE", [
            `Run \`${BIN} ${command} ${name} <value>\``,
          ]);
        }
        set(name, inlineValue);
        continue;
      }
      const next = argv[i + 1];
      // Only a flag-shaped token is a missing value; `-5` or `--- draft ---` is a value.
      if (next === undefined || next === "--" || isFlagToken(next)) {
        throw new AxiError(`${name} requires a value`, "USAGE", [
          `Run \`${BIN} ${command} ${name} <value>\``,
        ]);
      }
      set(name, next);
      i++;
      continue;
    }

    unknown(name);
  }

  const maxPositionals = spec.positionals ?? 0;
  if (
    maxPositionals !== "many" &&
    positional.length > maxPositionals &&
    flags[HELP_FLAG] === undefined
  ) {
    const extra = positional.slice(maxPositionals);
    // An extra positional that came right after a bare export flag was meant as its path.
    for (const [flag, token] of Object.entries(optionalFollowers)) {
      if (extra.includes(token)) throw spaceFormError(flag, token);
    }
    const usage = spec.usage ? ` — usage: ${spec.usage}` : "";
    throw new AxiError(
      `unexpected argument${extra.length > 1 ? "s" : ""} for \`${command}\`: ${extra.join(" ")}`,
      "USAGE",
      [
        maxPositionals === 0
          ? `\`${command}\` takes no positional arguments${usage}`
          : `\`${command}\` takes ${maxPositionals} positional argument${maxPositionals > 1 ? "s" : ""}${usage}`,
      ],
    );
  }

  return { positional, flags };
}

/** Read a value flag as a string, or undefined when absent or given bare. */
export function str(parsed: Parsed, name: string): string | undefined {
  const raw = parsed.flags[name];
  return typeof raw === "string" ? raw : undefined;
}

/** True when the flag was supplied in any form. */
export function bool(parsed: Parsed, name: string): boolean {
  return parsed.flags[name] !== undefined;
}

function wholeNumber(raw: string): number | undefined {
  return /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : undefined;
}

/**
 * Read a value flag as a positive whole number. A malformed value is an error, never a
 * silent fallback to the default: `--limit abc` must not read as "no limit given".
 */
export function int(parsed: Parsed, name: string): number | undefined {
  const raw = str(parsed, name);
  if (raw === undefined) return undefined;
  const n = wholeNumber(raw);
  if (n === undefined) {
    throw new AxiError(`${name} expects a positive whole number, got: ${raw}`, "VALIDATION_ERROR", [
      `Example: ${name} 10`,
    ]);
  }
  return n;
}

/** Require the Nth positional argument, or fail with usage. */
export function requirePositional(
  parsed: Parsed,
  index: number,
  label: string,
  usage: string,
): string {
  const value = parsed.positional[index];
  if (value === undefined || value.length === 0) {
    throw new AxiError(`${label} is required`, "USAGE", [usage]);
  }
  return value;
}

/** Require the Nth positional as a numeric id; a name where an id belongs is an error. */
export function requireId(parsed: Parsed, index: number, label: string, usage: string): number {
  const raw = requirePositional(parsed, index, label, usage);
  const n = wholeNumber(raw);
  if (n === undefined) {
    throw new AxiError(`${label} must be a number, got: ${raw}`, "VALIDATION_ERROR", [usage]);
  }
  return n;
}

/** A comma-separated list drawn from a fixed set; an unknown value is reported by name. */
export function choices<T extends string>(
  parsed: Parsed,
  name: string,
  allowed: readonly T[],
): T[] | undefined {
  const raw = str(parsed, name);
  if (raw === undefined) return undefined;
  const picked = raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const bad = picked.filter((v) => !(allowed as readonly string[]).includes(v));
  if (bad.length > 0 || picked.length === 0) {
    throw new AxiError(
      bad.length > 0
        ? `unknown ${name} value${bad.length > 1 ? "s" : ""}: ${bad.join(", ")}`
        : `${name} requires a value`,
      "VALIDATION_ERROR",
      [`valid values: ${allowed.join(", ")}`],
    );
  }
  return [...new Set(picked)] as T[];
}

/**
 * Resolve a command's subcommand (`auth add`, `card run`, ...) and parse the remaining argv
 * against that subcommand's declared flag set. When the first token is missing or looks
 * like a flag, `defaultSub` (if given) is used and the full argv is treated as the
 * subcommand's own args — this is what makes `metabase-axi card` equivalent to
 * `metabase-axi card list`.
 */
export function parseSubcommand(
  command: string,
  args: string[],
  specs: Record<string, FlagSpec>,
  defaultSub?: string,
): { sub: string; parsed: Parsed } {
  const first = args[0];
  const usesDefault = first === undefined || first.startsWith("-");
  const sub = usesDefault ? defaultSub : first;

  if (sub === undefined || !Object.hasOwn(specs, sub)) {
    throw new AxiError(
      sub === undefined
        ? `\`${command}\` requires a subcommand`
        : `unknown ${command} subcommand "${sub}"`,
      "VALIDATION_ERROR",
      [
        `valid subcommands: ${Object.keys(specs).join(", ")}`,
        `Run \`${BIN} ${command} --help\` for usage`,
      ],
    );
  }

  const rest = usesDefault ? args : args.slice(1);
  const parsed = parseFlags(`${command} ${sub}`, rest, specs[sub]!);
  return { sub, parsed };
}

// ── Declared per-command flag sets ──────────────────────────────────
// One entry per command/subcommand pair. Keeping them all here (rather than scattered
// across command files) is what makes "unknown flag" rejection consistent — see
// specs/commands/*.md for the flags each surface declares. `--instance` is global and never
// declared per-command; commands that do not resolve an instance set `noInstance`.

export const AUTH_FLAGS: Record<string, FlagSpec> = {
  add: {
    value: ["--url", "--api-key", "--username", "--password"],
    positionals: 1,
    usage: "metabase-axi auth add <name> --url <url> --api-key <key>",
    noInstance: true,
  },
  list: { noInstance: true, usage: "metabase-axi auth list" },
  use: { positionals: 1, usage: "metabase-axi auth use <name>", noInstance: true },
  login: { positionals: 1, usage: "metabase-axi auth login [<name>]" },
  remove: { positionals: 1, usage: "metabase-axi auth remove <name>", noInstance: true },
};

export const DOCTOR_FLAGS: FlagSpec = { usage: "metabase-axi doctor [--instance <name>]" };

export const SETUP_FLAGS: Record<string, FlagSpec> = {
  hooks: { noInstance: true, usage: "metabase-axi setup hooks" },
};

export const QUERY_FLAGS: FlagSpec = {
  value: ["--db", "--mbql", "--params", "--limit"],
  optional: [...EXPORT_FLAGS],
  positionals: 1,
  usage: 'metabase-axi query "<sql>" --db <id|name>',
};

export const CARD_FLAGS: Record<string, FlagSpec> = {
  list: {
    value: ["--db", "--collection", "--limit"],
    boolean: ["--mine", "--archived"],
    usage: "metabase-axi card list [flags]",
  },
  view: { positionals: 1, usage: "metabase-axi card view <id>" },
  run: {
    value: ["--params", "--limit"],
    optional: [...EXPORT_FLAGS],
    positionals: 1,
    usage: "metabase-axi card run <id> [flags]",
  },
};

export const DATABASE_FLAGS: Record<string, FlagSpec> = {
  list: { value: ["--limit"], usage: "metabase-axi db list" },
  schema: {
    value: ["--table", "--search", "--limit"],
    optional: ["--json-out"],
    positionals: 1,
    usage: "metabase-axi db schema <id|name> [flags]",
  },
};

export const SEARCH_FLAGS: FlagSpec = {
  value: ["--type", "--limit"],
  positionals: 1,
  usage: 'metabase-axi search "<query>" [flags]',
};

export const DASHBOARD_FLAGS: Record<string, FlagSpec> = {
  list: {
    value: ["--collection", "--limit"],
    planned: {
      "--archived":
        "Run `metabase-axi dashboard list` for current dashboards, or `metabase-axi card list --archived` for archived cards",
    },
    usage: "metabase-axi dashboard list [flags]",
  },
  view: {
    optional: ["--json-out"],
    positionals: 1,
    usage: "metabase-axi dashboard view <id> [flags]",
  },
};

export const COLLECTION_FLAGS: Record<string, FlagSpec> = {
  list: {
    value: ["--parent", "--namespace", "--limit"],
    boolean: ["--archived"],
    usage: "metabase-axi collection list [flags]",
  },
};

function withPrefix(command: string, specs: Record<string, FlagSpec>): Record<string, FlagSpec> {
  return Object.fromEntries(
    Object.entries(specs).map(([sub, spec]) => [`${command} ${sub}`, spec]),
  );
}

/**
 * Every declaration keyed by its full command (`query`, `card run`, ...). Tests walk this
 * to sweep unknown-flag rejection and to compare declarations with `--help`.
 */
export const ALL_FLAG_SPECS: Record<string, FlagSpec> = {
  ...withPrefix("auth", AUTH_FLAGS),
  doctor: DOCTOR_FLAGS,
  ...withPrefix("setup", SETUP_FLAGS),
  query: QUERY_FLAGS,
  ...withPrefix("card", CARD_FLAGS),
  ...withPrefix("db", DATABASE_FLAGS),
  search: SEARCH_FLAGS,
  ...withPrefix("dashboard", DASHBOARD_FLAGS),
  ...withPrefix("collection", COLLECTION_FLAGS),
};
