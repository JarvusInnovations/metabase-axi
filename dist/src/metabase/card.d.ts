import type { MetabaseClient } from "./client.js";
import type { DatasetQuery, QueryResult } from "./dataset.js";
export interface CardParameter {
    name?: string;
    slug?: string;
    type?: string;
}
export interface Card {
    id: number;
    name: string;
    description?: string | null;
    collection_id?: number | null;
    collection?: {
        name?: string;
    } | null;
    database_id?: number | null;
    display?: string;
    query_type?: string;
    dataset_query?: DatasetQuery;
    parameters?: CardParameter[];
    updated_at?: string;
}
/** A dashboard that embeds a card (the `/dashboards` sub-resource is a trimmed shape). */
export interface CardDashboard {
    id: number;
    name: string;
    collection_id?: number | null;
    collection?: {
        name?: string;
    } | null;
}
export declare function listCards(client: MetabaseClient, filter?: string): Promise<Card[]>;
export declare function getCard(client: MetabaseClient, id: number): Promise<Card>;
/**
 * Dashboards that embed this card — the dependency check before editing it.
 * Shape varies by version (bare array vs `{data:[]}`), so normalize.
 */
export declare function getCardDashboards(client: MetabaseClient, id: number): Promise<CardDashboard[]>;
/** Execute a saved card. Optional `parameters` for parameterized cards. */
export declare function runCard(client: MetabaseClient, id: number, parameters?: unknown[]): Promise<QueryResult>;
/** Execute a card and export to csv/xlsx bytes. */
export declare function exportCard(client: MetabaseClient, id: number, format: "csv" | "xlsx", parameters?: unknown[]): Promise<Buffer>;
