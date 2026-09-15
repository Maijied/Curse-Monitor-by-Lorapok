# Curse Monitor — Cursor / Grok Bot plugin

<div align="center">
  <img src="assets/logo.png" alt="Curse Monitor Larvae" width="128" height="128" />
  <p><strong>Know your limits before they know you.</strong></p>
  <p>Live Cursor usage for agents · by <a href="https://lorapok.tech">Lorapok Labs</a></p>
</div>

This plugin teaches Cursor agents / Grok Bot to run the **curse-monitor** CLI for quotas, bonus credits, Auto/API %, on-demand spend, and billing-cycle countdown.

It is a **CLI + agent plugin**, not the VS Code extension. Companion product: [Cursor Curse Monitor](https://cursor.lorapok.tech).

## Prerequisites

Install the CLI from the repo root (once):

```bash
cd /path/to/curse-monitor
npm install && npm run build && npm link
curse-monitor --help
```

Auth is automatic from Cursor’s local `state.vscdb`, or set `CURSOR_TOKEN` / `--token`.  
**Never print or store the access token.**

## Install the plugin

Point Cursor / Grok Bot at this `plugin/` directory (local path or after publishing to the Cursor Marketplace).

Manifest: `.cursor-plugin/plugin.json`  
Skills: `skills/curse-monitor/`, `skills/curse-monitor-status/`, `skills/curse-monitor-watch/`

## Commands agents should run

| Audience | Command |
|----------|---------|
| Humans | `curse-monitor status` |
| Agents (parse) | `curse-monitor json` |
| Account source | `curse-monitor whoami` |
| Live board | `curse-monitor watch --interval 30` |

## Links

- Homepage / sibling: https://cursor.lorapok.tech
- Lorapok Labs: https://lorapok.tech
- Publish guide: https://cursor.com/marketplace/publish

## License

MIT © Lorapok Labs
