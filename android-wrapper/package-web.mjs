// Build output only: capture fresh production routes and their exact hashed assets.
import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const target=path.join(root,"android-wrapper/assets/web");
const source=path.join(root,"dist/client");
const base=process.env.CLEARPATH_BUILD_URL||"http://localhost:3000";
if(!/^http:\/\/localhost:\d+$/.test(base))throw new Error("Packaging requires the freshly built local production server.");
const commit=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});await cp(source,target,{recursive:true});
const routes=["/","/debts","/expenses","/activity","/settings","/payments"];
for(const route of routes){
 const response=await fetch(base+route);if(!response.ok)throw new Error(`Production route ${route} failed: ${response.status}`);
 let html=await response.text();if(!html.includes("Loading Clearpath"))throw new Error(`Not a Clearpath production shell: ${route}`);
 const marker=`<script>window.__CLEARPATH_ANDROID_BUILD__=${JSON.stringify(commit)};</script>`;
 html=html.replace("<head>","<head>"+marker);
 const filename=path.join(target,route==="/"?"index.html":route.slice(1)+"/index.html");await mkdir(path.dirname(filename),{recursive:true});await writeFile(filename,html);
}
// Android serves bundled routes/assets on the existing HTTPS origin. Old worker
// caches must not replace this version; localStorage is deliberately untouched.
await writeFile(path.join(target,"sw.js"),`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));`);
async function files(dir){const list=[];for(const entry of await readdir(dir,{withFileTypes:true})){const name=path.join(dir,entry.name);if(entry.isDirectory())list.push(...await files(name));else list.push(name);}return list.sort();}
const assets={};for(const file of await files(target))assets[path.relative(target,file)]=createHash("sha256").update(await readFile(file)).digest("hex");
await writeFile(path.join(target,"build-info.json"),JSON.stringify({commit,builtAt:new Date().toISOString(),routes,assets},null,2));
console.log(`Packaged ${Object.keys(assets).length} fresh assets and ${routes.length} routes from ${commit}`);
