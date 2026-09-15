import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { UsageHistoryPoint } from "./usageAnalytics.js";
import { curseMonitorConfigDir } from "./userConfig.js";

const MAX_POINTS = 400;
const MIN_INTERVAL_MS = 60_000;

/** Local poll history (Auto/API meters only). Never stores tokens. */
export function historyFilePath(): string {
  return join(curseMonitorConfigDir(), "history.json");
}

export function loadHistory(): UsageHistoryPoint[] {
  const path = historyFilePath();
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((p): p is UsageHistoryPoint => {
        if (!p || typeof p !== "object") return false;
        const rec = p as Record<string, unknown>;
        return typeof rec.t === "number" && Number.isFinite(rec.t);
      })
      .map((p) => ({
        t: p.t,
        includedPercent: Number(p.includedPercent) || 0,
        auto: Number(p.auto) || 0,
        api: Number(p.api) || 0,
      }))
      .sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}

export function appendHistory(point: UsageHistoryPoint): void {
  try {
    const existing = loadHistory();
    const last = existing[existing.length - 1];
    if (last && point.t - last.t < MIN_INTERVAL_MS) {
      existing[existing.length - 1] = point;
    } else {
      existing.push(point);
    }
    const trimmed = existing.slice(-MAX_POINTS);
    const dir = dirname(historyFilePath());
    mkdirSync(dir, { recursive: true });
    writeFileSync(historyFilePath(), JSON.stringify(trimmed), "utf8");
  } catch {
    // History is best-effort; never fail a usage fetch because of disk.
  }
}
