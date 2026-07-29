import { type ParsedArgs } from "./flags.js";
import { type StructuredOutput } from "./output.js";
import { type ResolvedInstance } from "./resolve.js";
import type { QueryResult } from "./metabase/dataset.js";
export interface RenderResultOptions {
    instance: ResolvedInstance;
    result: QueryResult;
    parsed: ParsedArgs;
    /** Filename stem for an auto-generated export (e.g. "query", "card-42"). */
    kind: string;
    /** Database id to echo; falls back to the result's database_id. */
    database?: number;
    /** Fetch full csv/xlsx bytes for export (dataset or card endpoint). */
    exportBytes: (format: "csv" | "xlsx") => Promise<Buffer>;
    /** Echo the compiled SQL (native_form). Useful for MBQL/cards; redundant for native SQL. */
    showCompiledSql?: boolean;
}
/**
 * Render a query/card execution result: capped preview to stdout, optional full export to a
 * file. Shared by `query` and `card run` so both render identically.
 * (specs/behaviors/result-export-and-truncation.md + output-rendering.md)
 */
export declare function renderQueryResult(opts: RenderResultOptions): Promise<StructuredOutput>;
