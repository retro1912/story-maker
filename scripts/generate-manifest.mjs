// stamps/ と templates/ を走査して manifest.json を作る（GitHub Actionsが自動実行）
import {readdirSync,statSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,extname} from 'node:path';
const clean=n=>n.replace(/^\d+[_\-.\s]*/,'');            // 「01_」などの並び順用の接頭辞を除去
const ls=d=>existsSync(d)?readdirSync(d).filter(n=>!n.startsWith('.')).sort((a,b)=>a.localeCompare(b,'ja',{numeric:true})):[];
function scan(root,exts){
  const cats=[],loose=[],ok=f=>exts.includes(extname(f).toLowerCase());
  for(const n of ls(root)){const p=join(root,n);
    if(statSync(p).isDirectory()){const items=ls(p).filter(ok).map(f=>`${root}/${n}/${f}`);if(items.length)cats.push({category:clean(n),items})}
    else if(ok(n))loose.push(`${root}/${n}`)}
  if(loose.length)cats.push({category:'その他',items:loose});
  return cats}
const stamps=scan('stamps',['.png','.svg','.webp','.jpg','.jpeg','.gif']);
const templates=scan('templates',['.json']).map(c=>({category:c.category,items:c.items.map(f=>{
  try{return{name:f.split('/').pop().replace(/\.json$/i,''),...JSON.parse(readFileSync(f,'utf8'))}}
  catch(e){console.warn('JSONエラー:',f,e.message);return null}}).filter(Boolean)}));
writeFileSync('manifest.json',JSON.stringify({stamps,templates},null,1));
const n=a=>a.reduce((s,c)=>s+c.items.length,0);
console.log(`stamps: ${n(stamps)} / templates: ${n(templates)}`);
