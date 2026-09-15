import type { Command } from "commander";
import { discoverAccounts, matchAccount } from "../auth.js";
import { saveAccountPreference } from "../userConfig.js";
import type { GlobalOpts } from "./status.js";

export async function runUse(selector: string, _opts: GlobalOpts): Promise<void> {
  const accounts = discoverAccounts();
  if (accounts.length === 0) {
    throw new Error(
      "No Cursor auth found. Sign in to Cursor, or pass --token / set CURSOR_TOKEN."
    );
  }
  const chosen = matchAccount(accounts, selector);
  const path = saveAccountPreference({
    activeEmail: chosen.email,
    activeProductFolder: chosen.productFolder,
  });
  console.log();
  console.log(`  Using ${chosen.email ?? "(email not cached)"} (${chosen.productFolder})`);
  console.log(`  Saved pointer to ${path}`);
  console.log("  Token is re-read from that product's state.vscdb on each command.");
  console.log();
}

export function registerUse(program: Command): void {
  program
    .command("use")
    .description("Select the active Cursor account for later commands (email, index, or product)")
    .argument("<selector>", "Email, 1-based index from `accounts`, or product folder")
    .addHelpText(
      "after",
      `
Examples:
  $ curse-monitor accounts
  $ curse-monitor use 1
  $ curse-monitor use lorapokdev@gmail.com
  $ curse-monitor use dCursor

Persists email + product folder in ~/.config/curse-monitor/config.json
(or %APPDATA%\\curse-monitor\\config.json on Windows). Access tokens are
never written there — they are re-read from the chosen state.vscdb.

--token and CURSOR_TOKEN still override the saved selection.
`
    )
    .action(async (selector: string, _cmdOpts, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runUse(selector, opts);
    });
}
