// Bozze nel browser: IndexedDB quando è disponibile, altrimenti localStorage.
// Le bozze e le versioni salvate con il vecchio nome del programma vengono riprese una volta sola.
const DRAFT_DB='tassello-ufficio',OLD_DB='office-studio-single',DRAFT_KEY='tassello-ufficio.bozza',OLD_DRAFT_KEY='office-studio.v3';
// Attesa dopo l'ultima modifica prima di salvare la bozza, in millisecondi.
const SAVE_DELAY=1000;
const PAPERS=['a4','letter','a4-landscape','letter-landscape'];
function openStore(name){return new Promise(done=>{let open;try{open=indexedDB.open(name,1)}catch(e){done(null);return}open.addEventListener('upgradeneeded',()=>open.result.createObjectStore('docs'));open.addEventListener('success',()=>done(open.result));open.addEventListener('error',()=>done(null))})}
// Una richiesta sull'archivio 'docs' dentro una transazione; si risolve quando la transazione è conclusa.
function storeCall(dbx,mode,work){return new Promise((ok,fail)=>{let tx;try{tx=dbx.transaction('docs',mode)}catch(e){fail(e);return}const req=work(tx.objectStore('docs'));tx.addEventListener('complete',()=>ok(req?.result));tx.addEventListener('error',()=>fail(tx.error))})}
function storeRows(dbx){return new Promise(res=>{try{const st=dbx.transaction('docs').objectStore('docs'),keys=st.getAllKeys(),vals=st.getAll();vals.onsuccess=()=>res(keys.result.map((k,i)=>[k,vals.result[i]]));vals.onerror=()=>res([])}catch(e){res([])}})}
async function dbOpen(){const dbx=await openStore(DRAFT_DB);if(!dbx)return null;
 try{if(!(await storeRows(dbx)).length&&indexedDB.databases&&(await indexedDB.databases()).some(d=>d.name===OLD_DB)){const old=await openStore(OLD_DB),rows=old?await storeRows(old):[];old?.close();
  if(rows.length)await new Promise(res=>{const tx=dbx.transaction('docs','readwrite'),st=tx.objectStore('docs');for(const [k,v] of rows)st.put(v,k);tx.oncomplete=tx.onerror=res})}}catch(e){}
 return dbx}
// Istantanea completa del lavoro: è anche il formato del backup JSON.
const SNAPSHOT_KEYS=['wordTitle','excelTitle','wordHTML','sheets','sheet','mode','zoom','paper','doc','styles','layout','comments','sections','biblio','cc','merge','names','spell'];
function snapshot(){const o={version:3};for(const k of SNAPSHOT_KEYS)o[k]=k==='wordHTML'?sanitizeHTML($('wordEditor').innerHTML):state[k];return o}
async function persist(){const label=$('saveState');try{const data=snapshot();if(db)await storeCall(db,'readwrite',st=>st.put(data,'current'));else localStorage.setItem(DRAFT_KEY,JSON.stringify(data));status('Pronto');label.textContent='Bozza salvata alle '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}catch(e){status('Bozza non salvata: salva il file per non perdere il lavoro');label.textContent='Bozza non salvata'}}
// Le modifiche ravvicinate producono un solo salvataggio, SAVE_DELAY dopo l'ultima.
function schedulePersist(){if(!suppressAutosave){window.clearTimeout(draftTimer);$('saveState').textContent='Salvataggio bozza…';draftTimer=setTimeout(persist,SAVE_DELAY)}}
async function restoreDraft(){let saved=null;try{saved=db?await storeCall(db,'readonly',st=>st.get('current')):JSON.parse(localStorage.getItem(DRAFT_KEY)||localStorage.getItem(OLD_DRAFT_KEY)||'null');if(saved)loadProject(saved,true)}catch(e){console.warn('Bozza non recuperabile',e)}}
// Lettura prudente di bozze e backup: ogni valore viene controllato prima di entrare nello stato.
function cleanCells(cells){const out={};if(!cells||typeof cells!=='object')return out;let n=0;for(const [ref,v] of Object.entries(cells)){if(!parseRef(ref))continue;if(++n>300000)break;const obj=v&&typeof v==='object',note=cleanNote(v?.n);out[ref]={v:String((obj?v.v:v)??'').slice(0,32767),s:obj&&v.s&&typeof v.s==='object'?v.s:{}};if(note)out[ref].n=note}return out}
const cleanSheet=(s,i)=>({name:String(s?.name||'Foglio'+(i+1)).slice(0,31),cells:cleanCells(s?.cells),widths:s?.widths||{},merges:Array.isArray(s?.merges)?s.merges:[],charts:Array.isArray(s?.charts)?s.charts.slice(0,50):[],...cleanSheetExtras(s)});
function loadProject(o,silent=false){const ok=o&&Array.isArray(o.sheets)&&o.sheets.length>0;if(!ok)throw Error('Il file non contiene un progetto valido');suppressAutosave=true;
 Object.assign(state,{excelTitle:String(o.excelTitle||'Calcolo1'),wordTitle:String(o.wordTitle||o.title||'Documento1')});
 state.sheets=o.sheets.slice(0,100).map(cleanSheet);state.sheet=Math.max(0,Math.min(Number(o.sheet)||0,state.sheets.length-1));state.names=cleanNames(o.names);
 state.wordHTML=sanitizeHTML(o.wordHTML||'<p><br></p>');$('wordEditor').innerHTML=state.wordHTML;
 state.zoom=Number(o.zoom)||100;state.paper=PAPERS.includes(o.paper)?o.paper:'a4';state.doc={...DOC_DEFAULT,...(o.doc||{})};state.doc.font=safeFont(state.doc.font);
 Object.assign(state,{styles:cleanStyles(o.styles),layout:cleanLayout(o.layout),comments:cleanComments(o.comments),sections:cleanSections(o.sections),biblio:cleanBiblio(o.biblio),cc:cleanCc(o.cc),merge:typeof o.merge?.sheet==='string'?{sheet:o.merge.sheet.slice(0,31)}:null,spell:o.spell!==false});
 mergeIdx=-1;wordHistReset();setPaper(state.paper);applyDocStyle();
 const target=o.mode==='excel'?'excel':'word';state.mode=target==='word'?'excel':'word';hist=[];redo=[];invalidate();setMode(target,{focus:!silent});setZoom(state.zoom);
 suppressAutosave=false;if(silent)return;schedulePersist();toast('Progetto ripristinato')}
function resetWordDocument(){$('wordEditor').innerHTML='<p><br></p>';state.wordHTML='<p><br></p>';wordHistReset();state.layout={...LAYOUT_DEFAULT,nav:state.layout.nav,marks:state.layout.marks};Object.assign(state,{comments:{},sections:{},biblio:{style:'apa',sources:[]},cc:{},styles:{}});if(formMode)toggleFormMode(false);applyDocStyle();mergeIdx=-1;applyLayout();renderComments()}
async function newDocument(){const word=state.mode==='word';if(!(await confirmAction(`Creare un nuovo ${word?'documento':'foglio di calcolo'}? Salva prima le modifiche importanti.`)))return;
 if(word){resetWordDocument();state.wordTitle='Documento1';wordChanged()}else{Object.assign(state,{sheets:[blankSheet()],names:[],sheet:0,excelTitle:'Calcolo1'});hist=[];redo=[];bump();renderSheetTabs()}
 $('docTitle').value=currentTitle();schedulePersist();updateTitle();toast('Nuovo file creato')}
