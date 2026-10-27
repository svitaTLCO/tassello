// Immagini dentro Disegno. Un'immagine del foglio si apre con gli strumenti di Immagini (selezioni, maschere locali,
// scontorno con Tieni e Togli, ritocco, curve, inquadratura) e torna nel foglio con la sua ricetta, che resta
// modificabile: nell'oggetto restano adj, look e lookAmt come prima, e in photo le altre parti della ricetta diverse da
// quelle di partenza. La foto aperta in Immagini si mette da parte e torna quando si rientra in Disegno. Le maschere
// calcolate (lo scontorno) stanno in Dw.ras e si salvano con la bozza e dentro l'SVG.
const PHOTO_KEYS=[...GEO_KEYS,'masks','cut','fx','heal'];
function photoFields(r){const z=newRecipe(),o={};for(const k of PHOTO_KEYS)if(JSON.stringify(r[k])!==JSON.stringify(z[k]))o[k]=structuredClone(r[k]);return o}
const photoOf=it=>it?.kind==='image'?Dw.imgs.get(it.img):null;
const isPhotoImg=it=>{const m=photoOf(it);return !!m&&m.type!=='image/svg+xml'};
function needPhotoImg(){const it=needItem();if(!it)return null;if(it.kind!=='image'){toast('Scegli prima un’immagine del foglio');return null}if(!isPhotoImg(it)){toast('Le immagini SVG si usano così come sono: maschere e scontorno valgono per le foto');return null}return it}
// Che cosa c'è nella ricetta dell'immagine, a parole.
function photoSay(it){const ph=it.photo||{},out=[],ml=ph.masks||[];if(ml.length)out.push(`${ml.length===1?'una maschera':ml.length+' maschere'} (${ml.map(m=>m.name).join(', ')})`);
 if(ph.cut)out.push('sfondo tolto, '+(ph.cut.bg==='color'?'colore pieno '+ph.cut.color:ph.cut.bg==='blur'?'foto sfocata dietro':'trasparente'));if(ph.heal?.length)out.push(ph.heal.length===1?'un ritocco':ph.heal.length+' ritocchi');
 if(GEO_KEYS.some(k=>k in ph))out.push('inquadratura cambiata');if(ph.fx)out.push('curve, colori o dettaglio');return out.join(', ')}
KIND_SAY.image=it=>{const s=photoSay(it);return s?', '+s:''};
// La modifica in Immagini. stash tiene la foto di Immagini messa da parte, con le sue maschere calcolate.
const photoLink={id:null,stash:null};
const STASH_KEYS=['file','name','title','bmp','r','base','hist','redo','step','seen','compare','plan','maskSel'];
$('stage').insertAdjacentHTML('beforebegin',`<div class="link-bar" id="linkBar" role="group" aria-labelledby="linkText" hidden><span id="linkText"></span><span class="grow"></span><button type="button" class="btn sm primary" data-action="photoBack">${ICON('draw')}Torna a Disegno</button></div>`);
async function linkStart(it,then){if(photoLink.id===it.id){setMode('immagini');then?.();return}if(photoLink.id&&!linkFinish())return;const m=photoOf(it);
 const file=m.blob instanceof File?m.blob:new File([m.blob],m.name||it.name,{type:m.type}),bmp=await work('Apertura dell’immagine',()=>decodePhoto(file));if(!bmp)return;
 endTool(false);photoLink.stash={...Object.fromEntries(STASH_KEYS.map(k=>[k,I[k]])),ras:new Map(rasters)};photoChanged();
 const r=structuredClone(imgRecipe(it)),rid=r.cut?.raster;if(rid&&Dw.ras.has(rid))rasters.set(rid,Dw.ras.get(rid));
 Object.assign(I,{file,name:m.name||it.name,title:it.name,bmp,r,hist:[],redo:[],step:0,seen:new Set(),compare:false,plan:'libera',maskSel:null});I.base=snap();photoLink.id=it.id;
 $('linkText').textContent=`Stai modificando «${it.name}», un’immagine del disegno: le modifiche restano nell’immagine e si possono cambiare ancora.`;$('linkBar').hidden=false;
 setMode('immagini',{focus:false});renderPlans();renderPhoto(false);photoCv.focus();
 if(then)then();else announce(`«${it.name}» del disegno aperta con gli strumenti di Immagini: selezioni nella scheda Seleziona, maschere nella scheda Maschere, scontorno nella scheda Sfondo. Ctrl+Alt+D o «Torna a Disegno» riportano le modifiche nel foglio.`)}
// A ogni modifica la ricetta torna nell'oggetto, senza entrare nella cronologia di Disegno: al ritorno diventa un passo
// solo. Se l'inquadratura cambia le proporzioni, l'immagine le segue con la stessa area e lo stesso centro.
function linkSync(){const it=itemOf(photoLink.id);if(!it||!I.bmp)return;const r=I.r,[fw,fh]=outSize(r,I.bmp.width,I.bmp.height),ph=photoFields(r);
 it.adj=Object.fromEntries(Object.entries(r.adj).filter(([,v])=>v));it.look=r.look;it.lookAmt=r.lookAmt;if(Object.keys(ph).length)it.photo=ph;else delete it.photo;
 if(Math.abs(it.w/it.h-fw/fh)>.002){const cx=it.x+it.w/2,cy=it.y+it.h/2,a=Math.sqrt(it.w*it.h),q=Math.sqrt(fw/fh);it.w=Math.max(1,Math.round(a*q));it.h=Math.max(1,Math.round(a/q));it.x=Math.round(cx-it.w/2);it.y=Math.round(cy-it.h/2)}
 const id=r.cut?.raster;if(id&&rasters.has(id))Dw.ras.set(id,rasters.get(id));schedulePersist('disegno')}
// Fine della modifica: la ricetta resta nell'immagine e torna la foto di Immagini. stay: si resta in Immagini.
function linkFinish({stay=false}={}){if(!photoLink.id)return true;if(cutBusy){toast('Lo scontorno è ancora in corso: aspetta che finisca');return false}const it=itemOf(photoLink.id),s=photoLink.stash;endTool(false);if(it)linkSync();
 I.bmp?.close();photoChanged();Object.assign(I,Object.fromEntries(STASH_KEYS.map(k=>[k,s[k]])));for(const [k,v] of s.ras)rasters.set(k,v);Object.assign(photoLink,{id:null,stash:null});$('linkBar').hidden=true;renderPlans();schedulePersist('immagini');
 if(it){selectItem(it.id,{say:false});const done=settleD(`Modifica di «${it.name}» con Immagini`,{props:true}),say=photoSay(it);setTimeout(()=>announce(done?`Riportate in «${it.name}» le modifiche${say?': '+say:''}.`:`«${it.name}» non è cambiata.`,{join:true}),0)}
 if(stay){$('docTitle').value=I.title;updateTitle();showPhoto();renderPanel();refreshToggles()}return true}
function linkBack(){if(!photoLink.id){toast('Non stai modificando un’immagine del disegno');return}setMode('disegno')}
// Comandi di Disegno sull'immagine scelta: apri in Immagini, vai alle maschere, togli lo sfondo.
const panelBtn=sel=>{const b=$('adjBody').querySelector(sel);b?.scrollIntoView({block:'center'});b?.focus();return b};
function imgEdit(){const it=needPhotoImg();return it&&linkStart(it)}
function imgMasks(){const it=needPhotoImg();return it&&linkStart(it,()=>{panelBtn('[data-action="maskBrush"]');announce(`Maschere di «${it.name}», con gli strumenti di Immagini. ${I.r.masks.length?maskSummary():'Nessuna maschera.'} Crea una maschera a pennello, con una sfumatura o dalla selezione (scheda Seleziona), poi sposta i suoi cursori. Ctrl+Alt+D torna a Disegno.`)})}
function imgCutout(){const it=needPhotoImg(),hint=' Correggi con Tieni e Togli, poi Ctrl+Alt+D torna a Disegno.';return it&&linkStart(it,async()=>{
 if(I.r.cut){panelBtn('[data-action="cutKeep"]');announce(`Sfondo di «${it.name}», con gli strumenti di Immagini. ${cutSummary()}${hint}`);return}if(await cutAuto()){panelBtn('[data-action="cutKeep"]');announce(hint,{join:true})}})}
function imgPhotoReset(){const it=needPhotoImg();if(!it)return;if(!it.photo){toast(`«${it.name}» non ha maschere, scontorno o ritocchi`);return}editD(`Togli maschere e scontorno di «${it.name}»`,()=>{delete it.photo},{props:true});announce(`«${it.name}»: tolte maschere, scontorno, ritocchi, curve e inquadratura; restano luce, colore e look. Ctrl+Z per riaverli.`)}
// Proprietà: la ricetta dell'immagine a parole, con i comandi.
const drawBtn=id=>{const c=C[id];return `<button type="button" class="btn sm" data-action="${id}">${ICON(c.icon)}${esc(c.short||c.label)}</button>`};
function imgPhotoProps(it){if(!isPhotoImg(it))return '';const say=photoSay(it);return `<h3>Maschere e sfondo</h3><p class="hint" id="pr-photo">${esc(say?say[0].toUpperCase()+say.slice(1)+'.':'Nessuna maschera, sfondo intero.')}</p><div class="insp-actions">${['imgMasks','imgCutout','imgEdit',...(it.photo?['imgPhotoReset']:[])].map(drawBtn).join('')}</div>`}
const DRAW_PHOTO_ACTIONS={imgEdit,imgMasks,imgCutout,imgPhotoReset};
