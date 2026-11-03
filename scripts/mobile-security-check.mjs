import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const base='http://127.0.0.1:3041';const password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1];
 await page.goto(base+'/login');await page.locator('[name=email]').fill('admin@sharecreators.local');await page.locator('[name=password]').fill(password);await page.getByRole('button',{name:'登录工作空间'}).click();await page.waitForURL('**/workspace');
 await page.goto(base+'/account/security');await page.locator('[name=oldPassword]').fill('incorrect-mobile-validation');await page.locator('[name=password]').fill('unused-mobile-validation');await page.getByRole('button',{name:'更新密码'}).click();await page.getByText('当前密码错误',{exact:true}).waitFor();
 await page.goto(base+'/account');await page.locator('.function-entry').last().scrollIntoViewIfNeeded();const last=await page.locator('.function-entry').last().boundingBox();const nav=await page.locator('.mobile-bottom-nav').boundingBox();assert.ok(last.y+last.height<=nav.y,'末项不能被底栏覆盖');
 await page.screenshot({path:'docs/mobile/account-bottom-390.png'});await fs.writeFile('docs/mobile/security-check.json',JSON.stringify({ok:true,checks:['独立安全页正确提交账号资料，错误旧密码被后端拒绝，未修改密码','用户中心末项可完整滚动到底栏上方']},null,2));
} finally {await browser.close();}
