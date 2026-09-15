---
name: curse-monitor-accounts
description: >-
  List and switch Cursor accounts discovered from local product folders
  (Cursor, dCursor, Cursor Nightly, Windsurf, …). Use when the user asks
  which account is active, to switch accounts, or mentions curse-monitor
  accounts / use / whoami --list.
---

# Curse Monitor — accounts

Requires the CLI on PATH (`npm install && npm run build && npm link` from the curse-monitor repo).

```bash
curse-monitor accounts
curse-monitor accounts --json
curse-monitor whoami --list
curse-monitor use 1
curse-monitor use lorapokdev@gmail.com
curse-monitor use dCursor
```

`accounts` lists each signed-in product folder (email, product, active marker). Tokens are **never** printed.

`use <email|index|product>` saves a pointer (email + product folder) to `~/.config/curse-monitor/config.json`. The access token is **not** stored there — it is re-read from that product's `state.vscdb` on each command.

One-shot override (does not persist): `--account <email|index|product>` on `status` / `report` / `json` / `watch` / `whoami`.

`--token` and `CURSOR_TOKEN` still win over the saved selection.

**Default** when nothing is saved: prefer **dCursor** when `lorapokdev@gmail.com` is signed in; otherwise the first discovered product folder.

**Never** print the access token. Do not invent usage numbers.
