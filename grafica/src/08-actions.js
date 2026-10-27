// Ogni comando del registro corrisponde a una funzione: prima quelle dell'app attiva, poi quelle comuni.
const I_ACTIONS={open:()=>pickFile(),export:exportDialog,closePhoto,auto:applyAuto,compare:toggleCompare,resetAll,readStatus:readPhotoStatus,sendToDraw:sendPhotoToDraw,
 rotateLeft:()=>rotate(-90),rotateRight:()=>rotate(90),flipH,ratioMenu,straighten:()=>liveRange('Raddrizza','angle'),resetGeometry,
 lookMenu,lutImport:()=>$('lutInput').click(),lookAmount:()=>I.r.look==='none'?toast('Scegli prima un look'):liveRange('Intensità del look','lookAmt'),lookOff:()=>setLook('none'),
 planMenu,stepNext:()=>stepGo(1),stepPrev:()=>stepGo(-1),stepAuto,planFree:()=>choosePlan('libera'),
 undo:()=>photoUndo(false),redo:()=>photoUndo(true)};
const D_ACTIONS={openDraw:()=>pickFile(),saveSvg,exportDraw:exportDrawImage,newDraw:newDrawingCmd,
 addRect:()=>addItem('rect'),addEllipse:()=>addItem('ellipse'),addLine:()=>addItem('line'),addText:()=>{addItem('text');$('pr-text')?.focus();$('pr-text')?.select()},addImage:()=>{pickMode='image';$('drawInput').click()},
 duplicateItem,deleteItem,cut:()=>copyItem(true),copy:()=>copyItem(false),paste:pasteItem,
 bringFront:()=>orderItem('front'),sendBack:()=>orderItem('back'),forward:()=>orderItem('forward'),backward:()=>orderItem('backward'),
 alignLeft:()=>alignItem('left'),alignCenter:()=>alignItem('center'),alignRight:()=>alignItem('right'),alignTop:()=>alignItem('top'),alignMiddle:()=>alignItem('middle'),alignBottom:()=>alignItem('bottom'),
 readDraw:readDrawStatus,sheetSize:()=>focusSheetProp('pr-preset'),sheetDesc:()=>focusSheetProp('pr-desc'),a11yCheck:drawA11yCheck,
 zoomIn:()=>zoomDraw(1.25),zoomOut:()=>zoomDraw(.8),zoomFit:()=>zoomDraw(0),
 selectAll,groupItems,ungroupItems,lockItems,hideItems,distH:()=>distribute('h'),distV:()=>distribute('v'),smartGuides:()=>{prefs.drawSmart=!smartOn();savePrefs()},
 toolSelect:()=>setTool('select'),toolNodes:()=>setTool('nodes'),toolPen:()=>setTool('pen'),toolPencil:()=>setTool('pencil'),toolBrush:()=>setTool('brush'),toolEraser:()=>setTool('eraser'),nodeAdd,nodeDelete:deleteNode,nodeType:nodeToggle,pathClose,readPath,toPath,gradientItem:toggleGrad,shadowItem:toggleShadow,textOnPath,textOffPath,
 addPolygon:()=>addItem('poly'),addStar:()=>addItem('poly',{star:true,sides:5,inner:45,fill:'#e8a33d',name:nextName('poly','Stella')}),addArrow:()=>addItem('arrow'),addBubble:()=>addItem('bubble'),addArrowLine:()=>addItem('line',{end:'arrow',name:nextName('line','Linea con freccia')}),
 undo:()=>drawUndo(false),redo:()=>drawUndo(true)};
const COMMON_ACTIONS={filePanel:openFilePanel,palette:openPalette,shortcuts:showShortcuts,help,nextRegion:()=>cycleRegion(1),prevRegion:()=>cycleRegion(-1),
 switchImmagini:()=>setMode('immagini'),switchDisegno:()=>setMode('disegno'),layoutMenu,layoutReset,showPlans:()=>paneToggle('planPane'),showAdjust:()=>paneToggle('adjPane'),showLayers:()=>paneToggle('layPane'),showProps:()=>paneToggle('propPane'),
 themeDark:()=>{prefs.theme=prefs.theme==='dark'?'light':'dark';applyPrefs();savePrefs()},contrast:()=>{prefs.contrast=!prefs.contrast;applyPrefs();savePrefs()}};
async function handleAction(id){const f=(isImmagini()?I_ACTIONS[id]:D_ACTIONS[id])??COMMON_ACTIONS[id];if(!f){toast('Comando non disponibile');return}await f()}
// Passa da Immagini a Disegno e viceversa: ogni app tiene il suo titolo, la sua barra e il suo lavoro.
function setMode(mode,{focus=true}={}){const img=mode==='immagini',home=()=>img?(I.bmp?$('photo'):$('planList')):sheetWrap;if(mode===state.mode){if(focus)home().focus();return}
 state.mode=mode;$('app').className=mode;document.documentElement.dataset.mode=mode;$('photoPane').classList.toggle('hidden',!img);$('drawPane').classList.toggle('hidden',img);$('switchImmagini').setAttribute('aria-pressed',img);$('switchDisegno').setAttribute('aria-pressed',!img);
 $('docTitle').value=img?I.title:Dw.p.title;$('saveTopLabel').textContent=img?'Esporta':'Salva';$('saveTop').dataset.tip=img?'Esporta la foto (Ctrl+S)':'Salva il disegno in SVG (Ctrl+S)';updateTitle();
 renderBar();applyLayout();themeChanged();if(img){showPhoto();renderPanel()}else{renderSheet();renderLayers();renderProps()}refreshToggles();
 if(focus){home().focus();announce(img?'Immagini':'Disegno: foglio')}schedulePersist(mode)}
// Apertura dei file. Immagini: una foto per volta, un file .cube diventa un look. Disegno: un SVG di Disegno si riapre,
// le altre immagini e gli altri SVG entrano nel foglio.
let pickMode='open';
function pickFile(){pickMode='open';(isImmagini()?$('fileInput'):$('drawInput')).click()}
async function openFiles(files){files=[...files];if(!files.length)return;const cube=files.find(f=>/\.cube$/i.test(f.name));if(cube&&files.length===1){await importLut(cube);return}
 if(!isImmagini()){const svg=files.find(isSvgFile),rest=files.filter(f=>f!==svg&&(isPhotoFile(f)||isSvgFile(f)));if(pickMode==='open'&&svg&&files.length===1){await openSvg(svg);return}const all=[...(svg?[svg]:[]),...rest];if(!all.length){toast('Scegli un disegno SVG o delle immagini');return}await addImages(all);return}
 const photo=files.find(isPhotoFile);if(!photo){toast('Scegli una foto: JPEG, PNG, WebP, AVIF, GIF o BMP');return}if(files.length>1)toast('Immagini apre una foto alla volta: aperta la prima');
 if(I.bmp&&hasEdits()&&!(await confirmAction(`Aprire «${photo.name}»? Le modifiche alla foto attuale non esportate andranno perse; l’originale resta com’è.`,'Apri')))return;await openPhoto(photo)}
// Pannello File a schermo intero, gestito come finestra di dialogo.
const FILE_MENU={i:[['open','open','Apri una foto'],['export','save','Esporta la foto'],['sendToDraw','draw','Usa la foto in Disegno'],['lutImport','cube','Importa un look (LUT .cube)'],['closePhoto','close','Chiudi la foto'],['shortcuts','keyboard','Scorciatoie da tastiera'],['help','info','Informazioni e limiti']],
 d:[['newDraw','new','Nuovo disegno'],['openDraw','open','Apri un disegno SVG'],['addImage','image','Inserisci immagini'],['saveSvg','save','Salva il disegno (SVG)'],['exportDraw','export','Esporta come immagine (PNG, JPEG)'],['a11yCheck','check','Verifica dell’accessibilità'],['shortcuts','keyboard','Scorciatoie da tastiera'],['help','info','Informazioni e limiti']]};
const FILE_TILES={i:[['open','open','Apri','Una foto JPEG, PNG, WebP, AVIF, GIF o BMP'],['export','save','Esporta','JPEG, PNG o WebP, alla dimensione che scegli'],['planMenu','plan','Scegli un piano','Social, ritratto, paesaggio, documento, prodotto'],['lutImport','cube','Importa un look','Un file LUT .cube']],
 d:[['saveSvg','save','Salva','Un file SVG che Disegno riapre modificabile'],['exportDraw','export','Esporta','PNG o JPEG, alla misura del foglio o doppia'],['openDraw','open','Apri','Un disegno SVG salvato con Disegno'],['addImage','image','Inserisci immagini','Foto e SVG dentro il foglio']]};
let filePrev=null;
function openFilePanel(){filePrev=document.activeElement;const m=state.mode[0],dd=(k,v)=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
 $('fileSide').innerHTML=`<button type="button" class="file-back" data-file-action="close">${ICON('back')}Torna ${isImmagini()?'alla foto':'al foglio'}</button>`+FILE_MENU[m].map(([id,icon,label])=>`<button type="button" data-file-action="${id}">${ICON(icon)}${esc(label)}</button>`).join('');
 $('fileTiles').innerHTML=FILE_TILES[m].map(([id,icon,b,s])=>`<button type="button" class="file-tile" data-file-action="${id}">${ICON(icon)}<b>${esc(b)}</b><span>${esc(s)}</span></button>`).join('');
 if(isImmagini()){$('fileIntro').textContent='La foto resta sul tuo dispositivo e l’originale non viene mai modificato: la bozza con le regolazioni è salvata nel browser; esporta la foto per avere il file finito.';
  const [w,h]=I.bmp?outSize(I.r,I.bmp.width,I.bmp.height):[0,0];
  $('fileDetails').innerHTML=I.bmp?dd('Foto',I.name)+dd('Originale',`${fmtInt(I.bmp.width)} × ${fmtInt(I.bmp.height)} pixel${I.file?.size?', '+fmtBytes(I.file.size):''}`)+dd('Inquadratura',`${fmtInt(w)} × ${fmtInt(h)} pixel, ${ratioName(I.r.ratio).toLowerCase()}`)+dd('Regolazioni',changedAdj(I.r).length?changedAdj(I.r).map(a=>a[1]).join(', '):'nessuna')+dd('Look',lookName(I.r.look))+dd('Piano',planOf().name)+dd('Bozza',$('saveState').textContent):dd('Foto','nessuna foto aperta')+dd('Piano',planOf().name)}
 else{const p=Dw.p,count=k=>p.items.filter(x=>x.kind===k).length;$('fileIntro').textContent='Il disegno resta sul tuo dispositivo: la bozza e le immagini sono salvate nel browser; salvalo in SVG per conservarlo o riaprirlo altrove, esportalo in PNG o JPEG per pubblicarlo.';
  $('fileDetails').innerHTML=dd('Nome',p.title)+dd('Foglio',`${fmtInt(p.w)} × ${fmtInt(p.h)} pixel${p.bg==='none'?', trasparente':''}`)+dd('Oggetti',p.items.length?`${p.items.length}: ${count('text')} testi, ${count('image')} immagini, ${p.items.filter(x=>!['text','image','path'].includes(x.kind)).length} forme, ${count('path')} tracciati e tratti`:'nessuno')+dd('Descrizione',p.desc||'mancante')+dd('Bozza',$('saveState').textContent)}
 $('filepanel').hidden=false;$('fileBtn').setAttribute('aria-expanded','true');$('fileSide').querySelector('button')?.focus()}
function closeFilePanel(restore=true){if($('filepanel').hidden)return;$('filepanel').hidden=true;$('fileBtn').setAttribute('aria-expanded','false');if(restore)(filePrev?.isConnected?filePrev:$('fileBtn')).focus()}
