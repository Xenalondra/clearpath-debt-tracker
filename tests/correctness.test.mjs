import test from 'node:test';
import assert from 'node:assert/strict';
import {debtPlanForMonth,effectiveDebtPlan,projectDebtTimeline,getDebtFirstPaymentMonth,calculateSafeExtra,calculateMinimumGap,migratePaymentModel} from '../lib/planner-logic.mjs';
import {debtAnalytics,reconstructBnplTrackedAmount} from '../lib/debt-analytics.mjs';
import {createBackup,parseBackup} from '../lib/backup.mjs';
const loan={id:1,name:'SLoan 2',category:'Personal Loan',status:'active',balance:12000,startingBalance:12000,minimum:3000,rate:0,dueDay:10,firstPaymentMonth:'2026-11'};
test('first payment month gates defaults, overrides, allocations and forecast, not current balance',()=>{
 const overrides=[{debtId:1,month:'2026-10',dueAmount:3500}],versions=[{debtId:1,effectiveFrom:'2026-10',minimum:4000}];
 for(const plan of [debtPlanForMonth(loan,'2026-10',overrides,versions),effectiveDebtPlan(loan,'2026-10','2026-10',overrides,versions)])assert.equal(plan.minimum,0);
 assert.equal(debtPlanForMonth(loan,'2026-11').minimum,3000);
 const timeline=projectDebtTimeline(loan,'2026-10','2026-12');assert.deepEqual(timeline.map(row=>row.payment),[0,3000,3000]);assert.equal(timeline[0].closing,12000);
 assert.equal(calculateSafeExtra(5000,1000,debtPlanForMonth(loan,'2026-10').minimum,500),3500);assert.equal(calculateMinimumGap(2000,1000,debtPlanForMonth(loan,'2026-10').minimum,500),0);
});
test('stored start aliases work; creation date does not imply a first due; legacy defaults unchanged',()=>{
 for(const fields of [{startMonth:'2026-11'},{paymentStartDate:'2026-11-10'}]){const debt={...loan,firstPaymentMonth:undefined,...fields};assert.equal(getDebtFirstPaymentMonth(debt),'2026-11');assert.equal(debtPlanForMonth(debt,'2026-10').minimum,0);}
 assert.equal(debtPlanForMonth({...loan,firstPaymentMonth:undefined,createdAt:'2026-10-16'},'2026-10').minimum,3000);assert.equal(getDebtFirstPaymentMonth({firstPaymentMonth:'2026-99'}),null);
 assert.equal(getDebtFirstPaymentMonth({paymentStartDate:10}),null);
});
test('first month also gates variable BNPL schedules and survives unchanged backup/restore',()=>{
 const debt={...loan,category:'BNPL (Pay Later)',variableMonthlyDues:true};const dues=[{debtId:1,month:'2026-10',dueAmount:100},{debtId:1,month:'2026-11',dueAmount:3000}];assert.equal(debtPlanForMonth(debt,'2026-10',dues).minimum,0);assert.equal(debtPlanForMonth(debt,'2026-11',dues).minimum,3000);
 const state={debts:[loan],bills:[],transactions:[],incomeEntries:[]};assert.equal(parseBackup(createBackup(state),'2026-10').data.debts[0].firstPaymentMonth,'2026-11');
});
// Acceptance fixture, NOT the user's inaccessible physical-phone Lazada record.
const bnpl={id:2,name:'Lazada acceptance fixture',category:'BNPL (Pay Later)',variableMonthlyDues:true,originalStartingBalance:null,balance:18150.45,status:'active',minimum:0};
const dues=[{debtId:2,month:'2026-10',dueAmount:5012.43},{debtId:2,month:'2026-11',dueAmount:6000},{debtId:2,month:'2026-12',dueAmount:12150.45}];
const payments=[{id:1,entity:'debt',debtId:2,kind:'payment',amount:5012.43,date:'2026-10-15'}];
test('missing BNPL snapshot reconstructs only when full retained schedule and ledger reconcile',()=>{
 const before=JSON.stringify({bnpl,dues,payments});const result=debtAnalytics([bnpl],payments,'2026-10',dues).active[0];assert.equal(result.balance,18150.45);assert.equal(result.progress.tracked,23162.88);assert.equal(result.progress.reduced,5012.43);assert.ok(Math.abs(result.progress.percent-21.63994)<.01);assert.equal(JSON.stringify({bnpl,dues,payments}),before);assert.equal(migratePaymentModel({debts:[bnpl],monthlyDueSchedules:dues}).debts[0].originalStartingBalance,null);
});
test('incomplete BNPL history, unpaid historical dues, duplicate rows and adjustments remain unavailable',()=>{
 for(const [rows,history] of [[dues.slice(1),payments],[dues,[{...payments[0],date:'2026-09-15'}]],[dues,[]],[[...dues,{debtId:2,month:'2026-09',dueAmount:100}],payments],[[...dues,dues[0]],payments],[dues,[...payments,{debtId:2,kind:'reconcile',amount:100,date:'2026-10-16'}]]])assert.equal(reconstructBnplTrackedAmount(bnpl,18150.45,history,rows,'2026-10'),null);
});
test('BNPL scheduled versus pending new charges enter tracked liability exactly once',()=>{
 const history=[...payments,{debtId:2,kind:'borrowing',amount:1500,date:'2026-10-16'}];
 const scheduled=dues.map(row=>row.month==='2026-11'?{...row,dueAmount:7500}:row);assert.equal(reconstructBnplTrackedAmount(bnpl,19650.45,history,scheduled,'2026-10'),24662.88);
 assert.equal(reconstructBnplTrackedAmount({...bnpl,unscheduledCharges:1500},19650.45,history,dues,'2026-10'),24662.88);
 const immutable=debtAnalytics([{...bnpl,originalStartingBalance:23162.88}],history,'2026-10',scheduled).active[0].progress;assert.equal(immutable.tracked,24662.88);
});
test('BNPL progress read-only reconstruction is stable across backup round-trip',()=>{
 const state={debts:[bnpl],monthlyDueSchedules:dues,transactions:payments,bills:[],incomeEntries:[]};const restored=parseBackup(createBackup(state),'2026-10').data;assert.deepEqual(debtAnalytics(restored.debts,restored.transactions,'2026-10',restored.monthlyDueSchedules).active[0].progress,debtAnalytics(state.debts,state.transactions,'2026-10',dues).active[0].progress);assert.deepEqual(restored.transactions,payments);
});
