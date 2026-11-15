import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { chmodSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  configPath,
  readConfig,
  writeConfig,
  defaultConfig,
  hostOf,
  listProfileNames,
  removeProfile,
  setDefault,
  setProfile,
} from "../src/config.js";

describe("config profile helpers", () => {
  it("makes the first added profile the default", () => {
    let cfg = defaultConfig();
    cfg = setProfile(cfg, "prod", { url: "https://prod.example", auth: { api_key: "k1" } });
    expect(cfg.default).toBe("prod");
    cfg = setProfile(cfg, "staging", { url: "https://staging.example", auth: { api_key: "k2" } });
    expect(cfg.default).toBe("prod"); // adding a second profile does not move the default
    expect(listProfileNames(cfg)).toEqual(["prod", "staging"]);
  });

  it("reassigns the default when the current default is removed and one remains", () => {
    let cfg = defaultConfig();
    cfg = setProfile(cfg, "a", { url: "https://a", auth: { api_key: "k" } });
    cfg = setProfile(cfg, "b", { url: "https://b", auth: { api_key: "k" } });
    cfg = removeProfile(cfg, "a"); // default was "a"
    expect(cfg.default).toBe("b");
  });

  it("clears the default when removing the last-but-ambiguous default leaves 2+", () => {
    let cfg = defaultConfig();
    cfg = setProfile(cfg, "a", { url: "https://a", auth: { api_key: "k" } });
    cfg = setProfile(cfg, "b", { url: "https://b", auth: { api_key: "k" } });
    cfg = setProfile(cfg, "c", { url: "https://c", auth: { api_key: "k" } });
    cfg = setDefault(cfg, "a");
    cfg = removeProfile(cfg, "a"); // two remain → no unambiguous default
    expect(cfg.default).toBeUndefined();
  });

  it("extracts a host from a url, falling back to the raw string", () => {
    expect(hostOf("https://metabase.example.org/api")).toBe("metabase.example.org");
    expect(hostOf("not a url")).toBe("not a url");
  });
});

describe("writeConfig", () => {
  let dir: string;
  let savedDir: string | undefined;
  beforeEach(() => {
    savedDir = process.env.METABASE_AXI_CONFIG_DIR;
    dir = mkdtempSync(join(tmpdir(), "mb-axi-config-"));
    process.env.METABASE_AXI_CONFIG_DIR = dir;
  });
  afterEach(() => {
    if (savedDir === undefined) delete process.env.METABASE_AXI_CONFIG_DIR;
    else process.env.METABASE_AXI_CONFIG_DIR = savedDir;
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates the config file owner-only", () => {
    writeConfig(setProfile(defaultConfig(), "acme", { url: "https://a", auth: { api_key: "k" } }));
    expect(statSync(configPath()).mode & 0o777).toBe(0o600);
    expect(readConfig().default).toBe("acme");
  });

  it("tightens a config file that already existed with looser permissions", () => {
    writeFileSync(configPath(), "{}\n");
    chmodSync(configPath(), 0o644);
    writeConfig(setProfile(defaultConfig(), "acme", { url: "https://a", auth: { api_key: "k" } }));
    expect(statSync(configPath()).mode & 0o777).toBe(0o600);
  });
});
