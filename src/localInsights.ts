import { existsSync } from "node:fs";
import { listItemsLike, readItem, withSqlite } from "./sqlite.js";

export interface DailyCodeStats {
  date: string;
  tabSuggestedLines: number;
  tabAcceptedLines: number;
  composerSuggestedLines: number;
  composerAcceptedLines: number;
}

export interface ActiveModel {
  surface: string;
  label: string;
  modelName: string;
}

export interface RecentSession {
  id: string;
  name: string;
  mode: string;
  recency: number;
  recencyLabel: string;
  linesAdded: number;
  linesRemoved: number;
}

/** Privacy-safe local Cursor insights. Never includes tokens or chat bodies. */
export interface LocalInsights {
  today: DailyCodeStats | null;
  cycleSuggested: number;
  cycleAccepted: number;
  tabAccepted: number;
  composerAccepted: number;
  models: ActiveModel[];
  lastUsedModel: string | null;
  sessions: RecentSession[];
  teamName: string | null;
  teamId: number | null;
  membershipType: string | null;
}

const DAILY_STATS_PREFIX = "aiCodeTracking.dailyStats.";
const REACTIVE_STORAGE_KEY = "src.vs.platform.reactivestorage.store";

const SURFACE_LABELS: Record<string, string> = {
  composer: "Composer",
  "cmd-k": "Inline",
  "quick-agent": "Agent",
  "background-composer": "Background",
  "plan-execution": "Plan",
  spec: "Spec",
  "deep-search": "Search",
  "composer-ensemble": "Ensemble",
};

export function emptyLocalInsights(): LocalInsights {
  return {
    today: null,
    cycleSuggested: 0,
    cycleAccepted: 0,
    tabAccepted: 0,
    composerAccepted: 0,
    models: [],
    lastUsedModel: null,
    sessions: [],
    teamName: null,
    teamId: null,
    membershipType: null,
  };
}

export function parseDailyStats(raw: string): DailyCodeStats | null {
  try {
    const data = JSON.parse(raw) as Partial<DailyCodeStats>;
    if (!data || typeof data !== "object") return null;
    return {
      date: String(data.date ?? ""),
      tabSuggestedLines: Number(data.tabSuggestedLines) || 0,
      tabAcceptedLines: Number(data.tabAcceptedLines) || 0,
      composerSuggestedLines: Number(data.composerSuggestedLines) || 0,
      composerAcceptedLines: Number(data.composerAcceptedLines) || 0,
    };
  } catch {
    return null;
  }
}

function modelNameFromConfig(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (typeof rec.modelName === "string" && rec.modelName.trim()) {
    return rec.modelName;
  }
  if (typeof rec.modelId === "string" && rec.modelId.trim()) {
    return rec.modelId;
  }
  const selected = rec.selectedModels;
  if (Array.isArray(selected) && selected[0] && typeof selected[0] === "object") {
    const id = (selected[0] as Record<string, unknown>).modelId;
    if (typeof id === "string" && id.trim()) return id;
  }
  return null;
}

export function parseModelConfig(reactiveJson: string): {
  models: ActiveModel[];
  lastUsedModel: string | null;
  teamId: number | null;
} {
  try {
    const data = JSON.parse(reactiveJson) as Record<string, unknown>;
    const aiSettings = (data.aiSettings ?? {}) as Record<string, unknown>;
    const modelConfig = (aiSettings.modelConfig ?? {}) as Record<string, unknown>;
    const models: ActiveModel[] = [];
    for (const [surface, value] of Object.entries(modelConfig)) {
      const modelName = modelNameFromConfig(value);
      if (!modelName || modelName === "default") continue;
      models.push({
        surface,
        label: SURFACE_LABELS[surface] ?? surface,
        modelName,
      });
    }
    models.sort((a, b) => {
      const order = ["composer", "cmd-k", "quick-agent", "background-composer"];
      return (
        (order.indexOf(a.surface) === -1 ? 99 : order.indexOf(a.surface)) -
        (order.indexOf(b.surface) === -1 ? 99 : order.indexOf(b.surface))
      );
    });

    const lastUsedAt = (aiSettings.modelLastUsedAt ?? {}) as Record<string, string>;
    let lastUsedModel: string | null = null;
    let latest = "";
    for (const [name, iso] of Object.entries(lastUsedAt)) {
      if (typeof iso === "string" && iso > latest) {
        latest = iso;
        lastUsedModel = name;
      }
    }

    const teamIdRaw = aiSettings.teamId;
    const teamId = typeof teamIdRaw === "number" ? teamIdRaw : null;
    return { models, lastUsedModel, teamId };
  } catch {
    return { models: [], lastUsedModel: null, teamId: null };
  }
}

export function formatRelativeTime(epochMs: number, now = Date.now()): string {
  if (!Number.isFinite(epochMs) || epochMs <= 0) return "";
  const delta = Math.max(0, now - epochMs);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function parseComposerHeader(
  value: string,
  meta: { composerId: string; recency: number },
  now = Date.now()
): RecentSession | null {
  try {
    const data = JSON.parse(value) as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    if (!name) return null;
    const mode = String(data.unifiedMode ?? data.forceMode ?? "agent");
    return {
      id: meta.composerId,
      name,
      mode,
      recency: meta.recency,
      recencyLabel: formatRelativeTime(meta.recency, now),
      linesAdded: Number(data.totalLinesAdded) || 0,
      linesRemoved: Number(data.totalLinesRemoved) || 0,
    };
  } catch {
    return null;
  }
}

function parseCachedTeam(raw: string | null): { teamName: string | null; teamId: number | null } {
  if (!raw) return { teamName: null, teamId: null };
  try {
    const data = JSON.parse(raw) as { name?: string; teamId?: number };
    return {
      teamName: typeof data.name === "string" ? data.name : null,
      teamId: typeof data.teamId === "number" ? data.teamId : null,
    };
  } catch {
    return { teamName: raw, teamId: null };
  }
}

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeDailyStatsDate(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : todayKey(date);
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return todayKey(parsed);
  const match = trimmed.match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

function extractDailyStatsDateFromKey(key: string): string | null {
  const match = String(key).match(/(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

export function dailyStatsRowIsToday(
  rowKey: string,
  stats: DailyCodeStats,
  today: string
): boolean {
  const dateFromValue = normalizeDailyStatsDate(stats.date);
  if (dateFromValue === today) return true;
  const dateFromKey = extractDailyStatsDateFromKey(rowKey);
  return dateFromKey === today;
}

function collectDailyRows(
  dbPath: string
): Array<{ key: string; stats: DailyCodeStats }> {
  if (!existsSync(dbPath)) return [];
  try {
    return withSqlite(dbPath, (db) => {
      const rows = listItemsLike(db, `${DAILY_STATS_PREFIX}%`);
      const out: Array<{ key: string; stats: DailyCodeStats }> = [];
      for (const row of rows) {
        const stats = parseDailyStats(row.value);
        if (!stats) continue;
        const dateKey =
          normalizeDailyStatsDate(stats.date) ?? extractDailyStatsDateFromKey(row.key);
        if (dateKey) stats.date = dateKey;
        out.push({ key: row.key, stats });
      }
      return out;
    });
  } catch {
    return [];
  }
}

/** All daily stats rows sorted by date (IDE local DB). */
export function readDailyStatsSeries(dbPath?: string): DailyCodeStats[] {
  if (!dbPath || !existsSync(dbPath)) return [];
  return collectDailyRows(dbPath)
    .map((r) => r.stats)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

/** Privacy-safe local insights: stats, models, session titles. Never reads chat bodies. */
export function readLocalInsights(dbPath?: string): LocalInsights {
  const empty = emptyLocalInsights();
  if (!dbPath || !existsSync(dbPath)) return empty;

  try {
    return withSqlite(dbPath, (db) => {
      const insights = emptyLocalInsights();
      const today = todayKey();
      const dailyRows = listItemsLike(db, `${DAILY_STATS_PREFIX}%`);

      for (const row of dailyRows) {
        const stats = parseDailyStats(row.value);
        if (!stats) continue;
        const dateKey =
          normalizeDailyStatsDate(stats.date) ?? extractDailyStatsDateFromKey(row.key);
        if (dateKey) stats.date = dateKey;
        insights.cycleSuggested += stats.tabSuggestedLines + stats.composerSuggestedLines;
        insights.cycleAccepted += stats.tabAcceptedLines + stats.composerAcceptedLines;
        insights.tabAccepted += stats.tabAcceptedLines;
        insights.composerAccepted += stats.composerAcceptedLines;
        if (dailyStatsRowIsToday(row.key, stats, today)) {
          insights.today = stats;
        }
      }

      const reactive = readItem(db, REACTIVE_STORAGE_KEY);
      if (reactive) {
        const parsed = parseModelConfig(reactive);
        insights.models = parsed.models;
        insights.lastUsedModel = parsed.lastUsedModel;
        if (parsed.teamId != null) insights.teamId = parsed.teamId;
      }

      const team = parseCachedTeam(readItem(db, "cursorAuth/cachedTeam") ?? null);
      insights.teamName = team.teamName;
      if (team.teamId != null) insights.teamId = team.teamId;

      const membership = readItem(db, "cursorAuth/stripeMembershipType");
      if (membership?.trim()) insights.membershipType = membership.trim();

      try {
        const sessionRows = db
          .prepare(
            "SELECT composerId, recency, isArchived, isSubagent, value FROM composerHeaders WHERE IFNULL(isArchived, 0) = 0 AND IFNULL(isSubagent, 0) = 0 ORDER BY recency DESC LIMIT 12"
          )
          .all();
        for (const row of sessionRows) {
          const value = typeof row.value === "string" ? row.value : undefined;
          const composerId = typeof row.composerId === "string" ? row.composerId : undefined;
          if (!value || !composerId) continue;
          const session = parseComposerHeader(value, {
            composerId,
            recency: Number(row.recency) || 0,
          });
          if (session) insights.sessions.push(session);
          if (insights.sessions.length >= 5) break;
        }
      } catch {
        // composerHeaders is Cursor-only; other product DBs may not have it.
      }

      return insights;
    });
  } catch {
    return empty;
  }
}
