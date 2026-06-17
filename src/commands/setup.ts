import { notImplemented, type StructuredOutput } from "../output.js";

export const SETUP_HELP = `usage: metabase-axi setup hooks
Installs the SessionStart hooks (Claude Code, Codex, OpenCode) that inject the
metabase-axi home view into agent sessions. Idempotent; needs no profile.`;

export async function setupCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("setup");
}
