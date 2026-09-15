import type { Command } from "commander";
import { whoami } from "../auth.js";
import type { GlobalOpts } from "./status.js";

export async function runWhoami(opts: GlobalOpts): Promise<void> {
  const info = whoami(opts.token);
  console.log();
  console.log("  Curse Monitor — identity");
  console.log("  ─────────────────────────");
  console.log(`  Email:     ${info.email ?? "(not cached)"}`);
  console.log(`  Product:   ${info.productFolder}`);
  console.log(`  DB path:   ${info.dbPath}`);
  console.log(`  Token via: ${info.tokenSource}`);
  console.log();
}

export function registerWhoami(program: Command): void {
  program
    .command("whoami")
    .description("Show which Cursor account / token source will be used")
    .action(async (_args, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runWhoami(opts);
    });
}
