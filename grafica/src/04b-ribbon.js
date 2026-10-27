// Barra: gli strumenti di tutti i giorni restano in vista, le categorie sono cassetti che si aprono sopra il lavoro
// e si richiudono dopo il comando. Ogni cassetto elenca per gruppi i comandi del registro.
const RIBBON={
 i:{Inizio:[['Foto','open export'],['Regolazioni','auto compare resetAll readStatus'],['Piano','planMenu stepPrev stepNext planFree'],['Cronologia','undo redo']],
  Inquadra:[['Ruota','rotateLeft rotateRight flipH'],['Formato','ratioMenu straighten resetGeometry']],
  Look:[['Look','lookMenu lutImport lookAmount lookOff']],
  Vista:[['Confronto','compare'],['Tasselli','showPlans showAdjust layoutMenu layoutReset'],['Tema','themeDark contrast'],['Guida','shortcuts palette help']]},
 d:{Inizio:[['Disegno','openDraw saveSvg exportDraw'],['Appunti','paste cut copy duplicateItem'],['Inserisci','addText addImage addRect addEllipse'],['Cronologia','undo redo']],
  Inserisci:[['Forme','addRect addEllipse addPolygon addStar addArrow addBubble'],['Linee','addLine addArrowLine'],['Testo','addText'],['Immagini','addImage']],
  Disegna:[['Strumenti','toolSelect toolNodes toolPen toolPencil toolBrush toolEraser'],['Nodi','nodeAdd nodeDelete nodeType pathClose readPath toPath']],
  Disponi:[['Scelta','selectAll groupItems ungroupItems lockItems hideItems'],['Ordine','bringFront sendBack forward backward'],['Allinea','alignLeft alignCenter alignRight alignTop alignMiddle alignBottom'],['Distribuisci','distH distV smartGuides'],['Oggetto','duplicateItem deleteItem readDraw']],
  Stile:[['Riempimento ed effetti','gradientItem shadowItem'],['Testo','textOnPath textOffPath']],
  Foglio:[['Foglio','sheetSize sheetDesc newDraw'],['Accessibilità','a11yCheck']],
  Vista:[['Zoom','zoomIn zoomOut zoomFit'],['Tasselli','showLayers showProps layoutMenu layoutReset'],['Tema','themeDark contrast'],['Guida','shortcuts palette help']]}};
const TABS={i:Object.keys(RIBBON.i),d:Object.keys(RIBBON.d)};
// Strumenti sempre in vista. "|" separa i gruppi; con "|1" e "|2" il gruppo che segue sparisce quando la barra è
// stretta (prima 1, poi 2), ma i suoi comandi restano nei cassetti e nella ricerca.
const QUICK={i:'undo redo |2 rotateLeft rotateRight flipH |1 auto compare',
 d:'undo redo |2 addRect addEllipse addLine addText |1 bringFront sendBack duplicateItem deleteItem'};
const slug=s=>s.replace(/\s+/g,'-');
function tipText(c){const k=keysOf(c);return c.label+(k?' ('+k+')':'')}
const cmdAttrs=c=>{const k=keysOf(c);return (c.toggle?` aria-pressed="${!!safe(c.toggle)}"`:'')+(k?` aria-keyshortcuts="${esc(ariaKeys(k))}"`:'')+(c.menu?' aria-haspopup="menu" aria-expanded="false"':'')};
function renderQuick(){let hide='';$('quick').innerHTML=QUICK[state.mode[0]].split(' ').map(id=>{if(id[0]==='|'){hide=id.length>1?' h'+id.slice(1):'';return `<span class="tsep${hide}" aria-hidden="true"></span>`}const c=C[id];if(!c||!available(c))return '';
 return `<button type="button" class="tb icon${hide}" data-action="${id}"${cmdAttrs(c)} aria-label="${esc(c.label)}" data-tip="${esc(tipText(c))}">${ICON(c.icon)}</button>`}).join('')}
function renderDrawers(){$('drawers').innerHTML=TABS[state.mode[0]].map(x=>`<button type="button" class="tb drw" id="drw-${slug(x)}" data-drawer="${esc(x)}" aria-expanded="false" aria-controls="drawer">${esc(x)}${ICON('down','ico chev')}</button>`).join('')}
function renderBar(){closeDrawer(false);renderQuick();renderDrawers();fitTools()}
// Se la barra non basta, spariscono prima i gruppi segnati con 1, poi quelli segnati con 2; se non basta ancora,
// gli strumenti vanno a capo su una riga loro. Si ricalcola sempre da zero, così il risultato dipende solo dalla larghezza.
function fitTools(){const t=$('tools'),bar=$('bar'),fit=()=>{t.classList.remove('fit1','fit2');for(const c of ['fit1','fit2']){if(t.scrollWidth<=t.clientWidth)break;t.classList.add(c)}};
 bar.classList.remove('wrap');fit();if(t.scrollWidth>t.clientWidth){bar.classList.add('wrap');fit()}toolsRoving();placeDrawer()}
new ResizeObserver(()=>fitTools()).observe($('tools'));
// Una sola fermata di Tab per tutta la barra degli strumenti: le frecce passano da un pulsante all'altro.
let toolFocus=0;
const toolItems=()=>focusables($('tools'));
function toolsRoving(){const l=toolItems();if(!l.length)return;toolFocus=clamp(toolFocus,0,l.length-1);l.forEach((b,i)=>b.tabIndex=i===toolFocus?0:-1)}
// Cassetto aperto: un gruppo di tasselli sotto la barra. Dopo il comando si torna dove si stava lavorando.
let drawerName=null,drawerOpenedAt=0,lastWork=null;
document.addEventListener('focusin',e=>{if(e.target.closest?.('#workRegion'))lastWork=e.target});
function drawerItem(id){const c=C[id];if(!c||!available(c))return '';const k=keysOf(c),short=c.short||c.label;
 return `<button type="button" class="ditem" data-action="${id}"${cmdAttrs(c)}${short!==c.label?` data-tip="${esc(c.label)}"`:''}>${ICON(c.icon)}<span class="lbl">${esc(short)}${short!==c.label?`<span class="sr-only">: ${esc(c.label)}</span>`:''}</span>${c.toggle?'<span class="dstate" aria-hidden="true"></span>':''}${k?`<kbd aria-hidden="true">${esc(k.split(' / ')[0])}</kbd>`:''}</button>`}
function openDrawer(name,focus=false){const groups=RIBBON[state.mode[0]][name],btn=$('drw-'+slug(name)),d=$('drawer');if(!groups||!btn)return;hideTip();closeMenu(false);drawerName=name;drawerOpenedAt=performance.now();
 d.setAttribute('aria-labelledby',btn.id);
 d.innerHTML=`<div class="drawer-grid" style="--cols:${groups.length<=4?groups.length:3}">${groups.map(([g,spec],gi)=>`<div class="dgroup" role="group" aria-labelledby="dg${gi}"><h3 id="dg${gi}">${esc(g)}</h3>${spec.split(' ').map(drawerItem).join('')}</div>`).join('')}</div>`;
 d.hidden=false;for(const b of $$('#drawers [data-drawer]'))b.setAttribute('aria-expanded',b===btn);placeDrawer();if(focus)d.querySelector('.ditem')?.focus()}
function placeDrawer(){if(!drawerName)return;const d=$('drawer'),r=$('drw-'+slug(drawerName)).getBoundingClientRect();d.style.top=($('bar').getBoundingClientRect().bottom+8)+'px';d.style.left=Math.max(8,Math.min(r.left-8,innerWidth-d.offsetWidth-8))+'px'}
function closeDrawer(restore=true){if(!drawerName)return;const btn=$('drw-'+slug(drawerName)),d=$('drawer');drawerName=null;d.hidden=true;d.innerHTML='';btn?.setAttribute('aria-expanded','false');if(restore)btn?.focus()}
function drawerRun(b){const id=b.dataset.action;if(C[id]?.menu){runCommand(id);return}const back=lastWork?.isConnected&&lastWork.offsetParent?lastWork:null;closeDrawer(!back);back?.focus({preventScroll:true});runCommand(id)}
$('drawers').addEventListener('click',e=>{const b=e.target.closest('[data-drawer]');if(!b)return;if(drawerName!==b.dataset.drawer)openDrawer(b.dataset.drawer);else if(performance.now()-drawerOpenedAt>400)closeDrawer(false)});
$('drawers').addEventListener('keydown',e=>{const b=e.target.closest('[data-drawer]');if(!b)return;if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();openDrawer(b.dataset.drawer,true)}else if(e.key==='Escape'&&drawerName){e.preventDefault();closeDrawer(true)}});
$('tools').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const l=toolItems(),i=l.indexOf(document.activeElement);if(i<0)return;e.preventDefault();l[e.key==='Home'?0:e.key==='End'?l.length-1:(i+(e.key==='ArrowRight'?1:-1)+l.length)%l.length].focus()});
// Con un cassetto aperto, le frecce sulla barra aprono il cassetto vicino, come in un menu.
$('tools').addEventListener('focusin',e=>{const l=toolItems(),i=l.indexOf(e.target);if(i<0)return;toolFocus=i;l.forEach((b,k)=>b.tabIndex=k===i?0:-1);e.target.scrollIntoView({block:'nearest',inline:'nearest'});
 if(drawerName){const n=e.target.dataset.drawer;if(!n)closeDrawer(false);else if(n!==drawerName)openDrawer(n)}});
$('drawer').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDrawer(true);return}const items=$$('#drawer .ditem'),i=items.indexOf(document.activeElement);if(i<0)return;
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const gs=$$('#drawer .dgroup'),g=gs.indexOf(items[i].closest('.dgroup'));const first=gs[(g+(e.key==='ArrowRight'?1:-1)+gs.length)%gs.length]?.querySelector('.ditem');if(first){e.preventDefault();first.focus()}return}
 const j=e.key==='ArrowDown'?(i+1)%items.length:e.key==='ArrowUp'?(i-1+items.length)%items.length:e.key==='Home'?0:e.key==='End'?items.length-1:null;if(j!==null){e.preventDefault();items[j].focus()}});
$('drawer').addEventListener('focusout',e=>{const to=e.relatedTarget;if(drawerName&&to&&!to.closest('#drawer,#drawers,#menu'))closeDrawer(false)});
document.addEventListener('pointerdown',e=>{if(drawerName&&!e.target.closest('#drawer,#drawers,#menu'))closeDrawer(false)},true);
addEventListener('resize',fitTools);
