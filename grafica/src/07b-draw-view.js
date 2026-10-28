// Foglio: il disegno è un SVG dentro la pagina, alla scala che entra nello spazio disponibile o a quella scelta.
// Sopra c'è un secondo SVG con il riquadro dell'oggetto scelto e le maniglie per ridimensionarlo.
const sheet=$('sheet'),overlay=$('overlay'),sheetWrap=$('sheetWrap'),drawStage=$('drawStage');
const n2=v=>Math.round(v*100)/100;
function sheetScale(){if(Dw.zoom)return Dw.zoom;const pad=32;return Math.max(.02,Math.min(1,(drawStage.clientWidth-pad)/Dw.p.w,(drawStage.clientHeight-pad)/Dw.p.h))}
// Un oggetto in SVG. hit: l'oggetto si può scegliere col puntatore anche dove è trasparente; img: id per riaprire il file.
function itemSvg(it,o){const s=itemShape(it,o);return s&&styled(it,s)}
function itemShape(it,{href='',hit=false,img=false,mask=''}={}){if(it.hidden||isClipShape(it))return '';const b=box(it),cx=n2(b.x+b.w/2),cy=n2(b.y+b.h/2),tr=it.rot?` transform="rotate(${n2(it.rot)} ${cx} ${cy})"`:'',op=it.opacity<100?` opacity="${it.opacity/100}"`:'',id=hit?` data-id="${it.id}"`:'',pe=hit?' pointer-events="visible"':'';
 const paint=`fill="${fillOf(it)}"${it.rule==='evenodd'?' fill-rule="evenodd"':''}${strokeAttrs(it,['line','path','poly','arrow','bubble'].includes(it.kind))}`;
 switch(it.kind){
  case 'rect':return `<rect${id} x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"${it.radius?` rx="${it.radius}"`:''} ${paint}${tr}${op}${pe}/>`;
  case 'ellipse':return `<ellipse${id} cx="${cx}" cy="${cy}" rx="${n2(it.w/2)}" ry="${n2(it.h/2)}" ${paint}${tr}${op}${pe}/>`;
  case 'line':{const {xy,caps}=lineEnds(it);return `<g${id}${tr}${op}><line ${xy}${strokeAttrs(it,true)}/>${caps}${hit?`<line ${xy} stroke="transparent" stroke-width="${Math.max(it.sw,24)}"/>`:''}</g>`}
  case 'text':{const font=`font-family="${esc(it.font)}" font-size="${it.size}" font-weight="${it.bold?700:400}"${it.italic?' font-style="italic"':''}`;if(it.subs)return textPathSvg(it,{id,tr,op,hit,font});const lines=textLines(it),ax=n2(it.align==='center'?it.x+it.w/2:it.align==='right'?it.x+it.w:it.x),anchor=it.align==='center'?'middle':it.align==='right'?'end':'start';
   return `<g${id}${tr}${op}>${hit?`<rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" fill="transparent"/>`:''}<text x="${ax}" y="${it.y}" ${font} fill="${fillOf(it)}"${it.ls?` letter-spacing="${it.ls}"`:''} text-anchor="${anchor}" xml:space="preserve">${lines.map((l,i)=>`<tspan x="${ax}" dy="${n2(i?it.size*it.lineH:it.size*(it.lineH/2+.35))}">${esc(l)}</tspan>`).join('')}</text></g>`}
  // Un testo diventato tracciato porta il suo testo come titolo, per chi legge l'SVG con uno screen reader.
  case 'path':{const E=pathEnds(it),d=`d="${E?.d||pathD(it)}"`,t=it.alt?`<title>${esc(it.alt)}</title>`:'';
   // Nel tracciato composto di forme e linee le parti aperte hanno il contorno ma non il riempimento: restano linee.
   if(it.fill!=='none'&&it.subs.some(s=>s.closed)&&it.subs.some(s=>!s.closed)){const D=c=>pathD({x:it.x,y:it.y,subs:it.subs.filter(s=>s.closed===c)});
    return `<g${id}${tr}${op}>${t}<path d="${D(true)}" ${paint}/><path d="${D(false)}" fill="none"${strokeAttrs(it,true)}/>${hit?`<path d="${D(false)}" fill="none" stroke="transparent" stroke-width="${Math.max(it.sw,24)}" pointer-events="stroke"/>`:''}</g>`}
   if(!E&&(!hit||it.fill!=='none'))return `<path${id} ${d} ${paint}${tr}${op}${pe}${t?`>${t}</path>`:'/>'}`;
   return `<g${id}${tr}${op}>${t}<path ${d} ${paint}/>${E?.caps||''}${hit&&it.fill==='none'?`<path ${d} fill="none" stroke="transparent" stroke-width="${Math.max(it.sw,24)}" pointer-events="stroke"/>`:''}</g>`}
  case 'poly':case 'arrow':case 'bubble':return `<path${id} d="${shapeD(it)}" ${paint}${tr}${op}${pe}/>`;
  // L'immagine ritagliata sta in un gruppo con il clipPath, così la sua rotazione non gira anche la forma. mask è il PNG
  // dello scontorno trasparente, nell'SVG salvato: la trasparenza resta fuori dalla foto, che può restare in JPEG.
  case 'image':{const s=`<image${id}${img?` data-img="${it.img}"`:''} href="${esc(href)}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="none"${mask?` mask="url(#scontorno-${it.id})"`:''}${tr}${op}/>`,c=clipShape(it),
   mk=mask?`<mask id="scontorno-${it.id}" maskUnits="userSpaceOnUse" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}"><image href="${esc(mask)}" x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" preserveAspectRatio="none"/></mask>`:'';
   return c?`<g clip-path="url(#ritaglio-${it.id})"><clipPath id="ritaglio-${it.id}">${clipGeom(c)}</clipPath>${mk}${s}</g>`:mk+s}}
 return ''}
function renderSheet(){const p=Dw.p,k=sheetScale();for(const s of [sheet,overlay]){s.setAttribute('viewBox',`0 0 ${p.w} ${p.h}`);s.style.width=Math.round(p.w*k)+'px';s.style.height=Math.round(p.h*k)+'px'}
 sheet.innerHTML=(p.bg==='none'?'':`<rect width="${p.w}" height="${p.h}" fill="${esc(p.bg)}"/>`)+p.items.map(it=>itemSvg(it,{href:it.kind==='image'?imgHref(it):'',hit:true})).join('');
 sheetWrap.classList.toggle('transparent',p.bg==='none');renderOverlay();sheetWrap.setAttribute('aria-label',sheetLabel());$('drawInfo').textContent=`${fmtInt(p.w)} × ${fmtInt(p.h)} px · ${fmtInt(k*100)}%`}
const sheetLabel=()=>{const p=Dw.p,it=selItem(),n=selIds().length;return `Foglio ${fmtInt(p.w)} per ${fmtInt(p.h)} pixel, ${p.items.length===1?'un oggetto':p.items.length+' oggetti'}. ${n>1?describeSel()+'.':it?'Scelto: '+describeItem(it):'Nessun oggetto scelto.'}`};
// Sopra il foglio: guide intelligenti, riquadro di selezione, riquadri degli oggetti scelti con le maniglie e quello
// che mostra lo strumento attivo (nodi, cursore da tastiera). Con più oggetti le maniglie sono sul riquadro comune.
const HANDLES=b=>[['nw',b.x,b.y],['n',b.x+b.w/2,b.y],['ne',b.x+b.w,b.y],['e',b.x+b.w,b.y+b.h/2],['se',b.x+b.w,b.y+b.h],['s',b.x+b.w/2,b.y+b.h],['sw',b.x,b.y+b.h],['w',b.x,b.y+b.h/2]];
function renderOverlay(){const it=selItem(),k=sheetScale(),hs=n2(10/k),sw=n2(1.5/k),T=curTool(),mode=T.sel||'handles',many=selItems().filter(x=>!x.hidden),dash=` stroke-dasharray="${n2(5/k)} ${n2(3/k)}"`,handle=(x,y,h)=>`<rect class="handle h-${h}" data-h="${h}" x="${n2(x-hs/2)}" y="${n2(y-hs/2)}" width="${hs}" height="${hs}" stroke-width="${sw}"/>`;let s='';
 for(const g of Dw.guides)s+=g.x!=null?`<line class="g-smart" x1="${n2(g.x)}" y1="0" x2="${n2(g.x)}" y2="${Dw.p.h}" stroke-width="${n2(1.2/k)}"/>`:`<line class="g-smart" x1="0" y1="${n2(g.y)}" x2="${Dw.p.w}" y2="${n2(g.y)}" stroke-width="${n2(1.2/k)}"/>`;
 if(Dw.marq){const m=Dw.marq;s+=`<rect class="marq" x="${n2(m.x)}" y="${n2(m.y)}" width="${n2(m.w)}" height="${n2(m.h)}" stroke-width="${n2(1/k)}"/>`}
 if(many.length>1&&mode!=='none'){for(const x of many){const b=box(x);s+=`<rect class="sel-box" x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(Math.max(b.w,.01))}" height="${n2(Math.max(b.h,.01))}" fill="none" stroke-width="${n2((x.id===Dw.sel?2:1.2)/k)}"${x.lock?'':dash}/>`}
  const B=boxOf(many);s+=`<rect class="sel-all" x="${n2(B.x)}" y="${n2(B.y)}" width="${n2(Math.max(B.w,.01))}" height="${n2(Math.max(B.h,.01))}" fill="none" stroke-width="${n2(1/k)}" stroke-dasharray="${n2(2/k)} ${n2(3/k)}"/>`;if(mode==='handles'&&many.some(x=>!x.lock))for(const [h,x,y] of HANDLES(B))s+=handle(x,y,h)}
 else if(it&&!it.hidden&&mode!=='none'){const b=box(it),cx=b.x+b.w/2,cy=b.y+b.h/2,hd=mode==='handles'&&!it.lock;
  s+=`<g${it.rot?` transform="rotate(${it.rot} ${n2(cx)} ${n2(cy)})"`:''}><rect class="sel-box" x="${n2(b.x)}" y="${n2(b.y)}" width="${n2(Math.max(b.w,.01))}" height="${n2(Math.max(b.h,.01))}" fill="none" stroke-width="${sw}"${it.lock?'':dash}/>`;
  if(hd&&it.kind==='line')s+=handle(it.x,it.y,'p1')+handle(it.x+it.w,it.y+it.h,'p2');
  else if(hd&&!it.rot)for(const [h,x,y] of HANDLES(b))if(it.kind!=='text'||h.length===2||it.wrap&&(h==='e'||h==='w'))s+=handle(x,y,h);
  s+='</g>'}
 overlay.innerHTML=s+(T.overlay?.(k)||'')}
// Immagini regolate: si calcolano a parte (al massimo 1024 pixel per l'anteprima) e si ricordano per chiave. La ricetta
// è quella di Immagini: adj, look e lookAmt nell'oggetto, il resto (maschere, scontorno, ritocchi, inquadratura) in photo.
const procCache=new Map();
function imgRecipe(it){const z=newRecipe(),ph=it.photo||{};return {...z,...ph,adj:{...z.adj,...it.adj},look:it.look||'none',lookAmt:it.lookAmt??100,
 fx:ph.fx?{...z.fx,...ph.fx,curves:{...z.fx.curves,...ph.fx.curves}}:z.fx,masks:(ph.masks||[]).map(m=>({...m,adj:{...zeroAdj(),...m.adj}})),cut:ph.cut?{...newCut(),...ph.cut}:null}}
const hasImgEdits=it=>Object.values(it.adj||{}).some(v=>v)||(it.look||'none')!=='none'||!!it.photo;
// Come l'esportazione di Immagini: inquadratura, maschere calcolate prima dai pixel originali, poi lo sviluppo sul posto.
// Con split lo scontorno trasparente non entra nei pixel: torna a parte la sua maschera (cut), per l'SVG.
async function processImage(m,it,max,mime='image/png',split=false){m.bmp??=await createImageBitmap(m.blob,{imageOrientation:'from-image'});const B=m.bmp,r=imgRecipe(it),[fw,fh]=outSize(r,B.width,B.height),k=Math.min(1,max/Math.max(fw,fh)),w=Math.max(1,Math.round(fw*k)),h=Math.max(1,Math.round(fh*k)),cv=new OffscreenCanvas(w,h),ctx=cv.getContext('2d',{willReadFrequently:true});
 drawGeometry(ctx,B,r,w,h);const px=ctx.getImageData(0,0,w,h),mc=prepareMasks(r,maskCtx(r,w,h,px,'',B,Dw.ras)),cut=split&&r.cut?.bg==='none'&&Dw.ras.has(r.cut.raster)?mc.memo.get(JSON.stringify(cutOps(r,mc))):null;
 ctx.putImageData(develop(px,px,cut?{...r,cut:null}:r,lutOf(r.look),mc),0,0);const blob=await cv.convertToBlob({type:mime,quality:.92});return split?{blob,cut,w,h}:blob}
function imgHref(it){const m=Dw.imgs.get(it.img);if(!m)return '';if(!hasImgEdits(it)||m.type==='image/svg+xml')return m.url;const key=it.img+JSON.stringify([it.adj,it.look,it.lookAmt,it.photo]),c=procCache.get(key);if(c)return c.url||c.prev||m.url;
 const prev=[...procCache.entries()].reverse().find(([k2,v])=>k2.startsWith(it.img)&&v.url)?.[1].url;procCache.set(key,{url:null,prev});
 processImage(m,it,PREVIEW_FAST).then(blob=>{const e=procCache.get(key);if(!e)return;e.url=URL.createObjectURL(blob);if(procCache.size>40){const [k0,v0]=procCache.entries().next().value;if(v0.url)URL.revokeObjectURL(v0.url);procCache.delete(k0)}renderSheet()}).catch(e=>console.warn('Immagine non regolata',e));return prev||m.url}
// Livelli: dal più in alto al più in basso, come si vedono sul foglio.
function renderLayers(){const list=$('layList'),items=[...Dw.p.items].reverse(),sel=new Set(selIds());$('layCount').textContent=items.length?`${items.length}`:'';
 list.innerHTML=items.length?items.map(it=>{const tags=[clipShape(it)&&'ritagliata',isClipShape(it)&&'ritaglio',it.g&&'gruppo',it.lock&&'bloccato',it.hidden&&'nascosto'].filter(Boolean).join(', ');return `<div role="option" id="lay-${it.id}" class="lb-item layer-item${it.id===Dw.sel?' active':''}" data-id="${it.id}" aria-selected="${sel.has(it.id)}">${ICON(kindIcon(it))}<span class="n">${esc(it.name)}${it.kind==='text'?`<span class="sr-only">, testo «${esc(it.text.replace(/\n/g,' '))}»</span>`:it.alt?`<span class="sr-only">, testo in tracciati${altOf(it)===it.name?'':` «${esc(altOf(it))}»`}</span>`:''}</span>${tags?`<span class="t"><span class="sr-only">, </span>${tags}</span>`:''}</div>`}).join(''):'<div class="lb-empty" role="option" aria-disabled="true" aria-selected="false" id="lay-empty">Foglio vuoto: inserisci un oggetto dalla scheda Inserisci.</div>';
 list.setAttribute('aria-activedescendant',Dw.sel&&itemOf(Dw.sel)?'lay-'+Dw.sel:items.length?'lay-'+items[0].id:'lay-empty')}
// Un oggetto solo (anche dentro un gruppo, come dai livelli); nessuno con null.
function selectItem(id,{say=true}={}){Dw.sel=id&&itemOf(id)?id:null;Dw.multi={for:Dw.sel,ids:[]};selChanged({say})}
// Oggetto sopra o sotto quello scelto (dir 1 = sopra); con add si aggiunge alla scelta, insieme al suo gruppo.
function selectStep(dir,add=false){const items=Dw.p.items;if(!items.length){toast('Il foglio è vuoto');return}const i=items.findIndex(x=>x.id===Dw.sel),j=i<0?(dir>0?0:items.length-1):clamp(i+dir,0,items.length-1);
 if(!add){selectItem(items[j].id);return}const had=selIds().includes(items[j].id);setSel([...selIds(),...groupIds(items[j])],items[j].id,{say:false});announce(had?describeSel():`Aggiunto alla scelta: ${describeItem(items[j])}. ${selIds().length} oggetti scelti.`)}
// Proprietà: del foglio se non c'è un oggetto scelto, dell'oggetto altrimenti. I numeri si scrivono anche con la virgola.
const fld=(id,label,value,mode='decimal')=>`<label for="pr-${id}">${esc(label)}</label><input id="pr-${id}" data-prop="${id}" type="text" inputmode="${mode}" autocomplete="off" spellcheck="false" value="${esc(value)}">`;
const colorFld=(id,label,value,none)=>`<label for="pr-${id}">${esc(label)}</label><input id="pr-${id}" data-prop="${id}" type="color" value="${esc(value==='none'?'#ffffff':value)}"${value==='none'?' disabled':''}>${none?`<label class="check"><input type="checkbox" data-prop="${id}None"${value==='none'?' checked':''}> ${esc(none)}</label>`:''}`;
const rangeFld=(id,label,min,max,step,value,fmt)=>`<div class="adj"><label for="pr-${id}">${esc(label)}</label><output id="pr-${id}-o" aria-hidden="true">${esc(fmt(value))}</output><span></span><input type="range" id="pr-${id}" data-prop="${id}" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${esc(fmt(value))}"></div>`;
const selFld=(id,label,value,opts)=>`<label for="pr-${id}">${esc(label)}</label><select id="pr-${id}" data-prop="${id}">${opts.map(([v,l])=>`<option value="${esc(v)}"${String(v)===String(value)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
const IMG_ADJ=['exposure','contrast','highlights','shadows','temp','saturation'];
function renderProps(){const b=$('propBody'),it=selItem(),p=Dw.p,focusId=document.activeElement?.closest?.('#propBody')?document.activeElement.id:null;$('propTitle').textContent=it?'Proprietà di '+it.name:'Proprietà del foglio';
 const many=selItems();if(many.length>1){$('propTitle').textContent=`Proprietà di ${many.length} oggetti`;b.innerHTML=multiProps(many)}
 else if(!it)b.innerHTML=toolProps()+selFld('preset','Formato',sheetPreset(p),[['','Personalizzato'],...SHEETS.map(s=>[s[0],s[1]])])+`<div class="row2"><div>${fld('sw_','Larghezza (px)',p.w)}</div><div>${fld('sh_','Altezza (px)',p.h)}</div></div>`+colorFld('bg','Sfondo',p.bg,'Trasparente')+`<label for="pr-desc">Descrizione</label><textarea id="pr-desc" data-prop="desc" rows="4" aria-describedby="pr-desc-h">${esc(p.desc)}</textarea><small class="hint" id="pr-desc-h">Che cosa mostra il disegno, per chi non lo vede: va nel file SVG ed è il testo alternativo da usare quando lo pubblichi.</small>`;
 else{const bx=box(it);let h=fld('name','Nome',it.name,'text')+`<div class="row2"><div>${fld('x','X',bx.x)}</div><div>${fld('y','Y',bx.y)}</div></div>`;
  if(it.kind==='line')h+=`<div class="row2"><div>${fld('w','Lunghezza orizzontale',it.w)}</div><div>${fld('h','Lunghezza verticale',it.h)}</div></div>`;
  else if(it.kind!=='text')h+=`<div class="row2"><div>${fld('w','Larghezza',it.w)}</div><div>${fld('h','Altezza',it.h)}</div></div>`;
  h+=fld('rot','Rotazione (gradi)',n2(it.rot));
  if(it.kind==='text')h+=`<label for="pr-text">Testo</label><textarea id="pr-text" data-prop="text" rows="3">${esc(it.text)}</textarea>`+selFld('font','Carattere',it.font,FONTS)+fld('size','Dimensione (px)',it.size)+`<label class="check"><input type="checkbox" data-prop="bold"${it.bold?' checked':''}> Grassetto</label> <label class="check"><input type="checkbox" data-prop="italic"${it.italic?' checked':''}> Corsivo</label>`+selFld('align','Allineamento',it.align,[['left','A sinistra'],['center','Al centro'],['right','A destra']])+colorFld('fill','Colore del testo',it.fill);
  if(['rect','ellipse','poly','arrow','bubble'].includes(it.kind))h+=colorFld('fill','Riempimento',it.fill,'Nessun riempimento')+colorFld('stroke','Contorno',it.stroke)+fld('sw','Spessore del contorno (px)',it.sw)+(it.kind==='rect'?fld('radius','Angoli arrotondati (px)',it.radius):'');
  if(it.kind==='line')h+=colorFld('stroke','Colore',it.stroke)+fld('sw','Spessore (px)',it.sw);
  if(it.kind==='path')h+=pathProps(it);else h+=SHAPE_PROPS[it.kind]?.(it)||'';
  if(it.kind==='image'){const svg=Dw.imgs.get(it.img)?.type==='image/svg+xml';h+=svg?'<p class="hint">Le immagini SVG si mettono sul foglio così come sono: le regolazioni valgono per le foto.</p>':`<h3>Regolazioni della foto</h3>`+IMG_ADJ.map(id=>{const a=ADJ_BY[id];return rangeFld('adj.'+id,a.label,a.min,a.max,a.step,it.adj?.[id]||0,a.fmt)}).join('')+selFld('look','Look',it.look||'none',lookList())+((it.look||'none')!=='none'?rangeFld('lookAmt','Intensità del look',0,100,1,it.lookAmt??100,v=>fmtInt(v)+'%'):'')+imgPhotoProps(it)}
  if(it.kind==='text'&&it.subs)h+=nodeSection(it);
  h+=clipProps(it)+styleProps(it)+rangeFld('opacity','Opacità',0,100,1,it.opacity,v=>fmtInt(v)+'%')+`<label class="check"><input type="checkbox" data-prop="hidden"${it.hidden?' checked':''}> Nascosto</label>`;b.innerHTML=h}
 if(focusId&&$(focusId))$(focusId).focus()}
// Aggiorna i valori senza ricostruire il pannello, così il campo che si sta usando non perde il focus.
function syncProps(){const it=selItem(),a=document.activeElement;if(selIds().length>1){syncMulti();return}if(!it){if($('pr-sw_')&&a!==$('pr-sw_'))$('pr-sw_').value=Dw.p.w;if($('pr-sh_')&&a!==$('pr-sh_'))$('pr-sh_').value=Dw.p.h;return}if(!$('pr-name')){renderProps();return}const bx=box(it);
 for(const [k,v] of [['x',bx.x],['y',bx.y],['w',it.w],['h',it.h],['rot',n2(it.rot)],['size',it.size],['sw',it.sw],['radius',it.radius]]){const el=$('pr-'+k);if(el&&el!==a)el.value=v}
 const op=$('pr-opacity');if(op&&op!==a){op.value=it.opacity;op.setAttribute('aria-valuetext',it.opacity+'%');$('pr-opacity-o').textContent=it.opacity+'%'}if(curveOf(it))syncNodes(it)}
// Valori scritti nei campi: si controllano e diventano una modifica.
const PROP_NAME={mx:'Posizione',my:'Posizione',name:'Nome',x:'Posizione',y:'Posizione',w:'Dimensioni',h:'Dimensioni',rot:'Rotazione',text:'Testo',font:'Carattere',size:'Dimensione del testo',bold:'Grassetto',italic:'Corsivo',align:'Allineamento',fill:'Colore',fillNone:'Riempimento',stroke:'Contorno',sw:'Spessore',radius:'Angoli',opacity:'Opacità',hidden:'Nascosto',look:'Look',lookAmt:'Intensità del look',nx:'Posizione del nodo',ny:'Posizione del nodo',ntype:'Tipo di nodo',nclosed:'Tracciato chiuso',bsize:'Spessore del pennello',gtype:'Sfumatura',gangle:'Direzione della sfumatura',gstop:'Punto di colore',dash:'Tratteggio',cap:'Estremità',join:'Angoli',shadowOn:'Ombra',sx:'Ombra',sy:'Ombra',sblur:'Sfocatura dell’ombra',scolor:'Colore dell’ombra',sop:'Opacità dell’ombra',blur:'Sfocatura',blend:'Fusione',ls:'Spaziatura tra le lettere',wrap:'A capo nel riquadro',toff:'Inizio lungo la curva',start:'Inizio della linea',end:'Fine della linea',sides:'Lati',star:'Stella',inner:'Raggio interno',head:'Punta della freccia',shaft:'Corpo della freccia',double:'Due punte',tail:'Coda del fumetto',tip:'Punta della coda',tl:'Lunghezza della coda',tcolor:'Colore dello strumento',alt:'Testo per chi non vede',tsize:'Spessore dello strumento',nix:'Maniglia',niy:'Maniglia',nox:'Maniglia',noy:'Maniglia',sw_:'Larghezza del foglio',sh_:'Altezza del foglio',preset:'Formato del foglio',bg:'Sfondo',bgNone:'Sfondo',desc:'Descrizione'};
function applyProp(key,el){const p=Dw.p,it=selItem(),v=el.type==='checkbox'?el.checked:el.value,n=num(v);
 const need=(lo,hi)=>{if(!(n>=lo&&n<=hi))throw Error(`Scrivi un numero tra ${fmtInt(lo)} e ${fmtInt(hi)}`);return n};
 if(selIds().length>1){applyMulti(key,v,need);return}
 if(!it){if(key==='preset'){const s=SHEETS.find(x=>x[0]===v);if(s){p.w=s[2];p.h=s[3]}}else if(key==='sw_')p.w=Math.round(need(16,10000));else if(key==='sh_')p.h=Math.round(need(16,10000));else if(key==='bg')p.bg=v;else if(key==='bgNone')p.bg=v?'none':'#ffffff';else if(key==='desc')p.desc=v;else if(key==='tcolor')setInk('color',v);else if(key==='tsize')setInk(Dw.tool,Math.round(need(1,2000)));return}
 if(key.startsWith('adj.')){it.adj={...it.adj,[key.slice(4)]:Number(v)};return}
 if(applyStyleProp(it,key,v,need))return;
 if(/^n(x|y|type|closed|ix|iy|ox|oy)$/.test(key)){applyNodeProp(it,key,v,need);return}
 if(key==='bsize'){strokeProp(it,key,v,need);return}
 const o=it.subs&&(key==='w'||key==='h')?structuredClone(it):null;
 switch(key){case 'name':it.name=String(v).trim()||nextName(it.kind);break;
  case 'x':it.x+=Math.round(need(-1e5,1e5))-box(it).x;break;case 'y':it.y+=Math.round(need(-1e5,1e5))-box(it).y;break;
  case 'w':it.w=Math.round(need(it.kind==='line'?-1e5:1,1e5));break;case 'h':it.h=Math.round(need(it.kind==='line'?-1e5:1,1e5));break;
  case 'rot':it.rot=((need(-360,360)%360)+360)%360;break;case 'sw':it.sw=need(0,1000);break;case 'radius':it.radius=need(0,1e5);break;
  case 'size':it.size=need(1,2000);break;case 'opacity':case 'lookAmt':case 'inner':case 'head':case 'shaft':case 'tail':case 'tip':case 'tl':it[key]=Number(v);break;case 'sides':it.sides=Math.round(need(3,60));break;case 'fillNone':it.fill=v?'none':'#0e6f8a';break;
  default:it[key]=v}
 if(it.kind==='text'&&['text','font','size','bold','italic','w'].includes(key))measureText(it);if(o)fitGeometry(it,o);if(it.tool)strokeProp(it,key,v,need)}
// Strumenti del foglio: ognuno risponde al puntatore (down, move, up) e ai tasti sul foglio (key); sel dice come
// mostrare la scelta, overlay aggiunge quello che lo strumento disegna sopra il foglio. Selezione è quello di partenza.
const toSheet=e=>{const r=sheet.getBoundingClientRect(),k=sheetScale();return {x:(e.clientX-r.left)/k,y:(e.clientY-r.top)/k}};
const TOOLS={},curTool=()=>TOOLS[Dw.tool]||TOOLS.select;
let drag=null;
// Maniglie ai lati e agli angoli; Maiusc mantiene le proporzioni. Le guide intelligenti agganciano i lati che si spostano.
function resizeBy(it,d,dx,dy,shift,snap){const o=d.it0,H=d.h;
 if(it.kind==='line'){if(H==='p1'){it.x=Math.round(o.x+dx);it.y=Math.round(o.y+dy);it.w=Math.round(o.w-dx);it.h=Math.round(o.h-dy)}else{it.w=Math.round(o.w+dx);it.h=Math.round(o.h+dy)}return}
 if(it.kind==='text'&&it.wrap&&H.length===1){const w=Math.max(it.size,H==='e'?o.w+dx:o.w-dx);it.w=Math.round(w);if(H==='w')it.x=Math.round(o.x+o.w-w);measureText(it);return}
 let x=o.x,y=o.y,w=o.w,h=o.h;if(H.includes('e'))w=o.w+dx;if(H.includes('s'))h=o.h+dy;if(H.includes('w')){w=o.w-dx;x=o.x+dx}if(H.includes('n')){h=o.h-dy;y=o.y+dy}w=Math.max(1,w);h=Math.max(1,h);
 // Testi e immagini (dagli angoli) mantengono le proporzioni; le forme solo con Maiusc.
 if(it.kind==='text'||((it.kind==='image')!==shift&&H.length===2)){const k=Math.max(w/o.w,h/o.h);w=o.w*k;h=o.h*k;if(H.includes('w'))x=o.x+o.w-w;if(H.includes('n'))y=o.y+o.h-h}
 else if(snap){const tol=7/sheetScale(),g=(v,L)=>snapNear([v],L,tol);let q;if(H.includes('e')&&(q=g(x+w,d.L.X))){w+=q.d;Dw.guides.push({x:q.v,lab:q.lab})}if(H.includes('w')&&(q=g(x,d.L.X))){x+=q.d;w-=q.d;Dw.guides.push({x:q.v,lab:q.lab})}if(H.includes('s')&&(q=g(y+h,d.L.Y))){h+=q.d;Dw.guides.push({y:q.v,lab:q.lab})}if(H.includes('n')&&(q=g(y,d.L.Y))){y+=q.d;h-=q.d;Dw.guides.push({y:q.v,lab:q.lab})}}
 if(it.kind==='text'&&it.subs)it.size=Math.max(4,Math.round(o.size*h/o.h));
 else if(it.kind==='text'){it.size=Math.max(4,Math.round(o.size*h/o.h));if(it.wrap)it.w=Math.round(o.w*h/o.h);measureText(it);it.x=Math.round(H.includes('w')?o.x+o.w-it.w:o.x);it.y=Math.round(H.includes('n')?o.y+o.h-it.h:o.y);return}
 const r=Dw.guides.length?n2:Math.round;Object.assign(it,{x:r(x),y:r(y),w:Math.max(1,r(w)),h:Math.max(1,r(h))});fitGeometry(it,o)}
// Selezione: un clic sceglie l'oggetto con il suo gruppo (Alt+clic l'oggetto solo), Maiusc+clic o Ctrl+clic lo
// aggiunge o lo toglie, trascinando sul vuoto si disegna il riquadro di selezione. Alt mentre si trascina spegne le guide.
TOOLS.select={
 down(e,pt){const h=e.target.closest?.('[data-h]'),many=selItems();
  if(h&&many.length){const items=movable(many,'ridimensionarlo');if(!items.length)return false;const L=snapLines(new Set(items.map(x=>x.id)));
   drag=many.length>1?{mode:'scale',h:h.dataset.h,os:items.map(x=>[x,structuredClone(x)]),B:boxOf(items),pt0:pt,L}:{mode:'resize',h:h.dataset.h,it0:structuredClone(selItem()),pt0:pt,L};return true}
  const t=e.target.closest?.('[data-id]'),it=t&&itemOf(t.dataset.id);
  if(!it){if(Dw.sel&&!e.shiftKey)selectItem(null,{say:false});drag={mode:'box',pt0:pt,add:e.shiftKey?selIds():[]};return true}
  if(e.shiftKey||e.ctrlKey||e.metaKey){toggleSel(it.id);return false}
  if(!selIds().includes(it.id))setSel(e.altKey?[it.id]:groupIds(it),it.id,{say:false});else if(it.id!==Dw.sel)setSel(selIds(),it.id,{say:false});
  const items=selItems().filter(x=>!x.lock);if(!items.length){toast(`«${it.name}» è bloccato: sbloccalo per spostarlo`);return false}
  drag={mode:'move',os:items.map(x=>[x,x.x,x.y]),B:boxOf(items),pt0:pt,L:snapLines(new Set(items.map(x=>x.id)))};return true},
 move(e,pt){if(!drag)return;const dx=pt.x-drag.pt0.x,dy=pt.y-drag.pt0.y,snap=smartOn()&&!e.altKey;if(!drag.moved&&Math.hypot(dx,dy)*sheetScale()<3)return;drag.moved=true;Dw.guides=[];
  if(drag.mode==='box'){Dw.marq={x:Math.min(pt.x,drag.pt0.x),y:Math.min(pt.y,drag.pt0.y),w:Math.abs(dx),h:Math.abs(dy)};renderOverlay();return}
  if(drag.mode==='move'){const B=drag.B,tol=7/sheetScale();let mx=dx,my=dy,sx=null,sy=null;if(snap){sx=snapNear([B.x+dx,B.x+B.w/2+dx,B.x+B.w+dx],drag.L.X,tol);sy=snapNear([B.y+dy,B.y+B.h/2+dy,B.y+B.h+dy],drag.L.Y,tol);if(sx){mx+=sx.d;Dw.guides.push({x:sx.v,lab:sx.lab})}if(sy){my+=sy.d;Dw.guides.push({y:sy.v,lab:sy.lab})}}
   for(const [x,ox,oy] of drag.os){x.x=(sx?n2:Math.round)(ox+mx);x.y=(sy?n2:Math.round)(oy+my)}}
  else if(drag.mode==='scale')scaleDrag(drag,dx,dy,e.shiftKey,snap);else if(selItem())resizeBy(selItem(),drag,dx,dy,e.shiftKey,snap);
  renderSheet();syncProps()},
 up(){if(!drag)return;const d=drag,g=Dw.guides;drag=null;Dw.guides=[];
  if(d.mode==='box'){const m=Dw.marq;Dw.marq=null;if(m)marqueeSelect(m,d.add);else renderOverlay();return}
  if(d.moved&&settleD(d.mode==='move'?'Sposta':'Ridimensiona'))announce(describeSel()+guideSay(g));else renderOverlay()}};
sheetWrap.addEventListener('pointerdown',e=>{if(e.button!==0)return;sheetWrap.focus({preventScroll:true});if(curTool().down(e,toSheet(e)))sheetWrap.setPointerCapture(e.pointerId);e.preventDefault()});
sheetWrap.addEventListener('pointermove',e=>curTool().move?.(e,toSheet(e)));
const endDrag=e=>curTool().up?.(e);
sheetWrap.addEventListener('pointerup',endDrag);sheetWrap.addEventListener('pointercancel',endDrag);
// Tastiera sul foglio: prima i tasti dello strumento attivo, poi frecce per spostare la scelta, Ctrl+frecce per
// ridimensionare (con Maiusc di 10 pixel), Alt+Maiusc+frecce per agganciare alla guida successiva, PgSu e PgGiù per
// scegliere l'oggetto sopra o sotto (con Maiusc per aggiungerlo), Invio per le proprietà, Esc per non scegliere niente.
sheetWrap.addEventListener('keydown',e=>{if(curTool().key?.(e))return;const it=selItem(),many=selItems(),step=e.shiftKey?10:1,arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(arrows[e.key]&&e.altKey&&e.shiftKey&&!e.ctrlKey){e.preventDefault();snapStep(...arrows[e.key]);return}
 if(arrows[e.key]&&!e.altKey){e.preventDefault();if(!it){toast('Scegli prima un oggetto: PgSu e PgGiù, oppure i livelli');return}const [ax,ay]=arrows[e.key];
  if(!(e.ctrlKey||e.metaKey)){moveKeys(many,ax,ay,step);return}
  if(many.length>1){scaleKeys(many,ax,ay,step);return}if(it.lock){toast(`«${it.name}» è bloccato: sbloccalo per ridimensionarlo`);return}
  if(it.kind==='text'){editD('Dimensione del testo',()=>{it.size=Math.max(1,it.size+(ax||-ay)*step);measureText(it)},{merge:true});announce(`Dimensione ${it.size} pixel`)}else{const o=structuredClone(it);editD('Ridimensiona',()=>{it.w=it.kind==='line'?it.w+ax*step:Math.max(1,it.w+ax*step);it.h=it.kind==='line'?it.h+ay*step:Math.max(1,it.h+ay*step);fitGeometry(it,o)},{merge:true});announce(`${fmtInt(Math.abs(it.w))} per ${fmtInt(Math.abs(it.h))}`)}return}
 if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();selectStep(e.key==='PageUp'?1:-1,e.shiftKey);return}
 if(e.key==='Escape'&&Dw.sel){e.preventDefault();selectItem(null);return}
 if(e.key==='Enter'){e.preventDefault();focusables($('propBody'))[0]?.focus();return}
 if(e.key==='+'||e.key==='-'||e.key==='0'){e.preventDefault();runCommand(e.key==='+'?'zoomIn':e.key==='-'?'zoomOut':'zoomFit');return}
 if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();const r=sheetWrap.getBoundingClientRect();itemMenu(r.left+20,r.top+20)}});
sheetWrap.addEventListener('contextmenu',e=>{e.preventDefault();itemMenu(e.clientX,e.clientY)});
// Livelli: la scelta segue le frecce; Alt+Maiusc+frecce sposta l'oggetto sopra o sotto gli altri.
$('layList').addEventListener('keydown',e=>{const items=[...Dw.p.items].reverse(),i=items.findIndex(x=>x.id===Dw.sel);if(!items.length)return;
 if(e.altKey&&e.shiftKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();runCommand(e.key==='ArrowUp'?'forward':'backward');return}
 if(e.shiftKey&&!e.altKey&&(e.key==='ArrowUp'||e.key==='ArrowDown')){e.preventDefault();selectStep(e.key==='ArrowUp'?1:-1,true);return}
 let j=null;if(e.key==='ArrowDown')j=Math.min(items.length-1,i+1);else if(e.key==='ArrowUp')j=Math.max(0,i<0?0:i-1);else if(e.key==='Home')j=0;else if(e.key==='End')j=items.length-1;if(j!==null){e.preventDefault();selectItem(items[j].id);return}
 if(e.key==='Enter'){e.preventDefault();if(!Dw.sel&&items[0])selectItem(items[0].id,{say:false});focusables($('propBody'))[0]?.focus();return}
 if(e.key==='F2'){e.preventDefault();$('pr-name')?.focus();$('pr-name')?.select();return}
 if((e.key==='Delete'||e.key==='Backspace')&&Dw.sel){e.preventDefault();runCommand('deleteItem');return}
 if(e.key==='Escape'&&Dw.sel){e.preventDefault();selectItem(null);return}
 if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();const r=$('lay-'+Dw.sel)?.getBoundingClientRect()||$('layList').getBoundingClientRect();itemMenu(r.left+20,r.bottom)}});
$('layList').addEventListener('click',e=>{const o=e.target.closest('[data-id]');if(o){if(e.shiftKey||e.ctrlKey||e.metaKey)toggleSel(o.dataset.id);else selectItem(o.dataset.id,{say:false})}$('layList').focus()});
// Pannello delle proprietà: colori, cursori e testo cambiano il foglio mentre si modificano, i numeri quando si confermano.
$('propBody').addEventListener('input',e=>{const el=e.target,key=el.dataset.prop;if(!key||!(el.type==='range'||el.type==='color'||key==='text'))return;try{applyProp(key,el)}catch(err){return}
 if(el.type==='range'){const t=el.closest('.adj'),f=key.startsWith('adj.')?ADJ_BY[key.slice(4)].fmt:v=>fmtInt(v)+'%',txt=f(Number(el.value));el.setAttribute('aria-valuetext',txt);t.querySelector('output').textContent=txt}renderSheet();if(!selItem())renderLayers()});
$('propBody').addEventListener('change',e=>{const el=e.target,key=el.dataset.prop;if(!key)return;const it=selItem();try{applyProp(key,el)}catch(err){toast(err.message);el.value=el.defaultValue;el.focus();return}
 const label=PROP_NAME[key.replace(/^adj\./,'').replace(/^gstop\..*/,'gstop')]||ADJ_BY[key.slice(4)]?.label||'Proprietà',n=selIds().length;settleD(n>1?`${label} di ${n} oggetti`:it?`${label} di ${it.name}`:label,{props:['preset','sw_','sh_','bgNone','fillNone','look','name','text','font','size','bold','italic','ntype','nclosed','star','sides','gtype','shadowOn','wrap'].includes(key)})});
$('propBody').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();(Dw.sel?$('layList'):sheetWrap).focus()}});
new ResizeObserver(()=>{if(!Dw.zoom&&state.mode==='disegno')renderSheet()}).observe(drawStage);
