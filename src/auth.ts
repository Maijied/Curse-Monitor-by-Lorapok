import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { openDatabase, readItem, type SqliteDb } from "./sqlite.js";
import {
  loadAccountPreference,
  type AccountPreference,
} from "./userConfig.js";

export interface CursorAuth {
  accessToken: string;
  email?: string;
  /** Product folder that supplied the token (e.g. Cursor, dCursor). */
  productFolder: string;
  /** Absolute path to the state.vscdb used. */
  dbPath: string;
  /** Sign-up / login method cached by Cursor (e.g. Auth_0, Google). */
  signUpType?: string;
  /** Membership tier cached by Cursor (e.g. pro, free, enterprise). */
  membershipType?: string;
}

/** Public account identity. Never includes an access token. */
export interface CursorAccount {
  email?: string;
  productFolder: string;
  dbPath: string;
  signUpType?: string;
  membershipType?: string;
  tokenSource: "flag" | "env" | "state.vscdb";
}

export interface DiscoverOptions {
  /** App-data roots to scan. Defaults to OS config dirs (or CURSE_MONITOR_DISCOVER_ROOT). */
  roots?: string[];
}

export interface AccountList {
  accounts: CursorAccount[];
  /** 0-based index of the account that subsequent commands will use. */
  activeIndex: number;
  /** How the active account was chosen. */
  selection:
    | "flag"
    | "env"
    | "account-flag"
    | "config"
    | "preferred-default"
    | "first";
}

export interface ResolveAuthOptions {
  explicitToken?: string;
  /** One-shot `--account <email|index|product>` match (does not write config). */
  accountMatch?: string;
  discoverRoots?: string[];
  configPath?: string;
  envToken?: string;
}

interface ProductCandidate {
  folder: string;
  relativeDb: string[];
}

/**
 * Default when no `use` selection is saved: prefer the dCursor login whose
 * cached email is lorapokdev@gmail.com (over licences@shohoz.com), else the
 * first discovered product folder that has a token.
 */
export const PREFERRED_DEFAULT_EMAIL = "lorapokdev@gmail.com";
export const PREFERRED_DEFAULT_PRODUCT = "dCursor";

const PRODUCT_PRIORITY: ProductCandidate[] = [
  { folder: "Cursor", relativeDb: ["Cursor", "User", "globalStorage", "state.vscdb"] },
  { folder: "dCursor", relativeDb: ["dCursor", "User", "globalStorage", "state.vscdb"] },
  {
    folder: "Cursor Nightly",
    relativeDb: ["Cursor Nightly", "User", "globalStorage", "state.vscdb"],
  },
  { folder: "Windsurf", relativeDb: ["Windsurf", "User", "globalStorage", "state.vscdb"] },
  {
    folder: "Antigravity IDE",
    relativeDb: ["Antigravity IDE", "User", "globalStorage", "state.vscdb"],
  },
  { folder: "Antigravity", relativeDb: ["Antigravity", "User", "globalStorage", "state.vscdb"] },
  { folder: "AGY", relativeDb: ["AGY", "User", "globalStorage", "state.vscdb"] },
  { folder: "Void", relativeDb: ["Void", "User", "globalStorage", "state.vscdb"] },
  { folder: "Trae", relativeDb: ["Trae", "User", "globalStorage", "state.vscdb"] },
  { folder: "Kiro", relativeDb: ["Kiro", "User", "globalStorage", "state.vscdb"] },
  { folder: "Codex", relativeDb: ["Codex", "User", "globalStorage", "state.vscdb"] },
];

interface InternalAccount extends CursorAccount {
  accessToken: string;
}

function configRoots(): string[] {
  const override = process.env.CURSE_MONITOR_DISCOVER_ROOT?.trim();
  if (override) return [override];

  const home = homedir();
  const platform = process.platform;
  const roots: string[] = [];

  if (platform === "linux") {
    if (process.env.XDG_CONFIG_HOME) roots.push(process.env.XDG_CONFIG_HOME);
    roots.push(join(home, ".config"));
  } else if (platform === "darwin") {
    roots.push(join(home, "Library", "Application Support"));
  } else if (platform === "win32") {
    if (process.env.APPDATA) roots.push(process.env.APPDATA);
    roots.push(join(home, "AppData", "Roaming"));
  } else {
    roots.push(join(home, ".config"));
  }
  return roots;
}

function resolveRoots(options?: DiscoverOptions): string[] {
  if (options?.roots?.length) return options.roots;
  return configRoots();
}

/** Discover candidate state.vscdb paths in product priority order. */
export function discoverStateDbPaths(
  options?: DiscoverOptions
): { folder: string; path: string }[] {
  const found: { folder: string; path: string }[] = [];
  const seen = new Set<string>();
  for (const root of resolveRoots(options)) {
    for (const product of PRODUCT_PRIORITY) {
      const path = join(root, ...product.relativeDb);
      if (existsSync(path) && !seen.has(path)) {
        seen.add(path);
        found.push({ folder: product.folder, path });
      }
    }
  }
  return found;
}

/** Cursor stores some cached values JSON-encoded (quoted); unwrap when needed. */
function unwrap(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return String(JSON.parse(trimmed));
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

interface AuthFields {
  accessToken?: string;
  email?: string;
  signUpType?: string;
  membershipType?: string;
}

function readAuthFields(db: SqliteDb): AuthFields {
  const email =
    unwrap(readItem(db, "cursorAuth/cachedEmail")) ||
    unwrap(readItem(db, "cursorAuth/email")) ||
    undefined;
  const signUpType =
    unwrap(readItem(db, "cursorAuth/cachedSignUpType")) ||
    unwrap(readItem(db, "cursorAuth/signUpType")) ||
    undefined;
  const membershipType =
    unwrap(readItem(db, "cursorAuth/stripeMembershipType")) ||
    unwrap(readItem(db, "cursorAuth/membershipType")) ||
    undefined;
  return {
    accessToken: readItem(db, "cursorAuth/accessToken"),
    email,
    signUpType,
    membershipType,
  };
}

function toPublic(account: InternalAccount): CursorAccount {
  return {
    email: account.email,
    productFolder: account.productFolder,
    dbPath: account.dbPath,
    signUpType: account.signUpType,
    membershipType: account.membershipType,
    tokenSource: account.tokenSource,
  };
}

function readInternalAccount(folder: string, path: string): InternalAccount | undefined {
  const db = openDatabase(path);
  try {
    const fields = readAuthFields(db);
    if (!fields.accessToken) return undefined;
    return {
      accessToken: fields.accessToken,
      email: fields.email,
      productFolder: folder,
      dbPath: path,
      signUpType: fields.signUpType,
      membershipType: fields.membershipType,
      tokenSource: "state.vscdb",
    };
  } finally {
    db.close?.();
  }
}

/**
 * Discover every signed-in Cursor account across product folders.
 * Each product folder with a token is listed separately (local insights are per DB).
 * Never returns the access token.
 */
export function discoverAccounts(options?: DiscoverOptions): CursorAccount[] {
  return discoverInternalAccounts(options).map(toPublic);
}

function discoverInternalAccounts(options?: DiscoverOptions): InternalAccount[] {
  const accounts: InternalAccount[] = [];
  const seenPaths = new Set<string>();
  for (const { folder, path } of discoverStateDbPaths(options)) {
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);
    try {
      const account = readInternalAccount(folder, path);
      if (account) accounts.push(account);
    } catch {
      // Skip unreadable DBs; a later folder may still work.
    }
  }
  return accounts;
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function emailsEqual(a: string | undefined, b: string | undefined): boolean {
  const left = normalize(a);
  const right = normalize(b);
  return Boolean(left && right && left === right);
}

/**
 * Prefer dCursor + lorapokdev@gmail.com when present; otherwise first discovered.
 */
export function pickDefaultAccount<T extends { email?: string; productFolder: string }>(
  accounts: T[]
): T {
  if (accounts.length === 0) {
    throw new Error("No Cursor accounts to select.");
  }
  const preferredEmail = accounts.filter((a) =>
    emailsEqual(a.email, PREFERRED_DEFAULT_EMAIL)
  );
  if (preferredEmail.length) {
    const onPreferredProduct = preferredEmail.find(
      (a) => normalize(a.productFolder) === normalize(PREFERRED_DEFAULT_PRODUCT)
    );
    return onPreferredProduct ?? preferredEmail[0]!;
  }
  return accounts[0]!;
}

function availableLabel(accounts: { email?: string; productFolder: string }[]): string {
  return accounts.map((a) => `${a.email ?? "(no email)"} [${a.productFolder}]`).join(", ");
}

function noAuthError(): Error {
  return new Error(
    "No Cursor auth found. Sign in to Cursor, or pass --token / set CURSOR_TOKEN.\n" +
      "Looked for state.vscdb under Cursor, dCursor, Cursor Nightly, Windsurf, and related IDEs."
  );
}

/**
 * Match `use` / `--account` selector: 1-based index, email, or product folder.
 */
export function matchAccount<T extends { email?: string; productFolder: string }>(
  accounts: T[],
  selector: string
): T {
  const raw = selector.trim();
  if (!raw) {
    throw new Error("Account selector is empty. Pass an email, 1-based index, or product folder.");
  }

  if (/^\d+$/.test(raw)) {
    const index = Number(raw) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= accounts.length) {
      throw new Error(
        `No account at index ${raw}. Available (1–${accounts.length}): ${availableLabel(accounts)}`
      );
    }
    return accounts[index]!;
  }

  const needle = raw.toLowerCase();
  const exactEmail = accounts.filter((a) => normalize(a.email) === needle);
  if (exactEmail.length === 1) return exactEmail[0]!;
  if (exactEmail.length > 1) return pickDefaultAccount(exactEmail);

  const exactProduct = accounts.filter((a) => normalize(a.productFolder) === needle);
  if (exactProduct.length === 1) return exactProduct[0]!;
  if (exactProduct.length > 1) return pickDefaultAccount(exactProduct);

  const emailSub = accounts.filter((a) => normalize(a.email).includes(needle));
  if (emailSub.length === 1) return emailSub[0]!;
  if (emailSub.length > 1) {
    throw new Error(
      `Selector "${raw}" matched multiple emails. Be more specific.\nAvailable: ${availableLabel(accounts)}`
    );
  }

  const productSub = accounts.filter((a) => normalize(a.productFolder).includes(needle));
  if (productSub.length === 1) return productSub[0]!;
  if (productSub.length > 1) {
    throw new Error(
      `Selector "${raw}" matched multiple product folders. Be more specific.\nAvailable: ${availableLabel(accounts)}`
    );
  }

  throw new Error(
    `No signed-in Cursor account matched "${raw}".\nAvailable accounts: ${availableLabel(accounts)}`
  );
}

function matchSavedPreference<T extends { email?: string; productFolder: string }>(
  accounts: T[],
  pref: AccountPreference
): T | undefined {
  const wantEmail = pref.activeEmail;
  const wantFolder = pref.activeProductFolder;
  if (!wantEmail && !wantFolder) return undefined;

  const both = accounts.filter((a) => {
    const emailOk = wantEmail ? emailsEqual(a.email, wantEmail) : true;
    const folderOk = wantFolder ? normalize(a.productFolder) === normalize(wantFolder) : true;
    return emailOk && folderOk;
  });
  if (both.length === 1) return both[0];
  if (both.length > 1) return pickDefaultAccount(both);

  if (wantEmail) {
    const byEmail = accounts.filter((a) => emailsEqual(a.email, wantEmail));
    if (byEmail.length === 1) return byEmail[0];
    if (byEmail.length > 1) return pickDefaultAccount(byEmail);
  }
  if (wantFolder) {
    const byFolder = accounts.filter((a) => normalize(a.productFolder) === normalize(wantFolder));
    if (byFolder.length === 1) return byFolder[0];
    if (byFolder.length > 1) return pickDefaultAccount(byFolder);
  }
  return undefined;
}

function overrideAccount(
  source: "flag" | "env",
  token: string,
  productFolder: string
): InternalAccount {
  return {
    accessToken: token,
    productFolder,
    dbPath: "(none)",
    tokenSource: source,
  };
}

function pickFromDiscovered(
  accounts: InternalAccount[],
  options: ResolveAuthOptions
): { account: InternalAccount; selection: AccountList["selection"] } {
  if (accounts.length === 0) throw noAuthError();

  const wanted = options.accountMatch?.trim();
  if (wanted) {
    return { account: matchAccount(accounts, wanted), selection: "account-flag" };
  }

  const pref = loadAccountPreference(options.configPath);
  const fromConfig = matchSavedPreference(accounts, pref);
  if (fromConfig) return { account: fromConfig, selection: "config" };

  const picked = pickDefaultAccount(accounts);
  const isPreferred =
    emailsEqual(picked.email, PREFERRED_DEFAULT_EMAIL) ||
    normalize(picked.productFolder) === normalize(PREFERRED_DEFAULT_PRODUCT);
  return {
    account: picked,
    selection: isPreferred && emailsEqual(picked.email, PREFERRED_DEFAULT_EMAIL)
      ? "preferred-default"
      : "first",
  };
}

function resolveInternal(options: ResolveAuthOptions = {}): {
  account: InternalAccount;
  selection: AccountList["selection"];
} {
  const explicit = options.explicitToken?.trim();
  if (explicit) {
    return { account: overrideAccount("flag", explicit, "(flag)"), selection: "flag" };
  }

  const envToken = (options.envToken ?? process.env.CURSOR_TOKEN)?.trim();
  if (envToken) {
    return {
      account: overrideAccount("env", envToken, "(CURSOR_TOKEN)"),
      selection: "env",
    };
  }

  const accounts = discoverInternalAccounts(
    options.discoverRoots ? { roots: options.discoverRoots } : undefined
  );
  return pickFromDiscovered(accounts, options);
}

/**
 * Resolve a Cursor access token.
 * Priority: `--token` → `CURSOR_TOKEN` → `--account` → saved `use` config →
 * preferred default (lorapokdev@gmail.com on dCursor) → first discovered DB.
 * Never logs the token. Re-reads the token from the chosen state.vscdb each run.
 */
export function resolveAuth(explicitToken?: string, accountMatch?: string): CursorAuth {
  return resolveAuthWithOptions({ explicitToken, accountMatch });
}

export function resolveAuthWithOptions(options: ResolveAuthOptions = {}): CursorAuth {
  const { account } = resolveInternal(options);
  return {
    accessToken: account.accessToken,
    email: account.email,
    productFolder: account.productFolder,
    dbPath: account.dbPath,
    signUpType: account.signUpType,
    membershipType: account.membershipType,
  };
}

/** Public account identity (never includes the token). */
export function whoami(explicitToken?: string, accountMatch?: string): CursorAccount {
  return whoamiWithOptions({ explicitToken, accountMatch });
}

export function whoamiWithOptions(options: ResolveAuthOptions = {}): CursorAccount {
  return toPublic(resolveInternal(options).account);
}

/**
 * List discovered accounts and mark the one subsequent commands will use.
 * `--token` / `CURSOR_TOKEN` collapse the list to that override.
 */
export function listAccounts(options: ResolveAuthOptions = {}): AccountList {
  const explicit = options.explicitToken?.trim();
  if (explicit) {
    const account = toPublic(overrideAccount("flag", explicit, "(flag)"));
    return { accounts: [account], activeIndex: 0, selection: "flag" };
  }
  const envToken = (options.envToken ?? process.env.CURSOR_TOKEN)?.trim();
  if (envToken) {
    const account = toPublic(overrideAccount("env", envToken, "(CURSOR_TOKEN)"));
    return { accounts: [account], activeIndex: 0, selection: "env" };
  }

  const internals = discoverInternalAccounts(
    options.discoverRoots ? { roots: options.discoverRoots } : undefined
  );
  if (internals.length === 0) throw noAuthError();

  const { account, selection } = pickFromDiscovered(internals, options);
  const activeIndex = internals.findIndex(
    (entry) => entry.dbPath === account.dbPath && entry.productFolder === account.productFolder
  );
  return {
    accounts: internals.map(toPublic),
    activeIndex: activeIndex >= 0 ? activeIndex : 0,
    selection,
  };
}

/** @deprecated Use listAccounts. Kept for callers that used whoamiAll. */
export function whoamiAll(
  explicitToken?: string,
  accountMatch?: string
): { accounts: CursorAccount[]; activeIndex: number } {
  const listed = listAccounts({ explicitToken, accountMatch });
  return { accounts: listed.accounts, activeIndex: listed.activeIndex };
}
