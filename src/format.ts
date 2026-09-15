import chalk from "chalk";
import type { BudgetMetrics, UsageSnapshot } from "./api.js";

export const ACCENT = "#6C5CE7";

const purple = chalk.hex(ACCENT);
const muted = chalk.gray;
const ok = chalk.green;
const warn = chalk.yellow;
const bad = chalk.red;
const bold = chalk.bold;

export function percentBar(pct: number, width = 24): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  const color = clamped >= 100 ? bad : clamped >= 80 ? warn : purple;
  return color("█".repeat(filled)) + muted("░".repeat(empty));
}

export function formatPct(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(pct)) return "—";
  return `${pct.toFixed(1)}%`;
}

export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function cycleLabel(metrics: BudgetMetrics): string {
  const start = metrics.cycleStart ? shortDate(metrics.cycleStart) : "?";
  const end = metrics.cycleEnd ? shortDate(metrics.cycleEnd) : "?";
  const days =
    metrics.daysUntilReset == null
      ? ""
      : metrics.daysUntilReset === 0
        ? " (resets today)"
        : ` (${metrics.daysUntilReset}d until reset)`;
  return `${start} → ${end}${days}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function box(lines: string[], title: string): string {
  const width = Math.max(title.length + 2, ...lines.map(visibleLen)) + 2;
  const top = purple("╭") + purple("─".repeat(width)) + purple("╮");
  const titleLine =
    purple("│") +
    bold(purple(` ${title}`.padEnd(width))) +
    purple("│");
  const sep = purple("├") + purple("─".repeat(width)) + purple("┤");
  const body = lines.map((l) => {
    const pad = " " + l + " ".repeat(Math.max(0, width - 1 - visibleLen(l)));
    return purple("│") + pad + purple("│");
  });
  const bottom = purple("╰") + purple("─".repeat(width)) + purple("╯");
  return [top, titleLine, sep, ...body, bottom].join("\n");
}

function visibleLen(s: string): number {
  // Strip ANSI escape sequences for width calc
  return s.replace(/\u001b\[[0-9;]*m/g, "").length;
}

function barLine(
  label: string,
  pct: number,
  detail: string,
  labelWidth = 10
): string {
  const lab = muted(label.padEnd(labelWidth));
  return `${lab} ${percentBar(pct)}  ${detail}`;
}

export function formatStatusBoard(snapshot: UsageSnapshot): string {
  const m = snapshot.metrics;
  const lines: string[] = [];

  lines.push(
    `${muted("Account")}  ${m.email ? bold(m.email) : muted("(unknown)")}`
  );
  const planBits = [purple(m.membership)];
  if (m.limitType) planBits.push(muted(`(${m.limitType})`));
  if (m.isUnlimited) planBits.push(ok("unlimited"));
  lines.push(`${muted("Plan")}     ${planBits.join(" ")}`);
  if (snapshot.productFolder) {
    lines.push(`${muted("Source")}   ${snapshot.productFolder}`);
  }
  if (m.isTeamMember || m.teamId) {
    const team = m.teamId ? String(m.teamId) : "yes";
    lines.push(`${muted("Team")}     ${team}`);
  }
  lines.push("");

  // Included pool bar
  const includedPct =
    m.included > 0 ? (m.includedPoolUsed / m.included) * 100 : 0;
  lines.push(
    barLine(
      "Included",
      includedPct,
      `${formatNumber(m.includedPoolUsed)} / ${formatNumber(m.included)}  ${formatPct(includedPct)}`
    )
  );

  // Bonus / Agent credits when present
  if (m.bonus > 0) {
    const bonusPct =
      m.bonus > 0 ? (m.bonusUsed / m.bonus) * 100 : 0;
    lines.push(
      barLine(
        "Bonus",
        bonusPct,
        `${formatNumber(m.bonusUsed)} / ${formatNumber(m.bonus)}  ${formatPct(bonusPct)}  ${muted(m.bonusLabel)}`
      )
    );
    // Combined pool
    lines.push(
      barLine(
        "Pool",
        m.poolPercent,
        `${formatNumber(m.poolUsed)} / ${formatNumber(m.poolTotal)}  ${formatPct(m.poolPercent)}  ${muted(`(${formatNumber(m.poolRemaining)} left)`)}`
      )
    );
  }

  // Auto % and API % always when numbers present
  if (m.autoPercentUsed != null) {
    lines.push(
      barLine("Auto %", m.autoPercentUsed, formatPct(m.autoPercentUsed))
    );
  }
  if (m.apiPercentUsed != null) {
    lines.push(
      barLine("API %", m.apiPercentUsed, formatPct(m.apiPercentUsed))
    );
  }

  if (m.onDemandEnabled) {
    lines.push(
      `${muted("On-demand")} ${m.onDemandUsedDisplay} / ${m.onDemandLimitDisplay}` +
        (m.onDemandRemaining != null
          ? muted(`  (${m.onDemandRemainingDisplay} left)`)
          : "")
    );
  } else {
    lines.push(`${muted("On-demand")} ${muted("disabled")}`);
  }

  if (m.teamOnDemandEnabled) {
    lines.push(
      `${muted("Team OD")}   ${m.teamOnDemandUsedDisplay} / ${m.teamOnDemandLimitDisplay}`
    );
  }

  lines.push("");
  lines.push(`${muted("Cycle")}    ${cycleLabel(m)}`);

  lines.push("");
  if (m.atLimit) {
    lines.push(bad(`⚠ Exhausted — ${m.warning ?? "quota remaining is 0"}`));
  } else if (m.staleLimitBanner) {
    lines.push(
      warn(
        `⚠ Stale 100% banner — ${formatNumber(m.bonusRemaining)} bonus credits remain (pool ${formatNumber(m.poolRemaining)} left)`
      )
    );
  } else if (m.nearLimit) {
    lines.push(warn(`⚠ ${m.warning ?? "Approaching limit"}`));
  } else {
    lines.push(ok("✓ Quota healthy"));
  }

  return box(lines, "Curse Monitor");
}
