import { normalizeList } from "./server.js";
export async function listCards(client, filter) {
    return normalizeList(await client.get("/api/card", { query: { f: filter } }));
}
export async function getCard(client, id) {
    return client.get(`/api/card/${id}`);
}
/**
 * Dashboards that embed this card — the dependency check before editing it.
 * Shape varies by version (bare array vs `{data:[]}`), so normalize.
 */
export async function getCardDashboards(client, id) {
    return normalizeList(await client.get(`/api/card/${id}/dashboards`));
}
/** Execute a saved card. Optional `parameters` for parameterized cards. */
export async function runCard(client, id, parameters) {
    return client.post(`/api/card/${id}/query`, {
        body: parameters ? { parameters } : {},
    });
}
/** Execute a card and export to csv/xlsx bytes. */
export async function exportCard(client, id, format, parameters) {
    return client.post(`/api/card/${id}/query/${format}`, {
        form: parameters ? { parameters: JSON.stringify(parameters) } : {},
        raw: true,
    });
}
//# sourceMappingURL=card.js.map