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
async function addText(text,font='sans',o={}){
  await loadFont(font,text);
  const t=new fabric.Text(text,{fontFamily:FAM[font],fontWeight:700,fontSize:o.fontSize||96,fill:o.fill||color,
    left:o.x??W/2,top:o.y??H/2,originX:'center',originY:'center',textAlign:o.align||'center',lineHeight:1.2,angle:o.angle||0});
  cv.add(t);if(o.x==null)cv.setActiveObject(t);cv.requestRenderAll()}
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
    :`<text x="${o.x}" y="${o.y}" font-size="${o.fontSize||96}" fill="${o.fill||'#5D321A'}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${esc(String(o.text).split('\n')[0])}</text>`).join('');
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
    if(mode==='stamp'){const im=el('img');im.src=encodeURI(it);im.alt='スタンプ';im.loading='lazy';b.append(im);b.onclick=()=>addStamp(it)}
    else{b.innerHTML=preview(it)+`<span>${esc(it.name||'')}</span>`;
      b.onclick=()=>{if(cv.getObjects().some(o=>o!==photoObj&&o!==placeholder)&&!confirm('現在の編集内容は消えます。テンプレートを適用しますか？'))return;applyTemplate(it)}}
    g.append(b)});
  box.append(g)}
function textPanel(box){
  const row=el('div','row');
  [['sans','ゴシックを追加'],['serif','明朝を追加']].forEach(([f,l])=>{const b=el('button','',l);
    b.onclick=()=>{const v=prompt('追加する文字を入力（改行は入力欄で改行）','');if(v)addText(v,f)};row.append(b)});
  const e=el('button','sub','選択中の文字を編集');
  e.onclick=()=>{const a=cv.getActiveObject();if(!a||a.type!=='text')return toast('先に文字をタップして選んでください');
    const v=prompt('文字を編集',a.text);if(v==null)return;
    loadFont(a.fontFamily===FAM.serif?'serif':'sans',v).then(()=>{a.set('text',v);cv.requestRenderAll()})};
  row.append(e);box.append(row,el('p','','文字の色'));
  const sw=el('div','row');
  COLORS.forEach(c=>{const b=el('button','sw'+(c===color?' on':''));b.style.background=c;b.setAttribute('aria-label',c);
    b.onclick=()=>{color=c;const a=cv.getActiveObject();if(a&&a.type==='text'){a.set('fill',c);cv.requestRenderAll()}draw()};sw.append(b)});
  box.append(sw)}
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

/* 起動 */
(async()=>{
  try{DATA=await (await fetch('manifest.json',{cache:'no-cache'})).json()}catch{toast('manifest.json が読み込めません')}
  DATA.templates=[{category:'基本',items:[BLANK]},...DATA.templates.filter(c=>c.items.length)];
  new ResizeObserver(fit).observe($('#stage'));
  draw();await applyTemplate(BLANK);fit()})();
