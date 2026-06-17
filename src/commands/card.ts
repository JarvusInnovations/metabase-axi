import { notImplemented, type StructuredOutput } from "../output.js";

export const CARD_HELP = `usage: metabase-axi card <subcommand> [flags]
subcommands[3]:
  list           list saved questions
  view <id>      show a card's query, display, and parameters
  run <id>       execute a card and preview/export its results
flags{list}:
  --mine, --archived, --db <id>, --collection <id>, --limit <n>, --instance <name>
flags{run}:
  --params <json>, --limit <n>, --json-out, --csv-out, --xlsx-out, --instance <name>
examples:
  metabase-axi card list --mine
  metabase-axi card run 42 --csv-out`;

export async function cardCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("card");
}
