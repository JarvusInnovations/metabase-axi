/** Normalize a Metabase list response: some endpoints return `{data:[…]}`, others a bare array. */
export function normalizeList(res) {
    if (Array.isArray(res))
        return res;
    if (res && typeof res === "object" && Array.isArray(res.data)) {
        return res.data;
    }
    return [];
}
export async function currentUser(client) {
    return client.get("/api/user/current");
}
export async function databaseCount(client) {
    return normalizeList(await client.get("/api/database")).length;
}
/** Best-effort server version tag; undefined if unavailable. */
export async function serverVersion(client) {
    try {
        const props = await client.get("/api/session/properties");
        return props?.version?.tag;
    }
    catch {
        return undefined;
    }
}
/** Validate auth and gather a profile cache summary (best-effort on version/count). */
export async function profileSummary(client) {
    const user = await currentUser(client); // throws on bad auth / unreachable
    let database_count;
    try {
        database_count = await databaseCount(client);
    }
    catch {
        database_count = undefined;
    }
    return {
        user_name: user.common_name ?? user.email,
        version: await serverVersion(client),
        database_count,
        cached_at: new Date().toISOString(),
    };
}
//# sourceMappingURL=server.js.map