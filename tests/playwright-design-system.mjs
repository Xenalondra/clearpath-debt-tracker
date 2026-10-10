import assert from "node:assert/strict";
import { chromium } from "playwright";
const base=process.env.CLEARPATH_URL||"http://localhost:3000",key="clearpath-plan-v4-php",month=new Date().toISOString().slice(0,7);
const seed={clearpathVersion:6,debts:[{id:1,name:"Test Card",category:"Credit Card",balance:10000,startingBalance:12000,rate:12,minimum:500,dueDay:15,creditLimit:20000,color:"#A78BFA"}],bills:[{id:1,name:"Rent",category:"Housing / Rent",amount:18000,budget:18000,type:"fixed",dueDay:1}],incomeEntries:[{id:1,type:"Salary",name:"Salary",amount:38000,date:month+"-15",recurrence:"monthly"}],transactions:[],cashBuffer:5000};
const browser=await chromium.launch({headless:true}),page=await browser.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
async function go(route=""){await page.goto(base+route);await page.getByRole("navigation",{name:"Main navigation"}).waitFor();await page.waitForTimeout(200);}
async function saved(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"Horizontal overflow");}
async function checkForm(title,primary,width){
 const dialog=page.getByRole("dialog"),form=dialog.locator(".app-form");await form.waitFor();assert.equal(await dialog.getByRole("heading",{name:title,exact:true}).count(),1);
 const footer=form.locator(".modal-footer"),cancel=footer.getByRole("button",{name:"Cancel",exact:true}),save=footer.getByRole("button",{name:primary,exact:true});const d=await dialog.boundingBox(),c=await cancel.boundingBox(),s=await save.boundingBox(),f=await footer.boundingBox();
 assert.ok(c.height>=44&&s.height>=44&&Math.abs(c.y-s.y)<1);assert.ok(c.x>=d.x&&s.x+s.width<=d.x+d.width);assert.ok(f.y+f.height<=812&&f.y>=0,"Footer clipped");assert.ok(s.width<width-32,"Viewport-wide save bar returned");
 const before=await footer.boundingBox();await form.locator(".debt-form-body").evaluate(el=>el.scrollTop=el.scrollHeight);const after=await footer.boundingBox();assert.equal(after.y,before.y);await overflow();
 await page.screenshot({path:`/tmp/clearpath-design-${title.toLowerCase().replaceAll(" ","-")}-${width}.png`});await cancel.click();await dialog.waitFor({state:"detached"});
}
await go();await page.evaluate(({key,seed})=>localStorage.setItem(key,JSON.stringify(seed)),{key,seed});await go();const baseline=await saved();
for(const width of [375,390,430,768,1280]){
 await page.setViewportSize({width,height:812});let headerTop;
 for(const route of ["","/debts","/expenses","/activity","/settings"]){
  await go(route);const h=await page.locator(".page-header").boundingBox();if(headerTop===undefined)headerTop=h.y;else assert.equal(h.y,headerTop,"Inconsistent top spacing");await overflow();
  const nav=page.getByRole("navigation",{name:"Main navigation"});if(width<=430){assert.ok(h.y<=20);const links=nav.locator("a:visible");assert.equal(await links.count(),4);let tabWidth;
   for(const link of await links.all()){const b=await link.boundingBox(),icon=await link.locator("svg").boundingBox(),label=await link.locator("span").boundingBox();assert.equal(icon.width,24);assert.equal(icon.height,24);assert.ok(label.y>=icon.y+icon.height);assert.ok(b.height>=44);if(tabWidth===undefined)tabWidth=b.width;else assert.equal(b.width,tabWidth);assert.ok(await link.locator("span").evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=11));}
  }else assert.ok((await page.locator(".sidebar").boundingBox()).width>0);
  if(route!=="/settings"){const boxes=await page.locator(".month-toolbar > *").evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));assert.ok(boxes.every(y=>Math.abs(y-boxes[0])<1));}
  await page.screenshot({path:`/tmp/clearpath-design-page-${route.slice(1)||"dashboard"}-${width}.png`,fullPage:true});
 }
 await go();await page.getByRole("button",{name:"Add income",exact:true}).click();assert.equal(await page.getByLabel("Expected amount").inputValue(),"");await checkForm("Add income","Add income",width);
 await page.getByLabel("Income actions for Salary").click();await page.getByRole("menuitem",{name:"Edit",exact:true}).click();await checkForm("Edit income","Save income",width);
 await go("/debts");await page.getByRole("button",{name:"Add debt",exact:true}).click();assert.equal(await page.getByLabel("Current balance",{exact:true}).inputValue(),"");assert.equal(await page.getByLabel("APR / rate (%)").inputValue(),"");await checkForm("Add debt","Add debt",width);
 await page.getByRole("button",{name:"Add debt",exact:true}).click();await page.getByLabel("Debt category").selectOption("BNPL (Pay Later)");await page.getByRole("radio",{name:"Monthly amounts vary"}).click();await page.getByLabel("Number of upcoming months").fill("24");await page.getByLabel("Number of upcoming months").press("Tab");assert.equal(await page.locator(".schedule-row").count(),24);await checkForm("Add debt","Add debt",width);
 await page.getByRole("button",{name:"Edit debt",exact:true}).click();await checkForm("Edit debt","Save debt",width);
 await page.getByRole("button",{name:"Record activity",exact:true}).click();await checkForm("Test Card","Record activity",width);
 await page.getByLabel("Debt actions for Test Card").click();await page.getByRole("menuitem",{name:"Reconcile balance"}).click();await checkForm("Test Card","Reconcile balance",width);
 await go();await page.getByLabel("More actions for Test Card").click();await page.getByRole("menuitem",{name:"Pay different amount"}).click();await checkForm("Pay different amount","Record payment",width);
 await go("/expenses");await page.getByRole("button",{name:"Add expense",exact:true}).click();assert.equal(await page.getByLabel("Budget / expected amount").inputValue(),"");await checkForm("Add expense","Add expense",width);
 await page.locator("#expense-1").getByRole("button",{name:"Edit",exact:true}).click();await checkForm("Edit expense","Save expense",width);
 assert.deepEqual(await saved(),baseline,"Visual checks modified saved financial records");console.log(`PASS ${width}px: shell, spacing, navigation, all six form headers/footers, blank new numeric fields, no clipping/overflow, unchanged financial data`);
}
// Simulate inset-bearing CSS layout; this is not a physical Android certification.
await page.setViewportSize({width:390,height:812});await go();await page.evaluate(()=>{document.documentElement.style.setProperty("--safe-top","24px");document.documentElement.style.setProperty("--safe-bottom","24px");});assert.equal((await page.locator(".page-header").boundingBox()).y,40);assert.equal((await page.locator(".sidebar").boundingBox()).height,100);const nav=await page.getByRole("navigation",{name:"Main navigation"}).boundingBox();assert.ok(nav.y+nav.height<=812-24);await page.getByRole("button",{name:"Add income",exact:true}).click();const padding=await page.locator(".modal-footer").evaluate(el=>parseFloat(getComputedStyle(el).paddingBottom));assert.equal(padding,40);await checkForm("Add income","Add income",390);
const manifest=await (await page.request.get(base+"/manifest.webmanifest")).json();assert.equal(manifest.name,"Clearpath");assert.equal(manifest.icons.length,3);for(const icon of manifest.icons){const response=await page.request.get(base+icon.src);assert.ok(response.ok());assert.match(response.headers()["content-type"],/image\/png/);}
assert.ok((await page.locator('meta[name="viewport"]').getAttribute("content")).includes("viewport-fit=cover"));assert.deepEqual(errors,[]);await browser.close();console.log("PASS: safe-area simulation, PWA branding assets, viewport-fit, no browser errors.");
