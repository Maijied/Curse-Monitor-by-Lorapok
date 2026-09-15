import type { Command } from "commander";
import { whoami } from "../auth.js";
import type { GlobalOpts } from "./status.js";
import { printAccount, runAccounts } from "./accounts.js";

export async function runWhoami(opts: GlobalOpts & { list?: boolean }): Promise<void> {
  if (opts.list) {
    await runAccounts(opts);
    return;
  }

  const info = whoami(opts.token, opts.account);
  console.log();
  console.log("  Curse Monitor — identity");
  console.log("  ─────────────────────────");
  printAccount(info, "");
  console.log();
  console.log("  List all: curse-monitor accounts   (or whoami --list)");
  console.log("  Switch:   curse-monitor use <email|index|product>");
  console.log();
}

export function registerWhoami(program: Command): void {
  program
    .command("whoami")
    .description("Show which Cursor account / token source will be used")
    .option("-l, --list", "List all discovered accounts (same as `accounts`)")
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runWhoami({ ...opts, list: Boolean(cmdOpts.list) });
    });
}
