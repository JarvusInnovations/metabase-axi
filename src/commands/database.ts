import { AxiError } from "axi-sdk-js";
import { createClient, instanceLabel } from "../resolve.js";
import {
  databaseMetadata,
  listDatabases,
  resolveDatabaseId,
  type Table,
} from "../metabase/database.js";
import {
  capList,
  parseExportRequest,
  performExport,
  shortType,
  type StructuredOutput,
} from "../output.js";
import { numFlag, parseArgs, strFlag } from "../flags.js";

export const DATABASE_HELP = `usage: metabase-axi db <subcommand> [flags]
subcommands[2]:
  list                  list connected databases
  schema <id|name>      introspect tables and fields (with types)
flags{schema}:
  --table <name>        filter to one table (shows its fields)
  --search <substr>     find columns by substring across tables
  --json-out[=path]     dump full metadata to a file
  --instance <name>
examples:
  metabase-axi db list
  metabase-axi db schema 6 --search order`;

export async function databaseCommand(args: string[]): Promise<StructuredOutput> {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case undefined:
    case "list":
      return dbList(rest);
    case "schema":
      return dbSchema(rest);
    default:
      throw new AxiError(`Unknown db subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Run `metabase-axi db --help` for usage",
      ]);
  }
}

async function dbList(rest: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(rest, { valued: ["instance", "limit"] });
  const { instance, client } = createClient({
    instanceFlag: strFlag(parsed, "instance"),
    risky: false,
  });
  const dbs = await listDatabases(client);
  const { items, label } = capList(dbs, numFlag(parsed, "limit") ?? 50);
  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    databases: items.map((d) => ({ id: d.id, name: d.name, engine: d.engine ?? "?" })),
  };
  if (dbs.length > items.length) out.count = label;
  out.help = ["Run `metabase-axi db schema <id|name>` to inspect tables and fields"];
  return out;
}

function fieldRow(f: { name: string; base_type?: string; semantic_type?: string | null }) {
  return {
    name: f.name,
    type: shortType(f.base_type),
    semantic: f.semantic_type ? shortType(f.semantic_type) : "",
  };
}

async function dbSchema(rest: string[]): Promise<StructuredOutput> {
  const parsed = parseArgs(rest, {
    valued: ["instance", "table", "search", "limit"],
  });
  const ref = parsed.positionals[0];
  if (!ref) {
    throw new AxiError("A database id or name is required", "VALIDATION_ERROR", [
      "metabase-axi db schema <id|name>",
    ]);
  }
  const { instance, client } = createClient({
    instanceFlag: strFlag(parsed, "instance"),
    risky: false,
  });
  const id = await resolveDatabaseId(client, ref);
  const meta = await databaseMetadata(client, id);
  const allTables: Table[] = meta.tables ?? [];

  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    database: `${meta.name} (${id})`,
  };

  // Optional full-metadata export (JSON only).
  const exportReq = parseExportRequest(parsed);
  if (exportReq) {
    if (exportReq.format !== "json") {
      throw new AxiError("Schema export is JSON only — use --json-out", "VALIDATION_ERROR", []);
    }
    const outcome = performExport(exportReq, `schema-${id}`, JSON.stringify(meta, null, 2));
    out.wrote = outcome.wrote;
  }

  const tableFilter = strFlag(parsed, "table")?.toLowerCase();
  const search = strFlag(parsed, "search")?.toLowerCase();
  const help: string[] = [];

  if (search) {
    const matches = allTables.flatMap((t) =>
      (t.fields ?? [])
        .filter(
          (f) =>
            f.name.toLowerCase().includes(search) ||
            (f.display_name ?? "").toLowerCase().includes(search),
        )
        .map((f) => ({ table: t.name, ...fieldRow(f) })),
    );
    const { items, label } = capList(matches, numFlag(parsed, "limit") ?? 100);
    out.matches = items;
    if (matches.length > items.length) out.count = label;
    help.push(
      matches.length
        ? "Use the table + field names in `metabase-axi query`"
        : "No columns matched — try a different --search term",
    );
  } else if (tableFilter) {
    const t = allTables.find(
      (x) =>
        x.name.toLowerCase() === tableFilter ||
        (x.display_name ?? "").toLowerCase() === tableFilter,
    );
    if (!t) {
      throw new AxiError(`No table "${strFlag(parsed, "table")}" in ${meta.name}`, "NOT_FOUND", [
        "Run `metabase-axi db schema <id>` to list tables",
      ]);
    }
    out.table = `${t.name}${t.schema ? ` (${t.schema})` : ""}`;
    out.fields = (t.fields ?? []).map(fieldRow);
    help.push(`Run \`metabase-axi query "SELECT * FROM ${t.name} LIMIT 10" --db ${id}\``);
  } else {
    const { items, label } = capList(allTables, numFlag(parsed, "limit") ?? 100);
    out.tables = items.map((t) => ({
      name: t.name,
      schema: t.schema ?? "",
      fields: (t.fields ?? []).length,
    }));
    if (allTables.length > items.length) out.count = label;
    help.push(
      "Run with --table <name> to see a table's fields",
      "Run with --search <substr> to find columns across tables",
    );
  }

  out.help = help;
  return out;
}
