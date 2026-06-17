import type { StructuredOutput } from "../output.js";

/**
 * Home view (no command). Content-first orientation for the default instance, and the
 * payload injected by the SessionStart hook. Implemented by the `home-and-hooks` plan;
 * for now it renders the onboarding notice so a bare invocation never throws.
 */
export async function homeCommand(): Promise<StructuredOutput> {
  return {
    status: "not configured",
    help: [
      "Run `metabase-axi auth add <name> --url <url> --api-key <key>` to add an instance",
      "Run `metabase-axi doctor` to check connectivity",
      "Run `metabase-axi --help` for the full command list",
      "Run `metabase-axi <command> --help` for usage on any command",
    ],
  };
}
