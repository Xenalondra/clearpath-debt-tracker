import {getExpenseObligation} from "./expense-logic.mjs";
import {getActualRemainingDebtBalance} from "./planner-logic.mjs";
const round=value=>Math.round(value*100)/100;
export function plannerSummary(data,month){
 const bills=data.bills??[],incomes=data.incomeEntries??[],debts=data.debts??[];
 return {incomeSources:incomes.length,currentIncome:round(incomes.filter(i=>i.recurrence==="monthly"?i.date.slice(0,7)<=month:i.date.slice(0,7)===month).reduce((sum,i)=>sum+i.amount,0)),expenses:bills.length,currentExpenseObligation:round(bills.filter(e=>(!e.effectiveFrom||e.effectiveFrom<=month)&&(!e.inactiveFrom||e.inactiveFrom>month)&&(e.type!=="one-time"||e.month===month)).reduce((sum,e)=>sum+getExpenseObligation(e,month),0)),activeDebts:debts.filter(d=>d.status!=="archived"&&d.status!=="completed").length,completedDebts:debts.filter(d=>d.status==="completed").length,totalDebt:round(debts.filter(d=>d.status!=="archived"&&d.status!=="completed").reduce((sum,d)=>sum+getActualRemainingDebtBalance(d,month,data.monthlyDueSchedules,data.transactions),0)),variableBnplScheduleRows:(data.monthlyDueSchedules??[]).filter(row=>debts.some(d=>d.id===row.debtId&&d.variableMonthlyDues)).length,transactions:(data.transactions??[]).length,cashBuffer:data.cashBuffer,strategy:data.strategy,textSize:data.textSize,dueSoonThreshold:data.dueSoonThreshold};
}
