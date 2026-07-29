import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export const CONFIG_VERSION = 1;
// Paths ──────────────────────────────────────────────────────────────
export function configDir() {
    if (process.env.METABASE_AXI_CONFIG_DIR) {
        return process.env.METABASE_AXI_CONFIG_DIR;
    }
    const xdg = process.env.XDG_CONFIG_HOME;
    const base = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
    return join(base, "metabase-axi");
}
export function configPath() {
    return join(configDir(), "config.json");
}
// Read / write ────────────────────────────────────────────────────────
export function defaultConfig() {
    return { version: CONFIG_VERSION, profiles: {} };
}
export function readConfig() {
    const path = configPath();
    if (!existsSync(path))
        return defaultConfig();
    try {
        const parsed = JSON.parse(readFileSync(path, "utf-8"));
        return {
            version: parsed.version ?? CONFIG_VERSION,
            default: parsed.default,
            profiles: parsed.profiles ?? {},
        };
    }
    catch {
        return defaultConfig();
    }
}
export function writeConfig(cfg) {
    const dir = configDir();
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Restrictive perms: the file holds API keys / passwords.
    writeFileSync(configPath(), `${JSON.stringify(cfg, null, 2)}\n`, { mode: 0o600 });
}
// Profile helpers ─────────────────────────────────────────────────────
export function listProfileNames(cfg) {
    return Object.keys(cfg.profiles).sort();
}
export function getProfile(cfg, name) {
    return cfg.profiles[name];
}
export function setProfile(cfg, name, profile) {
    const profiles = { ...cfg.profiles, [name]: profile };
    // First profile added becomes the default.
    const def = cfg.default && profiles[cfg.default] ? cfg.default : name;
    return { ...cfg, profiles, default: def };
}
export function removeProfile(cfg, name) {
    const profiles = { ...cfg.profiles };
    delete profiles[name];
    let def = cfg.default;
    if (def === name) {
        const remaining = Object.keys(profiles);
        def = remaining.length === 1 ? remaining[0] : undefined;
    }
    return { ...cfg, profiles, default: def };
}
export function setDefault(cfg, name) {
    return { ...cfg, default: name };
}
/** Host portion of a URL for compact display (no scheme/path). Falls back to the raw url. */
export function hostOf(url) {
    try {
        return new URL(url).host;
    }
    catch {
        return url;
    }
}
//# sourceMappingURL=config.js.map