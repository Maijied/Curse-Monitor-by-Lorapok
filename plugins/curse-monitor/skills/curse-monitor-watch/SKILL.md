---
name: curse-monitor-watch
description: >-
  Live-refresh Cursor usage status on an interval via curse-monitor watch.
  Use when the user wants a continuous board while coding. Requires CLI installed
  via npm link from the curse-monitor repo.
---

# Curse Monitor — watch

```bash
curse-monitor watch --interval 30
```

- Default interval: 30 seconds (minimum 5).
- Clears the terminal and redraws the status board each tick.
- Builds local Auto/API poll history used by `curse-monitor report`.
- Stop with Ctrl+C.

Related commands: `curse-monitor status`, `curse-monitor report`, `curse-monitor json`, `curse-monitor whoami`, `curse-monitor accounts`, `curse-monitor use`.

**Never** print the access token.
