#!/usr/bin/env node
import { Command } from "commander";
import { registerStatus } from "./commands/status.js";
import { registerWatch } from "./commands/watch.js";
import { registerJson } from "./commands/json.js";
import { registerWhoami } from "./commands/whoami.js";

const program = new Command();

program
  .name("curse-monitor")
  .description(
    "Curse Monitor — live Cursor usage for CLI + Grok Bot.\n" +
      "  Quotas, bonus credits, Auto/API %, budget, and billing cycle.\n" +
      "  Companion to Cursor Curse Monitor by Lorapok Labs."
  )
  .version("0.1.2")
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
  $ curse-monitor watch --interval 30
  $ curse-monitor json
  $ curse-monitor whoami
  $ CURSOR_TOKEN=… curse-monitor status

Auth:
  Auto-reads cursorAuth/accessToken from Cursor state.vscdb.
  Override with --token or CURSOR_TOKEN. The token is never printed.
`
  );

registerStatus(program);
registerWatch(program);
registerJson(program);
registerWhoami(program);

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
