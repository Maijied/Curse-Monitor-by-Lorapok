import type { Command } from "commander";
import { resolveAuth } from "../auth.js";
import { fetchSnapshot } from "../api.js";
import { formatStatusBoard } from "../format.js";

export interface GlobalOpts {
  token?: string;
}

export async function runStatus(opts: GlobalOpts): Promise<void> {
  const auth = resolveAuth(opts.token);
  const snapshot = await fetchSnapshot(auth.accessToken, {
    email: auth.email,
    productFolder: auth.productFolder,
  });
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
