// Ogni comando del registro corrisponde a una funzione: prima quelle dell'app attiva, poi quelle comuni.
const I_ACTIONS={open:()=>pickFile(),export:exportDialog,closePhoto,auto:applyAuto,compare:toggleCompare,resetAll,readStatus:readPhotoStatus,
 rotateLeft:()=>rotate(-90),rotateRight:()=>rotate(90),flipH,ratioMenu,straighten:()=>liveRange('Raddrizza','angle'),resetGeometry,
 lookMenu,lutImport:()=>$('lutInput').click(),lookAmount:()=>I.r.look==='none'?toast('Scegli prima un look'):liveRange('Intensità del look','lookAmt'),lookOff:()=>setLook('none'),
 planMenu,stepNext:()=>stepGo(1),stepPrev:()=>stepGo(-1),stepAuto,planFree:()=>choosePlan('libera'),
 undo:()=>photoUndo(false),redo:()=>photoUndo(true)};
const COMMON_ACTIONS={filePanel:openFilePanel,palette:openPalette,shortcuts:showShortcuts,help,nextRegion:()=>cycleRegion(1),prevRegion:()=>cycleRegion(-1),
 switchImmagini:()=>setMode('immagini'),
 themeDark:()=>{prefs.theme=prefs.theme==='dark'?'light':'dark';applyPrefs();savePrefs()},contrast:()=>{prefs.contrast=!prefs.contrast;applyPrefs();savePrefs()}};
async function handleAction(id){const f=(isImmagini()?I_ACTIONS[id]:null)??COMMON_ACTIONS[id];if(!f){toast('Comando non disponibile');return}await f()}
// Passa da un'app all'altra. Per ora c'è solo Immagini: Disegno è in preparazione.
function setMode(mode,{focus=true}={}){if(mode!=='immagini'){toast('Disegno arriverà in una prossima versione di Tassello Grafica');return}if(mode===state.mode){if(focus)(I.bmp?$('photo'):$('planList')).focus();return}}
// Apertura dei file: una foto per volta; un file .cube diventa un look.
function pickFile(){$('fileInput').click()}
async function openFiles(files){files=[...files];if(!files.length)return;const cube=files.find(f=>/\.cube$/i.test(f.name));if(cube&&files.length===1){await importLut(cube);return}
 const photo=files.find(isPhotoFile);if(!photo){toast('Scegli una foto: JPEG, PNG, WebP, AVIF, GIF o BMP');return}if(files.length>1)toast('Immagini apre una foto alla volta: aperta la prima');
 if(I.bmp&&hasEdits()&&!(await confirmAction(`Aprire «${photo.name}»? Le modifiche alla foto attuale non esportate andranno perse; l’originale resta com’è.`,'Apri')))return;await openPhoto(photo)}
// Pannello File a schermo intero, gestito come finestra di dialogo.
const FILE_MENU={i:[['open','open','Apri una foto'],['export','save','Esporta la foto'],['lutImport','cube','Importa un look (LUT .cube)'],['closePhoto','close','Chiudi la foto'],['shortcuts','keyboard','Scorciatoie da tastiera'],['help','info','Informazioni e limiti']]};
const FILE_TILES={i:[['open','open','Apri','Una foto JPEG, PNG, WebP, AVIF, GIF o BMP'],['export','save','Esporta','JPEG, PNG o WebP, alla dimensione che scegli'],['planMenu','plan','Scegli un piano','Social, ritratto, paesaggio, documento, prodotto'],['lutImport','cube','Importa un look','Un file LUT .cube']]};
let filePrev=null;
function openFilePanel(){filePrev=document.activeElement;const m=state.mode[0],dd=(k,v)=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
 $('fileSide').innerHTML=`<button type="button" class="file-back" data-file-action="close">${ICON('back')}Torna alla foto</button>`+FILE_MENU[m].map(([id,icon,label])=>`<button type="button" data-file-action="${id}">${ICON(icon)}${esc(label)}</button>`).join('');
 $('fileTiles').innerHTML=FILE_TILES[m].map(([id,icon,b,s])=>`<button type="button" class="file-tile" data-file-action="${id}">${ICON(icon)}<b>${esc(b)}</b><span>${esc(s)}</span></button>`).join('');
 $('fileIntro').textContent='La foto resta sul tuo dispositivo e l’originale non viene mai modificato: la bozza con le regolazioni è salvata nel browser; esporta la foto per avere il file finito.';
 const [w,h]=I.bmp?outSize(I.r,I.bmp.width,I.bmp.height):[0,0];
 $('fileDetails').innerHTML=I.bmp?dd('Foto',I.name)+dd('Originale',`${fmtInt(I.bmp.width)} × ${fmtInt(I.bmp.height)} pixel${I.file?.size?', '+fmtBytes(I.file.size):''}`)+dd('Inquadratura',`${fmtInt(w)} × ${fmtInt(h)} pixel, ${ratioName(I.r.ratio).toLowerCase()}`)+dd('Regolazioni',changedAdj(I.r).length?changedAdj(I.r).map(a=>a[1]).join(', '):'nessuna')+dd('Look',lookName(I.r.look))+dd('Piano',planOf().name)+dd('Bozza',$('saveState').textContent):dd('Foto','nessuna foto aperta')+dd('Piano',planOf().name);
 $('filepanel').hidden=false;$('fileBtn').setAttribute('aria-expanded','true');$('fileSide').querySelector('button')?.focus()}
function closeFilePanel(restore=true){if($('filepanel').hidden)return;$('filepanel').hidden=true;$('fileBtn').setAttribute('aria-expanded','false');if(restore)(filePrev?.isConnected?filePrev:$('fileBtn')).focus()}
