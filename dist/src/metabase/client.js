import { AxiError } from "axi-sdk-js";
import { hostOf } from "../config.js";
const DEFAULT_TIMEOUT_MS = 30_000;
export class MetabaseClient {
    opts;
    sessionToken;
    constructor(opts) {
        this.opts = opts;
        if (opts.auth.scheme === "session")
            this.sessionToken = opts.auth.token;
    }
    get host() {
        return hostOf(this.opts.baseUrl);
    }
    get scheme() {
        return this.opts.auth.scheme;
    }
    async get(path, opts = {}) {
        return this.request("GET", path, opts);
    }
    async post(path, opts = {}) {
        return this.request("POST", path, opts);
    }
    /** Replace an object. Metabase `PUT` is a full replace — send a fetch-modify-merged body. */
    async put(path, opts = {}) {
        return this.request("PUT", path, opts);
    }
    /** `delete` is a reserved word, so the verb is `del`. */
    async del(path, opts = {}) {
        return this.request("DELETE", path, opts);
    }
    /** Force a session login (session auth only). No-op for API-key auth. */
    async login() {
        if (this.opts.auth.scheme !== "session")
            return;
        const { username, password } = this.opts.auth;
        const res = await this.rawFetch("POST", "/api/session", {
            json: { username, password },
        });
        if (!res.ok) {
            throw mapHttpError(res.status, await safeText(res), this.host, "POST /api/session");
        }
        const data = (await res.json());
        if (!data.id) {
            throw new AxiError("Session login returned no token", "AUTH", [
                "Verify the username/password for this profile",
            ]);
        }
        this.sessionToken = data.id;
        this.opts.onSession?.({ token: data.id, obtained_at: new Date().toISOString() });
    }
    async authHeaders() {
        if (this.opts.auth.scheme === "api_key") {
            return { "X-API-Key": this.opts.auth.apiKey };
        }
        if (!this.sessionToken)
            await this.login();
        return { "X-Metabase-Session": this.sessionToken };
    }
    async request(method, path, opts) {
        const exec = async () => this.rawFetch(method, path, {
            query: opts.query,
            json: opts.body,
            form: opts.form,
            timeoutMs: opts.timeoutMs,
            headers: await this.authHeaders(),
        });
        let res = await exec();
        if (res.status === 401 && this.opts.auth.scheme === "session") {
            this.sessionToken = undefined; // expired — re-auth once, transparently
            res = await exec();
        }
        if (!res.ok) {
            throw mapHttpError(res.status, await safeText(res), this.host, `${method} ${path}`);
        }
        if (opts.raw) {
            return Buffer.from(await res.arrayBuffer());
        }
        const text = await res.text();
        return (text ? JSON.parse(text) : null);
    }
    async rawFetch(method, path, init = {}) {
        const url = this.opts.baseUrl.replace(/\/$/, "") + path + queryString(init.query);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? this.opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        const headers = { Accept: "application/json", ...init.headers };
        let body;
        if (init.json !== undefined) {
            body = JSON.stringify(init.json);
            headers["Content-Type"] = "application/json";
        }
        else if (init.form) {
            body = new URLSearchParams(init.form).toString();
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        try {
            return await fetch(url, { method, headers, body, signal: controller.signal });
        }
        catch {
            throw new AxiError(`Cannot reach Metabase at ${this.host}`, "UNREACHABLE", [
                "Check the instance URL and your network/VPN",
                "Run `metabase-axi doctor` to diagnose",
            ]);
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
// Helpers ─────────────────────────────────────────────────────────────
function queryString(query) {
    if (!query)
        return "";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined)
            continue;
        if (Array.isArray(value)) {
            for (const v of value)
                params.append(key, String(v));
        }
        else {
            params.append(key, String(value));
        }
    }
    const s = params.toString();
    return s ? `?${s}` : "";
}
async function safeText(res) {
    try {
        return await res.text();
    }
    catch {
        return "";
    }
}
/** Pull a human message out of a Metabase error body (JSON `{message}` or a bare string). */
export function extractMessage(bodyText) {
    const trimmed = bodyText.trim();
    if (!trimmed)
        return undefined;
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "string")
            return cap(parsed);
        if (parsed && typeof parsed === "object") {
            const obj = parsed;
            const msg = obj.message ?? obj.error ?? obj.cause;
            if (typeof msg === "string")
                return cap(msg);
        }
    }
    catch {
        return cap(trimmed);
    }
    return undefined;
}
function cap(s, max = 500) {
    return s.length > max ? `${s.slice(0, max)}… (truncated, ${s.length} chars total)` : s;
}
export function mapHttpError(status, bodyText, host, where) {
    const serverMsg = extractMessage(bodyText);
    switch (status) {
        case 401:
            return new AxiError(`Authentication failed (${where})`, "AUTH", [
                "Run `metabase-axi doctor` to check credentials",
                "Re-run `metabase-axi auth login` or verify the API key",
            ]);
        case 403:
            return new AxiError(`Forbidden${serverMsg ? `: ${serverMsg}` : ` (${where})`}`, "FORBIDDEN", [
                "The API key / user lacks permission for this object",
            ]);
        case 404:
            return new AxiError(`Not found (${where})`, "NOT_FOUND", [
                "Check the id; use `search` or a `list` command to find it",
            ]);
        case 400:
        case 422:
            return new AxiError(serverMsg ? `Query error: ${serverMsg}` : `Bad request (${where})`, "QUERY_ERROR", ["Check the SQL/MBQL and any parameters"]);
        default:
            return new AxiError(`Metabase returned ${status} (${where})${serverMsg ? `: ${serverMsg}` : ""}`, "HTTP_ERROR", [`Host: ${host}`]);
    }
}
//# sourceMappingURL=client.js.map