import test from "node:test";
import assert from "node:assert/strict";
import { calculateMinimumGap, calculateSafeExtra, estimatePayoffMonths, getPaymentStatus } from "../lib/planner-logic.mjs";

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
