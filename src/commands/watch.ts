import type { Command } from "commander";
import { formatStatusBoard } from "../format.js";
import type { GlobalOpts } from "./status.js";
import { loadSnapshot } from "./status.js";

function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

export async function runWatch(opts: GlobalOpts & { interval?: string }): Promise<void> {
  const seconds = Math.max(5, Number(opts.interval ?? 30) || 30);
  // Resolve auth once; each tick still records history via loadSnapshot.
  const tick = async () => {
    try {
      const { snapshot } = await loadSnapshot(opts);
      clearScreen();
      console.log(formatStatusBoard(snapshot));
      console.log(`\n  Refreshing every ${seconds}s · Ctrl+C to exit · ${new Date().toLocaleTimeString()}\n`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n  Watch error: ${msg}\n`);
    }
  };

  await tick();
  setInterval(tick, seconds * 1000);
}

export function registerWatch(program: Command): void {
  program
    .command("watch")
    .description("Live-refresh the status board")
    .option("-i, --interval <seconds>", "Poll interval in seconds", "30")
    .action(async (cmdOpts, cmd) => {
      const globals = cmd.optsWithGlobals() as GlobalOpts;
      await runWatch({ ...globals, interval: cmdOpts.interval });
    });
}
