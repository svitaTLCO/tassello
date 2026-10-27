// Esportazione: la ricetta si applica alla foto intera, alla dimensione scelta. Il file nuovo nasce da un canvas,
// quindi non porta con sé i dati della fotocamera né la posizione GPS dell'originale.
const FORMATS={jpeg:{label:'JPEG',mime:'image/jpeg',ext:'jpg',lossy:true},png:{label:'PNG',mime:'image/png',ext:'png'},webp:{label:'WebP',mime:'image/webp',ext:'webp',lossy:true}};
const SIZES=[['orig','Dimensione piena'],['4096','4096 pixel sul lato lungo'],['2048','2048 pixel sul lato lungo, per i social'],['2000','2000 pixel sul lato lungo'],['1080','1080 pixel sul lato lungo'],['custom','Altra misura…']];
function exportLabel(x){const f=FORMATS[x.format]||FORMATS.jpeg;return f.label+(f.lossy?`, qualità ${x.quality||90}`:'')+', '+(x.size==='orig'?'dimensione piena':x.size+' pixel sul lato lungo')}
function exportDims(size,custom){const [w,h]=outSize(I.r,I.bmp.width,I.bmp.height),long=size==='orig'?Math.max(w,h):size==='custom'?custom:Number(size),k=Math.min(1,long/Math.max(w,h));return [Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k))]}
async function exportDialog(){if(!I.bmp){toast('Apri prima una foto');return}const step=planSteps()[I.step],transp=I.r.cut?.bg==='none',[fw,fh]=outSize(I.r,I.bmp.width,I.bmp.height);let pre=step?.export||{format:prefs.exportFormat,quality:prefs.exportQuality,size:prefs.exportSize};if(transp&&pre.format==='jpeg')pre={...pre,format:'png'};
 const r=await modal('Esporta la foto',`<p>La foto ha ${fmtInt(fw)} × ${fmtInt(fh)} pixel con l’inquadratura scelta. L’originale resta com’è; il file nuovo non contiene i dati della fotocamera né la posizione.${transp?' Lo sfondo è trasparente: PNG e WebP conservano la trasparenza, il JPEG la riempie di bianco.':''}</p>`,[
  {id:'name',label:'Nome del file',value:I.title.trim()||baseName(I.name)},
  {id:'format',label:'Formato',type:'select',value:pre.format,options:Object.entries(FORMATS).map(([k,f])=>[k,f.label+(k==='jpeg'?', per le foto':k==='png'?', senza perdita di qualità':', più leggero')])},
  {id:'quality',label:'Qualità (JPEG e WebP)',type:'range',min:50,max:100,step:1,value:pre.quality||90,fmt:v=>v+(v>=90?', alta':v>=75?', buona':', file leggero'),hint:'Più bassa, più leggero il file. Sotto 75 si possono vedere difetti.'},
  {id:'size',label:'Dimensione',type:'select',value:SIZES.some(s=>s[0]===String(pre.size))?String(pre.size):'orig',options:SIZES},
  {id:'custom',label:'Lato lungo in pixel (per Altra misura)',type:'number',value:Math.max(fw,fh),hint:'Si può solo rimpicciolire: la foto non viene ingrandita.'}],'Esporta',{validate:v=>{if(v.size!=='custom')return null;const n=num(v.custom);return n>=16&&n<=30000?null:{msg:'Scrivi un numero di pixel tra 16 e 30.000',field:'custom'}}});
 if(!r)return;Object.assign(prefs,{exportFormat:r.format,exportQuality:Number(r.quality),exportSize:r.size});savePrefs();const f=FORMATS[r.format],[w,h]=exportDims(r.size,Math.round(num(r.custom)));
 const blob=await work('Esportazione',()=>renderFull(w,h,f.mime,Number(r.quality)/100));if(!blob)return;
 if(blob.type!==f.mime){toast(`Il browser non sa scrivere ${f.label}: niente è stato salvato`);return}
 download(blob,extName(r.name||I.name,f.ext),f.mime);toast(`Esportata in ${f.label}, ${fmtInt(w)} × ${fmtInt(h)} pixel, ${fmtBytes(blob.size)}`)}
async function renderFull(w,h,mime,quality){const cv=new OffscreenCanvas(w,h),ctx=cv.getContext('2d',{willReadFrequently:true});drawGeometry(ctx,I.bmp,I.r,w,h);const src=ctx.getImageData(0,0,w,h),mc=prepareMasks(I.r,maskCtx(I.r,w,h,src));ctx.putImageData(develop(src,src,I.r,lutOf(I.r.look),mc),0,0);
 // Il JPEG non ha trasparenza: le parti trasparenti (anche quelle dello scontorno) diventano bianche invece che nere.
 if(mime==='image/jpeg'){ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)}
 return cv.convertToBlob({type:mime,quality})}
// Inquadratura: rotazioni, riflessione, formato e raddrizzamento.
function rotate(deg){edit(deg>0?'Ruota a destra':'Ruota a sinistra',r=>{r.rot=(r.rot+deg+360)%360},{panel:true})&&announce(`Ruotata: ${I.r.rot?I.r.rot+' gradi rispetto all’originale':'come l’originale'}`)}
function flipH(){edit('Rifletti',r=>{r.flip=!r.flip})}
function setRatio(id){edit('Formato '+ratioName(id),r=>{r.ratio=id;r.cx=r.cy=.5},{panel:true})&&announce('Formato '+ratioName(id))}
function ratioMenu(){if(!I.bmp){toast('Apri prima una foto');return}const a=menuAnchor('ratioMenu');openMenu(RATIOS.map(([id,label])=>({label,checked:id===I.r.ratio,run:()=>setRatio(id)})),a.x,a.y,'Formato',a.el)}
function resetGeometry(){edit('Inquadratura originale',r=>{Object.assign(r,{rot:0,flip:false,angle:0,ratio:'orig',cx:.5,cy:.5})},{panel:true})&&announce('Inquadratura come l’originale')}
// Finestra con un cursore che cambia la foto mentre si sposta; Annulla rimette il valore di prima.
async function liveRange(title,id){if(!I.bmp){toast('Apri prima una foto');return}const c=ctlDef(id),before=c.get(I.r);
 const res=await modal(title,`<p>${esc(c.hint)}</p>`,[{id:'v',label:c.label,type:'range',min:c.min,max:c.max,step:c.step,value:before,fmt:c.fmt}],'Applica',{onOpen:pane=>pane.querySelector('#dlg_v').addEventListener('input',e=>{c.set(I.r,Number(e.target.value));requestRender(true)})});
 if(!res){c.set(I.r,before);requestRender();return}c.set(I.r,Number(res.v));settle(c.label)}
// Look: pronti o importati da un file .cube, con la loro intensità.
function setLook(id){edit(id==='none'?'Togli il look':'Look '+lookName(id),r=>{r.look=id;if(id!=='none'&&!r.lookAmt)r.lookAmt=100},{panel:true})&&announce(id==='none'?'Nessun look':'Look '+lookName(id))}
function lookMenu(){if(!I.bmp){toast('Apri prima una foto');return}const a=menuAnchor('lookMenu');openMenu([...lookList().map(([id,label])=>({label,checked:id===I.r.look,run:()=>setLook(id)})),'-',{label:C.lutImport.label,icon:'cube',run:()=>$('lutInput').click()}],a.x,a.y,'Look',a.el)}
async function importLut(file){let lut;try{lut=parseCube(await file.text(),file.name)}catch(e){toast(e.message);return}const id='lut-'+uid();I.luts[id]=lut;schedulePersist('immagini');if(I.bmp)setLook(id);else{renderPanel();toast(`Look «${lut.name}» importato`)}}
// Copia e incolla delle regolazioni: si sceglie che cosa copiare; gli appunti restano nelle preferenze del browser,
// così valgono anche per la foto che si apre dopo. Maschere, scontorno e ritocchi sono in unità della foto e su
// un'altra foto si mettono in proporzione; lo scontorno si ricalcola sulla foto nuova.
const CLIP_PARTS=[['light','Luce e colore',true,'luce e colore'],['fx','Curve, colori per tinta, bianco e nero, dettaglio',true,'curve, colori per tinta e dettaglio'],['look','Look',true,'look'],['masks','Maschere con le loro regolazioni',true,'maschere'],['geo','Inquadratura: rotazione, formato e raddrizzamento',false,'inquadratura'],['cut','Sfondo tolto, da ricalcolare sulla foto nuova',false,'scontorno'],['heal','Ritocchi',false,'ritocchi']];
const GEO_KEYS=['rot','flip','angle','ratio','cx','cy'];
async function adjCopy(){if(!I.bmp){toast('Apri prima una foto');return}const v=await modal('Copia le regolazioni','<p>Scegli che cosa copiare: con Incolla le regolazioni le metti su un’altra foto, anche dopo averla aperta.</p>',CLIP_PARTS.filter(([id])=>id!=='cut'||I.r.cut).map(([id,label,on])=>({id,label,type:'checkbox',value:on})),'Copia');if(!v)return;
 const r=JSON.parse(snap()),c={};if(v.light)c.adj=r.adj;if(v.fx)c.fx=r.fx;if(v.look){c.look=r.look;c.lookAmt=r.lookAmt}if(v.masks)c.masks=r.masks;if(v.geo)for(const k of GEO_KEYS)c[k]=r[k];if(v.cut&&r.cut)c.cut=r.cut;if(v.heal)c.heal=r.heal;
 const parts=CLIP_PARTS.filter(([id])=>v[id]).map(x=>x[3]);if(!parts.length){toast('Non hai scelto niente da copiare');return}prefs.adjClip={from:I.name,parts,r:c};savePrefs();announce('Copiate le regolazioni: '+parts.join('; '))}
function adjPaste(){const c=prefs.adjClip;if(!c){toast('Non ci sono regolazioni copiate: usa prima Copia le regolazioni');return}if(!I.bmp){toast('Apri prima una foto');return}const x=structuredClone(c.r);
 if(!edit('Incolla le regolazioni',r=>{if(x.adj)r.adj={...r.adj,...x.adj};if(x.fx){const f=newFx();r.fx={...f,...x.fx,curves:{...f.curves,...x.fx.curves}}}if('look' in x){r.look=lookList().some(l=>l[0]===x.look)?x.look:'none';r.lookAmt=x.lookAmt}
  if(x.masks)r.masks=x.masks.map(m=>({...m,id:uid(),adj:{...zeroAdj(),...m.adj}}));for(const k of GEO_KEYS)if(k in x)r[k]=x[k];if(x.cut)r.cut={...newCut(),...x.cut,raster:uid()};if(x.heal)r.heal=x.heal},{panel:true})){toast('Le regolazioni copiate sono già quelle della foto');return}
 I.maskSel=null;if(x.cut)cutRestore();announce(`Incollate le regolazioni di «${c.from}»: ${c.parts.join('; ')}.${x.cut?' Lo scontorno si sta ricalcolando.':''}`)}
// Descrizione a voce della foto: dimensioni, inquadratura, luce e modifiche.
function readPhotoStatus(){if(!I.bmp){toast('Nessuna foto aperta: Ctrl+O per aprirne una');return}const [w,h]=outSize(I.r,I.bmp.width,I.bmp.height),r=I.r,ch=changedAdj(r).map(([id,label,,,,,fmt])=>label+' '+fmt(r.adj[id])),geo=[];
 if(r.ratio!=='orig')geo.push('formato '+ratioName(r.ratio));if(r.rot)geo.push('ruotata di '+r.rot+' gradi');if(r.flip)geo.push('riflessa');if(r.angle)geo.push('raddrizzata di '+fmtNum(r.angle,1)+' gradi');
 const plan=planOf();toast(`«${I.name}», ${fmtInt(w)} per ${fmtInt(h)} pixel${geo.length?', '+geo.join(', '):''}${I.compare?'. Stai guardando l’originale':''}. ${I.stats?histSentence(I.stats):''} ${ch.length?'Regolazioni: '+ch.join(', ')+'.':'Nessuna regolazione.'}${fxSummary().length?' '+fxSummary().join(', ').replace(/^./,x=>x.toUpperCase())+'.':''}${r.look!=='none'?` Look ${lookName(r.look)} al ${fmtInt(r.lookAmt)}%.`:''}${plan.steps?` Piano ${plan.name}, passo ${I.step+1} di ${plan.steps.length}: ${plan.steps[I.step].title}.`:''}${I.r.masks.length?` Maschere: ${I.r.masks.map(m=>`${m.name}${m.off?' (nascosta)':''}${maskAdjList(m).length?', '+maskAdjList(m).join(', '):', senza regolazioni'}`).join('; ')}.`:''}${I.r.heal.length?' '+retouchSay():''}${I.r.sel?' '+selSummary():''}`)}
function toggleCompare(){if(!I.bmp){toast('Apri prima una foto');return}I.compare=!I.compare;$('compareBadge').hidden=!I.compare;requestRender()}
async function resetAll(){if(!I.bmp||!hasEdits()){toast('La foto è già com’era');return}edit('Ripristina tutto',r=>{Object.assign(r,newRecipe())},{panel:true});announce('Foto ripristinata com’era: Ctrl+Z per tornare indietro')}
function photoMenu(x,y){const items=[mi('auto',applyAuto),mi('compare'),'-',mi('rotateLeft'),mi('rotateRight'),mi('ratioMenu'),mi('lookMenu'),'-',mi('readStatus'),mi('export')];openMenu(items,x,y,'Menu della foto')}
