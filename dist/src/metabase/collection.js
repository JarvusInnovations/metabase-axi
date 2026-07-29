import { normalizeList } from "./server.js";
export async function listCollections(client, namespace) {
    return normalizeList(await client.get("/api/collection", { query: { namespace } }));
}
/** The immediate parent id from a collection `location` path ("/1/2/" → "2"); undefined at top level. */
export function immediateParent(location) {
    const parts = (location ?? "/").split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : undefined;
}
//# sourceMappingURL=collection.js.map