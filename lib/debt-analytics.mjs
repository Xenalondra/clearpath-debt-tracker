import { getActualRemainingDebtBalance, getOriginalStartingBalance } from "./planner-logic.mjs";

const round = value => Math.round(value * 100) / 100;
const clamp = value => Math.min(100, Math.max(0, value));

// Read-only analytics. Starting snapshots and the transaction ledger are not altered.
export function debtProgress(debt, currentBalance, transactions = []) {
  const starting = getOriginalStartingBalance(debt);
  if (starting === null) return { tracked: null, reduced: null, percent: null };
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
    return { debt, balance, progress: debtProgress(debt,balance,transactions) };
  });
  const active = entries.filter(row => row.debt.status !== "completed");
  const completed = entries.filter(row => row.debt.status === "completed");
  const remaining = round(active.reduce((sum,row) => sum + row.balance,0));
  const known = entries.length > 0 && entries.every(row => row.progress.percent !== null);
  const tracked = known ? round(entries.reduce((sum,row) => sum + row.progress.tracked,0)) : null;
  const reduced = known ? round(entries.reduce((sum,row) => sum + row.progress.reduced,0)) : null;
  const byDebt = active.filter(row => row.balance > 0).map(row => ({ key: String(row.debt.id), name: row.debt.name, amount: row.balance, color: row.debt.color || "#A78BFA", percent: remaining > 0 ? row.balance / remaining * 100 : 0 }));
  const categories = new Map();
  for (const slice of byDebt) {
    const category = active.find(row => String(row.debt.id) === slice.key).debt.category || "Other Loan";
    const group = categories.get(category) ?? { key: category, name: category, amount: 0, color: slice.color };
    categories.set(category,{...group,amount:round(group.amount + slice.amount)});
  }
  const byCategory = [...categories.values()].map((row,index) => ({...row,color:["#A78BFA","#93C5FD","#86D3B4","#F3B66A","#DFA0CF"][index % 5],percent:remaining > 0 ? row.amount / remaining * 100 : 0}));
  const completedTracked = completed.length > 0 && completed.every(row => row.progress.tracked !== null && row.progress.percent !== null) ? round(completed.reduce((sum,row) => sum + row.progress.tracked,0)) : null;
  const latest = [...completed].sort((a,b) => (b.debt.completedDate ?? "").localeCompare(a.debt.completedDate ?? ""))[0]?.debt ?? null;
  return { active, completed, remaining, tracked, reduced, percent: tracked && reduced !== null ? clamp(reduced / tracked * 100) : null, byDebt, byCategory, cleared: completed.length, count: entries.length, completedTracked, latest };
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
