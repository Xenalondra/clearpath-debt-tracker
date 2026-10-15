import test from "node:test";
import assert from "node:assert/strict";
import { balanceChartData } from "../lib/chart-data.mjs";
test("chart adapter consumes balances without changing records; sums and colors are stable",()=>{
 const rows=[{debt:{id:1,name:"Visa",category:"Credit Card",color:"#ABCDEF"},balance:400000},{debt:{id:2,name:"Loan",category:"Personal Loan"},balance:65766.5},{debt:{id:3,name:"Zero",category:"Cash Loan"},balance:0},{debt:{id:4,status:"completed"},balance:100}];
 const before=structuredClone(rows),chart=balanceChartData(rows);
 assert.equal(chart.remaining,465766.5);assert.equal(chart.byDebt.length,2);assert.equal(chart.byDebt[0].color,"#ABCDEF");assert.equal(chart.byCategory.reduce((sum,row)=>sum+row.amount,0),chart.remaining);
 assert.deepEqual(rows,before);const reversed=balanceChartData([...rows].reverse());
 for(const slice of chart.byCategory)assert.equal(reversed.byCategory.find(row=>row.key===slice.key).color,slice.color);
});
test("empty and zero chart balances have no slices or invalid percentages",()=>{
 assert.deepEqual(balanceChartData([]),{remaining:0,byDebt:[],byCategory:[]});
 assert.deepEqual(balanceChartData([{debt:{id:1},balance:0}]),{remaining:0,byDebt:[],byCategory:[]});
});
