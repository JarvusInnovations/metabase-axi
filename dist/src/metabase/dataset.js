/** Execute an ad-hoc dataset query (native SQL or MBQL). Mutates nothing server-side. */
export async function runDataset(client, query) {
    return client.post("/api/dataset", { body: query });
}
/** Execute and export a dataset query as raw bytes (csv/xlsx). */
export async function exportDataset(client, query, format) {
    return client.post(`/api/dataset/${format}`, {
        form: { query: JSON.stringify(query) },
        raw: true,
    });
}
//# sourceMappingURL=dataset.js.map