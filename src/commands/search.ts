import { notImplemented, type StructuredOutput } from "../output.js";

export const SEARCH_HELP = `usage: metabase-axi search <query> [flags]
flags:
  --type <card|dashboard|collection|table|dataset>   filter by model (repeatable)
  --limit <n>
  --instance <name>
examples:
  metabase-axi search "revenue"
  metabase-axi search "orders" --type table`;

export async function searchCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("search");
}
