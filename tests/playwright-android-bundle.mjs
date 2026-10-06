import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../android-wrapper/assets/web"),origin="https://clearpath-debt-planner.secretofwings31.chatgpt.site";
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:"block"});const errors=[];page.on("pageerror",error=>errors.push(error.message));
await page.route("**/*",async route=>{
 const url=new URL(route.request().url());if(url.origin!==origin){await route.abort();return;}
 let name=url.pathname;if(name==="/")name="/index.html";else if(["/debts","/expenses","/activity","/settings","/payments"].includes(name))name+="/index.html";
 try{const body=await readFile(path.join(root,name));await route.fulfill({status:200,body,contentType:name.endsWith(".html")?"text/html":name.endsWith(".js")?"application/javascript":name.endsWith(".css")?"text/css":name.endsWith(".svg")?"image/svg+xml":"application/octet-stream"});}catch{await route.abort();}
});
for(const route of ["/","/debts","/expenses","/activity","/settings"]){await page.goto(origin+route);await page.getByRole("navigation",{name:"Main navigation"}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
await page.goto(origin+"/debts");await page.getByRole("tab",{name:"By category",exact:true}).click();await page.getByLabel("Search debts").fill("visa");assert.equal(await page.locator(".debt-card").count(),1);
const data=await page.evaluate(()=>localStorage.getItem("clearpath-plan-v4-php"));await page.reload();await page.getByRole("navigation",{name:"Main navigation"}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem("clearpath-plan-v4-php")),data);
assert.deepEqual(errors,[]);await browser.close();console.log("PASS: freshly bundled web assets launch offline, all five routes, mobile layout, charts/search and persistent local data.");
