import { type AxiCliOptions } from "axi-sdk-js";
export declare const TOP_HELP = "usage: metabase-axi [command] [args] [flags]\ncommands[11]:\n  (none)=home, auth, doctor, setup, query, card, db, search, dashboard, collection,\n  playground\nflags:\n  --instance <name> (per-command), --help, -v/--version\nexamples:\n  metabase-axi query \"SELECT 1 AS n\" --db 6\n  metabase-axi db schema 6\n  metabase-axi card run 42 --csv-out\n  metabase-axi card dashboards 42\n  metabase-axi playground \"SELECT 1 AS n\"\n  metabase-axi search \"revenue\"\n  metabase-axi --help\n  metabase-axi query --help\n";
/** Build the CLI options. Overrides (e.g. `argv`, `stdout`) let tests drive dispatch. */
export declare function cliOptions(overrides?: Partial<AxiCliOptions>): AxiCliOptions;
export declare function main(): Promise<void>;
