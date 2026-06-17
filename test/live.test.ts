import { describe, it, expect } from "vitest";
import { MetabaseClient } from "../src/metabase/client.js";
import { currentUser, databaseCount, normalizeList } from "../src/metabase/server.js";

/**
 * Live integration tests against a real instance. Skipped unless METABASE_URL +
 * METABASE_API_KEY are present in the environment, so CI and contributors without an
 * instance stay green. Run locally with those env vars set to exercise the real API.
 */
const live = Boolean(process.env.METABASE_URL && process.env.METABASE_API_KEY);

function client(): MetabaseClient {
  return new MetabaseClient({
    baseUrl: process.env.METABASE_URL as string,
    auth: { scheme: "api_key", apiKey: process.env.METABASE_API_KEY as string },
  });
}

describe.skipIf(!live)("live metabase (api key)", () => {
  it("authenticates via /api/user/current", async () => {
    const user = await currentUser(client());
    expect(typeof user.id).toBe("number");
  });

  it("lists databases (normalized {data} or array)", async () => {
    const n = await databaseCount(client());
    expect(n).toBeGreaterThanOrEqual(0);
  });

  it("normalizeList handles both shapes", () => {
    expect(normalizeList({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
    expect(normalizeList([1, 2])).toEqual([1, 2]);
    expect(normalizeList(null)).toEqual([]);
  });
});
