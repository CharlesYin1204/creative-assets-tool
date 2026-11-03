import {fail} from './auth.mjs';
// A provider's prose or malformed IDs must not be presented as a valid empty search.
export function parseAssetIds(output) {
  try {
    const match=String(output).match(/\[[\s\S]*?\]/);
    if(!match)throw new Error('Missing JSON array');
    const ids=JSON.parse(match[0]);
    if(!Array.isArray(ids)||ids.some(id=>!Number.isSafeInteger(id)||id<1))throw new Error('Invalid asset IDs');
    return [...new Set(ids)];
  } catch { fail('AI 检索结果格式异常，请重试',502); }
}
