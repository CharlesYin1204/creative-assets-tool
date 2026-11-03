import {chromium,expect} from '@playwright/test';import fs from 'node:fs/promises';import {q,db} from '../lib/db.mjs';
const origin=process.env.TEST_URL||'http://127.0.0.1:3041',password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1];
const browser=await chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']}),ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();
let pid,tid,conv;const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
async function api(route,data,method,expected=200){const r=await ctx.request.fetch(origin+'/api/'+route,{method:method||(data?'POST':'GET'),data});if(r.status()!==expected)throw Error(route+': '+await r.text());return r.json()}
function pass(name){results.push({name,passed:true});console.log('PASS',name)}
try{
 await api('auth/login',{email:'admin@sharecreators.local',password});
 pid=(await api('projects',{name:'发布烟测 '+Date.now(),description:'自动清理的发布烟测'})).id;
 tid=(await api('tasks',{projectId:pid,title:'参考资料与上传公网烟测',requirements:'参考文件完整操作',assigneeId:1,dueDate:'2026-12-31',formats:'OBJ',category:'道具',requireTexture:false})).id;
 await page.goto(origin+'/tasks/'+tid);await page.getByRole('heading',{name:'补充参考资料'}).waitFor();const reference=page.locator('section').filter({has:page.getByRole('heading',{name:'补充参考资料'})});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await reference.locator('input[type=file]').setInputFiles({name:'reference-smoke.png',mimeType:'image/png',buffer:png});await page.getByRole('link',{name:/reference-smoke.png/}).waitFor();await page.getByRole('button',{name:'移除参考资料 reference-smoke.png'}).click();await expect(page.getByRole('link',{name:/reference-smoke.png/})).toHaveCount(0);pass('管理员参考资料上传与移除');
 await page.getByLabel('交付文件').setInputFiles({name:'smoke.obj',mimeType:'application/octet-stream',buffer:Buffer.from('v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n')});await page.locator('.uploaded-row').getByText('smoke.obj',{exact:true}).waitFor();await page.locator('textarea[name=notes]').fill('发布烟测说明');await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect.poll(async()=>(await api('tasks/'+tid+'/draft')).notes).toBe('发布烟测说明');await page.reload();await expect(page.getByLabel('版本说明',{exact:true})).toHaveValue('发布烟测说明');pass('当前来源的上传、说明保存和刷新恢复');
 if(process.env.TEST_QUOTA==='1'){
  conv=(await api('ai/conversations',{})).id;
  const r=await api('ai/conversations/'+conv+'/messages',{prompt:'连接测试'},'POST',502);if(!r.error.includes('余额不足'))throw Error('Expected precise quota error, got '+r.error);
  const saved=await api('ai/conversations/'+conv);if(saved.messages.at(-1)?.status!=='error')throw Error('failed AI response was not persisted');
  await page.goto(origin+'/assistant');await page.getByRole('button',{name:/新对话/}).last().click();await page.getByText('AI 服务余额不足，请联系管理员充值或更换服务凭据',{exact:true}).waitFor();await page.getByRole('button',{name:'重试这条问题'}).waitFor();pass('真实上游余额不足显示具体错误、保留对话并提供重试');
 }
 await page.goto(origin+'/assistant/history');await page.getByRole('heading',{name:'AI 调用历史'}).waitFor();await page.getByRole('button',{name:'查看结果'}).first().click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'关闭',exact:true}).click();pass('AI 调用历史正文可回看');
 if(errors.length)throw Error(JSON.stringify(errors));
}catch(e){console.error(e);results.push({passed:false,error:e.message});process.exitCode=1;await page.screenshot({path:'docs/completion/screenshots/release-failure.png',fullPage:true})}finally{
 await browser.close();
 if(conv){await q('DELETE FROM ai_messages WHERE conversation_id=?',[conv]);await q('DELETE FROM ai_conversations WHERE id=?',[conv])}
 if(tid){const f=await q('SELECT path FROM files WHERE task_id=?',[tid]);await q('DELETE FROM task_drafts WHERE task_id=?',[tid]);await q('DELETE FROM files WHERE task_id=?',[tid]);await q('DELETE FROM notifications WHERE link=?',['/tasks/'+tid]);await q('DELETE FROM tasks WHERE id=?',[tid]);for(const a of f)await fs.unlink('storage/'+a.path).catch(()=>{})}
 if(pid){await q('DELETE FROM project_members WHERE project_id=?',[pid]);await q('DELETE FROM projects WHERE id=?',[pid])}
 await db.end();await fs.writeFile('docs/completion/release-smoke'+(process.env.TEST_QUOTA==='1'?'-quota':'')+'.json',JSON.stringify({timestamp:new Date().toISOString(),origin,results,errors},null,2));
}
