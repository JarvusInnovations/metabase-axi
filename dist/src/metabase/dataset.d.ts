import type { MetabaseClient } from "./client.js";
export interface DatasetQuery {
    database: number;
    type: "native" | "query";
    native?: {
        query: string;
        "template-tags"?: Record<string, unknown>;
    };
    query?: Record<string, unknown>;
    parameters?: unknown[];
}
export interface ResultColumn {
    name: string;
    base_type?: string;
}
export interface QueryResult {
    status: string;
    database_id?: number;
    row_count?: number;
    running_time?: number;
    data?: {
        rows: unknown[][];
        cols: ResultColumn[];
        native_form?: {
            query?: string;
        };
    };
    error?: string;
}
export type ExportableFormat = "csv" | "xlsx" | "json";
/** Execute an ad-hoc dataset query (native SQL or MBQL). Mutates nothing server-side. */
export declare function runDataset(client: MetabaseClient, query: DatasetQuery): Promise<QueryResult>;
/** Execute and export a dataset query as raw bytes (csv/xlsx). */
export declare function exportDataset(client: MetabaseClient, query: DatasetQuery, format: "csv" | "xlsx"): Promise<Buffer>;
