import test from 'node:test';
import assert from 'node:assert/strict';
import {debtAnalytics} from '../lib/debt-analytics.mjs';
import {transactionDate,paymentAppliedMonth,debtObligationPaid,debtAdvancePaid,debtBalanceCredit,advanceDebtCashForMonth,advanceObligation,getActualRemainingDebtBalance,effectiveDebtPlan,projectDebtTimeline,historicalBnplCredit} from '../lib/planner-logic.mjs';
import {createBackup,parseBackup} from '../lib/backup.mjs';
const loan={id:1,name:'SLoan 2',category:'Personal Loan',status:'active',firstPaymentMonth:'2026-11',balance:11235,startingBalance:11235,minimum:3745,rate:0,dueDay:10};
const payment=(amount,month='2026-11',date='2026-10-20')=>({id:10,entity:'debt',debtId:1,kind:'payment',amount,date,transactionDate:date,appliedMonth:month});
test('mixed portfolio excludes only unreliable history and still includes all active balances',()=>{
 const unknown={...loan,id:2,name:'Legacy BNPL Fixture',category:'BNPL (Pay Later)',variableMonthlyDues:true,originalStartingBalance:null,balance:5000};
 const dues=[{debtId:2,month:'2026-10',dueAmount:5000}];const data=debtAnalytics([{...loan,balance:9000},unknown],[],'2026-10',dues);
 assert.equal(data.remaining,14000);assert.equal(data.tracked,11235);assert.equal(data.reduced,2235);assert.equal(data.reliableCount,1);assert.deepEqual(data.excluded.map(d=>d.name),['Legacy BNPL Fixture']);assert.ok(Math.abs(data.percent-2235/11235*100)<1e-8);
 assert.equal(debtAnalytics([unknown],[],'2026-10',dues).percent,null);
 const repaired=debtAnalytics([loan,{...unknown,originalStartingBalance:6000}],[],'2026-10',dues);assert.equal(repaired.reliableCount,2);assert.equal(repaired.excluded.length,0);assert.equal(repaired.reduced,1000);
});
test('new allocation separates cash date from obligation; legacy date keeps its meaning',()=>{
 const advance=payment(3745);assert.equal(transactionDate(advance),'2026-10-20');assert.equal(paymentAppliedMonth(advance),'2026-11');assert.equal(debtObligationPaid(loan,'2026-10',[],[advance]),0);assert.equal(debtObligationPaid(loan,'2026-11',[],[advance]),3745);assert.equal(debtAdvancePaid(loan,'2026-11',[advance]),3745);
 assert.equal(advanceDebtCashForMonth('2026-10',[advance]),3745);assert.equal(advanceDebtCashForMonth('2026-11',[advance]),0);
 const legacy={debtId:1,kind:'payment',amount:1000,date:'2026-10-10'};assert.equal(paymentAppliedMonth(legacy),'2026-10');assert.equal(debtObligationPaid(loan,'2026-10',[],[legacy]),1000);assert.equal(legacy.appliedMonth,undefined);
});
test('finite loan forecast starts reduced today and subtracts prepaid November once, not twice',()=>{
 for(const amount of [2000,3745,5000]){
  const history=[payment(amount)],updated={...loan,balance:loan.balance-amount};const paid=debtBalanceCredit(updated,'2026-10',[],history);const timeline=projectDebtTimeline(updated,'2026-10','2026-11',[],[],paid,history);
  assert.equal(timeline[0].opening,loan.balance-amount);assert.equal(timeline[0].payment,0);assert.equal(timeline[1].payment,Math.max(0,3745-amount));
  assert.equal(effectiveDebtPlan(updated,'2026-11','2026-10',[],[],paid,history).minimum,3745);
 }
});
test('prepaid November cannot satisfy October; different future months have separate allocations',()=>{
 const debt={...loan,firstPaymentMonth:undefined,balance:7490},history=[payment(3745,'2026-12')];const timeline=projectDebtTimeline(debt,'2026-10','2026-12',[],[],3745,history);
 assert.equal(debtObligationPaid(debt,'2026-10',[],history),0);assert.equal(timeline[0].payment,3745);assert.equal(debtAdvancePaid(debt,'2026-11',history),0);assert.equal(debtAdvancePaid(debt,'2026-12',history),3745);
});
test('a partial advance stays partial even if a forecast predicts earlier payoff',()=>{
 const history=[payment(2000)],debt={...loan,firstPaymentMonth:undefined,balance:3000};assert.equal(effectiveDebtPlan(debt,'2026-11','2026-10',[],[],2000,history).minimum,3745);assert.equal(debtObligationPaid(debt,'2026-11',[],history),2000);
});
test('advance form uses a configured obligation, not an optimistic future payoff estimate',()=>{
 const debt={...loan,firstPaymentMonth:undefined,balance:5000};assert.equal(effectiveDebtPlan(debt,'2026-11','2026-10',[],[],0,[]).minimum,1255);assert.equal(advanceObligation(debt,'2026-11','2026-10').remaining,3745);
});
test('BNPL current and future balance credit survives month rollover without double deduction',()=>{
 const bnpl={...loan,category:'BNPL (Pay Later)',variableMonthlyDues:true,originalStartingBalance:11235};const dues=['2026-11','2026-12','2027-01'].map(month=>({debtId:1,month,dueAmount:3745}));
 for(const amount of [2000,3745]){const history=[payment(amount)];assert.equal(getActualRemainingDebtBalance(bnpl,'2026-10',dues,history),11235-amount);assert.equal(getActualRemainingDebtBalance(bnpl,'2026-11',dues,history),11235-amount);assert.equal(debtObligationPaid(bnpl,'2026-11',dues,history),amount);const timeline=projectDebtTimeline(bnpl,'2026-10','2026-11',dues,[],debtBalanceCredit(bnpl,'2026-10',dues,history),history);assert.equal(timeline[1].payment,3745-amount);}
});
test('BNPL advance stays earmarked rather than satisfying a different schedule month',()=>{
 const bnpl={...loan,firstPaymentMonth:undefined,category:'BNPL (Pay Later)',variableMonthlyDues:true};const dues=['2026-10','2026-11','2026-12'].map(month=>({debtId:1,month,dueAmount:3745}));const history=[payment(2000,'2026-12')];assert.equal(historicalBnplCredit(bnpl,'2026-11',dues,history),2000);assert.equal(debtObligationPaid(bnpl,'2026-11',dues,history),0);assert.equal(debtObligationPaid(bnpl,'2026-12',dues,history),2000);
});
test('legacy BNPL extra credit and explicit allocation combine without double counting',()=>{
 const bnpl={...loan,category:'BNPL (Pay Later)',variableMonthlyDues:true};const dues=[{debtId:1,month:'2026-10',dueAmount:1000},{debtId:1,month:'2026-11',dueAmount:3745}];const history=[{debtId:1,kind:'payment',date:'2026-10-10',amount:1500},payment(2000)];assert.equal(debtObligationPaid(bnpl,'2026-11',dues,history),2500);assert.equal(getActualRemainingDebtBalance(bnpl,'2026-11',dues,history),1245);
});
test('completed finite debt retains prepaid target checklist, while later obligations stop',()=>{
 const debt={...loan,status:'completed',balance:0,completedDate:'2026-10-20'},history=[payment(11235)];assert.equal(effectiveDebtPlan(debt,'2026-11','2026-10',[],[],11235,history).minimum,3745);assert.equal(effectiveDebtPlan(debt,'2026-12','2026-10',[],[],11235,history).minimum,0);
});
test('backup round-trip preserves both dates and allocation, rejects mismatched actual dates',()=>{
 const state={debts:[loan],bills:[],incomeEntries:[],transactions:[payment(2000)],monthlyDueSchedules:[],debtPaymentVersions:[]};const restored=parseBackup(createBackup(state),'2026-10').data;assert.deepEqual(restored.transactions,state.transactions);assert.equal(debtObligationPaid(loan,'2026-11',[],restored.transactions),2000);for(const bad of [{...payment(1),transactionDate:'2026-11-01'},{...payment(1),appliedMonth:'2026-99'}])assert.throws(()=>parseBackup({...state,transactions:[bad]},'2026-10'));
});
