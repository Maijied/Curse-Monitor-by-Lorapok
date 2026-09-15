import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  discoverAccounts,
  listAccounts,
  matchAccount,
  pickDefaultAccount,
  PREFERRED_DEFAULT_EMAIL,
  resolveAuthWithOptions,
  whoamiWithOptions,
} from "../dist/auth.js";
import {
  loadAccountPreference,
  saveAccountPreference,
} from "../dist/userConfig.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");

const TOKEN_LORAPOK = "fixture-token-lorapok-DO-NOT-PRINT";
const TOKEN_SHOHOZ = "fixture-token-shohoz-DO-NOT-PRINT";
const SECRET_TOKENS = [TOKEN_LORAPOK, TOKEN_SHOHOZ];

function assertNoSecrets(text) {
  const blob = typeof text === "string" ? text : JSON.stringify(text);
  for (const secret of SECRET_TOKENS) {
    assert.equal(blob.includes(secret), false, "must never leak fixture tokens");
  }
  assert.equal(/accessToken/i.test(blob) && blob.includes("fixture-token"), false);
}

function writeStateDb(discoverRoot, productFolder, { email, token, quotedEmail = false }) {
  const dbPath = join(discoverRoot, productFolder, "User", "globalStorage", "state.vscdb");
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value BLOB)");
  const ins = db.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)");
  ins.run("cursorAuth/accessToken", token);
  ins.run("cursorAuth/cachedEmail", quotedEmail ? JSON.stringify(email) : email);
  db.close();
  return dbPath;
}

function makeFixtureHome() {
  const dir = mkdtempSync(join(tmpdir(), "curse-monitor-accounts-"));
  writeStateDb(dir, "Cursor", {
    email: "licences@shohoz.com",
    token: TOKEN_SHOHOZ,
  });
  writeStateDb(dir, "dCursor", {
    email: PREFERRED_DEFAULT_EMAIL,
    token: TOKEN_LORAPOK,
    quotedEmail: true,
  });
  const configPath = join(dir, "curse-monitor-config.json");
  return { dir, configPath };
}

const fixture = makeFixtureHome();

const discovered = discoverAccounts({ roots: [fixture.dir] });
assert.equal(discovered.length, 2);
assert.equal(discovered[0].productFolder, "Cursor");
assert.equal(discovered[0].email, "licences@shohoz.com");
assert.equal(discovered[1].productFolder, "dCursor");
assert.equal(discovered[1].email, PREFERRED_DEFAULT_EMAIL);
assert.equal("accessToken" in discovered[0], false);
assert.equal("accessToken" in discovered[1], false);
assertNoSecrets(discovered);

const picked = pickDefaultAccount(discovered);
assert.equal(picked.email, PREFERRED_DEFAULT_EMAIL);
assert.equal(picked.productFolder, "dCursor");

assert.equal(matchAccount(discovered, "1").email, "licences@shohoz.com");
assert.equal(matchAccount(discovered, "2").email, PREFERRED_DEFAULT_EMAIL);
assert.equal(matchAccount(discovered, PREFERRED_DEFAULT_EMAIL).productFolder, "dCursor");
assert.equal(matchAccount(discovered, "dCursor").email, PREFERRED_DEFAULT_EMAIL);
assert.equal(matchAccount(discovered, "shohoz").productFolder, "Cursor");
assert.throws(() => matchAccount(discovered, "9"), /index/);
assert.throws(() => matchAccount(discovered, "nobody@example.com"), /matched/);

const listedDefault = listAccounts({
  discoverRoots: [fixture.dir],
  envToken: "",
  configPath: join(fixture.dir, "missing-config.json"),
});
assert.equal(listedDefault.accounts.length, 2);
assert.equal(listedDefault.accounts[listedDefault.activeIndex].email, PREFERRED_DEFAULT_EMAIL);
assert.equal(listedDefault.selection, "preferred-default");
assertNoSecrets(listedDefault);

const savedPath = saveAccountPreference(
  {
    activeEmail: "licences@shohoz.com",
    activeProductFolder: "Cursor",
  },
  fixture.configPath
);
const savedRaw = readFileSync(savedPath, "utf8");
assert.match(savedRaw, /licences@shohoz\.com/);
assert.match(savedRaw, /Cursor/);
assertNoSecrets(savedRaw);
assert.equal(savedRaw.includes("token"), false);

const listedConfig = listAccounts({
  discoverRoots: [fixture.dir],
  envToken: "",
  configPath: fixture.configPath,
});
assert.equal(listedConfig.accounts[listedConfig.activeIndex].email, "licences@shohoz.com");
assert.equal(listedConfig.selection, "config");

const listedFlag = listAccounts({
  discoverRoots: [fixture.dir],
  envToken: "",
  accountMatch: "dCursor",
  configPath: fixture.configPath,
});
assert.equal(listedFlag.accounts[listedFlag.activeIndex].productFolder, "dCursor");
assert.equal(listedFlag.selection, "account-flag");

const authPreferred = resolveAuthWithOptions({
  discoverRoots: [fixture.dir],
  envToken: "",
  configPath: join(fixture.dir, "nope.json"),
});
assert.equal(authPreferred.email, PREFERRED_DEFAULT_EMAIL);
assert.equal(authPreferred.accessToken, TOKEN_LORAPOK);

const authConfig = resolveAuthWithOptions({
  discoverRoots: [fixture.dir],
  envToken: "",
  configPath: fixture.configPath,
});
assert.equal(authConfig.email, "licences@shohoz.com");
assert.equal(authConfig.accessToken, TOKEN_SHOHOZ);

const authEnv = resolveAuthWithOptions({
  discoverRoots: [fixture.dir],
  envToken: TOKEN_SHOHOZ,
  configPath: join(fixture.dir, "nope.json"),
});
assert.equal(authEnv.productFolder, "(CURSOR_TOKEN)");
assert.equal(authEnv.accessToken, TOKEN_SHOHOZ);

const authFlag = resolveAuthWithOptions({
  explicitToken: TOKEN_LORAPOK,
  envToken: TOKEN_SHOHOZ,
  discoverRoots: [fixture.dir],
});
assert.equal(authFlag.productFolder, "(flag)");
assert.equal(authFlag.accessToken, TOKEN_LORAPOK);

const identity = whoamiWithOptions({
  discoverRoots: [fixture.dir],
  envToken: "",
  configPath: join(fixture.dir, "nope.json"),
});
assert.equal(identity.email, PREFERRED_DEFAULT_EMAIL);
assert.equal("accessToken" in identity, false);
assertNoSecrets(identity);

const pref = loadAccountPreference(fixture.configPath);
assert.deepEqual(pref, {
  activeEmail: "licences@shohoz.com",
  activeProductFolder: "Cursor",
});

writeFileSync(
  join(fixture.dir, "dirty-config.json"),
  JSON.stringify({
    activeEmail: PREFERRED_DEFAULT_EMAIL,
    activeProductFolder: "dCursor",
    accessToken: TOKEN_LORAPOK,
    token: TOKEN_SHOHOZ,
  }),
  "utf8"
);
const cleaned = loadAccountPreference(join(fixture.dir, "dirty-config.json"));
assert.deepEqual(cleaned, {
  activeEmail: PREFERRED_DEFAULT_EMAIL,
  activeProductFolder: "dCursor",
});
assert.equal("accessToken" in cleaned, false);
assert.equal("token" in cleaned, false);

function runCli(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  if (!Object.prototype.hasOwnProperty.call(extraEnv, "CURSOR_TOKEN")) {
    delete env.CURSOR_TOKEN;
  }
  env.CURSE_MONITOR_DISCOVER_ROOT = fixture.dir;
  env.CURSE_MONITOR_CONFIG = extraEnv.CURSE_MONITOR_CONFIG ?? join(fixture.dir, "cli-config.json");
  return execFileSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    env,
  });
}

const accountsOut = runCli(["accounts"]);
assert.match(accountsOut, /lorapokdev@gmail\.com/);
assert.match(accountsOut, /licences@shohoz\.com/);
assert.match(accountsOut, /dCursor/);
assert.match(accountsOut, /▶/);
assertNoSecrets(accountsOut);

const accountsJson = runCli(["accounts", "--json"]);
const parsed = JSON.parse(accountsJson);
assert.equal(parsed.accounts.length, 2);
assert.equal(parsed.accounts.some((a) => a.active && a.email === PREFERRED_DEFAULT_EMAIL), true);
assert.equal(
  parsed.accounts.every((a) => !("accessToken" in a) && !("token" in a)),
  true
);
assertNoSecrets(accountsJson);

const useOut = runCli(["use", "1"]);
assert.match(useOut, /licences@shohoz\.com/);
assert.match(useOut, /Saved pointer/);
assertNoSecrets(useOut);
const cliConfig = readFileSync(join(fixture.dir, "cli-config.json"), "utf8");
assert.match(cliConfig, /licences@shohoz\.com/);
assert.match(cliConfig, /"activeProductFolder": "Cursor"/);
assertNoSecrets(cliConfig);

const whoamiAfterUse = runCli(["whoami"]);
assert.match(whoamiAfterUse, /licences@shohoz\.com/);
assert.doesNotMatch(whoamiAfterUse, /▶/);
assertNoSecrets(whoamiAfterUse);

const listAfterUse = runCli(["whoami", "--list"]);
assert.match(listAfterUse, /licences@shohoz\.com/);
assert.match(listAfterUse, /lorapokdev@gmail\.com/);
assertNoSecrets(listAfterUse);

const useProduct = runCli(["use", "dCursor"]);
assert.match(useProduct, /lorapokdev@gmail\.com/);
assertNoSecrets(useProduct);

const whoamiPreferred = runCli(["whoami"]);
assert.match(whoamiPreferred, /lorapokdev@gmail\.com/);
assert.match(whoamiPreferred, /dCursor/);
assertNoSecrets(whoamiPreferred);

const whoamiOverride = runCli(["whoami", "--account", "Cursor"]);
assert.match(whoamiOverride, /licences@shohoz\.com/);
assertNoSecrets(whoamiOverride);

const envOverride = runCli(["whoami"], { CURSOR_TOKEN: TOKEN_SHOHOZ });
assert.match(envOverride, /CURSOR_TOKEN/);
assertNoSecrets(envOverride);

const flagOverride = runCli(["whoami", "--token", TOKEN_LORAPOK]);
assert.match(flagOverride, /\(flag\)/);
assertNoSecrets(flagOverride);

console.log("accounts.test.mjs: OK");
