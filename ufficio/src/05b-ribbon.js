// Barra: gli strumenti di tutti i giorni restano in vista, le schede di una volta sono cassetti che si aprono sopra il lavoro.
// Nei cassetti ogni gruppo di RIBBON diventa un elenco: "!", "^", "&", "%" e il suffisso "+" valgono come comandi semplici,
// "#" è un elenco a discesa con la sua etichetta, "@" un colore, "/" non conta.
const FONTS=['Calibri','Aptos','Arial','Cambria','Georgia','Segoe UI','Tahoma','Times New Roman','Verdana','Consolas'];
const SELECTS={fontFamily:{label:'Tipo di carattere',w:136,opts:FONTS},fontSize:{label:'Dimensione carattere',w:62,opts:[8,9,10,11,12,14,16,18,20,24,28,36,48,72].map(String)},numberFormat:{label:'Formato numero',w:124,opts:['Generale','Numero','Valuta','Percentuale','Data','Ora','Data e ora','Testo']},docFont:{label:'Carattere del documento',w:150,opts:FONTS},lineSpacing:{label:'Interlinea',w:130,opts:[['1','Interlinea 1,0'],['1.15','Interlinea 1,15'],['1.5','Interlinea 1,5'],['2','Interlinea 2,0']]},paraSpacing:{label:'Spazio dopo il paragrafo',w:150,opts:[['0','Spazio dopo 0 pt'],['6','Spazio dopo 6 pt'],['8','Spazio dopo 8 pt'],['12','Spazio dopo 12 pt'],['18','Spazio dopo 18 pt']]}};
const COLORS={fontColor:{icon:'t:A',apply:'fontColorApply',pick:'Scegli il colore del carattere'},hiliteColor:{icon:'highlight',apply:'hiliteColorApply',pick:'Scegli il colore di evidenziazione'},fillColor:{icon:'fill',apply:'fillColorApply',pick:'Scegli il colore di riempimento'}};
const RIBBON={
 w:{Inizio:[['Appunti','!paste cut pasteSpecial / copy formatPainter'],['Carattere','#fontFamily #fontSize fontGrow fontShrink caseMenu fontDialog / bold italic underline strikeThrough subscript superscript @fontColor @hiliteColor clearFormat'],['Paragrafo','&insertUnorderedList:bulletMenu &insertOrderedList:numberMenu listMulti outdent indent showMarks / justifyLeft justifyCenter justifyRight justifyFull lineMenu paraDialog paraBorders'],['Stili','%formatP %formatTitle %formatH1 %formatH2 %formatH3 %formatQuote !stylesMenu !styleManage'],['Modifica','!find !replace']],
  Inserisci:[['Pagine','!pageBreak !breaksMenu'],['Tabelle','!insertTable'],['Illustrazioni','!insertImage !imgFormat imgGrow+ / imgShrink+ !imgAlt !wordChart'],['Collegamenti','!insertLink !bookmark !crossRef'],['Commenti','!cmtNew'],['Intestazione e piè di pagina','!headerFooter !pageNumbers'],['Testo','!textBox !insertHr !symbol !dateTime !dropCap'],['Simboli','!equation'],['Moduli','!controlsMenu ccCheck+ ccDrop+ / ccDate+ ccText+ !formFill']],
  Aspetto:[['Formattazione del documento','#docFont / #lineSpacing #paraSpacing'],['Ripristina','!docReset'],['Modelli','!templates'],['Stili','%formatP %formatTitle %formatSubtitle %formatH1 %formatH2 %formatH3 %formatH4 %formatQuote !stylesMenu !styleManage !newStyle'],['Sfondo pagina','!watermark !pageColor !pageBorder']],
  Pagina:[['Imposta pagina','!marginsMenu !paperA4 !paperLetter !paperLandscape !columnsMenu !pageSetup'],['Intestazione e piè di pagina','!headerFooter !pageNumbers'],['Interruzioni','!breaksMenu !sectSetup'],['Paragrafo','!paraDialog !tabsDialog !paraBorders lineMenu+ / outdent+ indent+']],
  'Note e indici':[['Sommario','!toc !updateFields'],['Note','!footnote !endnote'],['Citazioni e bibliografia','!citeMenu !sources !biblio'],['Didascalie','!captionInsert !tofMenu !crossRef'],['Indice','!markEntry !insertIndex'],['Segnalibri','!bookmark'],['Spostamento','!navPane !followLink']],
  'Stampa unione':[['Inizia stampa unione','!mmSource'],['Campi','!mmField'],['Anteprima','!mmPreview mmPrev+ / mmNext+'],['Fine','!mmFinish']],
  Verifica:[['Strumenti di correzione','!spellcheck !autoCorrect !wordCount !readability'],['Commenti','!cmtNew !cmtPane cmtPrev+ / cmtNext+ !cmtResolve !cmtDelete'],['Voce','!readAloud !dictate'],['Accessibilità','!a11yCheck !imgAlt'],['Versioni','!versionSave !versionHistory'],['Modifica','!undo !redo !find !replace']],
  Vista:[['Modalità','!readingMode'],['Mostra','!navPane !pageMarks !cmtPane !showMarks !revealFormat'],['Zoom','!zoomDown !zoomReset !zoomUp'],['Formato carta','!paperA4 !paperLetter !paperLandscape'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette'],['Stampa','!print']],
  Tabella:[['Tabella','!insertTable !tblDelete'],['Righe e colonne','!tblRowAbove !tblRowBelow !tblColLeft !tblColRight'],['Elimina','tblDelRow+ / tblDelCol+'],['Unisci','!tblMerge !tblSplit'],['Struttura','!tblHeader !tblCaption !tblBorders !tblWidth']]},
 x:{Inizio:[['Appunti','!paste cut / copy'],['Carattere','#fontFamily #fontSize fontGrow fontShrink / bold italic underline @fontColor @fillColor borders'],['Allineamento','justifyLeft justifyCenter justifyRight / wrap+ merge+'],['Numeri','#numberFormat / currency percent decPlus decMinus'],['Stili','!cfMenu'],['Celle','!insertRows !deleteRows !insertCols !deleteCols'],['Modifica','^autoSum:autoSumMenu fillDown clearMenu sortAsc / filter find goto']],
  Inserisci:[['Tabelle','!pivotNew'],['Grafici','!chartInsert chartCol+ chartLine+ chartPie+ / chartBar+ chartArea+ chartScatter+'],['Grafico selezionato','!chartFormat !chartTable !chartSound'],['Righe e colonne','!insertRows !insertCols'],['Fogli','!addSheet !duplicateSheet'],['Funzioni','!insertFunction ^autoSum:autoSumMenu'],['Dati','!importCSV !pasteValues']],
  Pagina:[['Celle','!colWidth !autofit !borders !merge !unmerge'],['Formattazione','!cfMenu !cfManage'],['Opzioni del foglio','!toggleGrid'],['Stampa','!print']],
  Funzioni:[['Libreria di funzioni','!insertFunction ^autoSum:autoSumMenu !fxCatRecent !fxCatMath !fxCatStat !fxCatLogic !fxCatText !fxCatDate !fxCatLookup !fxCatDyn !fxCatFin !fxCatInfo'],['Nomi definiti','!nameDefine !nameManager !nameUse'],['Guida','!formulaHelp']],
  Dati:[['Ordina e filtra','!sortAsc !sortDesc !filter !clearFilter'],['Strumenti dati','!dvDialog !dvCircle'],['Tabella pivot','!pivotNew !pivotRefreshAll'],['Dati esterni','!importCSV !exportCSV']],
  Verifica:[['Note','!noteEdit !noteDelete notePrev+ / noteNext+ !noteList'],['Modifica','!undo !redo !find !replace'],['Accessibilità','!readStatus']],
  Vista:[['Finestra','!freezeMenu'],['Zoom','!zoomDown !zoomReset !zoomUp'],['Mostra','!toggleGrid !goto'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette'],['Stampa','!print']],
  'Tabella pivot':[['Tabella pivot','!pivotNew !pivotSelect !pivotDelete'],['Campi e filtri','!pivotFields !pivotCalc !pivotFilter !pivotOptions'],['Dati','!pivotRefresh !pivotRefreshAll !pivotDrill'],['Strumenti','!pivotChart']]},
 p:{Inizio:[['Appunti','!pgPaste pgCut+ / pgCopy+'],['Pagine','!pgAddPage pgDupPage+ / pgDelPage+'],['Cornici','!pgAddText !pgAddImage ^pgAddSign:pgSignStyles !pgAddRect'],['Modelli','!pgTemplates !pgSaveTpl'],['Design','!pgTheme !pgAdapt'],['Testo','!pgStyles !pgField'],['Fonti','!pgFolder !pgRefresh'],['Esporta','!pgExportPng !print'],['Modifica','!undo !redo']],
  Inserisci:[['Cornici','!pgAddText !pgAddImage !pgAddRect !pgAddEllipse !pgAddTri !pgAddLine'],['Insegne','^pgAddSign:pgSignStyles'],['Foto','!pgPhotoGrid !pgMask'],['Pagine','!pgAddPage !pgDupPage'],['Mastro','!pgPageNum !pgHeader !pgLogo'],['Testo','!pgField !pgDocx']],
  Pagina:[['Formato','!pgFormat !pgMargins !pgAdapt'],['Modelli','!pgTemplates !pgSaveTpl'],['Colori','!pgTheme'],['Grande formato','!pgTiles !pgTileSetup !pgFestone'],['Griglia','!pgGuides !pgGrid !pgSnap'],['Mastri','!pgMasterApply !pgMasterEdit !pgMasterNew'],['Pagine','!pgPrevPage !pgNextPage !pgDelPage'],['Pagine dai dati','!pgDataRepeat pgRowPrev+ / pgRowNext+']],
  Cornice:[['Testo','!pgEditText !pgLink !pgLinkTo !pgUnlink !pgOverflow'],['Immagine','!pgChooseImage !pgMask !pgFit !pgFill'],['Più cornici','!pgSelectAll !pgGroup pgUngroup+ / pgLock+ pgDistH+ / pgDistV+'],['Disponi','!pgFront !pgBack pgForward+ / pgBackward+'],['Allinea ai margini','pgAlignL pgAlignC pgAlignR / pgAlignT pgAlignM pgAlignB'],['Ordine di lettura','pgReadUp+ pgReadDown+ / pgReadAuto+'],['Cornice','!pgDup !pgDelete']],
  Fonti:[['Cartella collegata','!pgFolder !pgRefresh !pgSources'],['Dati','!pgData !pgDataSheet'],['Notizie','!pgFeed !pgFeedPaste'],['Testo','!pgDocx'],['Pagine dai dati','!pgDataRepeat pgRowPrev+ / pgRowNext+']],
  Verifica:[['Accessibilità','!pgCheck !pgDescribe'],['Testo','!pgOverflow'],['Modifica','!undo !redo']],
  Vista:[['Zoom','!zoomDown !pgZoomFit !zoomUp'],['Mostra','!pgGuides !pgGrid !pgSmart'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette'],['Esporta','!pgExportPng !print']]}};
const TABS={w:['Inizio','Inserisci','Aspetto','Pagina','Note e indici','Stampa unione','Verifica','Vista','Tabella'],x:['Inizio','Inserisci','Pagina','Funzioni','Dati','Verifica','Vista','Tabella pivot'],p:['Inizio','Inserisci','Pagina','Cornice','Fonti','Verifica','Vista']};
const slug=s=>s.replace(/\s+/g,'-');
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
function tipText(c){const k=keysOf(c);return c.label+(k?' ('+k+')':'')}
function styleCard(id){const c=C[id];if(!c)return '';const k=keysOf(c);return `<button type="button" class="style-card" data-action="${id}" aria-pressed="${!!safe(c.toggle)}"${k?` aria-keyshortcuts="${esc(ariaKeys(k))}"`:''} data-tip="${esc(tipText(c))}"><span class="sample ${c.sample}" aria-hidden="true">AaBbCc</span><span>${esc(c.short)}</span></button>`}
const SELECT_DEFAULT={fontFamily:'Calibri',fontSize:'11',numberFormat:'Generale',docFont:'Calibri',lineSpacing:'1.15',paraSpacing:'8'};
function selectHtml(id){const s=SELECTS[id];return `<select class="rb-select" id="${id}" aria-label="${esc(s.label)}" data-tip="${esc(s.label)}" style="width:${s.w}px">${s.opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}"${v===SELECT_DEFAULT[id]?' selected':''}>${esc(l)}</option>`}).join('')}</select>`}
function colorHtml(id){const k=COLORS[id],c=C[k.apply];return `<span class="split"><button type="button" class="tool" data-action="${k.apply}" aria-label="${esc(c.label)}" data-tip="${esc(c.label)}">${ICON(k.icon)}<span class="swatch" data-swatch="${id}" style="background:${lastColor[id]}"></span></button><span class="pick" data-tip="${esc(k.pick)}">${ICON('down')}<input type="color" id="${id}" value="${lastColor[id]}" aria-label="${esc(k.pick)}"></span></span>`}
function setSel(id,v){const el=$(id);if(!el||document.activeElement===el)return;v=String(v);if(![...el.options].some(o=>o.value===v))el.add(new Option(v,v));el.value=v}
function syncSelects(){if(isCalc()){const st=cell(state.sel.r,state.sel.c)?.s||{};setSel('fontFamily',st.font||'Calibri');setSel('fontSize',st.size||11);setSel('numberFormat',st.fmt||'Generale');return}if(!isWord())return;
 setSel('docFont',state.doc.font);setSel('lineSpacing',state.doc.line);setSel('paraSpacing',state.doc.space);if(!inEditor())return;const s=getSelection();let el=s.anchorNode;if(el?.nodeType===3)el=el.parentElement;if(!el)return;const cs=getComputedStyle(el);setSel('fontFamily',cs.fontFamily.split(',')[0].replace(/["']/g,'').trim());setSel('fontSize',Math.round(parseFloat(cs.fontSize)*.75*2)/2)}
let toggleTimer;function refreshToggles(){clearTimeout(toggleTimer);toggleTimer=setTimeout(()=>{for(const b of $$('#ribbon [aria-pressed],#tools [aria-pressed][data-action],#pgBar [aria-pressed][data-action]')){const c=C[b.dataset.action];if(c?.toggle)b.setAttribute('aria-pressed',!!safe(c.toggle))}syncSelects()},40)}
// Strumenti sempre in vista. "|" separa i gruppi; con "|1" e "|2" il gruppo che segue sparisce quando la barra è
// stretta (prima 1, poi 2), ma i suoi comandi restano nei cassetti e nella ricerca.
const QUICK={w:'undo redo | bold italic underline |2 insertUnorderedList insertOrderedList justifyLeft justifyCenter |1 insertLink cmtNew',
 x:'undo redo | bold italic underline |2 currency percent decPlus decMinus |1 autoSum sortAsc filter',
 p:'undo redo | pgAddText pgAddImage pgAddRect |2 pgFront pgBack |1 pgPrevPage pgNextPage'};
const cmdAttrs=c=>{const k=keysOf(c);return (c.toggle?` aria-pressed="${!!safe(c.toggle)}"`:'')+(k?` aria-keyshortcuts="${esc(ariaKeys(k))}"`:'')+(c.menu?' aria-haspopup="menu" aria-expanded="false"':'')};
function renderQuick(){let hide='';$('quick').innerHTML=QUICK[modeKey()].split(' ').map(id=>{if(id[0]==='|'){hide=id.length>1?' h'+id.slice(1):'';return `<span class="tsep${hide}" aria-hidden="true"></span>`}const c=C[id];if(!c||!available(c))return '';
 return `<button type="button" class="tb icon${hide}" data-action="${id}"${cmdAttrs(c)} aria-label="${esc(c.label)}" data-tip="${esc(tipText(c))}">${ICON(c.icon)}</button>`}).join('')}
function renderDrawers(){$('drawers').innerHTML=TABS[modeKey()].map(x=>`<button type="button" class="tb drw" id="drw-${slug(x)}" data-drawer="${esc(x)}" aria-expanded="false" aria-controls="ribbon">${esc(x)}${ICON('down','ico chev')}</button>`).join('')}
function renderBar(){closeDrawer(false);renderQuick();renderDrawers();fitTools()}
// Se la barra non basta, spariscono prima i gruppi segnati con 1, poi quelli segnati con 2; poi si stringono il nome
// del file e i cassetti; se non basta ancora, gli strumenti vanno a capo su una riga loro. Si ricalcola sempre da zero,
// così il risultato dipende solo dalla larghezza.
function fitTools(){const t=$('tools'),bar=$('bar'),over=()=>t.scrollWidth>t.clientWidth,fit=()=>{t.classList.remove('fit1','fit2');for(const c of ['fit1','fit2']){if(!over())break;t.classList.add(c)}};
 bar.classList.remove('wrap','tight');fit();if(over()){bar.classList.add('tight');fit()}if(over()){bar.classList.replace('tight','wrap');fit();if(over()){bar.classList.add('tight');fit()}}toolsRoving();placeDrawer()}
new ResizeObserver(()=>fitTools()).observe($('tools'));
// Una sola fermata di Tab per tutta la barra degli strumenti: le frecce passano da un pulsante all'altro.
let toolFocus=0;
const toolItems=()=>focusables($('tools'));
function toolsRoving(){const l=toolItems();if(!l.length)return;toolFocus=clamp(toolFocus,0,l.length-1);l.forEach((b,i)=>b.tabIndex=i===toolFocus?0:-1)}
// Cassetto aperto: un gruppo di tasselli sotto la barra. Dopo il comando si torna dove si stava lavorando.
let drawerName=null,drawerOpenedAt=0,lastWork=null;
document.addEventListener('focusin',e=>{if(e.target.closest?.('#docRegion'))lastWork=e.target});
function drawerItem(id){const c=C[id];if(!c||!available(c))return '';const k=keysOf(c),short=c.short||c.label;
 return `<button type="button" class="ditem" data-action="${id}"${cmdAttrs(c)}${short!==c.label?` data-tip="${esc(c.label)}"`:''}>${ICON(c.icon)}<span class="lbl">${esc(short)}${short!==c.label?`<span class="sr-only">: ${esc(c.label)}</span>`:''}</span>${c.toggle?'<span class="dstate" aria-hidden="true"></span>':''}${k?`<kbd aria-hidden="true">${esc(k.split(' / ')[0])}</kbd>`:''}</button>`}
// Un segno del gruppo: comando, elenco a discesa con la sua etichetta o colore con il nome del comando che lo applica.
function drawerToken(tok){if(tok==='/')return '';if(tok[0]==='#'){const id=tok.slice(1),s=SELECTS[id];return s?`<label class="dsel"><span>${esc(s.label)}</span>${selectHtml(id)}</label>`:''}
 if(tok[0]==='@'){const id=tok.slice(1),k=COLORS[id],c=k&&C[k.apply];return c&&available(c)?`<div class="dcolor">${colorHtml(id)}<span aria-hidden="true">${esc(c.short||c.label)}</span></div>`:''}
 return tok.replace(/^[!^&%]/,'').replace(/\+$/,'').split(':').map(drawerItem).join('')}
function openDrawer(name,focus=false){const groups=RIBBON[modeKey()][name],btn=$('drw-'+slug(name)),d=$('ribbon');if(!groups||!btn)return;hideTip();closeMenu(false);drawerName=name;drawerOpenedAt=performance.now();
 d.setAttribute('aria-labelledby',btn.id);
 const parts=groups.map(([g,spec],gi)=>{const inner=spec.split(' ').map(drawerToken).join('');return inner?`<div class="dgroup" role="group" aria-labelledby="dg${gi}"><h3 id="dg${gi}">${esc(g)}</h3>${inner}</div>`:''}).filter(Boolean),n=parts.length;
 d.innerHTML=`<div class="drawer-grid" style="--cols:${n<=5?n:Math.ceil(n/2)}">${parts.join('')}</div>`;
 d.hidden=false;for(const b of $$('#drawers [data-drawer]'))b.setAttribute('aria-expanded',b===btn);placeDrawer();syncSelects();if(focus)d.querySelector('.ditem,select')?.focus()}
function placeDrawer(){if(!drawerName)return;const d=$('ribbon'),r=$('drw-'+slug(drawerName)).getBoundingClientRect();d.style.top=($('bar').getBoundingClientRect().bottom+8)+'px';d.style.left=Math.max(8,Math.min(r.left-8,innerWidth-d.offsetWidth-8))+'px'}
function closeDrawer(restore=true){if(!drawerName)return;const btn=$('drw-'+slug(drawerName)),d=$('ribbon');drawerName=null;d.hidden=true;d.innerHTML='';btn?.setAttribute('aria-expanded','false');if(restore)btn?.focus()}
// I comandi che aprono un menu tengono aperto il cassetto, perché il menu si appoggia al loro pulsante; così anche i colori.
const DRAWER_MENUS=new Set(['pgStyles','pgSignStyles','pgTheme','pgMask','pgPhotoGrid','pgMasterApply','pgField','pgLinkTo']);
function drawerRun(b){const id=b.dataset.action;if(C[id]?.menu||/Menu$/.test(id)||DRAWER_MENUS.has(id)||b.closest('.split')){runCommand(id);return}
 const inDrawer=$('ribbon').contains(document.activeElement),back=lastWork?.isConnected&&lastWork.offsetParent?lastWork:null;closeDrawer(inDrawer&&!back);
 if(inDrawer&&back){if(isWord()&&back.closest('#wordEditor'))restoreWordFocus();else back.focus({preventScroll:true})}runCommand(id)}
$('drawers').addEventListener('click',e=>{const b=e.target.closest('[data-drawer]');if(!b)return;if(drawerName!==b.dataset.drawer)openDrawer(b.dataset.drawer);else if(performance.now()-drawerOpenedAt>400)closeDrawer(false)});
$('drawers').addEventListener('keydown',e=>{const b=e.target.closest('[data-drawer]');if(!b)return;if(e.key==='Enter'||e.key===' '||e.key==='ArrowDown'){e.preventDefault();openDrawer(b.dataset.drawer,true)}else if(e.key==='Escape'&&drawerName){e.preventDefault();closeDrawer(true)}});
$('tools').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const l=toolItems(),i=l.indexOf(document.activeElement);if(i<0)return;e.preventDefault();l[e.key==='Home'?0:e.key==='End'?l.length-1:(i+(e.key==='ArrowRight'?1:-1)+l.length)%l.length].focus()});
// Con un cassetto aperto, le frecce sulla barra aprono il cassetto vicino, come in un menu.
$('tools').addEventListener('focusin',e=>{const l=toolItems(),i=l.indexOf(e.target);if(i<0)return;toolFocus=i;l.forEach((b,k)=>b.tabIndex=k===i?0:-1);e.target.scrollIntoView({block:'nearest',inline:'nearest'});
 if(drawerName){const n=e.target.dataset.drawer;if(!n)closeDrawer(false);else if(n!==drawerName)openDrawer(n)}});
$('ribbon').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeDrawer(true);return}const items=$$('#ribbon .ditem'),i=items.indexOf(document.activeElement);if(i<0)return;
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const gs=$$('#ribbon .dgroup'),g=gs.indexOf(items[i].closest('.dgroup'));const first=gs[(g+(e.key==='ArrowRight'?1:-1)+gs.length)%gs.length]?.querySelector('.ditem');if(first){e.preventDefault();first.focus()}return}
 const j=e.key==='ArrowDown'?(i+1)%items.length:e.key==='ArrowUp'?(i-1+items.length)%items.length:e.key==='Home'?0:e.key==='End'?items.length-1:null;if(j!==null){e.preventDefault();items[j].focus()}});
$('ribbon').addEventListener('focusout',e=>{const to=e.relatedTarget;if(drawerName&&to&&!to.closest('#ribbon,#drawers,#menu'))closeDrawer(false)});
document.addEventListener('pointerdown',e=>{if(drawerName&&!e.target.closest('#ribbon,#drawers,#menu'))closeDrawer(false)},true);
// Strumenti rapidi: in Testo il clic non toglie il cursore dal documento, così il comando vale per la selezione.
$('tools').addEventListener('mousedown',e=>{if(isWord()&&e.target.closest('button'))e.preventDefault()});
$('tools').addEventListener('click',e=>{const b=e.target.closest('#quick button[data-action]');if(b)runCommand(b.dataset.action)});
addEventListener('resize',fitTools);
