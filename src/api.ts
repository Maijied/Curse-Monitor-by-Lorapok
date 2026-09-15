const API_BASE = "https://api2.cursor.sh";

export interface UsagePlanBreakdown {
  included?: number;
  bonus?: number;
  total?: number;
}

export interface UsagePlan {
  enabled?: boolean;
  used?: number;
  limit?: number;
  remaining?: number;
  breakdown?: UsagePlanBreakdown;
  autoPercentUsed?: number;
  apiPercentUsed?: number;
  totalPercentUsed?: number;
}

export interface OnDemandUsage {
  enabled?: boolean;
  used?: number;
  limit?: number | null;
  remaining?: number | null;
}

export interface UsageSummary {
  billingCycleStart?: string;
  billingCycleEnd?: string;
  membershipType?: string;
  limitType?: string;
  isUnlimited?: boolean;
  autoModelSelectedDisplayMessage?: string;
  namedModelSelectedDisplayMessage?: string;
  /** @deprecated older field name; prefer namedModelSelectedDisplayMessage */
  namedModelSelectedDisplayName?: string;
  individualUsage?: {
    plan?: UsagePlan;
    onDemand?: OnDemandUsage;
  };
  teamUsage?: {
    onDemand?: OnDemandUsage;
  };
  [key: string]: unknown;
}

export interface StripeProfile {
  membershipType?: string;
  individualMembershipType?: string;
  teamMembershipType?: string;
  isTeamMember?: boolean;
  teamId?: string | null;
  isOnBillableAuto?: boolean;
  isYearlyPlan?: boolean;
  lastPaymentFailed?: boolean;
  pendingCancellationDate?: string | null;
  subscriptionStatus?: string;
  customerBalance?: number;
  [key: string]: unknown;
}

/** Resolved included + bonus credit pool for the plan. */
export interface UsagePlanPool {
  included: number;
  bonus: number;
  total: number;
  used: number;
  remaining: number;
  percentUsed: number;
}

export interface BudgetMetrics {
  email?: string;
  membership: string;
  isTeamMember: boolean;
  teamId?: string | null;
  limitType?: string;
  isUnlimited: boolean;

  /** Combined pool (included + bonus). */
  poolUsed: number;
  poolTotal: number;
  poolRemaining: number;
  poolPercent: number;

  included: number;
  includedUsed: number;
  includedRemaining: number;
  includedPoolUsed: number;
  includedPoolRemaining: number;

  bonus: number;
  bonusUsed: number;
  bonusRemaining: number;
  bonusLabel: string;

  /** @deprecated alias of poolPercent / includedPct for older UI */
  includedLimit: number;
  includedPct: number;

  autoPercentUsed: number | null;
  apiPercentUsed: number | null;
  /** aliases */
  autoPct: number | null;
  apiPct: number | null;

  onDemandEnabled: boolean;
  onDemandUsed: number;
  onDemandLimit: number | null;
  onDemandRemaining: number | null;
  onDemandUsedDisplay: string;
  onDemandLimitDisplay: string;
  onDemandRemainingDisplay: string;

  teamOnDemandEnabled: boolean;
  teamOnDemandUsed: number;
  teamOnDemandLimit: number | null;
  teamOnDemandRemaining: number | null;
  teamOnDemandUsedDisplay: string;
  teamOnDemandLimitDisplay: string;

  cycleStart?: string;
  cycleEnd?: string;
  daysUntilReset: number | null;

  staleLimitBanner: boolean;
  staleLimitMessage?: string;
  atLimit: boolean;
  nearLimit: boolean;
  warning?: string;

  autoModelSelectedDisplayMessage?: string;
  namedModelSelectedDisplayMessage?: string;
}

async function cursorFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": "curse-monitor/0.1.1",
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Cursor API auth failed (${res.status}). Token may be expired — re-sign in to Cursor or refresh CURSOR_TOKEN.`
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cursor API ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function fetchUsageSummary(token: string): Promise<UsageSummary> {
  return cursorFetch<UsageSummary>("/auth/usage-summary", token);
}

export async function fetchStripeProfile(token: string): Promise<StripeProfile> {
  return cursorFetch<StripeProfile>("/auth/full_stripe_profile", token);
}

export function validateUsageSummary(summary: UsageSummary): void {
  if (!summary || typeof summary !== "object") {
    throw new Error("Invalid usage summary: empty response");
  }
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Resolve included / bonus / total credit pool from plan + breakdown.
 * Prefer breakdown.total; otherwise included + bonus; else plan.limit.
 */
export function resolveUsagePlanPool(
  plan?: UsagePlan | null
): UsagePlanPool {
  const included = num(
    plan?.breakdown?.included ?? plan?.limit,
    0
  );
  const bonus = num(plan?.breakdown?.bonus, 0);
  const totalFromBreakdown = plan?.breakdown?.total;
  const total =
    typeof totalFromBreakdown === "number" && Number.isFinite(totalFromBreakdown)
      ? totalFromBreakdown
      : included + bonus > 0
        ? included + bonus
        : num(plan?.limit, 0);
  const used = num(plan?.used, 0);
  // IMPORTANT: plan.remaining / totalPercentUsed are included-pool semantics from Cursor.
  // Combined pool (included + bonus) must always be derived from total - used.
  const remaining = total > 0 ? Math.max(0, total - used) : Math.max(0, num(plan?.remaining, 0));
  const percentUsed =
    total > 0
      ? Math.min(100, (used / total) * 100)
      : Math.min(100, num(plan?.totalPercentUsed, 0));

  return { included, bonus, total, used, remaining, percentUsed };
}

/**
 * True when the API reports 100% (or plan.used >= plan.limit) but the
 * combined pool still has remaining credits (typically bonus left).
 */
export function detectStaleLimitBanner(
  plan: UsagePlan | null | undefined,
  pool: UsagePlanPool
): boolean {
  if (pool.remaining <= 0) return false;

  const auto = plan?.autoPercentUsed;
  const api = plan?.apiPercentUsed;
  const totalPct = plan?.totalPercentUsed;
  const apiSaysHundred =
    (typeof auto === "number" && auto >= 100) ||
    (typeof api === "number" && api >= 100) ||
    (typeof totalPct === "number" && totalPct >= 100);

  const includedExhaustedButBonusLeft =
    pool.included > 0 &&
    pool.used >= pool.included &&
    pool.bonus > 0 &&
    pool.remaining > 0;

  const limitLooksFull =
    num(plan?.limit) > 0 && num(plan?.used) >= num(plan?.limit) && pool.remaining > 0;

  return apiSaysHundred || includedExhaustedButBonusLeft || limitLooksFull;
}

/** Format on-demand values: treat large integers as cents → USD. */
export function formatOnDemandAmount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  // Heuristic: values that look like cents (>= 100 and integer-ish) → dollars
  if (Math.abs(v) >= 100 && Number.isInteger(v)) {
    return `$${(v / 100).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (Math.abs(v) > 0 && Math.abs(v) < 100 && !Number.isInteger(v)) {
    return `$${v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return v.toLocaleString();
}

export function buildBudgetMetrics(
  summary: UsageSummary,
  stripe?: StripeProfile | null,
  email?: string
): BudgetMetrics {
  validateUsageSummary(summary);
  const iu = summary.individualUsage;
  const plan = iu?.plan;
  const pool = resolveUsagePlanPool(plan);

  const includedUsed = Math.min(pool.used, pool.included);
  const includedRemaining = Math.max(0, pool.included - includedUsed);
  const bonusUsed = Math.max(0, pool.used - pool.included);
  const bonusRemaining = Math.max(0, pool.bonus - bonusUsed);
  const bonusLabel =
    pool.bonus > 0 ? "Bonus / Agent credits" : "Bonus";

  const autoPercentUsed =
    typeof plan?.autoPercentUsed === "number" &&
    Number.isFinite(plan.autoPercentUsed)
      ? plan.autoPercentUsed
      : null;
  const apiPercentUsed =
    typeof plan?.apiPercentUsed === "number" &&
    Number.isFinite(plan.apiPercentUsed)
      ? plan.apiPercentUsed
      : null;

  const onDemand = iu?.onDemand;
  const onDemandEnabled = Boolean(onDemand?.enabled);
  const onDemandUsed = num(onDemand?.used);
  const onDemandLimit =
    typeof onDemand?.limit === "number" ? onDemand.limit : null;
  const onDemandRemaining =
    typeof onDemand?.remaining === "number" ? onDemand.remaining : null;

  const teamOd = summary.teamUsage?.onDemand;
  const teamOnDemandEnabled = Boolean(teamOd?.enabled);
  const teamOnDemandUsed = num(teamOd?.used);
  const teamOnDemandLimit =
    typeof teamOd?.limit === "number" ? teamOd.limit : null;
  const teamOnDemandRemaining =
    typeof teamOd?.remaining === "number" ? teamOd.remaining : null;

  const cycleStart = summary.billingCycleStart;
  const cycleEnd = summary.billingCycleEnd;
  let daysUntilReset: number | null = null;
  if (cycleEnd) {
    const end = new Date(cycleEnd);
    if (!Number.isNaN(end.getTime())) {
      daysUntilReset = Math.max(0, daysBetween(new Date(), end));
    }
  }

  const staleLimitBanner = detectStaleLimitBanner(plan, pool);
  const atLimit = pool.remaining <= 0 && pool.total > 0;
  const nearLimit = !atLimit && pool.percentUsed >= 80;

  let staleLimitMessage: string | undefined;
  if (staleLimitBanner) {
    staleLimitMessage =
      `API reports 100% used, but ${bonusRemaining.toLocaleString()} bonus/agent credits remain ` +
      `(pool ${pool.remaining.toLocaleString()} left). Included quota may look exhausted while bonus is still available.`;
  }

  let warning: string | undefined;
  if (atLimit) {
    warning = "Quota is exhausted for this billing cycle.";
  } else if (staleLimitBanner) {
    warning = staleLimitMessage;
  } else if (nearLimit) {
    warning = "Approaching quota limit (≥ 80%).";
  }

  const membership =
    summary.membershipType ||
    stripe?.membershipType ||
    stripe?.individualMembershipType ||
    "unknown";

  const isTeamMember = Boolean(stripe?.isTeamMember);
  const teamId =
    typeof stripe?.teamId === "string" || stripe?.teamId === null
      ? stripe.teamId
      : undefined;

  return {
    email,
    membership,
    isTeamMember,
    teamId,
    limitType: summary.limitType,
    isUnlimited: Boolean(summary.isUnlimited),

    poolUsed: pool.used,
    poolTotal: pool.total,
    poolRemaining: pool.remaining,
    poolPercent: pool.percentUsed,

    included: pool.included,
    includedUsed,
    includedRemaining,
    includedPoolUsed: includedUsed,
    includedPoolRemaining: includedRemaining,

    bonus: pool.bonus,
    bonusUsed,
    bonusRemaining,
    bonusLabel,

    includedLimit: pool.included,
    includedPct:
      pool.included > 0 ? (includedUsed / pool.included) * 100 : pool.percentUsed,

    autoPercentUsed,
    apiPercentUsed,
    autoPct: autoPercentUsed,
    apiPct: apiPercentUsed,

    onDemandEnabled,
    onDemandUsed,
    onDemandLimit,
    onDemandRemaining,
    onDemandUsedDisplay: formatOnDemandAmount(onDemandUsed),
    onDemandLimitDisplay:
      onDemandLimit == null ? "∞" : formatOnDemandAmount(onDemandLimit),
    onDemandRemainingDisplay: formatOnDemandAmount(onDemandRemaining),

    teamOnDemandEnabled,
    teamOnDemandUsed,
    teamOnDemandLimit,
    teamOnDemandRemaining,
    teamOnDemandUsedDisplay: formatOnDemandAmount(teamOnDemandUsed),
    teamOnDemandLimitDisplay:
      teamOnDemandLimit == null ? "∞" : formatOnDemandAmount(teamOnDemandLimit),

    cycleStart,
    cycleEnd,
    daysUntilReset,

    staleLimitBanner,
    staleLimitMessage,
    atLimit,
    nearLimit,
    warning,

    autoModelSelectedDisplayMessage: summary.autoModelSelectedDisplayMessage,
    namedModelSelectedDisplayMessage:
      summary.namedModelSelectedDisplayMessage ??
      summary.namedModelSelectedDisplayName,
  };
}

export interface UsageSnapshot {
  fetchedAt: string;
  email?: string;
  productFolder?: string;
  summary: UsageSummary;
  stripe: StripeProfile | null;
  metrics: BudgetMetrics;
}

export async function fetchSnapshot(
  token: string,
  opts?: { email?: string; productFolder?: string }
): Promise<UsageSnapshot> {
  const [summary, stripe] = await Promise.all([
    fetchUsageSummary(token),
    fetchStripeProfile(token).catch(() => null),
  ]);
  const metrics = buildBudgetMetrics(summary, stripe, opts?.email);
  return {
    fetchedAt: new Date().toISOString(),
    email: opts?.email ?? metrics.email,
    productFolder: opts?.productFolder,
    summary,
    stripe,
    metrics,
  };
}
