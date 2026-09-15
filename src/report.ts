import type { UsageSnapshot } from "./api.js";
import { discoverStateDbPaths } from "./auth.js";
import { appendHistory, loadHistory } from "./history.js";
import {
  readDailyStatsSeries,
  readLocalInsights,
  type DailyCodeStats,
  type LocalInsights,
} from "./localInsights.js";
import {
  MODEL_SPEND_CONSTRAINT,
  buildUsageAnalytics,
  filterDailyByRange,
  parseGroupBy,
  parseRangePreset,
  type UsageAnalyticsView,
  type UsageGroupBy,
  type UsageRangePreset,
} from "./usageAnalytics.js";

export interface ReportOptions {
  groupBy?: string;
  range?: string;
}

export interface UsageReport {
  range: UsageRangePreset;
  groupBy: UsageGroupBy;
  constraint: string;
  analytics: UsageAnalyticsView;
  local: LocalInsights;
  dailySeries: DailyCodeStats[];
  historyPoints: number;
}

export function recordSnapshotHistory(snapshot: UsageSnapshot): void {
  appendHistory({
    t: Date.parse(snapshot.fetchedAt) || Date.now(),
    includedPercent: snapshot.metrics.includedPct,
    auto: snapshot.metrics.autoPercentUsed ?? 0,
    api: snapshot.metrics.apiPercentUsed ?? 0,
  });
}

export function buildUsageReport(
  snapshot: UsageSnapshot,
  opts: ReportOptions = {}
): UsageReport {
  const range = parseRangePreset(opts.range);
  const groupBy = parseGroupBy(opts.groupBy);
  const dbPath = snapshot.dbPath ?? discoverStateDbPaths()[0]?.path;
  const local = readLocalInsights(dbPath);
  const dailySeries = readDailyStatsSeries(dbPath);
  const history = loadHistory();
  const rangedDaily = filterDailyByRange(
    dailySeries,
    range,
    snapshot.summary.billingCycleStart
  );

  const analytics = buildUsageAnalytics({
    budget: snapshot.metrics,
    usage: snapshot.summary,
    history,
    local,
    dailySeries,
    range,
    groupBy,
  });

  return {
    range,
    groupBy,
    constraint: MODEL_SPEND_CONSTRAINT,
    analytics,
    local,
    dailySeries: rangedDaily,
    historyPoints: history.length,
  };
}

export { MODEL_SPEND_CONSTRAINT };
