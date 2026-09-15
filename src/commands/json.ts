import type { Command } from "commander";
import { resolveAuth } from "../auth.js";
import { fetchSnapshot } from "../api.js";
import type { GlobalOpts } from "./status.js";

export async function runJson(opts: GlobalOpts): Promise<void> {
  const auth = resolveAuth(opts.token);
  const snapshot = await fetchSnapshot(auth.accessToken, {
    email: auth.email,
    productFolder: auth.productFolder,
  });
  // Never include the access token in JSON output.
  // metrics already carries the richer BudgetMetrics object.
  const safe = {
    fetchedAt: snapshot.fetchedAt,
    email: snapshot.email,
    productFolder: snapshot.productFolder,
    metrics: snapshot.metrics,
    summary: snapshot.summary,
    stripe: snapshot.stripe,
    auth: {
      email: auth.email,
      productFolder: auth.productFolder,
      dbPath: auth.dbPath,
    },
  };
  console.log(JSON.stringify(safe, null, 2));
}

export function registerJson(program: Command): void {
  program
    .command("json")
    .description("Print a machine-readable usage snapshot as JSON")
    .action(async (_args, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runJson(opts);
    });
}
