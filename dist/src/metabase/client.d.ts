import { AxiError } from "axi-sdk-js";
import { type SessionToken } from "../config.js";
/** Resolved auth for a single client: API key (primary) or session (fallback). */
export type ResolvedAuth = {
    scheme: "api_key";
    apiKey: string;
} | {
    scheme: "session";
    username: string;
    password: string;
    token?: string;
};
export interface ClientOptions {
    baseUrl: string;
    auth: ResolvedAuth;
    /** Invoked when a fresh session token is obtained, so the caller can persist it. */
    onSession?: (token: SessionToken) => void;
    timeoutMs?: number;
}
export interface RequestOptions {
    query?: Record<string, string | number | boolean | string[] | undefined>;
    /** JSON request body. */
    body?: unknown;
    /** Form-encoded body (export endpoints take `query=<json>` as form data). */
    form?: Record<string, string>;
    /** Return raw bytes instead of parsed JSON (csv/xlsx export). */
    raw?: boolean;
    timeoutMs?: number;
}
export declare class MetabaseClient {
    private readonly opts;
    private sessionToken?;
    constructor(opts: ClientOptions);
    get host(): string;
    get scheme(): "api_key" | "session";
    get<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
    post<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
    /** Replace an object. Metabase `PUT` is a full replace — send a fetch-modify-merged body. */
    put<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
    /** `delete` is a reserved word, so the verb is `del`. */
    del<T = unknown>(path: string, opts?: RequestOptions): Promise<T>;
    /** Force a session login (session auth only). No-op for API-key auth. */
    login(): Promise<void>;
    private authHeaders;
    private request;
    private rawFetch;
}
/** Pull a human message out of a Metabase error body (JSON `{message}` or a bare string). */
export declare function extractMessage(bodyText: string): string | undefined;
export declare function mapHttpError(status: number, bodyText: string, host: string, where: string): AxiError;
