# Curse Monitor API stub

Scaffold only. **Do not deploy secrets. Do not wire Cursor session tokens.**

This Worker will later sit next to sibling Mission Control at [cursor-dev.lorapok.tech](https://cursor-dev.lorapok.tech) (see that product’s admin `wrangler.toml` for KV/D1/R2/service-binding patterns). Curse Monitor stays CLI-local until that connect work is explicit.

## Routes

| Method | Path | Today |
|--------|------|--------|
| GET | `/api/curse-monitor/health` | Structured placeholder JSON |
| GET | `/api/curse-monitor/usage` | Placeholder (`usage: null`) + constraint text |

`usage` is **null on purpose**. The CLI is the live reader (`api2.cursor.sh` from the user’s machine). This stub must not invent quota numbers.

## Local (optional)

```bash
npx wrangler@latest dev api/src/index.js --config api/wrangler.jsonc
# GET http://127.0.0.1:8787/api/curse-monitor/health
```

Deploy is optional and gated on Cloudflare credentials you provide yourself (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). This repo does not include them.

## Future custom domain

When you are ready to bind this on Mission Control:

1. Create a Worker named `curse-monitor-api` in the same Cloudflare account as sibling Mission Control (do not commit account IDs that are not already public).
2. Route `https://cursor-dev.lorapok.tech/api/curse-monitor/*` to this Worker **or** add a Pages Functions proxy — same path prefix the marketing site documents.
3. Add auth later (session cookie / Mission Control RBAC). **Never** accept raw `CURSOR_TOKEN` in query strings or logs.
4. Keep live usage on-device in the CLI until that auth story is reviewed.

Custom domain example (not enabled here):

```jsonc
{
  "routes": [
    { "pattern": "cursor-dev.lorapok.tech/api/curse-monitor/*", "zone_name": "lorapok.tech" }
  ]
}
```

Do not add this block until DNS and the zone are intentionally configured.

## Constraint

Cursor API does not expose per-model dollar spend. Model breakdown is local active-model / analytics grouping plus Auto/API meters.
