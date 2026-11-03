import {chromium,expect} from '@playwright/test';import fs from 'node:fs/promises';
const origin=process.env.TEST_URL||'http://154.40.47.111:3040',password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const login=await ctx.request.post(origin+'/api/auth/login',{data:{email:'admin@sharecreators.local',password}});if(!login.ok())throw Error('Login failed');
 const r=await ctx.request.get(origin+'/api/tasks/1');const t=await r.json(),v=t.versions[0],f=t.files.find(f=>f.version_id===v.id&&f.kind==='model');if(!f)throw Error('No fixture model');
 // Corrupt this test browser's response only; keep actual server files untouched.
 await page.route('**/api/files/'+f.id,route=>route.fulfill({status:200,contentType:'application/octet-stream',body:'# empty geometry for error-state acceptance\n'}));
 await page.goto(origin+'/review/1');await page.getByLabel('预览模式').selectOption('3d');await expect(page.locator('.model-failure')).toBeVisible({timeout:30000});await expect(page.locator('.model-info')).toHaveCount(0);await expect(page.getByRole('button',{name:'位置标注',exact:true})).toBeDisabled();results.push({name:'损坏模型明确提示失败且不能伪装已解析或继续标注',passed:true});
 await page.getByLabel('预览模式').selectOption('image');await expect(page.locator('.viewer img').first()).toBeVisible();results.push({name:'模型解析失败后可切换原有图片预览',passed:true});
 await page.unroute('**/api/files/'+f.id);await page.getByLabel('预览模式').selectOption('3d');await expect(page.locator('.model-info')).toBeVisible({timeout:30000});await expect(page.locator('.model-failure')).toHaveCount(0);results.push({name:'资源恢复后重新切换可真实解析，不滞留失败状态',passed:true});
 if(errors.length)throw Error(JSON.stringify(errors));await page.screenshot({path:'docs/completion/screenshots/preview-recovery.png',fullPage:true});
}catch(e){results.push({name:'preview fallback',passed:false,error:e.message});console.error(e);process.exitCode=1}finally{await browser.close();await fs.writeFile('docs/completion/preview-fallback-results.json',JSON.stringify({timestamp:new Date().toISOString(),origin,results,errors},null,2));console.log(JSON.stringify(results))}
