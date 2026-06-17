import { notImplemented, type StructuredOutput } from "../output.js";

export const DATABASE_HELP = `usage: metabase-axi db <subcommand> [flags]
subcommands[2]:
  list                  list connected databases
  schema <id|name>      introspect tables and fields (with types)
flags{schema}:
  --table <name>        filter to one table
  --search <substr>     filter tables/fields by substring
  --json-out[=path]     dump full metadata to a file
  --instance <name>
examples:
  metabase-axi db list
  metabase-axi db schema 6 --search order`;

export async function databaseCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("db");
}
