import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
// Include source/build inputs, never local financial data or signing credentials.
export async function sourceFingerprint(){
 const names=[];
 async function visit(relative){for(const entry of await readdir(path.join(root,relative),{withFileTypes:true})){const name=path.join(relative,entry.name);if(entry.isDirectory())await visit(name);else names.push(name);}}
 for(const directory of ["app","lib","public","android-wrapper/java","android-wrapper/res"])await visit(directory);
 names.push("package.json","package-lock.json","android-wrapper/AndroidManifest.xml");
 const hash=createHash("sha256");
 for(const name of names.sort()){hash.update(name);hash.update("\0");hash.update(await readFile(path.join(root,name)));hash.update("\0");}
 return hash.digest("hex");
}
