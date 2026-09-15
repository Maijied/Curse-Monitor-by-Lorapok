import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { openDatabase, readItem, type SqliteDb } from "./sqlite.js";

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

/** A discovered Cursor account with its non-secret identity details. */
export interface CursorAccount {
  email?: string;
  productFolder: string;
  dbPath: string;
  signUpType?: string;
  membershipType?: string;
  tokenSource: "flag" | "env" | "state.vscdb";
}

interface ProductCandidate {
  folder: string;
  relativeDb: string[];
}

const PRODUCT_PRIORITY: ProductCandidate[] = [
  { folder: "Cursor", relativeDb: ["Cursor", "User", "globalStorage", "state.vscdb"] },
  { folder: "dCursor", relativeDb: ["dCursor", "User", "globalStorage", "state.vscdb"] },
  { folder: "Cursor Nightly", relativeDb: ["Cursor Nightly", "User", "globalStorage", "state.vscdb"] },
  { folder: "Windsurf", relativeDb: ["Windsurf", "User", "globalStorage", "state.vscdb"] },
];

function configRoots(): string[] {
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

/** Discover candidate state.vscdb paths in product priority order. */
export function discoverStateDbPaths(): { folder: string; path: string }[] {
  const found: { folder: string; path: string }[] = [];
  const seen = new Set<string>();
  for (const root of configRoots()) {
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

/** Read the non-secret identity fields (plus token) from one state DB. */
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

/**
 * Discover every signed-in Cursor account across all product folders.
 * Accounts are returned in product priority order and de-duplicated by
 * access token (the same login mirrored into multiple folders appears once).
 * Never returns or logs the access token.
 */
export function discoverAccounts(): CursorAccount[] {
  const accounts: CursorAccount[] = [];
  const seenTokens = new Set<string>();
  for (const { folder, path } of discoverStateDbPaths()) {
    try {
      const db = openDatabase(path);
      try {
        const fields = readAuthFields(db);
        if (!fields.accessToken) continue;
        if (seenTokens.has(fields.accessToken)) continue;
        seenTokens.add(fields.accessToken);
        accounts.push({
          email: fields.email,
          productFolder: folder,
          dbPath: path,
          signUpType: fields.signUpType,
          membershipType: fields.membershipType,
          tokenSource: "state.vscdb",
        });
      } finally {
        db.close?.();
      }
    } catch {
      // Skip unreadable DBs; a later folder may still work.
    }
  }
  return accounts;
}

/** Case-insensitive match of an account by email or product folder substring. */
function accountMatches(account: CursorAccount, match: string): boolean {
  const needle = match.trim().toLowerCase();
  if (!needle) return true;
  return (
    (account.email?.toLowerCase().includes(needle) ?? false) ||
    account.productFolder.toLowerCase().includes(needle)
  );
}

/**
 * Resolve a Cursor access token.
 * Priority: explicit token arg → CURSOR_TOKEN env → discovered state.vscdb.
 * When multiple accounts are present, `accountMatch` selects one by email or
 * product folder; otherwise the highest-priority account is used.
 * Never logs the token.
 */
export function resolveAuth(explicitToken?: string, accountMatch?: string): CursorAuth {
  if (explicitToken?.trim()) {
    return {
      accessToken: explicitToken.trim(),
      productFolder: "(flag)",
      dbPath: "(none)",
    };
  }

  const envToken = process.env.CURSOR_TOKEN?.trim();
  if (envToken) {
    return {
      accessToken: envToken,
      productFolder: "(CURSOR_TOKEN)",
      dbPath: "(none)",
    };
  }

  const candidates = discoverStateDbPaths();
  if (candidates.length === 0) {
    throw new Error(
      "No Cursor auth found. Sign in to Cursor, or pass --token / set CURSOR_TOKEN.\n" +
        "Looked for state.vscdb under Cursor, dCursor, Cursor Nightly, Windsurf."
    );
  }

  const wanted = accountMatch?.trim();
  let lastError: unknown;
  let sawToken = false;
  for (const { folder, path } of candidates) {
    try {
      const db = openDatabase(path);
      try {
        const fields = readAuthFields(db);
        if (!fields.accessToken) continue;
        sawToken = true;
        const account: CursorAccount = {
          email: fields.email,
          productFolder: folder,
          dbPath: path,
          signUpType: fields.signUpType,
          membershipType: fields.membershipType,
          tokenSource: "state.vscdb",
        };
        if (wanted && !accountMatches(account, wanted)) continue;
        return {
          accessToken: fields.accessToken,
          email: fields.email,
          productFolder: folder,
          dbPath: path,
          signUpType: fields.signUpType,
          membershipType: fields.membershipType,
        };
      } finally {
        db.close?.();
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (wanted && sawToken) {
    const available = discoverAccounts()
      .map((a) => `${a.email ?? "(no email)"} [${a.productFolder}]`)
      .join(", ");
    throw new Error(
      `No signed-in Cursor account matched "${wanted}".` +
        (available ? `\nAvailable accounts: ${available}` : "")
    );
  }

  throw new Error(
    `Found Cursor state DB(s) but could not read cursorAuth/accessToken.` +
      (lastError instanceof Error ? `\n${lastError.message}` : "")
  );
}

/** Public account identity (never includes the token). */
export function whoami(explicitToken?: string, accountMatch?: string): CursorAccount {
  const auth = resolveAuth(explicitToken, accountMatch);
  let tokenSource: "flag" | "env" | "state.vscdb" = "state.vscdb";
  if (auth.productFolder === "(flag)") tokenSource = "flag";
  else if (auth.productFolder === "(CURSOR_TOKEN)") tokenSource = "env";

  return {
    email: auth.email,
    productFolder: auth.productFolder,
    dbPath: auth.dbPath,
    signUpType: auth.signUpType,
    membershipType: auth.membershipType,
    tokenSource,
  };
}

/**
 * List every resolvable Cursor account and flag the one that would be used.
 * With an explicit `--token`/`CURSOR_TOKEN`, that single override is returned.
 * Otherwise every signed-in product folder is enumerated so callers can
 * support multiple users; `accountMatch` marks which one is active.
 */
export function whoamiAll(
  explicitToken?: string,
  accountMatch?: string
): { accounts: CursorAccount[]; activeIndex: number } {
  if (explicitToken?.trim()) {
    return { accounts: [whoami(explicitToken, accountMatch)], activeIndex: 0 };
  }
  if (process.env.CURSOR_TOKEN?.trim()) {
    return { accounts: [whoami(undefined, accountMatch)], activeIndex: 0 };
  }

  const accounts = discoverAccounts();
  if (accounts.length === 0) {
    throw new Error(
      "No Cursor auth found. Sign in to Cursor, or pass --token / set CURSOR_TOKEN.\n" +
        "Looked for state.vscdb under Cursor, dCursor, Cursor Nightly, Windsurf."
    );
  }

  const wanted = accountMatch?.trim();
  let activeIndex = 0;
  if (wanted) {
    const idx = accounts.findIndex((a) => accountMatches(a, wanted));
    if (idx === -1) {
      const available = accounts
        .map((a) => `${a.email ?? "(no email)"} [${a.productFolder}]`)
        .join(", ");
      throw new Error(
        `No signed-in Cursor account matched "${wanted}".\nAvailable accounts: ${available}`
      );
    }
    activeIndex = idx;
  }
  return { accounts, activeIndex };
}
