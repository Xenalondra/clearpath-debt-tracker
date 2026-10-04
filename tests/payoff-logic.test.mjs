import test from "node:test";
import assert from "node:assert/strict";
import { getActualRemainingDebtBalance, getOriginalStartingBalance, isValidActualPayment, migratePaymentModel, effectiveDebtPlan } from "../lib/planner-logic.mjs";
const debt={id:1,category:"BNPL (Pay Later)",variableMonthlyDues:true,balance:1000,startingBalance:2866.66,originalStartingBalance:2866.66,rate:0,dueDay:18};
const dues=[['2026-10',543],['2026-11',1234],['2026-12',600],['2027-01',489.66]].map(([month,dueAmount])=>({debtId:1,month,dueAmount}));
const payment=(amount,date="2026-10-04")=>({entity:"debt",debtId:1,kind:"payment",amount,date});
test("full payoff uses entire canonical liability, partial payment deducts once",()=>{
 assert.equal(getActualRemainingDebtBalance(debt,"2026-10",dues),2866.66);
 assert.equal(getActualRemainingDebtBalance(debt,"2026-10",dues,[payment(543)]),2323.66);
 assert.equal(getActualRemainingDebtBalance(debt,"2026-10",dues,[payment(543),payment(2323.66)]),0);
 assert.equal(getActualRemainingDebtBalance(debt,"2026-11",dues,[payment(2866.66)]),0);
 assert.equal(dues[0].dueAmount,543);
});
test("actual balance includes valid pending borrowing and fees, not monthly minimum",()=>{
 assert.equal(getActualRemainingDebtBalance({...debt,unscheduledCharges:1000},"2026-10",dues,[payment(543)]),3323.66);
 assert.equal(getOriginalStartingBalance({...debt,unscheduledCharges:1000,balance:3866.66}),2866.66);
 assert.equal(getActualRemainingDebtBalance({id:2,category:"Personal Loan",balance:9000,minimum:543},"2026-10"),9000);
});
test("completed debt has no actual balance or future obligations while schedule stays intact",()=>{
 const completed={...debt,status:"completed",completedDate:"2026-10-10"};
 assert.equal(getActualRemainingDebtBalance(completed,"2026-12",dues),0);
 for(const month of ['2026-11','2026-12','2027-01'])assert.equal(effectiveDebtPlan(completed,month,"2026-10",dues).minimum,0);
 assert.equal(dues.length,4);
});
test("payment guard rejects zero, negative, nonfinite and overpayments",()=>{
 for(const amount of [0,-1,NaN,Infinity,2866.67])assert.equal(isValidActualPayment(amount,2866.66),false);
 assert.equal(isValidActualPayment(2866.66,2866.66),true);
 assert.equal(isValidActualPayment(1,0),false);
});
test("legacy BNPL history is not fabricated; explicit original snapshots survive repeated migrations",()=>{
 const legacy=migratePaymentModel({debts:[{...debt,originalStartingBalance:undefined,startingBalance:1000}],monthlyDueSchedules:dues,transactions:[payment(2866.66)]});
 assert.equal(legacy.clearpathVersion,6);
 assert.equal(getOriginalStartingBalance(legacy.debts[0]),null);
 assert.equal(legacy.debts[0].startingBalance,1000);
 assert.deepEqual(legacy.transactions,[payment(2866.66)]);
 const saved=migratePaymentModel({debts:[debt],monthlyDueSchedules:[{debtId:1,month:'2026-12',dueAmount:4000}]});
 assert.equal(getOriginalStartingBalance(migratePaymentModel(saved).debts[0]),2866.66);
 assert.equal(getOriginalStartingBalance({category:'Personal Loan',startingBalance:1000}),1000);
});
