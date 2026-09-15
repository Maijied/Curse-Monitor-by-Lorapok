---
name: curse-monitor-status
description: >-
  Show a pretty Cursor usage status board (included pool, bonus credits, Auto %,
  API %, on-demand, billing cycle). Use for human-facing usage questions. Prefer
  curse-monitor report for grouped breakdowns and curse-monitor json when the
  agent needs structured metrics.
---

# Curse Monitor — status

Requires the CLI on PATH (`npm install && npm run build && npm link` from the curse-monitor repo).

```bash
curse-monitor status
# or simply:
curse-monitor
```

Displays a boxed board with:

- Email / membership
- Included pool bar (used / limit / %)
- Bonus / agent credits when present
- Combined pool remaining
- Auto % and API %
- On-demand spend (if enabled)
- Billing cycle + days until reset
- Stale 100% banner when API reports 100% but bonus credits remain

For grouped breakdowns use `curse-monitor report`. For structured data use `curse-monitor json`. For account source use `curse-monitor whoami`.

**Never** print the access token.
