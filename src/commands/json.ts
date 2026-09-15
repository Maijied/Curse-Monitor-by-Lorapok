import type { Command } from "commander";
import { buildUsageReport } from "../report.js";
import type { GlobalOpts } from "./status.js";
import { loadSnapshot } from "./status.js";

export interface JsonOpts extends GlobalOpts {
  report?: boolean;
  groupBy?: string;
  range?: string;
}

function publicAuth(auth: {
  email?: string;
  productFolder: string;
  dbPath: string;
}) {
  return {
    email: auth.email,
    productFolder: auth.productFolder,
    dbPath: auth.dbPath,
  };
}

export async function runJson(opts: JsonOpts): Promise<void> {
  const { auth, snapshot } = await loadSnapshot(opts);
  const includeReport = Boolean(opts.report);

  // Never include the access token in JSON output.
  const safe: Record<string, unknown> = {
    fetchedAt: snapshot.fetchedAt,
    email: snapshot.email,
    productFolder: snapshot.productFolder,
    metrics: snapshot.metrics,
    summary: snapshot.summary,
    stripe: snapshot.stripe,
    auth: publicAuth(auth),
  };

  if (includeReport) {
    const report = buildUsageReport(snapshot, {
      groupBy: opts.groupBy,
      range: opts.range,
    });
    safe.report = {
      range: report.range,
      groupBy: report.groupBy,
      constraint: report.constraint,
      historyPoints: report.historyPoints,
      kpi: report.analytics.kpi,
      analytics: report.analytics,
      local: {
        models: report.local.models,
        lastUsedModel: report.local.lastUsedModel,
        today: report.local.today,
        tabAccepted: report.local.tabAccepted,
        composerAccepted: report.local.composerAccepted,
        cycleSuggested: report.local.cycleSuggested,
        cycleAccepted: report.local.cycleAccepted,
        teamName: report.local.teamName,
        membershipType: report.local.membershipType,
        sessions: report.local.sessions.map((s) => ({
          name: s.name,
          mode: s.mode,
          recencyLabel: s.recencyLabel,
          linesAdded: s.linesAdded,
          linesRemoved: s.linesRemoved,
        })),
      },
      dailySeries: report.dailySeries,
    };
  }

  console.log(JSON.stringify(safe, null, 2));
}

export function registerJson(program: Command): void {
  program
    .command("json")
    .description("Print a machine-readable usage snapshot as JSON")
    .option("--report", "Include analytics report (group-by / range breakdowns)")
    .option(
      "-g, --group-by <group>",
      "Report grouping: model | autoApi | surface (implies --report)",
      "autoApi"
    )
    .option(
      "-r, --range <range>",
      "Report window: 7d | 30d | cycle | mtd (implies --report)",
      "7d"
    )
    .action(async (cmdOpts, cmd) => {
      const globals = cmd.optsWithGlobals() as GlobalOpts;
      const raw = process.argv.slice(2);
      const wantsReport =
        Boolean(cmdOpts.report) ||
        raw.includes("--report") ||
        raw.includes("--group-by") ||
        raw.includes("-g") ||
        raw.includes("--range") ||
        raw.includes("-r");
      await runJson({
        ...globals,
        report: wantsReport,
        groupBy: cmdOpts.groupBy,
        range: cmdOpts.range,
      });
    });
}
