---
name: curse-monitor-report
description: Show a grouped Cursor usage report (model, autoApi, or surface) for a 7d, 30d, cycle, or mtd window.
---

Run a human-facing Curse Monitor report.

```bash
curse-monitor report
curse-monitor report --group-by model --range cycle
curse-monitor report -g surface -r 30d
curse-monitor json --report --group-by autoApi --range 7d
```

Cursor API does not expose per-model dollar spend. Model breakdown is local active-model grouping plus Auto/API meters.

Never print the access token.
