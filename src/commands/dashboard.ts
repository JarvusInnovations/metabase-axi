import { createClient, instanceLabel } from "../resolve.js";
import { dashcardsOf, getDashboard, listDashboards } from "../metabase/dashboard.js";
import {
  capList,
  parseExportRequest,
  performExport,
  relativeTime,
  type StructuredOutput,
} from "../output.js";
import { DASHBOARD_FLAGS, int, parseSubcommand, requireId, str, type Parsed } from "../flags.js";

export const DASHBOARD_HELP = `usage: metabase-axi dashboard <subcommand> [flags]
subcommands[2]:
  list              list dashboards
  view <id>         show dashcards, parameters, and tabs
flags{list}:
  --collection <id>, --limit <n>, --instance <name>
  --archived (not available yet: coming in an upcoming release)
flags{view}:
  --json-out[=path] (full dashboard to a file; path only with "="), --instance <name>
examples:
  metabase-axi dashboard list
  metabase-axi dashboard view 7`;

export async function dashboardCommand(args: string[]): Promise<StructuredOutput> {
  const { sub, parsed } = parseSubcommand("dashboard", args, DASHBOARD_FLAGS, "list");
  return sub === "view" ? dashboardView(parsed) : dashboardList(parsed);
}

async function dashboardList(parsed: Parsed): Promise<StructuredOutput> {
  // Validate values before resolving an instance or sending anything.
  const collFilter = int(parsed, "--collection");
  const limit = int(parsed, "--limit") ?? 30;
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });
  let dashboards = await listDashboards(client);
  if (collFilter !== undefined) {
    dashboards = dashboards.filter((d) => String(d.collection_id ?? "") === String(collFilter));
  }
  const { items, label } = capList(dashboards, limit);
  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    dashboards: items.map((d) => ({
      id: d.id,
      name: d.name,
      collection: d.collection?.name ?? "",
      edited: relativeTime(d.updated_at),
    })),
  };
  if (dashboards.length > items.length) out.count = label;
  out.help = ["Run `metabase-axi dashboard view <id>` to see its cards and filters"];
  return out;
}

async function dashboardView(parsed: Parsed): Promise<StructuredOutput> {
  const id = requireId(parsed, 0, "A dashboard id", "metabase-axi dashboard view <id>");
  const exportReq = parseExportRequest(parsed);
  const { instance, client } = createClient({
    instanceFlag: str(parsed, "--instance"),
    risky: false,
  });
  const dash = await getDashboard(client, id);
  const tabs = dash.tabs ?? [];
  const tabName = (tid?: number | null) => tabs.find((t) => t.id === tid)?.name ?? "";

  const out: StructuredOutput = {
    instance: instanceLabel(instance),
    dashboard: `${dash.id}: ${dash.name}`,
    collection: dash.collection?.name ?? "",
  };
  if (tabs.length) out.tabs = tabs.map((t) => t.name);

  // JSON only: the declaration offers just --json-out, so other formats never get here.
  if (exportReq) {
    const outcome = performExport(exportReq, `dashboard-${id}`, JSON.stringify(dash, null, 2));
    out.wrote = outcome.wrote;
  }

  out.cards = dashcardsOf(dash)
    .filter((dc) => dc.card_id)
    .map((dc) => ({
      card_id: dc.card_id,
      name: dc.card?.name ?? "",
      viz: dc.card?.display ?? "",
      ...(tabs.length ? { tab: tabName(dc.dashboard_tab_id) } : {}),
    }));

  const params = dash.parameters ?? [];
  if (params.length) {
    out.parameters = params.map((p) => ({ name: p.name ?? p.slug ?? "", type: p.type ?? "" }));
  }

  out.help = ["Run `metabase-axi card run <card_id>` to execute one of these cards"];
  return out;
}
