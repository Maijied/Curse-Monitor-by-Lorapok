---
name: curse-monitor-report
description: >-
  Full Cursor usage report with pool metrics plus grouped breakdowns
  (model | autoApi | surface) over 7d | 30d | cycle | mtd. Use when the user
  wants analytics, model mix, Tab vs Composer, or a billing-cycle report.
---

# Curse Monitor — report

Requires the CLI on PATH (`npm install && npm run build && npm link` from the curse-monitor repo).

```bash
curse-monitor report
curse-monitor report --group-by model --range cycle
curse-monitor report -g surface -r 30d
curse-monitor json --report --group-by autoApi --range 7d
```

Includes:

- Included / bonus / combined pool, Auto %, API %, on-demand, billing cycle
- Stale 100% banner when API says 100% but bonus remains
- Grouped breakdown for the selected range

**Constraint:** Cursor API does not expose per-model dollar spend. Model grouping uses locally active models plus Auto/API meters — never invent per-model USD.

**Never** print the access token.
