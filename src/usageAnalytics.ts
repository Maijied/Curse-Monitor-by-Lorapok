import type { BudgetMetrics, UsageSummary } from "./api.js";
import type { DailyCodeStats, LocalInsights } from "./localInsights.js";

export type UsageRangePreset = "7d" | "30d" | "cycle" | "mtd";
export type UsageGroupBy = "autoApi" | "surface" | "model";

export const USAGE_RANGE_PRESETS: UsageRangePreset[] = ["7d", "30d", "cycle", "mtd"];
export const USAGE_GROUP_BY: UsageGroupBy[] = ["autoApi", "surface", "model"];

/** Honest product constraint — Cursor's usage API has no per-model USD. */
export const MODEL_SPEND_CONSTRAINT =
  "Cursor API does not expose per-model dollar spend. Model breakdown is local active-model / analytics grouping plus Auto/API meters — not a dollar split.";

export interface UsageKpiSummary {
  totalLabel: string;
  totalValue: string;
  includedLabel: string;
  includedValue: string;
  bonusLabel: string;
  bonusValue: string;
  onDemandLabel: string;
  onDemandValue: string;
  autoLabel: string;
  autoValue: string;
  apiLabel: string;
  apiValue: string;
}

export interface UsageChartLayer {
  id: string;
  label: string;
  color: string;
  values: number[];
}

export interface UsageChartPoint {
  t: number;
  label: string;
}

export interface UsageHistoryPoint {
  t: number;
  includedPercent: number;
  auto: number;
  api: number;
}

export interface UsageAnalyticsView {
  range: UsageRangePreset;
  groupBy: UsageGroupBy;
  kpi: UsageKpiSummary;
  points: UsageChartPoint[];
  layers: UsageChartLayer[];
  yMax: number;
  yUnit: "percent" | "lines" | "units";
  emptyMessage?: string;
  constraint: string;
}

export const USAGE_LAYER_COLORS = {
  auto: "#39ff14",
  api: "#4d9fff",
  tab: "#6C5CE7",
  composer: "#4d9fff",
  default: "#f5b942",
} as const;

const MODEL_PALETTE = [
  "#39ff14",
  "#4d9fff",
  "#f5b942",
  "#ff6bcb",
  "#a78bfa",
  "#22d3ee",
  "#fb923c",
];

function modelColor(modelId: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < modelId.length; i++) {
    hash = (hash * 31 + modelId.charCodeAt(i)) | 0;
  }
  return MODEL_PALETTE[Math.abs(hash) % MODEL_PALETTE.length] ?? MODEL_PALETTE[index % MODEL_PALETTE.length]!;
}

function formatUnits(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function parseRangePreset(raw: string | undefined): UsageRangePreset {
  const v = (raw ?? "7d").trim().toLowerCase();
  if (v === "7d" || v === "30d" || v === "cycle" || v === "mtd") return v;
  throw new Error(`Invalid range "${raw}". Use 7d | 30d | cycle | mtd.`);
}

export function parseGroupBy(raw: string | undefined): UsageGroupBy {
  const v = (raw ?? "autoApi").trim();
  const normalized = v === "auto-api" || v === "auto_api" ? "autoApi" : v;
  if (normalized === "autoApi" || normalized === "surface" || normalized === "model") {
    return normalized;
  }
  throw new Error(`Invalid group-by "${raw}". Use model | autoApi | surface.`);
}

export function rangeStartMs(range: UsageRangePreset, cycleStart?: string, now = Date.now()): number {
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  if (range === "mtd") {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }
  if (cycleStart) {
    const parsed = Date.parse(cycleStart);
    if (Number.isFinite(parsed)) return parsed;
  }
  return now - 30 * 24 * 60 * 60 * 1000;
}

function filterHistoryByRange(
  history: UsageHistoryPoint[],
  range: UsageRangePreset,
  cycleStart?: string
): UsageHistoryPoint[] {
  const start = rangeStartMs(range, cycleStart);
  return history.filter((p) => p.t >= start).sort((a, b) => a.t - b.t);
}

function pointLabel(t: number): string {
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dayKeyFromStats(stats: DailyCodeStats): string | null {
  const raw = stats.date?.trim();
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

export function filterDailyByRange(
  daily: DailyCodeStats[],
  range: UsageRangePreset,
  cycleStart?: string
): DailyCodeStats[] {
  const start = rangeStartMs(range, cycleStart);
  return daily
    .filter((row) => {
      const key = dayKeyFromStats(row);
      if (!key) return true;
      const ms = Date.parse(`${key}T12:00:00`);
      return Number.isFinite(ms) ? ms >= start : true;
    })
    .sort((a, b) => (dayKeyFromStats(a) ?? "").localeCompare(dayKeyFromStats(b) ?? ""));
}

function maxStackTotal(layers: Array<{ values: number[] }>, floor = 1): number {
  if (!layers.length) return floor;
  const pointCount = layers[0]!.values.length;
  let max = floor;
  for (let i = 0; i < pointCount; i++) {
    let sum = 0;
    for (const layer of layers) {
      sum += layer.values[i] ?? 0;
    }
    max = Math.max(max, sum);
  }
  return max;
}

export function buildUsageKpi(budget: BudgetMetrics | null | undefined): UsageKpiSummary {
  if (!budget) {
    return {
      totalLabel: "Pool used",
      totalValue: "—",
      includedLabel: "Included",
      includedValue: "—",
      bonusLabel: "Bonus",
      bonusValue: "—",
      onDemandLabel: "On-demand",
      onDemandValue: "—",
      autoLabel: "Auto %",
      autoValue: "—",
      apiLabel: "API %",
      apiValue: "—",
    };
  }

  return {
    totalLabel: "Pool used",
    totalValue: formatPct(budget.poolPercent),
    includedLabel: "Included",
    includedValue: `${formatUnits(budget.includedUsed)} / ${formatUnits(budget.included)}`,
    bonusLabel: budget.bonusLabel,
    bonusValue:
      budget.bonus > 0
        ? `${formatUnits(budget.bonusUsed)} / ${formatUnits(budget.bonus)}`
        : "none",
    onDemandLabel: "On-demand",
    onDemandValue: budget.onDemandEnabled
      ? `${budget.onDemandUsedDisplay} / ${budget.onDemandLimitDisplay}`
      : "disabled",
    autoLabel: "Auto %",
    autoValue: formatPct(budget.autoPercentUsed),
    apiLabel: "API %",
    apiValue: formatPct(budget.apiPercentUsed),
  };
}

export interface BuildUsageAnalyticsInput {
  budget: BudgetMetrics | null | undefined;
  usage: UsageSummary | null | undefined;
  history?: UsageHistoryPoint[];
  local?: LocalInsights | null;
  dailySeries?: DailyCodeStats[];
  range?: UsageRangePreset;
  groupBy?: UsageGroupBy;
}

export function buildUsageAnalytics(input: BuildUsageAnalyticsInput): UsageAnalyticsView {
  const range = input.range ?? "7d";
  const groupBy = input.groupBy ?? "autoApi";
  const cycleStart = input.usage?.billingCycleStart;
  const kpi = buildUsageKpi(input.budget);
  const constraint = MODEL_SPEND_CONSTRAINT;

  if (groupBy === "surface") {
    if (!input.dailySeries?.length) {
      return {
        range,
        groupBy,
        kpi,
        points: [],
        layers: [],
        yMax: 1,
        yUnit: "lines",
        emptyMessage:
          "Local daily stats are not available yet — keep using Cursor on this machine.",
        constraint,
      };
    }
    const rows = filterDailyByRange(input.dailySeries, range, cycleStart);
    if (rows.length < 2) {
      return {
        range,
        groupBy,
        kpi,
        points: [],
        layers: [],
        yMax: 1,
        yUnit: "lines",
        emptyMessage: "Need more local daily stats — keep using Cursor on this machine.",
        constraint,
      };
    }
    const points: UsageChartPoint[] = rows.map((row) => {
      const key = dayKeyFromStats(row) ?? row.date;
      const ms = Date.parse(`${key}T12:00:00`);
      return { t: Number.isFinite(ms) ? ms : Date.now(), label: key };
    });
    const tabValues = rows.map((r) => r.tabAcceptedLines);
    const composerValues = rows.map((r) => r.composerAcceptedLines);
    const surfaceLayers = [
      { id: "tab", label: "Tab", color: USAGE_LAYER_COLORS.tab, values: tabValues },
      { id: "composer", label: "Composer", color: USAGE_LAYER_COLORS.composer, values: composerValues },
    ];
    return {
      range,
      groupBy,
      kpi,
      points,
      layers: surfaceLayers,
      yMax: maxStackTotal(surfaceLayers),
      yUnit: "lines",
      constraint,
    };
  }

  if (groupBy === "model") {
    if (!input.local?.models?.length) {
      return {
        range,
        groupBy,
        kpi,
        points: [],
        layers: [],
        yMax: 100,
        yUnit: "percent",
        emptyMessage:
          "Model breakdown needs local dashboard capture — try again after using Cursor.",
        constraint,
      };
    }
    const models = input.local.models;
    const history = filterHistoryByRange(input.history ?? [], range, cycleStart);
    if (history.length < 2) {
      return {
        range,
        groupBy,
        kpi,
        points: [],
        layers: [],
        yMax: 100,
        yUnit: "percent",
        emptyMessage:
          "No per-model dollar spend from Cursor API. Active models listed below; Auto/API meters are the billed mix.",
        constraint,
      };
    }
    const points: UsageChartPoint[] = history.map((p) => ({ t: p.t, label: pointLabel(p.t) }));
    const share = 100 / Math.max(models.length, 1);
    const layers: UsageChartLayer[] = models.slice(0, 6).map((m, i) => ({
      id: m.modelName,
      label: `${m.label}: ${m.modelName}`,
      color: modelColor(m.modelName, i),
      values: history.map((p) => {
        const base = (p.auto + p.api) / 2;
        return (base * share) / 100;
      }),
    }));
    return {
      range,
      groupBy,
      kpi,
      points,
      layers,
      yMax: 100,
      yUnit: "percent",
      emptyMessage:
        "Estimated Auto/API share across locally active models — not per-model dollar spend.",
      constraint,
    };
  }

  const history = filterHistoryByRange(input.history ?? [], range, cycleStart);
  if (history.length < 2) {
    return {
      range,
      groupBy: "autoApi",
      kpi,
      points: [],
      layers: [],
      yMax: 100,
      yUnit: "percent",
      emptyMessage:
        "Auto/API trend builds as curse-monitor polls (status, watch, report, json). Current meters are in the board above.",
      constraint,
    };
  }

  const points: UsageChartPoint[] = history.map((p) => ({ t: p.t, label: pointLabel(p.t) }));
  const autoValues = history.map((p) => p.auto);
  const apiValues = history.map((p) => p.api);
  const autoApiLayers = [
    { id: "auto", label: "Auto", color: USAGE_LAYER_COLORS.auto, values: autoValues },
    { id: "api", label: "API", color: USAGE_LAYER_COLORS.api, values: apiValues },
  ];

  return {
    range,
    groupBy: "autoApi",
    kpi,
    points,
    layers: autoApiLayers,
    yMax: Math.max(100, maxStackTotal(autoApiLayers)),
    yUnit: "percent",
    constraint,
  };
}
