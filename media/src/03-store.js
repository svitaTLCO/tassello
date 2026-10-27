// Bozze nel browser con IndexedDB: l'audio aperto, il progetto video e i suoi file restano sul dispositivo
// e tornano alla prossima apertura. Ogni app salva solo quando è cambiata, SAVE_DELAY dopo l'ultima modifica.
const DRAFT_DB='tassello-media';
const SAVE_DELAY=1500;
// Oltre questa dimensione l'audio non entra nella bozza: si chiede di esportarlo per non perdere il lavoro.
const DRAFT_LIMIT=600e6;
const state={mode:'audio'};
let db=null,draftTimer=null,suppressAutosave=false;
const dirtyApps=new Set();
function openStore(){return new Promise(done=>{let open;try{open=indexedDB.open(DRAFT_DB,1)}catch(e){done(null);return}open.addEventListener('upgradeneeded',()=>open.result.createObjectStore('docs'));open.addEventListener('success',()=>done(open.result));open.addEventListener('error',()=>done(null));open.addEventListener('blocked',()=>done(null))})}
// Una richiesta sull'archivio 'docs' dentro una transazione; si risolve quando la transazione è conclusa.
function storeCall(mode,work){return new Promise((ok,fail)=>{if(!db){ok(undefined);return}let tx;try{tx=db.transaction('docs',mode)}catch(e){fail(e);return}const req=work(tx.objectStore('docs'));tx.addEventListener('complete',()=>ok(req?.result));tx.addEventListener('error',()=>fail(tx.error));tx.addEventListener('abort',()=>fail(tx.error||Error('Archivio non disponibile')))})}
const dbGet=key=>storeCall('readonly',st=>st.get(key));
const dbPut=(key,value)=>storeCall('readwrite',st=>st.put(value,key));
const dbDel=key=>storeCall('readwrite',st=>st.delete(key));
const dbKeys=()=>storeCall('readonly',st=>st.getAllKeys());
// Le modifiche ravvicinate producono un solo salvataggio. Le funzioni di salvataggio di ogni app stanno nel suo modulo.
function schedulePersist(app=state.mode){if(suppressAutosave)return;dirtyApps.add(app);clearTimeout(draftTimer);$('saveState').textContent='Salvataggio bozza…';draftTimer=setTimeout(persistNow,SAVE_DELAY)}
async function persistNow(){clearTimeout(draftTimer);const label=$('saveState'),apps=[...dirtyApps];dirtyApps.clear();let note='';
 try{for(const app of apps)note=(await (app==='audio'?persistAudio():persistVideo()))||note;await dbPut('ui',{mode:state.mode});
  label.textContent=note||'Bozza salvata alle '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});if(note)status(note)}
 catch(e){console.warn('Bozza non salvata',e);label.textContent='Bozza non salvata';status('Bozza non salvata: esporta il lavoro per non perderlo')}}
addEventListener('pagehide',()=>{if(dirtyApps.size)persistNow()});
