import { type ParsedArgs } from "./flags.js";
export type StructuredOutput = Record<string, unknown>;
export type Renderable = string | StructuredOutput;
/** Default preview row cap and cell character cap (token budget). */
export declare const PREVIEW_ROW_CAP = 20;
export declare const CELL_CHAR_CAP = 120;
/** A structured "not implemented yet" notice for stub commands. */
export declare function notImplemented(command: string): StructuredOutput;
export interface Column {
    name: string;
    base_type?: string;
}
/** Strip the `type/` prefix from a Metabase base type: `type/Integer` → `Integer`. */
export declare function shortType(baseType?: string): string;
/** Compact column line with types: `id:Integer, name:Text`. */
export declare function columnsLine(cols: Column[]): string;
/** Truncate a long string cell with an explicit marker; pass non-strings through. */
export declare function truncateCell(value: unknown, cap?: number): unknown;
/** Map row arrays to capped objects keyed by column name (for TOON tabular encoding). */
export declare function rowsToObjects(cols: Column[], rows: unknown[][], cap?: number): StructuredOutput[];
/** `N` when complete, `N of M` when capped — always explicit. */
export declare function countLabel(shown: number, total: number): string;
/** Cap a list and report the count label together. */
export declare function capList<T>(items: T[], limit: number): {
    items: T[];
    label: string;
};
/** Relative time like `2h ago`. Falls back to the raw value when unparseable. */
export declare function relativeTime(iso?: string): string;
export type ExportFormat = "json" | "csv" | "xlsx";
export interface ExportRequest {
    format: ExportFormat;
    /** Explicit path from `--<fmt>-out=<path>`, or undefined for an auto-generated path. */
    path?: string;
}
/** Parse the export flags; at most one `*-out` is allowed. Returns undefined when none. */
export declare function parseExportRequest(parsed: ParsedArgs): ExportRequest | undefined;
/**
 * Resolve the destination path: the explicit one, or an auto path in the OS temp dir.
 * Auto-generated exports are ephemeral scratch, so they go in `os.tmpdir()` (OS-pruned) —
 * never under `~/.config`, which nothing prunes.
 */
export declare function resolveExportPath(req: ExportRequest, kind: string): string;
export interface ExportOutcome {
    path: string;
    wrote: string;
    columns?: string;
    helpLine: string;
}
/**
 * Write the full export to a file and describe it. `data` is a JSON string (json) or raw
 * bytes (csv/xlsx). `meta.rows`/`meta.cols` annotate the `wrote:`/`columns:` lines.
 */
export declare function performExport(req: ExportRequest, kind: string, data: string | Buffer, meta?: {
    rows?: number;
    cols?: Column[];
}): ExportOutcome;
