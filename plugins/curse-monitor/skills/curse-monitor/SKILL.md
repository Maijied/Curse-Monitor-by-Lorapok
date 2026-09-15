---
name: curse-monitor
description: >-
  Monitor Cursor usage, quotas, bonus credits, Auto/API %, reports (model/autoApi/surface),
  budget, billing cycle, and on-demand spend via the curse-monitor CLI. Use when the user
  asks about Cursor limits, remaining quota, usage, membership, or billing reset. Companion
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

Confirm: `curse-monitor --help` → version `0.3.0`.

## When to use

Run the CLI when the user asks about:

- Cursor usage / quota / limits / remaining requests
- Bonus / agent credits and combined pool
- Auto %, API %, budget, on-demand charges
- Billing cycle / days until reset
- Grouped reports (model, Auto/API, Tab vs Composer)
- Which Cursor account is active (and switching between product folders)

## How to run

| Audience | Command |
|----------|---------|
| Humans | `curse-monitor status` |
| Full report | `curse-monitor report --group-by autoApi --range 7d` |
| Agents (parse) | `curse-monitor json` or `curse-monitor json --report` |
| Live board | `curse-monitor watch --interval 30` |
| Account list | `curse-monitor accounts` or `curse-monitor whoami --list` |
| Switch account | `curse-monitor use <email\|index\|product>` |
| Account source | `curse-monitor whoami` |

Group-by: `model` | `autoApi` | `surface`  
Range: `7d` | `30d` | `cycle` | `mtd`

**Constraint:** Cursor API does not expose per-model dollar spend. Model breakdown is local active-model / analytics grouping plus Auto/API meters.

Auth is automatic from Cursor's local `state.vscdb` (all product folders). `accounts` / `use` select which login later commands read. Override with `--token` or `CURSOR_TOKEN` if needed. Default without a saved selection: prefer dCursor when `lorapokdev@gmail.com` is signed in.

## Safety

- **Never** print, log, or store the access token.
- Prefer `json` / `json --report` for agent reasoning; show `status` / `report` to humans.
- If auth fails, tell the user to sign in to Cursor or set `CURSOR_TOKEN` — do not invent usage numbers.

## Links

- Product site: https://curse.lorapok.tech
- Sibling product: https://cursor.lorapok.tech
- Lorapok Labs: https://lorapok.tech
