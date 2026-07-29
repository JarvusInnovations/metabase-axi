import type { MetabaseClient } from "./client.js";
export interface SearchItem {
    id: number | string;
    name: string;
    model: string;
    description?: string | null;
    collection?: {
        id?: number | string;
        name?: string;
    } | null;
}
/** Cross-entity search. `models` filters by entity kind (card, dashboard, …). */
export declare function search(client: MetabaseClient, query: string, models?: string[]): Promise<SearchItem[]>;
