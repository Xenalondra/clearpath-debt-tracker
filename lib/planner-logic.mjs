export function calculateSafeExtra(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, income - fixedExpenses - minimums - protectedBuffer);
}

export function calculateMinimumGap(income, fixedExpenses, minimums, protectedBuffer) {
  return Math.max(0, fixedExpenses + minimums + protectedBuffer - income);
}

/** @param {string|null} [dueDate] */
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
  while (cursor.toISOString().slice(0, 7) <= throughMonth && months.length < 240) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function debtPlanForMonth(debt, month, monthlyDues = [], paymentVersions = []) {
  const scheduleEnabled = debt.category !== "BNPL (Pay Later)" || debt.variableMonthlyDues === true;
  const override = scheduleEnabled ? monthlyDues.find((due) => due.debtId === debt.id && due.month === month) : undefined;
  const version = paymentVersions.filter((item) => item.debtId === debt.id && item.effectiveFrom <= month).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  const required = debt.category === "BNPL (Pay Later)" && debt.variableMonthlyDues && !override ? 0 : Number(override?.dueAmount ?? override?.minimumAmount ?? version?.minimum ?? debt.minimum ?? 0);
  return { minimum: required, planned: required, dueDay: debt.category === "BNPL (Pay Later)" ? (version?.dueDay ?? debt.dueDay) : (override?.dueDay ?? version?.dueDay ?? debt.dueDay), isOverride: Boolean(override) };
}

export function getBnplScheduledBalance(debt, asOfMonth, monthlyDues = [], currentMonthPaid = 0) {
  if (debt.category !== "BNPL (Pay Later)" || debt.variableMonthlyDues !== true) return Math.max(0, Number(debt.balance) || 0);
  const required = monthlyDues
    .filter((due) => due.debtId === debt.id && due.month >= asOfMonth)
    .reduce((sum, due) => sum + Number(due.dueAmount ?? due.minimumAmount ?? 0), 0);
  return Math.max(0, Math.round((required + (Number(debt.unscheduledCharges) || 0) - Math.max(0, Number(currentMonthPaid) || 0)) * 100) / 100);
}

export function historicalBnplCredit(debt, asOfMonth, monthlyDues = [], transactions = []) {
  if (!debt.variableMonthlyDues || debt.category !== "BNPL (Pay Later)") return 0;
  const historicalRequired = monthlyDues.filter(row=>row.debtId===debt.id && row.month<asOfMonth).reduce((sum,row)=>sum+Number(row.dueAmount??row.minimumAmount??0),0);
  const historicalPaid = transactions.filter(row=>row.debtId===debt.id && row.kind==="payment" && row.date.slice(0,7)<asOfMonth && monthlyDues.some(due=>due.debtId===debt.id && due.month===row.date.slice(0,7))).reduce((sum,row)=>sum+row.amount,0);
  return Math.max(0,Math.round((historicalPaid-historicalRequired)*100)/100);
}

// Actual liability, never the selected month's obligation or a forecast.
export function getActualRemainingDebtBalance(debt, asOfMonth, monthlyDues = [], transactions = []) {
  if (debt.status === "completed") return 0;
  const paid = transactions.filter(row => (row.entity ?? "debt") === "debt" && row.debtId === debt.id && row.kind === "payment" && row.date.slice(0,7) === asOfMonth).reduce((sum,row) => sum + Number(row.amount),0);
  return getBnplScheduledBalance(debt,asOfMonth,monthlyDues,paid + historicalBnplCredit(debt,asOfMonth,monthlyDues,transactions));
}

export function getOriginalStartingBalance(debt) {
  const value = debt.category === "BNPL (Pay Later)" && debt.variableMonthlyDues ? debt.originalStartingBalance : debt.startingBalance;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function isValidActualPayment(amount, remaining) {
  return Number.isFinite(amount) && amount > 0 && remaining > .01 && Math.round(amount * 100) <= Math.round(remaining * 100);
}

// Monthly convention: opening balance + approximate APR/12 interest - planned payment = closing balance.
// No future purchases, fees, or borrowing are assumed unless a future schedule supports them.
export function projectDebtTimeline(debt, fromMonth, throughMonth, monthlyDues = [], paymentVersions = [], currentMonthPaid = 0) {
  let balance = getBnplScheduledBalance(debt, fromMonth, monthlyDues, currentMonthPaid);
  return monthSequence(fromMonth, throughMonth).map(month => {
    const plan = debtPlanForMonth(debt, month, monthlyDues, paymentVersions);
    const opening = balance;
    const interest = balance > .01 && debt.rate > 0 ? Math.round(balance * debt.rate / 100 / 12 * 100) / 100 : 0;
    const available = Math.round((balance + interest) * 100) / 100;
    const remainingDue = month === fromMonth ? Math.max(0, plan.minimum - currentMonthPaid) : plan.minimum;
    const payment = Math.min(available, remainingDue);
    balance = Math.max(0, Math.round((available - payment) * 100) / 100);
    return { month, opening, interest, payment, closing: balance, configured: plan.minimum, dueDay: plan.dueDay, isOverride: plan.isOverride };
  });
}
export function projectDebtBalance(debt, fromMonth, throughMonth, monthlyDues = [], paymentVersions = [], currentMonthPaid = 0) {
  return projectDebtTimeline(debt, fromMonth, throughMonth, monthlyDues, paymentVersions, currentMonthPaid).at(-1)?.closing ?? getBnplScheduledBalance(debt, fromMonth, monthlyDues, currentMonthPaid);
}
export function effectiveDebtPlan(debt, month, currentMonth, monthlyDues = [], paymentVersions = [], paid = 0) {
  const configured = debtPlanForMonth(debt, month, monthlyDues, paymentVersions);
  if (debt.status === "archived" || (debt.status === "completed" && (!debt.completedDate || month > debt.completedDate.slice(0,7)))) return {...configured,minimum:0,planned:0};
  if(month <= currentMonth) return configured;
  const row = projectDebtTimeline(debt,currentMonth,month,monthlyDues,paymentVersions,paid).at(-1);
  return {...configured,minimum:row?.payment ?? 0,planned:row?.payment ?? 0};
}
export function migratePaymentModel(data) {
  const required = (value, fallback) => Number(value) > 0 ? Number(value) : Number(fallback) || 0;
  const dues = (data.monthlyDueSchedules ?? []).map(row => {
    const {plannedPayment, ...rest} = row;
    const amount = required(row.dueAmount ?? row.minimumAmount, plannedPayment);
    return {...rest,dueAmount:amount,minimumAmount:amount};
  });
  const debts = (data.debts ?? []).map(debt => {
    const {planned, ...rest} = debt;
    const variableMonthlyDues = debt.variableMonthlyDues ?? (debt.category==="BNPL (Pay Later)" && dues.some(row=>row.debtId===debt.id));
    // Old mutable schedules/manual balances cannot establish an original snapshot.
    // Preserve them for audit; show a neutral fallback rather than fabricate history.
    const originalStartingBalance = debt.category === "BNPL (Pay Later)" && variableMonthlyDues ? getOriginalStartingBalance({...debt,variableMonthlyDues}) : debt.originalStartingBalance;
    return {...rest,originalStartingBalance,minimum:required(debt.minimum,planned),variableMonthlyDues,status:debt.status ?? "active"};
  });
  const versions = (data.debtPaymentVersions ?? []).map(version => {
    const {planned,...rest}=version;
    return {...rest,minimum:required(version.minimum,planned)};
  });
  return {...data,clearpathVersion:6,debts,monthlyDueSchedules:dues,debtPaymentVersions:versions};
}
