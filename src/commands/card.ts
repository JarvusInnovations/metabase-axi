import { AxiError } from "axi-sdk-js";
import { createClient, instanceLabel } from "../resolve.js";
import { exportCard, getCard, getCardDashboards, listCards, runCard } from "../metabase/card.js";
import { renderQueryResult } from "../result.js";
import { capList, relativeTime, truncateCell, type StructuredOutput } from "../output.js";
import { hasFlag, numFlag, parseArgs, strFlag } from "../flags.js";

export const CARD_HELP = `usage: metabase-axi card <subcommand> [flags]
subcommands[4]:
  list             list saved questions
  view <id>        show a card's query, display, and parameters
  run <id>         execute a card and preview/export its results
  dashboards <id>  dashboards embedding this card (check before editing it)
flags{list}:
  --mine, --archived, --db <id>, --collection <id>, --limit <n>, --instance <name>
flags{run}:
  --params <json>, --limit <n>, --json-out, --csv-out, --xlsx-out, --instance <name>
flags{dashboards}:
  --limit <n>, --instance <name>
examples:
  metabase-axi card list --mine
  metabase-axi card run 42 --csv-out
  metabase-axi card dashboards 42`;

export async function cardCommand(args: string[]): Promise<StructuredOutput> {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case undefined:
    case "list":
      return cardList(rest);
    case "view":
      return cardView(rest);
    case "run":
      return cardRun(rest);
    case "dashboards":
      return cardDashboards(rest);
    default:
      throw new AxiError(`Unknown card subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Run `metabase-axi card --help` for usage",
      ]);
  }
}

async function cardList(rest: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(rest, {
    valued: ["instance", "db", "collection", "limit"],
  });
  const { instance, client } = createClient({
    instanceFlag: strFlag(parsed, "instance"),
    risky: false,
  });

  const filter = hasFlag(parsed, "archived")
    ? "archived"
    : hasFlag(parsed, "mine")
      ? "mine"
      : "all";
  let cards = await listCards(client, filter);

  const dbFilter = strFlag(parsed, "db");
  if (dbFilter) {
    cards = cards.filter(
      (c) => String(c.database_id ?? c.dataset_query?.database ?? "") === dbFilter,
    );
  }
  const collFilter = strFlag(parsed, "collection");
  if (collFilter) {
    cards = cards.filter((c) => String(c.collection_id ?? "") === collFilter);
  }

  const { items, label } = capList(cards, numFlag(parsed, "limit") ?? 30);
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

async function cardView(rest: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(rest, { valued: ["instance"] });
  const id = parsed.positionals[0];
  if (!id) {
    throw new AxiError("A card id is required", "VALIDATION_ERROR", [
      "metabase-axi card view <id>",
    ]);
  }
  const { instance, client } = createClient({
    instanceFlag: strFlag(parsed, "instance"),
    risky: false,
  });
  const card = await getCard(client, Number(id));
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

async function cardDashboards(rest: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(rest, { valued: ["instance", "limit"] });
  const id = parsed.positionals[0];
  if (!id) {
    throw new AxiError("A card id is required", "VALIDATION_ERROR", [
      "metabase-axi card dashboards <id>",
    ]);
  }
  const { instance, client } = createClient({
    instanceFlag: strFlag(parsed, "instance"),
    risky: false,
  });
  const dashboards = await getCardDashboards(client, Number(id));

  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    card: id,
  };
  // Definitive empty state: an empty list must say "nowhere", not render as absent data.
  if (dashboards.length === 0) {
    out.dashboards = "none";
    out.help = [
      `Card ${id} is not embedded in any dashboard — editing it breaks nothing`,
      `Run \`metabase-axi card view ${id}\` to inspect its query`,
    ];
    return out;
  }

  const { items, label } = capList(dashboards, numFlag(parsed, "limit") ?? 30);
  out.dashboards = items.map((d) => ({
    id: d.id,
    name: d.name,
    collection: d.collection?.name ?? "",
  }));
  if (dashboards.length > items.length) out.count = label;
  out.help = [
    `Editing card ${id} affects ${dashboards.length} dashboard(s)`,
    "Run `metabase-axi dashboard view <id>` to see one in context",
  ];
  return out;
}

async function cardRun(rest: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(rest, { valued: ["instance", "params", "limit"] });
  const id = parsed.positionals[0];
  if (!id) {
    throw new AxiError("A card id is required", "VALIDATION_ERROR", ["metabase-axi card run <id>"]);
  }
  // Card execution is potentially expensive → risky resolution.
  const { instance, client } = createClient({
    instanceFlag: strFlag(parsed, "instance"),
    risky: true,
  });

  let parameters: unknown[] | undefined;
  const paramsStr = strFlag(parsed, "params");
  if (paramsStr) {
    try {
      parameters = JSON.parse(paramsStr) as unknown[];
    } catch {
      throw new AxiError("--params is not valid JSON", "VALIDATION_ERROR", [
        "Pass a JSON array of parameter objects",
      ]);
    }
  }

  const result = await runCard(client, Number(id), parameters);
  return renderQueryResult({
    instance,
    result,
    parsed,
    kind: `card-${id}`,
    showCompiledSql: true,
    exportBytes: (format) => exportCard(client, Number(id), format, parameters),
  });
}
