import { notImplemented, type StructuredOutput } from "../output.js";

export const AUTH_HELP = `usage: metabase-axi auth <subcommand> [flags]
subcommands[5]:
  add <name>     register a profile (--url, --api-key | --username/--password)
  list           show configured profiles and the default
  use <name>     set the default profile
  login [name]   obtain/refresh a session token (session auth)
  remove <name>  delete a profile
notes:
  - Credentials are stored locally; secrets are never printed.
  - Env vars (METABASE_URL, METABASE_API_KEY, METABASE_USERNAME/PASSWORD) override config.
examples:
  metabase-axi auth add prod --url https://metabase.example.org --api-key mb_...
  metabase-axi auth use prod`;

export async function authCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("auth");
}
