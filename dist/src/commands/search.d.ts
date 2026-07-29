import { type StructuredOutput } from "../output.js";
export declare const SEARCH_HELP = "usage: metabase-axi search <query> [flags]\nflags:\n  --type <models>     comma-separated: card,dashboard,collection,table,dataset\n  --limit <n>\n  --instance <name>\nexamples:\n  metabase-axi search \"revenue\"\n  metabase-axi search \"orders\" --type table,card";
export declare function searchCommand(args: string[]): Promise<StructuredOutput>;
