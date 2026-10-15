import test from "node:test";
import assert from "node:assert/strict";
import {getExpenseObligation,getExpenseBudget,migrateExpenses} from "../lib/expense-logic.mjs";
import {createBackup,parseBackup} from "../lib/backup.mjs";
import {debtProgress} from "../lib/debt-analytics.mjs";
const expense={id:1,name:"Electricity",amount:5000,budget:5000,type:"variable"};
test("A-D: month-specific actual, partial remainder, higher bill, zero and future budget",()=>{
 const actual={...expense,actuals:{"2026-10":4190.99}};
 assert.equal(getExpenseObligation(actual,"2026-10"),4190.99);assert.equal(getExpenseObligation(actual,"2026-10")-2000,2190.99);assert.equal(getExpenseObligation(actual,"2026-11"),5000);
 assert.equal(getExpenseObligation({...expense,actuals:{"2026-10":5650}},"2026-10"),5650);assert.equal(getExpenseObligation({...expense,actuals:{"2026-10":0}},"2026-10"),0);
 const dated={...actual,budgetVersions:[{effectiveFrom:"2026-11",amount:6000}]};assert.equal(getExpenseBudget(dated,"2026-10"),5000);assert.equal(getExpenseBudget(dated,"2026-11"),6000);
});
test("legacy actual migration is idempotent and retains past month's explicit amount",()=>{
 const source=[{...expense,actual:4190.99,effectiveFrom:"2026-10"}];const migrated=migrateExpenses(source,"2026-11");assert.equal(getExpenseObligation(migrated[0],"2026-10"),4190.99);assert.equal(getExpenseObligation(migrated[0],"2026-11"),5000);assert.deepEqual(migrateExpenses(migrated,"2026-12"),migrated);assert.equal(source[0].actuals,undefined);
});
const state={clearpathVersion:6,debts:[],bills:[{...expense,actuals:{"2026-10":4190.99}}],transactions:[],incomeEntries:[],monthlyDueSchedules:[],debtPaymentVersions:[],cashBuffer:5000,strategy:"snowball",textSize:"large",dueSoonThreshold:5};
test("E: envelope and legacy backup preserve financial fields and settings",()=>{
 for(const source of [state,createBackup(state)]){const result=parseBackup(JSON.stringify(source),"2026-10");for(const field of Object.keys(state))assert.deepEqual(result.data[field],state[field]);}
});
test("F: corrupt, invalid records, future schemas and invalid settings are rejected without mutating input",()=>{
 for(const invalid of ["{",{}, {...state,debts:[{id:1,name:"bad",balance:"100"}]},{...state,bills:[{...expense,actuals:{"2026-13":10}}]},{...state,cashBuffer:-1},{...createBackup(state),schemaVersion:999},{...state,transactions:[{id:1,amount:NaN,date:"2026-10-15",kind:"payment"}]}])assert.throws(()=>parseBackup(invalid,"2026-10"));assert.equal(state.bills[0].actuals["2026-10"],4190.99);
});
test("legacy activity with unknown labels is preserved, never reclassified as a payment",()=>{
 const transactions=[{id:1,date:"2026-10-15",amount:10,kind:"null"}];assert.deepEqual(parseBackup({...state,transactions},"2026-10").data.transactions,transactions);
});
test("G: reliable immutable BNPL snapshot gives actual progress; missing history stays unavailable",()=>{
 const debt={id:1,category:"BNPL (Pay Later)",variableMonthlyDues:true,originalStartingBalance:23162.88};const progress=debtProgress(debt,18150.45,[]);assert.equal(progress.tracked,23162.88);assert.equal(progress.reduced,5012.43);assert.ok(Math.abs(progress.percent-21.63994)<.01);assert.equal(debtProgress({...debt,originalStartingBalance:null},18150.45,[]).percent,null);
});
