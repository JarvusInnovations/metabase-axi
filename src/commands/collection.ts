import { notImplemented, type StructuredOutput } from "../output.js";

export const COLLECTION_HELP = `usage: metabase-axi collection <subcommand> [flags]
subcommands[1]:
  list              browse the collection tree
flags{list}:
  --parent <id>     direct children of one collection
  --namespace <ns>
  --archived
  --limit <n>
  --instance <name>
examples:
  metabase-axi collection list
  metabase-axi collection list --parent 12`;

export async function collectionCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("collection");
}
