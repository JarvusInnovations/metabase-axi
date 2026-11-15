import { installSessionStartHooks } from "axi-sdk-js";
import { parseSubcommand, SETUP_FLAGS } from "../flags.js";
import type { StructuredOutput } from "../output.js";

export const SETUP_HELP = `usage: metabase-axi setup hooks
Installs the SessionStart hooks (Claude Code, Codex, OpenCode) that inject the
metabase-axi home view into agent sessions. Idempotent; needs no profile.`;

export async function setupCommand(
  args: string[],
  opts: { homeDir?: string; shouldInstall?: (execPath: string) => boolean } = {},
): Promise<StructuredOutput> {
  parseSubcommand("setup", args, SETUP_FLAGS);
  installSessionStartHooks({
    marker: "metabase-axi",
    binaryNames: ["metabase-axi"],
    ...(opts.homeDir ? { homeDir: opts.homeDir } : {}),
    ...(opts.shouldInstall ? { shouldInstall: opts.shouldInstall } : {}),
  });
  return {
    setup: "hooks installed (or already up to date)",
    help: [
      "Start a new agent session to see the metabase-axi home view injected",
      "Run `metabase-axi auth add <name> --url <url> --api-key <key>` if not configured",
    ],
  };
}
