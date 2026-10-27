// Scorciatoie globali: intercettate in cattura, prima dei gestori dei singoli controlli.
window.addEventListener('keydown',e=>{if(e.isComposing||overlayOpen())return;if(e.key==='MediaPlayPause'){e.preventDefault();runCommand('playPause');return}const ctx=focusContext();if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key==='/'){e.preventDefault();runCommand('shortcuts');return}const c=findShortcut(e,ctx);if(!c)return;e.preventDefault();e.stopPropagation();runCommand(c.id)},true);
$('skipWork').onclick=e=>{e.preventDefault();(isAudio()?$('wave'):($(lastTrack)||playheadEl)).focus()};
$('skipRibbon').onclick=e=>{e.preventDefault();$('tab-'+slug(currentTab))?.focus()};
// Pulsanti con data-action in tutta la pagina: barra multifunzione, trasporto, riquadri e finestre vuote.
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||b.closest('#menu'))return;runCommand(b.dataset.action)});
// Barra del titolo
for(const [id,mode] of [['switchAudio','audio'],['switchVideo','video']])$(id).onclick=()=>setMode(mode);
$('docTitle').addEventListener('input',e=>{const v=e.target.value;if(isAudio())A.title=v;else{V.p.title=v}updateTitle();schedulePersist()});
$('docTitle').addEventListener('keydown',ev=>{if(ev.key!=='Enter'&&ev.key!=='Escape')return;ev.preventDefault();(isAudio()?$('wave'):($(lastTrack)||playheadEl)).focus()});
$('quickUndo').onclick=()=>runCommand('undo');$('quickRedo').onclick=()=>runCommand('redo');$('saveTop').onclick=()=>runCommand(isAudio()?'saveAudio':'saveProject');$('openTop').onclick=()=>runCommand('open');
$('paletteBtn').onclick=()=>runCommand('palette');$('kbdBtn').onclick=()=>runCommand('shortcuts');$('helpBtn').onclick=()=>runCommand('help');$('brandBtn').onclick=()=>runCommand('help');$('fileBtn').onclick=openFilePanel;
$('fileBtn').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();$('tab-'+slug(currentTab))?.focus()}});
// Schede (tablist con attivazione automatica)
$('tabs').addEventListener('click',e=>{const t=e.target.closest('[data-tab]');if(t&&t.dataset.tab!==currentTab)selectTab(t.dataset.tab)});
$('tabs').addEventListener('keydown',e=>{const t=e.target.closest('[role=tab]');if(!t)return;const list=$$('#tabs [role=tab]'),i=list.indexOf(t);let j=null;if(e.key==='ArrowRight')j=(i+1)%list.length;else if(e.key==='ArrowLeft'){if(i===0){e.preventDefault();$('fileBtn').focus();return}j=i-1}else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;if(j!==null){e.preventDefault();selectTab(list[j].dataset.tab);return}if(e.key==='ArrowDown'||e.key==='Enter'||e.key===' '){e.preventDefault();focusables($('ribbon'))[0]?.focus()}});
// Barra multifunzione: frecce tra i pulsanti, Esc o freccia su per tornare alla scheda.
$('ribbon').addEventListener('keydown',e=>{const t=e.target,list=focusables($('ribbon')),i=list.indexOf(t);if(e.key==='Escape'||(e.key==='ArrowUp'&&!t.matches('select,input'))){e.preventDefault();$('tab-'+slug(currentTab))?.focus();return}if(i<0||t.matches('select'))return;let j=null;if(e.key==='ArrowRight')j=(i+1)%list.length;else if(e.key==='ArrowLeft')j=(i-1+list.length)%list.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;if(j!==null){e.preventDefault();list[j].focus()}});
// Barre di trasporto: frecce tra i pulsanti, come una barra degli strumenti.
for(const id of ['aTransport','vTransport'])$(id).addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||e.target.matches('select,input'))return;const list=focusables($(id)).filter(el=>el.matches('button')),i=list.indexOf(e.target);if(i<0)return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?list.length-1:(i+(e.key==='ArrowRight'?1:-1)+list.length)%list.length;list[j].focus()});
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
$('fileInput').onchange=async e=>{const files=takeFiles(e.target);closeFilePanel(false);await openFiles(files);pickMode='open'};
$('mediaInput').onchange=async e=>{const files=takeFiles(e.target);closeFilePanel(false);if(files.length)await importMedia(files)};
$('textInput').onchange=e=>{const [f]=takeFiles(e.target);if(!f)return;if(pickMode==='labels')importLabelsFile(f);else importSubsFile(f);pickMode='open'};
$('filepanel').addEventListener('click',e=>{const action=e.target.closest('[data-file-action]')?.dataset.fileAction;if(!action)return;closeFilePanel(true);if(action!=='close')runCommand(action)});
$('filepanel').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();closeFilePanel(true);return}if((e.key==='ArrowDown'||e.key==='ArrowUp')&&e.target.closest('.file-side')){e.preventDefault();const l=$$('.file-side button'),i=l.indexOf(e.target);l[(i+(e.key==='ArrowDown'?1:-1)+l.length)%l.length].focus();return}trapTab(e,$('filepanel'))});
// Trascinare i file sulla finestra li apre (Audio) o li importa nella raccolta (Video).
let dragDepth=0;
addEventListener('dragenter',e=>{if(![...(e.dataTransfer?.types||[])].includes('Files'))return;e.preventDefault();if(++dragDepth===1)document.body.classList.add('drop-over')});
addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;document.body.classList.remove('drop-over')}});
addEventListener('dragover',e=>{if([...(e.dataTransfer?.types||[])].includes('Files'))e.preventDefault()});
addEventListener('drop',e=>{dragDepth=0;document.body.classList.remove('drop-over');const files=[...(e.dataTransfer?.files||[])];if(!files.length)return;e.preventDefault();if(overlayOpen())return;pickMode='open';openFiles(files)});
// Zoom della barra di stato: forma d'onda in Audio, linea temporale in Video.
$('zoomSlider').addEventListener('input',e=>{const v=Number(e.target.value);isAudio()?sliderToZoom(v):sliderToTimelineZoom(v)});
$('zoomMinus').onclick=()=>runCommand('zoomOut');$('zoomPlus').onclick=()=>runCommand('zoomIn');
tlScroll.addEventListener('scroll',()=>updateTimelineZoomUI());
// Anteprima video: Spazio avvia e ferma, le frecce spostano di un fotogramma.
view.addEventListener('keydown',e=>{if(timelineKeys(e,null))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();frameStep(e.key==='ArrowRight'?1:-1);announce(fmtTC(V.t,V.p.fps))}});
view.addEventListener('click',()=>vPlayPause());
// Prima di chiudere: avviso se un'esportazione è in corso o se l'audio non è entrato nella bozza.
addEventListener('beforeunload',e=>{if(VE.exp||(A.buf&&alen()*A.nch*4>DRAFT_LIMIT&&audioModified())){e.preventDefault();e.returnValue=''}});
