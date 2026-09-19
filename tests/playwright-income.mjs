import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.CLEARPATH_URL || "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(base, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem("clearpath-plan-v4-php") || "{}");
  localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({ ...saved, incomeEntries: [] }));
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);

const monthInput = page.getByLabel("Viewing month");
const incomeTotal = page.locator(".cash-grid article").filter({ hasText: "INCOME" }).locator("strong");
async function addIncome(type, amount, date, recurrence) {
  await page.getByRole("button", { name: /Add income/ }).click();
  await page.getByLabel("Income type").selectOption({ label: type });
  if (recurrence) await page.getByLabel("Recurrence").selectOption(recurrence);
  else assert.equal(await page.getByLabel("Recurrence").inputValue(), "one-time");
  await page.getByLabel("Expected amount").fill(amount);
  await page.getByLabel("Expected date").fill(date);
  await page.getByRole("dialog").getByRole("button", { name: "Add income" }).click();
}

await monthInput.fill("2026-09");
await addIncome("Salary", "38300", "2026-09-15", "monthly");
assert.match(await page.locator(".income-strip").innerText(), /Salary[\s\S]*Monthly · 15th[\s\S]*₱38,300/);
assert.equal(await incomeTotal.innerText(), "₱38,300");
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(500);
assert.equal(await incomeTotal.innerText(), "₱38,300");

await addIncome("13th Month Pay", "38300", "2026-11-20");
await monthInput.fill("2026-11");
assert.equal(await incomeTotal.innerText(), "₱76,600");
assert.match(await page.locator(".income-strip").innerText(), /13th Month Pay[\s\S]*Nov 20 · One-time/);
await monthInput.fill("2026-12");
assert.equal(await incomeTotal.innerText(), "₱38,300");

await addIncome("14th Month Pay", "38300", "2027-07-15");
await monthInput.fill("2027-07");
assert.equal(await incomeTotal.innerText(), "₱76,600");
await monthInput.fill("2027-08");
assert.equal(await incomeTotal.innerText(), "₱38,300");

await monthInput.fill("2026-09");
await addIncome("Bonus", "10000", "2026-09-30");
assert.equal(await incomeTotal.innerText(), "₱48,300");
const bonusCard = page.locator(".income-chip").filter({ hasText: "Bonus" });
await bonusCard.getByRole("button", { name: /Income actions/ }).click();
await bonusCard.getByRole("button", { name: "Edit" }).click();
assert.equal(await page.getByLabel("Income type").inputValue(), "Bonus");
assert.equal(await page.getByLabel("Recurrence").inputValue(), "one-time");
await page.getByLabel("Expected amount").fill("12000");
await page.getByRole("button", { name: "Save income" }).click();
assert.equal(await incomeTotal.innerText(), "₱50,300");

const editedBonus = page.locator(".income-chip").filter({ hasText: "Bonus" });
await editedBonus.getByRole("button", { name: /Income actions/ }).click();
page.once("dialog", dialog => dialog.accept());
await editedBonus.getByRole("button", { name: "Delete" }).click();
assert.equal(await page.locator(".income-chip").filter({ hasText: "Bonus" }).count(), 0);
assert.equal(await incomeTotal.innerText(), "₱38,300");

for (const [type, expectedName] of [["Overtime Pay", "Overtime Pay"], ["Side Income", "Side Income"], ["Extra / Other Income", "Extra Income"]]) {
  await page.getByRole("button", { name: /Add income/ }).click();
  await page.getByLabel("Income type").selectOption({ label: type });
  assert.equal(await page.getByLabel("Name / description").inputValue(), expectedName);
  assert.equal(await page.getByLabel("Recurrence").inputValue(), "one-time");
  await page.getByRole("button", { name: "Close" }).click();
}

const summaryText = await page.locator(".cash-grid").innerText();
assert.match(summaryText, /SAFE TO ALLOCATE|SHORTFALL/);
assert.ok(!(await page.locator("body").innerText()).includes("Payday-to-payday"));

console.log("Playwright income management checks passed.");
await browser.close();
