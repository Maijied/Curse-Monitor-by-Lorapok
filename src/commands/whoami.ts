import type { Command } from "commander";
import { whoamiAll, type CursorAccount } from "../auth.js";
import type { GlobalOpts } from "./status.js";

function printAccount(account: CursorAccount, marker: string): void {
  console.log(`  ${marker} ${account.email ?? "(email not cached)"}`);
  console.log(`      Product:    ${account.productFolder}`);
  if (account.membershipType) console.log(`      Membership: ${account.membershipType}`);
  if (account.signUpType) console.log(`      Sign-up:    ${account.signUpType}`);
  console.log(`      DB path:    ${account.dbPath}`);
  console.log(`      Token via:  ${account.tokenSource}`);
}

export async function runWhoami(opts: GlobalOpts): Promise<void> {
  const { accounts, activeIndex } = whoamiAll(opts.token, opts.account);
  console.log();
  const label =
    accounts.length > 1
      ? `  Curse Monitor — identity (${accounts.length} accounts)`
      : "  Curse Monitor — identity";
  console.log(label);
  console.log("  ─────────────────────────");
  accounts.forEach((account, i) => {
    if (i > 0) console.log();
    printAccount(account, i === activeIndex ? "▶ active:" : "        :");
  });
  if (accounts.length > 1) {
    console.log();
    console.log("  Select one with --account <email|product> (e.g. --account dCursor).");
  }
  console.log();
}

export function registerWhoami(program: Command): void {
  program
    .command("whoami")
    .description("Show the signed-in Cursor account(s) and which one will be used")
    .action(async (_args, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runWhoami(opts);
    });
}
