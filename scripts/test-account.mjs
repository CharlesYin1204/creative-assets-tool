import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {q,db} from '../lib/db.mjs';
const origin=process.env.TEST_URL||'http://127.0.0.1:3041',password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1],cookies={},results=[];let uid;
async function call(who,route,data,method,status=200){const r=await fetch(origin+'/api/'+route,{method:method||(data?'POST':'GET'),headers:{Cookie:cookies[who]||'','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const j=await r.json();assert.equal(r.status,status,JSON.stringify(j));if(route==='auth/login'&&r.ok)cookies[who]=r.headers.get('set-cookie').split(';')[0];return j}
function pass(name){results.push({name,passed:true});console.log('PASS',name)}
try{
 await call('admin','auth/login',{email:'admin@sharecreators.local',password});const email='account-test-'+Date.now()+'@example.test',initial='AccountInitial!2026',next='AccountUpdated!2026';
 uid=(await call('admin','admin/users',{name:'个人资料验收',email,password:initial,role:'artist'})).id;
 await call('one','auth/login',{email,password:initial});await call('two','auth/login',{email,password:initial});
 await call('one','me',{name:'已更新资料',bio:'持久化的个人简介',role:'admin'},'PATCH');const me=await call('one','me');assert.equal(me.name,'已更新资料');assert.equal(me.bio,'持久化的个人简介');assert.equal(me.role,'artist');pass('个人资料真实保存且伪造角色不能提权');
 await call('one','me',{name:me.name,oldPassword:'wrong',password:next},'PATCH',400);
 await call('one','me',{name:me.name,oldPassword:initial,password:next},'PATCH');await call('one','me');await call('two','me',null,'GET',401);await call('three','auth/login',{email,password:initial},'POST',401);await call('three','auth/login',{email,password:next});pass('修改密码校验旧密码，撤销其他会话，旧密码失效');
 await call('three','auth/logout',{});await call('three','me',null,'GET',401);pass('退出登录清除服务器会话');
 for(let i=0;i<22;i++)await q('INSERT INTO ai_runs(user_id,model,feature,input_text,output_text,status) VALUES(?,?,?,?,?,?)',[uid,'fixture-not-a-live-model','assistant','分页用例'+i,'测试记录，不是真实模型回答','success']);
 const history=await call('one','ai/records');assert.equal(history.total,22);assert.equal(history.items.length,20);const nextPage=await call('one','ai/records?page=2');assert.equal(nextPage.items.length,2);assert(history.items.every(r=>!nextPage.items.some(x=>x.id===r.id)));const others=await call('admin','ai/records');assert(others.items.every(r=>!r.output_text?.includes('测试记录，不是真实模型回答')));pass('个人 AI 全历史分页、结果正文与账户隔离');
}catch(e){console.error(e);results.push({passed:false,error:e.message});process.exitCode=1}finally{if(uid){await q('DELETE FROM ai_runs WHERE user_id=?',[uid]);await q('DELETE FROM sessions WHERE user_id=?',[uid]);await q('DELETE FROM users WHERE id=?',[uid])}await db.end();await fs.writeFile('docs/completion/account-results.json',JSON.stringify({timestamp:new Date().toISOString(),results},null,2))}
