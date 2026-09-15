import type { Command } from "commander";
import type { AccountList, CursorAccount } from "../auth.js";
import { listAccounts } from "../auth.js";
import type { GlobalOpts } from "./status.js";

export function printAccount(account: CursorAccount, marker: string, index?: number): void {
  const label = index != null ? `${index}  ` : "";
  console.log(`  ${marker}${label}${account.email ?? "(email not cached)"}`);
  console.log(`      Product:    ${account.productFolder}`);
  if (account.membershipType) console.log(`      Membership: ${account.membershipType}`);
  if (account.signUpType) console.log(`      Sign-up:    ${account.signUpType}`);
  console.log(`      DB path:    ${account.dbPath}`);
  console.log(`      Token via:  ${account.tokenSource}`);
}

export function formatAccountsJson(listed: AccountList): Record<string, unknown> {
  return {
    selection: listed.selection,
    activeIndex: listed.activeIndex + 1,
    accounts: listed.accounts.map((account, i) => ({
      index: i + 1,
      email: account.email ?? null,
      productFolder: account.productFolder,
      dbPath: account.dbPath,
      membershipType: account.membershipType ?? null,
      signUpType: account.signUpType ?? null,
      tokenSource: account.tokenSource,
      active: i === listed.activeIndex,
    })),
  };
}

export function printAccountList(listed: AccountList, title = "Curse Monitor — accounts"): void {
  console.log();
  const count =
    listed.accounts.length > 1 ? ` (${listed.accounts.length} accounts)` : "";
  console.log(`  ${title}${count}`);
  console.log("  ─────────────────────────");
  listed.accounts.forEach((account, i) => {
    if (i > 0) console.log();
    const marker = i === listed.activeIndex ? "▶ " : "  ";
    printAccount(account, marker, i + 1);
  });
  if (listed.selection === "flag" || listed.selection === "env") {
    console.log();
    console.log("  Active source is a token override (--token / CURSOR_TOKEN).");
  } else if (listed.accounts.length > 1) {
    console.log();
    console.log("  Select one with: curse-monitor use <email|index|product>");
    console.log("  One-shot override: --account <email|index|product>");
  }
  console.log();
}

export async function runAccounts(opts: GlobalOpts & { json?: boolean }): Promise<void> {
  const listed = listAccounts({
    explicitToken: opts.token,
    accountMatch: opts.account,
  });
  if (opts.json) {
    // Never include access tokens in JSON output.
    console.log(JSON.stringify(formatAccountsJson(listed), null, 2));
    return;
  }
  printAccountList(listed);
}

export function registerAccounts(program: Command): void {
  program
    .command("accounts")
    .description("List discovered Cursor accounts and the active selection")
    .option("--json", "Machine-readable list (never includes tokens)")
    .action(async (cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runAccounts({ ...opts, json: Boolean(cmdOpts.json) });
    });
}
