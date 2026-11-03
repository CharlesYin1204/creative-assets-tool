import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const origin=process.env.TEST_URL||'http://127.0.0.1:3041', password=(await fs.readFile('docs/access.txt','utf8')).match(/以上初始密码：(.+)/)[1];
const r=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@sharecreators.local',password})});assert(r.ok);const cookie=r.headers.get('set-cookie').split(';')[0],results=[];
for(const body of [{feature:'summary',taskId:1},{feature:'tags',taskId:4},{feature:'search',prompt:'适合森林场景的枯树'}]){
 const r=await fetch(origin+'/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)}),j=await r.json();results.push({feature:body.feature,status:r.status,passed:r.ok&&!!j.text,error:j.error,model:j.model,tokens:j.tokens,result:j.text,assetIds:j.assets?.map(a=>a.id)});console.log(body.feature,r.status,j.error||j.model);if(!r.ok)process.exitCode=1;
}
await fs.writeFile('docs/completion/ai-features.json',JSON.stringify({timestamp:new Date().toISOString(),results},null,2));
