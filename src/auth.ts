import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { openDatabase, readItem } from "./sqlite.js";

export interface CursorAuth {
  accessToken: string;
  email?: string;
  /** Product folder that supplied the token (e.g. Cursor, dCursor). */
  productFolder: string;
  /** Absolute path to the state.vscdb used. */
  dbPath: string;
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

/**
 * Resolve a Cursor access token.
 * Priority: explicit token arg → CURSOR_TOKEN env → first discoverable state.vscdb.
 * Never logs the token.
 */
export function resolveAuth(explicitToken?: string): CursorAuth {
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

  let lastError: unknown;
  for (const { folder, path } of candidates) {
    try {
      const db = openDatabase(path);
      try {
        const accessToken = readItem(db, "cursorAuth/accessToken");
        if (!accessToken) continue;
        const email =
          readItem(db, "cursorAuth/cachedEmail") ||
          readItem(db, "cursorAuth/email") ||
          undefined;
        return { accessToken, email, productFolder: folder, dbPath: path };
      } finally {
        db.close?.();
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Found Cursor state DB(s) but could not read cursorAuth/accessToken.` +
      (lastError instanceof Error ? `\n${lastError.message}` : "")
  );
}

/** Public account identity (never includes the token). */
export function whoami(explicitToken?: string): {
  email?: string;
  productFolder: string;
  dbPath: string;
  tokenSource: "flag" | "env" | "state.vscdb";
} {
  const auth = resolveAuth(explicitToken);
  let tokenSource: "flag" | "env" | "state.vscdb" = "state.vscdb";
  if (auth.productFolder === "(flag)") tokenSource = "flag";
  else if (auth.productFolder === "(CURSOR_TOKEN)") tokenSource = "env";

  return {
    email: auth.email,
    productFolder: auth.productFolder,
    dbPath: auth.dbPath,
    tokenSource,
  };
}
