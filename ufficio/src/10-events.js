// Scorciatoie globali: intercettate in cattura, prima dei gestori dei singoli controlli.
window.addEventListener('keydown',e=>{if(e.isComposing||overlayOpen())return;const ctx=focusContext();if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key==='/'){e.preventDefault();runCommand('shortcuts');return}if(e.key==='F5'&&isCalc()&&ctx==='grid'&&!e.ctrlKey&&!e.shiftKey){e.preventDefault();runCommand('goto');return}const c=findShortcut(e,ctx);if(!c)return;e.preventDefault();e.stopPropagation();runCommand(c.id)},true);
$('skipDoc').onclick=e=>{e.preventDefault();focusDocument()};
$('skipTools').onclick=e=>{e.preventDefault();(toolItems()[toolFocus]||$('fileBtn')).focus()};
// Barra
for(const [mode,a] of Object.entries(APPS))$(a.button).onclick=()=>setMode(mode);
$('docTitle').addEventListener('input',e=>{if(isPage())pageRetitle(e.target.value);else state[isWord()?'wordTitle':'excelTitle']=e.target.value;updateTitle();schedulePersist()});
$('docTitle').addEventListener('keydown',ev=>{if(ev.key!=='Enter'&&ev.key!=='Escape')return;ev.preventDefault();focusDocument()});
for(const id of ['paletteBtn','saveTop','layoutBtn'])$(id).addEventListener('mousedown',e=>{if(isWord())e.preventDefault()});
$('saveTop').onclick=()=>runCommand(isPage()?'pgSave':'save');$('layoutBtn').onclick=()=>runCommand('layoutMenu');
$('paletteBtn').onclick=()=>runCommand('palette');$('kbdBtn').onclick=()=>runCommand('shortcuts');$('helpBtn').onclick=()=>runCommand('help');$('fileBtn').onclick=openFilePanel;
// Cassetti
$('ribbon').addEventListener('mousedown',e=>{if(isWord()&&e.target.closest('button[data-action]'))e.preventDefault()});
// Pulsanti dei cassetti: ognuno porta in data-action il nome del comando.
$('ribbon').addEventListener('click',({target})=>{const b=target.closest('button[data-action]');if(b)drawerRun(b)});
// Elenchi e colori dei cassetti: carattere, dimensione, formato numerico, colori, impostazioni del documento.
$('ribbon').addEventListener('change',e=>{const t=e.target,id=t.id;if(id==='fontFamily'){changeFont(t.value);announce('Carattere '+t.value)}else if(id==='fontSize'){changeFontSize(t.value);announce('Dimensione '+t.value)}else if(id==='numberFormat'){applyCellsStyle('fmt',t.value);announce('Formato '+t.value)}else if(COLORS[id]){lastColor[id]=t.value;$$(`[data-swatch="${id}"]`).forEach(s=>s.style.background=t.value);changeColor(id==='fontColor'?'fontColor':'fillColor',t.value);announce('Colore applicato '+t.value)}else if(id in{docFont:1,lineSpacing:1,paraSpacing:1}){state.doc[{docFont:'font',lineSpacing:'line',paraSpacing:'space'}[id]]=t.value;applyDocStyle();updateWordStats();schedulePersist();announce(t.selectedOptions[0]?.text||t.value)}else return;if(t.isConnected)t.focus({preventScroll:true})});
// Tooltip (si chiudono con Esc e non coprono il puntatore)
document.addEventListener('pointerover',e=>{if(e.target.closest?.('#tip'))return;const el=e.target.closest?.('[data-tip]');clearTimeout(tipTimer);if(!el){tip.hidden=true;return}tipTimer=setTimeout(()=>showTip(el),450)});
document.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-tip]');clearTimeout(tipTimer);tip.hidden=true;if(el&&el.matches(':focus-visible,:focus-within'))tipTimer=setTimeout(()=>showTip(el),350)});
document.addEventListener('pointerdown',hideTip,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip()},true);
// File
// Il campo file si svuota subito, così lo stesso file si può scegliere di nuovo.
const takeFile=input=>{const file=input.files[0];input.value='';return file};
$('fileInput').onchange=async e=>{const file=takeFile(e.target);closeFilePanel(false);if(file)await openFile(file)};
$('imageInput').onchange=e=>{const file=takeFile(e.target);if(file)readImage(file)};
const FILE_PANEL_ACTIONS={new:()=>runCommand('new'),open:()=>runCommand('open'),save:()=>runCommand('save'),backup:()=>projectBackup(),export:()=>runCommand(isWord()?'exportHtml':isCalc()?'exportCSV':'pgExportPng'),
 pgSave:()=>runCommand('pgSave'),pgTemplates:()=>runCommand('pgTemplates'),pgSaveTpl:()=>runCommand('pgSaveTpl'),pgFolder:()=>runCommand('pgFolder'),pgCheck:()=>runCommand('pgCheck'),
 print:()=>runCommand('print'),shortcuts:()=>runCommand('shortcuts'),templates:()=>runCommand('templates'),versions:()=>runCommand('versionHistory'),help:()=>runCommand('help')};
$('filepanel').addEventListener('click',e=>{const action=e.target.closest('[data-file-action]')?.dataset.fileAction;if(action===undefined)return;closeFilePanel(true);if(Object.hasOwn(FILE_PANEL_ACTIONS,action))FILE_PANEL_ACTIONS[action]()});
$('filepanel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFilePanel(true);return}if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target.closest('.file-side')){e.preventDefault();const l=$$('.file-side button'),i=l.indexOf(e.target);l[(i+(e.key==='ArrowDown'?1:-1)+l.length)%l.length].focus();return}trapTab(e,$('filepanel'))});
// Stato e zoom
$('zoomSlider').addEventListener('input',e=>setZoom(e.target.value));$('zoomMinus').onclick=()=>runCommand('zoomDown');$('zoomPlus').onclick=()=>runCommand('zoomUp');$('brandBtn').onclick=()=>runCommand('help');
// Editor Word
const ed=$('wordEditor');let findTimer;
ed.addEventListener('input',()=>{wordChanged();if(!$('findbar').hidden&&find.query){clearTimeout(findTimer);findTimer=setTimeout(()=>runFind(find.matches[find.idx]?.start??null),300)}});
document.addEventListener('selectionchange',()=>{if(isWord()&&document.activeElement===ed&&inEditor()){wordSelectionSave();refreshToggles()}});
// Incolla nel documento: un'immagine diventa immagine, l'HTML passa dalla pulizia; il testo semplice lo gestisce il browser.
ed.addEventListener('paste',e=>{const data=e.clipboardData,picture=[...(data?.files||[])].find(f=>f.type.startsWith('image/'));if(picture){e.preventDefault();readImage(picture);return}
 const markup=data.getData('text/html');if(!markup)return;const clean=sanitizeHTML(markup);e.preventDefault();insertHtmlAtSelection(clean)});
ed.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];if(!file)return;e.preventDefault();if(file.type.startsWith('image/'))readImage(file);else openFile(file)});
ed.addEventListener('click',e=>{if(e.target.tagName==='IMG'){const r=document.createRange();r.selectNode(e.target);const s=getSelection();s.removeAllRanges();s.addRange(r);wordSelectionSave()}});
ed.addEventListener('keydown',e=>{if(e.key==='Escape'){tabExitArmed=true;announce('Premi Tab per uscire dal documento');return}if(e.key!=='Tab'||e.ctrlKey||e.altKey||e.metaKey){if(e.key!=='Shift')tabExitArmed=false;return}if(tabExitArmed){tabExitArmed=false;return}const el=anchorEl(),td=el?.closest('td,th'),li=el?.closest('li');if(td&&ed.contains(td)){e.preventDefault();moveTableCell(td,e.shiftKey?-1:1);return}if(li&&ed.contains(li)){e.preventDefault();wordCmd(e.shiftKey?'outdent':'indent');announce(e.shiftKey?'Livello dell’elenco ridotto':'Livello dell’elenco aumentato')}else if(!e.shiftKey&&!reading){e.preventDefault();insertTab()}});
// Barra della formula
$('nameBox').addEventListener('focus',e=>e.target.select());
// Casella nome: Invio va al riferimento scritto, Esc torna alla griglia.
$('nameBox').addEventListener('keydown',ev=>{const {key}=ev;if(key!=='Enter'&&key!=='Escape')return;ev.preventDefault();if(key==='Enter')gotoRef(ev.target.value);else{syncFormula();$('gridScroll').focus()}});
// Barra della formula: entrando mostra il contenuto scritto della cella attiva.
$('formulaInput').addEventListener('focus',()=>{const fi=$('formulaInput');fi.classList.remove('ghost');fi.removeAttribute('aria-description');fi.value=editText(state.sel.r,state.sel.c)});
$('formulaInput').addEventListener('keydown',e=>{const input=e.target;if(e.key==='Tab'&&!e.shiftKey&&fxAccept(input)){e.preventDefault();return}if(e.key!=='Enter'&&e.key!=='Escape')return;
 hideFxHint();e.preventDefault();const {r,c}=state.sel;
 if(e.key==='Enter'){if(input.value!==editText(r,c))commitValue(r,c,input.value);$('gridScroll').focus();moveCell(1,0)}else{input.value=editText(r,c);$('gridScroll').focus();announce('Modifica annullata')}});
// Griglia Excel
const gs=$('gridScroll');
gs.addEventListener('scroll',()=>{renderGrid(false);if(!cellEditorOpen())return;const box=$('gridInput'),td=$(`c${box.dataset.r}_${box.dataset.c}`);if(!td)return;const {left,top}=td.getBoundingClientRect();Object.assign(box.style,{left:left+'px',top:top+'px'})});
addEventListener('resize',()=>renderGrid());
// Mouse sulla griglia: cella (Maiusc estende la selezione, trascinando si allarga), intestazione di colonna o di riga, angolo per tutto il foglio.
const cellOf=td=>({r:Number(td.dataset.r),c:Number(td.dataset.c)});
$('grid').addEventListener('mousedown',e=>{if(e.button!==0)return;const td=e.target.closest('td[data-r]');
 if(td){e.preventDefault();finishCell(false,false);const {r,c}=cellOf(td);e.shiftKey?setSelection(state.sel.r,state.sel.c,r,c):setSelection(r,c);sheetDrag=true;gs.focus({preventScroll:true});return}
 const colHead=e.target.closest('th[data-col]'),rowHead=e.target.closest('th[data-rhead]'),corner=e.target.closest('th[data-corner]');if(!colHead&&!rowHead&&!corner)return;
 e.preventDefault();finishCell(false,false);
 if(corner)setSelection(0,0,ROWS-1,COLS-1);
 else if(colHead){const c=Number(colHead.dataset.col);setSelection(0,e.shiftKey?state.sel.c:c,ROWS-1,c)}
 else{const r=Number(rowHead.dataset.rhead);setSelection(e.shiftKey?state.sel.r:r,0,r,COLS-1)}
 gs.focus({preventScroll:true})});
$('grid').addEventListener('mouseover',e=>{const td=sheetDrag&&e.target.closest('td[data-r]');if(!td)return;const {r,c}=cellOf(td);setSelection(state.sel.r,state.sel.c,r,c)});
addEventListener('mouseup',()=>{sheetDrag=false});
$('grid').addEventListener('dblclick',({target})=>{const td=target.closest('td[data-r]');if(!td)return;const {r,c}=cellOf(td);editCell(r,c)});
$('grid').addEventListener('contextmenu',e=>{const td=e.target.closest('td[data-r]');if(!td)return;e.preventDefault();const r=+td.dataset.r,c=+td.dataset.c,b=selectedBounds();if(r<b.r1||r>b.r2||c<b.c1||c>b.c2)setSelection(r,c);gs.focus({preventScroll:true});cellMenu(e.clientX,e.clientY)});
gs.addEventListener('keydown',e=>{if(!isCalc()||e.target!==gs||e.defaultPrevented)return;const k=e.key,shift=e.shiftKey,ctrl=e.ctrlKey||e.metaKey,altgr=e.getModifierState?.('AltGraph')||(e.ctrlKey&&e.altKey),{r,c}=state.sel;
 if(k==='Tab'&&tabExitArmed){tabExitArmed=false;return}if(k!=='Escape'&&k!=='Shift')tabExitArmed=false;
 const nav={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[k];
 if(nav&&!e.altKey){e.preventDefault();ctrl?jump(nav[0],nav[1],shift):moveCell(nav[0],nav[1],shift);return}
 if(k==='Enter'&&!ctrl&&!e.altKey){e.preventDefault();moveCell(shift?-1:1,0);return}
 if(k==='Tab'){e.preventDefault();moveCell(0,shift?-1:1);return}
 if(k==='Home'){e.preventDefault();if(ctrl)shift?setSelection(r,c,0,0,true):setSelection(0,0,0,0,true);else shift?setSelection(r,c,state.sel.r2,0,true):setSelection(r,0,r,0,true);return}
 if(k==='End'){e.preventDefault();if(ctrl){const u=usedBounds();shift?setSelection(r,c,u.r,u.c,true):setSelection(u.r,u.c,u.r,u.c,true)}else{let lc=0;for(let x=COLS-1;x>=0;x--)if(cellRaw(r,x)!==''){lc=x;break}shift?setSelection(r,c,state.sel.r2,lc,true):setSelection(r,lc,r,lc,true)}return}
 if((k==='PageDown'||k==='PageUp')&&!e.altKey){e.preventDefault();const n=Math.max(1,Math.floor(gs.clientHeight/(ROWHEIGHT*state.zoom/100))-1);moveCell(k==='PageDown'?n:-n,0,shift);return}
 if(k==='F2'){e.preventDefault();editCell();return}
 if(k==='Delete'){e.preventDefault();clearCells('contents');return}
 if(k==='Backspace'){e.preventDefault();editCell(r,c,'');return}
 if(k==='ContextMenu'){e.preventDefault();cellMenuAtActive();return}
 if(k==='Escape'){if(!isSingle(selectedBounds()))setSelection(r,c);tabExitArmed=true;announce('Premi Tab per uscire dal foglio');return}
 if(k.length===1&&(altgr||(!ctrl&&!e.altKey))){e.preventDefault();editCell(r,c,k)}});
// Appunti del foglio: testo separato da tabulazioni, lo stesso formato che usano Excel e gli altri fogli di calcolo.
const copySelection=e=>{const tsv=buildTsv();e.clipboardData.setData('text/plain',tsv);e.preventDefault()};
gs.addEventListener('copy',e=>{copySelection(e);announce('Celle copiate')});
gs.addEventListener('cut',e=>{copySelection(e);clearCells('contents');announce('Celle tagliate')});
gs.addEventListener('paste',e=>{const text=e.clipboardData.getData('text/plain');e.preventDefault();pasteTsv(text)});
const gi=$('gridInput');
gi.addEventListener('keydown',e=>{e.stopPropagation();const k=e.key;if(k==='Tab'&&!e.shiftKey&&fxAccept(gi)){e.preventDefault();return}if(k==='Enter'&&e.altKey){e.preventDefault();document.execCommand('insertLineBreak');gi.dataset.enter='';return}if(k==='Enter'||k==='Tab'){e.preventDefault();finishCell();const step=e.shiftKey?-1:1;if(k==='Enter')moveCell(step,0);else moveCell(0,step)}else if(k==='Escape'){e.preventDefault();finishCell(true);announce('Modifica annullata')}else if(k==='F2'){e.preventDefault();gi.dataset.enter=gi.dataset.enter?'':'1';announce(gi.dataset.enter?'Immissione: le frecce confermano e spostano':'Modifica: le frecce muovono il cursore')}else if(gi.dataset.enter&&!gi.textContent.startsWith('=')&&!e.shiftKey&&!e.ctrlKey&&['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(k)){e.preventDefault();finishCell();const d={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[k];moveCell(d[0],d[1])}});
gi.addEventListener('blur',()=>{if(gi.style.display==='block')finishCell(false,false)});
for(const el of [gi,$('formulaInput')]){el.addEventListener('input',()=>queueFxHint(el));el.addEventListener('click',()=>queueFxHint(el));el.addEventListener('keyup',e=>{if(/^(Arrow|Home|End)/.test(e.key))queueFxHint(el)})}
$('formulaInput').addEventListener('blur',()=>setTimeout(()=>{if(fxHintState.el===$('formulaInput'))hideFxHint()},0));
// Linguette dei fogli (tablist)
const sheetIdx=e=>{const b=e.target.closest('[data-sheet]');return b?+b.dataset.sheet:-1};
$('sheetTabs').addEventListener('click',e=>{const i=sheetIdx(e);if(i>=0&&i!==state.sheet)switchSheet(i,true)});
// Doppio clic su una linguetta: rinomina il foglio.
$('sheetTabs').addEventListener('dblclick',e=>{const i=sheetIdx(e);if(i>=0)renameSheet(i)});
// Menu del foglio: tasto destro, tasto Menu o Maiusc+F10.
$('sheetTabs').addEventListener('contextmenu',e=>{const i=sheetIdx(e);if(i<0)return;e.preventDefault();sheetMenu(i,e.clientX,e.clientY)});
$('sheetTabs').addEventListener('keydown',e=>{const i=sheetIdx(e);if(i<0)return;const n=state.sheets.length;let j=null;if(e.key==='ArrowRight')j=(i+1)%n;else if(e.key==='ArrowLeft')j=(i-1+n)%n;else if(e.key==='Home')j=0;else if(e.key==='End')j=n-1;if(j!==null){e.preventDefault();switchSheet(j,true);return}if(e.key==='Enter'||e.key===' '||e.key==='ArrowUp'){e.preventDefault();gs.focus();return}if(e.key==='F2'){e.preventDefault();renameSheet(i);return}if(e.key==='Delete'){e.preventDefault();deleteSheet(i);return}if(e.key==='ContextMenu'||(e.key==='F10'&&e.shiftKey)){e.preventDefault();const r=e.target.getBoundingClientRect();sheetMenu(i,r.left,r.top-8)}});
$('addSheet').onclick=()=>runCommand('addSheet');
// Trova e sostituisci
$('findText').addEventListener('input',()=>{clearTimeout(findTimer);findTimer=setTimeout(()=>runFind(),180)});
for(const id of ['findCase','findWord','findRegex','findStyle'])$(id).addEventListener('change',()=>runFind());
$('findbar').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFind();return}if(e.key==='Enter'&&e.target.id==='findText'){e.preventDefault();stepFind(e.shiftKey?-1:1)}else if(e.key==='Enter'&&e.target.id==='replaceText'){e.preventDefault();replaceOne()}});
$('findNext').onclick=()=>stepFind(1);$('findPrev').onclick=()=>stepFind(-1);$('replaceOne').onclick=replaceOne;$('replaceAll').onclick=replaceAll;$('findClose').onclick=()=>closeFind();
// Ricerca comandi
$('palInput').addEventListener('input',renderPalette);
$('palInput').addEventListener('keydown',e=>{const n=palItems.length;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(n){palIdx=(palIdx+(e.key==='ArrowDown'?1:-1)+n)%n;palActive()}}else if(e.key==='PageDown'||e.key==='PageUp'){e.preventDefault();if(n){palIdx=Math.max(0,Math.min(n-1,palIdx+(e.key==='PageDown'?8:-8)));palActive()}}else if(e.key==='Enter'){e.preventDefault();palRun(palIdx)}else if(e.key==='Escape'){e.preventDefault();closePalette(true)}else if(e.key==='Tab')e.preventDefault()});
$('palList').addEventListener('mousedown',e=>e.preventDefault());
$('palList').addEventListener('click',e=>{const o=e.target.closest('[data-i]');if(o)palRun(+o.dataset.i)});
$('palettebg').addEventListener('mousedown',e=>{if(e.target===$('palettebg'))closePalette(true)});
// Menu contestuale
$('menu').addEventListener('keydown',e=>{const items=$$('#menu [role^=menuitem]:not([aria-disabled])'),i=items.indexOf(document.activeElement),go=j=>{e.preventDefault();items[(j+items.length)%items.length]?.focus()};if(e.key==='ArrowDown')go(i+1);else if(e.key==='ArrowUp')go(i-1);else if(e.key==='Home')go(0);else if(e.key==='End')go(items.length-1);else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();closeMenu(true)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();const b=document.activeElement.closest('[data-i]');if(b)menuRun(+b.dataset.i)}else if(e.key.length===1&&!e.ctrlKey&&!e.altKey){const k=e.key.toLowerCase(),order=[...items.slice(i+1),...items.slice(0,i+1)];order.find(b=>b.textContent.trim().toLowerCase().startsWith(k))?.focus()}});
$('menu').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)menuRun(+b.dataset.i)});
document.addEventListener('pointerdown',e=>{if(menuState&&!e.target.closest('#menu'))closeMenu(false)},true);
// Trascinamento file, stampa e salvataggio all'uscita
// File trascinati sulla pagina (fuori dal documento): si aprono come con Apri.
const carriesFiles=e=>[...(e.dataTransfer?.types||[])].includes('Files');
document.addEventListener('dragover',e=>{if(carriesFiles(e))e.preventDefault()});
document.addEventListener('drop',e=>{const files=e.dataTransfer?.files,file=files?.[0];if(!file||e.target.closest('#wordEditor'))return;e.preventDefault();if(isPage())pageOpenFiles(files);else openFile(file)});
