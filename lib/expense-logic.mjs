const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
export function getExpenseBudget(expense,month){
 const version=(expense.budgetVersions??[]).filter(row=>row.effectiveFrom<=month).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
 return Number(version?.amount??expense.budget??expense.amount??0);
}
export function getExpenseObligation(expense,month){
 if(owns(expense.actuals??{},month))return expense.actuals[month];
 if(expense.actual!==undefined&&month===(expense.actualMonth??expense.month??expense.effectiveFrom))return expense.actual;
 return getExpenseBudget(expense,month);
}
// Anchor old global actuals once; never let them leak into every recurring month.
export function migrateExpenses(expenses,month){return expenses.map(expense=>{const anchor=expense.actualMonth??expense.month??expense.effectiveFrom??month;return {...expense,...(expense.actual!==undefined?{actualMonth:anchor,actuals:{[anchor]:expense.actual,...expense.actuals}}:{})};});}
