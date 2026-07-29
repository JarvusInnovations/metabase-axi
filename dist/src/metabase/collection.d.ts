import type { MetabaseClient } from "./client.js";
export interface Collection {
    id: number | string;
    name: string;
    location?: string;
    personal_owner_id?: number | null;
    archived?: boolean;
}
export declare function listCollections(client: MetabaseClient, namespace?: string): Promise<Collection[]>;
/** The immediate parent id from a collection `location` path ("/1/2/" → "2"); undefined at top level. */
export declare function immediateParent(location?: string): string | undefined;
