import { notImplemented, type StructuredOutput } from "../output.js";

export const DOCTOR_HELP = `usage: metabase-axi doctor [flags]
flags:
  --instance <name>   profile to probe (default: configured default / env)
checks:
  reachable, auth, credential source (env|config), database count
exit:
  0 on ok/warn, 1 on a hard failure (unreachable or invalid auth)`;

export async function doctorCommand(_args: string[]): Promise<StructuredOutput> {
  return notImplemented("doctor");
}
