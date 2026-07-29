import { type Config } from "./config.js";
import { MetabaseClient, type ResolvedAuth } from "./metabase/client.js";
export type InstanceSource = "env" | "flag" | "default" | "single";
export interface ResolvedInstance {
    /** Display name: profile name, or "env". */
    name: string;
    url: string;
    source: InstanceSource;
    /** Set when resolved from a config profile (enables session-token persistence). */
    profileName?: string;
}
export interface ResolveOptions {
    instanceFlag?: string;
    /** True for mutating or potentially expensive ops (ad-hoc query, card run). */
    risky?: boolean;
    config?: Config;
}
/**
 * Resolve the target instance per the precedence in
 * specs/behaviors/instance-resolution.md: env > --instance > default > single,
 * stopping for ambiguity on risky ops with 2+ profiles.
 */
export declare function resolveInstance(opts?: ResolveOptions): ResolvedInstance;
/** Resolve credentials for an instance per specs/behaviors/credential-resolution.md. */
export declare function resolveCredentials(instance: ResolvedInstance, cfg: Config): ResolvedAuth;
export interface ResolvedClient {
    instance: ResolvedInstance;
    client: MetabaseClient;
    credSource: "env" | "config";
}
/** Resolve instance + credentials and build a ready client. */
export declare function createClient(opts?: ResolveOptions): ResolvedClient;
/** "name (host)" — the instance label echoed by data-bearing commands. */
export declare function instanceLabel(instance: ResolvedInstance): string;
