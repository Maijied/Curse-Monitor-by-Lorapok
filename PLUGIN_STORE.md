# Curse Monitor — Cursor Plugin Store checklist

Submit via **https://cursor.com/marketplace/publish** (public Git repository required).

Layout follows [cursor/plugin-template](https://github.com/cursor/plugin-template) (multi-plugin repo with a single plugin). There is **no** nested `plugin/plugin/` tree.

## What’s ready

| Item | Path |
|------|------|
| Marketplace manifest | `.cursor-plugin/marketplace.json` |
| Plugin manifest | `plugins/curse-monitor/.cursor-plugin/plugin.json` |
| Logo (Ward animated SVG, relative) | `plugins/curse-monitor/assets/logo-animated.svg` |
| Skills | `plugins/curse-monitor/skills/*/SKILL.md` |
| Commands | `plugins/curse-monitor/commands/report.md` |
| Plugin README | `plugins/curse-monitor/README.md` |
| License | `plugins/curse-monitor/LICENSE` (MIT) |
| Changelog | `plugins/curse-monitor/CHANGELOG.md` (0.3.0) |
| Validator | `npm run validate-template` |

Version **0.3.0** · Author **Lorapok Labs** · Homepage **https://curse.lorapok.tech**

## Submission checklist (Cursor docs)

- [x] Valid `.cursor-plugin/plugin.json` (`name` kebab-case: `curse-monitor`)
- [x] Marketplace entry `source` maps to `./plugins/curse-monitor`
- [x] Clear store-quality `description`
- [x] Skills have YAML frontmatter (`name`, `description`)
- [x] Logo committed and referenced with a relative path
- [x] `README.md` documents install + usage
- [x] Paths are relative (no `..`, no absolute paths)
- [x] Tested locally (`curse-monitor status|report|json|whoami|accounts|use|watch` — identity/use/demo pass; live API returns 401 without a fresh Cursor session)
- [x] Public Git repo URL ready for submission
- [x] `node scripts/validate-template.mjs` passes

## Remaining (publisher account — cannot be done from this agent)

1. Open https://cursor.com/marketplace/publish and submit `https://github.com/Maijied/Curse-Monitor-by-Lorapok`.
2. Optional: add GitHub repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` so CI can deploy Pages on `main`. Set variable `DEPLOY_API_STUB=true` only when you want the Worker stub published.
3. Optional: on GitHub, Settings → Rules → require a pull request before merging to `main` (this agent token cannot create rulesets).

## CI secrets (optional deploy)

Documented for humans — **do not commit tokens**:

| Secret / variable | Used for |
|-------------------|----------|
| `CLOUDFLARE_API_TOKEN` | Pages deploy job on `main` |
| `CLOUDFLARE_ACCOUNT_ID` | Pages / Worker account |
| `CLOUDFLARE_PAGES_PROJECT` | Optional; default `curse-monitor` |
| `DEPLOY_API_STUB` (variable) | Set to `true` only when you want the Worker stub published |

Jobs skip deploy when secrets are absent.

## Notes

- This product is **CLI + Grok Bot / Cursor agent plugin**, not the VS Code extension.
- Companion: [Cursor Curse Monitor](https://cursor.lorapok.tech) by Lorapok Labs.
- Quote: *Know your limits before they know you.*
- Cursor API does not expose per-model dollar spend.
