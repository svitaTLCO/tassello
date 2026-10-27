// Scorciatoie globali: intercettate in cattura, prima dei gestori dei singoli controlli.
window.addEventListener('keydown',e=>{if(e.isComposing||overlayOpen())return;const ctx=focusContext();if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key==='/'){e.preventDefault();runCommand('shortcuts');return}const c=findShortcut(e,ctx);if(!c)return;e.preventDefault();e.stopPropagation();runCommand(c.id)},true);
$('skipWork').onclick=e=>{e.preventDefault();(I.bmp?$('photo'):$('planList')).focus()};
$('skipRibbon').onclick=e=>{e.preventDefault();$('tab-'+slug(currentTab))?.focus()};
// Pulsanti con data-action in tutta la pagina: barra multifunzione, vista, pannello e foto vuota.
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.closest('#menu'))return;runCommand(b.dataset.action)});
// Barra del titolo
$('switchImmagini').onclick=()=>setMode('immagini');$('switchDisegno').onclick=()=>setMode('disegno');
$('docTitle').addEventListener('input',()=>{updateTitle();schedulePersist()});
$('docTitle').addEventListener('keydown',ev=>{if(ev.key!=='Enter'&&ev.key!=='Escape')return;ev.preventDefault();(I.bmp?$('photo'):$('planList')).focus()});
$('quickUndo').onclick=()=>runCommand('undo');$('quickRedo').onclick=()=>runCommand('redo');$('saveTop').onclick=()=>runCommand('export');$('openTop').onclick=()=>runCommand('open');
$('paletteBtn').onclick=()=>runCommand('palette');$('kbdBtn').onclick=()=>runCommand('shortcuts');$('helpBtn').onclick=()=>runCommand('help');$('brandBtn').onclick=()=>runCommand('help');$('fileBtn').onclick=openFilePanel;
$('fileBtn').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();$('tab-'+slug(currentTab))?.focus()}});
// Schede (tablist con attivazione automatica)
$('tabs').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t&&t.dataset.tab!==currentTab)selectTab(t.dataset.tab)});
$('tabs').addEventListener('keydown',e=>{const t=e.target.closest('[role=tab]');if(!t)return;const list=$$('#tabs [role=tab]'),i=list.indexOf(t);let j=null;if(e.key==='ArrowRight')j=(i+1)%list.length;else if(e.key==='ArrowLeft'){if(i===0){e.preventDefault();$('fileBtn').focus();return}j=i-1}else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;if(j!==null){e.preventDefault();selectTab(list[j].dataset.tab);return}if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){e.preventDefault();focusables($('ribbon'))[0]?.focus()}});
// Barra multifunzione: frecce tra i pulsanti, Esc o freccia su per tornare alla scheda.
$('ribbon').addEventListener('keydown',e=>{const t=e.target,list=focusables($('ribbon')),i=list.indexOf(t);if(e.key==='Escape'||(e.key==='ArrowUp'&&!t.matches('select,input'))){e.preventDefault();$('tab-'+slug(currentTab))?.focus();return}if(i<0||t.matches('select'))return;let j=null;if(e.key==='ArrowRight')j=(i+1)%list.length;else if(e.key==='ArrowLeft')j=(i-1+list.length)%list.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;if(j!==null){e.preventDefault();list[j].focus()}});
// Vista della foto: frecce tra i pulsanti, come una barra degli strumenti.
$('viewbar').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const list=focusables($('viewbar')).filter(el=>el.matches('button')),i=list.indexOf(e.target);if(i<0)return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;list[j].focus()});
// Tooltip (si chiudono con Esc e non coprono il puntatore)
document.addEventListener('pointerover',e=>{if(e.target.closest?.('#tip'))return;const el=e.target.closest?.('[data-tip]');clearTimeout(tipTimer);if(!el){tip.hidden=true;return}tipTimer=setTimeout(()=>showTip(el),450)});
document.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-tip]');clearTimeout(tipTimer);tip.hidden=true;if(el&&el.matches(':focus-visible'))tipTimer=setTimeout(()=>showTip(el),350)});
document.addEventListener('pointerdown',hideTip,true);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip()},true);
// Ricerca comandi
$('palInput').addEventListener('input',renderPalette);
$('palInput').addEventListener('keydown',e=>{const n=palItems.length;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(n){palIdx=(palIdx+(e.key==='ArrowDown'?1:-1)+n)%n;palActive()}}else if(e.key==='Home'&&n){e.preventDefault();palIdx=0;palActive()}else if(e.key==='End'&&n){e.preventDefault();palIdx=n-1;palActive()}else if(e.key==='Enter'){e.preventDefault();palRun(palIdx)}else if(e.key==='Escape'){e.preventDefault();closePalette(true)}else if(e.key==='Tab')e.preventDefault()});
$('palList').addEventListener('click',e=>{const o=e.target.closest('[data-i]');if(o)palRun(Number(o.dataset.i))});
$('palettebg').addEventListener('mousedown',e=>{if(e.target===$('palettebg'))closePalette(true)});
// Menu contestuale
$('menu').addEventListener('keydown',e=>{const items=$$('#menu [role^=menuitem]:not([aria-disabled])'),i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()}else if(e.key==='Home'){e.preventDefault();items[0]?.focus()}else if(e.key==='End'){e.preventDefault();items.at(-1)?.focus()}else if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();closeMenu(true)}else if(e.key==='Enter'||e.key===' '){e.preventDefault();const b=document.activeElement.closest('[data-i]');if(b)menuRun(Number(b.dataset.i))}else if(e.key.length===1){const k=e.key.toLowerCase(),start=i+1,hit=[...items.slice(start),...items.slice(0,start)].find(b=>b.textContent.trim().toLowerCase().startsWith(k));hit?.focus()}});
$('menu').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)menuRun(Number(b.dataset.i))});
document.addEventListener('mousedown',e=>{if(menuState&&!e.target.closest('#menu'))closeMenu(false)},true);
// File
const takeFiles=input=>{const files=[...input.files];input.value='';return files};
$('fileInput').onchange=async e=>{const files=takeFiles(e.target);closeFilePanel(false);await openFiles(files)};
$('lutInput').onchange=async e=>{const [f]=takeFiles(e.target);closeFilePanel(false);if(f)await importLut(f)};
$('filepanel').addEventListener('click',e=>{const action=e.target.closest('[data-file-action]')?.dataset.fileAction;if(!action)return;closeFilePanel(true);if(action!=='close')runCommand(action)});
$('filepanel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFilePanel(true);return}if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target.closest('.file-side')){e.preventDefault();const l=$$('.file-side button'),i=l.indexOf(e.target);l[(i+(e.key==='ArrowDown'?1:-1)+l.length)%l.length].focus();return}trapTab(e,$('filepanel'))});
// Trascinare una foto sulla finestra la apre; un file .cube diventa un look.
let dragDepth=0;
addEventListener('dragenter',e=>{if(![...(e.dataTransfer?.types||[])].includes('Files'))return;e.preventDefault();if(++dragDepth===1)document.body.classList.add('drop-over')});
addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;document.body.classList.remove('drop-over')}});
addEventListener('dragover',e=>{if([...(e.dataTransfer?.types||[])].includes('Files'))e.preventDefault()});
addEventListener('drop',e=>{dragDepth=0;document.body.classList.remove('drop-over');const files=[...(e.dataTransfer?.files||[])];if(!files.length)return;e.preventDefault();if(overlayOpen())return;openFiles(files)});
// Piani: elenco con la voce attiva, Invio o clic per iniziare.
$('planList').addEventListener('keydown',e=>{const n=PLANS.length;let j=null;if(e.key==='ArrowDown')j=Math.min(n-1,planCursor+1);else if(e.key==='ArrowUp')j=Math.max(0,planCursor-1);else if(e.key==='Home')j=0;else if(e.key==='End')j=n-1;if(j!==null){e.preventDefault();movePlanCursor(j);return}if(e.key==='Enter'||e.key===' '){e.preventDefault();choosePlan(PLANS[planCursor].id)}});
$('planList').addEventListener('click',e=>{const o=e.target.closest('[data-plan]');if(!o)return;planCursor=PLANS.findIndex(p=>p.id===o.dataset.plan);choosePlan(o.dataset.plan);$('planList').focus()});
// Pannello delle regolazioni: il cursore cambia l'anteprima mentre si sposta e diventa una modifica quando si rilascia.
$('adjBody').addEventListener('input',e=>{const el=e.target;if(el.type!=='range'||!el.dataset.ctl||!I.bmp)return;ctlDef(el.dataset.ctl).set(I.r,Number(el.value));syncPanel();requestRender(true)});
$('adjBody').addEventListener('change',e=>{const el=e.target,id=el.dataset.ctl;if(!id||!I.bmp)return;if(el.tagName==='SELECT'){if(id==='ratio')setRatio(el.value);else setLook(el.value);return}settle(ctlDef(id).label)});
$('adjBody').addEventListener('keydown',e=>{const el=e.target;if(el.type!=='range'||!(e.key==='Delete'||e.key==='Backspace'))return;e.preventDefault();resetControl(el.dataset.ctl)});
$('adjBody').addEventListener('click',e=>{const b=e.target.closest('[data-reset]');if(b){const id=b.dataset.reset;resetControl(id);$('ctl-'+id)?.focus()}});
$('adjBody').addEventListener('dblclick',e=>{const l=e.target.closest('.adj label');if(l)resetControl(l.closest('.adj').dataset.ctl)});
function resetControl(id){const c=ctlDef(id);if(!c||!I.bmp||c.get(I.r)===zeroOf(id))return;c.set(I.r,zeroOf(id));settle(c.label+' al valore iniziale');announce(`${c.label}: ${c.fmt(zeroOf(id))}`)}
// La foto: menu con Maiusc+F10, il tasto Menu o il clic destro.
photoCv.addEventListener('keydown',e=>{if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();const r=photoCv.getBoundingClientRect();photoMenu(r.left+20,r.top+20)}});
photoCv.addEventListener('contextmenu',e=>{e.preventDefault();photoMenu(e.clientX,e.clientY)});
// Se cambia lo spazio disponibile, l'anteprima si ricalcola alla nuova misura.
new ResizeObserver(()=>{if(I.bmp)requestRender();drawHist()}).observe($('stage'));
