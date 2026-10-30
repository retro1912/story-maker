// stamps/ と templates/ を走査して manifest.json を作る（アプリが一覧を直接読めない場合の予備）
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
const IMG=['.png','.svg','.webp','.jpg','.jpeg','.gif'];
const stamps=scan('stamps',IMG),backgrounds=['backgrounds','background','背景'].flatMap(r=>scan(r,IMG));
const templates=scan('templates',['.json',...IMG]).map(c=>{
  const by=new Map(),items=[];
  c.items.forEach(f=>{const b=f.replace(/\.[^./]+$/,'');if(!by.has(b))by.set(b,{});by.get(b)[/\.json$/i.test(f)?'j':'i']=f});
  for(const [b,v] of by){let t={};   // 同名の .json と画像を1つのテンプレートにまとめる
    if(v.j){try{t=JSON.parse(readFileSync(v.j,'utf8'))}catch(e){console.warn('JSONエラー:',v.j,e.message);if(!v.i)continue}}
    items.push({name:b.split('/').pop(),...t,frame:t.frame||v.i})}
  return{category:c.category,items}});
writeFileSync('manifest.json',JSON.stringify({stamps,templates,backgrounds},null,1));
const n=a=>a.reduce((s,c)=>s+c.items.length,0);
console.log(`stamps: ${n(stamps)} / templates: ${n(templates)} / backgrounds: ${n(backgrounds)}`);
