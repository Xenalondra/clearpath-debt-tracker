"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { InstallAppButton } from "./install-app";

type Strategy = "snowball" | "avalanche";
type DebtCategory = "Personal Loan" | "Cash Loan" | "BNPL (Pay Later)" | "Credit Card" | "Other Loan";
type Debt = { id: number; name: string; category: DebtCategory; balance: number; startingBalance: number; rate: number; minimum: number; planned: number; dueDay: number; creditLimit: number; color: string };
type Bill = { id: number; name: string; category: string; amount: number; dueDay: number };
type DebtTransaction = { id: number; debtId: number; kind: "payment" | "charge"; amount: number; date: string; note: string };
type IncomeEntry = { id: number; name: string; amount: number; date: string; recurring: boolean };
type Modal = "debt" | "bill" | "income" | "transaction" | "payment" | null;

const starterDebts: Debt[] = [
  { id: 1, name: "Visa Platinum", category: "Credit Card", balance: 142000, startingBalance: 179000, rate: 21.9, minimum: 4750, planned: 12500, dueDay: 28, creditLimit: 250000, color: "#7257d9" },
  { id: 2, name: "Personal Loan", category: "Personal Loan", balance: 362500, startingBalance: 405000, rate: 5.2, minimum: 9250, planned: 9250, dueDay: 12, creditLimit: 0, color: "#309c7d" },
  { id: 3, name: "Lazada PayLater", category: "BNPL (Pay Later)", balance: 43000, startingBalance: 64800, rate: 0, minimum: 3600, planned: 3600, dueDay: 18, creditLimit: 60000, color: "#e69b3f" },
];
const starterBills: Bill[] = [
  { id: 1, name: "Rent", category: "Home", amount: 18000, dueDay: 1 },
  { id: 2, name: "Electricity", category: "Utilities", amount: 3200, dueDay: 15 },
  { id: 3, name: "Internet", category: "Utilities", amount: 1699, dueDay: 20 },
  { id: 4, name: "Insurance", category: "Protection", amount: 2500, dueDay: 26 },
];
const palette = ["#7257d9", "#309c7d", "#e69b3f", "#df6d5b", "#427aa1", "#c04f84", "#4978d1", "#727c45"];
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const today = new Date();
const currentMonth = today.toISOString().slice(0, 7);
const defaultIncome: IncomeEntry[] = [{ id: 1, name: "Salary", amount: 85000, date: `${currentMonth}-15`, recurring: true }];

function monthLabel(month: string) {
  return new Date(`${month}-02T12:00:00`).toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}
function inSelectedMonth(date: string, selectedMonth: string) { return date.slice(0, 7) === selectedMonth; }

export default function Home() {
  const [debts, setDebts] = useState<Debt[]>(starterDebts);
  const [bills, setBills] = useState<Bill[]>(starterBills);
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>(defaultIncome);
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  const [checked, setChecked] = useState<string[]>([`${currentMonth}-bill-1`, `${currentMonth}-debt-2`]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedDebt, setSelectedDebt] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("clearpath-plan-v4-php");
    const legacy = localStorage.getItem("clearpath-plan-v3-php");
    if (saved || legacy) try {
      const data = JSON.parse(saved || legacy || "{}");
      setDebts((data.debts ?? starterDebts).map((d: Partial<Debt>, i: number) => ({ category: "Other Loan", creditLimit: 0, color: palette[i % palette.length], ...d })));
      setBills(data.bills ?? starterBills); setTransactions(data.transactions ?? []);
      setIncomeEntries(data.incomeEntries ?? [{ id: 1, name: "Salary", amount: data.income ?? 85000, date: `${currentMonth}-15`, recurring: true }]);
      setStrategy(data.strategy ?? "avalanche"); setChecked(data.checked ?? []);
    } catch { /* Keep starter plan if saved data is invalid. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem("clearpath-plan-v4-php", JSON.stringify({ debts, bills, transactions, incomeEntries, strategy, checked }));
  }, [debts, bills, transactions, incomeEntries, strategy, checked, loaded]);

  const monthIncomeEntries = useMemo(() => incomeEntries.filter((entry) => entry.recurring || inSelectedMonth(entry.date, selectedMonth)), [incomeEntries, selectedMonth]);
  const income = monthIncomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const monthTransactions = useMemo(() => transactions.filter((item) => inSelectedMonth(item.date, selectedMonth)).sort((a, b) => b.date.localeCompare(a.date)), [transactions, selectedMonth]);
  const totalDebt = debts.reduce((sum, item) => sum + item.balance, 0);
  const minimums = debts.reduce((sum, item) => sum + item.minimum, 0);
  const plannedDebt = debts.reduce((sum, item) => sum + item.planned, 0);
  const fixedExpenses = bills.reduce((sum, item) => sum + item.amount, 0);
  const remaining = income - plannedDebt - fixedExpenses;
  const essentialOutflow = fixedExpenses + minimums;
  const safeExtra = Math.max(0, income - essentialOutflow);
  const minimumGap = Math.max(0, essentialOutflow - income);
  const plannedExtra = Math.max(0, plannedDebt - minimums);
  const orderedDebts = useMemo(() => [...debts].sort((a, b) => strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate), [debts, strategy]);
  const target = orderedDebts[0];
  const categoryColors: Record<DebtCategory, string> = { "Credit Card": "#7257d9", "Personal Loan": "#309c7d", "Cash Loan": "#df6d5b", "BNPL (Pay Later)": "#e69b3f", "Other Loan": "#427aa1" };
  const categoryBalances = useMemo(() => Object.entries(debts.reduce((groups, debt) => { groups[debt.category] = (groups[debt.category] || 0) + debt.balance; return groups; }, {} as Record<DebtCategory, number>)).sort((a, b) => b[1] - a[1]) as [DebtCategory, number][], [debts]);
  const pieGradient = useMemo(() => { let cursor = 0; const stops = categoryBalances.map(([category, balance]) => { const start = cursor; cursor += totalDebt ? balance / totalDebt * 100 : 0; return `${categoryColors[category]} ${start}% ${cursor}%`; }); return stops.length ? `conic-gradient(${stops.join(",")})` : "#ece8df"; }, [categoryBalances, totalDebt]);
  const startingTotal = debts.reduce((sum, debt) => sum + debt.startingBalance, 0);
  const progress = startingTotal ? Math.max(0, Math.round(((startingTotal - totalDebt) / startingTotal) * 100)) : 0;
  const obligations = useMemo(() => [
    ...debts.map((debt) => ({ id: `debt-${debt.id}`, kind: debt.category, name: debt.name, amount: debt.planned, dueDay: debt.dueDay, color: debt.color })),
    ...bills.map((bill) => ({ id: `bill-${bill.id}`, kind: bill.category, name: bill.name, amount: bill.amount, dueDay: bill.dueDay, color: "#b9afa0" })),
  ].sort((a, b) => a.dueDay - b.dueDay), [debts, bills]);
  const paidCount = obligations.filter((item) => checked.includes(`${selectedMonth}-${item.id}`)).length;

  function togglePaid(id: string) {
    const key = `${selectedMonth}-${id}`;
    setChecked((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]);
  }
  function openDebtAction(type: "transaction" | "payment", id: number) { setSelectedDebt(id); setModal(type); }
  function addDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const balance = Number(data.get("balance")); const minimum = Number(data.get("minimum"));
    setDebts((items) => [...items, { id: Date.now(), name: String(data.get("name")), category: String(data.get("category")) as DebtCategory, balance, startingBalance: balance, rate: Number(data.get("rate")), minimum, planned: Number(data.get("planned")) || minimum, dueDay: Number(data.get("dueDay")), creditLimit: Number(data.get("creditLimit")) || 0, color: String(data.get("color")) }]); setModal(null);
  }
  function addBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setBills((items) => [...items, { id: Date.now(), name: String(data.get("name")), category: String(data.get("category")), amount: Number(data.get("amount")), dueDay: Number(data.get("dueDay")) }]); setModal(null);
  }
  function addIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setIncomeEntries((items) => [...items, { id: Date.now(), name: String(data.get("name")), amount: Number(data.get("amount")), date: String(data.get("date")), recurring: data.get("recurring") === "on" }]); setModal(null);
  }
  function updatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const minimum = Number(data.get("minimum")); const planned = Number(data.get("planned"));
    setDebts((items) => items.map((item) => item.id === selectedDebt ? { ...item, minimum, planned: Math.max(minimum, planned), dueDay: Number(data.get("dueDay")), creditLimit: Number(data.get("creditLimit")) || 0 } : item)); setModal(null);
  }
  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const amount = Number(data.get("amount")); const kind = String(data.get("kind")) as "payment" | "charge"; const date = String(data.get("date"));
    if (selectedDebt === null) return;
    setDebts((items) => items.map((item) => item.id === selectedDebt ? { ...item, balance: Math.max(0, item.balance + (kind === "charge" ? amount : -amount)) } : item));
    setTransactions((items) => [{ id: Date.now(), debtId: selectedDebt, kind, amount, date, note: String(data.get("note") || (kind === "payment" ? "Payment recorded" : "Balance adjustment")) }, ...items]);
    if (kind === "payment") setChecked((items) => [...new Set([...items, `${date.slice(0, 7)}-debt-${selectedDebt}`])]); setModal(null);
  }
  function removeIncome(id: number) { setIncomeEntries((items) => items.filter((item) => item.id !== id)); }
  function applyRecommendedPlan() {
    if (!target || safeExtra <= 0) return;
    setDebts((items) => items.map((item) => ({ ...item, planned: item.minimum + (item.id === target.id ? safeExtra : 0) })));
  }

  const activeDebt = debts.find((item) => item.id === selectedDebt);
  const monthShort = monthLabel(selectedMonth).slice(0, 3).toUpperCase();

  return <main>
    <aside className="sidebar">
      <a className="brand" href="#top"><span>c</span> clearpath</a>
      <nav aria-label="Main navigation"><a className="active" href="#top">⌂ <span>Overview</span></a><a href="#month">✓ <span>This month</span></a><a href="#debts">◫ <span>My debts</span></a><a href="#history">↙ <span>History</span></a></nav>
      <div className="sidebar-bottom"><p className="mini-label">MONTHLY CHECKLIST</p><div className="mini-progress"><i style={{ width: `${obligations.length ? paidCount / obligations.length * 100 : 0}%` }} /></div><p><strong>{paidCount} of {obligations.length}</strong> marked paid</p><a className="side-action" href="#month">Review payments</a><div className="profile"><span>MA</span><div><strong>My plan</strong><small>Saved on this device</small></div></div></div>
    </aside>

    <section className="content" id="top">
      <header><div><p className="eyebrow">YOUR MONTHLY MONEY PLAN</p><h1>Know what’s due. Clear what’s next.</h1><p>A focused checklist for debts, income, and fixed expenses in Philippine pesos.</p></div><div className="header-actions"><InstallAppButton/><button className="outline-button" onClick={() => setModal("income")}>＋ Add income</button></div></header>

      <div className="month-toolbar"><button onClick={() => setSelectedMonth(new Date(new Date(`${selectedMonth}-02`).setMonth(new Date(`${selectedMonth}-02`).getMonth() - 1)).toISOString().slice(0, 7))} aria-label="Previous month">‹</button><label>Viewing month<input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} /></label><button onClick={() => setSelectedMonth(new Date(new Date(`${selectedMonth}-02`).setMonth(new Date(`${selectedMonth}-02`).getMonth() + 1)).toISOString().slice(0, 7))} aria-label="Next month">›</button><strong>{monthLabel(selectedMonth)}</strong></div>

      <section className="cash-grid">
        <article><span>TOTAL INCOME</span><strong>{money.format(income)}</strong><small>{monthIncomeEntries.length} income source{monthIncomeEntries.length === 1 ? "" : "s"}</small></article>
        <article><span>DEBT PAYMENTS</span><strong>{money.format(plannedDebt)}</strong><small>{money.format(minimums)} minimums</small></article>
        <article><span>FIXED EXPENSES</span><strong>{money.format(fixedExpenses)}</strong><small>{bills.length} recurring bills</small></article>
        <article className={remaining < 0 ? "gap negative" : "gap positive"}><span>{remaining < 0 ? "MONTHLY SHORTFALL" : "MONTHLY SURPLUS"}</span><strong>{money.format(Math.abs(remaining))}</strong><small>{remaining < 0 ? "Reduce payments or expenses" : "Available for your target or savings"}</small></article>
      </section>

      <section className="income-strip"><div><p className="eyebrow">INCOME SCHEDULE</p><h2>Money coming in</h2></div><div className="income-chips">{monthIncomeEntries.map((entry) => <div className="income-chip" key={entry.id}><span>{entry.recurring ? "↻" : "+"}</span><div><strong>{entry.name}</strong><small>{entry.recurring ? `Every month · day ${Number(entry.date.slice(8, 10))}` : new Date(`${entry.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</small></div><b>{money.format(entry.amount)}</b><button onClick={() => removeIncome(entry.id)} aria-label={`Remove ${entry.name}`}>×</button></div>)}</div><button className="text-button" onClick={() => setModal("income")}>＋ Salary, bonus, or extra</button></section>

      <section className="hero-grid">
        <article className="balance-card"><p>TOTAL DEBT</p><h2>{money.format(totalDebt)}</h2><div className="change">{progress}% paid <span>from {money.format(startingTotal)}</span></div><div className="mountain" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><div className="months"><span>START</span><span>20%</span><span>40%</span><span>60%</span><span>80%</span><span>NOW</span><span>ZERO</span></div></article>
        <article className="target-card" id="strategy"><div className="target-top"><div><p className="eyebrow">SMART PAYMENT PLAN</p><h2>{target?.name ?? "Add a debt"}</h2></div><span className="target-badge">#{target ? 1 : "–"}</span></div><p>{strategy === "avalanche" ? `Targeting the highest APR (${target?.rate ?? 0}%) saves the most interest.` : `Targeting the smallest balance (${money.format(target?.balance ?? 0)}) creates the fastest payoff win.`}</p><div className="strategy-switch" role="group" aria-label="Payoff strategy"><button className={strategy === "avalanche" ? "selected" : ""} onClick={() => setStrategy("avalanche")}>Avalanche</button><button className={strategy === "snowball" ? "selected" : ""} onClick={() => setStrategy("snowball")}>Snowball</button></div>{minimumGap > 0 ? <div className="recommendation warning"><b>Minimums first</b><span>You are {money.format(minimumGap)} short for bills and debt minimums. Pay minimums only and reduce non-essential costs.</span></div> : safeExtra === 0 ? <div className="recommendation neutral"><b>Minimum-only month</b><span>Your income covers essentials, but there is no safe extra this month.</span></div> : <div className="recommendation"><b>{plannedExtra >= safeExtra ? "Plan is fully assigned" : "Safe extra available"}</b><span>{plannedExtra >= safeExtra ? `${money.format(safeExtra)} above minimums is already planned.` : `Add up to ${money.format(safeExtra - plannedExtra)} more to ${target?.name}.`}</span></div>}{target && safeExtra > 0 && plannedExtra !== safeExtra && <button className="apply-plan" onClick={applyRecommendedPlan}>Use recommended plan · {money.format(target.minimum + safeExtra)} to target</button>}</article>
        <article className="category-card"><p className="eyebrow">BALANCE BY CATEGORY</p><h2>Where your debt sits</h2><div className="pie-wrap"><div className="pie-chart" style={{ background: pieGradient }} role="img" aria-label="Debt balance by category"><span><b>{money.format(totalDebt)}</b><small>Total balance</small></span></div><div className="pie-legend">{categoryBalances.map(([category, balance]) => <div key={category}><i style={{ background: categoryColors[category] }} /><span>{category}</span><b>{totalDebt ? Math.round(balance / totalDebt * 100) : 0}%</b><small>{money.format(balance)}</small></div>)}</div></div></article>
      </section>

      <section className="section-block checklist-section" id="month">
        <div className="section-title"><div><p className="eyebrow">{monthLabel(selectedMonth).toUpperCase()}</p><h2>Payment checklist</h2><p>{paidCount} paid · {obligations.length - paidCount} still due</p></div><button className="text-button" onClick={() => setModal("bill")}>＋ Add fixed expense</button></div>
        <div className="checklist">{obligations.map((item) => { const isPaid = checked.includes(`${selectedMonth}-${item.id}`); return <label className={`check-row ${isPaid ? "is-paid" : ""}`} key={item.id}><input type="checkbox" checked={isPaid} onChange={() => togglePaid(item.id)} /><span className="custom-check">✓</span><span className="due-date">{item.dueDay}<small>{monthShort}</small></span><span className="check-name"><strong>{item.name}</strong><small>{item.kind}</small></span><strong className="check-amount">{money.format(item.amount)}</strong><span className="status">{isPaid ? "Paid" : "Due"}</span></label>})}</div>
      </section>

      <section className="section-block" id="debts">
        <div className="section-title"><div><p className="eyebrow">DEBT PLAN</p><h2>Balances & custom payments</h2><p>Edit fluctuating BNPL minimums, credit limits, and monthly payment plans.</p></div><button className="text-button" onClick={() => setModal("debt")}>＋ Add debt</button></div>
        <div className="debt-cards">{orderedDebts.map((debt, index) => { const utilization = debt.creditLimit > 0 ? Math.min(100, Math.round(debt.balance / debt.creditLimit * 100)) : null; return <article className={`debt-card ${target?.id === debt.id ? "priority" : ""}`} style={{ borderTopColor: debt.color }} key={debt.id}><div className="debt-head"><span className="debt-icon" style={{ background: debt.color }}>{debt.name[0]}</span><div><strong>{debt.name}</strong><small>{debt.category} · {debt.rate}% APR · due {debt.dueDay}</small></div>{target?.id === debt.id && <b className="focus-pill">Target #{index + 1}</b>}</div><h3>{money.format(debt.balance)}</h3>{utilization !== null ? <div className="utilization"><div><span>Credit utilization</span><b className={utilization > 80 ? "danger" : utilization > 30 ? "warn" : "good"}>{utilization}%</b></div><div className="debt-progress"><i style={{ width: `${utilization}%`, background: utilization > 80 ? "#df6d5b" : utilization > 30 ? "#e69b3f" : "#309c7d" }} /></div><small>{money.format(debt.balance)} of {money.format(debt.creditLimit)} limit</small></div> : <div className="debt-progress"><i style={{ width: `${Math.max(3, (1 - debt.balance / debt.startingBalance) * 100)}%`, background: debt.color }} /></div>}<div className="payment-line"><span>Planned <b>{money.format(debt.planned)}</b></span><span>Minimum {money.format(debt.minimum)}</span></div><div className="card-actions"><button style={{ background: debt.color, borderColor: debt.color }} onClick={() => openDebtAction("transaction", debt.id)}>＋ Record activity</button><button onClick={() => openDebtAction("payment", debt.id)}>Edit payment & limit</button></div></article>})}</div>
      </section>

      <section className="lower-grid" id="history">
        <article className="strategy-list"><p className="eyebrow">PAYOFF ORDER · {strategy.toUpperCase()}</p><h2>Your next wins</h2>{orderedDebts.map((debt, i) => <div className="rank-row" key={debt.id}><b style={{ background: `${debt.color}22`, color: debt.color }}>{i + 1}</b><span><strong>{debt.name}</strong><small>{debt.category} · {strategy === "avalanche" ? `${debt.rate}% APR` : `${money.format(debt.balance)} balance`}</small></span><em>{money.format(debt.planned)}/mo</em></div>)}</article>
        <article className="activity"><div className="section-title"><div><p className="eyebrow">{monthLabel(selectedMonth).toUpperCase()}</p><h2>Monthly transactions</h2><p>{monthTransactions.length} recorded activit{monthTransactions.length === 1 ? "y" : "ies"}</p></div></div>{monthTransactions.length === 0 ? <div className="empty-state"><span>↙</span><p>No debt transactions recorded for this month.</p></div> : monthTransactions.map((txn) => { const debt = debts.find((d) => d.id === txn.debtId); return <div className="activity-row" key={txn.id}><span className={txn.kind}>{txn.kind === "payment" ? "↓" : "↑"}</span><div><strong>{debt?.name}</strong><small>{txn.note} · {new Date(`${txn.date}T12:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</small></div><b className={txn.kind}>{txn.kind === "payment" ? "−" : "+"}{money.format(txn.amount)}</b></div>})}</article>
      </section>
      <p className="disclaimer">Your plan is stored on this device. Payoff suggestions are estimates—not financial advice.</p>
    </section>

    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><button className="close" onClick={() => setModal(null)} aria-label="Close">×</button>
      {modal === "debt" && <><p className="eyebrow">NEW ACCOUNT</p><h2 id="modal-title">Add a debt</h2><form onSubmit={addDebt}><label>Name<input name="name" required placeholder="Bank, card, Lazada PayLater…" /></label><div className="form-row"><label>Debt category<select name="category"><option>Personal Loan</option><option>Cash Loan</option><option>BNPL (Pay Later)</option><option>Credit Card</option><option>Other Loan</option></select></label><label>Card color<input name="color" type="color" defaultValue={palette[debts.length % palette.length]} /></label></div><div className="form-row"><label>Current balance<input name="balance" required type="number" min="0" step="0.01" /></label><label>Credit limit (optional)<input name="creditLimit" type="number" min="0" step="0.01" /></label></div><div className="form-row"><label>APR (%)<input name="rate" required type="number" min="0" step="0.1" /></label><label>Due day<input name="dueDay" required type="number" min="1" max="31" /></label></div><div className="form-row"><label>Minimum payment<input name="minimum" required type="number" min="0" step="0.01" /></label><label>Planned payment<input name="planned" type="number" min="0" step="0.01" /></label></div><button type="submit">Add to plan</button></form></>}
      {modal === "bill" && <><p className="eyebrow">RECURRING OBLIGATION</p><h2 id="modal-title">Add fixed expense</h2><form onSubmit={addBill}><label>Name<input name="name" required placeholder="Rent, electricity, insurance…" /></label><div className="form-row"><label>Monthly amount<input name="amount" required type="number" min="0" step="0.01" /></label><label>Due day<input name="dueDay" required type="number" min="1" max="31" /></label></div><label>Category<select name="category"><option>Home</option><option>Utilities</option><option>Protection</option><option>Subscription</option><option>Family</option><option>Other</option></select></label><button type="submit">Add to checklist</button></form></>}
      {modal === "income" && <><p className="eyebrow">CASH FLOW</p><h2 id="modal-title">Add income</h2><form onSubmit={addIncome}><label>Income name<input name="name" required placeholder="Salary, bonus, side income…" /></label><div className="form-row"><label>Amount<input name="amount" required type="number" min="0" step="0.01" /></label><label>Expected date<input name="date" required type="date" defaultValue={`${selectedMonth}-15`} /></label></div><label className="checkbox-label"><input name="recurring" type="checkbox" /> Repeat this income every month</label><p className="form-help">Leave repeat unchecked for a one-time bonus or extra income.</p><button type="submit">Add income</button></form></>}
      {modal === "payment" && activeDebt && <><p className="eyebrow">EDIT MONTHLY DUE</p><h2 id="modal-title">Update {activeDebt.name}</h2><form onSubmit={updatePayment}><div className="form-row"><label>Minimum due<input name="minimum" required type="number" min="0" step="0.01" defaultValue={activeDebt.minimum} /></label><label>Planned payment<input name="planned" required type="number" min="0" step="0.01" defaultValue={activeDebt.planned} /></label></div><div className="form-row"><label>Due day<input name="dueDay" required type="number" min="1" max="31" defaultValue={activeDebt.dueDay} /></label><label>Credit limit<input name="creditLimit" type="number" min="0" step="0.01" defaultValue={activeDebt.creditLimit || ""} /></label></div><p className="form-help">Use this whenever a PayLater minimum changes. Credit utilization appears when a limit is entered.</p><button type="submit">Save changes</button></form></>}
      {modal === "transaction" && activeDebt && <><p className="eyebrow">UPDATE BALANCE</p><h2 id="modal-title">Record activity</h2><div className="modal-balance"><span>{activeDebt.name}</span><strong>{money.format(activeDebt.balance)}</strong></div><form onSubmit={addTransaction}><label>Activity type<select name="kind"><option value="payment">Payment made</option><option value="charge">New charge, fee, or interest</option></select></label><div className="form-row"><label>Amount<input name="amount" required type="number" min="0.01" step="0.01" /></label><label>Transaction date<input name="date" required type="date" defaultValue={`${selectedMonth}-${String(Math.min(today.getDate(), 28)).padStart(2, "0")}`} /></label></div><label>Note (optional)<input name="note" placeholder="September payment" /></label><button type="submit">Update balance</button></form></>}
    </div></div>}
  </main>;
}
