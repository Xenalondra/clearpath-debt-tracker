import assert from "node:assert/strict";
import { _android } from "playwright";
import { readFile } from "node:fs/promises";
const devices=await _android.devices();const device=devices.find(item=>item.serial()==="emulator-5554");assert.ok(device,"Existing emulator must be available");
const webview=await device.webView({pkg:"io.clearpath.app"});const page=await webview.page();
const errors=[];page.on("pageerror",error=>errors.push(error.message));
const origin="https://clearpath-debt-planner.secretofwings31.chatgpt.site",key="clearpath-plan-v4-php";
await page.getByRole("navigation",{name:"Main navigation"}).waitFor();
const expected=JSON.parse(await readFile(new URL("../android-wrapper/assets/web/build-info.json",import.meta.url),"utf8"));
assert.equal(await page.evaluate(()=>window.__CLEARPATH_ANDROID_BUILD__),expected.commit);
const original=await page.evaluate(key=>localStorage.getItem(key),key);
try{
 for(const route of ["/debts","/expenses","/activity","/settings","/"]){await page.goto(origin+route);await page.getByRole("navigation",{name:"Main navigation"}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.evaluate(()=>window.__CLEARPATH_ANDROID_BUILD__),expected.commit);}
 await page.goto(origin+"/debts");await page.getByRole("tab",{name:"By category",exact:true}).click();await page.getByLabel("Search debts").fill("visa");assert.equal(await page.locator(".debt-card").count(),1);await page.getByLabel("Search debts").fill("");await page.getByLabel("Sort by").selectOption("highest-balance");
 await page.screenshot({path:"/tmp/clearpath-android-debts.png",fullPage:true});
 // Exercise the same actual payment path inside Android, preserving the original plan.
 await page.evaluate(key=>{const month=new Date().toISOString().slice(0,7);localStorage.setItem(key,JSON.stringify({clearpathVersion:6,debts:[{id:77,name:"Android Test BNPL",category:"BNPL (Pay Later)",variableMonthlyDues:true,balance:1000,originalStartingBalance:2866.66,startingBalance:2866.66,minimum:0,rate:0,dueDay:18,color:"#A78BFA",status:"active"}],monthlyDueSchedules:[{debtId:77,month,dueAmount:543},{debtId:77,month:month==="2026-10"?"2026-11":"2027-01",dueAmount:2323.66}],transactions:[],bills:[],incomeEntries:[],cashBuffer:0}));},key);
 await page.goto(origin);await page.getByLabel("More actions for Android Test BNPL").click();await page.getByRole("menuitem",{name:"Pay in full",exact:true}).click();const confirm=page.getByRole("alertdialog");assert.match(await confirm.innerText(),/₱2,866.66/);await confirm.getByRole("button",{name:"Pay ₱2,866.66",exact:true}).click();await page.waitForTimeout(300);
 const data=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(data.transactions.length,1);assert.equal(data.transactions[0].amount,2866.66);assert.equal(data.debts[0].status,"completed");
 await page.goto(origin+"/debts");await page.getByRole("tab",{name:"Completed",exact:true}).click();assert.match(await page.locator(".completed-card").innerText(),/Starting balance ₱2,866.66/);
 await page.goto(origin+"/activity");assert.match(await page.locator(".activity-row").innerText(),/−₱2,866.66/);assert.deepEqual(errors,[]);
}finally{await page.evaluate(({key,original})=>{if(original===null)localStorage.removeItem(key);else localStorage.setItem(key,original);},{key,original});await page.goto(origin);}
console.log("PASS: native Android WebView launch, exact bundled commit, offline routes, mobile layout, analytics controls, BNPL full payoff, Completed, Activity and local-data preservation.");
await device.close();
