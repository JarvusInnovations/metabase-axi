import { type StructuredOutput } from "../output.js";
export declare const COLLECTION_HELP = "usage: metabase-axi collection list [flags]\nflags:\n  --parent <id>     direct children of one collection\n  --namespace <ns>\n  --archived\n  --limit <n>\n  --instance <name>\nexamples:\n  metabase-axi collection list\n  metabase-axi collection list --parent 12";
export declare function collectionCommand(args: string[]): Promise<StructuredOutput>;
