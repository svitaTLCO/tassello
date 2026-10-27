const DOC_DEFAULT={font:'Calibri',line:'1.15',space:'8'};
const LAYOUT_DEFAULT={margins:'normal',mt:25,mb:20,ml:20,mr:20,cols:1,colGap:12.5,hl:'',hc:'',hr:'',fl:'',fc:'',fr:'',firstDiff:false,marks:true,nav:false,wmText:'',wmColor:'#c0c0c0',wmDiag:true,pageColor:'',pbStyle:'none',pbW:1,pbColor:'#404040',pgStart:0,evenDiff:false,ehl:'',ehc:'',ehr:'',efl:'',efc:'',efr:'',hfFont:'',hfSize:9,hfBold:false,hfItalic:false,hfColor:'#404040',logo:'',logoPos:'l',logoH:12,logoAlt:'',logoNW:0,logoNH:0};
// Righe e colonne di ogni foglio; altezza di riga e di intestazione e larghezza di colonna predefinita, in pixel.
const ROWS=1000,COLS=52;
const ROWHEIGHT=24,HEADERHEIGHT=27,BASECOL=64;
const blankSheet=(name='Foglio1')=>({name,cells:{},widths:{},merges:[]});
const state={mode:'word',excelTitle:'Calcolo1',wordTitle:'Documento1',wordHTML:'<p><br></p>',sheets:[blankSheet()],sheet:0,zoom:100,paper:'a4',sel:{r:0,c:0,r2:0,c2:0},doc:{...DOC_DEFAULT},styles:{},layout:{...LAYOUT_DEFAULT},comments:{},sections:{},biblio:{style:'apa',sources:[]},cc:{},merge:null,names:[],showComments:false,spell:true};
// Stato dell'interfaccia, del ricalcolo, della cronologia e del salvataggio delle bozze.
let tabExitArmed=false,speaking=false,sheetDrag=false;
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
function updateTitle(){document.title=($('docTitle').value.trim()||'Senza titolo')+' — '+appName()+' · Tassello Ufficio'}
// Passa a un'altra app (Testo, Calcolo o Impagina): conserva il lavoro dell'app che si lascia e ridisegna l'interfaccia dell'altra.
// Ogni app ha il suo riquadro, il suo pulsante nella barra del titolo e la sua etichetta di esportazione nel menu File.
const APPS={word:{pane:'wordPane',button:'switchWord',export:'Esporta HTML'},excel:{pane:'excelPane',button:'switchExcel',export:'Esporta CSV'},impagina:{pane:'pagePane',button:'switchPage',export:'Esporta PNG'}};
function setMode(mode,{focus=true}={}){const leaving=state.mode;if(mode===leaving||!APPS[mode])return;
 if(leaving==='word')state.wordHTML=sanitizeHTML($('wordEditor').innerHTML);else if(leaving==='excel')finishCell();else if(leaving==='impagina')pageLeave();
 closeFind(false);if(speaking){speechSynthesis.cancel();speaking=false}
 state.mode=mode;$('app').className=mode;document.documentElement.dataset.mode=mode;
 for(const [m,a] of Object.entries(APPS)){$(a.pane).classList.toggle('hidden',m!==mode);$(a.button).setAttribute('aria-pressed',m===mode)}
 $('docTitle').value=currentTitle();$('exportLabel').textContent=APPS[mode].export;updateTitle();
 renderBar();applyTiles();
 if(mode==='word'){updateWordStats();scheduleWordTidy(0)}else if(mode==='excel'){renderSheetTabs();renderedFirst=-1;renderGrid(true);setSelection(state.sel.r,state.sel.c);renderCharts()}else pageShow();
 printStyle();if(focus){if(mode==='impagina')pageFocus();else $(mode==='word'?'wordEditor':'gridScroll').focus();announce(mode==='word'?'Testo: documento':mode==='excel'?'Calcolo: foglio '+sheet().name:'Impagina: '+pageSummary())}schedulePersist()}
// Porta il focus sull'area di lavoro dell'app attiva: il documento, il foglio o la pagina.
function focusDocument(){if(isWord())restoreWordFocus();else if(isCalc())$('gridScroll').focus();else pageFocus()}
function applyDocStyle(){const ed=$('wordEditor'),d=state.doc;ed.style.setProperty('--doc-font',`'${d.font}',Calibri,'Segoe UI',Arial,sans-serif`);ed.style.setProperty('--doc-line',d.line);ed.style.setProperty('--doc-space',d.space+'pt');ed.spellcheck=state.spell;renderDocStyles()}
function setPaper(p){state.paper=p;$('page').dataset.paper=p;applyLayout();updateWordStats();schedulePersist();refreshToggles()}
