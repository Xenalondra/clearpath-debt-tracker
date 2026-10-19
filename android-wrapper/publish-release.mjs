// Publish only the verified APK; credentials remain in process memory.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sourceFingerprint} from './source-fingerprint.mjs';
const file='Clearpath-Debt-Planner-v1.5-debug.apk',apk='android-wrapper/output/'+file;
const bytes=await readFile(apk),sha=createHash('sha256').update(bytes).digest('hex');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const qa=JSON.parse(await readFile('work/android-v1.5-qa.json','utf8'));
assert.ok(qa.passed&&qa.exactRecordsMatch&&qa.commit===commit,'Native update QA must pass for this exact commit');
assert.equal(qa.sourceSha256,await sourceFingerprint());
execFileSync(process.execPath,['android-wrapper/validate-apk.mjs',apk],{stdio:['ignore','pipe','pipe']});
// Reuse the configured GitHub credential helper, never a token pasted in chat.
const credential=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'},stdio:['pipe','pipe','pipe']});
const token=credential.split('\n').find(line=>line.startsWith('password='))?.slice(9);assert.ok(token,'GitHub credential unavailable');
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
async function api(url,options={}){const response=await fetch(url,{...options,headers:{...headers,...options.headers}});if(!response.ok)throw Error(`GitHub request failed: ${response.status}`);return response.json();}
const root='https://api.github.com/repos/Xenalondra/clearpath-debt-tracker';
assert.equal((await api('https://api.github.com/user')).login.toLowerCase(),'xenalondra','Wrong GitHub identity');
const tag='android-v1.5',lookup=await fetch(root+'/releases/tags/'+tag,{headers});let release;
if(lookup.ok){release=await lookup.json();assert.equal(release.target_commitish,commit,'Existing release must match this exact source');}
else if(lookup.status===404)release=await api(root+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:tag,target_commitish:commit,name:'Clearpath 1.5 — Portfolio progress and advance payments',prerelease:true,make_latest:'false',body:`Installable debug/test APK, version 1.5 / code 6. Package io.clearpath.app; same name, icon, certificate and storage origin. Install as UPDATE. Do not uninstall or clear data. Stop if Android reports a signing mismatch.\n\nIncludes all latest UI/correctness changes, reliable-subset portfolio progress with exclusions, and future-obligation advance payments using actual cash date plus applied month. Existing backup/update mechanism retained.\n\nQA: 60 unit tests and 13 Playwright regression suites passed; fresh production build, TypeScript, exact bundled-source/hash checks, offline routes and native emulator v1.4→v1.5 saved-record preservation and advance-payment smoke passed. The user's physical phone data remains unverified. No financial records or signing secrets are uploaded. Separate hosted website deployment is not included.\n\nSource: ${commit}\nSHA-256: ${sha}`})});
else throw Error(`Release lookup failed: ${lookup.status}`);
assert.equal(release.draft,false,'Download must be published, not a draft');
let asset=release.assets.find(item=>item.name===file);
if(!asset)asset=await api(release.upload_url.split('{')[0]+'?name='+encodeURIComponent(file),{method:'POST',headers:{'Content-Type':'application/vnd.android.package-archive'},body:bytes});
// Anonymous request verifies the shareable link, without forwarding credentials.
const download=await fetch(asset.browser_download_url);assert.ok(download.ok,`Public download failed: ${download.status}`);
assert.equal(createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex'),sha,'Public APK must match local bytes; never overwrite a conflicting asset');
await copyFile(apk,'downloads/'+file);
const result={filename:file,generatedPath:process.cwd()+'/'+apk,type:'debug',versionName:'1.5',versionCode:6,commit,sha256:sha,bytes:bytes.length,downloadUrl:asset.browser_download_url,releaseUrl:release.html_url,publicDownloadVerified:true};
await writeFile('work/apk-v1.5-release-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
