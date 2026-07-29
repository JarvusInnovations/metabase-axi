import { normalizeList } from "./server.js";
export async function listDashboards(client) {
    return normalizeList(await client.get("/api/dashboard"));
}
export async function getDashboard(client, id) {
    return client.get(`/api/dashboard/${id}`);
}
/** Create an empty dashboard. Not idempotent — a re-run creates a second dashboard. */
export async function createDashboard(client, body) {
    return client.post("/api/dashboard", { body });
}
/** Dashcards live under `dashcards` (newer) or `ordered_cards` (older) across versions. */
export function dashcardsOf(dash) {
    return dash.dashcards ?? dash.ordered_cards ?? [];
}
//# sourceMappingURL=dashboard.js.map