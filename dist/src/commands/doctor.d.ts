import type { StructuredOutput } from "../output.js";
export declare const DOCTOR_HELP = "usage: metabase-axi doctor [flags]\nflags:\n  --instance <name>   profile to probe (default: configured default / env)\nchecks:\n  reachable, auth, credential source (env|config), database count\nexit:\n  0 on ok/warn, 1 on a hard failure (unreachable or invalid auth)";
export declare function doctorCommand(args: string[]): Promise<StructuredOutput>;
