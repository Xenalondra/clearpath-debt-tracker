// Display-only adapter: balances must already come from the canonical ledger/forecast.
const colors = { "Personal Loan":"#A78BFA", "Cash Loan":"#93C5FD", "BNPL (Pay Later)":"#F3B66A", "Credit Card":"#86D3B4", "Other Loan":"#DFA0CF" };
const round = value => Math.round(value * 100) / 100;
export function balanceChartData(entries) {
  const visible = entries.filter(row => !["completed","archived"].includes(row.debt.status) && row.balance > 0);
  const remaining = round(visible.reduce((sum,row) => sum + row.balance,0));
  const byDebt = visible.map(row => ({key:String(row.debt.id),name:row.debt.name,amount:row.balance,color:row.debt.color || "#A78BFA",percent:remaining > 0 ? row.balance / remaining * 100 : 0}));
  const categories = new Map();
  for (const row of visible) {
    const name = row.debt.category || "Other Loan";
    categories.set(name,round((categories.get(name) || 0) + row.balance));
  }
  const byCategory = [...categories].map(([name,amount]) => ({key:name,name,amount,color:colors[name] || colors["Other Loan"],percent:remaining > 0 ? amount / remaining * 100 : 0}));
  return {remaining,byDebt,byCategory};
}
