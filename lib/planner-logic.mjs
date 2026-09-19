export function calculateSafeExtra(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, income - fixedExpenses - minimums - protectedBuffer);
}

export function calculateMinimumGap(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, fixedExpenses + minimums + protectedBuffer - income);
}

export function getPaymentStatus(paid, minimum, planned) {
  if (paid >= planned) return "planned";
  if (paid >= minimum) return "minimum";
  if (paid > 0) return "partial";
  return "due";
}

export function estimatePayoffMonths(debts, extra, strategy, maxMonths = 240) {
  const balances = debts.map((debt) => ({ balance: debt.balance, minimum: debt.minimum, rate: debt.rate }));
  let months = 0;
  while (balances.some((debt) => debt.balance > 0.5) && months < maxMonths) {
    let remainingExtra = Math.max(0, extra);
    const order = [...balances].sort((a, b) => strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate);
    for (const debt of order) {
      const payment = Math.min(debt.balance, debt.minimum + remainingExtra);
      debt.balance = Math.max(0, debt.balance - payment);
      remainingExtra = Math.max(0, remainingExtra - Math.max(0, payment - debt.minimum));
    }
    months += 1;
  }
  return months;
}
