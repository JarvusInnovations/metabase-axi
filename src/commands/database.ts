import { AxiError } from "axi-sdk-js";
import { createClient, instanceLabel } from "../resolve.js";
import {
  databaseMetadata,
  listDatabases,
  resolveDatabaseId,
  type Field,
  type Table,
} from "../metabase/database.js";
import {
  capList,
  parseExportRequest,
  performExport,
  shortType,
  truncateCell,
  type StructuredOutput,
} from "../output.js";
import {
  DATABASE_FLAGS,
  int,
  parseSubcommand,
  requirePositional,
  str,
  type Parsed,
} from "../flags.js";

export const DATABASE_HELP = `usage: metabase-axi db <subcommand> [flags]
subcommands[2]:
  list                  list connected databases
  schema <id|name>      introspect tables and fields (with types)
flags{list}:
  --limit <n>, --instance <name>
flags{schema}:
  --table <name>        filter to one table (shows its fields)
  --search <substr>     find columns by substring across tables
  --limit <n>           cap the tables / matches shown
  --json-out[=path]     dump full metadata to a file (path only with "=")
  --instance <name>
examples:
  metabase-axi db list
  metabase-axi db schema 6 --search order`;

export async function databaseCommand(args: string[]): Promise<StructuredOutput> {
  const { sub, parsed } = parseSubcommand("db", args, DATABASE_FLAGS, "list");
  return sub === "schema" ? dbSchema(parsed) : dbList(parsed);
}

async function dbList(parsed: Parsed): Promise<StructuredOutput> {
  const limit = int(parsed, "--limit") ?? 50;
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });
  const dbs = await listDatabases(client);
  const { items, label } = capList(dbs, limit);
  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    databases: items.map((d) => ({ id: d.id, name: d.name, engine: d.engine ?? "?" })),
  };
  if (dbs.length > items.length) out.count = label;
  out.help = ["Run `metabase-axi db schema <id|name>` to inspect tables and fields"];
  return out;
}

const DESC_CAP = 160;

/**
 * Map fields to TOON rows, adding a `description` column only when at least one field in
 * the set carries a Metabase annotation (keeps the schema lean when nothing is documented).
 * Exported for testing.
 */
export function fieldRows(fields: Field[]): StructuredOutput[] {
  const anyDesc = fields.some((f) => f.description);
  return fields.map((f) => ({
    name: f.name,
    type: shortType(f.base_type),
    semantic: f.semantic_type ? shortType(f.semantic_type) : "",
    ...(anyDesc ? { description: truncateCell(f.description ?? "", DESC_CAP) } : {}),
  }));
}

async function dbSchema(parsed: Parsed): Promise<StructuredOutput> {
  const ref = requirePositional(
    parsed,
    0,
    "A database id or name",
    "metabase-axi db schema <id|name>",
  );
  // Validate values before resolving an instance or sending anything.
  const limit = int(parsed, "--limit") ?? 100;
  const exportReq = parseExportRequest(parsed);
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });
  const id = await resolveDatabaseId(client, ref);
  const meta = await databaseMetadata(client, id);
  const allTables: Table[] = meta.tables ?? [];

  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    database: `${meta.name} (${id})`,
  };

  // Optional full-metadata export. JSON only: the declaration offers just --json-out, so
  // other formats never get here.
  if (exportReq) {
    const outcome = performExport(exportReq, `schema-${id}`, JSON.stringify(meta, null, 2));
    out.wrote = outcome.wrote;
  }

  const tableFilter = str(parsed, "--table")?.toLowerCase();
  const search = str(parsed, "--search")?.toLowerCase();
  const help: string[] = [];

  if (search) {
    const matched: Array<{ table: string; field: Field }> = [];
    for (const t of allTables) {
      for (const f of t.fields ?? []) {
        if (
          f.name.toLowerCase().includes(search) ||
          (f.display_name ?? "").toLowerCase().includes(search) ||
          (f.description ?? "").toLowerCase().includes(search)
        ) {
          matched.push({ table: t.name, field: f });
        }
      }
    }
    const anyDesc = matched.some((m) => m.field.description);
    const rows = matched.map(({ table, field }) => ({
      table,
      name: field.name,
      type: shortType(field.base_type),
      semantic: field.semantic_type ? shortType(field.semantic_type) : "",
      ...(anyDesc ? { description: truncateCell(field.description ?? "", DESC_CAP) } : {}),
    }));
    const { items, label } = capList(rows, limit);
    out.matches = items;
    if (rows.length > items.length) out.count = label;
    help.push(
      rows.length
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
      throw new AxiError(`No table "${str(parsed, "--table")}" in ${meta.name}`, "NOT_FOUND", [
        "Run `metabase-axi db schema <id>` to list tables",
      ]);
    }
    out.table = `${t.name}${t.schema ? ` (${t.schema})` : ""}`;
    if (t.description) out.description = truncateCell(t.description, DESC_CAP);
    out.fields = fieldRows(t.fields ?? []);
    help.push(`Run \`metabase-axi query "SELECT * FROM ${t.name} LIMIT 10" --db ${id}\``);
  } else {
    const { items, label } = capList(allTables, limit);
    const anyTableDesc = items.some((t) => t.description);
    out.tables = items.map((t) => ({
      name: t.name,
      schema: t.schema ?? "",
      fields: (t.fields ?? []).length,
      ...(anyTableDesc ? { description: truncateCell(t.description ?? "", DESC_CAP) } : {}),
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
