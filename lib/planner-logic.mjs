export function calculateSafeExtra(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, income - fixedExpenses - minimums - protectedBuffer);
}

export function calculateMinimumGap(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, fixedExpenses + minimums + protectedBuffer - income);
}

export function getPaymentStatus(paid, minimum, planned, dueDate = null, today = new Date()) {
  if (paid >= planned) return "planned";
  if (paid >= minimum) return "minimum";
  if (paid > 0) return "partial";
  if (dueDate) {
    const due = new Date(`${dueDate}T00:00:00`);
    const now = today instanceof Date ? today : new Date(today);
    const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((due.getTime() - current.getTime()) / 86400000);
    if (days < 0) return "overdue";
    if (days === 0) return "due today";
    if (days <= 3) return "due soon";
    return "upcoming";
  }
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
