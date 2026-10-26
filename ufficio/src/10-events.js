// Scorciatoie globali: intercettate in cattura, prima dei gestori dei singoli controlli.
window.addEventListener('keydown',e=>{if(e.isComposing||overlayOpen())return;const ctx=focusContext();if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key==='/'){e.preventDefault();runCommand('shortcuts');return}if(e.key==='F5'&&!isWord()&&ctx==='grid'&&!e.ctrlKey&&!e.shiftKey){e.preventDefault();runCommand('goto');return}const c=findShortcut(e,ctx);if(!c)return;e.preventDefault();e.stopPropagation();runCommand(c.id)},true);
$('skipDoc').onclick=e=>{e.preventDefault();isWord()?restoreWordFocus():$('gridScroll').focus()};
$('skipRibbon').onclick=e=>{e.preventDefault();$('tab-'+slug(currentTab))?.focus()};
// Barra del titolo
$('switchWord').onclick=()=>setMode('word');$('switchExcel').onclick=()=>setMode('excel');
$('docTitle').addEventListener('input',e=>{if(isWord())state.wordTitle=e.target.value;else state.excelTitle=e.target.value;updateTitle();schedulePersist()});
$('docTitle').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key==='Escape'){e.preventDefault();isWord()?restoreWordFocus():$('gridScroll').focus()}});
for(const id of ['quickUndo','quickRedo','saveTop'])$(id).addEventListener('mousedown',e=>{if(isWord())e.preventDefault()});
$('quickUndo').onclick=()=>runCommand('undo');$('quickRedo').onclick=()=>runCommand('redo');$('saveTop').onclick=()=>runCommand('save');$('openTop').onclick=()=>runCommand('open');
$('paletteBtn').onclick=()=>runCommand('palette');$('kbdBtn').onclick=()=>runCommand('shortcuts');$('helpBtn').onclick=()=>runCommand('help');$('fileBtn').onclick=openFilePanel;
$('fileBtn').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();$('tab-'+slug(currentTab))?.focus()}});
// Schede (tablist con attivazione automatica)
$('tabs').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t&&t.dataset.tab!==currentTab)selectTab(t.dataset.tab)});
$('tabs').addEventListener('keydown',e=>{const t=e.target.closest('[role=tab]');if(!t)return;const list=$$('#tabs [role=tab]'),i=list.indexOf(t);let j=null;if(e.key==='ArrowRight')j=(i+1)%list.length;else if(e.key==='ArrowLeft'){if(i===0){e.preventDefault();$('fileBtn').focus();return}j=i-1}else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;if(j!==null){e.preventDefault();selectTab(list[j].dataset.tab);return}if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){e.preventDefault();focusables($('ribbon'))[0]?.focus()}});
// Barra multifunzione
$('ribbon').addEventListener('mousedown',e=>{if(isWord()&&e.target.closest('button[data-action]'))e.preventDefault()});
$('ribbon').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b)runCommand(b.dataset.action)});
$('ribbon').addEventListener('change',e=>{const t=e.target,id=t.id;if(id==='fontFamily'){changeFont(t.value);announce('Carattere '+t.value)}else if(id==='fontSize'){changeFontSize(t.value);announce('Dimensione '+t.value)}else if(id==='numberFormat'){applyCellsStyle('fmt',t.value);announce('Formato '+t.value)}else if(COLORS[id]){lastColor[id]=t.value;$$(`[data-swatch="${id}"]`).forEach(s=>s.style.background=t.value);changeColor(id==='fontColor'?'fontColor':'fillColor',t.value);announce('Colore applicato '+t.value)}else if(id in{docFont:1,lineSpacing:1,paraSpacing:1}){state.doc[{docFont:'font',lineSpacing:'line',paraSpacing:'space'}[id]]=t.value;applyDocStyle();updateWordStats();schedulePersist();announce(t.selectedOptions[0]?.text||t.value)}else return;if(t.isConnected)t.focus({preventScroll:true})});
$('ribbon').addEventListener('keydown',e=>{const t=e.target,list=focusables($('ribbon')),i=list.indexOf(t);if(e.key==='Escape'||(e.key==='ArrowUp'&&!t.matches('select,input'))){e.preventDefault();$('tab-'+slug(currentTab))?.focus();return}if(i<0||t.matches('select'))return;let j=null;if(e.key==='ArrowRight')j=(i+1)%list.length;else if(e.key==='ArrowLeft')j=(i-1+list.length)%list.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;if(j!==null){e.preventDefault();list[j].focus()}});
// Tooltip (si chiudono con Esc e non coprono il puntatore)
document.addEventListener('pointerover',e=>{if(e.target.closest?.('#tip'))return;const el=e.target.closest?.('[data-tip]');clearTimeout(tipTimer);if(!el){tip.hidden=true;return}tipTimer=setTimeout(()=>showTip(el),450)});
document.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-tip]');clearTimeout(tipTimer);tip.hidden=true;if(el&&el.matches(':focus-visible,:focus-within'))tipTimer=setTimeout(()=>showTip(el),350)});
document.addEventListener('pointerdown',hideTip,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip()},true);
// File
$('fileInput').onchange=async e=>{const f=e.target.files[0];e.target.value='';closeFilePanel(false);if(f)await openFile(f)};
$('imageInput').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)readImage(f)};
$('filepanel').addEventListener('click',e=>{const b=e.target.closest('[data-file-action]');if(!b)return;const a=b.dataset.fileAction;closeFilePanel(true);switch(a){case 'new':runCommand('new');break;case 'open':$('fileInput').click();break;case 'save':runCommand('save');break;case 'backup':projectBackup();break;case 'export':runCommand(isWord()?'exportHtml':'exportCSV');break;case 'print':window.print();break;case 'shortcuts':runCommand('shortcuts');break;case 'templates':runCommand('templates');break;case 'versions':runCommand('versionHistory');break;case 'help':runCommand('help')}});
$('filepanel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFilePanel(true);return}if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target.closest('.file-side')){e.preventDefault();const l=$$('.file-side button'),i=l.indexOf(e.target);l[(i+(e.key==='ArrowDown'?1:-1)+l.length)%l.length].focus();return}trapTab(e,$('filepanel'))});
// Stato e zoom
$('zoomSlider').addEventListener('input',e=>setZoom(e.target.value));$('zoomMinus').onclick=()=>runCommand('zoomDown');$('zoomPlus').onclick=()=>runCommand('zoomUp');$('brandBtn').onclick=()=>runCommand('help');
// Editor Word
const ed=$('wordEditor');let findTimer;
ed.addEventListener('input',()=>{wordChanged();if(!$('findbar').hidden&&find.query){clearTimeout(findTimer);findTimer=setTimeout(()=>runFind(find.matches[find.idx]?.start??null),300)}});
document.addEventListener('selectionchange',()=>{if(isWord()&&document.activeElement===ed&&inEditor()){wordSelectionSave();refreshToggles()}});
ed.addEventListener('paste',e=>{const files=[...(e.clipboardData?.files||[])].filter(f=>/^image\//.test(f.type));if(files.length){e.preventDefault();readImage(files[0]);return}const html=e.clipboardData.getData('text/html');if(html){e.preventDefault();insertHtmlAtSelection(sanitizeHTML(html))}});
ed.addEventListener('drop',e=>{const files=e.dataTransfer?.files;if(files?.length){e.preventDefault();if(/^image\//.test(files[0].type))readImage(files[0]);else openFile(files[0])}});
ed.addEventListener('click',e=>{if(e.target.tagName==='IMG'){const r=document.createRange();r.selectNode(e.target);const s=getSelection();s.removeAllRanges();s.addRange(r);wordSelectionSave()}});
ed.addEventListener('keydown',e=>{if(e.key==='Escape'){tabExitArmed=true;announce('Premi Tab per uscire dal documento');return}if(e.key!=='Tab'||e.ctrlKey||e.altKey||e.metaKey){if(e.key!=='Shift')tabExitArmed=false;return}if(tabExitArmed){tabExitArmed=false;return}const el=anchorEl(),td=el?.closest('td,th'),li=el?.closest('li');if(td&&ed.contains(td)){e.preventDefault();moveTableCell(td,e.shiftKey?-1:1);return}if(li&&ed.contains(li)){e.preventDefault();wordCmd(e.shiftKey?'outdent':'indent');announce(e.shiftKey?'Livello dell’elenco ridotto':'Livello dell’elenco aumentato')}else if(!e.shiftKey&&!reading){e.preventDefault();insertTab()}});
// Barra della formula
$('nameBox').addEventListener('focus',e=>e.target.select());
$('nameBox').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();gotoRef(e.target.value)}else if(e.key==='Escape'){e.preventDefault();syncFormula();$('gridScroll').focus()}});
$('formulaInput').addEventListener('focus',()=>{const fi=$('formulaInput');fi.classList.remove('ghost');fi.removeAttribute('aria-description');fi.value=editText(state.sel.r,state.sel.c)});
$('formulaInput').addEventListener('keydown',e=>{if(e.key==='Tab'&&!e.shiftKey&&fxAccept(e.target)){e.preventDefault();return}if(e.key==='Enter'||e.key==='Escape')hideFxHint();if(e.key==='Enter'){e.preventDefault();const {r,c}=state.sel;if(e.target.value!==editText(r,c))commitValue(r,c,e.target.value);$('gridScroll').focus();moveCell(1,0)}else if(e.key==='Escape'){e.preventDefault();e.target.value=editText(state.sel.r,state.sel.c);$('gridScroll').focus();announce('Modifica annullata')}});
// Griglia Excel
const gs=$('gridScroll');
gs.addEventListener('scroll',()=>{renderGrid(false);const gi=$('gridInput');if(gi.style.display==='block'){const td=$(`c${gi.dataset.r}_${gi.dataset.c}`);if(td){const bb=td.getBoundingClientRect();gi.style.left=bb.left+'px';gi.style.top=bb.top+'px'}}});
window.addEventListener('resize',()=>renderGrid());
$('grid').addEventListener('mousedown',e=>{if(e.button!==0)return;const td=e.target.closest('td[data-r]');if(td){e.preventDefault();finishCell(false,false);if(e.shiftKey)setSelection(state.sel.r,state.sel.c,+td.dataset.r,+td.dataset.c);else setSelection(+td.dataset.r,+td.dataset.c);sheetDrag=true;gs.focus({preventScroll:true});return}const col=e.target.closest('th[data-col]'),row=e.target.closest('th[data-rhead]'),corner=e.target.closest('th[data-corner]');if(!col&&!row&&!corner)return;e.preventDefault();finishCell(false,false);if(corner)setSelection(0,0,ROWS-1,COLS-1);else if(col){const c=+col.dataset.col;e.shiftKey?setSelection(0,state.sel.c,ROWS-1,c):setSelection(0,c,ROWS-1,c)}else{const r=+row.dataset.rhead;e.shiftKey?setSelection(state.sel.r,0,r,COLS-1):setSelection(r,0,r,COLS-1)}gs.focus({preventScroll:true})});
$('grid').addEventListener('mouseover',e=>{if(!sheetDrag)return;const td=e.target.closest('td[data-r]');if(td)setSelection(state.sel.r,state.sel.c,+td.dataset.r,+td.dataset.c)});window.addEventListener('mouseup',()=>sheetDrag=false);
$('grid').addEventListener('dblclick',e=>{const td=e.target.closest('td[data-r]');if(td)editCell(+td.dataset.r,+td.dataset.c)});
$('grid').addEventListener('contextmenu',e=>{const td=e.target.closest('td[data-r]');if(!td)return;e.preventDefault();const r=+td.dataset.r,c=+td.dataset.c,b=selectedBounds();if(r<b.r1||r>b.r2||c<b.c1||c>b.c2)setSelection(r,c);gs.focus({preventScroll:true});cellMenu(e.clientX,e.clientY)});
gs.addEventListener('keydown',e=>{if(isWord()||e.target!==gs||e.defaultPrevented)return;const k=e.key,shift=e.shiftKey,ctrl=e.ctrlKey||e.metaKey,altgr=e.getModifierState?.('AltGraph')||(e.ctrlKey&&e.altKey),{r,c}=state.sel;
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
gs.addEventListener('copy',e=>{e.preventDefault();e.clipboardData.setData('text/plain',buildTsv());announce('Celle copiate')});
gs.addEventListener('cut',e=>{e.preventDefault();e.clipboardData.setData('text/plain',buildTsv());clearCells('contents');announce('Celle tagliate')});
gs.addEventListener('paste',e=>{e.preventDefault();pasteTsv(e.clipboardData.getData('text/plain'))});
const gi=$('gridInput');
gi.addEventListener('keydown',e=>{e.stopPropagation();const k=e.key;if(k==='Tab'&&!e.shiftKey&&fxAccept(gi)){e.preventDefault();return}if(k==='Enter'&&e.altKey){e.preventDefault();document.execCommand('insertLineBreak');gi.dataset.enter='';return}if(k==='Enter'){e.preventDefault();finishCell();moveCell(e.shiftKey?-1:1,0)}else if(k==='Tab'){e.preventDefault();finishCell();moveCell(0,e.shiftKey?-1:1)}else if(k==='Escape'){e.preventDefault();finishCell(true);announce('Modifica annullata')}else if(k==='F2'){e.preventDefault();gi.dataset.enter=gi.dataset.enter?'':'1';announce(gi.dataset.enter?'Immissione: le frecce confermano e spostano':'Modifica: le frecce muovono il cursore')}else if(gi.dataset.enter&&!gi.textContent.startsWith('=')&&!e.shiftKey&&!e.ctrlKey&&['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(k)){e.preventDefault();finishCell();const d={ArrowDown:[1,0],ArrowUp:[-1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]}[k];moveCell(d[0],d[1])}});
gi.addEventListener('blur',()=>{if(gi.style.display==='block')finishCell(false,false)});
for(const el of [gi,$('formulaInput')]){el.addEventListener('input',()=>queueFxHint(el));el.addEventListener('click',()=>queueFxHint(el));el.addEventListener('keyup',e=>{if(/^(Arrow|Home|End)/.test(e.key))queueFxHint(el)})}
$('formulaInput').addEventListener('blur',()=>setTimeout(()=>{if(fxHintState.el===$('formulaInput'))hideFxHint()},0));
// Linguette dei fogli (tablist)
const sheetIdx=e=>{const b=e.target.closest('[data-sheet]');return b?+b.dataset.sheet:-1};
$('sheetTabs').addEventListener('click',e=>{const i=sheetIdx(e);if(i>=0&&i!==state.sheet)switchSheet(i,true)});
$('sheetTabs').addEventListener('dblclick',e=>{const i=sheetIdx(e);if(i>=0)renameSheet(i)});
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
document.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes('Files'))e.preventDefault()});
document.addEventListener('drop',e=>{if(e.target.closest('#wordEditor'))return;if(e.dataTransfer?.files?.length){e.preventDefault();openFile(e.dataTransfer.files[0])}});
