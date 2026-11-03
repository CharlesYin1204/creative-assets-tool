import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const baseUrl=process.env.TEST_BASE_URL || 'http://127.0.0.1:3040';
const password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1024}}),page=await context.newPage();
const errors=[],failures=[],results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=500)failures.push(r.status()+' '+r.url())});
await fs.mkdir('docs/screenshots',{recursive:true});
try{
 await page.goto(baseUrl+'/');await page.getByRole('heading',{name:/让创作流动/}).waitFor();await page.screenshot({path:'docs/screenshots/landing.png',fullPage:true});results.push('产品首页可显示');
 await page.goto(baseUrl+'/login');await page.locator('[name=email]').fill('admin@sharecreators.local');await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'登录工作空间'}).click();await page.waitForURL('**/workspace');await page.getByRole('heading',{name:/你好/}).waitFor();results.push('浏览器真实登录成功');await page.screenshot({path:'docs/screenshots/workspace.png',fullPage:true});
 for(const [route,heading] of [['/tasks','交付任务'],['/assets','正式资产库'],['/review/1','森林古树'],['/assets/4','枯木残枝'],['/account','用户中心'],['/admin','管理员后台'],['/assistant','AI 创作助手']]){
  await page.goto(baseUrl+route);await page.getByRole('heading',{name:heading,exact:true}).waitFor();await page.waitForLoadState('networkidle');await page.screenshot({path:'docs/screenshots/'+route.replaceAll('/','-').slice(1)+'.png',fullPage:true});results.push(route+' 页面无运行错误');
 }
 await page.goto(baseUrl+'/review/1');await page.getByRole('button',{name:'版本对比',exact:true}).click();await page.getByText('V1 · 上一版',{exact:true}).waitFor();await page.screenshot({path:'docs/screenshots/compare.png',fullPage:true});await page.getByRole('button',{name:'退出对比'}).click();await page.locator('.review-files select').selectOption({label:'V1 · 待修改'});await page.getByText('树皮纹理重复明显，请调整。',{exact:true}).waitFor();results.push('浏览器版本对比与 V1 历史评论切换');
 await page.goto(baseUrl+'/assets');await page.getByPlaceholder('试试搜索「适合森林场景的枯树」…').fill('枯木残枝');await page.locator('.asset-card').first().waitFor();if(await page.locator('.asset-card').count()!==1)throw Error('搜索筛选数量异常');results.push('资产关键词搜索过滤');
 await page.goto(baseUrl+'/admin');await page.getByRole('button',{name:'AI 模型配置',exact:true}).click();await page.getByText('Luna · 创作助手',{exact:true}).waitFor();await page.screenshot({path:'docs/screenshots/models.png',fullPage:true});await page.getByRole('button',{name:'添加模型',exact:true}).click();await page.locator('[name=baseUrl]').waitFor();await page.locator('.modal .iconbtn').click();results.push('管理员模型配置页面与新增表单');
 await page.setViewportSize({width:390,height:844});for(const route of ['/workspace','/assets','/review/1','/admin']){await page.goto(baseUrl+route);await page.locator('.page-heading').waitFor();await page.waitForLoadState('networkidle');const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow)throw Error(route+'移动端横向溢出');await page.screenshot({path:'docs/screenshots/mobile-'+route.replaceAll('/','-').slice(1)+'.png',fullPage:true})}results.push('390px 移动端四个主要界面无横向溢出');
 if(errors.length||failures.length)throw Error(JSON.stringify({errors,failures}));
 console.log(JSON.stringify({ok:true,results},null,2));await fs.writeFile('docs/browser-results.json',JSON.stringify({ok:true,results,errors,failures},null,2));
}catch(e){await page.screenshot({path:'docs/screenshots/browser-failure.png',fullPage:true});console.error(e);await fs.writeFile('docs/browser-results.json',JSON.stringify({ok:false,error:e.message,results,errors,failures},null,2));process.exitCode=1}finally{await browser.close()}
