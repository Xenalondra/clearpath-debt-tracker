"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { InstallAppButton } from "./install-app";

type Strategy = "snowball" | "avalanche";
type Debt = { id: number; name: string; balance: number; startingBalance: number; rate: number; minimum: number; planned: number; dueDay: number; color: string };
type Bill = { id: number; name: string; category: string; amount: number; dueDay: number };
type DebtTransaction = { id: number; debtId: number; kind: "payment" | "charge"; amount: number; date: string; note: string };
type Modal = "debt" | "bill" | "income" | "transaction" | "payment" | null;

const starterDebts: Debt[] = [
  { id: 1, name: "Visa Platinum", balance: 142000, startingBalance: 179000, rate: 21.9, minimum: 4750, planned: 12500, dueDay: 28, color: "#7257d9" },
  { id: 2, name: "Student Loan", balance: 362500, startingBalance: 405000, rate: 5.2, minimum: 9250, planned: 9250, dueDay: 12, color: "#309c7d" },
  { id: 3, name: "Laptop Plan", balance: 43000, startingBalance: 64800, rate: 0, minimum: 3600, planned: 3600, dueDay: 18, color: "#e69b3f" },
];
const starterBills: Bill[] = [
  { id: 1, name: "Rent", category: "Home", amount: 18000, dueDay: 1 },
  { id: 2, name: "Electricity", category: "Utilities", amount: 3200, dueDay: 15 },
  { id: 3, name: "Internet", category: "Utilities", amount: 1699, dueDay: 20 },
  { id: 4, name: "Insurance", category: "Protection", amount: 2500, dueDay: 26 },
];
const colors = ["#7257d9", "#309c7d", "#e69b3f", "#df6d5b", "#427aa1"];
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const monthKey = new Date().toISOString().slice(0, 7);

export default function Home() {
  const [debts, setDebts] = useState<Debt[]>(starterDebts);
  const [bills, setBills] = useState<Bill[]>(starterBills);
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [income, setIncome] = useState(85000);
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [checked, setChecked] = useState<string[]>([`${monthKey}-bill-1`, `${monthKey}-debt-2`]);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedDebt, setSelectedDebt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("clearpath-plan-v3-php");
    if (saved) try {
      const data = JSON.parse(saved);
      setDebts(data.debts ?? starterDebts); setBills(data.bills ?? starterBills);
      setTransactions(data.transactions ?? []); setIncome(data.income ?? 85000);
      setStrategy(data.strategy ?? "avalanche"); setChecked(data.checked ?? []);
    } catch { /* Keep starter plan if saved data is invalid. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("clearpath-plan-v3-php", JSON.stringify({ debts, bills, transactions, income, strategy, checked }));
  }, [debts, bills, transactions, income, strategy, checked, loaded]);

  const totalDebt = useMemo(() => debts.reduce((sum, item) => sum + item.balance, 0), [debts]);
  const minimums = useMemo(() => debts.reduce((sum, item) => sum + item.minimum, 0), [debts]);
  const plannedDebt = useMemo(() => debts.reduce((sum, item) => sum + item.planned, 0), [debts]);
  const fixedExpenses = useMemo(() => bills.reduce((sum, item) => sum + item.amount, 0), [bills]);
  const committed = plannedDebt + fixedExpenses;
  const remaining = income - committed;
  const orderedDebts = useMemo(() => [...debts].sort((a, b) => strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate), [debts, strategy]);
  const target = orderedDebts[0];
  const startingTotal = debts.reduce((sum, debt) => sum + debt.startingBalance, 0);
  const progress = startingTotal ? Math.max(0, Math.round(((startingTotal - totalDebt) / startingTotal) * 100)) : 0;
  const obligations = useMemo(() => [
    ...debts.map((debt) => ({ id: `debt-${debt.id}`, kind: "Debt", name: debt.name, amount: debt.planned, dueDay: debt.dueDay, color: debt.color })),
    ...bills.map((bill) => ({ id: `bill-${bill.id}`, kind: bill.category, name: bill.name, amount: bill.amount, dueDay: bill.dueDay, color: "#b9afa0" })),
  ].sort((a, b) => a.dueDay - b.dueDay), [debts, bills]);
  const paidCount = obligations.filter((item) => checked.includes(`${monthKey}-${item.id}`)).length;

  function togglePaid(id: string) {
    const key = `${monthKey}-${id}`;
    setChecked((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]);
  }
  function openDebtAction(type: "transaction" | "payment", id: number) { setSelectedDebt(id); setModal(type); }
  function addDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const balance = Number(data.get("balance"));
    setDebts((items) => [...items, { id: Date.now(), name: String(data.get("name")), balance, startingBalance: balance, rate: Number(data.get("rate")), minimum: Number(data.get("minimum")), planned: Number(data.get("planned")), dueDay: Number(data.get("dueDay")), color: colors[items.length % colors.length] }]); setModal(null);
  }
  function addBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setBills((items) => [...items, { id: Date.now(), name: String(data.get("name")), category: String(data.get("category")), amount: Number(data.get("amount")), dueDay: Number(data.get("dueDay")) }]); setModal(null);
  }
  function updateIncome(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setIncome(Number(new FormData(event.currentTarget).get("income"))); setModal(null); }
  function updatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const amount = Number(new FormData(event.currentTarget).get("planned"));
    setDebts((items) => items.map((item) => item.id === selectedDebt ? { ...item, planned: amount } : item)); setModal(null);
  }
  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const amount = Number(data.get("amount")); const kind = String(data.get("kind")) as "payment" | "charge";
    if (selectedDebt === null) return;
    setDebts((items) => items.map((item) => item.id === selectedDebt ? { ...item, balance: Math.max(0, item.balance + (kind === "charge" ? amount : -amount)) } : item));
    setTransactions((items) => [{ id: Date.now(), debtId: selectedDebt, kind, amount, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), note: String(data.get("note") || (kind === "payment" ? "Payment recorded" : "Balance adjustment")) }, ...items]);
    if (kind === "payment") setChecked((items) => [...new Set([...items, `${monthKey}-debt-${selectedDebt}`])]); setModal(null);
  }

  const activeDebt = debts.find((item) => item.id === selectedDebt);

  return <main>
    <aside className="sidebar">
      <a className="brand" href="#top"><span>c</span> clearpath</a>
      <nav aria-label="Main navigation">
        <a className="active" href="#top">⌂ <span>Overview</span></a>
        <a href="#month">✓ <span>This month</span></a>
        <a href="#debts">◫ <span>My debts</span></a>
        <a href="#strategy">◎ <span>Strategy</span></a>
      </nav>
      <div className="sidebar-bottom">
        <p className="mini-label">MONTHLY CHECKLIST</p><div className="mini-progress"><i style={{ width: `${obligations.length ? paidCount / obligations.length * 100 : 0}%` }} /></div>
        <p><strong>{paidCount} of {obligations.length}</strong> marked paid</p><a className="side-action" href="#month">Review payments</a>
        <div className="profile"><span>MA</span><div><strong>My plan</strong><small>Saved on this device</small></div></div>
      </div>
    </aside>

    <section className="content" id="top">
      <header><div><p className="eyebrow">YOUR MONTHLY MONEY PLAN</p><h1>Know what’s due. Clear what’s next.</h1><p>A focused checklist for your debts and fixed expenses—all in Philippine pesos.</p></div><div className="header-actions"><InstallAppButton/><button className="outline-button" onClick={() => setModal("income")}>Edit income</button></div></header>

      <section className="cash-grid">
        <article><span>MONTHLY INCOME</span><strong>{money.format(income)}</strong><button onClick={() => setModal("income")}>Update</button></article>
        <article><span>DEBT PAYMENTS</span><strong>{money.format(plannedDebt)}</strong><small>{money.format(minimums)} minimums</small></article>
        <article><span>FIXED EXPENSES</span><strong>{money.format(fixedExpenses)}</strong><small>{bills.length} recurring bills</small></article>
        <article className={remaining < 0 ? "gap negative" : "gap positive"}><span>{remaining < 0 ? "MONTHLY SHORTFALL" : "MONTHLY SURPLUS"}</span><strong>{money.format(Math.abs(remaining))}</strong><small>{remaining < 0 ? "Reduce planned payments or expenses" : "Available for your target or savings"}</small></article>
      </section>

      <section className="hero-grid">
        <article className="balance-card"><p>TOTAL DEBT</p><h2>{money.format(totalDebt)}</h2><div className="change">{progress}% paid <span>from {money.format(startingTotal)}</span></div><div className="mountain" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><div className="months"><span>START</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>NOW</span><span>ZERO</span></div></article>
        <article className="target-card" id="strategy"><div className="target-top"><div><p className="eyebrow">CURRENT TARGET</p><h2>{target?.name ?? "Add a debt"}</h2></div><span className="target-badge">#{target ? 1 : "–"}</span></div><p>{strategy === "avalanche" ? `Highest APR at ${target?.rate ?? 0}%—prioritizing this saves interest.` : `Smallest balance at ${money.format(target?.balance ?? 0)}—a faster motivational win.`}</p><div className="strategy-switch" role="group" aria-label="Payoff strategy"><button className={strategy === "avalanche" ? "selected" : ""} onClick={() => setStrategy("avalanche")}>Avalanche</button><button className={strategy === "snowball" ? "selected" : ""} onClick={() => setStrategy("snowball")}>Snowball</button></div>{remaining > 0 && target && <div className="recommendation"><b>Suggested extra</b><span>Put up to {money.format(remaining)} more toward {target.name}.</span></div>}</article>
      </section>

      <section className="section-block checklist-section" id="month">
        <div className="section-title"><div><p className="eyebrow">THIS MONTH</p><h2>Payment checklist</h2><p>{paidCount} paid · {obligations.length - paidCount} still due</p></div><button className="text-button" onClick={() => setModal("bill")}>＋ Add fixed expense</button></div>
        <div className="checklist">
          {obligations.map((item) => { const isPaid = checked.includes(`${monthKey}-${item.id}`); return <label className={`check-row ${isPaid ? "is-paid" : ""}`} key={item.id}>
            <input type="checkbox" checked={isPaid} onChange={() => togglePaid(item.id)} /><span className="custom-check">✓</span><span className="due-date">{item.dueDay}<small>SEP</small></span><span className="check-name"><strong>{item.name}</strong><small>{item.kind}</small></span><strong className="check-amount">{money.format(item.amount)}</strong><span className="status">{isPaid ? "Paid" : "Due"}</span>
          </label>})}
        </div>
      </section>

      <section className="section-block" id="debts">
        <div className="section-title"><div><p className="eyebrow">DEBT PLAN</p><h2>Balances & custom payments</h2><p>Record payments or new charges whenever a balance changes.</p></div><button className="text-button" onClick={() => setModal("debt")}>＋ Add debt</button></div>
        <div className="debt-cards">
          {orderedDebts.map((debt, index) => <article className={`debt-card ${target?.id === debt.id ? "priority" : ""}`} key={debt.id}>
            <div className="debt-head"><span className="debt-icon" style={{ background: debt.color }}>{debt.name[0]}</span><div><strong>{debt.name}</strong><small>{debt.rate}% APR · due Sep {debt.dueDay}</small></div>{target?.id === debt.id && <b className="focus-pill">Target #{index + 1}</b>}</div>
            <h3>{money.format(debt.balance)}</h3><div className="debt-progress"><i style={{ width: `${Math.max(3, (1 - debt.balance / debt.startingBalance) * 100)}%`, background: debt.color }} /></div>
            <div className="payment-line"><span>Planned this month <b>{money.format(debt.planned)}</b></span><span>Minimum {money.format(debt.minimum)}</span></div>
            <div className="card-actions"><button onClick={() => openDebtAction("transaction", debt.id)}>＋ Record activity</button><button onClick={() => openDebtAction("payment", debt.id)}>Customize payment</button></div>
          </article>)}
        </div>
      </section>

      <section className="lower-grid">
        <article className="strategy-list"><p className="eyebrow">PAYOFF ORDER · {strategy.toUpperCase()}</p><h2>Your next wins</h2>{orderedDebts.map((debt, i) => <div className="rank-row" key={debt.id}><b>{i + 1}</b><span><strong>{debt.name}</strong><small>{strategy === "avalanche" ? `${debt.rate}% APR` : `${money.format(debt.balance)} balance`}</small></span><em>{money.format(debt.planned)}/mo</em></div>)}</article>
        <article className="activity"><div className="section-title"><div><p className="eyebrow">DEBT ACTIVITY</p><h2>Balance history</h2></div></div>{transactions.length === 0 ? <div className="empty-state"><span>↙</span><p>Your recorded payments and new charges will appear here.</p></div> : transactions.slice(0, 5).map((txn) => { const debt = debts.find((d) => d.id === txn.debtId); return <div className="activity-row" key={txn.id}><span className={txn.kind}>{txn.kind === "payment" ? "↓" : "↑"}</span><div><strong>{debt?.name}</strong><small>{txn.note} · {txn.date}</small></div><b className={txn.kind}>{txn.kind === "payment" ? "−" : "+"}{money.format(txn.amount)}</b></div>})}</article>
      </section>
      <p className="disclaimer">Payoff suggestions are estimates based on the balances, rates, and payments you enter—not financial advice.</p>
    </section>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={() => setModal(null)} aria-label="Close">×</button>
      {modal === "debt" && <><p className="eyebrow">NEW ACCOUNT</p><h2 id="modal-title">Add a debt</h2><form onSubmit={addDebt}><label>Name<input name="name" required placeholder="Credit card or loan" /></label><div className="form-row"><label>Current balance<input name="balance" required type="number" min="0" step="0.01" /></label><label>APR (%)<input name="rate" required type="number" min="0" step="0.1" /></label></div><div className="form-row"><label>Minimum payment<input name="minimum" required type="number" min="0" step="0.01" /></label><label>Planned payment<input name="planned" required type="number" min="0" step="0.01" /></label></div><label>Monthly due day<input name="dueDay" required type="number" min="1" max="31" /></label><button type="submit">Add to plan</button></form></>}
      {modal === "bill" && <><p className="eyebrow">RECURRING OBLIGATION</p><h2 id="modal-title">Add fixed expense</h2><form onSubmit={addBill}><label>Name<input name="name" required placeholder="Rent, electricity, insurance…" /></label><div className="form-row"><label>Monthly amount<input name="amount" required type="number" min="0" step="0.01" /></label><label>Due day<input name="dueDay" required type="number" min="1" max="31" /></label></div><label>Category<select name="category"><option>Home</option><option>Utilities</option><option>Protection</option><option>Subscription</option><option>Family</option><option>Other</option></select></label><button type="submit">Add to checklist</button></form></>}
      {modal === "income" && <><p className="eyebrow">CASH FLOW</p><h2 id="modal-title">Set monthly income</h2><form onSubmit={updateIncome}><label>Take-home income<input name="income" required type="number" min="0" step="0.01" defaultValue={income} /></label><p className="form-help">Use the amount you can reliably plan with each month.</p><button type="submit">Update income</button></form></>}
      {modal === "payment" && activeDebt && <><p className="eyebrow">CUSTOM PAYMENT</p><h2 id="modal-title">Plan for {activeDebt.name}</h2><form onSubmit={updatePayment}><label>Planned monthly payment<input name="planned" required type="number" min={activeDebt.minimum} step="0.01" defaultValue={activeDebt.planned} /></label><p className="form-help">Minimum due: {money.format(activeDebt.minimum)}. You can change this again any month.</p><button type="submit">Save payment plan</button></form></>}
      {modal === "transaction" && activeDebt && <><p className="eyebrow">UPDATE BALANCE</p><h2 id="modal-title">Record activity</h2><div className="modal-balance"><span>{activeDebt.name}</span><strong>{money.format(activeDebt.balance)}</strong></div><form onSubmit={addTransaction}><label>Activity type<select name="kind"><option value="payment">Payment made</option><option value="charge">New charge, fee, or interest</option></select></label><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" /></label><label>Note (optional)<input name="note" placeholder="September payment" /></label><button type="submit">Update balance</button></form></>}
    </div></div>}
  </main>;
}
