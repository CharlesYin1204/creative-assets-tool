import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
await fs.mkdir('database/backups',{recursive:true,mode:0o700});
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),out=path.resolve('database/backups/sharecreators-'+stamp+'.sql');
const handle=await fs.open(out,'wx',0o600);
const args=['--host='+process.env.DB_HOST,'--port='+(process.env.DB_PORT||3306),'--user='+process.env.DB_USER,'--single-transaction','--routines','--triggers',process.env.DB_NAME];
const child=spawn('mysqldump',args,{env:{...process.env,MYSQL_PWD:process.env.DB_PASSWORD},stdio:['ignore',handle.fd,'pipe']});let error='';child.stderr.on('data',s=>error+=s);const code=await new Promise(r=>child.on('close',r));await handle.close();if(code){await fs.unlink(out);throw Error('Database backup failed: '+error.replaceAll(process.env.DB_PASSWORD,'[redacted]'))}console.log('Database backup saved:',out);
