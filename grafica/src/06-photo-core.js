// Immagini: una foto alla volta, modificata senza toccare l'originale. Il file aperto resta com'è; le modifiche
// sono una ricetta (inquadratura, regolazioni, look) che si applica all'anteprima e, all'esportazione, alla foto intera.
// Regolazioni: [id, nome, gruppo, minimo, massimo, passo, formato del valore, spiegazione letta con il cursore].
const warmth=(v,plus,minus)=>v?fmtSigned(v)+', '+(v>0?plus:minus):'0';
const ADJ=[
 ['exposure','Esposizione','Luce',-4,4,.05,v=>fmtSigned(v,2)+' EV','Schiarisce o scurisce tutta la foto: un EV raddoppia o dimezza la luce.'],
 ['contrast','Contrasto','Luce',-100,100,1,fmtSigned,'Allontana o avvicina le zone chiare e quelle scure.'],
 ['highlights','Alte luci','Luce',-100,100,1,fmtSigned,'A sinistra recupera i dettagli nelle zone chiare, a destra le schiarisce.'],
 ['shadows','Ombre','Luce',-100,100,1,fmtSigned,'A destra apre le zone scure, a sinistra le chiude.'],
 ['whites','Bianchi','Luce',-100,100,1,fmtSigned,'Sposta il punto più chiaro: a destra il bianco diventa pieno.'],
 ['blacks','Neri','Luce',-100,100,1,fmtSigned,'Sposta il punto più scuro: a sinistra il nero diventa pieno.'],
 ['temp','Temperatura','Colore',-100,100,1,v=>warmth(v,'più calda','più fredda'),'A destra la luce diventa più calda (gialla), a sinistra più fredda (azzurra).'],
 ['tint','Tinta','Colore',-100,100,1,v=>warmth(v,'verso il magenta','verso il verde'),'Corregge una dominante verde (a destra) o magenta (a sinistra).'],
 ['vibrance','Vividezza','Colore',-100,100,1,fmtSigned,'Ravviva soprattutto i colori spenti e rispetta i toni della pelle.'],
 ['saturation','Saturazione','Colore',-100,100,1,fmtSigned,'Rende tutti i colori più intensi; a −100 la foto è in bianco e nero.'],
 ['vignette','Vignettatura','Effetti',-100,100,1,fmtSigned,'A sinistra scurisce i bordi e porta l’attenzione al centro, a destra li schiarisce.']];
const ADJ_BY=Object.fromEntries(ADJ.map(([id,label,group,min,max,step,fmt,hint])=>[id,{id,label,group,min,max,step,fmt,hint}]));
// Formati dell'inquadratura come larghezza diviso altezza; 0 tiene il formato della foto.
const RATIOS=[['orig','Formato della foto',0],['1:1','Quadrato 1:1',1],['4:5','Verticale 4:5, post',4/5],['9:16','Verticale 9:16, storie',9/16],['2:3','Verticale 2:3',2/3],['3:2','Orizzontale 3:2',3/2],['4:3','Orizzontale 4:3',4/3],['16:9','Panoramico 16:9',16/9],['a4','Foglio A4 verticale',210/297]];
const ratioName=id=>(RATIOS.find(x=>x[0]===id)||RATIOS[0])[1];
const newRecipe=()=>({adj:Object.fromEntries(ADJ.map(a=>[a[0],0])),rot:0,flip:false,angle:0,ratio:'orig',cx:.5,cy:.5,look:'none',lookAmt:100});
// La foto aperta: il file originale, l'immagine decodificata e la ricetta, con la cronologia per Annulla e Ripeti.
// base è la ricetta dell'ultima modifica conclusa: i cursori cambiano r mentre si trascinano e la modifica entra
// nella cronologia solo quando si rilasciano.
const I={file:null,name:'',title:'Foto',bmp:null,r:newRecipe(),base:'',hist:[],redo:[],luts:{},plan:'libera',step:0,seen:new Set(),compare:false,stats:null};
const snap=()=>JSON.stringify(I.r);
I.base=snap();
function settle(label,opts){const now=snap();if(now===I.base)return false;I.hist.push({label,r:I.base});if(I.hist.length>200)I.hist.shift();I.redo=[];I.base=now;recipeChanged(opts);return true}
function edit(label,fn,opts){if(!I.bmp){toast('Apri prima una foto');return false}fn(I.r);return settle(label,opts)}
function photoUndo(redo){const from=redo?I.redo:I.hist,to=redo?I.hist:I.redo,e=from.pop();if(!e){toast(redo?'Niente da ripetere':'Niente da annullare');return}to.push({label:e.label,r:snap()});I.r=JSON.parse(e.r);I.base=e.r;recipeChanged({panel:true});announce((redo?'Ripetuto: ':'Annullato: ')+e.label)}
// Dopo ogni modifica: anteprima, pannello, pulsanti attivi e bozza.
function recipeChanged({panel=false}={}){requestRender();if(panel)renderPanel();else syncPanel();refreshToggles();schedulePersist('immagini')}
const changedAdj=r=>ADJ.filter(a=>r.adj[a[0]]);
const hasEdits=()=>snap()!==JSON.stringify(newRecipe());
// Apertura: la foto nuova riparte da una ricetta vuota e dal primo passo del piano scelto.
async function openPhoto(file){const bmp=await work('Apertura della foto',()=>decodePhoto(file));if(!bmp)return false;
 I.bmp?.close();Object.assign(I,{file,name:file.name,title:baseName(file.name),bmp,r:newRecipe(),hist:[],redo:[],step:0,seen:new Set(),compare:false});I.base=snap();
 $('docTitle').value=I.title;updateTitle();showPhoto();renderPanel();renderPlans();refreshToggles();schedulePersist('immagini');
 const intro=enterStep();announce(`Aperta «${file.name}», ${fmtInt(bmp.width)} per ${fmtInt(bmp.height)} pixel.${intro?' '+intro:''}`);$('photo').focus();return true}
async function closePhoto(){if(!I.bmp)return;if(hasEdits()&&!(await confirmAction('Le modifiche non esportate andranno perse. L’originale resta com’è sul tuo computer. Vuoi chiudere la foto?','Chiudi la foto')))return;
 I.bmp.close();Object.assign(I,{file:null,name:'',title:'Foto',bmp:null,r:newRecipe(),hist:[],redo:[],step:0,seen:new Set(),compare:false,stats:null});I.base=snap();
 $('docTitle').value=I.title;updateTitle();showPhoto();renderPanel();refreshToggles();schedulePersist('immagini');announce('Foto chiusa');$('photoEmpty').querySelector('button')?.focus()}
// Bozza: il file originale si salva una volta sola, la ricetta a ogni modifica.
let fileSaved=null;
async function persistPhoto(){if(!I.file){await dbDel('photo');await dbDel('photoFile');fileSaved=null;return}
 if(fileSaved!==I.file){await dbPut('photoFile',I.file);fileSaved=I.file}
 await dbPut('photo',{name:I.name,title:I.title,r:I.r,luts:I.luts,plan:I.plan,step:I.step,seen:[...I.seen]})}
async function restorePhoto(){const meta=await dbGet('photo'),file=await dbGet('photoFile');if(meta?.plan&&PLANS.some(p=>p.id===meta.plan))I.plan=meta.plan;if(meta?.luts)I.luts=meta.luts;if(!meta||!file)return;
 let bmp;try{bmp=await decodePhoto(file)}catch(e){console.warn('Foto della bozza non leggibile',e);return}
 const r=Object.assign(newRecipe(),meta.r);r.adj=Object.assign(newRecipe().adj,meta.r?.adj);
 Object.assign(I,{file,name:meta.name||file.name,bmp,r,step:clamp(meta.step|0,0,Math.max(0,planSteps().length-1)),seen:new Set(meta.seen||[])});I.base=snap();fileSaved=file;
 I.title=meta.title||baseName(I.name)}
function updateTitle(){document.title=($('docTitle').value.trim()||'Senza titolo')+' — '+appName()+' · Tassello Grafica'}
