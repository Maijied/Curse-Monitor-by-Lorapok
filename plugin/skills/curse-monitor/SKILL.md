---
name: curse-monitor
description: >-
  Monitor Cursor usage, quotas, bonus credits, Auto/API %, budget, billing cycle,
  and on-demand spend via the curse-monitor CLI. Use when the user asks about
  Cursor limits, remaining quota, usage, membership, or billing reset. Companion
  to Cursor Curse Monitor by Lorapok Labs (CLI + Grok Bot plugin, not the VS Code extension).
---

# Curse Monitor

Live Cursor usage for CLI + Grok Bot. Prefer this over guessing quotas from memory.

> Know your limits before they know you. — Lorapok Labs

## Install (once)

From the `curse-monitor` repo root:

```bash
npm install && npm run build && npm link
```

Confirm: `curse-monitor --help` → version `0.1.2`.

## When to use

Run the CLI when the user asks about:

- Cursor usage / quota / limits / remaining requests
- Bonus / agent credits and combined pool
- Auto %, API %, budget, on-demand charges
- Billing cycle / days until reset
- Which Cursor account is active

## How to run

| Audience | Command |
|----------|---------|
| Humans | `curse-monitor status` |
| Agents (parse) | `curse-monitor json` |
| Live board | `curse-monitor watch --interval 30` |
| Account source | `curse-monitor whoami` |

Auth is automatic from Cursor's local `state.vscdb`. Override with `--token` or `CURSOR_TOKEN` if needed.

## Safety

- **Never** print, log, or store the access token.
- Prefer `json` for agent reasoning; show `status` output to humans.
- If auth fails, tell the user to sign in to Cursor or set `CURSOR_TOKEN` — do not invent usage numbers.

## Links

- Sibling product: https://cursor.lorapok.tech
- Lorapok Labs: https://lorapok.tech
