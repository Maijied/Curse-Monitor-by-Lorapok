<div align="center">
  <img src="media/logo.png" alt="Curse Monitor by Lorapok Labs — Larvae mascot" width="160" height="160" />

  <h1>Curse Monitor</h1>

  <p><strong>Know your limits before they know you.</strong></p>
  <p>Live Cursor usage — quotas, budget, grouped reports, and billing cycle · CLI + Grok Bot / Cursor agent plugin</p>

  <p>
    <a href="https://curse.lorapok.tech"><img alt="Website" src="https://img.shields.io/badge/site-curse.lorapok.tech-6C5CE7?labelColor=1a1f28" /></a>
    <a href="https://github.com/Maijied/Curse-Monitor-by-Lorapok"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-Maijied%2FCurse--Monitor--by--Lorapok-181717?logo=github" /></a>
    <img alt="Node >=20" src="https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white" />
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-6C5CE7" />
    <img alt="Lorapok Labs" src="https://img.shields.io/badge/Lorapok-Labs-39ff14?labelColor=1a1f28" />
    <img alt="Version 0.2.0" src="https://img.shields.io/badge/version-0.2.0-a29bfe" />
  </p>
</div>

**Curse Monitor** is a lean companion to [Cursor Curse Monitor](https://cursor.lorapok.tech) by [Lorapok Labs](https://lorapok.tech).  
It is a **CLI + Grok Bot / Cursor agent plugin** (not the VS Code extension) that surfaces included pool, bonus/agent credits, Auto %, API %, on-demand spend, billing-cycle countdown, and grouped reports from your local Cursor session.

Site: [curse.lorapok.tech](https://curse.lorapok.tech) · Pages: [curse-monitor.pages.dev](https://curse-monitor.pages.dev) · Repo: [Maijied/Curse-Monitor-by-Lorapok](https://github.com/Maijied/Curse-Monitor-by-Lorapok)  
Accent: `#6C5CE7` · Neon: `#39ff14` · Mascot: official Lorapok Larvae · Privacy: tokens never printed.

**Constraint:** Cursor API does **not** expose per-model dollar spend. Model breakdown is local active-model / analytics grouping plus Auto/API meters — never a billed USD split.

## Install

```bash
cd /path/to/curse-monitor
npm install
npm run build
npm link          # puts `curse-monitor` on your PATH
```

Or without linking:

```bash
npm start -- report
# equivalent: node dist/cli.js report
```

Requirements: Node.js **20+** (Node **22+** recommended for built-in `node:sqlite`) and a signed-in Cursor (or `CURSOR_TOKEN` / `--token`).

## CLI

```text
curse-monitor                     # pretty status board (default)
curse-monitor status
curse-monitor report [--group-by autoApi] [--range 7d]
curse-monitor watch [--interval 30]
curse-monitor json [--report] [-g autoApi] [-r 7d]
curse-monitor whoami              # list all signed-in accounts
curse-monitor status --account work@co.com   # pick one of several accounts
curse-monitor --help
```

| Command | Purpose |
|---------|---------|
| `status` | Human-facing boxed board |
| `report` | Board + grouped breakdowns (`model` \| `autoApi` \| `surface`) |
| `json` | Machine-readable snapshot; `--report` adds analytics |
| `whoami` | List every signed-in Cursor account (email + details) and which one is active |
| `watch` | Live refresh every N seconds (also records Auto/API poll history) |

### Report flags

| Flag | Values |
|------|--------|
| `--group-by` / `-g` | `model` · `autoApi` · `surface` |
| `--range` / `-r` | `7d` · `30d` · `cycle` · `mtd` |

`autoApi` uses Cursor usage-summary meters plus local poll history. `surface` uses local Tab/Composer daily stats. `model` lists locally active models — **not** per-model dollars (the API does not provide that).

Every command accepts `-a, --account <match>` to select one of several signed-in
accounts by email or product folder (case-insensitive substring).

### Auth

| Source | Priority |
|--------|----------|
| `--token <token>` | 1 |
| `CURSOR_TOKEN` env | 2 |
| Cursor `state.vscdb` (`cursorAuth/accessToken`) | 3 |

The access token is **never** logged or written to JSON output.

#### Multiple accounts

`whoami` enumerates **every** signed-in account across those product folders
(de-duplicating the same login mirrored into more than one folder) and shows
each account's email, membership, and sign-up method — marking the active one:

```text
Curse Monitor — identity (2 accounts)
─────────────────────────
▶ active: alice@work.com
    Product:    Cursor
    Membership: pro
        : bob@personal.dev
    Product:    dCursor
    Membership: free
```

When more than one account is present, the highest-priority folder is used by
default. Target a specific one with `--account`, matched against email or
product folder:

```bash
curse-monitor status --account bob        # by email substring
curse-monitor json   --account dCursor    # by product folder
```

### Example status

The board shows included / bonus / combined pool, Auto %, API %, on-demand, billing cycle, and a stale-100% banner when the API reports 100% but bonus credits remain. Exact numbers come from **your** Cursor session — this README does not invent sample quotas.

## Plugin (Grok Bot / Cursor agents)

Marketplace layout matches [cursor/plugin-template](https://github.com/cursor/plugin-template):

```text
.cursor-plugin/marketplace.json
plugins/curse-monitor/
  .cursor-plugin/plugin.json
  assets/logo-animated.svg
  skills/…  commands/report.md
```

```bash
npm run validate-template
```

See [PLUGIN_STORE.md](./PLUGIN_STORE.md) for the Cursor Marketplace submission checklist.

## Library API

```ts
import {
  resolveAuth,
  fetchSnapshot,
  buildUsageReport,
  formatReportBoard,
} from "curse-monitor";

const auth = resolveAuth();
const snap = await fetchSnapshot(auth.accessToken, {
  email: auth.email,
  productFolder: auth.productFolder,
  dbPath: auth.dbPath,
});
console.log(formatReportBoard(snap, buildUsageReport(snap, { groupBy: "autoApi", range: "7d" })));
```

Endpoints used (Bearer token, from the CLI on your machine):

- `GET https://api2.cursor.sh/auth/usage-summary`
- `GET https://api2.cursor.sh/auth/full_stripe_profile`

## Website & API stub

- Static marketing site in `website/` (Cloudflare Pages). Tokens: `website/shared/tokens.css`. SEO source: `website/seo.yml` → `npm run seo`.
- Optional Worker stub in `api/` (`/api/curse-monitor/health` and `/usage`) for a later connect to Mission Control at [cursor-dev.lorapok.tech](https://cursor-dev.lorapok.tech). **Not wired to Cursor tokens.** See [api/README.md](./api/README.md).

## Scripts

| Script | Action |
|--------|--------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm test` | Build + unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate-template` | Cursor plugin template rules |
| `npm run ci` | typecheck + test + validate-template |
| `npm run seo` | Generate `seo.json` / sitemap / robots from `seo.yml` |
| `npm run demo` | Offline fixture status board (pool math only) |

CI (`.github/workflows/ci.yml`) runs those checks on push/PR. Pages deploy on `main` is **optional** and skipped unless `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets exist. API stub deploy additionally requires variable `DEPLOY_API_STUB=true`. This repo does not contain those credentials.

## Privacy

- All auth stays on your machine.
- Network calls go only to `api2.cursor.sh` with your session token.
- No telemetry, no credential vault files, no token echo.

## License

MIT © Lorapok Labs / Mohammad Maizied Hasan Majumder
