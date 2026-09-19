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
for (const [kind, amount, expected] of [["interest", "500", /₱143,500/], ["fee", "200", /₱143,700/]]) {
  await page.getByRole("button", { name: "Record activity" }).first().click();
  await page.getByLabel("Activity type").selectOption(kind);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("dialog").getByRole("button", { name: "Record activity" }).click();
  assert.match(await page.locator(".debt-card").first().innerText(), expected);
}
await page.getByRole("button", { name: "Edit debt" }).first().click();
assert.ok(await page.getByRole("heading", { name: "Edit debt" }).isVisible());
await page.getByRole("button", { name: "Close" }).click();
await page.getByRole("button", { name: "Reconcile balance" }).first().click();
await page.getByLabel("Actual lender balance").fill("143000");
await page.getByLabel("Reason").fill("Matched test statement");
await page.getByRole("dialog").getByRole("button", { name: "Reconcile balance" }).click();
assert.match(await page.locator(".debt-card").first().innerText(), /₱143,000/);

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
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Export backup" }).click();
await downloadPromise;

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  const month = new Date().toISOString().slice(0, 7);
  const debts = Array.from({ length: 5 }, (_, index) => ({ id: index + 1, name: `Debt ${index + 1}`, category: "Personal Loan", balance: 10000, startingBalance: 11000, rate: 10, minimum: 1000, planned: 1000, dueDay: index + 1, creditLimit: 0, color: "#7257d9" }));
  const bills = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: `Expense ${index + 1}`, category: "Utilities", amount: 500, budget: 500, type: "fixed", dueDay: index + 10 }));
  const transactions = [
    ...debts.map((debt, index) => ({ id: 100 + index, entity: "debt", debtId: debt.id, kind: "payment", amount: 1000, date: `${month}-01`, note: "Fixture payment" })),
    ...bills.slice(0, 4).map((bill, index) => ({ id: 200 + index, entity: "expense", expenseId: bill.id, kind: "expense-payment", amount: 500, date: `${month}-02`, note: "Fixture expense payment" })),
  ];
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({ clearpathVersion: 2, debts, bills, transactions, incomeEntries: [], cashBuffer: 0, strategy: "avalanche", textSize: "standard", dueSoonThreshold: 3 }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(750);
assert.match(await page.locator("#month").innerText(), /9 paid · 2 still due/);
assert.equal(await page.locator('.checkbox-button[aria-pressed="true"]').count(), 9);
assert.equal(await page.locator('.checkbox-button[aria-pressed="false"]').count(), 2);
assert.match(await page.locator(".sidebar-bottom").innerText(), /9 of 11/);

await page.goto(`${base}/payments`, { waitUntil: "domcontentloaded" });
assert.ok(page.url().includes("/#month") || page.url().endsWith("/"));

console.log("Playwright foundation checks passed.");
await browser.close();
