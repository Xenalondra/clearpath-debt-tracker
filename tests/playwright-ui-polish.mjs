import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.CLEARPATH_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const month = new Date().toISOString().slice(0, 7);

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(({ month }) => {
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({
    clearpathVersion: 2,
    debts: [{ id: 1, name: "Custom Debt", category: "Credit Card", balance: 10000, startingBalance: 10000, rate: 12, minimum: 500, planned: 500, dueDay: 15, creditLimit: 20000, color: "#123456" }],
    bills: [], transactions: [],
    incomeEntries: [{ id: 1, type: "Salary", name: "Salary", amount: 38000, date: `${month}-15`, recurrence: "monthly", note: "" }],
    cashBuffer: 0, strategy: "avalanche", textSize: "standard", dueSoonThreshold: 3,
  }));
}, { month });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const incomeButton = page.getByRole("button", { name: "Income actions for Salary" });
await incomeButton.click();
const menu = page.getByRole("menu");
await menu.waitFor();
assert.ok(await menu.isVisible());

assert.ok(await page.getByRole("menuitem", { name: "Edit" }).isVisible());
assert.ok(await page.getByRole("menuitem", { name: "Delete" }).isVisible());
await page.getByText("See what’s coming. Clear what’s next.", {exact:false}).click();
assert.equal(await menu.count(), 0);
await incomeButton.click();
await page.keyboard.press("Escape");
assert.equal(await menu.count(), 0);
await incomeButton.click();
await page.getByRole("menuitem", { name: "Edit" }).click();
await page.getByRole("heading", { name: "Edit income" }).waitFor();
await page.getByRole("button", { name: "Close" }).click();

await page.goto(`${base}/debts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Add debt/ }).click();
await page.getByRole("button", { name: "Pastel green" }).click();
assert.equal(await page.getByRole("button", { name: "Pastel green" }).getAttribute("aria-pressed"), "true");
await page.getByLabel("Debt name").fill("Green Debt");
await page.getByLabel("Current balance").fill("5000");
await page.getByLabel("APR / rate (%)").fill("5");
await page.getByLabel("Due day").fill("20");
await page.getByLabel("Monthly payment", {exact:true}).fill("500");

await page.getByRole("button", { name: "Add to plan" }).click();
const greenCard = page.locator(".debt-card").filter({ hasText: "Green Debt" });
assert.equal(await greenCard.evaluate(element => getComputedStyle(element).borderTopColor), "rgb(134, 211, 180)");

const customCard = page.locator(".debt-card").filter({ hasText: "Custom Debt" });
await customCard.getByRole("button", { name: "Edit debt" }).click();
assert.equal(await page.getByRole("button", { name: "＋ Custom color" }).getAttribute("aria-pressed"), "true");
assert.equal(await page.getByLabel("Hex color").inputValue(), "#123456");
await page.getByRole("button", { name: "Pastel violet" }).click();
await page.getByRole("button", { name: "Save changes" }).click();
assert.equal(await customCard.evaluate(element => getComputedStyle(element).borderTopColor), "rgb(167, 139, 250)");

await greenCard.getByRole("button", { name: "Edit debt" }).click();
await page.getByRole("button", { name: "＋ Custom color" }).click();
await page.getByLabel("Hex color").fill("#ABCDEF");
await page.getByRole("button", { name: "Save changes" }).click();
assert.equal(await greenCard.evaluate(element => getComputedStyle(element).borderTopColor), "rgb(171, 205, 239)");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
assert.equal(await page.locator(".debt-card").filter({ hasText: "Green Debt" }).evaluate(element => getComputedStyle(element).borderTopColor), "rgb(171, 205, 239)");

await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: /Add debt/ }).click();
const swatches = page.locator(".color-swatches");
assert.ok((await swatches.boundingBox()).width <= 360);
for (const swatch of await swatches.getByRole("button").all()) assert.ok((await swatch.boundingBox()).width >= 40);

console.log("Playwright UI polish checks passed.");
await browser.close();
