import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.CLEARPATH_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({
    clearpathVersion: 3,
    debts: [{ id: 7, name: "Lazada PayLater", category: "BNPL (Pay Later)", balance: 43000, startingBalance: 43000, rate: 0, minimum: 5000, planned: 5000, dueDay: 18, creditLimit: 60000, color: "#86D3B4" }],
    bills: [], transactions: [], monthlyDueSchedules: [],
    incomeEntries: [{ id: 1, type: "Salary", name: "Salary", amount: 38300, date: "2026-10-15", recurrence: "monthly", note: "" }, { id: 2, type: "13th Month Pay", name: "13th Month Pay", amount: 38300, date: "2026-11-20", recurrence: "one-time", note: "" }],
    cashBuffer: 5000, strategy: "avalanche", textSize: "standard", dueSoonThreshold: 3,
  }));
});
await page.goto(`${base}/debts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

await page.getByRole("button", { name: "Manage upcoming dues" }).click();
await page.getByLabel("Month 1").fill("2026-10");
await page.getByLabel("Required due 1").fill("7850");
await page.getByLabel("Planned payment 1").fill("7850");
await page.getByRole("button", { name: /Add another month/ }).click();
await page.getByLabel("Month 2").fill("2026-11");
await page.getByLabel("Required due 2").fill("5120");
await page.getByLabel("Planned payment 2").fill("5120");
await page.getByRole("button", { name: /Add another month/ }).click();
await page.getByLabel("Month 3").fill("2026-12");
await page.getByLabel("Required due 3").fill("2900");
await page.getByLabel("Planned payment 3").fill("2900");
await page.getByRole("button", { name: "Save upcoming dues" }).click();

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
const month = page.getByLabel("Viewing month");
const checklistAmount = page.locator(".check-row").filter({ hasText: "Lazada PayLater" }).locator(".check-amount");
const incomeTotal = page.locator(".cash-grid article").filter({ hasText: "INCOME" }).locator("strong");
for (const [selected, expected] of [["2026-10", "₱7,850"], ["2026-11", "₱5,120"], ["2026-12", "₱2,900"], ["2027-01", "₱5,000"]]) {
  await month.fill(selected);
  assert.equal((await checklistAmount.innerText()).trim(), expected);
}
await month.fill("2026-10");
assert.equal(await incomeTotal.innerText(), "₱38,300");
await month.fill("2026-11");
assert.equal(await incomeTotal.innerText(), "₱76,600");
await month.fill("2026-12");
assert.equal(await incomeTotal.innerText(), "₱38,300");
assert.match(await page.locator(".cash-grid").innerText(), /PROJECTED SAFE TO ALLOCATE/);

await page.goto(`${base}/debts`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.getByLabel("Viewing month").fill("2026-12");
assert.match(await page.locator(".projection-summary").innerText(), /PROJECTED TOTAL DEBT[\s\S]*₱27,130[\s\S]*CURRENT TOTAL DEBT[\s\S]*₱43,000/);
const lazadaCard = page.locator(".debt-card").filter({ hasText: "Lazada PayLater" });
assert.match(await lazadaCard.innerText(), /Projected balance by Dec 31[\s\S]*₱27,130[\s\S]*Current balance[\s\S]*₱43,000/);

await page.getByRole("button", { name: "Manage upcoming dues" }).click();
await page.getByLabel("Required due 1").fill("8100");
await page.getByLabel("Planned payment 1").fill("8100");
await page.getByRole("button", { name: "Save upcoming dues" }).click();
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("clearpath-plan-v4-php")));
assert.equal(stored.monthlyDueSchedules.find(due => due.month === "2026-10").dueAmount, 8100);
assert.equal(stored.monthlyDueSchedules.find(due => due.month === "2026-11").dueAmount, 5120);

await page.goto(`${base}/settings`, { waitUntil: "domcontentloaded" });
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Export backup" }).click();
const download = await downloadPromise;
const backupPath = await download.path();
const backup = JSON.parse(await (await import("node:fs/promises")).readFile(backupPath, "utf8"));
assert.equal(backup.monthlyDueSchedules.length, 3);
assert.equal(backup.clearpathVersion, 3);
await page.evaluate(() => {
  const plan = JSON.parse(localStorage.getItem("clearpath-plan-v4-php"));
  plan.monthlyDueSchedules = [];
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify(plan));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
page.once("dialog", dialog => dialog.accept());
await page.locator('input[type="file"]').setInputFiles(backupPath);
await page.waitForTimeout(500);
assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem("clearpath-plan-v4-php")))).monthlyDueSchedules.length, 3);

await page.evaluate(() => {
  const plan = JSON.parse(localStorage.getItem("clearpath-plan-v4-php"));
  plan.bills = [{ id: 1, name: "Fixed expenses", category: "Other", amount: 15000, budget: 15000, type: "fixed", dueDay: 1 }];
  const december = plan.monthlyDueSchedules.find(due => due.month === "2026-12");
  december.dueAmount = 20000;
  december.minimumAmount = 20000;
  december.plannedPayment = 20000;
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify(plan));
});
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
await page.getByLabel("Viewing month").fill("2026-12");
const resultCard = page.locator(".cash-grid article").filter({ hasText: "PROJECTED SHORTFALL" });
assert.equal(await resultCard.locator("strong").innerText(), "₱1,700");

console.log("Playwright Phase 2 checks passed.");
await browser.close();
