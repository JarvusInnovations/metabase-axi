import type { StructuredOutput } from "../output.js";
export declare const PLAYGROUND_HELP = "usage: metabase-axi playground <sql> [flags]\n       metabase-axi playground -       read native SQL from stdin\nflags:\n  --display <type>    table (default), bar, line, pie, scalar, \u2026\n  --db <id>           database the question should run against\n  --instance <name>   target profile (only its URL is used)\nexamples:\n  metabase-axi playground \"SELECT 1 AS n\"\n  metabase-axi playground \"SELECT * FROM t\" --display bar --db 6\n  cat q.sql | metabase-axi playground -";
/**
 * Build the base64 question fragment Metabase decodes client-side. Payload shape matches
 * what the UI itself produces for an unsaved native question, so the link opens in the
 * query builder with the SQL already loaded.
 */
export declare function buildPlaygroundPayload(sql: string, display: string, database?: number): string;
export declare function playgroundUrl(baseUrl: string, fragment: string): string;
export declare function playgroundCommand(args: string[]): Promise<StructuredOutput>;
