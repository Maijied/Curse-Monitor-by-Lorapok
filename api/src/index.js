/**
 * Curse Monitor API stub (Cloudflare Worker).
 *
 * Scaffold only — do NOT wire live Cursor session tokens.
 * Later this can be bound on Mission Control (cursor-dev.lorapok.tech)
 * the same way sibling admin uses wrangler service bindings.
 */
const PRODUCT = "curse-monitor";
const VERSION = "0.3.0";
const CONSTRAINT =
  "Cursor API does not expose per-model dollar spend. Model breakdown is local active-model / analytics grouping plus Auto/API meters.";

const TODO_AUTH =
  "TODO: connect later. Do not send Cursor session tokens (state.vscdb / CURSOR_TOKEN) to this stub. Planned home: Mission Control at https://cursor-dev.lorapok.tech following sibling admin wrangler service-binding patterns — no secrets in this repo.";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-curse-monitor": "stub",
    },
  });
}

function healthBody() {
  return {
    ok: true,
    product: PRODUCT,
    version: VERSION,
    status: "stub",
    routes: ["/api/curse-monitor/health", "/api/curse-monitor/usage"],
    todo: TODO_AUTH,
  };
}

function usageBody() {
  return {
    ok: true,
    product: PRODUCT,
    version: VERSION,
    status: "stub",
    fetchedAt: new Date().toISOString(),
    usage: null,
    metrics: null,
    report: null,
    constraint: CONSTRAINT,
    note: "Placeholder only — no invented usage numbers. Live reads stay on the CLI until auth/connect is implemented.",
    todo: TODO_AUTH,
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/api/curse-monitor/health" || path === "/health") {
      return json(healthBody());
    }
    if (path === "/api/curse-monitor/usage" || path === "/usage") {
      return json(usageBody());
    }
    if (path === "/" || path === "/api/curse-monitor") {
      return json({
        ok: true,
        product: PRODUCT,
        version: VERSION,
        status: "stub",
        see: ["/api/curse-monitor/health", "/api/curse-monitor/usage"],
        todo: TODO_AUTH,
      });
    }

    return json({ ok: false, error: "not_found", path, todo: TODO_AUTH }, 404);
  },
};
