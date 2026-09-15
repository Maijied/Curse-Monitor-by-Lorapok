import type { Command } from "commander";
import { formatReportBoard } from "../format.js";
import { MODEL_SPEND_CONSTRAINT, buildUsageReport } from "../report.js";
import type { GlobalOpts } from "./status.js";
import { loadSnapshot } from "./status.js";

export interface ReportCliOpts extends GlobalOpts {
  groupBy?: string;
  range?: string;
}

export async function runReport(opts: ReportCliOpts): Promise<void> {
  const { snapshot } = await loadSnapshot(opts);
  const report = buildUsageReport(snapshot, {
    groupBy: opts.groupBy,
    range: opts.range,
  });
  console.log();
  console.log(formatReportBoard(snapshot, report));
  console.log();
}

export function registerReport(program: Command): void {
  program
    .command("report")
    .description(
      "Human usage report board with pool metrics plus grouped breakdowns"
    )
    .option(
      "-g, --group-by <group>",
      "Group by model | autoApi | surface (default: autoApi)"
    )
    .option(
      "-r, --range <range>",
      "Window 7d | 30d | cycle | mtd (default: 7d)"
    )
    .addHelpText(
      "after",
      `
Grouping:
  autoApi   Auto % vs API % meters (from Cursor usage-summary + local poll history)
  surface   Tab vs Composer accepted lines (from local Cursor daily stats)
  model     Locally active models per surface (Composer, Inline, Agent, …)

Ranges:
  7d        Last 7 days
  30d       Last 30 days
  cycle     Current billing cycle (from usage-summary.billingCycleStart)
  mtd       Month to date (local calendar)

Constraint:
  ${MODEL_SPEND_CONSTRAINT}

Examples:
  $ curse-monitor report
  $ curse-monitor report --group-by model --range cycle
  $ curse-monitor report -g surface -r 30d
  $ curse-monitor json --report --group-by autoApi --range 7d
`
    )
    .action(async (cmdOpts, cmd) => {
      const globals = cmd.optsWithGlobals() as GlobalOpts;
      await runReport({
        ...globals,
        groupBy: cmdOpts.groupBy,
        range: cmdOpts.range,
      });
    });
}
