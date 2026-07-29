import { normalizeList } from "./server.js";
/** Cross-entity search. `models` filters by entity kind (card, dashboard, …). */
export async function search(client, query, models) {
    return normalizeList(await client.get("/api/search", { query: { q: query, models } }));
}
//# sourceMappingURL=search.js.map