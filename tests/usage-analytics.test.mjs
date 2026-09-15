import assert from "node:assert/strict";
import { buildBudgetMetrics, detectStaleLimitBanner, resolveUsagePlanPool } from "../dist/api.js";
import {
  buildUsageAnalytics,
  buildUsageKpi,
  parseGroupBy,
  parseRangePreset,
  MODEL_SPEND_CONSTRAINT,
} from "../dist/usageAnalytics.js";
import {
  emptyLocalInsights,
  parseDailyStats,
  parseModelConfig,
  formatRelativeTime,
} from "../dist/localInsights.js";

const summary = {
  billingCycleStart: "2026-08-15T12:01:00.000Z",
  billingCycleEnd: "2026-09-15T12:01:00.000Z",
  membershipType: "enterprise",
  limitType: "team",
  isUnlimited: false,
  autoModelSelectedDisplayMessage: "You've used 100% of your included total usage",
  namedModelSelectedDisplayMessage: "You've used 100% of your included API usage",
  individualUsage: {
    plan: {
      enabled: true,
      used: 2000,
      limit: 2000,
      remaining: 0,
      breakdown: { included: 2000, bonus: 23214, total: 25214 },
      autoPercentUsed: 100,
      apiPercentUsed: 100,
      totalPercentUsed: 100,
    },
    onDemand: { enabled: false, used: 0, limit: null, remaining: null },
  },
  teamUsage: { onDemand: { enabled: false, used: 0, limit: null, remaining: null } },
};

const stripe = {
  membershipType: "enterprise",
  isTeamMember: true,
  teamId: "12671157",
};

const metrics = buildBudgetMetrics(summary, stripe, "demo@lorapok.tech");
assert.equal(metrics.poolTotal, 25214);
assert.equal(metrics.bonusRemaining, 23214);
assert.equal(metrics.staleLimitBanner, true);

const pool = resolveUsagePlanPool(summary.individualUsage.plan);
assert.equal(pool.remaining, 23214);
assert.equal(detectStaleLimitBanner(summary.individualUsage.plan, pool), true);

assert.equal(parseGroupBy("model"), "model");
assert.equal(parseGroupBy("auto-api"), "autoApi");
assert.equal(parseRangePreset("cycle"), "cycle");
assert.throws(() => parseGroupBy("tokens"));
assert.throws(() => parseRangePreset("year"));

const now = Date.now();
const history = [
  { t: now - 3 * 86400000, auto: 20, api: 10, includedPercent: 30 },
  { t: now - 2 * 86400000, auto: 35, api: 15, includedPercent: 50 },
  { t: now - 1 * 86400000, auto: 45, api: 25, includedPercent: 70 },
  { t: now, auto: 55, api: 30, includedPercent: 85 },
];

const kpi = buildUsageKpi(metrics);
assert.match(kpi.totalValue, /%/);
assert.match(kpi.includedValue, /2,000/);
assert.match(MODEL_SPEND_CONSTRAINT, /does not expose per-model dollar spend/i);

const autoApi = buildUsageAnalytics({
  budget: metrics,
  usage: summary,
  history,
});
assert.equal(autoApi.groupBy, "autoApi");
assert.equal(autoApi.points.length, 4);
assert.equal(autoApi.layers.length, 2);
assert.equal(autoApi.layers[0].id, "auto");
assert.equal(autoApi.layers[1].values[3], 30);

const day = (offsetDays) => {
  const d = new Date(now - offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
};

const surface = buildUsageAnalytics({
  budget: metrics,
  usage: summary,
  history,
  dailySeries: [
    { date: day(3), tabAcceptedLines: 10, composerAcceptedLines: 5, tabSuggestedLines: 0, composerSuggestedLines: 0 },
    { date: day(2), tabAcceptedLines: 20, composerAcceptedLines: 8, tabSuggestedLines: 0, composerSuggestedLines: 0 },
    { date: day(1), tabAcceptedLines: 15, composerAcceptedLines: 12, tabSuggestedLines: 0, composerSuggestedLines: 0 },
  ],
  groupBy: "surface",
  range: "7d",
});
assert.equal(surface.groupBy, "surface");
assert.equal(surface.yUnit, "lines");
assert.equal(surface.layers[0].id, "tab");

const emptyTrend = buildUsageAnalytics({ budget: metrics, usage: summary, history: [history[0]] });
assert.equal(emptyTrend.points.length, 0);
assert.match(emptyTrend.emptyMessage ?? "", /trend builds/i);

const modelMissing = buildUsageAnalytics({
  budget: metrics,
  usage: summary,
  history,
  groupBy: "model",
});
assert.equal(modelMissing.points.length, 0);
assert.match(modelMissing.emptyMessage ?? "", /model/i);
assert.match(modelMissing.constraint, /per-model dollar spend/i);

const local = emptyLocalInsights();
local.models = [
  { surface: "composer", label: "Composer", modelName: "composer-2" },
  { surface: "cmd-k", label: "Inline", modelName: "grok" },
];
const modelView = buildUsageAnalytics({
  budget: metrics,
  usage: summary,
  history,
  local,
  groupBy: "model",
});
assert.equal(modelView.layers.length, 2);
assert.match(modelView.emptyMessage ?? "", /not per-model dollar/i);

const stats = parseDailyStats(
  JSON.stringify({ date: "2026-09-01", tabAcceptedLines: 4, composerAcceptedLines: 9 })
);
assert.equal(stats?.tabAcceptedLines, 4);
assert.equal(stats?.composerAcceptedLines, 9);

const parsedModels = parseModelConfig(
  JSON.stringify({
    aiSettings: {
      modelConfig: {
        composer: { modelName: "composer-2" },
        "cmd-k": { modelId: "grok" },
        unused: { modelName: "default" },
      },
      modelLastUsedAt: { "composer-2": "2026-09-14T00:00:00.000Z" },
    },
  })
);
assert.equal(parsedModels.models.length, 2);
assert.equal(parsedModels.lastUsedModel, "composer-2");
assert.equal(formatRelativeTime(Date.now() - 120000, Date.now()), "2m ago");

console.log("usage-analytics.test.mjs: OK");
