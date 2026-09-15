# Curse Monitor — Cursor / Grok Bot plugin

<div align="center">
  <img src="assets/logo-animated.svg" alt="Ward — Curse Monitor by Lorapok Labs" width="128" height="128" />
  <p><strong>Know your limits before they know you.</strong></p>
  <p>Live Cursor usage for agents · by <a href="https://lorapok.tech">Lorapok Labs</a></p>
</div>

This plugin teaches Cursor agents / Grok Bot to run the **curse-monitor** CLI for quotas, bonus credits, Auto/API %, grouped reports, multi-account switching, on-demand spend, and billing-cycle countdown.

It is a **CLI + agent plugin**, not the VS Code extension. Companion product: [Cursor Curse Monitor](https://cursor.lorapok.tech).

Layout follows the [Cursor plugin template](https://github.com/cursor/plugin-template): this folder is `plugins/curse-monitor/` with marketplace metadata at the repo-root `.cursor-plugin/marketplace.json`.

## Prerequisites

Install the CLI from the repo root (once):

```bash
cd /path/to/curse-monitor
npm install && npm run build && npm link
curse-monitor --help
```

Auth is automatic from Cursor’s local `state.vscdb` (every product folder with a token). Use `curse-monitor accounts` / `use` to pick a login. Or set `CURSOR_TOKEN` / `--token`.  
**Never print or store the access token.** `use` writes only an email + product pointer to `~/.config/curse-monitor/config.json`.

## Install the plugin

Point Cursor / Grok Bot at this `plugins/curse-monitor/` directory (local path or after publishing to the Cursor Marketplace).

Manifest: `.cursor-plugin/plugin.json`  
Logo: `assets/logo-animated.svg` (relative path)  
Skills: `skills/curse-monitor/`, `skills/curse-monitor-status/`, `skills/curse-monitor-watch/`, `skills/curse-monitor-report/`, `skills/curse-monitor-accounts/`

Validate from the repo root:

```bash
npm run validate-template
```

## Commands agents should run

| Audience | Command |
|----------|---------|
| Humans | `curse-monitor status` |
| Full report | `curse-monitor report [--group-by model\|autoApi\|surface] [--range 7d\|30d\|cycle\|mtd]` |
| Agents (parse) | `curse-monitor json` / `curse-monitor json --report` |
| Account list | `curse-monitor accounts` / `whoami --list` |
| Switch account | `curse-monitor use <email\|index\|product>` |
| Account source | `curse-monitor whoami` |
| Live board | `curse-monitor watch --interval 30` |

**Constraint:** Cursor API does not expose per-model dollar spend. Model breakdown is local active-model grouping plus Auto/API meters.

## Links

- Homepage: https://curse.lorapok.tech
- Sibling: https://cursor.lorapok.tech
- Lorapok Labs: https://lorapok.tech
- Publish guide: https://cursor.com/marketplace/publish

## License

MIT © Lorapok Labs
