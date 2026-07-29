import type { MetabaseClient } from "./client.js";
export interface DashCard {
    id?: number;
    card_id?: number | null;
    card?: {
        name?: string;
        display?: string;
    } | null;
    dashboard_tab_id?: number | null;
}
export interface DashParameter {
    name?: string;
    slug?: string;
    type?: string;
}
export interface DashTab {
    id: number;
    name: string;
}
export interface Dashboard {
    id: number;
    name: string;
    description?: string | null;
    collection_id?: number | null;
    collection?: {
        name?: string;
    } | null;
    dashcards?: DashCard[];
    ordered_cards?: DashCard[];
    parameters?: DashParameter[];
    tabs?: DashTab[];
    updated_at?: string;
}
export declare function listDashboards(client: MetabaseClient): Promise<Dashboard[]>;
export declare function getDashboard(client: MetabaseClient, id: number): Promise<Dashboard>;
export interface NewDashboard {
    name: string;
    description?: string;
    collection_id?: number;
    collection_position?: number;
}
/** Create an empty dashboard. Not idempotent — a re-run creates a second dashboard. */
export declare function createDashboard(client: MetabaseClient, body: NewDashboard): Promise<Dashboard>;
/** Dashcards live under `dashcards` (newer) or `ordered_cards` (older) across versions. */
export declare function dashcardsOf(dash: Dashboard): DashCard[];
