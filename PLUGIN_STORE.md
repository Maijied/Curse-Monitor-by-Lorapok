# Curse Monitor — Cursor Plugin Store checklist

Submit via **https://cursor.com/marketplace/publish** (public Git repository required).

Layout follows [cursor/plugin-template](https://github.com/cursor/plugin-template) (multi-plugin repo with a single plugin). There is **no** nested `plugin/plugin/` tree.

## What’s ready

| Item | Path |
|------|------|
| Marketplace manifest | `.cursor-plugin/marketplace.json` |
| Plugin manifest | `plugins/curse-monitor/.cursor-plugin/plugin.json` |
| Logo (animated SVG, relative) | `plugins/curse-monitor/assets/logo-animated.svg` |
| Skills | `plugins/curse-monitor/skills/*/SKILL.md` |
| Commands | `plugins/curse-monitor/commands/report.md` |
| Plugin README | `plugins/curse-monitor/README.md` |
| License | `plugins/curse-monitor/LICENSE` (MIT) |
| Changelog | `plugins/curse-monitor/CHANGELOG.md` (0.2.0) |
| Validator | `npm run validate-template` |

Version **0.2.0** · Author **Lorapok Labs** · Homepage **https://curse.lorapok.tech**

## Parent / user next steps

1. Keep this GitHub repo public (already: `Maijied/Curse-Monitor-by-Lorapok`).
2. Ensure `logo` in `plugin.json` stays a **relative** path (`assets/logo-animated.svg`) — no `..`, no absolute paths, file committed.
3. Run `npm run validate-template` (CI does this on every push/PR).
4. Open https://cursor.com/marketplace/publish and submit the **public repository URL**.
5. Confirm CLI is installable (`npm install && npm run build && npm link`).

## Submission checklist (Cursor docs)

- [ ] Valid `.cursor-plugin/plugin.json` (`name` kebab-case: `curse-monitor`)
- [ ] Marketplace entry `source` maps to `./plugins/curse-monitor`
- [ ] Clear store-quality `description`
- [ ] Skills have YAML frontmatter (`name`, `description`)
- [ ] Logo committed and referenced with a relative path
- [ ] `README.md` documents install + usage
- [ ] Paths are relative (no `..`, no absolute paths)
- [ ] Tested locally (`curse-monitor status|report|json|whoami|watch`)
- [ ] Public Git repo URL ready for submission
- [ ] `node scripts/validate-template.mjs` passes

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
