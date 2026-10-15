import assert from "node:assert/strict";
import { chromium } from "playwright";
import { projectDebtBalance } from "../lib/planner-logic.mjs";
const base=process.env.CLEARPATH_URL||"http://localhost:3000",key="clearpath-plan-v4-php",month=new Date().toISOString().slice(0,7);
const date=new Date(month+"-02T12:00:00Z");date.setUTCMonth(date.getUTCMonth()+2);const future=date.toISOString().slice(0,7);
const money=new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2});
const seed={clearpathVersion:6,debts:[{id:1,name:"Visa Platinum",category:"Credit Card",balance:100000,startingBalance:160000,rate:12,minimum:15000,dueDay:28,color:"#93C5FD",creditLimit:200000},{id:2,name:"Personal Loan",category:"Personal Loan",balance:50000,startingBalance:100000,rate:0,minimum:5000,dueDay:1,color:"#A78BFA"},{id:3,name:"Lazada PayLater",category:"BNPL (Pay Later)",variableMonthlyDues:true,balance:20000,originalStartingBalance:20000,startingBalance:20000,rate:0,dueDay:16,color:"#F3B66A",minimum:0}],monthlyDueSchedules:[{debtId:3,month,dueAmount:10000,minimumAmount:10000,dueDay:16},{debtId:3,month:future,dueAmount:10000,minimumAmount:10000,dueDay:16}],transactions:[],bills:[],incomeEntries:[],cashBuffer:0};
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];page.on("pageerror",error=>errors.push(error.message));
async function go(){await page.goto(base+"/debts");await page.getByRole("region",{name:"Debt overview"}).waitFor();await page.waitForTimeout(250);}
await go();await page.evaluate(({key,seed})=>localStorage.setItem(key,JSON.stringify(seed)),{key,seed});await go();
const snapshot=await page.evaluate(key=>localStorage.getItem(key),key),stored=JSON.parse(snapshot);
const projected=stored.debts.map(debt=>projectDebtBalance(debt,month,future,stored.monthlyDueSchedules,stored.debtPaymentVersions||[],0));
const expected=money.format(Math.round(projected.reduce((sum,value)=>sum+value,0)*100)/100);
for(const width of [360,375,390,430,768,1280]){
 await page.setViewportSize({width,height:900});await page.getByLabel("Viewing month").fill(month);
 const chart=page.locator(".debt-donut"),legend=page.locator(".debt-legend");let c=await chart.boundingBox(),l=await legend.boundingBox();assert.ok(l.x>=c.x+c.width-1,`Legend right ${width}`);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await chart.locator(".donut-center").evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight),`Center clipped ${width}`);
 const segment=chart.getByRole("button",{name:/Visa Platinum/});await segment.focus();await page.keyboard.press("Enter");
 let details=page.getByRole("dialog",{name:"Balance details"});await details.waitFor();assert.match(await details.innerText(),/Visa Platinum[\s\S]*Actual balances today[\s\S]*₱100,000/);
 let box=await details.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=900,`Details clipped ${width}`);
 await page.keyboard.press("Escape");await details.waitFor({state:"detached"});
 await legend.getByRole("button",{name:/Visa Platinum/}).click();await details.waitFor();await legend.getByRole("button",{name:/Personal Loan/}).click();assert.match(await details.innerText(),/Personal Loan/);await details.getByRole("button",{name:"Close balance details"}).click();
 // Exercise an actual pointer tap/click on a ring segment, not just its legend.
 c=await chart.boundingBox();await page.mouse.click(c.x+c.width*.82,c.y+c.height*.3);await details.waitFor();await page.keyboard.press("Escape");
 await page.getByLabel("Viewing month").fill(future);assert.equal(await chart.locator(".donut-center strong").innerText(),expected);assert.equal(Number((await chart.locator(".donut-center strong").innerText()).replace(/[^0-9.]/g,"")),Number((await page.locator(".projection-summary strong").first().innerText()).replace(/[^0-9.]/g,"")));assert.match(await chart.innerText(),/PROJECTED REMAINING DEBT/);
 assert.equal(await legend.getByRole("button",{name:/Lazada/}).count(),0,"Zero projected BNPL must be excluded");
 await page.getByRole("tab",{name:"By category",exact:true}).click();assert.equal(await chart.locator(".donut-center strong").innerText(),expected);
 await legend.getByRole("button",{name:/Credit Card/}).click();await details.waitFor();assert.match(await details.innerText(),/Projected balance[\s\S]*Forecast/);await page.keyboard.press("Escape");await page.getByRole("tab",{name:"By debt",exact:true}).click();
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),snapshot,"Chart interaction changed persisted records");
 await page.getByRole("region",{name:"Debt overview"}).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-16,behavior:"instant"}));
 await page.screenshot({path:`/tmp/clearpath-chart-preview-${width}.png`});
 await page.screenshot({path:`/tmp/clearpath-charts-${width}.png`,fullPage:true});console.log(`PASS ${width}px: right legend, readable center, segment/legend selection, keyboard/dismissal, forecast matches canonical engine/card, no overflow, no record changes`);
}
await page.getByLabel("Viewing month").fill("2045-12");assert.match(await page.getByRole("region",{name:"Debt overview"}).innerText(),/Projected debt-free/);assert.equal(await page.locator(".debt-donut").count(),0);assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),snapshot);
assert.deepEqual(errors,[]);await browser.close();console.log("PASS: projected zero state leaves actual lifecycle and records unchanged.");
