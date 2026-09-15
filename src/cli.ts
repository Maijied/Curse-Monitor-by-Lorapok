#!/usr/bin/env node
import { Command } from "commander";
import { registerStatus } from "./commands/status.js";
import { registerWatch } from "./commands/watch.js";
import { registerJson } from "./commands/json.js";
import { registerWhoami } from "./commands/whoami.js";
import { registerReport } from "./commands/report.js";
import { MODEL_SPEND_CONSTRAINT } from "./usageAnalytics.js";
import { VERSION } from "./version.js";

const program = new Command();

program
  .name("curse-monitor")
  .description(
    "Curse Monitor — live Cursor usage for CLI + Grok Bot.\n" +
      "  Quotas, bonus credits, Auto/API %, budget, billing cycle, and reports.\n" +
      "  Companion to Cursor Curse Monitor by Lorapok Labs.\n" +
      "  " +
      MODEL_SPEND_CONSTRAINT
  )
  .version(VERSION)
  .option("-t, --token <token>", "Cursor access token (or set CURSOR_TOKEN)")
  .configureHelp({
    sortSubcommands: true,
    showGlobalOptions: true,
  })
  .addHelpText(
    "after",
    `
Examples:
  $ curse-monitor              Pretty status board (default)
  $ curse-monitor status
  $ curse-monitor report --group-by model --range cycle
  $ curse-monitor watch --interval 30
  $ curse-monitor json --report -g autoApi -r 7d
  $ curse-monitor whoami
  $ CURSOR_TOKEN=… curse-monitor status

Reports:
  curse-monitor report                 Human board + grouped breakdown
  group-by:  model | autoApi | surface
  range:     7d | 30d | cycle | mtd
  ${MODEL_SPEND_CONSTRAINT}

Auth:
  Auto-reads cursorAuth/accessToken from Cursor state.vscdb.
  Override with --token or CURSOR_TOKEN. The token is never printed.
`
  );

registerStatus(program);
registerWatch(program);
registerJson(program);
registerWhoami(program);
registerReport(program);

// Default action → status
program.action(async (opts) => {
  const { runStatus } = await import("./commands/status.js");
  await runStatus(opts);
});

program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n  Error: ${msg}\n`);
  process.exit(1);
});
