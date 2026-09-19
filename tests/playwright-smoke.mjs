import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.CLEARPATH_URL || "http://localhost:3001";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.addInitScript(() => {
  if (!sessionStorage.getItem("clearpath-test-ready")) {
    localStorage.clear();
    sessionStorage.setItem("clearpath-test-ready", "1");
  }
});

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: "See what’s coming. Clear what’s next." }).waitFor();
await page.waitForTimeout(750);
const nav = page.getByRole("navigation", { name: "Main navigation" });
for (const label of ["Dashboard", "Debts", "Expenses", "Activity", "Settings"]) assert.equal(await nav.getByText(label, { exact: true }).count(), 1);
assert.equal(await nav.getByText("Payments", { exact: true }).count(), 0);
const body = await page.locator("body").innerText();
for (const removed of ["Payday-to-payday", "Cash timeline", "Lowest projected", "Balances & custom payments"]) assert.ok(!body.includes(removed));

const debtCheckbox = page.getByRole("button", { name: "Pay Student Loan" });
await debtCheckbox.click();
await page.getByText(/payment recorded for Student Loan/).waitFor();
assert.equal(await page.getByRole("button", { name: "Paid Student Loan" }).getAttribute("aria-pressed"), "true");
assert.match(await page.locator("#month").innerText(), /1 paid · 6 still due/);
await page.locator('summary[aria-label="More actions for Visa Platinum"]').click();
await page.getByRole("button", { name: "Pay different amount" }).click();
await page.getByLabel("Amount").fill("2000");
await page.getByRole("button", { name: "Record payment" }).click();
await page.getByText(/₱2,000 payment recorded for Visa Platinum/).waitFor();

await page.goto(`${base}/debts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(750);
await page.getByRole("button", { name: /Add debt/ }).click();
await page.getByRole("heading", { name: "Add a debt" }).waitFor();
assert.ok(await page.locator('input[name="name"]').isVisible());
await page.getByLabel("Debt name").fill("Test Debt");
await page.getByLabel("Current balance").fill("20000");
await page.getByLabel("APR / rate (%)").fill("10");
await page.getByLabel("Due day").fill("25");
await page.getByLabel("Minimum payment").fill("1000");
await page.getByLabel("Planned payment").fill("1500");
await page.getByRole("button", { name: "Add to plan" }).click();
await page.getByText("Test Debt", { exact: true }).waitFor();
await page.getByRole("button", { name: "Record activity" }).first().click();
assert.deepEqual(await page.locator('select[name="kind"] option').allTextContents(), ["New purchase / new borrowing", "Interest charged", "Fee charged"]);
await page.getByLabel("Amount").fill("3000");
await page.getByLabel("Note (optional)").fill("Test borrowing");
await page.getByRole("dialog").getByRole("button", { name: "Record activity" }).click();
assert.match(await page.locator(".debt-card").first().innerText(), /₱143,000/);
await page.getByRole("button", { name: "Edit debt" }).first().click();
assert.ok(await page.getByRole("heading", { name: "Edit debt" }).isVisible());
await page.getByRole("button", { name: "Close" }).click();

await page.goto(`${base}/expenses`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(750);
await page.getByRole("button", { name: /Add expense/ }).click();
for (const label of ["Expense type", "Budget / expected amount", "Actual amount (optional)", "Category"]) assert.ok(await page.getByLabel(label).isVisible());
await page.getByLabel("Name").fill("Test Internet");
await page.getByLabel("Due day").fill("20");
await page.getByLabel("Budget / expected amount").fill("1699");
await page.getByLabel("Category").selectOption({ label: "Utilities" });
await page.getByRole("button", { name: "Save expense" }).click();
await page.getByText("Test Internet", { exact: true }).waitFor();
const testExpense = page.locator(".expense-row").filter({ hasText: "Test Internet" });
await testExpense.getByRole("button", { name: "Edit" }).click();
assert.equal(await page.getByLabel("Name").inputValue(), "Test Internet");
await page.getByLabel("Name").fill("Test Internet Updated");
await page.getByLabel("Budget / expected amount").fill("1899");
await page.getByRole("button", { name: "Save expense" }).click();
await page.getByText("Test Internet Updated", { exact: true }).waitFor();
page.once("dialog", dialog => dialog.accept());
await page.locator(".expense-row").filter({ hasText: "Test Internet Updated" }).getByRole("button", { name: "Delete" }).click();
assert.equal(await page.getByText("Test Internet Updated", { exact: true }).count(), 0);

await page.goto(`${base}/settings`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(750);
assert.equal(await page.getByLabel("Viewing month").count(), 0);
assert.equal(await page.getByLabel("Currency").count(), 0);
assert.match(await page.locator(".info-row").innerText(), /Philippine Peso/);
assert.ok(await page.getByRole("button", { name: "Export backup" }).isVisible());

await page.goto(`${base}/payments`, { waitUntil: "domcontentloaded" });
assert.ok(page.url().includes("/#month") || page.url().endsWith("/"));

console.log("Playwright foundation checks passed.");
await browser.close();
