// Progetto video: una traccia principale di clip una dopo l'altra, ognuna con uno spazio vuoto facoltativo prima di sé
// (gap, in secondi), più tre tracce libere per titoli,
// audio (musica e voce fuori campo) e sottotitoli. I file restano originali: il montaggio indica solo quali parti
// usare, con quali effetti, e l'esportazione li combina.
const newProject=()=>({title:'Video1',w:1280,h:720,fps:30,bg:'#000000',burnSubs:false,media:[],main:[],titles:[],audio:[],subs:[],flash:null});
const V={p:newProject(),sel:null,t:0,hist:[],redo:[],version:0,savedVersion:-1,pxs:60,clip:null};
// Dati dei file nella sessione: Blob, indirizzo per la riproduzione, immagine decodificata.
const MEDIA=new Map();
const TRACKS=['main','titles','audio','subs'];
const TRACK_NAME={main:'Traccia video',titles:'Traccia dei titoli',audio:'Traccia audio',subs:'Traccia dei sottotitoli'};
const FORMATS=[['1280x720','HD 1280 × 720 (16:9)'],['1920x1080','Full HD 1920 × 1080 (16:9)'],['3840x2160','4K 3840 × 2160 (16:9)'],['1080x1920','Verticale 1080 × 1920 (9:16, storie e reel)'],['1080x1080','Quadrato 1080 × 1080'],['1440x1080','4:3 1440 × 1080']];
const TRANS={none:'Nessuna',dissolve:'Dissolvenza incrociata',black:'Passaggio al nero',wipe:'Tendina da sinistra'};
const FILTERS={none:['Nessuno',''],bw:['Bianco e nero','grayscale(100%)'],sepia:['Seppia','sepia(85%)'],warm:['Caldo','sepia(25%) saturate(125%)'],cool:['Freddo','saturate(85%) hue-rotate(12deg) brightness(103%)'],vivid:['Vivace','saturate(155%) contrast(110%)'],faded:['Sbiadito','contrast(85%) brightness(108%) saturate(70%)'],blur:['Sfocato','blur(var)']};
const mediaMeta=id=>V.p.media.find(m=>m.id===id);
const frameDur=()=>1/V.p.fps;
const clipDur=c=>Math.max(frameDur(),(c.out-c.in)/(c.speed||1));
const overlaps=c=>c.trans&&(c.trans.type==='dissolve'||c.trans.type==='wipe');
// Posizione di ogni clip sulla linea temporale: dopo lo spazio vuoto che la precede, oppure attaccata alla precedente;
// le transizioni incrociate sovrappongono due clip attaccate, mentre dopo uno spazio la clip compare dallo sfondo.
let layoutMemo=null;
function layout(){if(layoutMemo?.v===V.version)return layoutMemo.list;let t=0;const list=[];for(const [i,c] of V.p.main.entries()){const dur=clipDur(c),gap=Math.max(0,c.gap||0),tr=i>0&&c.trans&&c.trans.type!=='none'?Math.min(c.trans.dur||0.5,dur/2,list[i-1].dur/2):0,start=Math.max(0,t-(overlaps(c)?tr:0))+gap;list.push({c,i,start,end:start+dur,dur,tr,gap});t=start+dur}layoutMemo={v:V.version,list};return list}
const itemEnd=(kind,x)=>kind==='subs'?x.end:x.start+(kind==='audio'?(x.out-x.in):x.dur);
function totalDur(){const l=layout();let t=l.length?l.at(-1).end:0;for(const k of ['titles','audio','subs'])for(const x of V.p[k])t=Math.max(t,itemEnd(k,x));return t}
const segAt=t=>{const l=layout();let hit=null;for(const s of l)if(t>=s.start-1e-6&&t<s.end-1e-6)hit=s;return hit};
function itemsOf(kind){if(kind==='main')return layout().map(s=>({x:s.c,start:s.start,end:s.end,gap:s.gap}));return [...V.p[kind]].sort((a,b)=>a.start-b.start).map(x=>({x,start:x.start,end:itemEnd(kind,x)}))}
const selected=()=>V.sel?V.p[V.sel.kind]?.find(x=>x.id===V.sel.id)||null:null;
const selKind=()=>V.sel?.kind;
function srcTime(s,t){return s.c.in+(t-s.start)*(s.c.speed||1)}
// Cronologia: istantanee del progetto (piccole: i file non ne fanno parte).
const vSnap=()=>JSON.stringify(V.p);
function vCommit(label,fn,{inspector=true}={}){const before=vSnap();const r=fn();const after=vSnap();if(after===before)return r;V.hist.push({label,before,after,sel:V.sel?{...V.sel}:null});if(V.hist.length>120)V.hist.shift();V.redo=[];videoChanged({inspector});return r}
function vUndo(redoing){const from=redoing?V.redo:V.hist,to=redoing?V.hist:V.redo;if(!from.length){toast(redoing?'Niente da ripetere':'Niente da annullare');return}vStop();const e=from.pop();V.p=JSON.parse(redoing?e.after:e.before);to.push(e);if(!selected())V.sel=e.sel&&V.p[e.sel.kind]?.some(x=>x.id===e.sel.id)?e.sel:null;videoChanged();announce((redoing?'Ripetuto: ':'Annullato: ')+e.label)}
function videoChanged({inspector=true}={}){V.version++;V.t=clamp(V.t,0,Math.max(0,totalDur()));if(V.sel&&!selected())V.sel=null;drawTimeline();if(inspector)renderInspector();renderLibrary();updateVideoUI();requestFrame();schedulePersist('video')}
// Importazione: si leggono durata, dimensioni e una miniatura; il file va nell'archivio della bozza.
const KIND_OF_EXT={mp4:'video',m4v:'video',mov:'video',webm:'video',mkv:'video',ogv:'video',avi:'video',mp3:'audio',wav:'audio',m4a:'audio',aac:'audio',ogg:'audio',oga:'audio',opus:'audio',flac:'audio',weba:'audio',png:'image',jpg:'image',jpeg:'image',webp:'image',gif:'image',bmp:'image'};
function kindOf(file){const t=file.type.split('/')[0];if(['video','audio','image'].includes(t))return t;return KIND_OF_EXT[String(file.name).split('.').pop().toLowerCase()]||null}
const once=(el,ev,ms=15000)=>new Promise((ok,fail)=>{const t=setTimeout(()=>{cleanup();fail(Error('tempo scaduto'))},ms),h=()=>{cleanup();ok()},err=()=>{cleanup();fail(Error('file non leggibile'))},cleanup=()=>{clearTimeout(t);el.removeEventListener(ev,h);el.removeEventListener('error',err)};el.addEventListener(ev,h);el.addEventListener('error',err)});
async function probeMedia(file,kind,url){if(kind==='image'){const bmp=await createImageBitmap(file);const thumb=thumbOf(bmp,bmp.width,bmp.height);return{w:bmp.width,h:bmp.height,dur:5,thumb,bitmap:bmp}}
 const el=document.createElement(kind==='audio'?'audio':'video');el.preload='auto';el.muted=true;el.src=url;await once(el,'loadedmetadata');
 if(!Number.isFinite(el.duration)){el.currentTime=1e7;await once(el,'durationchange').catch(()=>{});el.currentTime=0}
 const dur=Number.isFinite(el.duration)?el.duration:0;if(!dur)throw Error('durata sconosciuta');let thumb='';
 if(kind==='video'){el.currentTime=Math.min(1,dur*0.1);try{await once(el,'seeked',8000);thumb=thumbOf(el,el.videoWidth,el.videoHeight)}catch(e){}}
 const out={dur,w:el.videoWidth||0,h:el.videoHeight||0,thumb};el.removeAttribute('src');el.load();return out}
function thumbOf(src,w,h){const c=document.createElement('canvas'),H=72,W=Math.max(1,Math.round(H*(w/h||16/9)));c.width=Math.min(W,160);c.height=H;const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,H);const k=Math.min(c.width/w,H/h);g.drawImage(src,(c.width-w*k)/2,(H-h*k)/2,w*k,h*k);return c.toDataURL('image/jpeg',0.72)}
async function registerMedia(id,blob){const meta=mediaMeta(id),kind=meta?.type||kindOf(blob),url=URL.createObjectURL(blob),rt={id,blob,url,bitmap:null};if(kind==='image'){try{rt.bitmap=await createImageBitmap(blob)}catch(e){}}MEDIA.set(id,rt);return rt}
async function importMedia(files,{add=false}={}){files=[...files];if(!files.length)return[];const ids=[];
 for(const [i,file] of files.entries()){const kind=kindOf(file);if(!kind){toast(`«${file.name}» non è un file video, audio o immagine`);continue}status(`Importazione di «${file.name}» (${i+1} di ${files.length})…`);const id=uid(),url=URL.createObjectURL(file);
  let info;try{info=await probeMedia(file,kind,url)}catch(e){URL.revokeObjectURL(url);toast(`Il browser non sa leggere «${file.name}»: prova a convertirlo in MP4 (H.264) o WebM`);continue}
  MEDIA.set(id,{id,blob:file,url,bitmap:info.bitmap||null});try{await dbPut('media:'+id,file)}catch(e){toast('Spazio del browser esaurito: il file non resterà nella bozza, salva il progetto')}
  vCommit('Importa '+file.name,()=>V.p.media.push({id,name:file.name,type:kind,size:file.size,dur:info.dur,w:info.w,h:info.h,thumb:info.thumb}));ids.push(id)}
 status();if(ids.length){libActive=ids[0];const first=mediaMeta(ids[0]);if(V.p.media.length===ids.length&&first.type==='video'&&first.w&&first.h)vCommit('Formato del progetto',()=>adaptFormat(first));
  renderLibrary();if(add||!V.p.main.length&&!V.p.audio.length){for(const id of ids)addToTimeline(id,{quiet:true,start:0});V.t=0;videoChanged()}
  announce(ids.length===1?`Importato ${first.name}: ${first.type==='image'?'immagine':first.type}, ${first.type==='image'?first.w+' per '+first.h:sayTime(first.dur)}`:`Importati ${ids.length} file`)}
 return ids}
// Il primo video importato decide il formato del progetto, se l'utente non l'ha ancora scelto.
function adaptFormat(m){const vertical=m.h>m.w,f=vertical?[1080,1920]:Math.abs(m.w/m.h-1)<0.05?[1080,1080]:m.h>=1080?[1920,1080]:[1280,720];if(V.p.w===f[0]&&V.p.h===f[1])return;V.p.w=f[0];V.p.h=f[1];resizeCanvas();toast(`Formato del progetto: ${f[0]} × ${f[1]}, come il video importato. Puoi cambiarlo nelle impostazioni del progetto`)}
function newClip(m){const base={id:uid(),kind:'media',media:m.id,gap:0,in:0,out:m.type==='image'?5:m.dur,speed:1,volume:1,mute:false,fadeIn:0,fadeOut:0,trans:{type:'none',dur:0.6},filter:'none',bright:100,contrast:100,sat:100,blur:4,rotate:0,flip:false,fit:'contain',desc:''};return base}
function addToTimeline(id=libActive,{quiet=false,at='end',start}={}){const m=mediaMeta(id);if(!m){toast('Scegli un file nella raccolta');return}
 if(m.type==='audio'){const item={id:uid(),media:m.id,start:start??V.t,in:0,out:m.dur,volume:1,fadeIn:0,fadeOut:0};vCommit('Aggiungi audio',()=>V.p.audio.push(item));V.sel={kind:'audio',id:item.id};videoChanged();if(!quiet)announce(`Audio «${m.name}» aggiunto alla traccia audio a ${sayTime(item.start)}`);return}
 const c=newClip(m);let idx=V.p.main.length;if(at==='playhead'){const s=segAt(V.t);if(s){const cut=srcTime(s,V.t);if(cut-s.c.in>frameDur()&&s.c.out-cut>frameDur()){const right={...structuredClone(s.c),id:uid(),gap:0,in:cut,trans:{type:'none',dur:0.6},fadeIn:0};vCommit('Inserisci all’indicatore',()=>{s.c.out=cut;s.c.fadeOut=0;V.p.main.splice(s.i+1,0,c,right)});V.sel={kind:'main',id:c.id};videoChanged();if(!quiet)announce(`«${m.name}» inserito all’indicatore`);return}idx=V.t-s.start<s.dur/2?s.i:s.i+1}
  else{const L=layout(),j=L.findIndex(x=>x.start>V.t),prevEnd=j===0?0:(j<0?L.at(-1)?.end:L[j-1].end)||0;if(V.t>prevEnd){c.gap=V.t-prevEnd;vCommit('Inserisci all’indicatore',()=>{if(j>=0){const nx=V.p.main[j];nx.gap=Math.max(0,L[j].start-(V.t+clipDur(c)))}V.p.main.splice(j<0?V.p.main.length:j,0,c)});V.sel={kind:'main',id:c.id};videoChanged();if(!quiet)announce(`«${m.name}» inserito all’indicatore, a ${sayTime(V.t)}`);return}}}
 else if(V.sel?.kind==='main'){const i=V.p.main.findIndex(x=>x.id===V.sel.id);if(i>=0)idx=i+1}
 vCommit('Aggiungi '+m.name,()=>V.p.main.splice(idx,0,c));V.sel={kind:'main',id:c.id};const s=layout().find(x=>x.c.id===c.id);if(at!=='playhead')V.t=s.start;videoChanged();if(!quiet)announce(`«${m.name}» aggiunto alla traccia video come clip ${idx+1} di ${V.p.main.length}, a ${sayTime(s.start)}`)}
async function removeMedia(id){const m=mediaMeta(id);if(!m)return;const used=V.p.main.filter(c=>c.media===id).length+V.p.audio.filter(a=>a.media===id).length;
 if(used&&!(await confirmAction(`«${m.name}» è usato ${used===1?'in una clip':'in '+used+' clip'} della linea temporale: togliendolo dalla raccolta spariscono anche quelle. Continuare?`,'Togli')))return;
 vCommit('Togli '+m.name,()=>{V.p.media=V.p.media.filter(x=>x.id!==id);V.p.main=V.p.main.filter(c=>c.media!==id);V.p.audio=V.p.audio.filter(a=>a.media!==id)});libActive=V.p.media[0]?.id||null;videoChanged();announce(`«${m.name}» tolto dalla raccolta`)}
// Bozza: progetto in IndexedDB; i file vi entrano all'importazione. Quelli non più usati si cancellano all'avvio.
async function persistVideo(){await dbPut('video',{project:V.p,t:V.t,pxs:V.pxs});V.savedVersion=V.version;return ''}
function cleanProject(p){const P=newProject(),n=(v,d,lo=-Infinity,hi=Infinity)=>Number.isFinite(Number(v))?clamp(Number(v),lo,hi):d,s=(v,len=500)=>String(v??'').slice(0,len),arr=v=>Array.isArray(v)?v.slice(0,5000):[];
 Object.assign(P,{title:s(p?.title||'Video1',120),w:n(p?.w,1280,16,7680)|0,h:n(p?.h,720,16,7680)|0,fps:n(p?.fps,30,1,120),bg:/^#[0-9a-f]{6}$/i.test(p?.bg)?p.bg:'#000000',burnSubs:!!p?.burnSubs,flash:p?.flash&&typeof p.flash==='object'?p.flash:null});
 P.media=arr(p?.media).filter(m=>m&&m.id).map(m=>({id:s(m.id,40),name:s(m.name,200),type:['video','audio','image'].includes(m.type)?m.type:'video',size:n(m.size,0),dur:n(m.dur,0,0),w:n(m.w,0)|0,h:n(m.h,0)|0,thumb:/^data:image\/(jpeg|png);base64,/.test(m.thumb||'')?m.thumb:''}));
 const ids=new Set(P.media.map(m=>m.id)),col=v=>/^#[0-9a-f]{6}$/i.test(v)?v:null;
 P.main=arr(p?.main).filter(c=>c&&(c.kind==='card'||ids.has(c.media))).map(c=>({...newClip({id:c.media,type:'video',dur:0}),id:s(c.id||uid(),40),kind:c.kind==='card'?'card':'media',media:c.kind==='card'?null:s(c.media,40),gap:n(c.gap,0,0,86400),in:n(c.in,0,0),out:n(c.out,1,0),speed:n(c.speed,1,0.25,4),volume:n(c.volume,1,0,2),mute:!!c.mute,fadeIn:n(c.fadeIn,0,0,30),fadeOut:n(c.fadeOut,0,0,30),trans:{type:TRANS[c.trans?.type]?c.trans.type:'none',dur:n(c.trans?.dur,0.6,0.1,5)},filter:FILTERS[c.filter]?c.filter:'none',bright:n(c.bright,100,0,300),contrast:n(c.contrast,100,0,300),sat:n(c.sat,100,0,300),blur:n(c.blur,4,0,50),rotate:[0,90,180,270].includes(c.rotate)?c.rotate:0,flip:!!c.flip,fit:c.fit==='cover'?'cover':'contain',desc:s(c.desc),text:s(c.text,2000),color:col(c.color)||'#2457c5',textColor:col(c.textColor)||'#ffffff'})).filter(c=>c.out>c.in);
 P.titles=arr(p?.titles).map(t=>({id:s(t.id||uid(),40),text:s(t.text,2000),start:n(t.start,0,0),dur:n(t.dur,3,0.1),pos:['top','center','lower','bottom'].includes(t.pos)?t.pos:'lower',size:n(t.size,7,2,25),color:col(t.color)||'#ffffff',box:['dark','light','none'].includes(t.box)?t.box:'dark',fadeIn:n(t.fadeIn,0.3,0,5),fadeOut:n(t.fadeOut,0.3,0,5),font:t.font==='serif'?'serif':'sans',bold:t.bold!==false}));
 P.audio=arr(p?.audio).filter(a=>ids.has(a.media)).map(a=>({id:s(a.id||uid(),40),media:s(a.media,40),start:n(a.start,0,0),in:n(a.in,0,0),out:n(a.out,1,0),volume:n(a.volume,1,0,2),fadeIn:n(a.fadeIn,0,0,30),fadeOut:n(a.fadeOut,0,0,30)})).filter(a=>a.out>a.in);
 P.subs=arr(p?.subs).map(x=>({id:s(x.id||uid(),40),start:n(x.start,0,0),end:n(x.end,1,0),text:s(x.text,1000)})).filter(x=>x.end>x.start);
 return P}
async function loadProject(p,blobs){vStop();for(const rt of MEDIA.values())URL.revokeObjectURL(rt.url);MEDIA.clear();V.p=cleanProject(p);V.hist=[];V.redo=[];V.sel=null;V.t=0;const missing=[];
 for(const m of V.p.media){const blob=blobs?.[m.id]??await dbGet('media:'+m.id);if(blob){await registerMedia(m.id,blob);if(blobs)try{await dbPut('media:'+m.id,blob)}catch(e){}}else missing.push(m.name)}
 resizeCanvas();libActive=V.p.media[0]?.id||null;videoChanged();if(missing.length)toast(`Mancano ${missing.length} file del progetto (${missing.slice(0,3).join(', ')}${missing.length>3?'…':''}): importali di nuovo dalla raccolta`);return missing}
async function restoreVideo(){const d=await dbGet('video');if(!d?.project)return;await loadProject(d.project);V.t=clamp(Number(d.t)||0,0,totalDur());V.pxs=clamp(Number(d.pxs)||60,2,600);V.savedVersion=V.version}
async function gcMedia(){try{const keys=await dbKeys(),used=new Set(V.p.media.map(m=>'media:'+m.id));for(const k of keys)if(String(k).startsWith('media:')&&!used.has(k))await dbDel(k)}catch(e){}}
// Progetto in un file: ZIP con progetto.json e la cartella media, senza compressione.
async function saveProjectZip(){if(!V.p.media.length&&!V.p.main.length&&!V.p.titles.length&&!V.p.subs.length){toast('Il progetto è vuoto');return}const files=[],p=structuredClone(V.p);
 for(const m of p.media){const rt=MEDIA.get(m.id);if(!rt)continue;m.file=`media/${m.id}-${safeFileName(m.name)}`;files.push({name:m.file,data:rt.blob})}
 files.unshift({name:'progetto.json',data:JSON.stringify({programma:'Tassello Media',versione:'{{VERSIONE}}',progetto:p},null,1)});
 const zip=await work('Salvataggio del progetto',()=>zipBlob(files,f=>status(`Salvataggio del progetto ${Math.round(f*100)}%`)));if(!zip)return;download(zip,extName(V.p.title+' (progetto video)','zip'));toast(`Progetto salvato (${fmtBytes(zip.size)}): riaprilo con Apri in Video`)}
async function openProjectZip(file){const entries=await work('Apertura del progetto',()=>unzipBlob(file));if(!entries)return false;const json=entries['progetto.json'];if(!json)return false;let data;try{data=JSON.parse(await json.text())}catch(e){toast('Il file progetto.json è danneggiato');return true}
 const p=data.progetto||data,blobs={};for(const m of p.media||[]){const b=entries[m.file];if(b)blobs[m.id]=new File([b],m.name||'file',{type:b.type})}
 if(hasVideoWork()&&!(await confirmAction('Aprendo il progetto sostituisci il montaggio attuale. Continuare?','Apri')))return true;
 await work('Apertura del progetto',()=>loadProject(p,blobs));$('docTitle').value=V.p.title;updateTitle();await gcMedia();announce(`Progetto «${V.p.title}» aperto: ${V.p.main.length} clip, ${sayTime(totalDur())}`);return true}
const hasVideoWork=()=>V.p.main.length||V.p.titles.length||V.p.audio.length||V.p.subs.length;
