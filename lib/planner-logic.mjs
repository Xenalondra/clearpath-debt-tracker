export function isRevolvingDebt(debt) {
  return debt.revolving === true || ["Credit Card", "Revolving Credit", "Revolving Credit / Credit Line", "Credit Line", "Wallet/App Revolving Credit"].includes(debt.category);
}
export function shouldCompleteDebt(debt, balance) {
  return !isRevolvingDebt(debt) && balance <= .01;
}
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

export function getDebtFirstPaymentMonth(debt) {
  // Read supported legacy aliases without guessing from creation timestamps.
  const values = [debt.firstPaymentMonth,debt.startMonth,typeof debt.paymentStartDate === "string" ? debt.paymentStartDate.slice(0,7) : null];
  return values.find(value=>typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) ?? null;
}

export function debtPlanForMonth(debt, month, monthlyDues = [], paymentVersions = []) {
  const firstPaymentMonth = getDebtFirstPaymentMonth(debt);
  if (firstPaymentMonth && month < firstPaymentMonth) return {minimum:0,planned:0,dueDay:debt.dueDay,isOverride:false};
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

// Legacy payments keep their original meaning without rewriting the ledger.
export function transactionDate(row) { return row.transactionDate ?? row.date; }
export function paymentAppliedMonth(row) { return row.appliedMonth ?? transactionDate(row)?.slice(0,7); }
const debtPayment=(row,id)=>(row.entity??"debt")==="debt"&&row.debtId===id&&row.kind==="payment";
const moneyRound=value=>Math.round(value*100)/100;
function legacyBnplCarry(debt,month,monthlyDues,transactions){
  if(!debt.variableMonthlyDues||debt.category!=="BNPL (Pay Later)")return 0;
  const required=monthlyDues.filter(row=>row.debtId===debt.id&&row.month<month).reduce((sum,row)=>sum+Number(row.dueAmount??row.minimumAmount??0),0);
  const paid=transactions.filter(row=>debtPayment(row,debt.id)&&transactionDate(row)?.slice(0,7)<month&&paymentAppliedMonth(row)<month&&(row.appliedMonth||monthlyDues.some(due=>due.debtId===debt.id&&due.month===paymentAppliedMonth(row)))).reduce((sum,row)=>sum+row.amount,0);
  return Math.max(0,moneyRound(paid-required));
}
export function debtObligationPaid(debt,month,monthlyDues=[],transactions=[]){
  return moneyRound(transactions.filter(row=>debtPayment(row,debt.id)&&paymentAppliedMonth(row)===month).reduce((sum,row)=>sum+row.amount,0)+legacyBnplCarry(debt,month,monthlyDues,transactions));
}
export function debtAdvancePaid(debt,month,transactions=[]){
  return moneyRound(transactions.filter(row=>debtPayment(row,debt.id)&&paymentAppliedMonth(row)===month&&transactionDate(row)?.slice(0,7)<month).reduce((sum,row)=>sum+row.amount,0));
}
export function advanceDebtCashForMonth(month,transactions=[]){
  return moneyRound(transactions.filter(row=>(row.entity??"debt")==="debt"&&row.kind==="payment"&&transactionDate(row)?.slice(0,7)===month&&paymentAppliedMonth(row)>month).reduce((sum,row)=>sum+row.amount,0));
}
export function debtBalanceCredit(debt,month,monthlyDues=[],transactions=[]){
  return moneyRound(transactions.filter(row=>debtPayment(row,debt.id)&&transactionDate(row)?.slice(0,7)===month).reduce((sum,row)=>sum+row.amount,0)+historicalBnplCredit(debt,month,monthlyDues,transactions));
}
export function advanceObligation(debt,month,currentMonth,monthlyDues=[],paymentVersions=[],transactions=[]){
  const paid=debtObligationPaid(debt,month,monthlyDues,transactions);
  const required=Math.min(debtPlanForMonth(debt,month,monthlyDues,paymentVersions).minimum,getActualRemainingDebtBalance(debt,currentMonth,monthlyDues,transactions)+paid);
  return {required,paid,remaining:Math.max(0,moneyRound(required-paid))};
}

export function historicalBnplCredit(debt, asOfMonth, monthlyDues = [], transactions = []) {
  if (!debt.variableMonthlyDues || debt.category !== "BNPL (Pay Later)") return 0;
  const pendingAdvance=transactions.filter(row=>debtPayment(row,debt.id)&&row.appliedMonth&&transactionDate(row)?.slice(0,7)<asOfMonth&&row.appliedMonth>=asOfMonth).reduce((sum,row)=>sum+row.amount,0);
  return moneyRound(legacyBnplCarry(debt,asOfMonth,monthlyDues,transactions)+pendingAdvance);
}

// Actual liability, never the selected month's obligation or a forecast.
export function getActualRemainingDebtBalance(debt, asOfMonth, monthlyDues = [], transactions = []) {
  if (debt.status === "completed") return 0;
  return getBnplScheduledBalance(debt,asOfMonth,monthlyDues,debtBalanceCredit(debt,asOfMonth,monthlyDues,transactions));
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
/** @param {Array<any>|null} [transactions] */
export function projectDebtTimeline(debt, fromMonth, throughMonth, monthlyDues = [], paymentVersions = [], currentMonthPaid = 0, transactions = null) {
  let balance = getBnplScheduledBalance(debt, fromMonth, monthlyDues, currentMonthPaid);
  return monthSequence(fromMonth, throughMonth).map(month => {
    const plan = debtPlanForMonth(debt, month, monthlyDues, paymentVersions);
    const opening = balance;
    const interest = balance > .01 && debt.rate > 0 ? Math.round(balance * debt.rate / 100 / 12 * 100) / 100 : 0;
    const available = Math.round((balance + interest) * 100) / 100;
    const paid = transactions ? debtObligationPaid(debt,month,monthlyDues,transactions) : month===fromMonth?currentMonthPaid:0;
    const remainingDue = Math.max(0, plan.minimum - paid);
    const payment = Math.min(available, remainingDue);
    balance = Math.max(0, Math.round((available - payment) * 100) / 100);
    return { month, opening, interest, payment, closing: balance, configured: plan.minimum, dueDay: plan.dueDay, isOverride: plan.isOverride };
  });
}
/** @param {Array<any>|null} [transactions] */
export function projectDebtBalance(debt, fromMonth, throughMonth, monthlyDues = [], paymentVersions = [], currentMonthPaid = 0, transactions = null) {
  return projectDebtTimeline(debt, fromMonth, throughMonth, monthlyDues, paymentVersions, currentMonthPaid,transactions).at(-1)?.closing ?? getBnplScheduledBalance(debt, fromMonth, monthlyDues, currentMonthPaid);
}
/** @param {Array<any>|null} [transactions] */
export function effectiveDebtPlan(debt, month, currentMonth, monthlyDues = [], paymentVersions = [], paid = 0, transactions = null) {
  const configured = debtPlanForMonth(debt, month, monthlyDues, paymentVersions);
  const allocated=transactions?debtObligationPaid(debt,month,monthlyDues,transactions):0;
  if(debt.status!=="archived"&&debt.status==="completed"&&transactions&&debtAdvancePaid(debt,month,transactions)>.01)return {...configured,minimum:Math.min(configured.minimum,allocated),planned:Math.min(configured.minimum,allocated)};
  if (debt.status === "archived" || (debt.status === "completed" && (!debt.completedDate || month > debt.completedDate.slice(0,7)))) return {...configured,minimum:0,planned:0};
  if (month === currentMonth && isRevolvingDebt(debt) && getBnplScheduledBalance(debt,currentMonth,monthlyDues,paid) <= .01 && !configured.isOverride) return {...configured,minimum:0,planned:0};
  if(month <= currentMonth) return configured;
  const row = projectDebtTimeline(debt,currentMonth,month,monthlyDues,paymentVersions,paid,transactions).at(-1);
  const required=transactions&&allocated>0?advanceObligation(debt,month,currentMonth,monthlyDues,paymentVersions,transactions).required:row?.payment??0;
  return {...configured,minimum:required,planned:required};
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
    const reopen = isRevolvingDebt(debt) && debt.status === "completed";
    return {...rest,originalStartingBalance,minimum:required(debt.minimum,planned),variableMonthlyDues,status:reopen?"active":debt.status ?? "active",...(reopen?{completedDate:undefined}:{})};
  });
  const versions = (data.debtPaymentVersions ?? []).map(version => {
    const {planned,...rest}=version;
    return {...rest,minimum:required(version.minimum,planned)};
  });
  return {...data,clearpathVersion:6,debts,monthlyDueSchedules:dues,debtPaymentVersions:versions};
}
