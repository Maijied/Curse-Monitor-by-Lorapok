<div align="center">
  <img src="media/logo.png" alt="Curse Monitor by Lorapok Labs — Larvae mascot" width="160" height="160" />

  <h1>Curse Monitor</h1>

  <p><strong>Know your limits before they know you.</strong></p>
  <p>Live Cursor usage — quotas, budget, and billing cycle · CLI + Grok Bot / Cursor agent plugin</p>

  <p>
    <a href="https://curse.lorapok.tech"><img alt="Website" src="https://img.shields.io/badge/site-curse.lorapok.tech-6C5CE7?labelColor=1a1f28" /></a>
    <a href="https://github.com/Maijied/Curse-Monitor-by-Lorapok"><img alt="GitHub" src="https://img.shields.io/badge/GitHub-Maijied%2FCurse--Monitor--by--Lorapok-181717?logo=github" /></a>
    <img alt="Node >=20" src="https://img.shields.io/badge/Node-%3E%3D20-339933?logo=node.js&logoColor=white" />
    <img alt="MIT License" src="https://img.shields.io/badge/License-MIT-6C5CE7" />
    <img alt="Lorapok Labs" src="https://img.shields.io/badge/Lorapok-Labs-39ff14?labelColor=1a1f28" />
    <img alt="Version 0.1.2" src="https://img.shields.io/badge/version-0.1.2-a29bfe" />
  </p>
</div>

**Curse Monitor** is a lean companion to [Cursor Curse Monitor](https://cursor.lorapok.tech) by [Lorapok Labs](https://lorapok.tech).  
It is a **CLI + Grok Bot / Cursor agent plugin** (not the VS Code extension) that surfaces included pool, bonus/agent credits, Auto %, API %, on-demand spend, and billing-cycle countdown from your local Cursor session.

Site: [curse.lorapok.tech](https://curse.lorapok.tech) · Repo: [Maijied/Curse-Monitor-by-Lorapok](https://github.com/Maijied/Curse-Monitor-by-Lorapok)  
Accent: `#6C5CE7` · Mascot: official Lorapok Larvae · Privacy: tokens never printed.

## Install

```bash
cd /path/to/curse-monitor
npm install
npm run build
npm link          # puts `curse-monitor` on your PATH
```

Or without linking:

```bash
npm start -- status
# equivalent: node dist/cli.js status
```

Requirements: Node.js **20+** (Node **22+** recommended for built-in `node:sqlite`) and a signed-in Cursor (or `CURSOR_TOKEN` / `--token`).

## CLI

```text
curse-monitor              # pretty status board (default)
curse-monitor status
curse-monitor watch [--interval 30]
curse-monitor json
curse-monitor whoami
curse-monitor --help
```

| Command | Purpose |
|---------|---------|
| `status` | Human-facing boxed board |
| `json` | Machine-readable snapshot + richer `metrics` for agents |
| `whoami` | Which Cursor product folder / email will be used |
| `watch` | Live refresh every N seconds |

### Auth

| Source | Priority |
|--------|----------|
| `--token <token>` | 1 |
| `CURSOR_TOKEN` env | 2 |
| Cursor `state.vscdb` (`cursorAuth/accessToken`) | 3 |

Searched product folders (Linux shown; macOS/Windows supported):

1. `~/.config/Cursor/User/globalStorage/state.vscdb`
2. `dCursor`, `Cursor Nightly`, `Windsurf` (same relative path)

The access token is **never** logged or written to JSON output.

### Example status

```text
╭──────────────────────────────────────────────────────────╮
│ Curse Monitor                                            │
├──────────────────────────────────────────────────────────┤
│ Account  you@example.com                                 │
│ Plan     pro                                             │
│                                                          │
│ Included ████████████████████████  2000 / 2000  100.0%   │
│ Bonus    ░░░░░░░░░░░░░░░░░░░░░░░░  0 / 23214  0.0%       │
│ Pool     ██░░░░░░░░░░░░░░░░░░░░░░  2000 / 25214  7.9%    │
│ Auto %   ████████████████████████  100.0%                │
│ API %    ████████████████████████  100.0%                │
│ On-demand disabled                                       │
│                                                          │
│ Cycle    Sep 1 → Oct 1 (17d until reset)                 │
│                                                          │
│ ⚠ Stale 100% banner — 23,214 bonus credits remain        │
╰──────────────────────────────────────────────────────────╯
```

## Plugin (Grok Bot / Cursor agents)

Marketplace-ready package under `plugin/`:

```text
plugin/
  .cursor-plugin/plugin.json
  .cursor-plugin/marketplace.json
  assets/logo.png (+ svg)
  skills/… (status, watch, overview)
  README.md · LICENSE · CHANGELOG.md
```

Install the CLI first (`npm link` from this repo), then point Cursor / Grok Bot at the `plugin/` directory. Skills teach agents to run:

`curse-monitor status | json | whoami | watch`

See [PLUGIN_STORE.md](./PLUGIN_STORE.md) for Cursor Marketplace submission steps.

## Data types

| Field | Source | Notes |
|-------|--------|-------|
| Included pool | `individualUsage.plan.breakdown.included` / `limit` | Bar + used/total |
| Bonus / Agent credits | `plan.breakdown.bonus` | Shown when bonus > 0 |
| Combined pool | included + bonus (`breakdown.total`) | Remaining drives at-limit |
| Auto % | `plan.autoPercentUsed` | Always when present |
| API % | `plan.apiPercentUsed` | Always when present |
| On-demand | `individualUsage.onDemand` | Cents → USD when values look like cents |
| Team on-demand | `teamUsage.onDemand` | When enabled |
| Cycle / days until reset | `billingCycleStart` / `End` | Countdown |
| Stale 100% banner | derived | Yellow when API says 100% but `pool.remaining > 0` |
| Membership / team | summary + Stripe profile | `isTeamMember`, `teamId` |
| Limit type / unlimited | `limitType`, `isUnlimited` | Plan metadata |

## Library API

```ts
import {
  resolveAuth,
  fetchSnapshot,
  buildBudgetMetrics,
  resolveUsagePlanPool,
  formatStatusBoard,
} from "curse-monitor";

const auth = resolveAuth();
const snap = await fetchSnapshot(auth.accessToken, { email: auth.email });
console.log(formatStatusBoard(snap));
```

Endpoints used (Bearer token):

- `GET https://api2.cursor.sh/auth/usage-summary`
- `GET https://api2.cursor.sh/auth/full_stripe_profile`

## Sibling product

This CLI/plugin is a companion to the full **Cursor Curse Monitor** experience at [cursor.lorapok.tech](https://cursor.lorapok.tech).  
More from Lorapok Labs: [lorapok.tech](https://lorapok.tech).

## Scripts

| Script | Action |
|--------|--------|
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Run CLI (`node dist/cli.js`) |
| `npm run cli` | Alias for start |
| `npm run demo` | Offline fixture status board |

## Privacy

- All auth stays on your machine.
- Network calls go only to `api2.cursor.sh` with your session token.
- No telemetry, no credential vault files, no token echo.

## License

MIT © Lorapok Labs / Mohammad Maizied Hasan Majumder
