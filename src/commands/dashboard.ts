import { notImplemented, type StructuredOutput } from "../output.js";

export const DASHBOARD_HELP = `usage: metabase-axi dashboard <subcommand> [flags]
subcommands[2]:
  list              list dashboards
  view <id>         show dashcards, parameters, and tabs
flags{list}:
  --collection <id>, --archived, --limit <n>, --instance <name>
flags{view}:
  --json-out[=path], --instance <name>
examples:
  metabase-axi dashboard list
  metabase-axi dashboard view 7`;

export async function dashboardCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("dashboard");
}
