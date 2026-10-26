const DOC_DEFAULT={font:'Calibri',line:'1.15',space:'8'};
const LAYOUT_DEFAULT={margins:'normal',mt:25,mb:20,ml:20,mr:20,cols:1,colGap:12.5,hl:'',hc:'',hr:'',fl:'',fc:'',fr:'',firstDiff:false,marks:true,nav:false,wmText:'',wmColor:'#c0c0c0',wmDiag:true,pageColor:'',pbStyle:'none',pbW:1,pbColor:'#404040',pgStart:0,evenDiff:false,ehl:'',ehc:'',ehr:'',efl:'',efc:'',efr:'',hfFont:'',hfSize:9,hfBold:false,hfItalic:false,hfColor:'#404040',logo:'',logoPos:'l',logoH:12,logoAlt:'',logoNW:0,logoNH:0};
// Righe e colonne di ogni foglio; altezza di riga e di intestazione e larghezza di colonna predefinita, in pixel.
const ROWS=1000,COLS=52;
const ROWHEIGHT=24,HEADERHEIGHT=27,BASECOL=64;
const blankSheet=(name='Foglio1')=>({name,cells:{},widths:{},merges:[]});
const state={mode:'word',excelTitle:'Calcolo1',wordTitle:'Documento1',wordHTML:'<p><br></p>',sheets:[blankSheet()],sheet:0,zoom:100,paper:'a4',sel:{r:0,c:0,r2:0,c2:0},doc:{...DOC_DEFAULT},styles:{},layout:{...LAYOUT_DEFAULT},comments:{},sections:{},biblio:{style:'apa',sources:[]},cc:{},merge:null,names:[],showComments:false,spell:true};
// Stato dell'interfaccia, del ricalcolo, della cronologia e del salvataggio delle bozze.
let currentTab='Inizio',tabExitArmed=false,speaking=false,sheetDrag=false;
let calcMemo=new Map(),calcVersion=0,hist=[],redo=[];
let db=null,draftTimer,suppressAutosave=false,activeWordRange=null;
const lastColor={fontColor:'#c00000',hiliteColor:'#ffff00',fillColor:'#ffe699'};
// Accesso alle celle del foglio attivo (o di un foglio indicato).
const sheet=()=>state.sheets[state.sheet];
function cell(r,c,s=sheet()){return s.cells[toRef(r,c)]??null}
function ensureCell(r,c,s=sheet()){const key=toRef(r,c);return s.cells[key]??=({v:'',s:{}})}
function cellRaw(r,c,s=sheet()){return cell(r,c,s)?.v??''}
const clampR=r=>Math.max(0,Math.min(ROWS-1,r)),clampC=c=>Math.max(0,Math.min(COLS-1,c));
const fmtN=n=>Number.isFinite(n)?n.toLocaleString('it-IT',{maximumFractionDigits:4}):'';
// La cronologia di Excel salva l'intera cartella: inserimenti, eliminazioni e fogli restano coerenti con le formule tra fogli.
function wbSnap(){return JSON.stringify({sheets:state.sheets,sheet:state.sheet,names:state.names||[]})}
function trimHist(a){let total=a.reduce((s,x)=>s+x.length,0);while(a.length>1&&(a.length>60||total>40e6))total-=a.shift().length}
function storeHistory(){hist.push(wbSnap());trimHist(hist);redo=[]}
function restoreHistory(which){const undoing=which==='undo',from=undoing?hist:redo,to=undoing?redo:hist;if(!from.length){toast(undoing?'Niente da annullare':'Niente da ripetere');return}to.push(wbSnap());const saved=JSON.parse(from.pop());Object.assign(state,{sheets:saved.sheets,sheet:Math.min(saved.sheet,saved.sheets.length-1),names:saved.names||[]});renderedFirst=-1;renderSheetTabs();bump();announce(undoing?'Operazione annullata':'Operazione ripetuta')}
function updateTitle(){const w=state.mode==='word';document.title=($('docTitle').value.trim()||'Senza titolo')+' — '+(w?'Testo':'Calcolo')+' · Tassello Ufficio'}
// Passa da Testo a Calcolo e viceversa: conserva il lavoro dell'app che si lascia e ridisegna l'interfaccia dell'altra.
function setMode(mode,{focus=true}={}){const leaving=state.mode;if(mode===leaving)return;
 if(leaving==='word'){const html=$('wordEditor').innerHTML;state.wordHTML=sanitizeHTML(html)}else finishCell();
 closeFind(false);if(speaking){speechSynthesis.cancel();speaking=false}
 state.mode=mode;const word=mode==='word';$('app').className=mode;document.documentElement.dataset.mode=mode;
 $('wordPane').classList.toggle('hidden',!word);$('excelPane').classList.toggle('hidden',word);$('switchWord').setAttribute('aria-pressed',word);$('switchExcel').setAttribute('aria-pressed',!word);
 $('docTitle').value=word?state.wordTitle:state.excelTitle;$('exportLabel').textContent=word?'Esporta HTML':'Esporta CSV';updateTitle();
 currentTab='Inizio';renderTabs();renderRibbon();
 if(word){updateWordStats();scheduleWordTidy(0)}else{renderSheetTabs();renderedFirst=-1;renderGrid(true);setSelection(state.sel.r,state.sel.c);renderCharts()}
 printStyle();if(focus){$(word?'wordEditor':'gridScroll').focus();announce(word?'Testo: documento':'Calcolo: foglio '+sheet().name)}schedulePersist()}
function applyDocStyle(){const ed=$('wordEditor'),d=state.doc;ed.style.setProperty('--doc-font',`'${d.font}',Calibri,'Segoe UI',Arial,sans-serif`);ed.style.setProperty('--doc-line',d.line);ed.style.setProperty('--doc-space',d.space+'pt');ed.spellcheck=state.spell;renderDocStyles()}
function setPaper(p){state.paper=p;$('page').dataset.paper=p;applyLayout();updateWordStats();schedulePersist();refreshToggles()}
