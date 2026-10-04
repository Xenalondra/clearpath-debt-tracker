export function calculateSafeExtra(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, income - fixedExpenses - minimums - protectedBuffer);
}

export function calculateMinimumGap(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, fixedExpenses + minimums + protectedBuffer - income);
}

export function getPaymentStatus(paid, minimum, planned, dueDate = null, today = new Date(), dueSoonThreshold = 3) {
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
    if (days <= dueSoonThreshold) return "due soon";
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

export function monthSequence(fromMonth, throughMonth) {
  if (throughMonth < fromMonth) return [];
  const months = [];
  const cursor = new Date(`${fromMonth}-02T12:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= throughMonth && months.length < 24) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function debtPlanForMonth(debt, month, monthlyDues = [], paymentVersions = []) {
  const scheduleEnabled = debt.category !== "BNPL (Pay Later)" || debt.variableMonthlyDues === true;
  const override = scheduleEnabled ? monthlyDues.find((due) => due.debtId === debt.id && due.month === month) : undefined;
  const version = paymentVersions.filter((item) => item.debtId === debt.id && item.effectiveFrom <= month).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return {
    minimum: override?.minimumAmount ?? override?.dueAmount ?? version?.minimum ?? debt.minimum,
    planned: override?.plannedPayment ?? override?.dueAmount ?? version?.planned ?? debt.planned,
    dueDay: override?.dueDay ?? version?.dueDay ?? debt.dueDay,
    isOverride: Boolean(override),
  };
}

// Monthly convention: opening balance + approximate APR/12 interest - planned payment = closing balance.
// No future purchases, fees, or borrowing are assumed unless a future schedule supports them.
export function projectDebtBalance(debt, fromMonth, throughMonth, monthlyDues = [], paymentVersions = [], currentMonthPaid = 0) {
  let balance = Math.max(0, Number(debt.balance) || 0);
  for (const month of monthSequence(fromMonth, throughMonth)) {
    const plan = debtPlanForMonth(debt, month, monthlyDues, paymentVersions);
    const interest = debt.rate > 0 ? balance * (debt.rate / 100 / 12) : 0;
    const payment = month === fromMonth ? Math.max(0, plan.planned - currentMonthPaid) : plan.planned;
    balance = Math.max(0, Math.round((balance + interest - payment) * 100) / 100);
  }
  return balance;
}
