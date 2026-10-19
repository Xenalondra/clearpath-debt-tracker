import { migratePaymentModel } from "./planner-logic.mjs";
import { migrateExpenses } from "./expense-logic.mjs";
const number=value=>typeof value==="number"&&Number.isFinite(value);
const month=value=>typeof value==="string"&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const date=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value));
const ensure=(ok)=>{if(!ok)throw Error("This file doesn't appear to be a valid Clearpath backup.");};
function rows(value){ensure(Array.isArray(value));const ids=new Set();for(const row of value){ensure(row&&typeof row==="object"&&number(row.id)&&!ids.has(row.id));ids.add(row.id);}return value;}
export function createBackup(data,exportedAt=new Date().toISOString()){return {app:"Clearpath",schemaVersion:1,exportedAt,data};}
export function parseBackup(raw,currentMonth){
 const input=typeof raw==="string"?JSON.parse(raw):raw;ensure(input&&typeof input==="object"&&!Array.isArray(input));
 const wrapped=input.app!==undefined||input.schemaVersion!==undefined;
 if(wrapped)ensure(input.app==="Clearpath"&&input.schemaVersion===1&&input.data&&typeof input.data==="object"&&typeof input.exportedAt==="string"&&!Number.isNaN(Date.parse(input.exportedAt)));
 const source=wrapped?input.data:input;
 ensure(source.clearpathVersion===undefined||[1,2,3,4,5,6].includes(source.clearpathVersion));
 for(const debt of rows(source.debts)){ensure(typeof debt.name==="string"&&number(debt.balance)&&debt.balance>=0);for(const key of ["minimum","planned","startingBalance","originalStartingBalance","rate","creditLimit"])if(debt[key]!=null)ensure(number(debt[key])&&debt[key]>=0);ensure(debt.status===undefined||["active","completed","archived"].includes(debt.status));}
 const bills=rows(source.bills??source.expenses??[]);
 for(const expense of bills){ensure(typeof expense.name==="string"&&number(expense.amount??expense.budget)&&(expense.amount??expense.budget)>=0);for(const key of ["actual","budget"])if(expense[key]!=null)ensure(number(expense[key])&&expense[key]>=0);if(expense.actuals!==undefined){ensure(expense.actuals&&typeof expense.actuals==="object"&&!Array.isArray(expense.actuals));for(const [key,value]of Object.entries(expense.actuals))ensure(month(key)&&number(value)&&value>=0);}if(expense.budgetVersions!==undefined){ensure(Array.isArray(expense.budgetVersions));for(const row of expense.budgetVersions)ensure(month(row.effectiveFrom)&&number(row.amount)&&row.amount>=0);}}
 const incomes=rows(source.incomeEntries??source.incomes??[]);for(const row of incomes)ensure(number(row.amount)&&row.amount>=0&&date(row.date));
 const transactions=rows(source.transactions??[]);for(const row of transactions){ensure(number(row.amount)&&date(row.date)&&typeof row.kind==="string"&&row.kind.length>0);if(row.transactionDate!==undefined)ensure(date(row.transactionDate)&&row.transactionDate===row.date);if(row.appliedMonth!==undefined)ensure(month(row.appliedMonth));}
 for(const row of source.monthlyDueSchedules??[])ensure(number(row.debtId)&&month(row.month)&&number(row.dueAmount??row.minimumAmount??row.plannedPayment)&&(row.dueAmount??row.minimumAmount??row.plannedPayment)>=0);
 for(const row of source.debtPaymentVersions??[])ensure(number(row.debtId)&&month(row.effectiveFrom)&&number(row.minimum??row.planned)&&(row.minimum??row.planned)>=0);
 if(source.cashBuffer!==undefined)ensure(number(source.cashBuffer)&&source.cashBuffer>=0);
 if(source.strategy!==undefined)ensure(["avalanche","snowball"].includes(source.strategy));
 if(source.textSize!==undefined)ensure(["standard","large","extra"].includes(source.textSize));
 if(source.dueSoonThreshold!==undefined)ensure(number(source.dueSoonThreshold)&&source.dueSoonThreshold>=0&&source.dueSoonThreshold<=31);
 const migrated=migratePaymentModel({...source,bills,incomeEntries:incomes,transactions});
 const data={...migrated,bills:migrateExpenses(bills,currentMonth),cashBuffer:source.cashBuffer??5000,strategy:source.strategy??"avalanche",textSize:source.textSize??"standard",dueSoonThreshold:source.dueSoonThreshold??3};
 return {data,exportedAt:wrapped?input.exportedAt:null,counts:{debts:data.debts.length,expenses:data.bills.length,incomes:data.incomeEntries.length,transactions:data.transactions.length}};
}
