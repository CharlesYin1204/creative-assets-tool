import sharp from 'sharp';
import fs from 'node:fs/promises';
import {q,db} from '../lib/db.mjs';
const versions=await q('SELECT * FROM versions WHERE task_id=1 ORDER BY number');
for(const v of versions){if((await q("SELECT id FROM files WHERE version_id=? AND kind='preview'",[v.id])).length)continue;let svg=await fs.readFile('public/art/asset-1.svg','utf8');if(v.number===1)svg=svg.replaceAll('#80ad81','#99a878').replaceAll('#426b46','#69704b');else svg=svg.replace('</svg>','<path d="M330 324q-22 14 -70 6m70 -6q30 16 80 9" stroke="#79714e" stroke-width="6" fill="none"/><text x="24" y="395" fill="#b3cda1" font-size="11" font-family="sans-serif">V2 · refined roots / concept preview</text></svg>');const out=`sample-tree-v${v.number}.png`;await sharp(Buffer.from(svg)).png().toFile('storage/'+out);const {size}=await fs.stat('storage/'+out);await q('INSERT INTO files(task_id,version_id,uploader_id,name,path,mime,size,kind) VALUES(1,?,4,?,?,?, ?,?)',[v.id,`preview_v${v.number}.png`,out,'image/png',size,'preview']);}
console.log('Distinct V1 and V2 preview images prepared.');await db.end();
