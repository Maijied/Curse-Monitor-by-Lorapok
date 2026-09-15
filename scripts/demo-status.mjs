#!/usr/bin/env node
import { buildBudgetMetrics } from "../dist/api.js";
import { formatStatusBoard } from "../dist/format.js";

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
  teamId: 12671157,
  teamMembershipType: "SELF_SERVE",
};

const metrics = buildBudgetMetrics(summary, stripe, "demo@lorapok.tech");
const snapshot = {
  fetchedAt: new Date().toISOString(),
  email: "demo@lorapok.tech",
  productFolder: "Cursor",
  summary,
  stripe,
  metrics,
};

console.log("\n  Curse Monitor demo  ·  Lorapok Labs  ·  v0.1.2\n");
console.log(formatStatusBoard(snapshot));
console.log("\n  (Demo fixture — mirrors live pool math: bonus credits remain)\n");
