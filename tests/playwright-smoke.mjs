import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("https://clearpath-debt-planner.secretofwings31.chatgpt.site/", { waitUntil: "networkidle" });

await page.getByRole("heading", { name: /Your .* plan/ }).waitFor();
assert.match(await page.locator("body").innerText(), /Payment checklist/);
assert.match(await page.locator("body").innerText(), /BALANCE BY CATEGORY/);
assert.match(await page.locator("body").innerText(), /Protected buffer/);
assert.match(await page.locator("body").innerText(), /Estimated debt-free date/);

await page.getByRole("button", { name: "Snowball" }).click();
assert.match(await page.locator("#strategy").innerText(), /smallest balance/i);

await page.getByRole("button", { name: /Add income/ }).first().click();
await page.getByRole("heading", { name: "Add income" }).waitFor();
assert.ok(await page.locator("input[name=name]").count());
await page.getByRole("button", { name: "Close" }).click();

await page.locator("input[type=month]").fill("2026-10");
assert.match(await page.locator("body").innerText(), /October 2026/);

for (const route of ["/payments", "/debts", "/expenses", "/activity", "/settings"]) {
  const response = await page.goto(`https://clearpath-debt-planner.secretofwings31.chatgpt.site${route}`, { waitUntil: "networkidle" });
  assert.equal(response?.status(), 200, `${route} should load`);
  await page.getByRole("heading", { name: /Your .* plan/ }).waitFor();
}

console.log("Playwright smoke test passed: live Clearpath planner loads and core interactions work.");
await browser.close();
