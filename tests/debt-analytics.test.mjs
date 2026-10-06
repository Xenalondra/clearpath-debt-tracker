import test from "node:test";
import assert from "node:assert/strict";
import { debtAnalytics, debtProgress, browseDebts } from "../lib/debt-analytics.mjs";
const debt=(id,balance,category="Personal Loan")=>({id,name:`Debt ${id}`,category,balance,startingBalance:balance,rate:0,status:"active",dueDay:id,color:"#A78BFA"});
test("overview uses actual active balances and real debt/category shares",()=>{
 const data=debtAnalytics([debt(1,100000),debt(2,50000),debt(3,25000,"Credit Card"),{...debt(4,50000),status:"completed"}, {...debt(5,90000),status:"archived"}],[],"2026-10");
 assert.equal(data.remaining,175000);assert.deepEqual(data.byDebt.map(row=>Math.round(row.percent*100)/100),[57.14,28.57,14.29]);
 assert.deepEqual(data.byCategory.map(row=>[row.name,row.amount,Math.round(row.percent*100)/100]),[["Personal Loan",150000,85.71],["Credit Card",25000,14.29]]);
 assert.equal(data.cleared,1);assert.equal(data.count,4);
});
test("tracked debt includes borrowing, interest, fees and positive adjustments, not payments",()=>{
 const history=[['borrowing',10000],['interest',2000],['payment',5000],['reconcile',-4000]].map(([kind,amount])=>({debtId:1,entity:"debt",kind,amount}));
 assert.deepEqual(debtProgress(debt(1,100000),70000,history),{tracked:112000,reduced:42000,percent:37.5});
 assert.equal(debtProgress(debt(1,100000),70000,[...history,{entity:"debt",debtId:1,kind:"fee",amount:1000},{entity:"debt",debtId:1,kind:"reconcile",amount:2000}]).tracked,115000);
});
test("additional borrowing honestly reduces progress and never alters starting snapshot",()=>{
 const d=debt(1,100000);assert.equal(debtProgress(d,50000).percent,50);
 const progress=debtProgress(d,70000,[{debtId:1,kind:"borrowing",amount:20000}]);assert.equal(Math.round(progress.percent*100)/100,41.67);assert.equal(d.startingBalance,100000);
});
test("variable BNPL uses its immutable snapshot and canonical actual balance",()=>{
 const d={...debt(1,99999,"BNPL (Pay Later)"),variableMonthlyDues:true,originalStartingBalance:2866.66};const dues=[{debtId:1,month:"2026-10",dueAmount:543},{debtId:1,month:"2026-11",dueAmount:2323.66}];
 const data=debtAnalytics([d],[{entity:"debt",debtId:1,kind:"payment",amount:543,date:"2026-10-04"}],"2026-10",dues);assert.equal(data.remaining,2323.66);assert.equal(data.active[0].progress.tracked,2866.66);
});
test("empty, single, legacy and zero tracked values never produce fake percentages",()=>{
 assert.equal(debtAnalytics([],[],"2026-10").remaining,0);assert.deepEqual(debtAnalytics([],[],"2026-10").byDebt,[]);
 assert.equal(debtAnalytics([debt(1,100)],[],"2026-10").byDebt[0].percent,100);
 const legacy={...debt(1,1000,"BNPL (Pay Later)"),variableMonthlyDues:true};assert.equal(debtProgress(legacy,500).percent,null);
 assert.equal(debtAnalytics([{...legacy,status:"completed"}],[],"2026-10").completedTracked,null);
 assert.equal(debtProgress({...debt(1,0)},0).percent,null);assert.equal(debtProgress(debt(1,100),200).percent,0);
 assert.equal(debtProgress(debt(1,100),-10).percent,100);
});
test("search and all sort choices are read-only, estimates and unknown progress sort last",()=>{
 const entries=[{debt:{...debt(1,100000),name:"Visa Platinum",rate:21},balance:100000,dueDay:28,payoff:"2027-04",progress:{percent:40}},{debt:{...debt(2,1000),name:"Lazada PayLater",category:"BNPL (Pay Later)",rate:0},balance:1000,dueDay:16,payoff:"2026-12",progress:{percent:50}},{debt:debt(3,5000),balance:5000,dueDay:1,progress:{percent:null}}];
 const before=JSON.stringify(entries);assert.deepEqual(browseDebts(entries,"lazada").map(row=>row.debt.id),[2]);assert.deepEqual(browseDebts(entries,"personal").map(row=>row.debt.id),[1,3]);
 for(const [sort,ids] of [["highest-balance",[1,3,2]],["lowest-balance",[2,3,1]],["due",[3,2,1]],["payoff",[2,1,3]],["most-progress",[2,1,3]],["least-progress",[1,2,3]]])assert.deepEqual(browseDebts(entries,"",sort).map(row=>row.debt.id),ids);
 assert.equal(browseDebts(entries,"","apr")[0].debt.id,1);assert.equal(browseDebts(entries,"","priority","avalanche",[2,1])[0].debt.id,2);assert.equal(JSON.stringify(entries),before);
});
