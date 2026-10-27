// Regolazioni locali: la ricetta ha un elenco di maschere, ognuna con le sue regolazioni (quelle della foto, meno la
// vignettatura), un'intensità e la scelta di invertirla o nasconderla. Si creano dalla selezione, con il pennello o come
// sfumature lineari e radiali, e si applicano dopo le regolazioni di tutta la foto, una sull'altra, nell'ordine dell'elenco.
const LOCAL_ADJ=ADJ.filter(a=>a[0]!=='vignette');
const MASK_KINDS={sel:'Selezione',brush:'Pennello',linear:'Sfumatura lineare',radial:'Sfumatura radiale'};
const zeroAdj=()=>Object.fromEntries(LOCAL_ADJ.map(a=>[a[0],0]));
LAYERS.group=(op,mc)=>rasterOps(op.ops,mc);
// La maschera scelta nel pannello: non fa parte della ricetta, quindi sceglierla non entra nella cronologia.
I.maskSel=null;
const maskIn=(r=I.r)=>r.masks?.find(m=>m.id===I.maskSel)||null;
function activeMask(){let m=maskIn();if(!m&&I.r.masks?.length){m=I.r.masks.at(-1);I.maskSel=m.id}if(!m)I.maskSel=null;return m}
const maskAdjList=m=>LOCAL_ADJ.filter(a=>m.adj[a[0]]).map(([id,label,,,,,fmt])=>label+' '+fmt(m.adj[id]));
const maskKind=m=>(MASK_KINDS[m.kind]||'Maschera').toLowerCase();
function maskPreview(m){if(!lastMc||!m.ops.length)return null;const k=maskOf(m.ops,lastMc);return m.inv?k.map(v=>255-v):k}
function maskSummary(m=activeMask()){if(!m)return 'Nessuna maschera.';const k=maskPreview(m),adj=maskAdjList(m);
 return `Maschera «${m.name}», ${maskKind(m)}${m.inv?', invertita':''}${m.off?', nascosta':''}. ${k?describeMask(k,lastMc.w,lastMc.h,null,'La maschera',true):'La maschera è ancora vuota.'} ${adj.length?'Regolazioni: '+adj.join(', ')+'.':'Nessuna regolazione: sposta i cursori della maschera.'}${m.amt!==100?` Intensità ${fmtInt(m.amt)}%.`:''}`}
function newMask(kind,ops,label){if(!I.bmp){toast('Apri prima una foto');return null}const n=1+(I.r.masks||[]).filter(m=>m.kind===kind).length,m={id:uid(),name:`${MASK_KINDS[kind]} ${n}`,kind,ops,adj:zeroAdj(),amt:100,inv:false,off:false},prev=I.maskSel;
 I.maskSel=m.id;if(!edit(label||'Nuova maschera: '+m.name,r=>{r.masks=[...(r.masks||[]),m]},{panel:true})){I.maskSel=prev;return null}drawAnts();drawOver();return m}
function maskEdit(label,fn){const m=activeMask();if(!m){toast('Non c’è una maschera: creane una dalla selezione, con il pennello o con una sfumatura');return false}return edit(label,r=>fn(maskIn(r)),{panel:true})}
const afterMaskEdit=say=>{drawAnts();drawOver();if(say)announce(say)};
// Strumenti delle maschere: pennello (aggiunge o toglie), sfumatura lineare (da dove l'effetto è pieno a dove finisce)
// e radiale (dal centro all'angolo del riquadro dell'ellisse).
Object.assign(PHOTO_TOOLS,{
 mbrush:{label:'Pennello della maschera',kind:'paint',modes:[['add','Aggiungi'],['sub','Togli']],color:'#2d8cff',keys:'Dipingi dove la maschera deve agire; con Togli si cancella. Da tastiera: Spazio abbassa o alza il pennello e con il pennello giù le frecce dipingono; Invio lascia un’impronta. Parentesi quadre cambiano la dimensione, con Maiusc la durezza.',
  done:(p,mode)=>{maskEdit(mode==='sub'?'Pennello della maschera: togli':'Pennello della maschera',m=>{m.ops=[...m.ops,{...brushOp(p),mode:mode==='sub'?'sub':'add'}]})&&afterMaskEdit(maskSummary())}},
 linear:{label:'Sfumatura lineare',kind:'two',first:'Inizio, dove l’effetto è pieno',second:'dove l’effetto finisce',keys:'Trascina da dove l’effetto è pieno a dove finisce. Da tastiera: Invio dove l’effetto è pieno, poi Invio dove finisce.',
  drawTwo:(c,a,b,line,dpr)=>{line(()=>{c.moveTo(...a);c.lineTo(...b)});for(const p of [a,b]){c.beginPath();c.arc(p[0],p[1],4*dpr,0,7);c.fillStyle='#fff';c.fill();c.strokeStyle='#000';c.lineWidth=dpr;c.stroke()}},two:(a,b)=>gradientDone('linear',a,b)},
 radial:{label:'Sfumatura radiale',kind:'two',first:'Centro',second:'sull’angolo del riquadro dell’ellisse',keys:'Trascina dal centro verso l’esterno. Da tastiera: Invio sul centro, poi Invio sull’angolo del riquadro dell’ellisse.',
  drawTwo:(c,a,b,line)=>line(()=>c.ellipse(a[0],a[1],Math.max(1,Math.abs(b[0]-a[0])),Math.max(1,Math.abs(b[1]-a[1])),0,0,Math.PI*2)),two:(a,b)=>gradientDone('radial',a,b)}});
function gradientDone(kind,a,b){let op;if(kind==='linear'){const [x1,y1]=uvUnits(a),[x2,y2]=uvUnits(b);op={t:'linear',x1,y1,x2,y2}}
 else{const [fw,fh]=outSize(I.r,I.bmp.width,I.bmp.height);let du=Math.abs(b[0]-a[0]),dv=Math.abs(b[1]-a[1]);if(du*fw<4)du=dv*fh/fw;if(dv*fh<4)dv=du*fw/fh;const e=ellipseOp([a[0]-du,a[1]-dv],[a[0]+du,a[1]+dv]);op={t:'radial',cx:e.cx,cy:e.cy,rx:e.rx,ry:e.ry,a:e.a,f:.5}}
 const m=maskIn(),redraw=T.redraw&&m?.kind===kind;T.redraw=false;endTool(false);
 if(redraw){maskEdit('Ridisegna '+m.name,x=>{x.ops=[{...op,f:x.ops[0]?.f??op.f}]});afterMaskEdit(`${m.name} ridisegnata. `+maskSummary())}
 else{const n=newMask(kind,[op]);if(n)afterMaskEdit(`${n.name} creata: ${kind==='linear'?'l’effetto è pieno dal primo punto e finisce al secondo':'l’effetto è pieno al centro e sfuma verso il bordo'}. Sposta i cursori della maschera nel riquadro Regolazioni.`)}}
// Comandi delle maschere.
function maskFromSel(){if(!needPhotoSel())return;const m=newMask('sel',structuredClone(I.r.sel.ops));if(m)afterMaskEdit(`${m.name} creata dalla selezione. Sposta i cursori della maschera nel riquadro Regolazioni.`)}
function maskBrushNew(){const m=newMask('brush',[]);if(m){setPhotoTool('mbrush');T.mode='add';renderToolOpts();announce(`${m.name} creata, ancora vuota: dipingi dove deve agire. ${PHOTO_TOOLS.mbrush.keys}`)}}
function maskGradient(kind){if(!I.bmp){toast('Apri prima una foto');return}T.redraw=false;setPhotoTool(kind)}
function maskRedraw(){const m=activeMask();if(!m||!(m.kind==='linear'||m.kind==='radial')){toast('Scegli prima una sfumatura lineare o radiale');return}setPhotoTool(m.kind);T.redraw=true;announce(`Ridisegna ${m.name}. ${PHOTO_TOOLS[m.kind].keys}`)}
function maskPaint(){if(!activeMask()){toast('Non c’è una maschera: creane una dalla selezione o con il pennello');return}if(T.tool==='mbrush'){endTool();return}setPhotoTool('mbrush');if(!['add','sub'].includes(T.mode)){T.mode='add';renderToolOpts()}}
function maskWithSel(mode){if(!needPhotoSel())return;maskEdit(mode==='sub'?'Togli la selezione dalla maschera':'Aggiungi la selezione alla maschera',m=>{m.ops=[...m.ops,{t:'group',ops:structuredClone(I.r.sel.ops),mode}]})&&afterMaskEdit(maskSummary())}
function maskToggle(key,on,off){maskEdit(activeMask()?.[key]?off:on,m=>{m[key]=!m[key]})&&afterMaskEdit(maskSummary())}
async function maskRename(){const m=activeMask();if(!m){toast('Non c’è una maschera');return}const v=await modal('Rinomina la maschera','',[{id:'name',label:'Nome',value:m.name}],'Rinomina',{validate:x=>x.name.trim()?null:{msg:'Scrivi un nome',field:'name'}});if(v)maskEdit('Rinomina la maschera',x=>{x.name=v.name.trim().slice(0,60)})&&announce('Maschera rinominata «'+v.name.trim()+'»')}
function maskDelete(){const m=activeMask();if(!m){toast('Non c’è una maschera');return}edit('Elimina '+m.name,r=>{r.masks=r.masks.filter(x=>x.id!==m.id)},{panel:true});I.maskSel=null;activeMask();renderPanel();afterMaskEdit(`${m.name} eliminata: Ctrl+Z per riaverla.`)}
function maskNext(dir){const l=I.r.masks||[];if(!l.length){toast('Non ci sono maschere');return}const i=l.indexOf(activeMask()),m=l[(i+dir+l.length)%l.length];I.maskSel=m.id;renderPanel();afterMaskEdit(maskSummary(m))}
function maskOverlayToggle(){prefs.maskOverlay=!prefs.maskOverlay;savePrefs();drawAnts()}
// Cursori della maschera scelta, con gli stessi gestori delle regolazioni di tutta la foto (ctlDef in 06c).
const CTL_EXT=[];
function extraCtl(id){for(const f of CTL_EXT){const c=f(id);if(c)return c}return null}
CTL_EXT.push(id=>{if(!id.startsWith('m:'))return null;const k=id.slice(2);
 if(k==='amt')return {label:'Intensità della maschera',min:0,max:100,step:1,get:r=>maskIn(r)?.amt??100,set:(r,v)=>{const x=maskIn(r);if(x)x.amt=v},fmt:v=>fmtInt(v)+'%',hint:'Quanto la maschera applica le sue regolazioni: a 0% è come se non ci fosse.',zero:100};
 if(k==='f')return {label:'Sfumatura del bordo',min:0,max:100,step:1,get:r=>Math.round((maskIn(r)?.ops[0]?.f??.5)*100),set:(r,v)=>{const o=maskIn(r)?.ops[0];if(o)o.f=v/100},fmt:v=>fmtInt(v)+'%',hint:'Quanta parte dell’ellisse passa gradualmente dall’effetto pieno a nessun effetto.',zero:50};
 const a=ADJ_BY[k];return a?{...a,hint:a.hint.replace('tutta la foto','la zona della maschera').replace('la foto è in','la zona è in'),get:r=>maskIn(r)?.adj[k]??0,set:(r,v)=>{const x=maskIn(r);if(x)x.adj[k]=v}}:null});
// Gruppo Maschere nel pannello: come crearne una, l'elenco, poi i comandi e i cursori della maschera scelta.
PANEL_HTML.masks=()=>{const list=I.r.masks||[],a=activeMask(),off=I.bmp?'':' disabled';
 let h=`<div class="insp-actions" role="group" aria-label="Nuova maschera">${['maskFromSel','maskBrush','maskLinear','maskRadial'].map(id=>cmdButton(id)).join('')}</div>`;
 if(!list.length)return h+'<p class="sel-desc">Nessuna maschera. Una maschera applica regolazioni sue solo a una parte della foto: il cielo, un volto, lo sfondo.</p>';
 h+=`<div class="mask-list" role="group" aria-label="Maschere, la scelta è premuta">${list.map(m=>{const n=maskAdjList(m).length;return `<button type="button" class="mask-item" id="mask-${m.id}" data-mask="${m.id}" aria-pressed="${m===a}"${off}><span class="n">${esc(m.name)}</span><span class="d">${esc(MASK_KINDS[m.kind]||'Maschera')}${m.inv?' · invertita':''}${m.off?' · nascosta':''} · ${n===1?'una regolazione':n?n+' regolazioni':'nessuna regolazione'}</span></button>`}).join('')}</div>`;
 const acts=['maskPaint',...(a.kind==='linear'||a.kind==='radial'?['maskRedraw']:[]),'maskAddSel','maskSubSel','maskInvert','maskHide','maskOverlay','maskRename','maskDelete','maskDescribe'];
 return h+`<div role="group" aria-label="Maschera «${esc(a.name)}»"><h4 class="mask-head">${esc(a.name)}</h4><div class="insp-actions">${acts.map(id=>cmdButton(id)).join('')}</div>${['m:amt',...(a.kind==='radial'?['m:f']:[]),...LOCAL_ADJ.map(x=>'m:'+x[0])].map(id=>rangeHtml(id,false)).join('')}</div>`};
$('adjBody').addEventListener('click',e=>{const b=e.target.closest('[data-mask]');if(!b||!I.bmp)return;I.maskSel=b.dataset.mask;renderPanel();afterMaskEdit(maskSummary())});
// Sopra la foto: con la maschera scelta in rosso (se richiesto) e, per le sfumature, le linee e le maniglie da trascinare.
function gradientHandles(m){const o=m.ops[0];if(!o)return [];if(m.kind==='linear')return [['a',o.x1,o.y1],['b',o.x2,o.y2]];if(m.kind!=='radial')return [];const ca=Math.cos(o.a||0),sa=Math.sin(o.a||0);return [['c',o.cx,o.cy],['u',o.cx+o.rx*ca,o.cy+o.rx*sa],['v',o.cx-o.ry*sa,o.cy+o.ry*ca]]}
overGuides.push((c,P,line,W,H,dpr)=>{const m=I.bmp&&!T.tool&&activeMask();if(!m||m.off)return;const hs=gradientHandles(m).map(([k,x,y])=>[k,...P(viewAt(x,y))]);if(!hs.length)return;
 if(m.kind==='linear'){const [,ax,ay]=hs[0],[,bx,by]=hs[1],dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy)||1,nx=-dy/l*(W+H),ny=dx/l*(W+H);for(const [x,y,dash] of [[ax,ay,false],[bx,by,false],[(ax+bx)/2,(ay+by)/2,true]])line(()=>{c.moveTo(x-nx,y-ny);c.lineTo(x+nx,y+ny)},dash)}
 else{const [,cx,cy]=hs[0],[,ux,uy]=hs[1],[,vx,vy]=hs[2],ru=Math.hypot(ux-cx,uy-cy),rv=Math.hypot(vx-cx,vy-cy),an=Math.atan2(uy-cy,ux-cx),f=1-(m.ops[0].f??.5);line(()=>c.ellipse(cx,cy,Math.max(1,ru),Math.max(1,rv),an,0,Math.PI*2),false);if(f>.02)line(()=>c.ellipse(cx,cy,Math.max(1,ru*f),Math.max(1,rv*f),an,0,Math.PI*2))}
 for(const [,x,y] of hs){c.beginPath();c.arc(x,y,5*dpr,0,7);c.fillStyle='#fff';c.fill();c.strokeStyle='#000';c.lineWidth=1.5*dpr;c.stroke()}});
let gradDrag=null;
photoCv.addEventListener('pointerdown',e=>{const m=!T.tool&&e.button===0&&I.bmp&&activeMask();if(!m||m.off)return;const r=photoCv.getBoundingClientRect(),p=[e.clientX,e.clientY];
 const hit=gradientHandles(m).find(([,x,y])=>{const [u,v]=viewAt(x,y);return Math.hypot(r.left+u*r.width-p[0],r.top+v*r.height-p[1])<10});if(!hit)return;e.preventDefault();photoCv.setPointerCapture(e.pointerId);gradDrag={k:hit[0],from:snap()}});
photoCv.addEventListener('pointermove',e=>{if(!gradDrag)return;const m=maskIn(),o=m?.ops[0];if(!o)return;const [x,y]=uvUnits(eventUV(e));
 if(gradDrag.k==='a'){o.x1=x;o.y1=y}else if(gradDrag.k==='b'){o.x2=x;o.y2=y}else if(gradDrag.k==='c'){o.cx=x;o.cy=y}else if(gradDrag.k==='u'){o.rx=U5(Math.hypot(x-o.cx,y-o.cy));o.a=U5(Math.atan2(y-o.cy,x-o.cx))}else o.ry=U5(Math.hypot(x-o.cx,y-o.cy));requestRender(true);drawOver()});
photoCv.addEventListener('pointerup',()=>{if(!gradDrag)return;gradDrag=null;if(settle('Sposta '+(activeMask()?.name||'la sfumatura')))afterMaskEdit(maskSummary())});
Object.assign(PHOTO_TOOL_ACTIONS,{maskFromSel,maskBrush:maskBrushNew,maskLinear:()=>maskGradient('linear'),maskRadial:()=>maskGradient('radial'),maskRedraw,maskPaint,
 maskAddSel:()=>maskWithSel('add'),maskSubSel:()=>maskWithSel('sub'),maskInvert:()=>maskToggle('inv','Inverti la maschera','Maschera non invertita'),maskHide:()=>maskToggle('off','Nascondi la maschera','Mostra la maschera'),
 maskOverlay:maskOverlayToggle,maskRename,maskDelete,maskDescribe:()=>toast(maskSummary()),maskNext:()=>maskNext(1),maskPrev:()=>maskNext(-1)});
