import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.CLEARPATH_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({
    clearpathVersion: 4,
    debts: [{ id: 77, name: "Shop PayLater", category: "BNPL (Pay Later)", variableMonthlyDues: true, balance: 10000, startingBalance: 10000, rate: 0, minimum: 3000, planned: 3000, dueDay: 18, creditLimit: 0, color: "#86D3B4" }],
    bills: [],
    transactions: [{ id: 1, entity: "debt", debtId: 77, kind: "payment", amount: 1000, date: "2026-10-04", note: "Partial payment" }],
    incomeEntries: [{ id: 1, type: "Salary", name: "Salary", amount: 10000, date: "2026-10-15", recurrence: "monthly", note: "" }],
    monthlyDueSchedules: [
      { id: 1, debtId: 77, month: "2026-10", dueAmount: 3200, minimumAmount: 3200, plannedPayment: 3500, dueDay: 18, note: "" },
      { id: 2, debtId: 77, month: "2026-11", dueAmount: 8000, minimumAmount: 8000, plannedPayment: 8000, dueDay: 18, note: "" },
      { id: 3, debtId: 77, month: "2026-12", dueAmount: 1900, minimumAmount: 1900, plannedPayment: 1900, dueDay: 18, note: "" },
    ],
    debtPaymentVersions: [], cashBuffer: 0, strategy: "avalanche", textSize: "standard", dueSoonThreshold: 3,
  }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);

const row = page.locator(".check-row").filter({ hasText: "Shop PayLater" });
assert.match(await row.innerText(), /₱3,500/);
assert.match(await row.innerText(), /₱1,000 paid/);
await row.getByRole("button", { name: "Pay Shop PayLater" }).click();
await page.waitForTimeout(150);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("clearpath-plan-v4-php")));
const octoberPaid = stored.transactions.filter(txn => txn.debtId === 77 && txn.kind === "payment" && txn.date.startsWith("2026-10")).reduce((sum, txn) => sum + txn.amount, 0);
assert.equal(octoberPaid, 3500);

await page.getByLabel("Viewing month").fill("2026-11");
const summary = page.locator(".cash-grid");
assert.match(await summary.innerText(), /DEBT PAYMENTS[\s\S]*₱8,000[\s\S]*₱8,000 required/);
assert.match(await summary.innerText(), /PROJECTED SAFE TO ALLOCATE[\s\S]*₱2,000/);

await page.goto(`${base}/debts`, { waitUntil: "domcontentloaded" });
await page.getByLabel("Viewing month").fill("2026-12");
const card = page.locator(".debt-card").filter({ hasText: "Shop PayLater" });
assert.match(await card.innerText(), /December planned[\s\S]*₱1,900[\s\S]*Required ₱1,900/);
assert.match(await card.innerText(), /₱0/);

await page.getByRole("button", { name: "Monthly dues" }).click();
assert.equal(await page.getByLabel("Number of upcoming months").inputValue(), "3");
assert.equal(await page.getByLabel("Required due 2").inputValue(), "8000");
assert.ok((await page.locator("body").evaluate(el => el.scrollWidth <= el.clientWidth)));

const exact = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await exact.goto(base, { waitUntil: "domcontentloaded" });
await exact.evaluate(() => {
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({
    clearpathVersion: 4,
    debts: [{ id: 16, name: "Test BNPL", category: "BNPL (Pay Later)", variableMonthlyDues: true, balance: 1000, startingBalance: 1000, rate: 0, minimum: 0, planned: 0, dueDay: 16, creditLimit: 0, color: "#93C5FD" }],
    bills: [], transactions: [], incomeEntries: [], debtPaymentVersions: [],
    monthlyDueSchedules: [
      { id: 1, debtId: 16, month: "2026-10", dueAmount: 543, minimumAmount: 543, plannedPayment: 543, dueDay: 16, note: "" },
      { id: 2, debtId: 16, month: "2026-11", dueAmount: 1234, minimumAmount: 1234, plannedPayment: 1234, dueDay: 16, note: "" },
      { id: 3, debtId: 16, month: "2026-12", dueAmount: 600, minimumAmount: 600, plannedPayment: 600, dueDay: 16, note: "" },
      { id: 4, debtId: 16, month: "2027-01", dueAmount: 489.66, minimumAmount: 489.66, plannedPayment: 489.66, dueDay: 16, note: "" },
    ], cashBuffer: 0, strategy: "avalanche", textSize: "standard", dueSoonThreshold: 3,
  }));
});
await exact.goto(`${base}/debts`, { waitUntil: "domcontentloaded" });
await exact.getByLabel("Viewing month").fill("2026-12");
let exactCard = exact.locator(".debt-card").filter({ hasText: "Test BNPL" });
assert.match(await exactCard.innerText(), /Projected balance by Dec 31[\s\S]*₱489.66[\s\S]*Current balance[\s\S]*₱2,866.66[\s\S]*December planned[\s\S]*₱600[\s\S]*Required ₱600/);
await exact.getByLabel("Viewing month").fill("2027-01");
assert.match(await exactCard.innerText(), /Projected balance by Jan 31[\s\S]*₱0[\s\S]*Current balance[\s\S]*₱2,866.66/);

await exact.getByRole("button", { name: "Monthly dues" }).click();
assert.equal(await exact.getByLabel("Current balance").isVisible(), false);
assert.match(await exact.locator(".schedule-total").innerText(), /₱2,866.66/);
await exact.getByLabel("Required due 3").fill("800");
assert.equal(await exact.getByLabel("Planned payment 3").inputValue(), "800");
assert.match(await exact.locator(".schedule-total").innerText(), /₱3,066.66/);
await exact.getByRole("button", { name: "Save changes" }).click();
await exact.getByLabel("Viewing month").fill("2026-12");
exactCard = exact.locator(".debt-card").filter({ hasText: "Test BNPL" });
assert.match(await exactCard.innerText(), /Projected balance by Dec 31[\s\S]*₱489.66[\s\S]*December planned[\s\S]*₱800[\s\S]*Required ₱800/);

console.log("Playwright BNPL source-of-truth checks passed.");
await browser.close();
