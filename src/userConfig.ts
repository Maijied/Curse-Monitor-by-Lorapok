import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Local Curse Monitor config directory (history + account preference).
 * Linux/macOS: $XDG_CONFIG_HOME/curse-monitor or ~/.config/curse-monitor
 * Windows: %APPDATA%/curse-monitor
 */
export function curseMonitorConfigDir(): string {
  if (process.platform === "win32") {
    return process.env.APPDATA
      ? join(process.env.APPDATA, "curse-monitor")
      : join(homedir(), "AppData", "Roaming", "curse-monitor");
  }
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  if (xdg) return join(xdg, "curse-monitor");
  return join(homedir(), ".config", "curse-monitor");
}

/** Path to config.json. Override with CURSE_MONITOR_CONFIG (tests / custom layouts). */
export function configFilePath(override?: string): string {
  const explicit = override?.trim() || process.env.CURSE_MONITOR_CONFIG?.trim();
  if (explicit) return explicit;
  return join(curseMonitorConfigDir(), "config.json");
}

/** Persisted account pointer — email + product folder only. Never a token. */
export interface AccountPreference {
  activeEmail?: string;
  activeProductFolder?: string;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Load the saved account pointer. Unknown / token-like keys are ignored.
 */
export function loadAccountPreference(configPath?: string): AccountPreference {
  const path = configFilePath(configPath);
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const rec = raw as Record<string, unknown>;
    const out: AccountPreference = {};
    const email = asNonEmptyString(rec.activeEmail);
    if (email?.includes("@")) out.activeEmail = email;
    const folder = asNonEmptyString(rec.activeProductFolder);
    if (folder) out.activeProductFolder = folder;
    return out;
  } catch {
    return {};
  }
}

/** Write only email + product folder. Never persist access tokens. */
export function saveAccountPreference(
  pref: AccountPreference,
  configPath?: string
): string {
  const path = configFilePath(configPath);
  mkdirSync(dirname(path), { recursive: true });
  const payload: AccountPreference = {};
  if (pref.activeEmail) payload.activeEmail = pref.activeEmail;
  if (pref.activeProductFolder) payload.activeProductFolder = pref.activeProductFolder;
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return path;
}
