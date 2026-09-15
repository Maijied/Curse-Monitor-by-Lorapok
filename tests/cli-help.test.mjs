import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");

const version = execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" });
assert.match(version, /0\.3\.0/);

const help = execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
assert.match(help, /report/);
assert.match(help, /does not expose per-model dollar spend/i);
assert.match(help, /group-by/);
assert.match(help, /never printed/i);
assert.match(help, /accounts/);
assert.match(help, /use <email\|index\|product>/);
assert.match(help, /lorapokdev@gmail.com/);

const accountsHelp = execFileSync(process.execPath, [cli, "accounts", "--help"], {
  encoding: "utf8",
});
assert.match(accountsHelp, /--json/);
assert.match(accountsHelp, /never includes tokens/i);

const useHelp = execFileSync(process.execPath, [cli, "use", "--help"], { encoding: "utf8" });
assert.match(useHelp, /email/i);
assert.match(useHelp, /config\.json/);
assert.match(useHelp, /never written/i);

const reportHelp = execFileSync(process.execPath, [cli, "report", "--help"], { encoding: "utf8" });
assert.match(reportHelp, /autoApi/);
assert.match(reportHelp, /surface/);
assert.match(reportHelp, /model/);
assert.match(reportHelp, /7d/);
assert.match(reportHelp, /cycle/);
assert.match(reportHelp, /per-model dollar spend/i);

const jsonHelp = execFileSync(process.execPath, [cli, "json", "--help"], { encoding: "utf8" });
assert.match(jsonHelp, /--report/);
assert.match(jsonHelp, /--group-by/);
assert.match(jsonHelp, /--range/);

console.log("cli-help.test.mjs: OK");
