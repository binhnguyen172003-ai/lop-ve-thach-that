// Run with the local test server on port 4173. No production requests or writes.
// PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium node scripts/benchmark-overview.mjs [baseline-ref]
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
const baseline = process.argv[2] || 'c8d0fca';
const browser = await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
const results = { baseline, viewport: '390x844', records:550, runs:7, network:'external requests blocked; local files', results:{} };
try {
  for (const mode of ['before','after']) {
    const source=mode==='before' ? execFileSync('git',['show',`${baseline}:assets/js/app.js`],{encoding:'utf8',maxBuffer:10*1024*1024}) : await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8');
    const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
    await page.route('https://**/*',r=>r.abort());
    await page.addInitScript(()=>localStorage.setItem('lvkv-phien',JSON.stringify({mail:'fixture@example.com',ten:'Thử nghiệm',isAdmin:true,isTeacher:true})));
    await page.route('**/assets/js/app.js?*',r=>r.fulfill({contentType:'text/javascript',body:source+`\nwindow.benchmark=()=>{roster=Array.from({length:550},(_,i)=>({id:'fixture-'+i,ten:'Học viên thử nghiệm '+i,coso:'Bình Phú',khoi:'Khối H'}));window.__rosterReady=true;const t=performance.now();renderQL();return {ms:performance.now()-t,rows:document.querySelectorAll('.ql-bang tbody tr').length};};`}));
    await page.goto('http://127.0.0.1:4173/#duyet');await page.waitForFunction(()=>window.benchmark);
    const samples=[];for(let i=0;i<7;i++)samples.push(await page.evaluate(()=>window.benchmark()));
    results.results[mode]={samples,medianMs:[...samples].map(x=>x.ms).sort((a,b)=>a-b)[3]};await page.close();
  }
  console.log(JSON.stringify(results,null,2));
} finally { await browser.close(); }
