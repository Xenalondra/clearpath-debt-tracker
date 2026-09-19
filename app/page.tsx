"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Debt = { id: number; name: string; balance: number; rate: number; minimum: number; color: string };
type Expense = { id: number; merchant: string; category: string; amount: number; date: string };

const starterDebts: Debt[] = [
  { id: 1, name: "Visa Platinum", balance: 2840, rate: 21.9, minimum: 95, color: "#7d5cff" },
  { id: 2, name: "Student Loan", balance: 7250, rate: 5.2, minimum: 185, color: "#2f9f7f" },
  { id: 3, name: "Laptop Plan", balance: 860, rate: 0, minimum: 72, color: "#f2a44a" },
];

const starterExpenses: Expense[] = [
  { id: 1, merchant: "Fresh Market", category: "Groceries", amount: 84.2, date: "Sep 18" },
  { id: 2, merchant: "City Electric", category: "Utilities", amount: 112.6, date: "Sep 16" },
  { id: 3, merchant: "Metro Pass", category: "Transport", amount: 45, date: "Sep 14" },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Home() {
  const [debts, setDebts] = useState<Debt[]>(starterDebts);
  const [expenses, setExpenses] = useState<Expense[]>(starterExpenses);
  const [modal, setModal] = useState<"debt" | "expense" | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("clearpath-data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDebts(parsed.debts ?? starterDebts);
        setExpenses(parsed.expenses ?? starterExpenses);
      } catch { /* Keep the friendly starter data. */ }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("clearpath-data", JSON.stringify({ debts, expenses }));
  }, [debts, expenses, loaded]);

  const totalDebt = useMemo(() => debts.reduce((sum, debt) => sum + debt.balance, 0), [debts]);
  const monthlyPayments = useMemo(() => debts.reduce((sum, debt) => sum + debt.minimum, 0), [debts]);
  const monthlySpending = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const paid = 3670;
  const progress = Math.round((paid / (paid + totalDebt)) * 100);

  function addDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDebts((items) => [...items, {
      id: Date.now(), name: String(data.get("name")), balance: Number(data.get("balance")),
      rate: Number(data.get("rate")), minimum: Number(data.get("minimum")), color: "#eb6f5c",
    }]);
    setModal(null);
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setExpenses((items) => [{ id: Date.now(), merchant: String(data.get("merchant")), category: String(data.get("category")), amount: Number(data.get("amount")), date: "Today" }, ...items]);
    setModal(null);
  }

  return (
    <main>
      <aside className="sidebar">
        <a className="brand" href="#top"><span>c</span> clearpath</a>
        <nav aria-label="Main navigation">
          <a className="active" href="#top">⌂ <span>Overview</span></a>
          <a href="#debts">◫ <span>My debts</span></a>
          <a href="#expenses">↗ <span>Expenses</span></a>
          <a href="#plan">◎ <span>Payoff plan</span></a>
        </nav>
        <div className="sidebar-bottom">
          <p className="mini-label">THIS MONTH</p>
          <div className="mini-progress"><i style={{ width: `${Math.min(100, (monthlySpending / 1700) * 100)}%` }} /></div>
          <p><strong>{money.format(monthlySpending)}</strong> of $1,700</p>
          <button onClick={() => setModal("expense")}>＋ Add transaction</button>
          <div className="profile"><span>MA</span><div><strong>My account</strong><small>Local & private</small></div></div>
        </div>
      </aside>

      <section className="content" id="top">
        <header><div><p className="eyebrow">SATURDAY, SEPTEMBER 19</p><h1>Good morning.</h1><p>Here’s how your money is moving.</p></div><button className="icon-button" aria-label="Notifications">●</button></header>

        <section className="hero-grid">
          <article className="balance-card"><p>TOTAL DEBT</p><h2>{money.format(totalDebt)}</h2><div className="change">↓ $740 <span>since June</span></div><div className="mountain" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><div className="months"><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span></div></article>
          <article className="payoff-card" id="plan"><div className="ring" style={{ "--value": `${progress * 3.6}deg` } as React.CSSProperties}><div><strong>{progress}%</strong><span>paid off</span></div></div><div><p>YOUR PROGRESS</p><h3>You’ve paid off<br/><em>{money.format(paid)}</em></h3><small>Keep going — you’re building momentum.</small></div></article>
        </section>

        <section className="section-block" id="debts">
          <div className="section-title"><div><p className="eyebrow">DEBT SNAPSHOT</p><h2>Your balances</h2></div><button className="text-button" onClick={() => setModal("debt")}>＋ Add debt</button></div>
          <div className="debt-list">
            {debts.map((debt) => <article className="debt-row" key={debt.id}>
              <span className="debt-icon" style={{ background: debt.color }}>{debt.name.slice(0, 1)}</span>
              <div className="debt-name"><strong>{debt.name}</strong><small>{debt.rate}% APR · {money.format(debt.minimum)}/mo</small></div>
              <div className="bar"><i style={{ width: `${Math.min(100, debt.balance / 75)}%`, background: debt.color }} /></div>
              <strong className="amount">{money.format(debt.balance)}</strong>
            </article>)}
          </div>
        </section>

        <section className="lower-grid">
          <article className="spending" id="expenses"><div className="section-title"><div><p className="eyebrow">SEPTEMBER SPENDING</p><h2>{money.format(monthlySpending)}</h2></div><button className="text-button" onClick={() => setModal("expense")}>＋ Add</button></div><div className="spend-bar"><i/><i/><i/><i/></div><div className="legend"><span><b className="dot violet"/>Living</span><span><b className="dot coral"/>Bills</span><span><b className="dot mint"/>Transport</span></div></article>
          <article className="next-payment"><p className="eyebrow">NEXT PAYMENT</p><div className="calendar"><strong>28</strong><span>SEP</span></div><div><h3>Visa Platinum</h3><p>{money.format(debts[0]?.minimum ?? 0)} minimum payment</p></div><button>Mark paid</button></article>
        </section>

        <section className="transactions"><div className="section-title"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest expenses</h2></div></div>{expenses.slice(0, 5).map((expense) => <div className="transaction" key={expense.id}><span className="transaction-icon">{expense.merchant.slice(0, 1)}</span><div><strong>{expense.merchant}</strong><small>{expense.category} · {expense.date}</small></div><strong>-{money.format(expense.amount)}</strong></div>)}</section>
      </section>

      {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={() => setModal(null)} aria-label="Close">×</button><p className="eyebrow">NEW ENTRY</p><h2 id="modal-title">Add {modal}</h2>{modal === "debt" ? <form onSubmit={addDebt}><label>Name<input name="name" required placeholder="Credit card" /></label><label>Current balance<input name="balance" required type="number" min="0" step="0.01" placeholder="2500" /></label><div className="form-row"><label>APR (%)<input name="rate" required type="number" min="0" step="0.1" placeholder="18.9" /></label><label>Monthly minimum<input name="minimum" required type="number" min="0" step="0.01" placeholder="80" /></label></div><button type="submit">Save debt</button></form> : <form onSubmit={addExpense}><label>Merchant<input name="merchant" required placeholder="Coffee shop" /></label><label>Category<select name="category"><option>Groceries</option><option>Bills</option><option>Transport</option><option>Dining</option><option>Other</option></select></label><label>Amount<input name="amount" required type="number" min="0" step="0.01" placeholder="24.50" /></label><button type="submit">Save expense</button></form>}</div></div>}
    </main>
  );
}
