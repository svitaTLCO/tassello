const DOC_DEFAULT={font:'Calibri',line:'1.15',space:'8'};
const LAYOUT_DEFAULT={margins:'normal',mt:25,mb:20,ml:20,mr:20,cols:1,colGap:12.5,hl:'',hc:'',hr:'',fl:'',fc:'',fr:'',firstDiff:false,marks:true,nav:false,wmText:'',wmColor:'#c0c0c0',wmDiag:true,pageColor:'',pbStyle:'none',pbW:1,pbColor:'#404040',pgStart:0,evenDiff:false,ehl:'',ehc:'',ehr:'',efl:'',efc:'',efr:'',hfFont:'',hfSize:9,hfBold:false,hfItalic:false,hfColor:'#404040',logo:'',logoPos:'l',logoH:12,logoAlt:'',logoNW:0,logoNH:0};
const state={mode:'word',wordTitle:'Documento1',excelTitle:'Calcolo1',sheets:[{name:'Foglio1',cells:{},widths:{},merges:[]}],sheet:0,sel:{r:0,c:0,r2:0,c2:0},zoom:100,paper:'a4',wordHTML:'<p><br></p>',doc:{...DOC_DEFAULT},styles:{},layout:{...LAYOUT_DEFAULT},comments:{},sections:{},biblio:{style:'apa',sources:[]},cc:{},merge:null,names:[],showComments:false,spell:true};
const ROWS=1000,COLS=52,ROWHEIGHT=24,HEADERHEIGHT=27,BASECOL=64;
let currentTab='Home',sheetDrag=false,calcVersion=0,calcMemo=new Map(),hist=[],redo=[],suppressAutosave=false,activeWordRange=null,db=null,saveTimer,tabExitArmed=false,speaking=false;
const lastColor={fontColor:'#c00000',hiliteColor:'#ffff00',fillColor:'#ffe699'};
const sheet=()=>state.sheets[state.sheet];
const cell=(r,c,s=sheet())=>s.cells[toRef(r,c)]||null;
const ensureCell=(r,c,s=sheet())=>s.cells[toRef(r,c)]||(s.cells[toRef(r,c)]={v:'',s:{}});
const cellRaw=(r,c,s=sheet())=>cell(r,c,s)?.v??'';
const clampR=r=>Math.max(0,Math.min(ROWS-1,r)),clampC=c=>Math.max(0,Math.min(COLS-1,c));
const fmtN=n=>Number.isFinite(n)?n.toLocaleString('it-IT',{maximumFractionDigits:4}):'';
// La cronologia di Excel salva l'intera cartella: inserimenti, eliminazioni e fogli restano coerenti con le formule tra fogli.
function wbSnap(){return JSON.stringify({sheets:state.sheets,sheet:state.sheet,names:state.names||[]})}
function trimHist(a){let total=a.reduce((s,x)=>s+x.length,0);while(a.length>1&&(a.length>60||total>40e6))total-=a.shift().length}
function storeHistory(){hist.push(wbSnap());trimHist(hist);redo=[]}
function restoreHistory(which){const source=which==='undo'?hist:redo,target=which==='undo'?redo:hist;if(!source.length){toast('Nessuna operazione da '+(which==='undo'?'annullare':'ripetere'));return}target.push(wbSnap());const o=JSON.parse(source.pop());state.sheets=o.sheets;state.sheet=Math.min(o.sheet,o.sheets.length-1);state.names=o.names||[];renderedFirst=-1;renderSheetTabs();bump();announce(which==='undo'?'Operazione annullata':'Operazione ripetuta')}
function updateTitle(){const w=state.mode==='word';document.title=($('docTitle').value.trim()||'Senza titolo')+' — '+(w?'Testo':'Calcolo')+' · Tassello Ufficio'}
function setMode(mode,{focus=true}={}){if(mode===state.mode)return;if(state.mode==='word')state.wordHTML=sanitizeHTML($('wordEditor').innerHTML);else finishCell();closeFind(false);if(speaking){speechSynthesis.cancel();speaking=false}
 state.mode=mode;const w=mode==='word';$('app').className=mode;document.documentElement.dataset.mode=mode;$('wordPane').classList.toggle('hidden',!w);$('excelPane').classList.toggle('hidden',w);$('switchWord').setAttribute('aria-pressed',w);$('switchExcel').setAttribute('aria-pressed',!w);$('docTitle').value=w?state.wordTitle:state.excelTitle;$('exportLabel').textContent=w?'Esporta HTML':'Esporta CSV';updateTitle();
 currentTab='Home';renderTabs();renderRibbon();if(!w){renderSheetTabs();renderedFirst=-1;renderGrid();setSelection(state.sel.r,state.sel.c);renderCharts()}else{updateWordStats();scheduleWordTidy(0)}printStyle();
 if(focus){(w?$('wordEditor'):$('gridScroll')).focus();announce(w?'Testo: documento':'Calcolo: foglio '+sheet().name)}schedulePersist()}
function applyDocStyle(){const ed=$('wordEditor'),d=state.doc;ed.style.setProperty('--doc-font',`'${d.font}',Calibri,'Segoe UI',Arial,sans-serif`);ed.style.setProperty('--doc-line',d.line);ed.style.setProperty('--doc-space',d.space+'pt');ed.spellcheck=state.spell;renderDocStyles()}
function setPaper(p){state.paper=p;$('page').dataset.paper=p;applyLayout();updateWordStats();schedulePersist();refreshToggles()}
