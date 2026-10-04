import assert from "node:assert/strict";
import { chromium } from "playwright";
const base=process.env.CLEARPATH_URL||"http://localhost:3000";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on("pageerror",error=>{throw error;});
const month=new Date().toISOString().slice(0,7);
const nextMonth=(offset)=>{const date=new Date(`${month}-02T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+offset);return date.toISOString().slice(0,7);};
async function state(){return page.evaluate(()=>JSON.parse(localStorage.getItem("clearpath-plan-v4-php")));}
async function go(path=""){await page.goto(base+path);await page.waitForTimeout(250);}
await go();await page.evaluate(()=>localStorage.setItem("clearpath-plan-v4-php",JSON.stringify({clearpathVersion:5,debts:[],bills:[],incomeEntries:[],transactions:[],monthlyDueSchedules:[],cashBuffer:0,strategy:"avalanche"})));await go("/debts");
await page.getByRole("button",{name:/Add debt/}).click();
let dialog=page.getByRole("dialog");
for(const name of ["balance","rate","minimum","creditLimit"]){const input=dialog.locator(`input[name=${name}]`);assert.equal(await input.inputValue(),"");assert.equal(await input.getAttribute("placeholder"),"0.00");}
assert.equal(await dialog.getByText(/Planned payment/i).count(),0);
await dialog.getByLabel("Debt name").fill("Personal Loan Test");
await dialog.getByLabel("Current balance").fill("100000");
await dialog.getByLabel("Monthly payment",{exact:true}).fill("9250");
await dialog.getByLabel("Due day").fill("16");
await dialog.getByLabel("APR / rate (%)").fill("0");
await dialog.getByRole("button",{name:"Add to plan"}).click();
await dialog.waitFor({state:"hidden"});assert.equal((await state()).debts.length,1);
await go("/debts");assert.match(await page.locator(".debt-card").innerText(),/Personal Loan Test/);
await page.locator(".debt-card").getByRole("button",{name:"Edit debt"}).click();dialog=page.getByRole("dialog");const savedZero=dialog.getByLabel("APR / rate (%)");assert.equal(await savedZero.inputValue(),"0");await savedZero.focus();await savedZero.pressSequentially("12.50");assert.equal(await savedZero.inputValue(),"12.50");await dialog.getByRole("button",{name:"Save changes"}).click();assert.equal((await state()).debts[0].rate,12.5);
await page.getByRole("button",{name:/Add debt/}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Debt name").fill("Fixed BNPL");await dialog.getByLabel("Debt category").selectOption("BNPL (Pay Later)");assert.equal(await dialog.locator(".schedule-row").count(),0);await dialog.getByLabel("Current balance").fill("5000");await dialog.getByLabel("Monthly due",{exact:true}).fill("3600");await dialog.getByLabel("Due day").fill("18");await dialog.getByRole("button",{name:"Add to plan"}).click();assert.equal((await state()).debts.length,2);await page.getByLabel("Debt actions for Fixed BNPL").click();await page.getByRole("menuitem",{name:"Delete debt"}).click();await page.getByRole("dialog").getByRole("button",{name:"Delete debt"}).click();
await page.getByRole("button",{name:/Add debt/}).click();dialog=page.getByRole("dialog");
await dialog.getByLabel("Debt name").fill("Test BNPL");await dialog.getByLabel("Debt category").selectOption("BNPL (Pay Later)");
await dialog.getByRole("radio",{name:"Monthly amounts vary"}).click();
assert.equal(await dialog.locator('input[name=balance]').count(),0);assert.equal(await dialog.locator('input[name=minimum]').count(),0);assert.equal(await dialog.locator('input[name=planned]').count(),0);
await dialog.getByLabel("Due day").fill("16");
const count=dialog.getByLabel("Number of upcoming months");
await count.focus();await count.pressSequentially("3");await count.press("Tab");assert.equal(await count.inputValue(),"3");
assert.equal(await dialog.locator(".schedule-row").count(),3);
for(const [index,amount] of ["2990","1234","789"].entries()){const field=dialog.getByLabel(`Due amount ${index+1}`);assert.equal(await field.inputValue(),"");await field.fill(amount);}
assert.match(await dialog.locator(".scheduled-balance").innerText(),/₱5,013/);
await dialog.getByRole("button",{name:/Add month/}).click();assert.equal(await count.inputValue(),"4");assert.match(await dialog.locator(".schedule-row").last().innerText(),new RegExp(new Date(`${nextMonth(3)}-02`).toLocaleDateString("en-PH",{month:"long",year:"numeric"})));
await dialog.getByLabel("Due amount 4").fill("0");
await dialog.getByRole("button",{name:"Add to plan"}).click();await dialog.waitFor({state:"hidden"});
assert.equal((await state()).debts.length,2);assert.equal((await state()).monthlyDueSchedules.length,4);assert.ok((await state()).monthlyDueSchedules.every(row=>!("plannedPayment" in row)));
await go();for(const [offset,amount] of [[0,"₱2,990"],[1,"₱1,234"],[2,"₱789"]]){await page.getByLabel("Viewing month").fill(nextMonth(offset));assert.match(await page.locator(".check-row").filter({hasText:"Test BNPL"}).innerText(),new RegExp(amount.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));}
await page.getByLabel("Viewing month").fill(month);
await page.locator(".check-row").filter({hasText:"Test BNPL"}).getByLabel("More actions for Test BNPL").click();
await page.getByRole("menuitem",{name:"Pay different amount",exact:true}).first().click();dialog=page.getByRole("dialog");
assert.equal(await dialog.locator('input[name=amount]').inputValue(),"");await dialog.getByLabel("Amount",{exact:true}).fill("1500");await dialog.getByRole("button",{name:"Record payment",exact:true}).click();
assert.equal((await state()).transactions[0].amount,1500);assert.equal((await state()).monthlyDueSchedules[0].dueAmount,2990);
await go("/debts");assert.match(await page.locator(".debt-card").filter({hasText:"Test BNPL"}).innerText(),/₱3,513/);
await page.getByLabel("Debt actions for Personal Loan Test").click();await page.getByRole("menuitem",{name:"Delete debt"}).click();await page.getByRole("dialog").getByRole("button",{name:"Delete debt"}).click();assert.equal((await state()).debts.length,1);
await page.getByLabel("Debt actions for Test BNPL").click();await page.getByRole("menuitem",{name:"Remove from active debts"}).click();await page.getByRole("dialog").getByRole("button",{name:"Remove debt"}).click();assert.equal((await state()).debts[0].status,"archived");assert.equal((await state()).transactions.length,1);

// Actual completion is distinct from projection. Seed a loan that can be cleared.
await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem("clearpath-plan-v4-php"));data.debts.push({id:99,name:"Finish Me",category:"Personal Loan",balance:500,startingBalance:500,minimum:500,rate:0,dueDay:16,status:"active",variableMonthlyDues:false,color:"#86D3B4"});localStorage.setItem("clearpath-plan-v4-php",JSON.stringify(data));});
await go();await page.getByRole("button",{name:"Pay Finish Me",exact:true}).click();assert.equal((await state()).debts.find(debt=>debt.id===99).status,"completed");
await go("/debts");await page.getByRole("tab",{name:"Completed",exact:true}).click();assert.match(await page.locator(".completed-card").innerText(),/Finish Me[\s\S]*Completed/);
await go("/settings");const buffer=page.getByLabel(/Protected cash buffer/);assert.equal(await buffer.inputValue(),"0");await buffer.focus();await buffer.pressSequentially("123.50");await buffer.press("Tab");assert.equal((await state()).cashBuffer,123.5);
await go();await page.getByRole("button",{name:/Add income/}).first().click();dialog=page.getByRole("dialog");assert.equal(await dialog.getByLabel("Expected amount").inputValue(),"");await dialog.getByLabel("Expected amount").fill("123.50");assert.equal(await dialog.getByLabel("Expected amount").inputValue(),"123.50");await dialog.getByLabel("Close",{exact:true}).click();
await go("/expenses");await page.getByRole("button",{name:/Add expense/}).click();dialog=page.getByRole("dialog");assert.equal(await dialog.getByLabel("Budget / expected amount").inputValue(),"");assert.equal(await dialog.getByLabel("Actual amount (optional)").inputValue(),"");await dialog.getByLabel("Close",{exact:true}).click();

// Exact reported forecast and capped post-payoff obligations.
await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem("clearpath-plan-v4-php"));data.debts=[{id:16,name:"Exact BNPL",category:"BNPL (Pay Later)",variableMonthlyDues:true,balance:1000,startingBalance:2866.66,minimum:0,rate:0,dueDay:16,status:"active",color:"#93C5FD"},{id:17,name:"Cap Loan",category:"Personal Loan",balance:3000,startingBalance:3000,minimum:9250,rate:0,dueDay:16,status:"active",color:"#A78BFA"}];data.transactions=[];data.monthlyDueSchedules=[['2026-10',543],['2026-11',1234],['2026-12',600],['2027-01',489.66]].map(([month,dueAmount],index)=>({id:index+1,debtId:16,month,dueAmount,minimumAmount:dueAmount,dueDay:16,note:""}));localStorage.setItem("clearpath-plan-v4-php",JSON.stringify(data));});
await go("/debts");await page.getByLabel("Viewing month").fill("2026-12");assert.match(await page.locator(".debt-card").filter({hasText:"Exact BNPL"}).innerText(),/₱489.66/);assert.match(await page.locator(".debt-card").filter({hasText:"Cap Loan"}).innerText(),/December due ₱0/);
await page.getByLabel("Viewing month").fill("2027-01");assert.equal(await page.locator(".debt-card").filter({hasText:"Exact BNPL"}).locator("h3").innerText(),"₱0");
await go("/settings");const downloadEvent=page.waitForEvent("download");await page.getByRole("button",{name:"Export backup"}).click();const backupPath=await (await downloadEvent).path();const backup=JSON.parse(await (await import("node:fs/promises")).readFile(backupPath,"utf8"));assert.equal(backup.clearpathVersion,6);assert.equal(backup.monthlyDueSchedules.length,4);assert.ok(!("planned" in backup.debts[0]));assert.ok(!("plannedPayment" in backup.monthlyDueSchedules[0]));await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem("clearpath-plan-v4-php"));saved.monthlyDueSchedules=[];localStorage.setItem("clearpath-plan-v4-php",JSON.stringify(saved));});await go("/settings");page.once("dialog",dialog=>dialog.accept());await page.locator('input[type=file]').setInputFiles(backupPath);await page.waitForTimeout(250);assert.equal((await state()).monthlyDueSchedules.length,4);
await go();await page.getByLabel("Viewing month").fill("2027-02");assert.equal(await page.locator(".cash-grid article").filter({hasText:"DEBT PAYMENTS"}).locator("strong").innerText(),"₱0");assert.equal(await page.locator(".check-row").count(),0);
for(const width of [375,390,430,768,1280]){await page.setViewportSize({width,height:900});await go("/debts");await page.getByRole("button",{name:/Add debt/}).click();dialog=page.getByRole("dialog");await dialog.getByLabel("Debt category").selectOption("BNPL (Pay Later)");await dialog.getByRole("radio",{name:"Monthly amounts vary"}).click();await dialog.getByLabel("Number of upcoming months").fill("24");await dialog.getByLabel("Number of upcoming months").press("Tab");assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);const footer=await dialog.locator(".modal-footer").boundingBox();assert.ok(footer.y>=0&&footer.y+footer.height<=900,`footer clipped at ${width}`);await page.screenshot({path:`/tmp/clearpath-stable-${width}.png`});await dialog.getByLabel("Close",{exact:true}).click();}
console.log("PASS: stabilization interactions, exact forecast, lifecycle, migration inputs, and five responsive widths.");
const november=await browser.newPage();await november.clock.install({time:new Date("2026-11-04T12:00:00+08:00")});await november.goto(base);await november.evaluate(()=>localStorage.setItem("clearpath-plan-v4-php",JSON.stringify({clearpathVersion:5,debts:[{id:1,name:"November Due",category:"BNPL (Pay Later)",variableMonthlyDues:true,balance:9999,startingBalance:1834,rate:0,minimum:0,dueDay:18,status:"active",color:"#93C5FD"}],monthlyDueSchedules:[{id:1,debtId:1,month:"2026-11",dueAmount:1234,minimumAmount:1234,dueDay:18},{id:2,debtId:1,month:"2026-12",dueAmount:600,minimumAmount:600,dueDay:18}],transactions:[],bills:[],incomeEntries:[],cashBuffer:0})));await november.reload();await november.getByLabel("Viewing month").fill("2026-11");await november.getByLabel("More actions for November Due").click();await november.getByRole("menuitem",{name:"Pay different amount"}).click();await november.getByRole("dialog").getByLabel("Amount",{exact:true}).fill("1500");await november.getByRole("button",{name:"Record payment",exact:true}).click();await november.goto(base+"/debts");assert.match(await november.locator(".debt-card").innerText(),/₱334/);const novSaved=await november.evaluate(()=>JSON.parse(localStorage.getItem("clearpath-plan-v4-php")));assert.equal(novSaved.monthlyDueSchedules[0].dueAmount,1234);assert.equal(novSaved.transactions[0].amount,1500);
console.log("PASS: November overpayment records a transaction and preserves the scheduled due.");
await browser.close();
