# Changelog

## 0.3.0 — 2026-09-15

- Multi-account switching: `curse-monitor accounts` and `curse-monitor use <email|index|product>`
- `whoami --list` lists every discovered product-folder login (Cursor, dCursor, Nightly, Windsurf, …)
- Saved selection is an email + product pointer in `~/.config/curse-monitor/config.json` — **never** an access token
- Default when unset: prefer **dCursor** when `lorapokdev@gmail.com` is signed in; otherwise the first discovered folder
- `--token` and `CURSOR_TOKEN` still override; `--account` is a one-shot selector
- Plugin skills document `accounts` / `use`

## 0.2.0 — 2026-09-15

- `curse-monitor report` and `json --report` with group-by / range analytics
- Plugin template layout (`plugins/curse-monitor/` + root marketplace.json)
- Marketing site polish, SEO artifacts, optional CI Pages job
- API Worker stub for a later Mission Control connect (no tokens)

## 0.1.3

- Larvae logo variants and 0.1.3 packaging
