#!/usr/bin/env node
import { Command } from "commander";
import { registerStatus } from "./commands/status.js";
import { registerWatch } from "./commands/watch.js";
import { registerJson } from "./commands/json.js";
import { registerWhoami } from "./commands/whoami.js";
import { registerReport } from "./commands/report.js";
import { registerAccounts } from "./commands/accounts.js";
import { registerUse } from "./commands/use.js";
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
  .option(
    "-a, --account <match>",
    "One-shot account selector: email, 1-based index, or product folder"
  )
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
  $ curse-monitor accounts
  $ curse-monitor use dCursor
  $ curse-monitor status --account lorapokdev@gmail.com
  $ CURSOR_TOKEN=… curse-monitor status

Reports:
  curse-monitor report                 Human board + grouped breakdown
  group-by:  model | autoApi | surface
  range:     7d | 30d | cycle | mtd
  ${MODEL_SPEND_CONSTRAINT}

Accounts:
  curse-monitor accounts               List discovered logins (never prints tokens)
  curse-monitor use <email|index|product>
  Selection is saved as an email + product pointer in
  ~/.config/curse-monitor/config.json — not the access token.

Auth:
  Priority: --token → CURSOR_TOKEN → --account → saved use selection →
  default (prefer dCursor when lorapokdev@gmail.com is signed in) →
  first discovered state.vscdb (Cursor, dCursor, Cursor Nightly, Windsurf, …).
  The token is never printed.
`
  );

registerAccounts(program);
registerStatus(program);
registerWatch(program);
registerJson(program);
registerWhoami(program);
registerReport(program);
registerUse(program);

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
