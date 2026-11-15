import { describe, it, expect } from "vitest";
import { AxiError } from "axi-sdk-js";
import {
  ALL_FLAG_SPECS,
  CARD_FLAGS,
  bool,
  choices,
  int,
  parseFlags,
  parseSubcommand,
  requireId,
  requirePositional,
  str,
  type FlagSpec,
} from "../src/flags.js";

/** Run a parse expected to fail and return the AxiError. */
function failure(fn: () => unknown): AxiError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AxiError);
    return error as AxiError;
  }
  throw new Error("expected the parse to fail");
}

const SPEC: FlagSpec = {
  value: ["--db", "--limit"],
  boolean: ["--mine"],
  optional: ["--json-out", "--csv-out"],
  positionals: 1,
  usage: "metabase-axi demo <id>",
};

describe("parseFlags", () => {
  it("parses declared flags in both value forms, switches and positionals", () => {
    const parsed = parseFlags("demo", ["42", "--db", "6", "--limit=5", "--mine"], SPEC);
    expect(parsed.positional).toEqual(["42"]);
    expect(str(parsed, "--db")).toBe("6");
    expect(int(parsed, "--limit")).toBe(5);
    expect(bool(parsed, "--mine")).toBe(true);
    expect(bool(parsed, "--csv-out")).toBe(false);
  });

  it("rejects an unknown flag and lists the valid ones", () => {
    const err = failure(() => parseFlags("demo", ["--colection", "12"], SPEC));
    expect(err.code).toBe("UNKNOWN_FLAG");
    expect(err.message).toBe("unknown flag --colection for `demo`");
    expect(err.suggestions[0]).toBe(
      "valid flags for `demo`: --csv-out[=<path>], --db, --json-out[=<path>], --limit, --mine (--help and --instance always allowed)",
    );
  });

  it("accepts the global --instance without declaration, and --help", () => {
    const parsed = parseFlags("demo", ["--instance", "prod", "--help"], SPEC);
    expect(str(parsed, "--instance")).toBe("prod");
    expect(bool(parsed, "--help")).toBe(true);
  });

  it("refuses --instance on a noInstance command and does not offer it", () => {
    const err = failure(() =>
      parseFlags("auth use", ["prod", "--instance", "x"], { positionals: 1, noInstance: true }),
    );
    expect(err.code).toBe("UNKNOWN_FLAG");
    expect(err.suggestions[0]).toBe("`auth use` takes no flags (--help always allowed)");
  });

  it("fails as USAGE when a value flag has no value", () => {
    expect(failure(() => parseFlags("demo", ["--limit"], SPEC)).code).toBe("USAGE");
    expect(failure(() => parseFlags("demo", ["--limit="], SPEC)).code).toBe("USAGE");
    // A flag-shaped next token is a missing value, not a value.
    const err = failure(() => parseFlags("demo", ["--db", "--mine"], SPEC));
    expect(err.code).toBe("USAGE");
    expect(err.message).toBe("--db requires a value");
  });

  it("takes a dash-led non-flag token as a value", () => {
    expect(str(parseFlags("demo", ["--db", "-5"], SPEC), "--db")).toBe("-5");
  });

  it("fails as USAGE when a switch is given a value", () => {
    const err = failure(() => parseFlags("demo", ["--mine=yes"], SPEC));
    expect(err.code).toBe("USAGE");
    expect(err.message).toContain("takes no value");
  });

  it("fails as USAGE when a flag is repeated", () => {
    const err = failure(() => parseFlags("demo", ["--limit", "1", "--limit=2"], SPEC));
    expect(err.code).toBe("USAGE");
    expect(err.message).toBe("--limit was given more than once");
  });

  it("fails as USAGE on extra positionals, with the usage line", () => {
    const err = failure(() => parseFlags("demo", ["1", "2", "3"], SPEC));
    expect(err.code).toBe("USAGE");
    expect(err.message).toBe("unexpected arguments for `demo`: 2 3");
    expect(err.suggestions[0]).toContain("usage: metabase-axi demo <id>");
    expect(failure(() => parseFlags("doctor", ["extra"], {})).suggestions[0]).toContain(
      "takes no positional arguments",
    );
  });

  it("keeps dash-led free text and the stdin marker as positionals", () => {
    const sql = "-- top customers\nSELECT 1";
    expect(parseFlags("demo", [sql], SPEC).positional).toEqual([sql]);
    expect(parseFlags("demo", ["-"], SPEC).positional).toEqual(["-"]);
    expect(parseFlags("demo", ["-5"], SPEC).positional).toEqual(["-5"]);
  });

  it("treats everything after -- as positional", () => {
    expect(parseFlags("demo", ["--", "--mine"], SPEC).positional).toEqual(["--mine"]);
  });

  it("hints the long form for short flags, echoing the flag as typed", () => {
    const n = failure(() => parseFlags("demo", ["-n", "5"], SPEC));
    expect(n.code).toBe("UNKNOWN_FLAG");
    expect(n.message).toBe("unknown flag -n for `demo`");
    expect(n.suggestions[0]).toContain("short flags are not supported");
    expect(n.suggestions[0]).toContain("--limit");
    const h = failure(() => parseFlags("demo", ["-h"], SPEC));
    expect(h.suggestions[0]).toContain("metabase-axi demo --help");
  });

  it("uses a deprecated hint in place of the list, and lets the legacy flag parse bare", () => {
    const spec: FlagSpec = { value: ["--to"], deprecated: { "--until": "--until is now --to" } };
    const err = failure(() => parseFlags("demo", ["--until"], spec));
    expect(err.code).toBe("UNKNOWN_FLAG");
    expect(err.suggestions).toEqual(["--until is now --to"]);
  });

  it("refuses a planned flag as USAGE with 'not available yet'", () => {
    const spec: FlagSpec = { planned: { "--archived": "Run `metabase-axi demo`" } };
    for (const argv of [["--archived"], ["--archived=yes"]]) {
      const err = failure(() => parseFlags("demo", argv, spec));
      expect(err.code).toBe("USAGE");
      expect(err.message).toContain("not available yet");
      expect(err.suggestions).toEqual(["Run `metabase-axi demo`"]);
    }
  });
});

describe("optional-value (export) flags", () => {
  it("bare flag means an auto path", () => {
    const parsed = parseFlags("demo", ["42", "--csv-out"], SPEC);
    expect(bool(parsed, "--csv-out")).toBe(true);
    expect(str(parsed, "--csv-out")).toBeUndefined();
  });

  it("=path is the explicit path", () => {
    const parsed = parseFlags("demo", ["42", "--csv-out=./q4.csv"], SPEC);
    expect(str(parsed, "--csv-out")).toBe("./q4.csv");
  });

  it("refuses the space form with a path-looking token, naming the = form", () => {
    for (const path of ["/tmp/orders.csv", "./out", "~/x", "orders.csv", "dir/file"]) {
      const err = failure(() => parseFlags("demo", ["42", "--csv-out", path], SPEC));
      expect(err.code).toBe("USAGE");
      expect(err.message).toBe(`--csv-out takes its path with =: --csv-out=${path}`);
      expect(err.suggestions[0]).toContain(`--csv-out=${path}`);
    }
    // …even when the positional slot is still free: the path must not become the id.
    const err = failure(() => parseFlags("demo", ["--csv-out", "/tmp/orders.csv"], SPEC));
    expect(err.message).toContain("--csv-out=/tmp/orders.csv");
  });

  it("never swallows a positional that follows a bare export flag", () => {
    const parsed = parseFlags("demo", ["--csv-out", "42"], SPEC);
    expect(parsed.positional).toEqual(["42"]);
    expect(str(parsed, "--csv-out")).toBeUndefined();
    const sql = parseFlags("demo", ["--json-out", "SELECT a/b FROM t"], SPEC);
    expect(sql.positional).toEqual(["SELECT a/b FROM t"]);
  });

  it("names the = form when the follower turns out to be an extra positional", () => {
    const err = failure(() => parseFlags("demo", ["42", "--csv-out", "out"], SPEC));
    expect(err.code).toBe("USAGE");
    expect(err.message).toBe("--csv-out takes its path with =: --csv-out=out");
  });

  it("refuses an empty =", () => {
    const err = failure(() => parseFlags("demo", ["--csv-out="], SPEC));
    expect(err.code).toBe("USAGE");
    expect(err.message).toContain("needs a path after the =");
  });

  it("hints --json at --json-out where the command has it, and elsewhere names who does", () => {
    const here = failure(() => parseFlags("demo", ["--json"], SPEC));
    expect(here.code).toBe("UNKNOWN_FLAG");
    expect(here.suggestions[0]).toContain("use --json-out[=<path>]");
    const elsewhere = failure(() => parseFlags("doctor", ["--json"], {}));
    expect(elsewhere.suggestions[0]).toContain("--json-out is available on: query, card run");
  });

  it("refuses an export flag on a command without it, naming the commands that offer it", () => {
    const err = failure(() => parseFlags("search", ["x", "--csv-out"], ALL_FLAG_SPECS.search));
    expect(err.code).toBe("UNKNOWN_FLAG");
    expect(err.suggestions[0]).toBe(
      "`search` has no --csv-out; --csv-out is available on: query, card run",
    );
    // db schema is JSON only: --csv-out is refused before any request.
    const schema = failure(() =>
      parseFlags("db schema", ["6", "--csv-out"], ALL_FLAG_SPECS["db schema"]),
    );
    expect(schema.code).toBe("UNKNOWN_FLAG");
  });
});

describe("value accessors", () => {
  it("int rejects a malformed number instead of falling back", () => {
    for (const bad of ["abc", "0", "-3", "1.5", "10x"]) {
      const err = failure(() => int(parseFlags("demo", [`--limit=${bad}`], SPEC), "--limit"));
      expect(err.code).toBe("VALIDATION_ERROR");
      expect(err.message).toContain(`got: ${bad}`);
    }
    expect(int(parseFlags("demo", [], SPEC), "--limit")).toBeUndefined();
  });

  it("requirePositional fails as USAGE with the usage line", () => {
    const err = failure(() =>
      requirePositional(parseFlags("demo", [], SPEC), 0, "A card id", "metabase-axi demo <id>"),
    );
    expect(err.code).toBe("USAGE");
    expect(err.suggestions).toEqual(["metabase-axi demo <id>"]);
  });

  it("requireId rejects a non-numeric id", () => {
    const parsed = parseFlags("demo", ["abc"], SPEC);
    const err = failure(() => requireId(parsed, 0, "A card id", "metabase-axi demo <id>"));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(requireId(parseFlags("demo", ["42"], SPEC), 0, "A card id", "u")).toBe(42);
  });

  it("choices validates a comma-separated list against the allowed set", () => {
    const spec: FlagSpec = { value: ["--type"] };
    const allowed = ["card", "table"] as const;
    expect(choices(parseFlags("s", ["--type", "Table, card"], spec), "--type", allowed)).toEqual([
      "table",
      "card",
    ]);
    const err = failure(() =>
      choices(parseFlags("s", ["--type", "card,bogus"], spec), "--type", allowed),
    );
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("unknown --type value: bogus");
    expect(err.suggestions).toEqual(["valid values: card, table"]);
  });
});

describe("parseSubcommand", () => {
  it("uses the default subcommand when the first token is missing or a flag", () => {
    expect(parseSubcommand("card", [], CARD_FLAGS, "list").sub).toBe("list");
    const { sub, parsed } = parseSubcommand("card", ["--mine"], CARD_FLAGS, "list");
    expect(sub).toBe("list");
    expect(bool(parsed, "--mine")).toBe(true);
  });

  it("rejects an unknown subcommand with the valid ones", () => {
    const err = failure(() => parseSubcommand("card", ["bogus"], CARD_FLAGS, "list"));
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.suggestions[0]).toBe("valid subcommands: list, view, run");
    // An inherited property name is not a subcommand.
    expect(failure(() => parseSubcommand("card", ["toString"], CARD_FLAGS)).code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("names the subcommand in flag errors", () => {
    const err = failure(() => parseSubcommand("card", ["run", "42", "--mine"], CARD_FLAGS));
    expect(err.message).toBe("unknown flag --mine for `card run`");
  });
});
