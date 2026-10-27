// Progetto multitraccia dell'app Audio, sul modello di un piccolo studio di registrazione: tracce con volume,
// bilanciamento, muto, solo ed effetti semplici; regioni (tratti di audio) che si mettono, spostano, accorciano,
// dividono e ripetono liberamente sul tempo. L'editor della forma d'onda lavora su una regione alla volta e le sue
// modifiche cambiano solo quella regione. I suoni stanno in SOURCES; le regioni ne indicano un tratto (off, dur).
const TRACK_COLORS=[['#b35500','Arancio'],['#2457c5','Blu'],['#1e7a46','Verde'],['#7a3db8','Viola'],['#b0306a','Magenta'],['#0f7a8a','Turchese'],['#8a6d00','Ocra'],['#575757','Grigio']];
const P={title:'Audio1',bpm:120,sig:4,grid:'time',metro:false,countIn:false,cycle:{on:false,a:0,b:0},latency:'auto',tracks:[],regions:[],sel:null,track:null,t:0,pxs:40,version:0,exported:0};
const SOURCES=new Map(),dirtySources=new Set();
let phist=[],predo=[],rclip=null;
const trackOf=id=>P.tracks.find(t=>t.id===id);
const regionOf=id=>P.regions.find(r=>r.id===id);
const regionsOn=tid=>P.regions.filter(r=>r.track===tid).sort((a,b)=>a.start-b.start||(a.id<b.id?-1:1));
const regionEnd=r=>r.start+r.dur;
const projDur=()=>P.regions.reduce((t,r)=>Math.max(t,regionEnd(r)),0);
const beatDur=()=>60/P.bpm,barDur=()=>beatDur()*P.sig;
const gridStep=()=>P.grid==='beats'?beatDur():1;
const fineStep=()=>P.grid==='beats'?beatDur()/4:0.01;
const selRegion=()=>P.sel?regionOf(P.sel):null;
const selTrack=()=>trackOf(P.track)||P.tracks[0]||null;
const audioModified=()=>P.regions.length>0&&P.version!==P.exported;
function newTrack(name){const n=P.tracks.length;return{id:uid(),name:name||`Traccia ${n+1}`,color:TRACK_COLORS[n%TRACK_COLORS.length][0],vol:0,pan:0,mute:false,solo:false,low:0,high:0,comp:0,reverb:0}}
function addSource(buf){const id=uid();SOURCES.set(id,buf);dirtySources.add(id);return id}
function newRegion(track,src,start,name){return{id:uid(),track,src,off:0,dur:SOURCES.get(src).duration,start:Math.max(0,start),gain:0,fadeIn:0,fadeOut:0,name:name||'Regione',markers:[]}}
// Cronologia del progetto: istantanee di tracce e regioni. L'editor della regione ha la sua cronologia, più fine.
const pSnap=()=>JSON.stringify({title:P.title,tracks:P.tracks,regions:P.regions,bpm:P.bpm,sig:P.sig,grid:P.grid,cycle:P.cycle});
function pCommit(label,fn,opts={}){const before=pSnap(),r=fn(),after=pSnap();if(before===after)return r;lastScope='project';phist.push({label,before,after,sel:P.sel});if(phist.length>150)phist.shift();predo=[];projectChanged(opts);return r}
function pUndo(redoing){const from=redoing?predo:phist,to=redoing?phist:predo;if(!from.length){toast(redoing?'Niente da ripetere':'Niente da annullare');return}mixStop(true);const e=from.pop();Object.assign(P,JSON.parse(redoing?e.after:e.before));to.push(e);if(!P.sel)P.sel=e.sel;projectChanged();announce((redoing?'Ripetuto: ':'Annullato: ')+e.label)}
// Dopo ogni modifica: l'editor segue la sua regione, la vista si ridisegna, la riproduzione si aggiorna.
function projectChanged({live=false}={}){P.version++;if(P.sel&&!regionOf(P.sel))P.sel=null;if(!trackOf(P.track))P.track=P.tracks[0]?.id||null;checkEditorBinding();renderArrange();updateArrangeUI();if(MIX.playing){live?mixLive():mixRestart()}schedulePersist('audio')}
// Editor della regione. Si apre su una copia del tratto della regione; alla prima modifica la regione riceve un suono
// tutto suo (gli altri usi dello stesso suono, per esempio una regione duplicata, non cambiano).
function openRegion(r,{focus=true,quiet=false}={}){const src=SOURCES.get(r.src);if(!src){toast('L’audio di questa regione non è disponibile');return false}stopPlayback(false);
 const rate=src.sampleRate,a=clamp(Math.round(r.off*rate),0,src.length-1),b=clamp(a+Math.round(r.dur*rate),a+1,src.length);
 A.region=null;setAudioDoc(makeBuffer(sliceCh(src,a,b),rate),{title:r.name,markers:(r.markers||[]).map(m=>({...m}))});A.region=r.id;A.own=null;A.bound={src:r.src,off:r.off,dur:r.dur};
 showEditor(true);updateEditorBar();if(focus)$('wave').focus();if(!quiet)announce(`Editor: regione «${r.name}» della traccia «${trackOf(r.track)?.name||''}», ${sayTime(r.dur)}`);return true}
function closeRegionEditor(){A.region=null;A.own=null;A.bound=null;setAudioDoc(null,{title:'',markers:[]});updateEditorBar()}
function regionFromEditor(){const r=regionOf(A.region);if(!r)return;
 if(!A.buf){P.regions=P.regions.filter(x=>x!==r);A.region=null;A.bound=null;projectChanged();updateEditorBar();announce('La regione è rimasta vuota ed è stata tolta dalla traccia');return}
 A.own??=uid();SOURCES.set(A.own,A.buf);dirtySources.add(A.own);Object.assign(r,{src:A.own,off:0,dur:A.buf.duration,markers:A.markers.map(m=>({...m}))});A.bound={src:r.src,off:0,dur:r.dur};projectChanged();updateEditorBar()}
function regionMarkersFromEditor(){const r=A.region&&regionOf(A.region);if(r)r.markers=A.markers.map(m=>({...m}))}
// Se la regione nell'editor cambia altrove (annulla, taglio, divisione), l'editor la riapre; se sparisce, si svuota.
function checkEditorBinding(){if(!A.region)return;const r=regionOf(A.region);if(!r){closeRegionEditor();return}const b=A.bound;if(!b||b.src!==r.src||Math.abs(b.off-r.off)>1e-6||Math.abs(b.dur-r.dur)>1e-6)openRegion(r,{focus:false,quiet:true});else if(A.title!==r.name){A.title=r.name;updateEditorBar()}}
// Importazione: ogni file diventa una traccia con una regione, all'indicatore (o all'inizio se il progetto è vuoto).
async function importAudioTracks(files,{at=null}={}){files=[...files];const wasEmpty=!P.regions.length,start=at??(wasEmpty?0:P.t);let first=null,n=0;
 for(const [i,f] of files.entries()){status(`Lettura di «${f.name}» (${i+1} di ${files.length})…`);let res;try{res=await decodeAudioFile(f)}catch(e){toast(e.message);continue}if(!res?.buffer){toast(`«${f.name}» non contiene audio`);continue}
  const src=addSource(res.buffer),name=baseName(f.name);pCommit('Importa '+f.name,()=>{const t=newTrack(name);P.tracks.push(t);const r=newRegion(t.id,src,start,name);r.markers=res.markers||[];P.regions.push(r);P.track=t.id;P.sel=r.id;first??=r});n++}
 status();if(!first)return null;if(wasEmpty&&/^Audio\d*$/.test(P.title)){P.title=baseName(files[0].name);if(isAudio()){$('docTitle').value=P.title;updateTitle()}}
 if(wasEmpty&&n===1)openRegion(first,{focus:false,quiet:true});ensureArVisible(start);focusLane(first.track);
 announce(n===1?`Importato ${files[0].name} in una nuova traccia: ${sayTime(first.dur)}, da ${sayTime(first.start)}`:`Importati ${n} file, ognuno in una traccia`);return first}
// Un suono già pronto (dal Video o dal mixaggio) entra in una traccia nuova.
function importBufferAsTrack(buf,name,{markers=[],at=0}={}){const src=addSource(buf);let r;pCommit('Nuova traccia da '+name,()=>{const t=newTrack(name);P.tracks.push(t);r=newRegion(t.id,src,at,name);r.markers=markers;P.regions.push(r);P.track=t.id;P.sel=r.id});return r}
async function newAudioProject(){if(audioModified()&&!(await confirmAction('Il progetto audio ha modifiche non salvate né esportate. Se ne crei uno nuovo le perdi: vuoi continuare?','Nuovo progetto')))return;
 mixStop(false);closeRegionEditor();SOURCES.clear();dirtySources.clear();phist=[];predo=[];Object.assign(P,{title:'Audio1',tracks:[],regions:[],sel:null,track:null,t:0,cycle:{on:false,a:0,b:0}});P.exported=P.version+1;projectChanged();$('docTitle').value=P.title;updateTitle();announce('Nuovo progetto audio vuoto: registra o importa un file')}
// Pulizia di bozze e progetti aperti da file: ogni valore viene controllato prima di entrare nel progetto.
function cleanAudioProject(p){const n=(v,d,lo=-Infinity,hi=Infinity)=>Number.isFinite(Number(v))?clamp(Number(v),lo,hi):d,s=(v,l=200)=>String(v??'').slice(0,l),col=v=>/^#[0-9a-f]{6}$/i.test(v)?v:null,arr=v=>Array.isArray(v)?v.slice(0,2000):[];
 const tracks=arr(p?.tracks).filter(t=>t&&t.id).map((t,i)=>({id:s(t.id,40),name:s(t.name||`Traccia ${i+1}`,80),color:col(t.color)||TRACK_COLORS[i%8][0],vol:n(t.vol,0,-60,12),pan:n(t.pan,0,-1,1),mute:!!t.mute,solo:!!t.solo,low:n(t.low,0,-15,15),high:n(t.high,0,-15,15),comp:n(t.comp,0,0,100),reverb:n(t.reverb,0,0,100)}));
 const ids=new Set(tracks.map(t=>t.id));
 const regions=arr(p?.regions).filter(r=>r&&ids.has(r.track)&&r.src).map(r=>({id:s(r.id||uid(),40),track:s(r.track,40),src:s(r.src,40),off:n(r.off,0,0),dur:n(r.dur,0,0),start:n(r.start,0,0),gain:n(r.gain,0,-60,24),fadeIn:n(r.fadeIn,0,0,600),fadeOut:n(r.fadeOut,0,0,600),name:s(r.name||'Regione',120),markers:arr(r.markers).filter(m=>Number.isFinite(m?.pos)).map(m=>({id:s(m.id||uid(),40),pos:Math.max(0,Math.round(m.pos)),label:s(m.label)}))})).filter(r=>r.dur>0);
 return{title:s(p?.title||'Audio1',120),bpm:n(p?.bpm,120,30,300),sig:[2,3,4,5,6,7].includes(Number(p?.sig))?Number(p.sig):4,grid:p?.grid==='beats'?'beats':'time',metro:!!p?.metro,countIn:!!p?.countIn,cycle:{on:!!p?.cycle?.on,a:n(p?.cycle?.a,0,0),b:n(p?.cycle?.b,0,0)},latency:p?.latency==='auto'||p?.latency==null?'auto':n(p.latency,0,0,1000),tracks,regions,sel:null,track:tracks[0]?.id||null,t:n(p?.t,0,0),pxs:n(p?.pxs,40,1,2000)}}
const projectData=()=>({title:P.title,bpm:P.bpm,sig:P.sig,grid:P.grid,metro:P.metro,countIn:P.countIn,cycle:P.cycle,latency:P.latency,tracks:P.tracks,regions:P.regions,t:P.t,pxs:P.pxs});
// Bozza: progetto e stato dell'editor a ogni modifica; i suoni solo quando sono nuovi o cambiati.
async function persistAudio(){const meta={...projectData(),sel:P.sel,track:P.track,version:P.version,exported:P.exported,editor:A.region?{region:A.region,cursor:A.cursor,selA:A.selA,selB:A.selB}:null};
 const used=new Set(P.regions.map(r=>r.src));let bytes=0;for(const id of used){const b=SOURCES.get(id);if(b)bytes+=b.length*b.numberOfChannels*4}
 if(bytes>DRAFT_LIMIT){await dbPut('audio-project',{...meta,regions:[],tooBig:true});return 'Progetto troppo grande per la bozza: salvalo in ZIP per non perderlo'}
 // Un suono non più usato resta da salvare: se l'eliminazione della sua regione viene annullata, serve ancora.
 for(const id of [...dirtySources]){const b=SOURCES.get(id);if(!b){dirtySources.delete(id);continue}if(used.has(id)){dirtySources.delete(id);await dbPut('asrc:'+id,{rate:b.sampleRate,channels:Array.from({length:b.numberOfChannels},(_,c)=>b.getChannelData(c))})}}
 await dbPut('audio-project',meta);return ''}
async function restoreAudio(){let meta=await dbGet('audio-project');
 if(!meta){const old=await dbGet('audio-meta'),data=await dbGet('audio-data');if(old&&data?.channels?.length){const buf=makeBuffer(data.channels,data.rate);if(buf){const t=newTrack(String(old.title||'Traccia 1').slice(0,80)),src=addSource(buf),r=newRegion(t.id,src,0,String(old.title||'Regione 1').slice(0,120));r.markers=Array.isArray(old.markers)?old.markers:[];Object.assign(P,{title:String(old.title||'Audio1').slice(0,120),tracks:[t],regions:[r],track:t.id,sel:r.id});await persistAudio();await dbDel('audio-meta');await dbDel('audio-data')}}return}
 Object.assign(P,cleanAudioProject(meta));P.sel=regionOf(meta.sel)?meta.sel:null;P.track=trackOf(meta.track)?meta.track:P.tracks[0]?.id||null;P.version=meta.version||0;P.exported=meta.exported??P.version;
 const missing=[];for(const id of new Set(P.regions.map(r=>r.src))){const d=await dbGet('asrc:'+id);const b=d?.channels?.length?makeBuffer(d.channels,d.rate):null;if(b)SOURCES.set(id,b);else missing.push(id)}
 if(missing.length){P.regions=P.regions.filter(r=>!missing.includes(r.src));toast('Alcune regioni non sono state recuperate dalla bozza')}if(meta.tooBig)toast('Il progetto era troppo grande per la bozza: riaprilo dal file ZIP salvato')
 const ed=meta.editor&&regionOf(meta.editor.region);if(ed&&openRegion(ed,{focus:false,quiet:true})){A.cursor=meta.editor.cursor|0;A.selA=meta.editor.selA|0;A.selB=meta.editor.selB|0;clampSel()}}
async function gcSources(){try{const used=new Set(P.regions.map(r=>'asrc:'+r.src));for(const k of await dbKeys())if(String(k).startsWith('asrc:')&&!used.has(k))await dbDel(k)}catch(e){}}
// Progetto in un file: ZIP con progetto-audio.json e un WAV per ogni suono (32 bit in virgola mobile, senza perdite).
async function saveAudioProjectZip(){if(!P.tracks.length){toast('Il progetto è vuoto');return}const used=[...new Set(P.regions.map(r=>r.src))].filter(id=>SOURCES.has(id));
 const files=[{name:'progetto-audio.json',data:JSON.stringify({programma:'Tassello Media',versione:'{{VERSIONE}}',progetto:projectData()},null,1)},...used.map(id=>({name:`audio/${id}.wav`,data:wavBlob(SOURCES.get(id),32)}))];
 const zip=await work('Salvataggio del progetto',()=>zipBlob(files,f=>status(`Salvataggio del progetto ${Math.round(f*100)}%`)));if(!zip)return;download(zip,extName(P.title+' (progetto audio)','zip'));P.exported=P.version;schedulePersist('audio');toast(`Progetto salvato (${fmtBytes(zip.size)}): riaprilo con Apri in Audio`)}
async function openAudioProjectZip(entries){let data;try{data=JSON.parse(await entries['progetto-audio.json'].text())}catch(e){toast('Il file progetto-audio.json è danneggiato');return}
 if(audioModified()&&!(await confirmAction('Aprendo il progetto sostituisci quello attuale. Continuare?','Apri')))return;const p=cleanAudioProject(data.progetto||data),bufs=new Map();
 for(const id of new Set(p.regions.map(r=>r.src))){const f=entries[`audio/${id}.wav`];if(!f)continue;try{const w=readWav(await f.arrayBuffer());const b=makeBuffer(w.channels,w.rate);if(b)bufs.set(id,b)}catch(e){}}
 mixStop(false);closeRegionEditor();SOURCES.clear();dirtySources.clear();for(const [id,b] of bufs){SOURCES.set(id,b);dirtySources.add(id)}phist=[];predo=[];Object.assign(P,p);P.regions=P.regions.filter(r=>SOURCES.has(r.src));P.exported=P.version+1;projectChanged();
 $('docTitle').value=P.title;updateTitle();await gcSources();announce(`Progetto «${P.title}» aperto: ${P.tracks.length} tracce, ${P.regions.length} regioni, ${sayTime(projDur())}`)}
