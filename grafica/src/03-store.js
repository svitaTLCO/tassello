// Bozze nel browser con IndexedDB: la foto aperta con le sue regolazioni e il piano in corso, il disegno con le sue
// immagini restano sul dispositivo
// e tornano alla prossima apertura. Ogni app salva solo quando è cambiata, SAVE_DELAY dopo l'ultima modifica.
const DRAFT_DB='tassello-grafica';
const SAVE_DELAY=1200;
const state={mode:'immagini'};
let db=null,draftTimer=null,suppressAutosave=false;
const dirtyApps=new Set();
function openStore(){return new Promise(done=>{let open;try{open=indexedDB.open(DRAFT_DB,1)}catch(e){done(null);return}open.addEventListener('upgradeneeded',()=>open.result.createObjectStore('docs'));open.addEventListener('success',()=>done(open.result));open.addEventListener('error',()=>done(null));open.addEventListener('blocked',()=>done(null))})}
// Una richiesta sull'archivio 'docs' dentro una transazione; si risolve quando la transazione è conclusa. Alla chiusura
// della pagina (flushTx, vedi pagehide) le scritture vanno subito nella transazione aperta lì e le letture danno un
// elenco vuoto: servono solo a togliere le immagini non più usate, che si tolgono al salvataggio successivo.
let flushTx=null;
function storeCall(mode,work){return new Promise((ok,fail)=>{if(!db){ok(undefined);return}if(flushTx){if(mode==='readonly'){ok([]);return}try{work(flushTx.objectStore('docs'));ok(undefined)}catch(e){fail(e)}return}let tx;try{tx=db.transaction('docs',mode)}catch(e){fail(e);return}const req=work(tx.objectStore('docs'));tx.addEventListener('complete',()=>ok(req?.result));tx.addEventListener('error',()=>fail(tx.error));tx.addEventListener('abort',()=>fail(tx.error||Error('Archivio non disponibile')))})}
const dbGet=key=>storeCall('readonly',st=>st.get(key));
const dbPut=(key,value)=>storeCall('readwrite',st=>st.put(value,key));
const dbDel=key=>storeCall('readwrite',st=>st.delete(key));
const dbKeys=()=>storeCall('readonly',st=>st.getAllKeys());
// Le modifiche ravvicinate producono un solo salvataggio. Le funzioni di salvataggio di ogni app stanno nel suo modulo.
function schedulePersist(app=state.mode){if(suppressAutosave)return;dirtyApps.add(app);clearTimeout(draftTimer);$('saveState').textContent='Salvataggio bozza…';draftTimer=setTimeout(persistNow,SAVE_DELAY)}
async function persistNow(){clearTimeout(draftTimer);const label=$('saveState'),apps=[...dirtyApps];dirtyApps.clear();let note='';
 try{for(const app of apps)note=(await (app==='immagini'?persistPhoto():persistDrawing()))||note;await dbPut('ui',{mode:state.mode});
  label.textContent=note||'Bozza salvata alle '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});if(note)status(note)}
 catch(e){console.warn('Bozza non salvata',e);label.textContent='Bozza non salvata';status('Bozza non salvata: esporta la foto per non perdere il lavoro')}}
// Chiudendo o ricaricando la pagina si salva subito quello che aspettava SAVE_DELAY. Una scrittura alla volta, ognuna
// in attesa della fine della precedente, non fa in tempo: la pagina sparisce prima. Così tutte le scritture entrano in
// una transazione sola, aperta qui; i passi di persistNow si risolvono subito e commit la chiude prima che la pagina sparisca.
addEventListener('pagehide',()=>{if(!dirtyApps.size||!db)return;let tx;try{tx=db.transaction('docs','readwrite')}catch(e){return}flushTx=tx;persistNow().finally(()=>{flushTx=null;try{tx.commit()}catch(e){}})});
