// Raster exports generated from the single code-native Clearpath mark.
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
const svg=await readFile(new URL("../public/favicon.svg",import.meta.url),"utf8");
const browser=await chromium.launch({headless:true});
await mkdir(new URL("../public/icons/",import.meta.url),{recursive:true});
for(const [filename,size] of [["icon-192.png",192],["icon-512.png",512],["maskable-512.png",512],["apple-touch-icon.png",180]]){
 const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});
 await page.setContent('<style>html,body{margin:0;background:#202333;width:100%;height:100%}svg{display:block;width:100%;height:100%}</style>'+svg);
 await page.screenshot({path:fileURLToPath(new URL("../public/icons/"+filename,import.meta.url))});await page.close();
}
await browser.close();console.log("Generated Clearpath 192/512px, maskable and Apple icons from favicon.svg.");
