import { AxiError } from "axi-sdk-js";
import { createClient, instanceLabel } from "../resolve.js";
import { exportCard, getCard, listCards, runCard } from "../metabase/card.js";
import { renderQueryResult } from "../result.js";
import {
  capList,
  parseExportRequest,
  relativeTime,
  truncateCell,
  type StructuredOutput,
} from "../output.js";
import { bool, CARD_FLAGS, int, parseSubcommand, requireId, str, type Parsed } from "../flags.js";

export const CARD_HELP = `usage: metabase-axi card <subcommand> [flags]
subcommands[3]:
  list           list saved questions
  view <id>      show a card's query, display, and parameters
  run <id>       execute a card and preview/export its results
flags{list}:
  --mine, --archived, --db <id>, --collection <id>, --limit <n>, --instance <name>
flags{run}:
  --params <json>, --limit <n>, --json-out[=path], --csv-out[=path], --xlsx-out[=path],
  --instance <name>
flags{view}:
  --instance <name>
examples:
  metabase-axi card list --mine
  metabase-axi card run 42 --csv-out
  metabase-axi card run 42 --json-out=./card-42.json`;

export async function cardCommand(args: string[]): Promise<StructuredOutput> {
  const { sub, parsed } = parseSubcommand("card", args, CARD_FLAGS, "list");
  switch (sub) {
    case "view":
      return cardView(parsed);
    case "run":
      return cardRun(parsed);
    default:
      return cardList(parsed);
  }
}

async function cardList(parsed: Parsed): Promise<StructuredOutput> {
  // Validate values before resolving an instance or sending anything.
  const dbFilter = int(parsed, "--db");
  const collFilter = int(parsed, "--collection");
  const limit = int(parsed, "--limit") ?? 30;
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });

  const filter = bool(parsed, "--archived") ? "archived" : bool(parsed, "--mine") ? "mine" : "all";
  let cards = await listCards(client, filter);

  if (dbFilter !== undefined) {
    cards = cards.filter(
      (c) => String(c.database_id ?? c.dataset_query?.database ?? "") === String(dbFilter),
    );
  }
  if (collFilter !== undefined) {
    cards = cards.filter((c) => String(c.collection_id ?? "") === String(collFilter));
  }

  const { items, label } = capList(cards, limit);
  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    cards: items.map((c) => ({
      id: c.id,
      name: c.name,
      collection: c.collection?.name ?? "",
      type: c.query_type ?? "?",
      edited: relativeTime(c.updated_at),
    })),
  };
  if (cards.length > items.length) out.count = label;
  out.help = [
    "Run `metabase-axi card view <id>` for the query",
    "Run `metabase-axi card run <id>` to execute it",
  ];
  return out;
}

async function cardView(parsed: Parsed): Promise<StructuredOutput> {
  const id = requireId(parsed, 0, "A card id", "metabase-axi card view <id>");
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });
  const card = await getCard(client, id);
  const dq = card.dataset_query;

  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    card: `${card.id}: ${card.name}`,
    collection: card.collection?.name ?? "",
    db: dq?.database,
    display: card.display ?? "",
    query_type: card.query_type ?? "",
  };
  // Native SQL lives at dataset_query.native.query; structured queries use either the
  // classic `query` shape or the newer pMBQL `stages` shape.
  const nativeSql = dq?.native?.query;
  const structured = dq?.query ?? (dq as Record<string, unknown> | undefined)?.stages;
  if (nativeSql) {
    out.sql = truncateCell(nativeSql, 600);
  } else if (structured) {
    out.mbql = truncateCell(JSON.stringify(structured), 600);
  }
  const params = card.parameters ?? [];
  if (params.length) {
    out.parameters = params.map((p) => ({ name: p.name ?? p.slug ?? "", type: p.type ?? "" }));
  }
  out.help = [`Run \`metabase-axi card run ${card.id}\` to execute it`];
  return out;
}

async function cardRun(parsed: Parsed): Promise<StructuredOutput> {
  const id = requireId(parsed, 0, "A card id", "metabase-axi card run <id>");
  // Validate values before resolving an instance or sending anything.
  int(parsed, "--limit");
  parseExportRequest(parsed);
  // Card execution is potentially expensive → risky resolution.
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: true,
  });

  let parameters: unknown[] | undefined;
  const paramsStr = str(parsed, "--params");
  if (paramsStr) {
    try {
      parameters = JSON.parse(paramsStr) as unknown[];
    } catch {
      throw new AxiError("--params is not valid JSON", "VALIDATION_ERROR", [
        "Pass a JSON array of parameter objects",
      ]);
    }
  }

  const result = await runCard(client, id, parameters);
  return renderQueryResult({
    instance,
    result,
    parsed,
    kind: `card-${id}`,
    showCompiledSql: true,
    exportBytes: (format) => exportCard(client, id, format, parameters),
  });
}
