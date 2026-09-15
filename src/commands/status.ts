import type { Command } from "commander";
import { resolveAuth } from "../auth.js";
import { fetchSnapshot } from "../api.js";
import { formatStatusBoard } from "../format.js";
import { recordSnapshotHistory } from "../report.js";

export interface GlobalOpts {
  token?: string;
  account?: string;
}

export async function loadSnapshot(opts: GlobalOpts) {
  const auth = resolveAuth(opts.token, opts.account);
  const snapshot = await fetchSnapshot(auth.accessToken, {
    email: auth.email,
    productFolder: auth.productFolder,
    dbPath: auth.dbPath,
  });
  recordSnapshotHistory(snapshot);
  return { auth, snapshot };
}

export async function runStatus(opts: GlobalOpts): Promise<void> {
  const { snapshot } = await loadSnapshot(opts);
  console.log();
  console.log(formatStatusBoard(snapshot));
  console.log();
}

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Show a pretty Cursor usage status board")
    .action(async (_args, cmd) => {
      const opts = cmd.optsWithGlobals() as GlobalOpts;
      await runStatus(opts);
    });
}
