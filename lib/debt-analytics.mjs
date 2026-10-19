import { getActualRemainingDebtBalance, getOriginalStartingBalance, paymentAppliedMonth, transactionDate } from "./planner-logic.mjs";
import { balanceChartData } from "./chart-data.mjs";

const round = value => Math.round(value * 100) / 100;
const clamp = value => Math.min(100, Math.max(0, value));

// Read-only analytics. Starting snapshots and the transaction ledger are not altered.
export function reconstructBnplTrackedAmount(debt, currentBalance, transactions = [], monthlyDues = [], currentMonth) {
  if (debt.category !== "BNPL (Pay Later)" || !debt.variableMonthlyDues || !currentMonth) return null;
  const rows = monthlyDues.filter(row=>row.debtId===debt.id);
  if (!rows.length || new Set(rows.map(row=>row.month)).size !== rows.length) return null;
  if (rows.some(row=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)||!Number.isFinite(row.dueAmount??row.minimumAmount)||(row.dueAmount??row.minimumAmount)<0)) return null;
  const history = transactions.filter(row=>(row.entity??"debt")==="debt"&&row.debtId===debt.id);
  const payments = history.filter(row=>row.kind==="payment");
  // A remaining-only schedule is not proof of original liability. Every actual
  // payment must be covered by a retained schedule month and the full ledger
  // must reconcile to today's canonical remaining liability, to the cent.
  if (!payments.length || payments.some(row=>!Number.isFinite(row.amount)||row.amount<=0||typeof transactionDate(row)!=="string"||transactionDate(row).slice(0,7)>currentMonth||!rows.some(due=>due.month===paymentAppliedMonth(row)))) return null;
  if (history.some(row=>row.kind==="reconcile"&&row.amount!==0)) return null;
  const pending = debt.unscheduledCharges??0;
  if (!Number.isFinite(pending)||pending<0) return null;
  // Charges already reconciled into dues are already in this total; do not add
  // the activity ledger again. Only unreconciled charges are added once.
  const tracked = round(rows.reduce((sum,row)=>sum+(row.dueAmount??row.minimumAmount),0)+pending);
  const paid = round(payments.reduce((sum,row)=>sum+row.amount,0));
  if (tracked<=0 || paid>tracked+.01 || Math.abs(round(tracked-paid)-currentBalance)>.01) return null;
  return tracked;
}

export function debtProgress(debt, currentBalance, transactions = [], monthlyDues = [], currentMonth) {
  const starting = getOriginalStartingBalance(debt);
  if (starting === null) {
    const tracked = reconstructBnplTrackedAmount(debt,currentBalance,transactions,monthlyDues,currentMonth);
    if (tracked === null) return { tracked: null, reduced: null, percent: null };
    const reduced = round(Math.max(0,tracked-currentBalance));
    return {tracked,reduced,percent:clamp(reduced/tracked*100)};
  }
  const additions = transactions.filter(row => (row.entity ?? "debt") === "debt" && row.debtId === debt.id && ["borrowing", "interest", "fee", "reconcile"].includes(row.kind));
  if (additions.some(row => !Number.isFinite(Number(row.amount)))) return { tracked: null, reduced: null, percent: null };
  const tracked = round(starting + additions.reduce((sum,row) => sum + Math.max(0, Number(row.amount)),0));
  if (tracked <= 0) return { tracked, reduced: null, percent: null };
  const reduced = round(Math.max(0, tracked - Math.max(0,currentBalance)));
  return { tracked, reduced, percent: clamp(reduced / tracked * 100) };
}

export function debtAnalytics(debts, transactions, month, monthlyDues = []) {
  const entries = debts.filter(debt => debt.status !== "archived").map(debt => {
    const balance = getActualRemainingDebtBalance(debt,month,monthlyDues,transactions);
    const progress=debtProgress(debt,balance,transactions,monthlyDues,month);
    return { debt, balance, progress, isReliable:Number.isFinite(progress.tracked)&&progress.tracked>0&&Number.isFinite(progress.reduced)&&Number.isFinite(progress.percent) };
  });
  const active = entries.filter(row => row.debt.status !== "completed");
  const completed = entries.filter(row => row.debt.status === "completed");
  const remaining = round(active.reduce((sum,row) => sum + row.balance,0));
  const reliable = entries.filter(row=>row.isReliable);
  const excluded = entries.filter(row=>!reliable.includes(row)).map(row=>({id:row.debt.id,name:row.debt.name,reason:"Incomplete or unreliable history"}));
  const tracked = reliable.length ? round(reliable.reduce((sum,row) => sum + row.progress.tracked,0)) : null;
  const reduced = reliable.length ? round(reliable.reduce((sum,row) => sum + row.progress.reduced,0)) : null;
  const { byDebt, byCategory } = balanceChartData(active);
  const completedTracked = completed.length > 0 && completed.every(row => row.progress.tracked !== null && row.progress.percent !== null) ? round(completed.reduce((sum,row) => sum + row.progress.tracked,0)) : null;
  const latest = [...completed].sort((a,b) => (b.debt.completedDate ?? "").localeCompare(a.debt.completedDate ?? ""))[0]?.debt ?? null;
  return { active, completed, remaining, tracked, reduced, reliableCount:reliable.length,excluded, percent: tracked && reduced !== null ? clamp(reduced / tracked * 100) : null, byDebt, byCategory, cleared: completed.length, count: entries.length, completedTracked, latest };
}

// Sort copies, never the persisted array. Missing estimates/progress always go last.
export function browseDebts(entries, query = "", sort = "priority", strategy = "avalanche", priorityIds = []) {
  const search = query.trim().toLocaleLowerCase();
  const filtered = entries.filter(row => `${row.debt.name} ${row.debt.category}`.toLocaleLowerCase().includes(search));
  const optional = (a,b,direction = 1) => a == null ? (b == null ? 0 : 1) : b == null ? -1 : direction * (a - b);
  return [...filtered].sort((a,b) => {
    let result = 0;
    switch (sort) {
      case "highest-balance": result = b.balance - a.balance; break;
      case "lowest-balance": result = a.balance - b.balance; break;
      case "apr": result = b.debt.rate - a.debt.rate; break;
      case "due": result = a.dueDay - b.dueDay; break;
      case "payoff": result = optional(a.payoff ? Number(a.payoff.replace("-","")) : null,b.payoff ? Number(b.payoff.replace("-","")) : null); break;
      case "most-progress": result = optional(a.progress.percent,b.progress.percent,-1); break;
      case "least-progress": result = optional(a.progress.percent,b.progress.percent); break;
      default: {
        const ai = priorityIds.indexOf(a.debt.id), bi = priorityIds.indexOf(b.debt.id);
        result = optional(ai < 0 ? null : ai,bi < 0 ? null : bi) || (strategy === "snowball" ? a.balance - b.balance : b.debt.rate - a.debt.rate);
      }
    }
    return result || a.debt.name.localeCompare(b.debt.name) || a.debt.id - b.debt.id;
  });
}
