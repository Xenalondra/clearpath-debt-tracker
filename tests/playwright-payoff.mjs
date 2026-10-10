import assert from "node:assert/strict";
import { chromium } from "playwright";
const base=process.env.CLEARPATH_URL||"http://localhost:3000";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];page.on("pageerror",error=>errors.push(error.message));
await page.clock.install({time:new Date("2026-10-04T12:00:00+08:00")});
const key="clearpath-plan-v4-php";
const months=["2026-10","2026-11","2026-12","2027-01"];
async function go(path=""){await page.goto(base+path);await page.getByRole("navigation",{name:"Main navigation"}).waitFor();await page.waitForTimeout(300);}
async function state(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
async function reset(){await go();await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({clearpathVersion:6,debts:[],monthlyDueSchedules:[],transactions:[],bills:[],incomeEntries:[],cashBuffer:0})),key);await go("/debts");}
async function create(){
 await reset();await page.getByRole("button",{name:/Add debt/}).click();const form=page.getByRole("dialog");
 await form.getByLabel("Debt name").fill("Payoff BNPL");await form.getByLabel("Debt category").selectOption("BNPL (Pay Later)");await form.getByRole("radio",{name:"Monthly amounts vary"}).click();
 await form.getByLabel("Due day").fill("18");await form.getByLabel("Number of upcoming months").fill("4");await form.getByLabel("Number of upcoming months").press("Tab");
 for(const [index,value] of [543,1234,600,489.66].entries())await form.getByLabel(`Due amount ${index+1}`,{exact:true}).fill(String(value));
 await form.getByRole("button",{name:"Add debt"}).click();await page.waitForTimeout(300);
 const saved=await state();assert.equal(saved.debts[0].startingBalance,2866.66);assert.equal(saved.debts[0].originalStartingBalance,2866.66);
 assert.deepEqual(saved.monthlyDueSchedules.map(row=>row.month),months);await go();
}
function row(){return page.locator(".check-row").filter({hasText:"Payoff BNPL"});}
async function menu(name="Payoff BNPL"){await page.getByLabel(`More actions for ${name}`,{exact:true}).click();}
async function different(amount,name="Payoff BNPL"){
 await menu(name);await page.getByRole("menuitem",{name:"Pay different amount",exact:true}).click();
 const form=page.getByRole("dialog");await form.getByLabel("Amount",{exact:true}).fill(String(amount));await form.getByRole("button",{name:"Record payment",exact:true}).click();await page.waitForTimeout(300);
}
async function full(amount,name="Payoff BNPL"){
 await menu(name);await page.getByRole("menuitem",{name:"Pay in full",exact:true}).click();const confirm=page.getByRole("alertdialog");
 assert.match(await confirm.innerText(),new RegExp(`₱${amount.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}`));
 await confirm.getByRole("button",{name:`Pay ₱${amount}`,exact:true}).click();await page.waitForTimeout(300);
}
async function completed(total){
 const saved=await state();assert.equal(saved.debts[0].status,"completed");assert.equal(saved.debts[0].balance,0);assert.equal(saved.debts[0].completedDate,"2026-10-04");
 assert.equal(saved.monthlyDueSchedules[0].dueAmount,543);assert.equal(saved.monthlyDueSchedules.length,4);
 assert.equal(saved.transactions.filter(t=>t.kind==="payment").reduce((sum,t)=>sum+t.amount,0),total);
 assert.equal(await row().getByRole("button",{name:"Paid Payoff BNPL",exact:true}).getAttribute("aria-pressed"),"true");assert.match(await row().innerText(),/₱543[\s\S]*₱2,866.66 paid · Paid in full/);
 for(const width of [375,390,430,768,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`paid checklist overflow at ${width}`);assert.ok(await row().getByText(/Paid in full/).isVisible());if(width===390)await page.screenshot({path:"/tmp/clearpath-paid-390.png"});}
 await menu();assert.equal(await page.getByRole("menuitem",{name:"Pay in full",exact:true}).getAttribute("aria-disabled"),"true");await page.keyboard.press("Escape");
 await page.getByRole("button",{name:"Paid Payoff BNPL",exact:true}).click();assert.equal((await state()).transactions.length,saved.transactions.length);
 for(const month of months.slice(1)){await page.getByLabel("Viewing month").fill(month);assert.equal(await page.locator(".check-row").filter({hasText:"Payoff BNPL"}).count(),0);assert.equal(await page.locator(".cash-grid article").filter({hasText:"DEBT PAYMENTS"}).locator("strong").innerText(),"₱0");}
 await go("/debts");await page.getByRole("tab",{name:"Completed",exact:true}).click();const card=page.locator(".completed-card");assert.match(await card.innerText(),/Starting balance ₱2,866.66/);assert.match(await card.innerText(),new RegExp(`Total recorded payments ₱${total.toLocaleString("en-PH")}`));
 await go("/activity");return page.locator(".activity-row").allTextContents();
}
// Create through the actual form, not a fabricated manual balance.
await create();
await menu();await page.getByRole("menuitem",{name:"Pay in full",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Cancel",exact:true}).click();assert.equal((await state()).transactions.length,0);
await full("2,866.66");assert.match(await page.getByRole("status").innerText(),/Debt cleared!.*Payoff BNPL/);
assert.equal((await state()).transactions.length,1);let activity=await completed(2866.66);assert.equal(activity.length,1);assert.match(activity[0],/−₱2,866.66/);
await create();await menu();await page.getByRole("menuitem",{name:"Pay minimum",exact:true}).click();await page.waitForTimeout(300);assert.equal((await state()).transactions[0].amount,543);
await full("2,323.66");assert.deepEqual((await state()).transactions.map(t=>t.amount),[2323.66,543]);activity=await completed(2866.66);assert.ok(activity.some(text=>text.includes("−₱543")));assert.ok(activity.some(text=>text.includes("−₱2,323.66")));
// Snapshot survives schedule editing and later actual borrowing.
await create();await go("/debts");await page.getByRole("button",{name:"Edit debt",exact:true}).click();await page.getByRole("dialog").getByLabel("Due amount 2",{exact:true}).fill("1334");await page.getByRole("dialog").getByRole("button",{name:"Save debt"}).click();
assert.equal((await state()).debts[0].originalStartingBalance,2866.66);assert.equal((await state()).monthlyDueSchedules[1].dueAmount,1334);
await page.getByRole("button",{name:"Edit debt",exact:true}).click();await page.getByRole("dialog").getByLabel("Due amount 2",{exact:true}).fill("1234");await page.getByRole("dialog").getByRole("button",{name:"Save debt"}).click();
assert.equal((await state()).debts[0].originalStartingBalance,2866.66);
await page.getByRole("button",{name:"Record activity",exact:true}).click();await page.getByRole("dialog").getByLabel("Amount",{exact:true}).fill("1000");await page.getByRole("dialog").getByRole("button",{name:"Record activity",exact:true}).click();
await go();await different(5000);assert.equal((await state()).transactions.filter(t=>t.kind==="payment").length,0);assert.match(await page.getByRole("status").innerText(),/exceeds/);
await full("3,866.66");assert.equal((await state()).debts[0].originalStartingBalance,2866.66);await go("/debts");await page.getByRole("tab",{name:"Completed",exact:true}).click();assert.match(await page.locator(".completed-card").innerText(),/Starting balance ₱2,866.66[\s\S]*Total recorded payments ₱3,866.66/);
// Legacy starting balance is retained in storage but not fabricated in Completed.
await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));delete data.debts[0].originalStartingBalance;data.debts[0].startingBalance=1000;data.clearpathVersion=5;localStorage.setItem(key,JSON.stringify(data));},key);
await go("/debts");await page.getByRole("tab",{name:"Completed",exact:true}).click();assert.match(await page.locator(".completed-card").innerText(),/Starting balance unavailable/);assert.equal((await state()).debts[0].startingBalance,1000);
// Normal debt full payoff and expense overpayment guards use the same transaction path.
await reset();await page.evaluate(key=>{const data=JSON.parse(localStorage.getItem(key));data.debts=[{id:1,name:"Normal Loan",category:"Personal Loan",balance:1000,startingBalance:1000,rate:0,minimum:100,dueDay:18,color:"#93C5FD",variableMonthlyDues:false}];data.bills=[{id:2,name:"Rent Test",amount:500,budget:500,type:"fixed",dueDay:1}];localStorage.setItem(key,JSON.stringify(data));},key);await go();
await different(501,"Rent Test");assert.equal((await state()).transactions.length,0);assert.match(await page.getByRole("status").innerText(),/exceeds/);
await different(200,"Rent Test");assert.equal((await state()).transactions[0].amount,200);await different(301,"Rent Test");assert.equal((await state()).transactions.length,1);await different(300,"Rent Test");assert.equal((await state()).transactions.length,2);
for(const width of [375,390,430,768,1280]){
 await page.setViewportSize({width,height:900});await menu("Normal Loan");await page.getByRole("menuitem",{name:"Pay in full",exact:true}).click();const confirm=page.getByRole("alertdialog");const bounds=await confirm.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=900);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`/tmp/clearpath-payoff-${width}.png`});await confirm.getByRole("button",{name:"Cancel",exact:true}).click();
}
await full("1,000","Normal Loan");assert.equal((await state()).debts[0].status,"completed");await go();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);await browser.close();console.log("PASS: full/partial BNPL payoff, actual activity, historical dues, future obligations, immutable starting snapshot, borrowing, legacy fallback, payment guards, normal payoff and five widths.");
