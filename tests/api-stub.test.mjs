import assert from "node:assert/strict";
import worker from "../api/src/index.js";

const health = await worker.fetch(new Request("https://example.test/api/curse-monitor/health"));
assert.equal(health.status, 200);
const healthBody = await health.json();
assert.equal(healthBody.ok, true);
assert.equal(healthBody.status, "stub");
assert.match(healthBody.todo, /Do not send Cursor session tokens/i);

const usage = await worker.fetch(new Request("https://example.test/api/curse-monitor/usage"));
assert.equal(usage.status, 200);
const usageBody = await usage.json();
assert.equal(usageBody.usage, null);
assert.equal(usageBody.metrics, null);
assert.match(usageBody.constraint, /does not expose per-model dollar spend/i);
assert.equal(Object.prototype.hasOwnProperty.call(usageBody, "accessToken"), false);
assert.equal(usageBody.todo.includes("connect later"), true);

const missing = await worker.fetch(new Request("https://example.test/nope"));
assert.equal(missing.status, 404);

console.log("api-stub.test.mjs: OK");
