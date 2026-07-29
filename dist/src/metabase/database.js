import { AxiError } from "axi-sdk-js";
import { normalizeList } from "./server.js";
export async function listDatabases(client) {
    return normalizeList(await client.get("/api/database"));
}
export async function databaseMetadata(client, id) {
    return client.get(`/api/database/${id}/metadata`);
}
/**
 * Resolve a database reference (numeric id, or a name) to an id. With no reference, returns
 * the sole database's id, or errors when the choice is ambiguous.
 */
export async function resolveDatabaseId(client, ref) {
    if (ref && /^\d+$/.test(ref))
        return Number(ref);
    const dbs = await listDatabases(client);
    if (ref) {
        const match = dbs.find((d) => d.name.toLowerCase() === ref.toLowerCase());
        if (!match) {
            throw new AxiError(`No database named "${ref}"`, "NOT_FOUND", [
                `Available: ${dbs.map((d) => `${d.id}:${d.name}`).join(", ") || "(none)"}`,
            ]);
        }
        return match.id;
    }
    if (dbs.length === 1)
        return dbs[0].id;
    throw new AxiError("Multiple databases — specify --db <id|name>", "VALIDATION_ERROR", [
        `Available: ${dbs.map((d) => `${d.id}:${d.name}`).join(", ")}`,
    ]);
}
//# sourceMappingURL=database.js.map