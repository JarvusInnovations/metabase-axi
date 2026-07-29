import { describe, it, expect, vi, afterEach } from "vitest";
import { MetabaseClient } from "../src/metabase/client.js";
import { getCardDashboards } from "../src/metabase/card.js";
import { createDashboard } from "../src/metabase/dashboard.js";
import { buildPlaygroundPayload, playgroundUrl } from "../src/commands/playground.js";

afterEach(() => vi.unstubAllGlobals());

function res(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function client(): MetabaseClient {
  return new MetabaseClient({
    baseUrl: "https://metabase.example.org",
    auth: { scheme: "api_key", apiKey: "K" },
  });
}

/** Capture method/url/body for each fetch call. */
function spyFetch(body: unknown = { ok: true }) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method as string, body: init.body as string | undefined });
      return res(200, body);
    }),
  );
  return calls;
}

describe("client put/del verbs", () => {
  it("issue PUT and DELETE through the shared request path", async () => {
    const calls = spyFetch();
    const c = client();
    await c.put("/api/card/7", { body: { name: "n" } });
    await c.del("/api/card/7");
    expect(calls.map((x) => x.method)).toEqual(["PUT", "DELETE"]);
    expect(calls[0].url).toBe("https://metabase.example.org/api/card/7");
    expect(JSON.parse(calls[0].body as string)).toEqual({ name: "n" });
  });

  it("inherit error mapping from the shared request path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(403, { message: "denied" })),
    );
    await expect(client().put("/api/card/7", { body: {} })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("getCardDashboards", () => {
  it("normalizes a bare array and a {data:[]} envelope alike", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(200, [{ id: 1, name: "A" }])),
    );
    expect(await getCardDashboards(client(), 42)).toHaveLength(1);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        res(200, {
          data: [
            { id: 1, name: "A" },
            { id: 2, name: "B" },
          ],
        }),
      ),
    );
    expect(await getCardDashboards(client(), 42)).toHaveLength(2);
  });

  it("returns an empty list for a card no dashboard embeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => res(200, [])),
    );
    expect(await getCardDashboards(client(), 42)).toEqual([]);
  });

  it("hits the card's dashboards sub-resource", async () => {
    const calls = spyFetch([]);
    await getCardDashboards(client(), 42);
    expect(calls[0].url).toBe("https://metabase.example.org/api/card/42/dashboards");
    expect(calls[0].method).toBe("GET");
  });
});

describe("createDashboard", () => {
  it("POSTs to /api/dashboard with only the supplied fields", async () => {
    const calls = spyFetch({ id: 9, name: "Weekly" });
    const created = await createDashboard(client(), { name: "Weekly", collection_id: 12 });
    expect(created.id).toBe(9);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].url).toBe("https://metabase.example.org/api/dashboard");
    expect(JSON.parse(calls[0].body as string)).toEqual({ name: "Weekly", collection_id: 12 });
  });
});

describe("playground link", () => {
  const decode = (b64: string) => JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));

  it("encodes a native question payload the UI can decode", () => {
    const payload = decode(buildPlaygroundPayload("SELECT 1", "table"));
    expect(payload).toEqual({
      dataset_query: { type: "native", native: { template_tags: {}, query: "SELECT 1" } },
      display: "table",
      parameters: [],
      visualization_settings: {},
      type: "question",
    });
  });

  it("honors display and includes database only when given", () => {
    expect(decode(buildPlaygroundPayload("SELECT 1", "bar")).display).toBe("bar");
    expect(decode(buildPlaygroundPayload("SELECT 1", "table", 6)).dataset_query.database).toBe(6);
    expect(decode(buildPlaygroundPayload("SELECT 1", "table")).dataset_query).not.toHaveProperty(
      "database",
    );
  });

  it("builds a /question# fragment url and strips a trailing slash", () => {
    const frag = buildPlaygroundPayload("SELECT 1", "table");
    expect(playgroundUrl("https://metabase.example.org/", frag)).toBe(
      `https://metabase.example.org/question#${frag}`,
    );
  });

  it("round-trips SQL containing quotes and newlines", () => {
    const sql = `SELECT 'a\\nb' AS "x"\nFROM t`;
    expect(decode(buildPlaygroundPayload(sql, "table")).dataset_query.native.query).toBe(sql);
  });
});
