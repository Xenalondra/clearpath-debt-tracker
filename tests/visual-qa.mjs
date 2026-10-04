import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.CLEARPATH_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

async function capture(name, route, action) {
  await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  if (action) await action();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `${name} has horizontal overflow`);
  await page.screenshot({ path: `/tmp/clearpath-${name}.png`, fullPage: false });
}

await capture("desktop-dashboard", "/");
await capture("desktop-debts", "/debts");
await capture("desktop-add-debt", "/debts", () => page.getByRole("button", { name: /Add debt/ }).click());
await capture("desktop-expenses", "/expenses");
await capture("desktop-settings", "/settings");

for (const width of [375, 390, 430]) {
  await page.setViewportSize({ width, height: 844 });
  await capture(`mobile-${width}-dashboard`, "/");
  await capture(`mobile-${width}-debts`, "/debts");
  await capture(`mobile-${width}-add-debt`, "/debts", () => page.getByRole("button", { name: /Add debt/ }).click());
  await capture(`mobile-${width}-expenses`, "/expenses");
}

console.log("Visual QA screenshots captured without horizontal overflow.");
await browser.close();
