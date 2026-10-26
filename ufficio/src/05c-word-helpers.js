function wordSelectionSave(){const s=window.getSelection();if(s.rangeCount&&$('wordEditor').contains(s.anchorNode))activeWordRange=s.getRangeAt(0).cloneRange()}
function restoreWordFocus(){const ed=$('wordEditor');ed.focus({preventScroll:true});if(activeWordRange){let sel=window.getSelection();try{sel.removeAllRanges();sel.addRange(activeWordRange)}catch(e){}}}
function wordCmd(command,value){restoreWordFocus();wordHistPush();try{document.execCommand(command,false,value??null)}catch(e){toast('Il browser non supporta questo comando')}wordChanged();wordSelectionSave()}
function formatWordTag(t){wordCmd('formatBlock',t.toLowerCase())}
function changeFontSize(size){if(state.mode==='excel')return applyCellsStyle('size',Number(size));restoreWordFocus();wordHistPush();expandCollapsed();document.execCommand('fontSize',false,'7');$$('font[size="7"]',$('wordEditor')).forEach(font=>{let span=document.createElement('span');span.style.fontSize=size+'pt';while(font.firstChild)span.appendChild(font.firstChild);font.replaceWith(span)});wordChanged()}
function changeFont(family){if(state.mode==='excel')return applyCellsStyle('font',family);wordCmd('fontName',family)}
function changeColor(target,value){if(state.mode==='excel')return applyCellsStyle(target==='fontColor'?'color':'fill',value);wordCmd(target==='fontColor'?'foreColor':'hiliteColor',value)}
function wordChanged(){state.wordHTML=sanitizeHTML($('wordEditor').innerHTML);updateWordStats();schedulePersist();scheduleWordTidy()}
function insertHtmlAtSelection(html){restoreWordFocus();wordHistPush();document.execCommand('insertHTML',false,html);wordChanged()}
