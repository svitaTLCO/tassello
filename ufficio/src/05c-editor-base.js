// Selezione e comandi di base dell'editor di Testo. La selezione viene ricordata quando il focus passa
// alla barra multifunzione o a una finestra, e ripristinata prima di ogni comando.
function wordSelectionSave(){const sel=getSelection();if(sel.rangeCount&&$('wordEditor').contains(sel.anchorNode))activeWordRange=sel.getRangeAt(0).cloneRange()}
// Riporta il cursore dove era prima che si aprisse una finestra o si premesse un pulsante.
function restoreWordFocus(){$('wordEditor').focus({preventScroll:true});const saved=activeWordRange;if(!saved)return;const s=getSelection();try{s.removeAllRanges();s.addRange(saved)}catch(e){}}
function wordCmd(command,value=null){restoreWordFocus();wordHistPush();let done=true;try{document.execCommand(command,false,value)}catch(e){done=false}if(!done)toast('Il browser non supporta questo comando');wordChanged();wordSelectionSave()}
const formatWordTag=tag=>wordCmd('formatBlock',String(tag).toLowerCase());
// Dimensione in punti: il browser applica la dimensione 7 provvisoria, poi diventa uno span con font-size.
function changeFontSize(pt){if(state.mode==='excel'){applyCellsStyle('size',Number(pt));return}restoreWordFocus();wordHistPush();expandCollapsed();document.execCommand('fontSize',false,'7');for(const tag of $$('font[size="7"]',$('wordEditor'))){const wrap=document.createElement('span');wrap.style.fontSize=`${pt}pt`;wrap.append(...tag.childNodes);tag.replaceWith(wrap)}wordChanged()}
function changeFont(name){return state.mode==='excel'?applyCellsStyle('font',name):wordCmd('fontName',name)}
function changeColor(kind,color){const ink=kind==='fontColor';return state.mode==='excel'?applyCellsStyle(ink?'color':'fill',color):wordCmd(ink?'foreColor':'hiliteColor',color)}
function wordChanged(){const ed=$('wordEditor');state.wordHTML=sanitizeHTML(ed.innerHTML);updateWordStats();scheduleWordTidy();schedulePersist()}
function insertHtmlAtSelection(markup){restoreWordFocus();wordHistPush();document.execCommand('insertHTML',false,markup);wordChanged()}
