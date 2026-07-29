import { AxiError } from "axi-sdk-js";
import { instanceLabel, resolveInstance } from "../resolve.js";
import { numFlag, parseArgs, strFlag } from "../flags.js";
import type { StructuredOutput } from "../output.js";

export const PLAYGROUND_HELP = `usage: metabase-axi playground <sql> [flags]
       metabase-axi playground -       read native SQL from stdin
flags:
  --display <type>    table (default), bar, line, pie, scalar, …
  --db <id>           database the question should run against
  --instance <name>   target profile (only its URL is used)
examples:
  metabase-axi playground "SELECT 1 AS n"
  metabase-axi playground "SELECT * FROM t" --display bar --db 6
  cat q.sql | metabase-axi playground -`;

/** Browsers vary, but URLs past ~8k characters start getting rejected. */
const URL_WARN_THRESHOLD = 8000;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf-8").trim();
}

/**
 * Build the base64 question fragment Metabase decodes client-side. Payload shape matches
 * what the UI itself produces for an unsaved native question, so the link opens in the
 * query builder with the SQL already loaded.
 */
export function buildPlaygroundPayload(sql: string, display: string, database?: number): string {
  const payload = {
    dataset_query: {
      type: "native",
      native: { template_tags: {}, query: sql },
      ...(database !== undefined ? { database } : {}),
    },
    display,
    parameters: [],
    visualization_settings: {},
    type: "question",
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function playgroundUrl(baseUrl: string, fragment: string): string {
  return `${baseUrl.replace(/\/$/, "")}/question#${fragment}`;
}

export async function playgroundCommand(args: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(args, { valued: ["instance", "display", "db"] });

  let sql = parsed.positionals[0];
  if (sql === "-") sql = await readStdin();
  if (!sql) {
    throw new AxiError("Provide a SQL string or `-` for stdin", "VALIDATION_ERROR", [
      'metabase-axi playground "SELECT 1"',
    ]);
  }

  // URL-only: no client, no credentials, no request. Non-risky — nothing can be mutated
  // or made expensive, and the echoed instance catches a wrong-host link.
  const instance = resolveInstance({ instanceFlag: strFlag(parsed, "instance") });
  const display = strFlag(parsed, "display") ?? "table";
  const fragment = buildPlaygroundPayload(sql, display, numFlag(parsed, "db"));
  const url = playgroundUrl(instance.url, fragment);

  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    display,
  };
  const help = ["Open the url to explore and chart this query in Metabase"];
  if (url.length > URL_WARN_THRESHOLD) {
    help.push(
      `The url is ${url.length} chars — some browsers reject URLs this long`,
      "For a query this large, save it as a card instead and share the card link",
    );
  }
  // URL last and unwrapped: it is the payload, and must never be truncated.
  out.url = url;
  out.help = help;
  return out;
}
