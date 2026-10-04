import test from "node:test";
import assert from "node:assert/strict";
import { calculateMinimumGap, calculateSafeExtra, debtPlanForMonth, estimatePayoffMonths, getPaymentStatus, monthSequence, projectDebtBalance } from "../lib/planner-logic.mjs";

test("safe extra protects fixed expenses, minimums, and buffer", () => {
  assert.equal(calculateSafeExtra(50000, 20000, 15000, 5000), 10000);
  assert.equal(calculateSafeExtra(30000, 20000, 15000, 5000), 0);
  assert.equal(calculateMinimumGap(30000, 20000, 15000, 5000), 10000);
});

test("payment status distinguishes partial, minimum, and planned payments", () => {
  assert.equal(getPaymentStatus(0, 1000, 2000), "due");
  assert.equal(getPaymentStatus(500, 1000, 2000), "partial");
  assert.equal(getPaymentStatus(1000, 1000, 2000), "minimum");
  assert.equal(getPaymentStatus(2000, 1000, 2000), "planned");
});

test("payment status is date-aware when an obligation is unpaid", () => {
  const today = new Date("2026-09-19T12:00:00");
  assert.equal(getPaymentStatus(0, 1000, 2000, "2026-09-10", today), "overdue");
  assert.equal(getPaymentStatus(0, 1000, 2000, "2026-09-19", today), "due today");
  assert.equal(getPaymentStatus(0, 1000, 2000, "2026-09-21", today), "due soon");
  assert.equal(getPaymentStatus(0, 1000, 2000, "2026-09-30", today), "upcoming");
  assert.equal(getPaymentStatus(0, 1000, 2000, "2026-09-24", today, 5), "due soon");
});

test("payoff estimate responds to extra cash and payoff strategy", () => {
  const debts = [
    { balance: 6000, minimum: 1000, rate: 5 },
    { balance: 12000, minimum: 1000, rate: 25 },
  ];
  const minimumOnly = estimatePayoffMonths(debts, 0, "avalanche");
  const withExtra = estimatePayoffMonths(debts, 2000, "avalanche");
  assert.ok(withExtra < minimumOnly);
  assert.ok(estimatePayoffMonths(debts, 2000, "snowball") > 0);
});

test("month-specific dues override defaults without leaking into other months", () => {
  const debt = { id: 7, category: "BNPL (Pay Later)", variableMonthlyDues: true, minimum: 5000, planned: 5000, dueDay: 18 };
  const dues = [
    { id: 1, debtId: 7, month: "2026-10", dueAmount: 7850, minimumAmount: 7850, plannedPayment: 7850, dueDay: 18 },
    { id: 2, debtId: 7, month: "2026-11", dueAmount: 5120, minimumAmount: 5120, plannedPayment: 5120, dueDay: 18 },
  ];
  assert.deepEqual(debtPlanForMonth(debt, "2026-10", dues), { minimum: 7850, planned: 7850, dueDay: 18, isOverride: true });
  assert.deepEqual(debtPlanForMonth(debt, "2026-12", dues), { minimum: 5000, planned: 5000, dueDay: 18, isOverride: false });
});

test("0% BNPL projection uses each monthly plan and never mutates current balance", () => {
  const debt = { id: 7, category: "BNPL (Pay Later)", variableMonthlyDues: true, balance: 43000, minimum: 5000, planned: 5000, dueDay: 18, rate: 0 };
  const dues = [
    { debtId: 7, month: "2026-10", dueAmount: 7850, plannedPayment: 7850 },
    { debtId: 7, month: "2026-11", dueAmount: 5120, plannedPayment: 5120 },
    { debtId: 7, month: "2026-12", dueAmount: 2900, plannedPayment: 2900 },
  ];
  assert.deepEqual(monthSequence("2026-10", "2026-12"), ["2026-10", "2026-11", "2026-12"]);
  assert.equal(projectDebtBalance(debt, "2026-10", "2026-12", dues), 27130);
  assert.equal(debt.balance, 43000);
});

test("fixed BNPL mode ignores archived monthly rows", () => {
  const debt = { id: 7, category: "BNPL (Pay Later)", variableMonthlyDues: false, minimum: 3600, planned: 4000, dueDay: 18 };
  const dues = [{ debtId: 7, month: "2026-11", minimumAmount: 8000, plannedPayment: 9000, dueDay: 18 }];
  assert.deepEqual(debtPlanForMonth(debt, "2026-11", dues), { minimum: 3600, planned: 4000, dueDay: 18, isOverride: false });
});

test("variable BNPL required and planned values are resolved independently", () => {
  const debt = { id: 7, category: "BNPL (Pay Later)", variableMonthlyDues: true, minimum: 3000, planned: 3000, dueDay: 18 };
  const dues = [
    { debtId: 7, month: "2026-10", minimumAmount: 4000, plannedPayment: 4000, dueDay: 18 },
    { debtId: 7, month: "2026-11", minimumAmount: 3200, plannedPayment: 3500, dueDay: 18 },
    { debtId: 7, month: "2026-12", minimumAmount: 1900, plannedPayment: 1900, dueDay: 18 },
  ];
  assert.equal(debtPlanForMonth(debt, "2026-11", dues).minimum, 3200);
  assert.equal(debtPlanForMonth(debt, "2026-11", dues).planned, 3500);
  dues[1].minimumAmount = 3700;
  assert.equal(debtPlanForMonth(debt, "2026-10", dues).minimum, 4000);
  assert.equal(debtPlanForMonth(debt, "2026-11", dues).minimum, 3700);
  assert.equal(debtPlanForMonth(debt, "2026-12", dues).minimum, 1900);
});

test("variable BNPL projection uses each month's planned payment", () => {
  const debt = { id: 8, category: "BNPL (Pay Later)", variableMonthlyDues: true, balance: 10000, minimum: 1000, planned: 1000, dueDay: 18, rate: 0 };
  const dues = [
    { debtId: 8, month: "2026-10", minimumAmount: 4000, plannedPayment: 4000 },
    { debtId: 8, month: "2026-11", minimumAmount: 3200, plannedPayment: 3500 },
    { debtId: 8, month: "2026-12", minimumAmount: 1900, plannedPayment: 1900 },
  ];
  assert.equal(projectDebtBalance(debt, "2026-10", "2026-10", dues), 6000);
  assert.equal(projectDebtBalance(debt, "2026-10", "2026-11", dues), 2500);
  assert.equal(projectDebtBalance(debt, "2026-10", "2026-12", dues), 600);
});

test("APR projection consistently adds approximate monthly interest before payment", () => {
  const debt = { id: 1, balance: 12000, minimum: 1000, planned: 1000, dueDay: 1, rate: 12 };
  assert.equal(projectDebtBalance(debt, "2026-10", "2026-10", []), 11120);
});

test("dated default payment changes preserve earlier months", () => {
  const debt = { id: 4, minimum: 1000, planned: 1200, dueDay: 10 };
  const versions = [{ id: 1, debtId: 4, effectiveFrom: "2026-12", minimum: 1500, planned: 1800, dueDay: 12 }];
  assert.equal(debtPlanForMonth(debt, "2026-11", [], versions).planned, 1200);
  assert.deepEqual(debtPlanForMonth(debt, "2026-12", [], versions), { minimum: 1500, planned: 1800, dueDay: 12, isOverride: false });
});
