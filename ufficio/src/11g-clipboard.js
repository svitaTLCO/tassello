// Appunti. Nel foglio si copiano le celle come testo separato da tabulazioni; nel testo agiscono i comandi del browser.
const clipboardHint=key=>toast(`Usa Ctrl+${key} per ${{C:'copiare',X:'tagliare',V:'incollare'}[key]}`);
const clipWrite=text=>navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject(Error('appunti non disponibili'));
function wordPaste(){if(isPage())return;const use=t=>isCalc()?pasteTsv(t):insertHtmlAtSelection(esc(t).replace(/\n/g,'<br>'));try{navigator.clipboard.readText().then(use,()=>clipboardHint('V'))}catch(e){clipboardHint('V')}}
function clipboardCopy(){if(!isCalc()){try{document.execCommand('copy')}catch(e){clipboardHint('C')}return}clipWrite(buildTsv()).then(()=>toast('Celle copiate'),()=>clipboardHint('C'))}
function clipboardCut(){if(!isCalc()){document.execCommand('cut');return}clipWrite(buildTsv()).then(()=>{storeHistory();eachSelected((row,col)=>{const target=cell(row,col);if(target)target.v=''});bump();toast('Celle tagliate')},()=>clipboardHint('X'))}
