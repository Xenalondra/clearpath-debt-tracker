import test from "node:test";
import assert from "node:assert/strict";
import { isRevolvingDebt, shouldCompleteDebt, effectiveDebtPlan, migratePaymentModel } from "../lib/planner-logic.mjs";
import { debtAnalytics } from "../lib/debt-analytics.mjs";
const card={id:1,name:"Maribank CC",category:"Credit Card",balance:0,startingBalance:3905.48,minimum:500,creditLimit:30000,rate:0,dueDay:15,status:"active"};
test("zero revolving balances stay open, have no default obligation and do not count as completed",()=>{
 for(const debt of [card,{...card,category:"Revolving Credit / Credit Line"},{...card,category:"Other Loan",revolving:true}]){
  assert.ok(isRevolvingDebt(debt));assert.equal(shouldCompleteDebt(debt,0),false);assert.equal(effectiveDebtPlan(debt,"2026-10","2026-10").minimum,0);
  const analytics=debtAnalytics([debt],[],"2026-10");assert.equal(analytics.active.length,1);assert.equal(analytics.cleared,0);assert.equal(analytics.remaining,0);assert.equal(analytics.byDebt.length,0);assert.equal(analytics.active[0].progress.percent,100);
 }
});
test("new charges resume dues; historical dues and real statement overrides remain intact",()=>{
 assert.equal(effectiveDebtPlan({...card,balance:1500},"2026-11","2026-11").minimum,500);
 assert.equal(effectiveDebtPlan(card,"2026-09","2026-10").minimum,500);
 assert.equal(effectiveDebtPlan(card,"2026-10","2026-10",[{debtId:1,month:"2026-10",dueAmount:300}]).minimum,300);
 assert.equal(shouldCompleteDebt({...card,category:"Personal Loan"},0),true);
 assert.equal(shouldCompleteDebt({...card,category:"BNPL (Pay Later)"},0),true);
});
test("restore preserves active/archive distinction, repairs legacy automatic card completion, and is idempotent",()=>{
 const transactions=[{id:5,entity:"debt",debtId:1,kind:"payment",amount:3905.48,date:"2026-10-15"}];
 const source={debts:[card,{...card,id:2,status:"archived"},{...card,id:3,status:"completed",completedDate:"2026-10-15"},{...card,id:4,category:"Personal Loan",status:"completed"}],transactions};
 const migrated=migratePaymentModel(source);assert.deepEqual(migrated.debts.map(d=>d.status),["active","archived","active","completed"]);assert.deepEqual(migrated.transactions,transactions);assert.deepEqual(migratePaymentModel(migrated),migrated);assert.equal(source.debts[2].status,"completed");
});
