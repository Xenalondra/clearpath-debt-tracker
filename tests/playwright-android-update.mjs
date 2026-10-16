// Emulator-only QA. Never uninstall/clear app data or navigate its WebView to an
// external URL. Route tests use the app's own bundled navigation links.
import assert from 'node:assert/strict';
import {_android} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {plannerSummary} from '../lib/planner-summary.mjs';
const key='clearpath-plan-v4-php',baselinePath='work/private-backups/android-before-v1.4.json';
const device=(await _android.devices()).find(d=>d.serial()==='emulator-5554');assert.ok(device,'Existing emulator required');
const page=await(await device.webView({pkg:'io.clearpath.app'})).page();
await page.getByRole('navigation',{name:'Main navigation'}).waitFor();
const raw=await page.evaluate(key=>localStorage.getItem(key),key);assert.ok(raw);
const packageInfo=(await device.shell('dumpsys package io.clearpath.app')).toString();
const version=packageInfo.match(/versionName=(\S+)/)?.[1];
if(process.env.CLEARPATH_ANDROID_CAPTURE_ONLY){
 assert.equal(version,'1.3','Capture the installed previous version BEFORE updating');
 await mkdir('work/private-backups',{recursive:true});
 try{await writeFile(baselinePath,raw,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;assert.deepEqual(JSON.parse(await readFile(baselinePath,'utf8')),JSON.parse(raw),'Do not overwrite a different baseline');}
 console.log('PASS: captured installed v1.3 emulator records read-only; no navigation or record changes.');
 await device.close();
}else{
 assert.equal(version,'1.4');assert.match(packageInfo,/versionCode=5\b/);
 const original=await readFile(baselinePath,'utf8'),before=JSON.parse(original);
 assert.deepEqual(JSON.parse(raw),before,'Every persisted field must survive in-place update');
 const info=JSON.parse(await readFile('android-wrapper/assets/web/build-info.json','utf8'));
 assert.equal(await page.evaluate(()=>window.__CLEARPATH_ANDROID_BUILD__),info.commit);
 assert.equal(await page.evaluate(()=>window.__CLEARPATH_ANDROID_SOURCE__),info.sourceSha256);
 assert.equal(await page.getByRole('region',{name:'Restore existing Clearpath'}).count(),0);
 const month=new Date().toISOString().slice(0,7);
 async function nav(name){await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name,exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).waitFor();}
 const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const row=name=>page.locator('.check-row').filter({hasText:name});
 async function different(name){await page.getByLabel(`More actions for ${name}`,{exact:true}).click();await page.getByRole('menuitem',{name:'Pay different amount',exact:true}).click();}
 async function bounds(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.evaluate(()=>window.__CLEARPATH_ANDROID_SOURCE__),info.sourceSha256);}
 console.log('PASS: installed v1.3 → v1.4 update preserves every persisted field; latest bundled commit/source; no import prompt.');
 try{
  for(const name of ['Debts','Expenses','Activity','Dashboard']){await nav(name);await bounds();}
  await page.getByRole('link',{name:'Settings',exact:true}).click();await bounds();
  const common={category:'Personal Loan',status:'active',rate:0,minimum:3000,dueDay:10,color:'#A78BFA',variableMonthlyDues:false,startingBalance:12000,balance:12000};
  const fixture={clearpathVersion:6,welcomeDismissed:true,debts:[{...common,id:100,name:'Native Required Loan'},{...common,id:101,name:'Native November Loan',firstPaymentMonth:'2026-11',rate:99},{...common,id:102,name:'Native BNPL Fixture',category:'BNPL (Pay Later)',variableMonthlyDues:true,originalStartingBalance:null,minimum:0,balance:18150.45},{...common,id:103,name:'Native Zero Card',category:'Credit Card',balance:0,creditLimit:30000,minimum:1000}],bills:[{id:901,name:'Native Food',category:'Food / Groceries',type:'variable',amount:3000,budget:3000,dueDay:15,effectiveFrom:month}],transactions:[{id:1001,entity:'debt',debtId:102,kind:'payment',amount:5012.43,date:'2026-10-15',note:'Acceptance fixture only'}],monthlyDueSchedules:[{debtId:102,month:'2026-10',dueAmount:5012.43},{debtId:102,month:'2026-11',dueAmount:6000},{debtId:102,month:'2026-12',dueAmount:12150.45}],debtPaymentVersions:[],incomeEntries:[],cashBuffer:0};
  assert.equal(month,'2026-10','This dated acceptance fixture must be updated deliberately for a new month');
  async function seed(){await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify(fixture)),{key,fixture});await nav('Dashboard');}
  await seed();assert.equal(await row('Native November Loan').count(),0);assert.equal(await row('Native Zero Card').count(),0);assert.match(await page.locator('.cash-grid article').filter({has:page.getByText('DEBT PAYMENTS',{exact:true})}).locator('strong').innerText(),/^₱8,012.43$/);assert.doesNotMatch(await page.locator('#strategy').innerText(),/Native November Loan/);
  await page.getByLabel('Viewing month').fill('2026-11');await row('Native November Loan').waitFor();await page.getByLabel('Viewing month').fill(month);
  await different('Native Food');await page.getByLabel('Actual bill amount').fill('2700');await page.getByRole('button',{name:'Record payment',exact:true}).click();await row('Native Food').getByRole('button',{name:'Paid Native Food',exact:true}).waitFor();let data=await saved();assert.equal(data.transactions.filter(t=>t.entity==='expense').length,1);assert.equal(data.bills[0].actuals[month],2700);
  const toast=page.locator('[data-sonner-toast].app-snackbar');await toast.waitFor();await page.waitForTimeout(350);const box=await toast.boundingBox(),navBox=await page.locator('.sidebar').boundingBox();assert.ok(box.y+box.height<=navBox.y-10);assert.ok(box.x>=0&&box.x+box.width<=await page.evaluate(()=>innerWidth)+1);await toast.getByRole('button',{name:'Dismiss notification',exact:true}).click();
  await seed();await different('Native Food');await page.getByRole('radio',{name:'This is only a partial payment'}).click();await page.getByLabel('Amount paying now').fill('1500');await page.getByRole('button',{name:'Record payment',exact:true}).click();assert.equal(await row('Native Food').getByRole('button',{name:'Pay Native Food',exact:true}).getAttribute('aria-pressed'),'false');assert.match(await row('Native Food').innerText(),/Partial/);assert.equal((await saved()).bills[0].actuals,undefined);
  await different('Native Required Loan');await page.getByLabel('Amount',{exact:true}).fill('2000');await page.getByRole('button',{name:'Record payment',exact:true}).click();assert.match(await row('Native Required Loan').innerText(),/Partial/);await row('Native Required Loan').getByRole('button',{name:'Pay Native Required Loan',exact:true}).click();await row('Native Required Loan').getByRole('button',{name:'Paid Native Required Loan',exact:true}).waitFor();
  await nav('Debts');await page.getByRole('img',{name:'Native BNPL Fixture: 21.6% cleared',exact:true}).waitFor();const canonical=await saved();await page.getByLabel('Viewing month').fill('2027-03');await page.getByRole('img',{name:'Native BNPL Fixture: 21.6% cleared',exact:true}).waitFor();assert.deepEqual(await saved(),canonical);assert.equal(await page.locator('#debt-103').count(),1);assert.match(await page.locator('#debt-103 .credit-utilization').innerText(),/0% of ₱30,000/);await bounds();
  await nav('Activity');assert.equal((await saved()).transactions.filter(t=>t.debtId===100).length,2);
  console.log('PASS: native final/partial expenses, strict debt minimum, November checklist/totals/Smart Plan, BNPL fixture actual progress, zero revolving account, Activity, shared toast/nav clearance and bundled routes.');
 }finally{
  await page.evaluate(({key,original})=>localStorage.setItem(key,original),{key,original});await nav('Dashboard');const after=await saved();assert.deepEqual(after,before,'Restore emulator baseline exactly after temporary test fixture');
  await writeFile('work/android-v1.4-qa.json',JSON.stringify({passed:true,commit:info.commit,sourceSha256:info.sourceSha256,exactRecordsMatch:true,before:plannerSummary(before,month),after:plannerSummary(after,month)},null,2));
  console.log('PASS: original emulator plan restored exactly after native smoke tests. Actual physical-phone Lazada remains NOT TESTED.');await device.close();
 }
}
