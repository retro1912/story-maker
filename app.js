const W=1080,H=1920,$=s=>document.querySelector(s);
const FAM={sans:'Noto Sans JP',serif:'Noto Serif JP'};
const COLORS=['#5D321A','#FEF4E8','#4EA9A6','#BFA00D','#ffffff','#000000'];
const BLANK={name:'白紙（全面写真）',background:'#FEF4E8',objects:[]};
let DATA={stamps:[],templates:[]},mode='template',cat={template:0,stamp:0},color=COLORS[0];
let frame={x:0,y:0,w:W,h:H},photoObj=null,placeholder=null,photoURL=null;

fabric.Object.prototype.set({cornerSize:64,touchCornerSize:90,transparentCorners:false,cornerColor:'#4EA9A6',cornerStyle:'circle',borderColor:'#4EA9A6',borderScaleFactor:4,padding:8});
const cv=new fabric.Canvas('c',{width:W,height:H,preserveObjectStacking:true,enableRetinaScaling:false,backgroundColor:'#FEF4E8'});

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
  photoObj=img;cv.add(img);cv.sendToBack(img);cv.requestRenderAll()};im.src=url}
function showPlaceholder(){
  const r=new fabric.Rect({width:frame.w,height:frame.h,fill:'rgba(78,169,166,.2)',stroke:'#4EA9A6',strokeWidth:6,strokeDashArray:[24,16]});
  const t=new fabric.Text('タップして写真を選ぶ',{fontSize:60,fill:'#5D321A',fontFamily:'Noto Sans JP',fontWeight:700,originX:'center',originY:'center',left:frame.w/2,top:frame.h/2});
  placeholder=new fabric.Group([r,t],{left:frame.x,top:frame.y,selectable:false,hoverCursor:'pointer'});
  cv.add(placeholder);cv.sendToBack(placeholder)}
cv.on('mouse:up',e=>{if(placeholder&&e.target===placeholder)$('#file').click()});
$('#pick').onclick=()=>$('#file').click();
$('#file').onchange=e=>{const f=e.target.files[0];if(f){if(photoURL)URL.revokeObjectURL(photoURL);photoURL=URL.createObjectURL(f);setPhoto(photoURL)}e.target.value=''};

/* スタンプ・文字 */
function addStamp(src,o={}){return new Promise(res=>fabric.Image.fromURL(encodeURI(src),img=>{
  if(!img){toast('スタンプを読み込めませんでした');return res()}
  const s=(o.w||360)/img.width;
  img.set({left:o.x??W/2,top:o.y??H/2,originX:'center',originY:'center',scaleX:s,scaleY:s,angle:o.angle||0});
  cv.add(img);if(o.x==null)cv.setActiveObject(img);cv.requestRenderAll();res()}))}
const ts={stroke:null,sw:10,bg:null};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function paintBg(c){if(!this.bgColor)return;const f=this.fontSize,px=f*.3+this.strokeWidth/2,py=f*.14+this.strokeWidth/2,w=this.width+px*2,h=this.height+py*2;
  c.fillStyle=this.bgColor;rr(c,-w/2,-h/2,w,h,f*.22);c.fill()}
const setOutline=(t,col,w)=>t.set({stroke:col||null,strokeWidth:col?w:0});
async function addText(text,font='sans',o={}){
  await loadFont(font,text);
  const mine=o.x==null,st=mine?ts:{stroke:o.stroke,sw:o.strokeWidth||10,bg:o.bg};
  const t=new fabric.Text(text,{fontFamily:FAM[font],fontWeight:700,fontSize:o.fontSize||96,fill:o.fill||color,
    left:o.x??W/2,top:o.y??H/2,originX:'center',originY:'center',textAlign:o.align||'center',lineHeight:1.2,angle:o.angle||0,
    paintFirst:'stroke',strokeLineJoin:'round',objectCaching:false});
  setOutline(t,st.stroke,st.sw);t.bgColor=st.bg||null;t._renderBackground=paintBg;
  cv.add(t);if(mine)cv.setActiveObject(t);cv.requestRenderAll()}
const selText=()=>{const a=cv.getActiveObject();return a&&a.type==='text'?a:null};
function syncSel(){const a=selText();if(!a)return;color=a.fill;ts.stroke=a.strokeWidth?a.stroke:null;if(a.strokeWidth)ts.sw=a.strokeWidth;ts.bg=a.bgColor||null;if(mode==='text')draw()}
cv.on('selection:created',syncSel);cv.on('selection:updated',syncSel);
const addObj=o=>o.type==='stamp'?addStamp(o.src,o):o.type==='text'?addText(o.text,o.font,o):0;

$('#del').onclick=()=>{const a=cv.getActiveObjects();if(!a.length)return toast('削除するものを選んでください');
  cv.discardActiveObject();
  a.forEach(o=>{cv.remove(o);if(o===photoObj){photoObj=null;photoURL=null;showPlaceholder()}});cv.requestRenderAll()};

/* テンプレート */
async function applyTemplate(t){
  cv.clear();cv.backgroundColor=t.background||'#FEF4E8';
  photoObj=placeholder=null;frame=t.photo||{x:0,y:0,w:W,h:H};
  showPlaceholder();if(photoURL)setPhoto(photoURL);
  for(const o of t.objects||[])await addObj(o);
  cv.discardActiveObject();cv.requestRenderAll()}
function preview(t){const f=t.photo||{x:0,y:0,w:W,h:H};
  const o=(t.objects||[]).map(o=>o.type==='stamp'
    ?`<image href="${encodeURI(o.src)}" x="${o.x-o.w/2}" y="${o.y-o.w/2}" width="${o.w}" height="${o.w}"/>`
    :`<text x="${o.x}" y="${o.y}" font-size="${o.fontSize||96}" fill="${o.fill||'#5D321A'}" font-weight="700" text-anchor="middle" dominant-baseline="middle"${o.stroke?` stroke="${o.stroke}" stroke-width="${o.strokeWidth||10}" paint-order="stroke" stroke-linejoin="round"`:''}>${esc(String(o.text).split('\n')[0])}</text>`).join('');
  return`<svg viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${t.background||'#FEF4E8'}"/><rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="#4EA9A6" opacity=".35"/>${o}</svg>`}

/* パネル */
function draw(){
  document.querySelectorAll('.mode').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
  const box=$('#items'),tabs=$('#tabs');box.innerHTML=tabs.innerHTML='';
  if(mode==='text')return textPanel(box,tabs.hidden=true);
  tabs.hidden=false;
  const cats=mode==='stamp'?DATA.stamps:DATA.templates,i=Math.min(cat[mode],cats.length-1);
  if(!cats.length)return box.append(el('p','',mode==='stamp'?'stamps フォルダに画像を入れるとここに表示されます。':'templates フォルダにJSONを入れるとここに表示されます。'));
  cats.forEach((c,k)=>{const b=el('button','tab'+(k===i?' on':''),c.category);b.onclick=()=>{cat[mode]=k;draw()};tabs.append(b)});
  const g=el('div','grid');
  cats[i].items.forEach(it=>{
    const b=el('button','item');
    if(mode==='stamp'){const im=el('img');im.src=encodeURI(it);im.alt='スタンプ';im.loading='lazy';im.onerror=()=>b.remove();b.append(im);b.onclick=()=>addStamp(it)}
    else{b.innerHTML=preview(it)+`<span>${esc(it.name||'')}</span>`;
      b.onclick=async()=>{if(cv.getObjects().some(o=>o!==photoObj&&o!==placeholder)&&!await ask({title:'テンプレートを適用',msg:'現在の編集内容は消えます。よろしいですか？',ok:'適用する'}))return;applyTemplate(it)}}
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
    swRow(ts.stroke,c=>{ts.stroke=c;const a=selText();if(a){setOutline(a,c,ts.sw);cv.requestRenderAll()}draw()},1),rg,
    el('p','h','背景'),
    swRow(ts.bg,c=>{ts.bg=c;const a=selText();if(a){a.bgColor=c;cv.requestRenderAll()}draw()},1))}
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
  const stamps=group(paths,IMG,'stamps');
  const templates=await Promise.all(group(paths,['.json'],'templates').map(async c=>({category:c.category,
    items:(await Promise.all(c.items.map(async f=>{try{
      return{name:f.split('/').pop().replace(/\.json$/i,''),...await (await fetch(encodeURI(f),{cache:'no-cache'})).json()}}catch{return null}}))).filter(Boolean)})));
  return{stamps,templates}}
async function loadData(){
  let d;try{d=await discover()}catch{}
  if(!d){try{d=await (await fetch('manifest.json',{cache:'no-cache'})).json()}catch{toast('スタンプ・テンプレートの一覧を読み込めません')}}
  DATA=d||{stamps:[],templates:[]};
  DATA.templates=[{category:'基本',items:[BLANK]},...DATA.templates.filter(c=>c.items.length)];
  cat={template:0,stamp:0}}

/* 初期化 */
$('#reset').onclick=async()=>{
  if(!await ask({title:'初期化',msg:'編集内容をすべて消して、最初の状態に戻します。スタンプ一覧も再読み込みします。',ok:'初期化する'}))return;
  try{localStorage.removeItem('tree')}catch{}
  if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null}
  await loadData();mode='template';draw();await applyTemplate(BLANK);toast('初期化しました')};

/* 起動 */
(async()=>{await loadData();new ResizeObserver(fit).observe($('#stage'));draw();await applyTemplate(BLANK);fit()})();
