export declare const CONFIG_VERSION = 1;
/** Credentials stored for one profile. API key is primary; username/password is fallback. */
export interface ProfileAuth {
    api_key?: string;
    username?: string;
    password?: string;
}
/** Cached session token for session (username/password) auth. */
export interface SessionToken {
    token: string;
    obtained_at: string;
}
/** Cached summary of a profile, refreshed on auth/doctor. Never holds secrets. */
export interface ProfileCache {
    user_name?: string;
    version?: string;
    database_count?: number;
    cached_at?: string;
}
/** A named target Metabase instance. */
export interface Profile {
    url: string;
    auth: ProfileAuth;
    session?: SessionToken;
    cache?: ProfileCache;
}
export interface Config {
    version: number;
    default?: string;
    profiles: Record<string, Profile>;
}
export declare function configDir(): string;
export declare function configPath(): string;
export declare function defaultConfig(): Config;
export declare function readConfig(): Config;
export declare function writeConfig(cfg: Config): void;
export declare function listProfileNames(cfg: Config): string[];
export declare function getProfile(cfg: Config, name: string): Profile | undefined;
export declare function setProfile(cfg: Config, name: string, profile: Profile): Config;
export declare function removeProfile(cfg: Config, name: string): Config;
export declare function setDefault(cfg: Config, name: string): Config;
/** Host portion of a URL for compact display (no scheme/path). Falls back to the raw url. */
export declare function hostOf(url: string): string;
