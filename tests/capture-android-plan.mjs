// Local-only test safety copy. Never add these records to source or APK assets.
import {_android}from "playwright";
import {mkdir,writeFile}from "node:fs/promises";
import assert from "node:assert/strict";
const device=(await _android.devices()).find(d=>d.serial()==="emulator-5554");assert.ok(device);
const page=await(await device.webView({pkg:"io.clearpath.app"})).page();await page.getByRole("navigation",{name:"Main navigation"}).waitFor();
const raw=await page.evaluate(()=>localStorage.getItem("clearpath-plan-v4-php"));assert.ok(raw);JSON.parse(raw);
await mkdir("work/private-backups",{recursive:true});await writeFile("work/private-backups/android-before-update.json",raw);await device.close();console.log("Captured existing emulator plan read-only to ignored private backup. No records were changed.");
