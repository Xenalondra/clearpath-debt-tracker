import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Clearpath planner", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Clearpath/);
  assert.match(html, /Philippine pesos/);
  assert.match(html, /Payment checklist/);
  assert.match(html, /SMART PAYMENT PLAN/);
  assert.match(html, /See what’s coming\. Clear what’s next\./);
  assert.match(html, /Dashboard/);
  assert.match(html, /Debts/);
  assert.match(html, /Expenses/);
  assert.match(html, /Activity/);
  assert.match(html, /Settings/);
  assert.doesNotMatch(html, /Payday-to-payday|Cash timeline|Lowest projected|Balances &amp; custom payments/);
  assert.match(html, /manifest\.webmanifest/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton|codex-preview/);
});
