const W=1080,H=1920,$=s=>document.querySelector(s);
window.addEventListener('error',e=>{const t=document.querySelector('#toast');if(t){t.textContent='エラー: '+e.message;t.hidden=false}});
const FAM={sans:'Noto Sans JP',serif:'Noto Serif JP'};
const COLORS=['#5D321A','#FEF4E8','#4EA9A6','#BFA00D','#ffffff','#000000'];
const BLANK={name:'白紙（全面写真）',background:'#FEF4E8',objects:[]};
let DATA={stamps:[],templates:[],backgrounds:[]},mode='stamp',cat={template:0,stamp:0,bg:0},color=COLORS[0];
let frame={x:0,y:0,w:W,h:H},photoObj=null,placeholder=null,frameObj=null,photoURL=null,bgObj=null,bgSrc=null;

fabric.Object.prototype.set({cornerSize:64,touchCornerSize:90,transparentCorners:false,cornerColor:'#4EA9A6',cornerStyle:'circle',borderColor:'#4EA9A6',borderScaleFactor:4,padding:8});
const cv=new fabric.Canvas('c',{width:W,height:H,preserveObjectStacking:true,selection:false,enableRetinaScaling:false,backgroundColor:'#FEF4E8'});

const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.textContent=h;return e};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const toast=m=>{const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.id);toast.id=setTimeout(()=>t.hidden=true,2400)};
const loadFont=(f,t)=>document.fonts.load(`700 40px "${FAM[f]}"`,t).catch(()=>{});
function fit(){const b=$('#stage'),s=Math.min((b.clientWidth-16)/W,(b.clientHeight-16)/H);
  cv.setDimensions({width:W*s+'px',height:H*s+'px'},{cssOnly:true});cv.calcOffset()}

/* ダイアログ */
function ask({title,msg='',input=null,ok='OK'}){return new Promise(res=>{
  const d=$('#dlg'),i=$('#di'),y=$('#do'),n=$('#dc'),multi=input!=null;
  $('#dt').textContent=title;$('#dm').textContent=msg;$('#dm').hidden=!msg;i.hidden=!multi;i.value=input??'';y.textContent=ok;d.hidden=false;
  (multi?i:y).focus();if(multi)i.select();
  const done=v=>{d.hidden=true;y.onclick=n.onclick=d.onclick=d.onkeydown=null;res(v)};
  y.onclick=()=>done(multi?i.value:true);n.onclick=()=>done(multi?null:false);
  d.onclick=e=>{if(e.target===d)n.click()};d.onkeydown=e=>{if(e.key==='Escape')n.click()}})}

/* 写真 */
function setPhoto(url){const im=new Image();im.onerror=()=>toast('写真を読み込めませんでした');
im.onload=()=>{const k=Math.min(1,2200/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');
  c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  const img=new fabric.Image(c);
  if(photoObj)cv.remove(photoObj);
  if(placeholder){cv.remove(placeholder);placeholder=null}
  const s=Math.max(frame.w/img.width,frame.h/img.height);
  img.set({left:frame.x+frame.w/2,top:frame.y+frame.h/2,originX:'center',originY:'center',scaleX:s,scaleY:s,lockRotation:true,
    clipPath:new fabric.Rect({left:frame.x,top:frame.y,width:frame.w,height:frame.h,absolutePositioned:true})});
  img.setControlsVisibility({mtr:false});
  photoObj=img;cv.add(img);cv.sendToBack(img);fixBg();cv.requestRenderAll();updateBar()};im.src=url}
function showPlaceholder(){
  const r=new fabric.Rect({width:frame.w,height:frame.h,fill:'rgba(78,169,166,.2)',stroke:'#4EA9A6',strokeWidth:6,strokeDashArray:[24,16]});
  const t=new fabric.Text('タップして写真を選ぶ',{fontSize:60,fill:'#5D321A',fontFamily:'Noto Sans JP',fontWeight:700,originX:'center',originY:'center',left:frame.w/2,top:frame.h/2});
  placeholder=new fabric.Group([r,t],{left:frame.x,top:frame.y,selectable:false,hoverCursor:'pointer'});
  cv.add(placeholder);cv.sendToBack(placeholder);fixBg()}
cv.on('mouse:up',e=>{if(placeholder&&e.target===placeholder)$('#file').click()});
$('#file').onchange=e=>{const f=e.target.files[0];if(f){if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(f);setPhoto(photoURL)}e.target.value=''};

/* スタンプ・文字 */
function addStamp(src,o={}){return new Promise(res=>fabric.Image.fromURL(encodeURI(src),img=>{
  if(!img){toast('スタンプを読み込めませんでした');return res()}
  const s=(o.w||360)/img.width;
  img.set({left:o.x??W/2,top:o.y??H/2,originX:'center',originY:'center',scaleX:s,scaleY:s,angle:o.angle||0});
  cv.add(img);if(o.lock)setLock(img,true);if(o.x==null)cv.setActiveObject(img);cv.requestRenderAll();res()}))}
const ts={stroke:null,sw:10};
const setOutline=(t,col,w)=>t.set({stroke:col||null,strokeWidth:col?w:0});
async function addText(text,font='sans',o={}){
  await loadFont(font,text);
  const mine=o.x==null,st=mine?ts:{stroke:o.stroke,sw:o.strokeWidth||10};
  const t=new fabric.Text(text,{fontFamily:FAM[font],fontWeight:700,fontSize:o.fontSize||96,fill:o.fill||color,
    left:o.x??W/2,top:o.y??H/2,originX:'center',originY:'center',textAlign:o.align||'center',lineHeight:1.2,angle:o.angle||0,
    paintFirst:'stroke',strokeLineJoin:'round'});
  setOutline(t,st.stroke,st.sw);
  cv.add(t);if(o.lock)setLock(t,true);if(mine)cv.setActiveObject(t);cv.requestRenderAll()}
const selText=()=>{const a=cv.getActiveObject();return a&&a.type==='text'?a:null};
function syncSel(){const a=selText();if(!a)return;color=a.fill;ts.stroke=a.strokeWidth?a.stroke:null;if(a.strokeWidth)ts.sw=a.strokeWidth;if(mode==='text')draw()}
cv.on('selection:created',syncSel);cv.on('selection:updated',syncSel);
const addObj=o=>o.type==='stamp'?addStamp(o.src,o):o.type==='text'?addText(o.text,o.font,o):0;

/* ロック・削除・位置・写真の拡大縮小・背景 */
const fixBg=()=>{if(bgObj)cv.sendToBack(bgObj)};
function setLock(o,on){o.locked=on;
  o.set({lockMovementX:on,lockMovementY:on,lockScalingX:on,lockScalingY:on,lockRotation:on||o===photoObj,hasControls:!on,
    borderColor:on?'#BFA00D':'#4EA9A6',borderDashArray:on?[14,10]:null});o.setCoords()}
function updateBar(){const a=cv.getActiveObject(),any=cv.getObjects().some(o=>o.locked),l=$('#lock');
  ['#cx','#cy','#del'].forEach(q=>$(q).disabled=!a);
  l.disabled=!a&&!any;l.textContent=a?(a.locked?'ロック解除':'ロック'):(any?'全ロック解除':'ロック');l.classList.toggle('gold',!!(a&&a.locked))}
['selection:created','selection:updated','selection:cleared'].forEach(e=>cv.on(e,updateBar));
const _find=cv._searchPossibleTargets.bind(cv); // ロック中の素材は、下にある素材を優先して選ぶ（下に何もなければ選べる）
cv._searchPossibleTargets=(objs,p)=>_find(objs.filter(o=>!o.locked),p)||_find(objs,p);
let lastTap=0;cv.on('mouse:down',e=>{const n=Date.now(); // すばやく2回タップで、ロック中の素材を選ぶ
  if(n-lastTap<350){const p=cv.getPointer(e.e),o=cv.getObjects().slice().reverse().find(o=>o.locked&&o.containsPoint(p));
    if(o){cv.setActiveObject(o);cv.requestRenderAll()}}lastTap=n});
$('#lock').onclick=async()=>{const a=cv.getActiveObject();
  if(!a){if(await ask({title:'ロックをすべて解除',msg:'ロック中の素材をすべて解除します。',ok:'解除する'})){cv.getObjects().forEach(o=>o.locked&&setLock(o,false));cv.requestRenderAll();updateBar()}return}
  setLock(a,!a.locked);cv.requestRenderAll();updateBar();
  toast(a.locked?'ロックしました（選び直すには、すばやく2回タップ）':'ロックを解除しました')};
$('#del').onclick=()=>{const a=cv.getActiveObject();if(!a)return;if(a.locked)return toast('ロック中です。先に解除してください');
  cv.discardActiveObject();cv.remove(a);
  if(a===photoObj){photoObj=null;photoURL=null;showPlaceholder();fixBg()}cv.requestRenderAll();updateBar()};
function center(axis){const a=cv.getActiveObject();if(!a)return;if(a.locked)return toast('ロック中です。先に解除してください');
  if(a===photoObj){const p=a.getCenterPoint();
    a.setPositionByOrigin(new fabric.Point(axis==='x'?frame.x+frame.w/2:p.x,axis==='y'?frame.y+frame.h/2:p.y),'center','center')}
  else cv[axis==='x'?'centerObjectH':'centerObjectV'](a);
  a.setCoords();cv.requestRenderAll()}
$('#cx').onclick=()=>center('x');$('#cy').onclick=()=>center('y');
function fitPhoto(m){const p=photoObj;if(!p)return toast('先に写真を選んでください');if(p.locked)return toast('写真がロック中です。先に解除してください');
  const s=m==='w'?frame.w/p.width:frame.h/p.height;
  p.set({scaleX:s,scaleY:s,left:frame.x+frame.w/2,top:frame.y+frame.h/2});p.setCoords();cv.requestRenderAll()}
async function setBg(src){
  if(bgObj){cv.remove(bgObj);bgObj=null}bgSrc=null;
  if(src){try{const im=await loadImg(src),nw=im.naturalWidth||W,nh=im.naturalHeight||H,k=Math.min(1,2200/Math.max(nw,nh)),c=document.createElement('canvas');
    c.width=Math.round(nw*k);c.height=Math.round(nh*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
    const s=Math.max(W/c.width,H/c.height);
    bgObj=new fabric.Image(c,{left:W/2,top:H/2,originX:'center',originY:'center',scaleX:s,scaleY:s,selectable:false,evented:false});
    cv.add(bgObj);cv.sendToBack(bgObj);bgSrc=src}catch{toast('背景画像を読み込めませんでした')}}
  cv.requestRenderAll()}

/* テンプレート */
const loadImg=src=>new Promise((ok,ng)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ng;i.src=encodeURI(src)});
function holeBox(im){ // フレーム画像の最も大きい透明部分を探し、外接四角を返す
  const w=270,h=480,c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');x.drawImage(im,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data,seen=new Uint8Array(w*h);let best=null;
  for(let s=0;s<w*h;s++){if(seen[s]||d[s*4+3]>=128)continue;
    const st=[s];seen[s]=1;let n=0,x0=w,y0=h,x1=0,y1=0;
    const go=q=>{if(!seen[q]&&d[q*4+3]<128){seen[q]=1;st.push(q)}};
    while(st.length){const p=st.pop(),px=p%w,py=(p/w)|0;n++;
      if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py;
      if(px>0)go(p-1);if(px<w-1)go(p+1);if(py>0)go(p-w);if(py<h-1)go(p+w)}
    if(!best||n>best.n)best={n,x0,y0,x1,y1}}
  if(!best)return null;
  const k=W/w,m=6,X=Math.max(0,best.x0*k-m),Y=Math.max(0,best.y0*k-m);
  return{x:X,y:Y,w:Math.min(W,(best.x1+1)*k+m)-X,h:Math.min(H,(best.y1+1)*k+m)-Y}}
async function applyTemplate(t){
  cv.clear();cv.backgroundColor=t.background||'#FEF4E8';
  photoObj=placeholder=frameObj=bgObj=null;bgSrc=null;frame=t.photo||{x:0,y:0,w:W,h:H};
  if(t.frame){try{const im=await loadImg(t.frame);
      if(!t.photo){const b=holeBox(im);if(b)frame=b;else toast('フレーム画像に透明な部分（写真が入る穴）がありません')}
      frameObj=new fabric.Image(im,{left:0,top:0,scaleX:W/im.width,scaleY:H/im.height,selectable:false,evented:false});cv.add(frameObj)}
    catch{toast('フレーム画像を読み込めませんでした')}}
  showPlaceholder();if(photoURL)setPhoto(photoURL);
  for(const o of t.objects||[])await addObj(o);
  cv.discardActiveObject();cv.requestRenderAll();updateBar()}
function preview(t){const f=t.photo||{x:0,y:0,w:W,h:H};
  const o=(t.objects||[]).map(o=>o.type==='stamp'
    ?`<image href="${encodeURI(o.src)}" x="${o.x-o.w/2}" y="${o.y-o.w/2}" width="${o.w}" height="${o.w}"/>`
    :`<text x="${o.x}" y="${o.y}" font-size="${o.fontSize||96}" fill="${o.fill||'#5D321A'}" font-weight="700" text-anchor="middle" dominant-baseline="middle"${o.stroke?` stroke="${o.stroke}" stroke-width="${o.strokeWidth||10}" paint-order="stroke" stroke-linejoin="round"`:''}>${esc(String(o.text).split('\n')[0])}</text>`).join('');
  return`<svg viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${t.background||'#FEF4E8'}"/>${t.frame?`<image href="${encodeURI(t.frame)}" width="${W}" height="${H}" preserveAspectRatio="none"/>`:`<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="#4EA9A6" opacity=".35"/>`}${o}</svg>`}

/* パネル */
function draw(){
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  const box=$('#items'),tabs=$('#tabs');box.innerHTML=tabs.innerHTML='';
  if(mode==='text')return textPanel(box,tabs.hidden=true);
  if(mode==='photo')return photoPanel(box,tabs.hidden=true);
  tabs.hidden=false;
  const cats=mode==='stamp'?DATA.stamps:DATA.templates,i=Math.max(0,Math.min(cat[mode]||0,cats.length-1));
  if(!cats.length)return box.append(el('p','',mode==='stamp'?'stamps フォルダに画像を入れるとここに表示されます。':'templates フォルダにJSONを入れるとここに表示されます。'));
  cats.forEach((c,k)=>{const b=el('button','tab'+(k===i?' on':''),c.category);b.onclick=()=>{cat[mode]=k;draw()};tabs.append(b)});
  const g=el('div','grid');
  cats[i].items.forEach(it=>{
    const b=el('button','item');
    if(mode==='stamp'){const im=el('img');im.src=encodeURI(it);im.alt='スタンプ';im.loading='lazy';im.onerror=()=>b.remove();b.append(im);b.onclick=()=>addStamp(it)}
    else{b.innerHTML=preview(it)+`<span>${esc(it.name||'')}</span>`;
      b.onclick=async()=>{if(cv.getObjects().some(o=>o!==photoObj&&o!==placeholder&&o!==frameObj&&o!==bgObj)&&!await ask({title:'テンプレートを適用',msg:'現在の編集内容は消えます。よろしいですか？',ok:'適用する'}))return;applyTemplate(it)}}
    g.append(b)});
  box.append(g)}
function swRow(cur,pick,none){const r=el('div','row'),lc=String(cur).toLowerCase();
  if(none){const b=el('button','tab'+(cur==null?' on':''),'なし');b.onclick=()=>pick(null);r.append(b)}
  COLORS.forEach(c=>{const b=el('button','sw'+(c.toLowerCase()===lc?' on':''));b.style.background=c;b.setAttribute('aria-label',c);b.onclick=()=>pick(c);r.append(b)});
  return r}
function textPanel(box){
  const row=el('div','row');
  [['sans','ゴシックを追加'],['serif','明朝を追加']].forEach(([f,l])=>{const b=el('button','',l);
    b.onclick=async()=>{const v=await ask({title:l.replace('を追加',''),msg:'表示する文字を入力してください（改行もできます）',input:'',ok:'追加'});if(v&&v.trim())addText(v,f)};row.append(b)});
  const e=el('button','sub','選択中の文字を編集');
  e.onclick=async()=>{const a=selText();if(!a)return toast('先に文字をタップして選んでください');
    const v=await ask({title:'文字を編集',input:a.text,ok:'変更する'});if(v==null||!v.trim())return;
    await loadFont(a.fontFamily===FAM.serif?'serif':'sans',v);a.set('text',v);cv.requestRenderAll()};
  row.append(e);
  const rg=el('input');rg.type='range';rg.min=2;rg.max=30;rg.value=ts.sw;rg.setAttribute('aria-label','縁取りの太さ');
  rg.oninput=()=>{ts.sw=+rg.value;const a=selText();if(a&&a.stroke){a.set('strokeWidth',ts.sw);cv.requestRenderAll()}};
  box.append(row,el('p','h','文字の色'),
    swRow(color,c=>{color=c;const a=selText();if(a){a.set('fill',c);cv.requestRenderAll()}draw()}),
    el('p','h','縁取り（色・太さ）'),
    swRow(ts.stroke,c=>{ts.stroke=c;const a=selText();if(a){setOutline(a,c,ts.sw);cv.requestRenderAll()}draw()},1),rg)}
function photoPanel(box){
  const r=el('div','row tight'),pk=el('button','','写真を選ぶ'),fw=el('button','sub','幅に合わせる'),fh=el('button','sub','高さに合わせる');
  pk.onclick=()=>$('#file').click();fw.onclick=()=>fitPhoto('w');fh.onclick=()=>fitPhoto('h');r.append(pk,fw,fh);
  box.append(el('p','h','写真'),r,el('p','h','背景色'),
    swRow(bgSrc?null:cv.backgroundColor,c=>{setBg(null);cv.backgroundColor=c;cv.requestRenderAll();draw()}),el('p','h','背景画像'));
  const cats=DATA.backgrounds||[];
  if(!cats.length)return box.append(el('p','','backgrounds（または background）フォルダに画像を入れると、ここに表示されます。'));
  const i=Math.max(0,Math.min(cat.bg||0,cats.length-1)),tabs=el('div','row tight');
  cats.forEach((c,k)=>{const b=el('button','tab'+(k===i?' on':''),c.category);b.onclick=()=>{cat.bg=k;draw()};tabs.append(b)});
  const g=el('div','grid'),none=el('button','item txt'+(bgSrc?'':' on'),'なし');none.onclick=()=>setBg(null).then(draw);g.append(none);
  cats[i].items.forEach(it=>{const b=el('button','item bg'+(bgSrc===it?' on':'')),im=el('img');
    im.src=encodeURI(it);im.alt='背景';im.loading='lazy';im.onerror=()=>b.remove();b.append(im);b.onclick=()=>setBg(it).then(draw);g.append(b)});
  box.append(tabs,g)}
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{mode=b.dataset.m;draw()});

/* 書き出し */
async function render(){
  cv.discardActiveObject();if(placeholder)placeholder.visible=false;
  await document.fonts.ready;cv.renderAll();
  const url=cv.toDataURL({format:'png'});
  if(placeholder){placeholder.visible=true;cv.renderAll()}
  return (await fetch(url)).blob()}
function download(b){const a=el('a');a.href=URL.createObjectURL(b);a.download='story.png';a.click();toast('画像を保存しました。Instagramで選んで投稿できます')}
$('#save').onclick=async()=>download(await render());
$('#share').onclick=async()=>{const b=await render(),f=new File([b],'story.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){
    try{await navigator.share({files:[f]});return}catch(e){if(e.name==='AbortError')return}}
  download(b)};

/* 一覧の取得：GitHubのフォルダ内容を直接読む（失敗時は manifest.json） */
const IMG=['.png','.svg','.webp','.jpg','.jpeg','.gif'],clean=n=>n.replace(/^\d+[_\-.\s]*/,'');
function group(paths,exts,root){
  const m=new Map(),loose=[];
  paths.filter(p=>p.startsWith(root+'/')&&exts.some(e=>p.toLowerCase().endsWith(e)))
    .sort((a,b)=>a.localeCompare(b,'ja',{numeric:true}))
    .forEach(p=>{const q=p.split('/');if(q.length===2)loose.push(p);else{if(!m.has(q[1]))m.set(q[1],[]);m.get(q[1]).push(p)}});
  const cats=[...m].map(([k,items])=>({category:clean(k),items}));
  if(loose.length)cats.push({category:'その他',items:loose});
  return cats}
async function tplItems(files){ // 同じ名前の .json と画像を1つのテンプレートにまとめる
  const by=new Map(),out=[];
  files.forEach(f=>{const b=f.replace(/\.[^./]+$/,'');if(!by.has(b))by.set(b,{});by.get(b)[/\.json$/i.test(f)?'j':'i']=f});
  for(const [b,v] of by){let t={};
    if(v.j){try{t=await (await fetch(encodeURI(v.j),{cache:'no-cache'})).json()}catch{if(!v.i)continue}}
    out.push({name:b.split('/').pop(),...t,frame:t.frame||v.i})}
  return out}
async function discover(){
  const h=location.hostname.match(/^(.+)\.github\.io$/),repo=location.pathname.split('/')[1];
  if(!h||!repo)throw 0;
  let paths;
  try{const c=JSON.parse(localStorage.getItem('tree')||'null');if(c&&Date.now()-c.t<18e4)paths=c.p}catch{}
  if(!paths){
    for(const br of ['HEAD','main','master']){
      const r=await fetch(`https://api.github.com/repos/${h[1]}/${repo}/git/trees/${br}?recursive=1`);
      if(r.ok){paths=(await r.json()).tree.filter(x=>x.type==='blob').map(x=>x.path);break}}
    if(!paths)throw 0;
    try{localStorage.setItem('tree',JSON.stringify({t:Date.now(),p:paths}))}catch{}}
  const stamps=group(paths,IMG,'stamps'),backgrounds=['backgrounds','background','背景'].flatMap(r=>group(paths,IMG,r));
  const templates=await Promise.all(group(paths,['.json',...IMG],'templates').map(async c=>({category:c.category,items:await tplItems(c.items)})));
  return{stamps,templates,backgrounds}}
async function loadData(){
  let d;try{d=await discover()}catch{}
  if(!d){try{d=await (await fetch('manifest.json',{cache:'no-cache'})).json()}catch{toast('スタンプ・テンプレートの一覧を読み込めません')}}
  DATA=d||{stamps:[],templates:[]};DATA.backgrounds=DATA.backgrounds||[];
  DATA.templates=[{category:'基本',items:[BLANK]},...DATA.templates.filter(c=>c.items.length)];
  cat={template:0,stamp:0,bg:0}}

/* 初期化 */
$('#reset').onclick=async()=>{
  if(!await ask({title:'初期化',msg:'編集内容をすべて消して、最初の状態に戻します。スタンプ一覧も再読み込みします。',ok:'初期化する'}))return;
  try{localStorage.removeItem('tree')}catch{}
  if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null}
  await loadData();mode='stamp';draw();await applyTemplate(BLANK);toast('初期化しました')};

/* 起動 */
(async()=>{await loadData();new ResizeObserver(fit).observe($('#stage'));draw();await applyTemplate(BLANK);fit()})();
