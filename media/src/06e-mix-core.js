// Progetto multitraccia dell'app Audio, sul modello di un piccolo studio di registrazione: tracce con volume,
// bilanciamento, muto, solo ed effetti semplici; regioni (tratti di audio) che si mettono, spostano, accorciano,
// dividono e ripetono liberamente sul tempo. L'editor della forma d'onda lavora su una regione alla volta e le sue
// modifiche cambiano solo quella regione. I suoni stanno in SOURCES; le regioni ne indicano un tratto (off, dur).
const TRACK_COLORS=[['#b35500','Arancio'],['#2457c5','Blu'],['#1e7a46','Verde'],['#7a3db8','Viola'],['#b0306a','Magenta'],['#0f7a8a','Turchese'],['#8a6d00','Ocra'],['#575757','Grigio']];
const P={title:'Audio1',bpm:120,sig:4,grid:'time',metro:false,countIn:false,cycle:{on:false,a:0,b:0},punch:{on:false,a:0,b:0,pre:2},limiter:{on:false,ceil:[]},latency:'auto',tracks:[],regions:[],sel:null,track:null,t:0,pxs:40,version:0,exported:0};
const SOURCES=new Map(),dirtySources=new Set();
let phist=[],predo=[],rclip=null;
const trackOf=id=>P.tracks.find(t=>t.id===id);
// Tutte le sorgenti di una regione: quella attiva e le take.
const regionSources=r=>[r.src,...(r.takes||[]).map(t=>t.src)].filter(Boolean);
const regionOf=id=>P.regions.find(r=>r.id===id);
const regionsOn=tid=>P.regions.filter(r=>r.track===tid).sort((a,b)=>a.start-b.start||(a.id<b.id?-1:1));
const regionEnd=r=>r.start+r.dur;
const projDur=()=>P.regions.reduce((t,r)=>Math.max(t,regionEnd(r)),0);
const beatDur=()=>60/P.bpm,barDur=()=>beatDur()*P.sig;
// Le note MIDI stanno in tick interi a 480 per semiminima (PPQ): il giro con i file .mid diventa esatto, i
// confronti sono fra interi e non esiste una «nota libera» da tenere a posto. Le regioni MIDI hanno la verità nei
// tick (startT, durT, offT) e uno specchio in secondi (start, dur, off), tenuto allineato in pCommit: così tutto il
// codice di spostamento, taglio, divisione e ciclo continua a lavorare in secondi senza sapere dei tick, e
// cambiare tempo allunga le note insieme alla griglia invece di staccarle.
const MIDIPPQ=480,midiSecBpm=(t,bpm)=>t*60/(bpm*MIDIPPQ),midiTickBpm=(s,bpm)=>Math.round(s*MIDIPPQ*bpm/60);
const midiSec=t=>midiSecBpm(t,P.bpm),midiTick=s=>midiTickBpm(s,P.bpm);
// Sincronizzazione dello specchio: con toTicks i secondi diventano tick (arrotondati) e poi si ricalcolano i
// secondi, così una regione spostata o tagliata resta agganciata alla griglia; senza, i tick sono già verità e si
// ricalcolano solo i secondi (per esempio dopo un cambio di tempo).
function syncMidiRegions(bpm=P.bpm,toTicks=false){for(const r of P.regions)if(r.kind==='midi'){
 if(toTicks){r.startT=Math.max(0,Math.round(midiTickBpm(r.start,bpm)));r.durT=Math.max(1,Math.round(midiTickBpm(r.dur,bpm)));r.offT=Math.max(0,Math.round(midiTickBpm(r.off,bpm)))}
 r.start=midiSecBpm(r.startT,bpm);r.dur=midiSecBpm(r.durT,bpm);r.off=midiSecBpm(r.offT,bpm)}}
// Una regione MIDI non ha un suono dentro: i comandi che leggono il buffer (forma d'onda, dissolvenze, take,
// comping) si fermano qui con un messaggio chiaro invece di fallire più avanti o mostrare un editor vuoto.
function regionAvailable(r){if(r?.kind!=='midi')return true;toast('Non disponibile per una regione MIDI');return false}
const gridStep=()=>P.grid==='beats'?beatDur():1;
const fineStep=()=>P.grid==='beats'?beatDur()/4:0.01;
const selRegion=()=>P.sel?regionOf(P.sel):null;
const selTrack=()=>trackOf(P.track)||P.tracks[0]||null;
const audioModified=()=>P.regions.length>0&&P.version!==P.exported;
function newTrack(name,kind='audio'){const n=P.tracks.length,t={id:uid(),name:name||`Traccia ${n+1}`,color:TRACK_COLORS[n%TRACK_COLORS.length][0],vol:0,pan:0,mute:false,solo:false,low:0,high:0,comp:0,reverb:0,duck:0,voice:false,kind:kind==='midi'?'midi':kind==='bus'?'bus':'audio',out:null,input:null,chain:[],auto:{vol:[],pan:[],reverb:[],low:[],high:[],comp:[]},autoOn:{vol:false,pan:false,reverb:false,low:false,high:false,comp:false}};
 if(t.kind==='midi'){t.midiOut=null;t.midiCh=1;t.program=null;t.arm=false}
 return t}
function addSource(buf){const id=uid();SOURCES.set(id,buf);dirtySources.add(id);return id}
// Moduli della catena: ai controlli fissi della traccia (bassi, alti, compressione) si aggiungono questi componenti,
// in ordine a scelta. Ogni tipo dichiara i suoi parametri come [minimo, massimo, predefinito]; il motore li costruisce
// con le primitive del browser e la stessa catena suona in ascolto e nel mix esportato.
const CHAIN_TYPES={
 comp:{name:'Compressore',params:{thr:[-60,0,-24],ratio:[1,20,4],att:[1,200,10],rel:[20,1000,250],make:[0,24,0]}},
 eq:{name:'Equalizzatore parametrico',params:{lo:[-15,15,0],loHz:[40,400,120],mid:[-15,15,0],midHz:[200,6000,1000],hi:[-15,15,0],hiHz:[2000,16000,6000]}},
 delay:{name:'Delay',params:{ms:[10,2000,300],fb:[0,90,35],mix:[0,100,30]}},
 reverb:{name:'Riverbero',params:{wet:[0,100,40]}},
 drive:{name:'Saturazione',params:{drive:[0,100,40]}},
 wide:{name:'Stereo ampio',params:{wide:[0,100,60]}}};
const chainParams=m=>{const out={};for(const [k,[lo,hi,def]] of Object.entries(CHAIN_TYPES[m.tipo].params))out[k]=clamp(Number(m.params?.[k]??def),lo,hi);return out};
function newRegion(track,src,start,name){return{id:uid(),track,src,off:0,dur:SOURCES.get(src).duration,start:Math.max(0,start),gain:0,fadeIn:0,fadeOut:0,name:name||'Regione',gainAuto:[],gainOn:false,markers:[]}}
// Regione MIDI: tutto in tick, con una lunghezza di partenza di una battuta. Le note sono relative all'inizio.
function newMidiRegion(track,startT,name){const s=Math.max(0,Math.round(startT)),d=MIDIPPQ*P.sig;return{id:uid(),track,kind:'midi',startT:s,durT:d,offT:0,start:midiSec(s),dur:midiSec(d),off:0,name:name||'Regione MIDI',notes:[]}}
// Cronologia del progetto: istantanee di tracce e regioni. L'editor della regione ha la sua cronologia, più fine.
const pSnap=()=>JSON.stringify({title:P.title,tracks:P.tracks,regions:P.regions,bpm:P.bpm,sig:P.sig,grid:P.grid,cycle:P.cycle});
function pCommit(label,fn,opts={}){const before=pSnap(),bpm0=P.bpm,r=fn();
 // Le regioni MIDI: se il tempo è cambiato ricalcolo i secondi dai tick, altrimenti aggancio i tick ai secondi
 // (la modifica è arrivata in secondi) e ricalcolo i secondi. Prima dell'istantanea, così la cronologia è coerente.
 syncMidiRegions(P.bpm,P.bpm===bpm0);
 // Se durante l'ascolto una traccia MIDI diventa muta o esce dal solo, le sue note aperte si spengono subito:
 // il note off programmato non arriverebbe più perché la traccia non è più udibile.
 if(MIX.playing)midiKillInaudible();
 const after=pSnap();if(before===after)return r;lastScope='project';phist.push({label,before,after,sel:P.sel});if(phist.length>150)phist.shift();predo=[];projectChanged(opts);return r}
function pUndo(redoing){const from=redoing?predo:phist,to=redoing?phist:predo;if(!from.length){toast(redoing?'Niente da ripetere':'Niente da annullare');return}mixStop(true);const e=from.pop();Object.assign(P,JSON.parse(redoing?e.after:e.before));to.push(e);if(!P.sel)P.sel=e.sel;projectChanged();announce((redoing?'Ripetuto: ':'Annullato: ')+e.label)}
// Dopo ogni modifica: l'editor segue la sua regione, la vista si ridisegna, la riproduzione si aggiorna.
function projectChanged({live=false}={}){P.version++;if(P.sel&&!regionOf(P.sel))P.sel=null;if(!trackOf(P.track))P.track=P.tracks[0]?.id||null;checkEditorBinding();renderArrange();updateArrangeUI();if(MIX.playing){live?mixLive():mixRestart()}schedulePersist('audio')}
// Editor della regione. Si apre su una copia del tratto della regione; alla prima modifica la regione riceve un suono
// tutto suo (gli altri usi dello stesso suono, per esempio una regione duplicata, non cambiano).
function openRegion(r,{focus=true,quiet=false}={}){if(!regionAvailable(r))return false;const src=SOURCES.get(r.src);if(!src){toast('L’audio di questa regione non è disponibile');return false}stopPlayback(false);
 const rate=src.sampleRate,a=clamp(Math.round(r.off*rate),0,src.length-1),b=clamp(a+Math.round(r.dur*rate),a+1,src.length);
 A.region=null;setAudioDoc(copyRange(src,a,b),{title:r.name,markers:(r.markers||[]).map(m=>({...m}))});A.region=r.id;A.own=null;A.bound={src:r.src,off:r.off,dur:r.dur};
 showEditor(true);updateEditorBar();if(focus)$('wave').focus();if(!quiet)announce(`Editor: regione «${r.name}» della traccia «${trackOf(r.track)?.name||''}», ${sayTime(r.dur)}`);return true}
function closeRegionEditor(){A.region=null;A.own=null;A.bound=null;setAudioDoc(null,{title:'',markers:[]});updateEditorBar()}
function regionFromEditor(){const r=regionOf(A.region);if(!r)return;
 if(!A.buf){P.regions=P.regions.filter(x=>x!==r);A.region=null;A.bound=null;projectChanged();updateEditorBar();announce('Eliminato tutto l’audio: la regione è rimasta vuota ed è stata tolta dalla traccia');return}
 A.own??=uid();SOURCES.set(A.own,A.buf);dirtySources.add(A.own);Object.assign(r,{src:A.own,off:0,dur:A.buf.duration,markers:A.markers.map(m=>({...m}))});A.bound={src:r.src,off:0,dur:r.dur};projectChanged();updateEditorBar()}
function regionMarkersFromEditor(){const r=A.region&&regionOf(A.region);if(r)r.markers=A.markers.map(m=>({...m}))}
// Se la regione nell'editor cambia altrove (annulla, taglio, divisione), l'editor la riapre; se sparisce, si svuota.
function checkEditorBinding(){if(!A.region)return;const r=regionOf(A.region);if(!r){closeRegionEditor();return}const b=A.bound;if(!b||b.src!==r.src||Math.abs(b.off-r.off)>1e-6||Math.abs(b.dur-r.dur)>1e-6)openRegion(r,{focus:false,quiet:true});else if(A.title!==r.name){A.title=r.name;updateEditorBar()}}
// Al più limit lavori insieme; ogni promessa restituisce {v} oppure {e}, così un errore non resta senza risposta.
function pooled(tasks,limit){const queue=[],out=tasks.map(task=>new Promise(res=>queue.push({task,res})));let active=0;
 const go=()=>{while(active<limit&&queue.length){const {task,res}=queue.shift();active++;Promise.resolve().then(task).then(v=>({v}),e=>({e})).then(r=>{active--;res(r);go()})}};go();return out}
// Importazione: ogni file diventa una traccia con una regione, all'indicatore (o all'inizio se il progetto è vuoto).
// Fino a tre file si decodificano insieme, su più processori; le tracce entrano comunque nell'ordine dei file.
async function importAudioTracks(files,{at=null}={}){files=[...files];const wasEmpty=!P.regions.length,start=at??(wasEmpty?0:P.t);let first=null,n=0;
 const jobs=pooled(files.map(f=>()=>decodeAudioFile(f)),Math.min(3,Math.max(1,(navigator.hardwareConcurrency||2)-1)));
 for(const [i,f] of files.entries()){status(`Lettura di «${f.name}» (${i+1} di ${files.length})…`);const job=await jobs[i];if(job.e){toast(job.e.message);continue}const res=job.v;if(!res?.buffer){toast(`«${f.name}» non contiene audio`);continue}
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
 const pts=(v,lo,hi)=>arr(v).filter(x=>Number.isFinite(Number(x?.t))&&Number.isFinite(Number(x?.v))).map(x=>({t:clamp(Number(x.t),0,86400),v:clamp(Number(x.v),lo,hi)})).sort((a,b)=>a.t-b.t).slice(0,500),bpm=n(p?.bpm,120,30,300);
 const tracks=arr(p?.tracks).filter(t=>t&&t.id).map((t,i)=>{const a=t.auto&&typeof t.auto==='object'?t.auto:{},kind=t.kind==='midi'?'midi':t.kind==='bus'?'bus':'audio';
  const tr={id:s(t.id,40),name:s(t.name||`Traccia ${i+1}`,80),color:col(t.color)||TRACK_COLORS[i%8][0],vol:n(t.vol,0,-60,12),pan:n(t.pan,0,-1,1),mute:!!t.mute,solo:!!t.solo,low:n(t.low,0,-15,15),high:n(t.high,0,-15,15),comp:n(t.comp,0,0,100),reverb:n(t.reverb,0,0,100),duck:n(t.duck,0,0,18),voice:!!t.voice,kind,out:t.out?String(t.out).slice(0,40):null,
   // L'ingresso della registrazione: id ed etichetta del dispositivo, perché l'id cambia tra origini e macchine e
   // l'etichetta resta il modo per ritrovarlo. Vecchio formato (sola stringa) → id solo; id vuoto → niente.
   input:(()=>{if(!t.input)return null;const o=typeof t.input==='object'?t.input:{id:t.input,label:''},id=s(o.id||'',64);return id?{id,label:s(o.label||'',80)}:null})(),
   // I moduli della catena: solo tipi noti, parametri in gamma, al massimo otto per traccia. Su una traccia MIDI i componenti audio non c'entrano: il suono sta sul synth a valle, quindi la catena resta vuota.
   chain:kind==='midi'?[]:arr(t.chain).filter(m=>m&&CHAIN_TYPES[m.tipo]).slice(0,8).map(m=>({id:s(m.id||uid(),10),tipo:m.tipo,params:chainParams(m)})),
   // I punti di volume e bilanciamento delle versioni 1.10-1.15 entrano nel nuovo elenco unico.
   auto:{vol:pts(a.vol??t.volAuto,-60,12),pan:pts(a.pan??t.panAuto,-1,1),reverb:pts(a.reverb,0,100),low:pts(a.low,-15,15),high:pts(a.high,-15,15),comp:pts(a.comp,0,100)},
   autoOn:{vol:!!t.autoOn?.vol,pan:!!t.autoOn?.pan,reverb:!!t.autoOn?.reverb,low:!!t.autoOn?.low,high:!!t.autoOn?.high,comp:!!t.autoOn?.comp}};
  if(kind==='midi'){tr.input=null;
   // Porta di uscita: id ed etichetta, come per l'ingresso audio; se l'id non c'è più su questa macchina si
   // ritrova la porta per etichetta, perché l'id MIDI cambia tra origini del browser e macchine.
   tr.midiOut=(()=>{if(!t.midiOut)return null;const o=typeof t.midiOut==='object'?t.midiOut:{id:t.midiOut,name:''},id=s(o.id||'',64);return id?{id,name:s(o.name||'',80)}:null})();
   tr.midiCh=clamp(Math.round(Number(t.midiCh))||1,1,16);
   const pr=Number(t.program);tr.program=t.program!=null&&t.program!==''&&Number.isFinite(pr)?clamp(Math.round(pr),0,127):null;
   // Armatura: la traccia scelta ascolta l'ingresso MIDI (MIDI thru) senza registrare.
   tr.arm=!!t.arm}
  return tr});
 // Uscite: solo verso un bus che esiste, mai verso sé stessi e mai un giro chiuso.
 {const byId=new Map(tracks.map(t=>[t.id,t]));for(const t of tracks){if(t.out&&(!byId.has(t.out)||t.out===t.id||byId.get(t.out).kind!=='bus'))t.out=null;
  const seen=new Set([t.id]);let x=t,d=0;while(x?.out){if(seen.has(x.out)){t.out=null;break}seen.add(x.out);if(++d>6){t.out=null;break}x=byId.get(x.out)}}}
 const ids=new Set(tracks.map(t=>t.id));
 const regions=arr(p?.regions).filter(r=>r&&ids.has(r.track)).flatMap(r=>{
  // Regioni MIDI: griglia in tick, note intere e ordinate per inizio; la durata è in tick e il taglio iniziale
  // (offT) resta dentro la regione. Le note fuori dai limiti del .mid o della regione si scartano.
  if(r.kind==='midi'){const durT=Math.round(Number(r.durT));if(!(durT>0))return[];
   // Le note oltre la fine della regione si tengono: accorciare la regione non distrugge il contenuto, come per
   // l'audio, e riallungandola le note tornano. La riproduzione suona solo la finestra [offT, offT+durT).
   const startT=Math.max(0,Math.round(Number(r.startT))||0),offT=clamp(Math.round(Number(r.offT))||0,0,1e7),
    notes=arr(r.notes).filter(x=>x&&[x.t,x.d,x.p,x.v].every(v=>Number.isFinite(Number(v)))).map(x=>({t:Math.round(Number(x.t)),d:Math.round(Number(x.d)),p:Math.round(Number(x.p)),v:Math.round(Number(x.v))})).filter(x=>x.t>=0&&x.d>0&&x.p>=0&&x.p<=127&&x.v>=1&&x.v<=127).sort((a,b)=>a.t-b.t||a.p-b.p).slice(0,2000);
   // Lo specchio in secondi si ricava dai tick con il tempo del progetto che si sta aprendo.
   return[{id:s(r.id||uid(),40),track:s(r.track,40),kind:'midi',startT,durT,offT,start:midiSecBpm(startT,bpm),dur:midiSecBpm(durT,bpm),off:midiSecBpm(offT,bpm),name:s(r.name||'Regione MIDI',120),notes}]}
  if(!r.src)return[];
  return[{id:s(r.id||uid(),40),track:s(r.track,40),src:s(r.src,40),off:n(r.off,0,0),dur:n(r.dur,0,0),start:n(r.start,0,0),gain:n(r.gain,0,-60,24),fadeIn:n(r.fadeIn,0,0,600),fadeOut:n(r.fadeOut,0,0,600),gainAuto:pts(r.gainAuto,-60,24).map(p=>({t:clamp(p.t,0,Math.max(0.01,n(r.dur,0,0))),v:p.v})),gainOn:!!r.gainOn,name:s(r.name||'Regione',120),takes:arr(r.takes).filter(t=>t&&t.src).map(t=>({id:s(t.id||uid(),40),src:s(t.src,40),off:n(t.off,0,0),dur:n(t.dur,0,0),name:s(t.name||'Take',120),note:s(t.note||'',200)})).slice(0,20),comp:arr(r.comp).filter(c=>c&&c.take&&Number.isFinite(Number(c.from))&&Number.isFinite(Number(c.to))).map(c=>({from:clamp(Number(c.from),0,86400),to:clamp(Number(c.to),0,86400),take:s(c.take,40)})).filter(c=>c.to>c.from).sort((a,b)=>a.from-b.from).slice(0,200),markers:arr(r.markers).filter(m=>Number.isFinite(m?.pos)).map(m=>({id:s(m.id||uid(),40),pos:Math.max(0,Math.round(m.pos)),label:s(m.label)}))}];}).filter(r=>r.kind==='midi'||r.dur>0);
 for(const r of regions)r.comp=(r.comp||[]).filter(c=>r.takes.some(t=>t.id===c.take));
 return{title:s(p?.title||'Audio1',120),bpm,sig:[2,3,4,5,6,7].includes(Number(p?.sig))?Number(p.sig):4,grid:p?.grid==='beats'?'beats':'time',metro:!!p?.metro,countIn:!!p?.countIn,cycle:{on:!!p?.cycle?.on,a:n(p?.cycle?.a,0,0),b:n(p?.cycle?.b,0,0)},punch:{on:!!p?.punch?.on,a:n(p?.punch?.a,0,0),b:n(p?.punch?.b,0,0),pre:p?.punch?.pre==='bar'?'bar':n(p?.punch?.pre,2,0,5)},limiter:{on:!!p?.limiter?.on,ceil:pts(p?.limiter?.ceil,-20,0)},latency:p?.latency==='auto'||p?.latency==null?'auto':n(p.latency,0,0,1000),tracks,regions,sel:null,track:tracks[0]?.id||null,t:n(p?.t,0,0),pxs:n(p?.pxs,40,1,2000)}}
const projectData=()=>({title:P.title,bpm:P.bpm,sig:P.sig,grid:P.grid,metro:P.metro,countIn:P.countIn,cycle:P.cycle,punch:P.punch,limiter:P.limiter,latency:P.latency,tracks:P.tracks,regions:P.regions,t:P.t,pxs:P.pxs});
// Bozza: progetto e stato dell'editor a ogni modifica; i suoni solo quando sono nuovi o cambiati.
// Un suono entra nella bozza come un unico Blob con i canali uno dopo l'altro: il browser lo scrive senza bloccare
// la pagina, mentre un elenco di numeri andrebbe copiato e convertito tutto prima di salvarlo.
const sourceDraft=b=>({rate:b.sampleRate,nch:b.numberOfChannels,length:b.length,data:new Blob(Array.from({length:b.numberOfChannels},(_,c)=>b.getChannelData(c)))});
async function sourceFromDraft(d){if(d?.channels?.length)return makeBuffer(d.channels,d.rate);if(!(d?.data instanceof Blob)||!(d.length>0)||!(d.nch>0)||d.data.size!==d.length*d.nch*4)return null;
 const all=await d.data.arrayBuffer(),b=new AudioBuffer({length:d.length,numberOfChannels:d.nch,sampleRate:d.rate});for(let c=0;c<d.nch;c++)b.copyToChannel(new Float32Array(all,c*d.length*4,d.length),c);return b}
async function persistAudio(){const meta={...projectData(),sel:P.sel,track:P.track,version:P.version,exported:P.exported,editor:A.region?{region:A.region,cursor:A.cursor,selA:A.selA,selB:A.selB}:null};
 const used=new Set(P.regions.flatMap(regionSources));let bytes=0;for(const id of used){const b=SOURCES.get(id);if(b)bytes+=b.length*b.numberOfChannels*4}
 if(bytes>DRAFT_LIMIT){await dbPut('audio-project',{...meta,regions:[],tooBig:true});return 'Progetto troppo grande per la bozza: salvalo in ZIP per non perderlo'}
 // Un suono non più usato resta da salvare: se l'eliminazione della sua regione viene annullata, serve ancora.
 for(const id of [...dirtySources]){const b=SOURCES.get(id);if(!b){dirtySources.delete(id);continue}if(used.has(id)){dirtySources.delete(id);await dbPut('asrc:'+id,sourceDraft(b))}}
 await dbPut('audio-project',meta);return ''}
async function restoreAudio(){let meta=await dbGet('audio-project');
 if(!meta){const old=await dbGet('audio-meta'),data=await dbGet('audio-data');if(old&&data?.channels?.length){const buf=makeBuffer(data.channels,data.rate);if(buf){const t=newTrack(String(old.title||'Traccia 1').slice(0,80)),src=addSource(buf),r=newRegion(t.id,src,0,String(old.title||'Regione 1').slice(0,120));r.markers=Array.isArray(old.markers)?old.markers:[];Object.assign(P,{title:String(old.title||'Audio1').slice(0,120),tracks:[t],regions:[r],track:t.id,sel:r.id});await persistAudio();await dbDel('audio-meta');await dbDel('audio-data')}}return}
 Object.assign(P,cleanAudioProject(meta));P.sel=regionOf(meta.sel)?meta.sel:null;P.track=trackOf(meta.track)?meta.track:P.tracks[0]?.id||null;P.version=meta.version||0;P.exported=meta.exported??P.version;
 const missing=[];for(const id of new Set(P.regions.flatMap(regionSources))){const b=await sourceFromDraft(await dbGet('asrc:'+id)).catch(()=>null);if(b)SOURCES.set(id,b);else missing.push(id)}
 if(missing.length){P.regions=P.regions.filter(r=>!missing.includes(r.src));toast('Alcune regioni non sono state recuperate dalla bozza')}if(meta.tooBig)toast('Il progetto era troppo grande per la bozza: riaprilo dal file ZIP salvato')
 const ed=meta.editor&&regionOf(meta.editor.region);if(ed&&openRegion(ed,{focus:false,quiet:true})){A.cursor=meta.editor.cursor|0;A.selA=meta.editor.selA|0;A.selB=meta.editor.selB|0;clampSel()}}
async function gcSources(){try{const used=new Set(P.regions.flatMap(r=>regionSources(r).map(id=>'asrc:'+id)));for(const k of await dbKeys())if(String(k).startsWith('asrc:')&&!used.has(k))await dbDel(k)}catch(e){}}
// Progetto in un file: ZIP con progetto-audio.json e un WAV per ogni suono (32 bit in virgola mobile, senza perdite).
async function saveAudioProjectZip(){if(!P.tracks.length){toast('Il progetto è vuoto');return}const used=[...new Set(P.regions.flatMap(regionSources))].filter(id=>SOURCES.has(id));
 const files=[{name:'progetto-audio.json',data:JSON.stringify({programma:'Tassello Media',versione:'{{VERSIONE}}',progetto:projectData()},null,1)},...used.map(id=>({name:`audio/${id}.wav`,data:wavBlob(SOURCES.get(id),32)}))];
 const zip=await work('Salvataggio del progetto',()=>zipBlob(files,f=>status(`Salvataggio del progetto ${Math.round(f*100)}%`)));if(!zip)return;download(zip,extName(P.title+' (progetto audio)','zip'));P.exported=P.version;schedulePersist('audio');toast(`Progetto salvato (${fmtBytes(zip.size)}): riaprilo con Apri in Audio`)}
async function openAudioProjectZip(entries){let data;try{data=JSON.parse(await entries['progetto-audio.json'].text())}catch(e){toast('Il file progetto-audio.json è danneggiato');return}
 if(audioModified()&&!(await confirmAction('Aprendo il progetto sostituisci quello attuale. Continuare?','Apri')))return;const p=cleanAudioProject(data.progetto||data),bufs=new Map();
 for(const id of new Set(p.regions.flatMap(regionSources))){const f=entries[`audio/${id}.wav`];if(!f)continue;try{const b=readWav(await f.arrayBuffer())?.buffer;if(b)bufs.set(id,b)}catch(e){}}
 mixStop(false);closeRegionEditor();SOURCES.clear();dirtySources.clear();for(const [id,b] of bufs){SOURCES.set(id,b);dirtySources.add(id)}phist=[];predo=[];Object.assign(P,p);P.regions=P.regions.filter(r=>SOURCES.has(r.src));P.exported=P.version+1;projectChanged();
 $('docTitle').value=P.title;updateTitle();await gcSources();announce(`Progetto «${P.title}» aperto: ${P.tracks.length} tracce, ${P.regions.length} regioni, ${sayTime(projDur())}`)}
