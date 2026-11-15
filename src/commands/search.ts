import { createClient, instanceLabel } from "../resolve.js";
import { search, type SearchItem } from "../metabase/search.js";
import { capList, type StructuredOutput } from "../output.js";
import { choices, int, parseFlags, requirePositional, SEARCH_FLAGS, str } from "../flags.js";

export const SEARCH_HELP = `usage: metabase-axi search <query> [flags]
flags:
  --type <models>     comma-separated: card,dashboard,collection,table,dataset
  --limit <n>
  --instance <name>
examples:
  metabase-axi search "revenue"
  metabase-axi search "orders" --type table,card`;

/** The models `--type` accepts (specs/commands/search.md). */
export const SEARCH_MODELS = ["card", "dashboard", "collection", "table", "dataset"] as const;

function collectionName(item: SearchItem): string {
  return item.collection?.name ?? "";
}

export async function searchCommand(args: string[]): Promise<StructuredOutput> {
  const parsed = parseFlags("search", args, SEARCH_FLAGS);
  const query = requirePositional(
    parsed,
    0,
    "A search query",
    'metabase-axi search "<query>" [--type <models>]',
  );
  // An unknown model must not turn into an unfiltered search.
  const models = choices(parsed, "--type", SEARCH_MODELS);
  const limit = int(parsed, "--limit") ?? 30;
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });

  const items = await search(client, query, models);
  if (items.length === 0) {
    return {
      instance: instanceLabel(instance),
      message: `0 results for "${query}"`,
      help: ["Broaden the query, or drop/adjust --type"],
    };
  }

  const { items: capped, label } = capList(items, limit);
  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    results: capped.map((it) => ({
      model: it.model,
      id: it.id,
      name: it.name,
      collection: collectionName(it),
    })),
  };
  if (items.length > capped.length) out.count = label;
  out.help = [
    "Open a card: `metabase-axi card view <id>` or `card run <id>`",
    "Open a dashboard: `metabase-axi dashboard view <id>`",
  ];
  return out;
}
