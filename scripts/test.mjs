import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {q,db,tx} from '../lib/db.mjs';
const origin=process.env.TEST_URL||'http://127.0.0.1:3040';
const password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1];
const cookies={},testProjects=[],testTasks=[],testUsers=[],results=[];
async function call(who,route,data,method,expected=200){const headers={};if(cookies[who])headers.Cookie=cookies[who];if(data&&!(data instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(origin+'/api/'+route,{method:method||(data?'POST':'GET'),headers,body:data?data instanceof FormData?data:JSON.stringify(data):undefined});const json=await r.json();assert.equal(r.status,expected,`${who} ${route}: ${JSON.stringify(json)}`);if(route==='auth/login'&&r.ok)cookies[who]=r.headers.get('set-cookie').split(';')[0];return json}
function pass(name){results.push({name,passed:true});console.log('PASS',name)}
async function upload(who,tid,kind,name,content){const form=new FormData();form.append('kind',kind);form.append('file',new Blob([content]),name);return call(who,`tasks/${tid}/files`,form)}
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
async function files(tid,n){const m=await upload('vendor',tid,'model','test.obj',`# version ${n}\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n`),t=await upload('vendor',tid,'texture','texture.png',png);return [m.id,t.id]}
try{
 await call('', 'me',null,'GET',401);pass('未登录不能读取业务数据');
 for(const who of ['admin','lead','artist','vendor','other'])await call(who,'auth/login',{email:who+'@sharecreators.local',password});pass('五类测试身份可登录');
 await call('vendor','admin/overview',null,'GET',403);await call('artist','admin/overview',null,'GET',403);pass('非管理员无法读取管理后台');
 const p=await call('admin','projects',{name:'验收测试项目 '+Date.now(),description:'自动化测试产生，测试结束清理'});testProjects.push(p.id);
 const p2=await call('admin','projects',{name:'验收复用目标 '+Date.now(),description:'自动化测试目标项目'});testProjects.push(p2.id);
 for(const pid of testProjects)for(const userId of [2,3])await call('admin',`projects/${pid}/members`,{userId});
 const t=await call('lead','tasks',{projectId:p.id,title:'测试古树交付',requirements:'提供模型、贴图与修改说明',assigneeId:4,dueDate:'2026-12-31',formats:'OBJ',requireTexture:true,category:'场景',license:'all_projects'});testTasks.push(t.id);
 await call('other',`tasks/${t.id}`,null,'GET',403);const vendor=await call('vendor','bootstrap');assert(vendor.tasks.every(t=>t.assignee_id===4));await call('vendor','assets',null,'GET',403);pass('外包任务与资产库访问隔离');
 const forged=new FormData();forged.append('kind','preview');forged.append('file',new Blob(['not an image']),'fake.png');await call('vendor',`tasks/${t.id}/files`,forged,'POST',400);pass('拒绝伪造图片文件');
 const bad=new FormData();bad.append('kind','model');bad.append('file',new Blob(['test']),'test.exe');await call('vendor',`tasks/${t.id}/files`,bad,'POST',400);pass('拒绝不支持的上传格式');
 const model=await upload('vendor',t.id,'model','ancient.obj','v 0 0 0\n');await call('vendor',`tasks/${t.id}/submit`,{notes:'缺少贴图',fileIds:[model.id]},'POST',400);pass('缺少贴图不能提交且已上传文件仍保留');
 const tex=await upload('vendor',t.id,'texture','t.png',png);const v1=await call('vendor',`tasks/${t.id}/submit`,{notes:'V1 初版',fileIds:[model.id,tex.id]});
 const f1=await fetch(origin+'/api/files/'+model.id,{headers:{Cookie:cookies.other}});assert.equal(f1.status,403);pass('不能通过文件编号绕过任务权限');
 await call('vendor',`tasks/${t.id}/submit`,{notes:'重复',fileIds:[model.id,tex.id]},'POST',400);pass('审阅期间禁止重复提交');
 const c=await call('lead','comments',{versionId:v1.id,body:'树皮重复，请修正',x:.4,y:.6,angle:15,zoom:1.1});await call('lead',`tasks/${t.id}/review`,{versionId:v1.id,decision:'approved'},'POST',400);pass('未解决评论阻止验收');
 await call('vendor',`comments/${c.id}`,{resolved:true},'PATCH',403);pass('外包不能自行解决审阅意见');
 await call('lead',`tasks/${t.id}/review`,{versionId:v1.id,decision:'changes_requested',reason:'请优化树皮和轮廓'});assert(!(await call('artist','assets')).some(a=>a.id===t.id));pass('要求修改后的素材不进入正式库');
 await call('vendor','comments',{versionId:v1.id,parentId:c.id,body:'已在 V2 修复'});
 const f2=await files(t.id,2);const v2=await call('vendor',`tasks/${t.id}/submit`,{notes:'V2 修正树皮',fileIds:f2});
 const info=await call('lead',`tasks/${t.id}`);assert.equal(info.versions.length,2);assert(info.comments.some(c=>c.version_id===v1.id));assert(info.files.some(f=>f.version_id===v1.id));pass('V2 保留 V1 文件、位置评论和回复');
 await call('lead','comments',{versionId:v2.id,parentId:c.id,body:'跨版本回复'},'POST',400);await call('lead',`tasks/${t.id}/review`,{versionId:v1.id,decision:'approved'},'POST',409);pass('拒绝跨版本回复及验收旧版本');
 await call('lead',`tasks/${t.id}/review`,{versionId:v2.id,decision:'approved'});const asset=await call('artist',`assets/${t.id}`);assert.equal(asset.version.id,v2.id);pass('通过后正式库锁定验收版本');
 await call('artist',`assets/${t.id}/reuse`,{projectId:p2.id,accepted:false},'POST',400);const reuse=await call('artist',`assets/${t.id}/reuse`,{projectId:p2.id,accepted:true});pass('确认授权后可复用到新项目');
 const f3=await files(t.id,3);const v3=await call('vendor',`tasks/${t.id}/submit`,{notes:'V3 新迭代',fileIds:f3});assert.equal((await call('artist',`assets/${t.id}`)).version.id,v2.id);pass('新版本审阅期间库内保留上一验收版');
 await call('lead',`tasks/${t.id}/review`,{versionId:v3.id,decision:'approved'});let b=await call('artist','bootstrap');assert.equal(b.reuses.find(r=>r.id===reuse.id).version_id,v2.id);assert(b.notifications.some(n=>n.title.includes('测试古树交付')));await call('artist',`reuses/${reuse.id}`,{},'PATCH');b=await call('artist','bootstrap');assert.equal(b.reuses.find(r=>r.id===reuse.id).version_id,v3.id);pass('新版通知使用者且确认前不自动升级');
 await q("UPDATE tasks SET license='source_only' WHERE id=?",[t.id]);await call('artist',`assets/${t.id}/reuse`,{projectId:p2.id,accepted:true},'POST',403);pass('后端拒绝超出授权范围的复用');
 await call('artist',`assets/${t.id}/favorite`,{saved:true});assert((await call('artist','bootstrap')).favorites.includes(t.id));await call('artist',`assets/${t.id}/favorite`,{saved:false});pass('收藏可保存与取消');
 const unauthorized=await fetch(origin+'/api/projects',{method:'POST',headers:{Cookie:cookies.admin,'Content-Type':'application/json',Origin:'https://evil.invalid'},body:JSON.stringify({name:'test',description:'test'})});assert.equal(unauthorized.status,403);pass('拒绝跨站来源写操作');
 const email='test-'+Date.now()+'@sharecreators.local';const usr=await call('admin','admin/users',{name:'自动测试账户',email,password:'TestOnlySecure!2026',role:'artist'});testUsers.push(usr.id);await call('temporary','auth/login',{email,password:'TestOnlySecure!2026'});await call('admin','admin/users/'+usr.id,{role:'artist',active:false},'PATCH');await call('temporary','me',null,'GET',401);pass('停用账号立即撤销已有会话');
 if(process.env.TEST_AI==='1'){
  const admin=await call('admin','admin/overview');for(const m of admin.models){const r=await call('admin',`admin/models/${m.id}/test`,{});assert(r.text);pass('真实模型连接：'+m.model)}
  for(const request of [{feature:'assistant',prompt:'列出我可见的一个任务名称并给出建议'},{feature:'requirements',prompt:'游戏森林枯树模型'},{feature:'summary',taskId:1},{feature:'tags',taskId:4},{feature:'search',prompt:'适合森林场景的枯树'}]){const r=await call('admin','ai',request);assert(r.text?.length>0);if(request.feature==='search')assert(Array.isArray(r.assets));pass('AI 真实调用：'+request.feature)}
  const h=await call('admin','ai/history');assert(h.length>=7);pass('AI 调用日志持久化');
 }
}catch(e){console.error('FAIL',e.message);results.push({passed:false,error:e.message});process.exitCode=1}finally{
 const stored=[];
 for(const id of testTasks){stored.push(...await q('SELECT path FROM files WHERE task_id=?',[id]));await tx(async c=>{await q('DELETE FROM favorites WHERE task_id=?',[id],c);await q('DELETE FROM reuses WHERE task_id=?',[id],c);const versions=await q('SELECT id FROM versions WHERE task_id=?',[id],c);for(const v of versions){await q('DELETE FROM comments WHERE version_id=? AND parent_id IS NOT NULL',[v.id],c);await q('DELETE FROM comments WHERE version_id=?',[v.id],c)}await q('DELETE FROM files WHERE task_id=?',[id],c);await q('DELETE FROM versions WHERE task_id=?',[id],c);await q('DELETE FROM notifications WHERE link IN (?,?)',['/tasks/'+id,'/review/'+id],c);await q('DELETE FROM tasks WHERE id=?',[id],c)})}
 for(const f of stored)await fs.unlink('storage/'+f.path).catch(()=>{});
 for(const id of testProjects){await q('DELETE FROM project_members WHERE project_id=?',[id]);await q('DELETE FROM projects WHERE id=?',[id])}
 for(const id of testUsers){await q('DELETE FROM sessions WHERE user_id=?',[id]);await q('DELETE FROM users WHERE id=?',[id])}
 await fs.writeFile('docs/test-results.json',JSON.stringify({timestamp:new Date().toISOString(),results},null,2));await db.end();console.log(`${results.filter(r=>r.passed).length}/${results.length} passed. Test artifacts cleaned.`)
}
