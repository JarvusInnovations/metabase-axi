import { type Field } from "../metabase/database.js";
import { type StructuredOutput } from "../output.js";
export declare const DATABASE_HELP = "usage: metabase-axi db <subcommand> [flags]\nsubcommands[2]:\n  list                  list connected databases\n  schema <id|name>      introspect tables and fields (with types)\nflags{schema}:\n  --table <name>        filter to one table (shows its fields)\n  --search <substr>     find columns by substring across tables\n  --json-out[=path]     dump full metadata to a file\n  --instance <name>\nexamples:\n  metabase-axi db list\n  metabase-axi db schema 6 --search order";
export declare function databaseCommand(args: string[]): Promise<StructuredOutput>;
/**
 * Map fields to TOON rows, adding a `description` column only when at least one field in
 * the set carries a Metabase annotation (keeps the schema lean when nothing is documented).
 * Exported for testing.
 */
export declare function fieldRows(fields: Field[]): StructuredOutput[];
