import assert from "node:assert/strict";
import { chromium } from "playwright";

const base=process.env.CLEARPATH_URL||"http://localhost:3000";
const key="clearpath-plan-v4-php",month=new Date().toISOString().slice(0,7);
function offsetMonth(delta){const date=new Date(`${month}-02T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+delta);return date.toISOString().slice(0,7);}
const seed={clearpathVersion:6,debts:[
 {id:1,name:"Lazada Paylater",category:"Personal Loan",balance:50000,startingBalance:75000,rate:0,minimum:1000,dueDay:1,color:"#A78BFA"},
 {id:2,name:"Lazada PayLater",category:"BNPL (Pay Later)",variableMonthlyDues:true,balance:20000,originalStartingBalance:20000,startingBalance:20000,rate:0,minimum:0,dueDay:15,color:"#F3B66A"}
],monthlyDueSchedules:[{id:1,debtId:2,month,dueAmount:10000,minimumAmount:10000,dueDay:15},{id:2,debtId:2,month:offsetMonth(1),dueAmount:10000,minimumAmount:10000,dueDay:15}],
 bills:[{id:1,name:"Rent",category:"Home",type:"fixed",amount:18000,budget:18000,dueDay:1},{id:2,name:"Internet and household connectivity",category:"Utilities",type:"fixed",amount:1499,budget:1499,dueDay:10}],
 transactions:[{id:1,entity:"expense",expenseId:1,kind:"expense-payment",amount:18000,date:offsetMonth(-1)+"-01",note:"Previous rent paid"}],incomeEntries:[],cashBuffer:0};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:375,height:812}}),errors=[];
page.on("pageerror",error=>errors.push(error.message));
async function go(path=""){await page.goto(base+path);await page.getByRole("navigation",{name:"Main navigation"}).waitFor();await page.waitForTimeout(300);}
async function saved(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Horizontal overflow");}
await go();await page.evaluate(({key,seed})=>localStorage.setItem(key,JSON.stringify(seed)),{key,seed});await go();
const baseline=await saved();
for(const width of [375,390,430]){
 await page.setViewportSize({width,height:812});
 for(const [route,name] of [["","Dashboard"],["/debts","Debts"],["/expenses","Expenses"],["/activity","Activity"]]){
  await go(route);const toolbar=page.locator(".month-toolbar"),controls=toolbar.locator(":scope > *"),boxes=await controls.evaluateAll(elements=>elements.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}));
  assert.equal(boxes.length,3);assert.ok(boxes.every(box=>Math.abs(box.y-boxes[0].y)<1&&Math.abs(box.height-44)<1),`${name} month row ${width}`);
  assert.equal(boxes[0].width,44);assert.equal(boxes[2].width,44);assert.ok(boxes[1].width>180);assert.ok(boxes[2].x+boxes[2].width<=width);
  const input=page.getByLabel("Viewing month");assert.equal(await input.inputValue(),month);
  await page.getByLabel("Previous month").click();assert.equal(await input.inputValue(),offsetMonth(-1));await page.getByLabel("Next month").click();assert.equal(await input.inputValue(),month);
  await input.fill(offsetMonth(1));assert.equal(await input.inputValue(),offsetMonth(1));await page.getByLabel("Previous month").click();assert.equal(await input.inputValue(),month);
  await noOverflow();const nav=page.getByRole("navigation",{name:"Main navigation"});
  for(const link of await nav.locator("a:visible").all()){const box=await link.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=812);assert.ok(await link.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));}
  await page.screenshot({path:`/tmp/clearpath-mobile-${name.toLowerCase()}-${width}.png`,fullPage:true});
  console.log(`PASS ${width}px: ${name} month navigation, no overflow, bottom navigation unobstructed`);
 }
 await go("/debts");const donut=page.locator(".debt-donut"),box=await donut.boundingBox(),layout=await page.locator(".overview-layout").boundingBox();assert.equal(box.width,200);assert.ok(Math.abs(box.x+box.width/2-layout.x-layout.width/2)<1);
 const legend=page.locator(".debt-legend"),legendBox=await legend.boundingBox();assert.ok(legendBox.y>=box.y+box.height&&legendBox.y-box.y-box.height<=16);assert.equal(await legend.locator("li").count(),2);assert.match(await legend.innerText(),/Lazada Paylater[\s\S]*₱50,000[\s\S]*Lazada PayLater[\s\S]*₱20,000/);
 await page.getByRole("region",{name:"Debt overview"}).evaluate(el=>window.scrollTo({top:el.getBoundingClientRect().top+scrollY-12,behavior:"instant"}));const visibleLegend=await legend.boundingBox(),navTop=(await page.locator(".sidebar").boundingBox()).y;assert.ok(visibleLegend.y>=0&&visibleLegend.y+visibleLegend.height<navTop,"Legend readable above bottom navigation");await page.screenshot({path:`/tmp/clearpath-mobile-overview-${width}.png`});
 for(const value of [70000,1449781.25,12449781.25]){await donut.locator(".donut-center strong").evaluate((el,value)=>{el.textContent=new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2}).format(value);},value);assert.ok(await donut.locator(".donut-center").evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight),"Donut center clipped");}
 await go("/expenses");const rent=page.locator("#expense-1"),edit=rent.getByRole("button",{name:"Edit",exact:true}),more=rent.getByRole("button",{name:"Expense actions for Rent"});const editBox=await edit.boundingBox(),moreBox=await more.boundingBox(),rowBox=await rent.boundingBox();assert.ok(editBox.width<100&&editBox.width<rowBox.width/2);assert.ok(Math.abs(editBox.y-moreBox.y)<1);assert.equal(moreBox.width,44);
 await edit.click();await page.getByRole("heading",{name:"Edit expense"}).waitFor();assert.equal(await page.getByLabel("Name",{exact:true}).inputValue(),"Rent");await page.getByRole("button",{name:"Close"}).click();
 await more.click();await page.getByRole("menuitem",{name:"Delete expense",exact:true}).waitFor();const menuBox=await page.getByRole("menu").boundingBox();assert.ok(menuBox.x>=0&&menuBox.x+menuBox.width<=width);await page.keyboard.press("Escape");await page.getByRole("menu").waitFor({state:"detached"});await more.focus();await page.keyboard.press("ArrowDown");await page.getByRole("menuitem",{name:"Delete expense"}).waitFor();await page.keyboard.press("Escape");await page.getByRole("menu").waitFor({state:"detached"});await page.waitForFunction(()=>document.activeElement?.getAttribute("aria-label")==="Expense actions for Rent");
 console.log(`PASS ${width}px: compact centered donut, readable legend/amounts, compact expense actions and accessible overflow`);
 assert.deepEqual(await saved(),baseline,"UI navigation changed saved data or merged similarly named debts");
}
// Existing native deletion confirmation and historical records remain intact.
await go("/expenses");await page.locator("#expense-1").getByRole("button",{name:"Expense actions for Rent"}).click();page.once("dialog",async dialog=>{assert.match(dialog.message(),/Previous recorded payments and activity will remain/);await dialog.dismiss();});await page.getByRole("menuitem",{name:"Delete expense"}).click();assert.deepEqual(await saved(),baseline);
await page.locator("#expense-1").getByRole("button",{name:"Expense actions for Rent"}).click();page.once("dialog",dialog=>dialog.accept());await page.getByRole("menuitem",{name:"Delete expense"}).click();await page.locator("#expense-1").waitFor({state:"detached"});const after=await saved();assert.deepEqual(after.transactions,baseline.transactions);assert.deepEqual(after.debts,baseline.debts);assert.equal(after.bills.find(b=>b.id===1).inactiveFrom,month);
await page.getByLabel("Previous month").click();await page.locator("#expense-1").waitFor();await go("/activity");await page.getByLabel("Previous month").click();assert.match(await page.locator(".activity").innerText(),/Rent[\s\S]*Previous rent paid/);
for(const width of [768,1280]){await page.setViewportSize({width,height:900});await go("/debts");const diameter=(await page.locator(".debt-donut").boundingBox()).width;assert.ok(diameter>200&&diameter<=280,"Existing responsive tablet/desktop chart sizing");await noOverflow();await go("/expenses");await noOverflow();}
assert.deepEqual(errors,[]);await browser.close();console.log("PASS: deletion cancellation/history preservation, distinct debt records preserved, tablet/desktop unchanged, no browser errors.");
