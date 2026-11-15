/**
 * End-to-end strictness: every command goes through the strict parser, usage errors exit 2
 * through `formatError`, and `--help` stays in step with the declared flags
 * (specs/behaviors/flag-parsing-and-errors.md).
 *
 * Hermetic: the config dir is an empty temp dir and no instance env is set, so a command
 * that got past argument parsing would fail with CONFIG (exit 1) — never reach a network.
 */
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AxiError, runAxiCli } from "axi-sdk-js";
import { cliOptions, formatError } from "../src/cli.js";
import { ALL_FLAG_SPECS } from "../src/flags.js";

const ENV_KEYS = [
  "METABASE_AXI_CONFIG_DIR",
  "METABASE_URL",
  "METABASE_API_KEY",
  "METABASE_USERNAME",
  "METABASE_PASSWORD",
];
const saved: Record<string, string | undefined> = {};
let configDir: string;

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  configDir = mkdtempSync(join(tmpdir(), "mb-axi-strict-"));
  process.env.METABASE_AXI_CONFIG_DIR = configDir;
  process.exitCode = undefined;
});

afterEach(() => {
  // Nothing may have been written by a refused invocation.
  expect(readdirSync(configDir)).toEqual([]);
  rmSync(configDir, { recursive: true, force: true });
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  process.exitCode = undefined;
});

/** Run the CLI in-process; returns stdout and the exit code it set. */
async function run(argv: string[]): Promise<{ out: string; code: number }> {
  const chunks: string[] = [];
  process.exitCode = undefined;
  await runAxiCli(cliOptions({ argv, stdout: { write: (c: string) => chunks.push(c) } }));
  const code = Number(process.exitCode ?? 0);
  process.exitCode = undefined;
  return { out: chunks.join(""), code };
}

describe("formatError", () => {
  it("maps the usage codes to exit 2", () => {
    for (const code of ["USAGE", "UNKNOWN_FLAG", "VALIDATION_ERROR"]) {
      const { output, exitCode } = formatError(new AxiError("bad call", code, ["do this"]));
      expect(exitCode).toBe(2);
      expect(output).toContain("error: bad call");
      expect(output).toContain(`code: ${code}`);
      expect(output).toContain("do this");
      expect(output.endsWith("\n")).toBe(true);
    }
  });

  it("keeps failed operations at exit 1", () => {
    for (const code of ["CONFIG", "AUTH", "NOT_FOUND", "QUERY_ERROR", "UNREACHABLE"]) {
      expect(formatError(new AxiError("nope", code)).exitCode).toBe(1);
    }
  });

  it("wraps an unexpected throw as INTERNAL_ERROR with a doctor hint and no stack", () => {
    const { output, exitCode } = formatError(new TypeError("x is not a function"));
    expect(exitCode).toBe(1);
    expect(output).toContain("unexpected failure: x is not a function");
    expect(output).toContain("code: INTERNAL_ERROR");
    expect(output).toContain("metabase-axi doctor");
    expect(output).not.toMatch(/^\s+at /m);
    expect(formatError("plain string").output).toContain("unexpected failure: plain string");
  });

  it("is wired into the CLI: a handler that throws a raw error exits 1 as INTERNAL_ERROR", async () => {
    const chunks: string[] = [];
    await runAxiCli(
      cliOptions({
        argv: ["boom"],
        stdout: { write: (c: string) => chunks.push(c) },
        commands: {
          boom: () => {
            throw new Error("kaboom");
          },
        },
      }),
    );
    expect(chunks.join("")).toContain("code: INTERNAL_ERROR");
    expect(process.exitCode).toBe(1);
  });
});

describe("every command rejects an unknown flag", () => {
  for (const [command, spec] of Object.entries(ALL_FLAG_SPECS)) {
    it(`${command} --bogus → UNKNOWN_FLAG, exit 2, lists its flags`, async () => {
      // Fill the positional slots so the only thing wrong is the flag.
      const positionals = spec.positionals === 1 ? ["1"] : [];
      const { out, code } = await run([...command.split(" "), ...positionals, "--bogus"]);
      expect(code).toBe(2);
      expect(out).toContain(`error: unknown flag --bogus for \`${command}\``);
      expect(out).toContain("code: UNKNOWN_FLAG");
      for (const flag of [...(spec.value ?? []), ...(spec.boolean ?? [])]) {
        expect(out).toContain(flag);
      }
      for (const flag of spec.optional ?? []) expect(out).toContain(`${flag}[=<path>]`);
      expect(out).toContain(
        spec.noInstance ? "(--help always allowed)" : "(--help and --instance always allowed)",
      );
    });
  }
});

describe("usage errors exit 2 before any config read or request", () => {
  const cases: Array<[string, string[], string, string]> = [
    ["misspelled filter", ["card", "list", "--colection", "12"], "UNKNOWN_FLAG", "--collection"],
    ["extra positional", ["card", "view", "1", "2"], "USAGE", "unexpected argument"],
    ["extra positional on doctor", ["doctor", "prod"], "USAGE", "takes no positional"],
    ["auth use with two names", ["auth", "use", "a", "b"], "USAGE", "auth use <name>"],
    ["missing id", ["card", "run"], "USAGE", "A card id is required"],
    ["missing search query", ["search"], "USAGE", "A search query is required"],
    ["value flag without a value", ["query", "SELECT 1", "--db"], "USAGE", "--db requires a value"],
    ["switch with a value", ["card", "list", "--mine=1"], "USAGE", "takes no value"],
    ["repeated flag", ["db", "list", "--limit", "1", "--limit", "2"], "USAGE", "more than once"],
    ["non-numeric --limit", ["card", "list", "--limit", "abc"], "VALIDATION_ERROR", "got: abc"],
    [
      "non-numeric query --limit",
      ["query", "SELECT 1", "--limit", "x"],
      "VALIDATION_ERROR",
      "got: x",
    ],
    ["non-numeric card id", ["card", "view", "abc"], "VALIDATION_ERROR", "must be a number"],
    [
      "non-numeric dashboard id",
      ["dashboard", "view", "x"],
      "VALIDATION_ERROR",
      "must be a number",
    ],
    [
      "db name where card list wants an id",
      ["card", "list", "--db", "analytics"],
      "VALIDATION_ERROR",
      "--db expects",
    ],
    [
      "non-numeric --parent",
      ["collection", "list", "--parent", "root"],
      "VALIDATION_ERROR",
      "--parent expects",
    ],
    [
      "unknown search model",
      ["search", "x", "--type", "card,bogus"],
      "VALIDATION_ERROR",
      "valid values: card, dashboard, collection, table, dataset",
    ],
    [
      "unknown subcommand",
      ["card", "bogus"],
      "VALIDATION_ERROR",
      "valid subcommands: list, view, run",
    ],
    [
      "unknown setup subcommand",
      ["setup", "bogus"],
      "VALIDATION_ERROR",
      "valid subcommands: hooks",
    ],
    [
      "two export flags",
      ["card", "run", "1", "--csv-out", "--json-out"],
      "VALIDATION_ERROR",
      "at most one export flag",
    ],
    ["--json", ["query", "SELECT 1", "--json"], "UNKNOWN_FLAG", "use --json-out[=<path>]"],
    [
      "export flag on a command without export",
      ["card", "list", "--csv-out"],
      "UNKNOWN_FLAG",
      "available on: query, card run",
    ],
    [
      "csv export of a schema",
      ["db", "schema", "6", "--csv-out"],
      "UNKNOWN_FLAG",
      "has no --csv-out",
    ],
    ["planned flag", ["dashboard", "list", "--archived"], "USAGE", "not available yet"],
    [
      "--instance where no instance is resolved",
      ["auth", "remove", "a", "--instance", "b"],
      "UNKNOWN_FLAG",
      "(--help always allowed)",
    ],
    ["short flag", ["card", "list", "-n", "5"], "UNKNOWN_FLAG", "short flags are not supported"],
  ];
  for (const [name, argv, errorCode, fragment] of cases) {
    it(`${name}: metabase-axi ${argv.join(" ")}`, async () => {
      const { out, code } = await run(argv);
      expect(out).toContain(`code: ${errorCode}`);
      expect(out).toContain(fragment);
      expect(code).toBe(2);
    });
  }
});

describe("export path takes =", () => {
  it("refuses the space form from the old help example and names the = form", async () => {
    const { out, code } = await run([
      "query",
      "SELECT * FROM orders",
      "--db",
      "6",
      "--csv-out",
      "/tmp/orders.csv",
    ]);
    expect(code).toBe(2);
    expect(out).toContain("code: USAGE");
    expect(out).toContain("--csv-out=/tmp/orders.csv");
  });

  it("refuses the space form on card run, db schema and dashboard view", async () => {
    for (const argv of [
      ["card", "run", "42", "--xlsx-out", "./card.xlsx"],
      ["db", "schema", "6", "--json-out", "schema.json"],
      ["dashboard", "view", "7", "--json-out", "out"],
    ]) {
      const { out, code } = await run(argv);
      expect(code).toBe(2);
      expect(out).toContain("code: USAGE");
      expect(out).toContain(`${argv[3]}=${argv[4]}`);
    }
  });

  it("does not swallow the id after a bare export flag, and accepts the = form", async () => {
    // Both get past argument parsing and stop at the (empty) config: CONFIG, exit 1.
    for (const argv of [
      ["card", "run", "--csv-out", "42"],
      ["card", "run", "42", "--csv-out=/tmp/card-42.csv"],
      ["query", "-- note\nSELECT 1", "--db", "6", "--json-out"],
    ]) {
      const { out, code } = await run(argv);
      expect(out).toContain("code: CONFIG");
      expect(code).toBe(1);
    }
  });

  it("the query help example uses the = form", async () => {
    const { out } = await run(["query", "--help"]);
    expect(out).toContain("--csv-out=/tmp/orders.csv");
    expect(out).not.toMatch(/--(json|csv|xlsx)-out [^\s(]/);
  });
});

describe("declared flags match --help", () => {
  const commands = [...new Set(Object.keys(ALL_FLAG_SPECS).map((c) => c.split(" ")[0]))];
  const help = (command: string): string => cliOptions().getCommandHelp?.(command) ?? "";
  const specsOf = (command: string) =>
    Object.entries(ALL_FLAG_SPECS)
      .filter(([name]) => name.split(" ")[0] === command)
      .map(([, spec]) => spec);

  for (const command of commands) {
    it(`${command}: every declared flag is documented`, () => {
      const text = help(command);
      expect(text).not.toBe("");
      for (const spec of specsOf(command)) {
        const declared = [
          ...(spec.value ?? []),
          ...(spec.boolean ?? []),
          ...(spec.optional ?? []),
          ...Object.keys(spec.planned ?? {}),
        ];
        for (const flag of declared) {
          expect(text, `${flag} missing from \`${command} --help\``).toMatch(
            new RegExp(`${flag}(?![a-z-])`),
          );
        }
      }
      if (specsOf(command).some((spec) => !spec.noInstance)) expect(text).toContain("--instance");
    });

    it(`${command}: every documented flag is declared`, () => {
      const specs = specsOf(command);
      const declared = new Set<string>(["--help"]);
      for (const spec of specs) {
        for (const flag of [
          ...(spec.value ?? []),
          ...(spec.boolean ?? []),
          ...(spec.optional ?? []),
          ...Object.keys(spec.planned ?? {}),
        ]) {
          declared.add(flag);
        }
        if (!spec.noInstance) declared.add("--instance");
      }
      const documented = new Set(help(command).match(/--[a-z][a-z-]*/g) ?? []);
      for (const flag of documented) {
        expect(declared.has(flag), `${flag} is in \`${command} --help\` but not declared`).toBe(
          true,
        );
      }
    });
  }

  it("help marks the planned flag as not available yet", () => {
    expect(help("dashboard")).toMatch(/--archived \(not available yet/);
  });
});
