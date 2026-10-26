// Word: cronologia propria, Invio nelle note, pulizia dei paragrafi nuovi, Ctrl+clic, menu contestuale, riquadro di spostamento.
ed.addEventListener('beforeinput',e=>{const t=e.inputType;if(reading||formMode){e.preventDefault();announce(formMode?'Modalità compilazione: Tab raggiunge i campi, Spazio li compila, Esc esce':'Documento in sola lettura: premi Esc per tornare alla modifica');return}if(t==='historyUndo'||t==='historyRedo'){e.preventDefault();wordUndo(t==='historyRedo');return}wordHistPush(/^insert(Text|CompositionText)$/.test(t)?'type':/^delete(Content|Word|Soft|Hard)/.test(t)?'del':'op')});
ed.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&anchorEl()?.closest('p.fn-note')){e.preventDefault();wordHistPush();document.execCommand('insertLineBreak');wordChanged()}});
ed.addEventListener('input',e=>{if(e.inputType!=='insertParagraph')return;const b=curBlock();if(b&&!b.textContent.trim()){let ch=false;if(b.classList.contains('title')||b.classList.contains('subtitle')){b.classList.remove('title','subtitle');ch=true}if(b.id&&!/^H[1-6]$/.test(b.tagName)){b.removeAttribute('id');ch=true}if(b.getAttribute('class')==='')b.removeAttribute('class');if(ch)wordChanged()}});
ed.addEventListener('click',e=>{if((e.ctrlKey||e.metaKey)&&e.target.closest?.('a[href],sup.fn,p.fn-note>sup')){e.preventDefault();followLink(e.target)}},true);
ed.addEventListener('contextmenu',e=>{if(e.target.closest?.('td,th,img,figure')){e.preventDefault();if(e.target.tagName==='IMG'){const r=document.createRange();r.selectNode(e.target);const s=getSelection();s.removeAllRanges();s.addRange(r);wordSelectionSave()}wordMenu(e.clientX,e.clientY)}});
let navRaf=0;document.addEventListener('selectionchange',()=>{if(!isWord()||!state.layout.nav||!inEditor())return;cancelAnimationFrame(navRaf);navRaf=requestAnimationFrame(()=>renderNav())});
$('navList').addEventListener('click',e=>{const b=e.target.closest('[data-nav]');if(b)goHeading(docHeadings()[+b.dataset.nav])});
$('navList').addEventListener('keydown',e=>{const items=$$('#navList [data-nav]'),i=items.indexOf(e.target);if(i<0)return;let j=null;if(e.key==='ArrowDown')j=Math.min(items.length-1,i+1);else if(e.key==='ArrowUp')j=Math.max(0,i-1);else if(e.key==='Home')j=0;else if(e.key==='End')j=items.length-1;else if(e.key==='Escape'){e.preventDefault();restoreWordFocus();return}if(j===null)return;e.preventDefault();items.forEach((b,k)=>b.tabIndex=k===j?0:-1);items[j].focus()});
$('navClose').onclick=()=>runCommand('navPane');
for(const id of ['hfHead','hfFoot'])$(id).addEventListener('click',()=>runCommand('headerFooter'));
window.addEventListener('resize',()=>{if(isWord())scheduleWordTidy(150)});
window.addEventListener('beforeprint',()=>{printStyle();if(isWord()){renumberNotes();renumberEndnotes();buildPrintSections()}});window.addEventListener('afterprint',clearPrintSections);
ed.addEventListener('keydown',formKeydown,true);
ed.addEventListener('click',e=>{const c=e.target.closest?.('span.cc');if(c&&ed.contains(c)&&!e.ctrlKey&&!reading){e.preventDefault();activateControl(c)}});
ed.addEventListener('dblclick',e=>{const q=e.target.closest?.('span.eq');if(q&&ed.contains(q)&&!reading&&!formMode){e.preventDefault();const r=document.createRange();r.setStartAfter(q);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);wordSelectionSave();equationDialog()}});
ed.addEventListener('beforeinput',acBeforeInput);
// Esc ferma la dettatura o chiude la modalità lettura, prima degli altri gestori.
window.addEventListener('keydown',e=>{if(e.key!=='Escape'||overlayOpen()||!isWord())return;if(dictating){e.preventDefault();e.stopPropagation();stopDictation();return}if(reading&&$('findbar').hidden){e.preventDefault();e.stopPropagation();toggleReading()}},true);
ed.addEventListener('paste',e=>{if(reading||formMode)e.preventDefault()},true);ed.addEventListener('drop',e=>{if(reading||formMode)e.preventDefault()},true);
// Commenti: riquadro, cursore su un testo commentato, annuncio quando si entra in un commento.
$('cmtList').addEventListener('click',e=>{const b=e.target.closest('[data-ca]'),li=e.target.closest('[data-c]');if(!b||!li)return;const c=li.dataset.c;({go:()=>goComment(c),reply:()=>replyComment(c),edit:()=>editComment(c),done:()=>resolveComment(c),del:()=>deleteComment(c)})[b.dataset.ca]?.()});
$('cmtList').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();restoreWordFocus()}});
$('cmtClose').onclick=()=>runCommand('cmtPane');$('cmtAdd').addEventListener('mousedown',e=>e.preventDefault());$('cmtAdd').onclick=()=>runCommand('cmtNew');
let lastCmtSeen=null,lfRaf=0;document.addEventListener('selectionchange',()=>{if(!isWord()||!inEditor())return;const b=commentAtCaret();if(b!==lastCmtSeen){lastCmtSeen=b;if(b&&state.comments[b]&&document.activeElement===ed){const d=state.comments[b];announce(`Commento di ${d.author}${d.done?', risolto':''}: ${d.text.slice(0,140)}`)}if(state.showComments||activeCmt)markActiveComment(b)}if(reading){cancelAnimationFrame(lfRaf);lfRaf=requestAnimationFrame(updateLineFocus)}});
$('wordScroll').addEventListener('scroll',()=>{if(reading){cancelAnimationFrame(lfRaf);lfRaf=requestAnimationFrame(updateLineFocus)}},{passive:true});
// Barra della modalità lettura e della dettatura
$('rdWidth').onchange=e=>{setReadPref('w',e.target.value);announce('Larghezza '+e.target.selectedOptions[0].text.toLowerCase())};$('rdSpace').onchange=e=>{setReadPref('space',e.target.value);announce('Spaziatura '+e.target.selectedOptions[0].text.toLowerCase())};$('rdFont').onchange=e=>setReadPref('font',e.target.checked);$('rdColor').onchange=e=>{setReadPref('color',e.target.value);announce('Colore pagina '+e.target.selectedOptions[0].text.toLowerCase())};$('rdLine').onchange=e=>setReadPref('line',e.target.checked);
$('rdSmaller').onclick=()=>setReadPref('size',Math.max(10,readPrefs().size-1));$('rdBigger').onclick=()=>setReadPref('size',Math.min(28,readPrefs().size+1));$('rdSpeak').onclick=()=>runCommand('readAloud');$('rdExit').onclick=()=>runCommand('readingMode');
$('dictStop').addEventListener('mousedown',e=>e.preventDefault());$('dictStop').onclick=()=>stopDictation();

// Excel: freccia dell’elenco di convalida, messaggio di input, note al passaggio del mouse.
$('grid').addEventListener('mousedown',e=>{const td=e.target.closest('td.dv-list.active');if(!td)return;const rc=td.getBoundingClientRect();if(e.clientX>rc.right-20){e.preventDefault();e.stopPropagation();$('gridScroll').focus();setTimeout(dvPick,0)}},true);
$('gridScroll').addEventListener('focus',()=>showDvPrompt());$('gridScroll').addEventListener('blur',()=>{$('dvTip').hidden=true});$('gridScroll').addEventListener('scroll',()=>{if(!$('dvTip').hidden)showDvPrompt()},{passive:true});
$('grid').addEventListener('dblclick',e=>{const td=e.target.closest('td[data-r]');if(!td||isWord())return;const r=+td.dataset.r,c=+td.dataset.c,p=pivotAt(r,c);if(!p)return;e.stopImmediatePropagation();e.preventDefault();if(p.lab&&r>p.lab.hr&&c>=p.out.c1+p.lab.L){setSelection(r,c);pivotDrill()}else toast('Questa è una tabella pivot: usa Campi della tabella pivot per cambiarla')},true);
// Pennello del copia formato: la selezione fatta con il mouse riceve il formato copiato.
ed.addEventListener('mouseup',()=>{if(!painting)return;setTimeout(()=>{const sel=getSelection();if(sel.rangeCount&&!sel.isCollapsed&&inEditor()){formatPaste();stopPainter()}},0)});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&painting&&!overlayOpen()){e.preventDefault();e.stopPropagation();stopPainter();announce('Pennello disattivato')}},true);
