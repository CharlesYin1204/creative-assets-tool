import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {parseAssetIds} from '../lib/ai-search.mjs';
const good=[['```json\n[4,5,4]\n```',[4,5]],['[]',[]]];
for(const [input,expected]of good)assert.deepEqual(parseAssetIds(input),expected);
for(const input of ['模型暂不可用','{"ids":["4"]}','[1.5]','[-1]','[null]','[[4]]','[4,]'])assert.throws(()=>parseAssetIds(input),e=>e.status===502);
const real=JSON.parse(await fs.readFile('docs/completion/ai-features.json','utf8')),search=real.results.find(r=>r.feature==='search');assert(search.passed&&search.assetIds.length>0);const parsed=parseAssetIds(search.result);assert(search.assetIds.every(id=>parsed.includes(id)));
const report={timestamp:new Date().toISOString(),passed:true,validAndEmptyCases:2,invalidCases:7,realProviderResponseValidated:true,returnedAssetIds:search.assetIds};await fs.writeFile('docs/completion/ai-search-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
