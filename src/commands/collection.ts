import { createClient, instanceLabel } from "../resolve.js";
import { immediateParent, listCollections } from "../metabase/collection.js";
import { capList, type StructuredOutput } from "../output.js";
import { bool, COLLECTION_FLAGS, int, parseSubcommand, str } from "../flags.js";

export const COLLECTION_HELP = `usage: metabase-axi collection list [flags]
flags:
  --parent <id>     direct children of one collection
  --namespace <ns>
  --archived
  --limit <n>
  --instance <name>
examples:
  metabase-axi collection list
  metabase-axi collection list --parent 12`;

export async function collectionCommand(args: string[]): Promise<StructuredOutput> {
  const { parsed } = parseSubcommand("collection", args, COLLECTION_FLAGS, "list");
  // Validate values before resolving an instance or sending anything.
  const parentId = int(parsed, "--parent");
  const parent = parentId === undefined ? undefined : String(parentId);
  const limit = int(parsed, "--limit") ?? 100;
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });

  let cols = await listCollections(client, str(parsed, "--namespace"));
  const wantArchived = bool(parsed, "--archived");
  cols = cols.filter((c) => (wantArchived ? c.archived : !c.archived));

  if (parent) {
    cols = cols.filter((c) => immediateParent(c.location) === parent);
  }

  const { items, label } = capList(cols, limit);
  const out: StructuredOutput = {
    instance: instanceLabel(instance),
  };
  if (parent) out.parent = parent;
  out.collections = items.map((c) => ({
    id: c.id,
    name: c.name,
    parent: immediateParent(c.location) ?? "root",
    personal: c.personal_owner_id ? "yes" : "",
  }));
  if (cols.length > items.length) out.count = label;
  out.help = [
    "Run `metabase-axi collection list --parent <id>` to descend",
    "Run `metabase-axi card list --collection <id>` to see its cards",
  ];
  return out;
}
