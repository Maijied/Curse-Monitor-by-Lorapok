---
name: curse-monitor-accounts
description: List discovered Cursor accounts or select the active one with use.
---

List and switch local Cursor logins. Never print the access token.

```bash
curse-monitor accounts
curse-monitor accounts --json
curse-monitor whoami --list
curse-monitor use <email|index|product>
```

Selection is saved as email + product folder in `~/.config/curse-monitor/config.json` (not the token). `--token` / `CURSOR_TOKEN` still override.
