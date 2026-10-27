// Foglio: il disegno è un SVG dentro la pagina, alla scala che entra nello spazio disponibile o a quella scelta.
// Sopra c'è un secondo SVG con il riquadro dell'oggetto scelto e le maniglie per ridimensionarlo.
const sheet=$('sheet'),overlay=$('overlay'),sheetWrap=$('sheetWrap'),drawStage=$('drawStage');
const n2=v=>Math.round(v*100)/100;
function sheetScale(){if(Dw.zoom)return Dw.zoom;const pad=32;return Math.max(.02,Math.min(1,(drawStage.clientWidth-pad)/Dw.p.w,(drawStage.clientHeight-pad)/Dw.p.h))}
// Un oggetto in SVG. hit: l'oggetto si può scegliere col puntatore anche dove è trasparente; img: id per riaprire il file.
function itemSvg(it,{href='',hit=false,img=false}={}){if(it.hidden)return '';const b=box(it),cx=n2(b.x+b.w/2),cy=n2(b.y+b.h/2),tr=it.rot?` transform="rotate(${n2(it.rot)} ${cx} ${cy})"`:'',op=it.opacity<100?` opacity="${it.opacity/100}"`:'',id=hit?` data-id="${it.id}"`:'',pe=hit?' pointer-events="visible"':'';
 const paint=`fill="${it.fill==='none'?'none':esc(it.fill)}"${it.sw>0&&it.stroke!=='none'?` stroke="${esc(it.stroke)}" stroke-width="${it.sw}"`:''}`;
 switch(it.kind){
  case 'rect':return `<rect${id} x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"${it.radius?` rx="${it.radius}"`:''} ${paint}${tr}${op}${pe}/>`;
  case 'ellipse':return `<ellipse${id} cx="${cx}" cy="${cy}" rx="${n2(it.w/2)}" ry="${n2(it.h/2)}" ${paint}${tr}${op}${pe}/>`;
  case 'line':{const xy=`x1="${it.x}" y1="${it.y}" x2="${it.x+it.w}" y2="${it.y+it.h}"`;return `<g${id}${tr}${op}><line ${xy} stroke="${esc(it.stroke)}" stroke-width="${it.sw}" stroke-linecap="round"/>${hit?`<line ${xy} stroke="transparent" stroke-width="${Math.max(it.sw,24)}"/>`:''}</g>`}
  case 'text':{const lines=String(it.text).split('\n'),ax=n2(it.align==='center'?it.x+it.w/2:it.align==='right'?it.x+it.w:it.x),anchor=it.align==='center'?'middle':it.align==='right'?'end':'start';
   return `<g${id}${tr}${op}>${hit?`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="transparent"/>`:''}<text x="${ax}" y="${it.y}" font-family="${esc(it.font)}" font-size="${it.size}" font-weight="${it.bold?700:400}"${it.italic?' font-style="italic"':''} fill="${esc(it.fill)}" text-anchor="${anchor}" xml:space="preserve">${lines.map((l,i)=>`<tspan x="${ax}" dy="${n2(i?it.size*it.lineH:it.size*(it.lineH/2+.35))}">${esc(l)}</tspan>`).join('')}</text></g>`}
  case 'image':return `<image${id}${img?` data-img="${it.img}"`:''} href="${esc(href)}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="none"${tr}${op}/>`}
 return ''}
function renderSheet(){const p=Dw.p,k=sheetScale();for(const s of [sheet,overlay]){s.setAttribute('viewBox',`0 0 ${p.w} ${p.h}`);s.style.width=Math.round(p.w*k)+'px';s.style.height=Math.round(p.h*k)+'px'}
 sheet.innerHTML=(p.bg==='none'?'':`<rect width="${p.w}" height="${p.h}" fill="${esc(p.bg)}"/>`)+p.items.map(it=>itemSvg(it,{href:it.kind==='image'?imgHref(it):'',hit:true})).join('');
 sheetWrap.classList.toggle('transparent',p.bg==='none');renderOverlay();sheetWrap.setAttribute('aria-label',sheetLabel());$('drawInfo').textContent=`${fmtInt(p.w)} × ${fmtInt(p.h)} px · ${fmtInt(k*100)}%`}
const sheetLabel=()=>{const p=Dw.p,it=selItem();return `Foglio ${fmtInt(p.w)} per ${fmtInt(p.h)} pixel, ${p.items.length===1?'un oggetto':p.items.length+' oggetti'}. ${it?'Scelto: '+describeItem(it):'Nessun oggetto scelto.'}`};
function renderOverlay(){const it=selItem(),k=sheetScale();if(!it||it.hidden){overlay.innerHTML='';return}const b=box(it),hs=n2(10/k),sw=n2(1.5/k),cx=b.x+b.w/2,cy=b.y+b.h/2,handle=(x,y,h)=>`<rect class="handle h-${h}" data-h="${h}" x="${n2(x-hs/2)}" y="${n2(y-hs/2)}" width="${hs}" height="${hs}" stroke-width="${sw}"/>`;
 let s=`<g${it.rot?` transform="rotate(${it.rot} ${n2(cx)} ${n2(cy)})"`:''}><rect class="sel-box" x="${b.x}" y="${b.y}" width="${Math.max(b.w,.01)}" height="${Math.max(b.h,.01)}" fill="none" stroke-width="${sw}" stroke-dasharray="${n2(5/k)} ${n2(3/k)}"/>`;
 if(it.kind==='line')s+=handle(it.x,it.y,'p1')+handle(it.x+it.w,it.y+it.h,'p2');
 else if(!it.rot)for(const [h,x,y] of [['nw',b.x,b.y],['n',cx,b.y],['ne',b.x+b.w,b.y],['e',b.x+b.w,cy],['se',b.x+b.w,b.y+b.h],['s',cx,b.y+b.h],['sw',b.x,b.y+b.h],['w',b.x,cy]])if(it.kind!=='text'||h.length===2)s+=handle(x,y,h);
 overlay.innerHTML=s+'</g>'}
// Immagini regolate: si calcolano a parte (al massimo 1024 pixel per l'anteprima) e si ricordano per chiave.
const procCache=new Map();
const imgRecipe=it=>({...newRecipe(),adj:{...newRecipe().adj,...it.adj},look:it.look||'none',lookAmt:it.lookAmt??100});
const hasImgEdits=it=>Object.values(it.adj||{}).some(v=>v)||(it.look||'none')!=='none';
async function processImage(m,it,max,mime='image/png'){m.bmp??=await createImageBitmap(m.blob);const k=Math.min(1,max/Math.max(m.w,m.h)),w=Math.max(1,Math.round(m.w*k)),h=Math.max(1,Math.round(m.h*k)),cv=new OffscreenCanvas(w,h),ctx=cv.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(m.bmp,0,0,w,h);const px=ctx.getImageData(0,0,w,h);ctx.putImageData(develop(px,px,imgRecipe(it),lutOf(it.look||'none')),0,0);return cv.convertToBlob({type:mime,quality:.92})}
function imgHref(it){const m=Dw.imgs.get(it.img);if(!m)return '';if(!hasImgEdits(it)||m.type==='image/svg+xml')return m.url;const key=it.img+JSON.stringify([it.adj,it.look,it.lookAmt]),c=procCache.get(key);if(c)return c.url||c.prev||m.url;
 const prev=[...procCache.entries()].reverse().find(([k2,v])=>k2.startsWith(it.img)&&v.url)?.[1].url;procCache.set(key,{url:null,prev});
 processImage(m,it,PREVIEW_FAST).then(blob=>{const e=procCache.get(key);if(!e)return;e.url=URL.createObjectURL(blob);if(procCache.size>40){const [k0,v0]=procCache.entries().next().value;if(v0.url)URL.revokeObjectURL(v0.url);procCache.delete(k0)}renderSheet()}).catch(e=>console.warn('Immagine non regolata',e));return prev||m.url}
// Livelli: dal più in alto al più in basso, come si vedono sul foglio.
function renderLayers(){const list=$('layList'),items=[...Dw.p.items].reverse();$('layCount').textContent=items.length?`${items.length}`:'';
 list.innerHTML=items.length?items.map(it=>`<div role="option" id="lay-${it.id}" class="lb-item layer-item${it.id===Dw.sel?' active':''}" data-id="${it.id}" aria-selected="${it.id===Dw.sel}">${ICON(KIND_ICON[it.kind])}<span class="n">${esc(it.name)}${it.kind==='text'?`<span class="sr-only">, testo «${esc(it.text.replace(/\n/g,' '))}»</span>`:''}</span>${it.hidden?'<span class="t">nascosto</span>':''}</div>`).join(''):'<div class="lb-empty" role="option" aria-disabled="true" aria-selected="false" id="lay-empty">Foglio vuoto: inserisci un oggetto dalla scheda Inserisci.</div>';
 list.setAttribute('aria-activedescendant',Dw.sel&&itemOf(Dw.sel)?'lay-'+Dw.sel:items.length?'lay-'+items[0].id:'lay-empty')}
function selectItem(id,{say=true}={}){Dw.sel=id&&itemOf(id)?id:null;Dw.last={label:'',t:0};renderLayers();renderOverlay();renderProps();refreshToggles();sheetWrap.setAttribute('aria-label',sheetLabel());$('lay-'+Dw.sel)?.scrollIntoView({block:'nearest'});if(say)announce(Dw.sel?describeItem(selItem()):'Nessun oggetto scelto: le proprietà sono quelle del foglio')}
// Oggetto sopra o sotto quello scelto (dir 1 = sopra).
function selectStep(dir){const items=Dw.p.items;if(!items.length){toast('Il foglio è vuoto');return}const i=items.findIndex(x=>x.id===Dw.sel),j=i<0?(dir>0?0:items.length-1):clamp(i+dir,0,items.length-1);selectItem(items[j].id)}
// Proprietà: del foglio se non c'è un oggetto scelto, dell'oggetto altrimenti. I numeri si scrivono anche con la virgola.
const fld=(id,label,value,mode='decimal')=>`<label for="pr-${id}">${esc(label)}</label><input id="pr-${id}" data-prop="${id}" type="text" inputmode="${mode}" autocomplete="off" spellcheck="false" value="${esc(value)}">`;
const colorFld=(id,label,value,none)=>`<label for="pr-${id}">${esc(label)}</label><input id="pr-${id}" data-prop="${id}" type="color" value="${esc(value==='none'?'#ffffff':value)}"${value==='none'?' disabled':''}>${none?`<label class="check"><input type="checkbox" data-prop="${id}None"${value==='none'?' checked':''}> ${esc(none)}</label>`:''}`;
const rangeFld=(id,label,min,max,step,value,fmt)=>`<div class="adj"><label for="pr-${id}">${esc(label)}</label><output id="pr-${id}-o" aria-hidden="true">${esc(fmt(value))}</output><span></span><input type="range" id="pr-${id}" data-prop="${id}" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${esc(fmt(value))}"></div>`;
const selFld=(id,label,value,opts)=>`<label for="pr-${id}">${esc(label)}</label><select id="pr-${id}" data-prop="${id}">${opts.map(([v,l])=>`<option value="${esc(v)}"${String(v)===String(value)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
const IMG_ADJ=['exposure','contrast','highlights','shadows','temp','saturation'];
function renderProps(){const b=$('propBody'),it=selItem(),p=Dw.p,focusId=document.activeElement?.closest?.('#propBody')?document.activeElement.id:null;$('propTitle').textContent=it?'Proprietà di '+it.name:'Proprietà del foglio';
 if(!it)b.innerHTML=selFld('preset','Formato',sheetPreset(p),[['','Personalizzato'],...SHEETS.map(s=>[s[0],s[1]])])+`<div class="row2"><div>${fld('sw_','Larghezza (px)',p.w)}</div><div>${fld('sh_','Altezza (px)',p.h)}</div></div>`+colorFld('bg','Sfondo',p.bg,'Trasparente')+`<label for="pr-desc">Descrizione</label><textarea id="pr-desc" data-prop="desc" rows="4" aria-describedby="pr-desc-h">${esc(p.desc)}</textarea><small class="hint" id="pr-desc-h">Che cosa mostra il disegno, per chi non lo vede: va nel file SVG ed è il testo alternativo da usare quando lo pubblichi.</small>`;
 else{const bx=box(it);let h=fld('name','Nome',it.name,'text')+`<div class="row2"><div>${fld('x','X',bx.x)}</div><div>${fld('y','Y',bx.y)}</div></div>`;
  if(it.kind==='line')h+=`<div class="row2"><div>${fld('w','Lunghezza orizzontale',it.w)}</div><div>${fld('h','Lunghezza verticale',it.h)}</div></div>`;
  else if(it.kind!=='text')h+=`<div class="row2"><div>${fld('w','Larghezza',it.w)}</div><div>${fld('h','Altezza',it.h)}</div></div>`;
  h+=fld('rot','Rotazione (gradi)',n2(it.rot));
  if(it.kind==='text')h+=`<label for="pr-text">Testo</label><textarea id="pr-text" data-prop="text" rows="3">${esc(it.text)}</textarea>`+selFld('font','Carattere',it.font,FONTS)+fld('size','Dimensione (px)',it.size)+`<label class="check"><input type="checkbox" data-prop="bold"${it.bold?' checked':''}> Grassetto</label> <label class="check"><input type="checkbox" data-prop="italic"${it.italic?' checked':''}> Corsivo</label>`+selFld('align','Allineamento',it.align,[['left','A sinistra'],['center','Al centro'],['right','A destra']])+colorFld('fill','Colore del testo',it.fill);
  if(it.kind==='rect'||it.kind==='ellipse')h+=colorFld('fill','Riempimento',it.fill,'Nessun riempimento')+colorFld('stroke','Contorno',it.stroke)+fld('sw','Spessore del contorno (px)',it.sw)+(it.kind==='rect'?fld('radius','Angoli arrotondati (px)',it.radius):'');
  if(it.kind==='line')h+=colorFld('stroke','Colore',it.stroke)+fld('sw','Spessore (px)',it.sw);
  if(it.kind==='image'){const svg=Dw.imgs.get(it.img)?.type==='image/svg+xml';h+=svg?'<p class="hint">Le immagini SVG si mettono sul foglio così come sono: le regolazioni valgono per le foto.</p>':`<h3>Regolazioni della foto</h3>`+IMG_ADJ.map(id=>{const a=ADJ_BY[id];return rangeFld('adj.'+id,a.label,a.min,a.max,a.step,it.adj?.[id]||0,a.fmt)}).join('')+selFld('look','Look',it.look||'none',lookList())+((it.look||'none')!=='none'?rangeFld('lookAmt','Intensità del look',0,100,1,it.lookAmt??100,v=>fmtInt(v)+'%'):'')}
  h+=rangeFld('opacity','Opacità',0,100,1,it.opacity,v=>fmtInt(v)+'%')+`<label class="check"><input type="checkbox" data-prop="hidden"${it.hidden?' checked':''}> Nascosto</label>`;b.innerHTML=h}
 if(focusId&&$(focusId))$(focusId).focus()}
// Aggiorna i valori senza ricostruire il pannello, così il campo che si sta usando non perde il focus.
function syncProps(){const it=selItem(),a=document.activeElement;if(!it){if($('pr-sw_')&&a!==$('pr-sw_'))$('pr-sw_').value=Dw.p.w;if($('pr-sh_')&&a!==$('pr-sh_'))$('pr-sh_').value=Dw.p.h;return}if(!$('pr-name')){renderProps();return}const bx=box(it);
 for(const [k,v] of [['x',bx.x],['y',bx.y],['w',it.w],['h',it.h],['rot',n2(it.rot)],['size',it.size],['sw',it.sw],['radius',it.radius]]){const el=$('pr-'+k);if(el&&el!==a)el.value=v}
 const op=$('pr-opacity');if(op&&op!==a){op.value=it.opacity;op.setAttribute('aria-valuetext',it.opacity+'%');$('pr-opacity-o').textContent=it.opacity+'%'}}
// Valori scritti nei campi: si controllano e diventano una modifica.
const PROP_NAME={name:'Nome',x:'Posizione',y:'Posizione',w:'Dimensioni',h:'Dimensioni',rot:'Rotazione',text:'Testo',font:'Carattere',size:'Dimensione del testo',bold:'Grassetto',italic:'Corsivo',align:'Allineamento',fill:'Colore',fillNone:'Riempimento',stroke:'Contorno',sw:'Spessore',radius:'Angoli',opacity:'Opacità',hidden:'Nascosto',look:'Look',lookAmt:'Intensità del look',sw_:'Larghezza del foglio',sh_:'Altezza del foglio',preset:'Formato del foglio',bg:'Sfondo',bgNone:'Sfondo',desc:'Descrizione'};
function applyProp(key,el){const p=Dw.p,it=selItem(),v=el.type==='checkbox'?el.checked:el.value,n=num(v);
 const need=(lo,hi)=>{if(!(n>=lo&&n<=hi))throw Error(`Scrivi un numero tra ${fmtInt(lo)} e ${fmtInt(hi)}`);return n};
 if(!it){if(key==='preset'){const s=SHEETS.find(x=>x[0]===v);if(s){p.w=s[2];p.h=s[3]}}else if(key==='sw_')p.w=Math.round(need(16,10000));else if(key==='sh_')p.h=Math.round(need(16,10000));else if(key==='bg')p.bg=v;else if(key==='bgNone')p.bg=v?'none':'#ffffff';else if(key==='desc')p.desc=v;return}
 if(key.startsWith('adj.')){it.adj={...it.adj,[key.slice(4)]:Number(v)};return}
 switch(key){case 'name':it.name=String(v).trim()||nextName(it.kind);break;
  case 'x':it.x+=Math.round(need(-1e5,1e5))-box(it).x;break;case 'y':it.y+=Math.round(need(-1e5,1e5))-box(it).y;break;
  case 'w':it.w=Math.round(need(it.kind==='line'?-1e5:1,1e5));break;case 'h':it.h=Math.round(need(it.kind==='line'?-1e5:1,1e5));break;
  case 'rot':it.rot=((need(-360,360)%360)+360)%360;break;case 'sw':it.sw=need(0,1000);break;case 'radius':it.radius=need(0,1e5);break;
  case 'size':it.size=need(1,2000);break;case 'opacity':case 'lookAmt':it[key]=Number(v);break;case 'fillNone':it.fill=v?'none':'#0e6f8a';break;
  default:it[key]=v}
 if(it.kind==='text'&&['text','font','size','bold','italic'].includes(key))measureText(it)}
// Spostamenti e ridimensionamenti con il puntatore: maniglie ai lati e agli angoli; Maiusc mantiene le proporzioni.
const toSheet=e=>{const r=sheet.getBoundingClientRect(),k=sheetScale();return {x:(e.clientX-r.left)/k,y:(e.clientY-r.top)/k}};
let drag=null;
function resizeBy(it,d,dx,dy,shift){const o=d.it0,H=d.h;
 if(it.kind==='line'){if(H==='p1'){it.x=Math.round(o.x+dx);it.y=Math.round(o.y+dy);it.w=Math.round(o.w-dx);it.h=Math.round(o.h-dy)}else{it.w=Math.round(o.w+dx);it.h=Math.round(o.h+dy)}return}
 let x=o.x,y=o.y,w=o.w,h=o.h;if(H.includes('e'))w=o.w+dx;if(H.includes('s'))h=o.h+dy;if(H.includes('w')){w=o.w-dx;x=o.x+dx}if(H.includes('n')){h=o.h-dy;y=o.y+dy}w=Math.max(1,w);h=Math.max(1,h);
 // Testi e immagini (dagli angoli) mantengono le proporzioni; le forme solo con Maiusc.
 if(it.kind==='text'||((it.kind==='image')!==shift&&H.length===2)){const k=Math.max(w/o.w,h/o.h);w=o.w*k;h=o.h*k;if(H.includes('w'))x=o.x+o.w-w;if(H.includes('n'))y=o.y+o.h-h}
 if(it.kind==='text'){it.size=Math.max(4,Math.round(o.size*h/o.h));measureText(it);it.x=Math.round(H.includes('w')?o.x+o.w-it.w:o.x);it.y=Math.round(H.includes('n')?o.y+o.h-it.h:o.y);return}
 Object.assign(it,{x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h)})}
sheetWrap.addEventListener('pointerdown',e=>{if(e.button!==0)return;sheetWrap.focus({preventScroll:true});const pt=toSheet(e),h=e.target.closest?.('[data-h]');
 if(h&&selItem())drag={mode:'resize',h:h.dataset.h,it0:{...selItem()},pt0:pt};
 else{const t=e.target.closest?.('[data-id]');if(!t){if(Dw.sel)selectItem(null,{say:false});return}if(t.dataset.id!==Dw.sel)selectItem(t.dataset.id,{say:false});drag={mode:'move',it0:{...selItem()},pt0:pt}}
 sheetWrap.setPointerCapture(e.pointerId);e.preventDefault()});
sheetWrap.addEventListener('pointermove',e=>{if(!drag)return;const it=selItem();if(!it)return;const pt=toSheet(e),dx=pt.x-drag.pt0.x,dy=pt.y-drag.pt0.y;if(!drag.moved&&Math.hypot(dx,dy)*sheetScale()<3)return;drag.moved=true;
 if(drag.mode==='move'){it.x=Math.round(drag.it0.x+dx);it.y=Math.round(drag.it0.y+dy)}else resizeBy(it,drag,dx,dy,e.shiftKey);renderSheet();syncProps()});
const endDrag=()=>{if(!drag)return;const d=drag;drag=null;if(d.moved&&settleD(d.mode==='move'?'Sposta':'Ridimensiona'))announce(describeItem(selItem()))};
sheetWrap.addEventListener('pointerup',endDrag);sheetWrap.addEventListener('pointercancel',endDrag);
// Tastiera sul foglio: frecce per spostare, Ctrl+frecce per ridimensionare (con Maiusc di 10 pixel),
// PgSu e PgGiù per scegliere l'oggetto sopra o sotto, Invio per le proprietà, Esc per non scegliere niente.
sheetWrap.addEventListener('keydown',e=>{const it=selItem(),step=e.shiftKey?10:1,arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(arrows[e.key]&&!e.altKey){e.preventDefault();if(!it){toast('Scegli prima un oggetto: PgSu e PgGiù, oppure i livelli');return}const [ax,ay]=arrows[e.key];
  if(e.ctrlKey||e.metaKey){if(it.kind==='text'){editD('Dimensione del testo',()=>{it.size=Math.max(1,it.size+(ax||-ay)*step);measureText(it)},{merge:true});announce(`Dimensione ${it.size} pixel`)}else{editD('Ridimensiona',()=>{it.w=it.kind==='line'?it.w+ax*step:Math.max(1,it.w+ax*step);it.h=it.kind==='line'?it.h+ay*step:Math.max(1,it.h+ay*step)},{merge:true});announce(`${fmtInt(Math.abs(it.w))} per ${fmtInt(Math.abs(it.h))}`)}}
  else{editD('Sposta',()=>{it.x+=ax*step;it.y+=ay*step},{merge:true});const b=box(it);announce(`x ${fmtInt(b.x)}, y ${fmtInt(b.y)}`)}return}
 if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();selectStep(e.key==='PageUp'?1:-1);return}
 if(e.key==='Escape'&&Dw.sel){e.preventDefault();selectItem(null);return}
 if(e.key==='Enter'){e.preventDefault();focusables($('propBody'))[0]?.focus();return}
 if(e.key==='+'||e.key==='-'||e.key==='0'){e.preventDefault();runCommand(e.key==='+'?'zoomIn':e.key==='-'?'zoomOut':'zoomFit');return}
 if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();const r=sheetWrap.getBoundingClientRect();itemMenu(r.left+20,r.top+20)}});
sheetWrap.addEventListener('contextmenu',e=>{e.preventDefault();itemMenu(e.clientX,e.clientY)});
// Livelli: la scelta segue le frecce; Alt+Maiusc+frecce sposta l'oggetto sopra o sotto gli altri.
$('layList').addEventListener('keydown',e=>{const items=[...Dw.p.items].reverse(),i=items.findIndex(x=>x.id===Dw.sel);if(!items.length)return;
 if(e.altKey&&e.shiftKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();runCommand(e.key==='ArrowUp'?'forward':'backward');return}
 let j=null;if(e.key==='ArrowDown')j=Math.min(items.length-1,i+1);else if(e.key==='ArrowUp')j=Math.max(0,i<0?0:i-1);else if(e.key==='Home')j=0;else if(e.key==='End')j=items.length-1;if(j!==null){e.preventDefault();selectItem(items[j].id);return}
 if(e.key==='Enter'){e.preventDefault();if(!Dw.sel&&items[0])selectItem(items[0].id,{say:false});focusables($('propBody'))[0]?.focus();return}
 if(e.key==='F2'){e.preventDefault();$('pr-name')?.focus();$('pr-name')?.select();return}
 if((e.key==='Delete'||e.key==='Backspace')&&Dw.sel){e.preventDefault();runCommand('deleteItem');return}
 if(e.key==='Escape'&&Dw.sel){e.preventDefault();selectItem(null);return}
 if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();const r=$('lay-'+Dw.sel)?.getBoundingClientRect()||$('layList').getBoundingClientRect();itemMenu(r.left+20,r.bottom)}});
$('layList').addEventListener('click',e=>{const o=e.target.closest('[data-id]');if(o)selectItem(o.dataset.id,{say:false});$('layList').focus()});
// Pannello delle proprietà: colori, cursori e testo cambiano il foglio mentre si modificano, i numeri quando si confermano.
$('propBody').addEventListener('input',e=>{const el=e.target,key=el.dataset.prop;if(!key||!(el.type==='range'||el.type==='color'||key==='text'))return;try{applyProp(key,el)}catch(err){return}
 if(el.type==='range'){const t=el.closest('.adj'),f=key.startsWith('adj.')?ADJ_BY[key.slice(4)].fmt:v=>fmtInt(v)+'%',txt=f(Number(el.value));el.setAttribute('aria-valuetext',txt);t.querySelector('output').textContent=txt}renderSheet();if(!selItem())renderLayers()});
$('propBody').addEventListener('change',e=>{const el=e.target,key=el.dataset.prop;if(!key)return;const it=selItem();try{applyProp(key,el)}catch(err){toast(err.message);el.value=el.defaultValue;el.focus();return}
 const label=PROP_NAME[key.replace(/^adj\./,'')]||ADJ_BY[key.slice(4)]?.label||'Proprietà';settleD(it?`${label} di ${it.name}`:label,{props:['preset','sw_','sh_','bgNone','fillNone','look','name','text','font','size','bold','italic'].includes(key)})});
$('propBody').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();(Dw.sel?$('layList'):sheetWrap).focus()}});
new ResizeObserver(()=>{if(!Dw.zoom&&state.mode==='disegno')renderSheet()}).observe(drawStage);
