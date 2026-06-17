import { notImplemented, type StructuredOutput } from "../output.js";

export const QUERY_HELP = `usage: metabase-axi query <sql> [flags]
       metabase-axi query -            read native SQL from stdin
       metabase-axi query --mbql <json>
flags:
  --instance <name>   target profile (required when ambiguous)
  --db <id|name>      database to run against (required for native SQL unless single-db)
  --mbql <json>       run a structured MBQL query instead of native SQL
  --params <json>     parameter / template-tag values
  --limit <n>         preview row cap (default 20)
  --json-out[=path]   write full result as JSON (auto-path if omitted)
  --csv-out[=path]    write full result as CSV
  --xlsx-out[=path]   write full result as XLSX
examples:
  metabase-axi query "SELECT 1 AS n" --db 6
  metabase-axi query "SELECT * FROM orders" --db 6 --csv-out /tmp/orders.csv`;

export async function queryCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("query");
}
