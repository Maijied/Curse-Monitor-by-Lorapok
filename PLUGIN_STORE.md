# Curse Monitor — Cursor Plugin Store checklist

Submit via **https://cursor.com/marketplace/publish** (public Git repository required).

## What’s ready on this box

| Item | Path |
|------|------|
| Plugin manifest | `plugin/.cursor-plugin/plugin.json` |
| Marketplace entry | `plugin/.cursor-plugin/marketplace.json` |
| Logo | `plugin/assets/logo.png` (+ `logo.svg`, `logo-static.svg`, icons) |
| Skills | `plugin/skills/*/SKILL.md` |
| Plugin README | `plugin/README.md` |
| License | `plugin/LICENSE` (MIT) |
| Changelog | `plugin/CHANGELOG.md` (0.1.2) |

Version **0.1.2** · Author **Lorapok Labs** · Homepage **https://cursor.lorapok.tech**

## Parent / user next steps

1. **Push a public Git repo** containing at least the `plugin/` tree (or the full `curse-monitor` project).  
   - No GitHub URL is invented here — create/push the repo yourself.
2. Ensure logos are committed and `logo` in `plugin.json` stays a relative path (`assets/logo.png`).
3. Open https://cursor.com/marketplace/publish and submit the **public repository URL**.
4. Confirm CLI is installable for end users (`npm install && npm run build && npm link` from the published repo, or your preferred distribution).

## Submission checklist (Cursor docs)

- [ ] Valid `.cursor-plugin/plugin.json` (`name` kebab-case: `curse-monitor`)
- [ ] Clear store-quality `description`
- [ ] Skills have YAML frontmatter (`name`, `description`)
- [ ] Logo committed and referenced with a relative path
- [ ] `README.md` documents install + usage
- [ ] Paths are relative (no `..`, no absolute paths)
- [ ] Tested locally (`curse-monitor status|json|whoami|watch`)
- [ ] Public Git repo URL ready for submission

## Notes

- This product is **CLI + Grok Bot / Cursor agent plugin**, not the VS Code extension.
- Companion: [Cursor Curse Monitor](https://cursor.lorapok.tech) by Lorapok Labs.
- Quote: *Know your limits before they know you.*
