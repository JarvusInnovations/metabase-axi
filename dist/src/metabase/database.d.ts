import type { MetabaseClient } from "./client.js";
export interface Database {
    id: number;
    name: string;
    engine?: string;
    tables?: unknown[];
}
export interface Field {
    id?: number;
    name: string;
    display_name?: string;
    base_type?: string;
    semantic_type?: string | null;
    description?: string | null;
}
export interface Table {
    id?: number;
    name: string;
    display_name?: string;
    schema?: string;
    db_id?: number;
    description?: string | null;
    fields?: Field[];
}
export interface DatabaseMetadata extends Database {
    tables?: Table[];
}
export declare function listDatabases(client: MetabaseClient): Promise<Database[]>;
export declare function databaseMetadata(client: MetabaseClient, id: number): Promise<DatabaseMetadata>;
/**
 * Resolve a database reference (numeric id, or a name) to an id. With no reference, returns
 * the sole database's id, or errors when the choice is ambiguous.
 */
export declare function resolveDatabaseId(client: MetabaseClient, ref?: string): Promise<number>;
