import type { StructuredOutput } from "../output.js";
export declare const SETUP_HELP = "usage: metabase-axi setup hooks\nInstalls the SessionStart hooks (Claude Code, Codex, OpenCode) that inject the\nmetabase-axi home view into agent sessions. Idempotent; needs no profile.";
export declare function setupCommand(args: string[], opts?: {
    homeDir?: string;
    shouldInstall?: (execPath: string) => boolean;
}): Promise<StructuredOutput>;
