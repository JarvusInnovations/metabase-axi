import type { ProfileCache } from "../config.js";
import type { MetabaseClient } from "./client.js";
export interface CurrentUser {
    id: number;
    email: string;
    first_name?: string;
    last_name?: string;
    common_name?: string;
    is_superuser?: boolean;
}
/** Normalize a Metabase list response: some endpoints return `{data:[…]}`, others a bare array. */
export declare function normalizeList<T = unknown>(res: unknown): T[];
export declare function currentUser(client: MetabaseClient): Promise<CurrentUser>;
export declare function databaseCount(client: MetabaseClient): Promise<number>;
/** Best-effort server version tag; undefined if unavailable. */
export declare function serverVersion(client: MetabaseClient): Promise<string | undefined>;
/** Validate auth and gather a profile cache summary (best-effort on version/count). */
export declare function profileSummary(client: MetabaseClient): Promise<ProfileCache>;
