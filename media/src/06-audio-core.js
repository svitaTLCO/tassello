// Editor della regione: un AudioBuffer (null quando è vuoto), cursore e selezione in campioni, marcatori con nome.
// region è la regione del progetto che l'editor sta modificando; ogni modifica la aggiorna.
// Ogni modifica sostituisce un tratto [a, b) con nuovi campioni: così taglia, incolla, effetti e annulla
// seguono la stessa strada e la cronologia conserva solo i tratti cambiati.
const A={buf:null,region:null,own:null,bound:null,rate:48000,nch:2,title:'',cursor:0,selA:0,selB:0,markers:[],version:0,savedVersion:-1,exportedVersion:0,lastEffect:null};
let ahist=[],aredo=[],aclip=null;
const HIST_BYTES=1.2e9,HIST_MAX=100;
const alen=()=>A.buf?A.buf.length:0;
const adur=()=>alen()/A.rate;
const hasSel=()=>A.selB>A.selA;
const sec=n=>n/A.rate;
const smp=s=>Math.round(clamp(s,0,adur())*A.rate);
const chName=()=>A.nch===1?'mono':A.nch===2?'stereo':A.nch+' canali';
function sliceCh(buf,a,b){return Array.from({length:buf.numberOfChannels},(_,c)=>buf.getChannelData(c).slice(a,b))}
// Sostituisce i campioni [a, b) con ins (un array per canale) o li toglie se ins è null.
function spliceAudio(a,b,ins){const old=A.buf,len=alen(),insLen=ins?ins[0].length:0,newLen=len-(b-a)+insLen;
 if(old&&insLen===b-a&&insLen){for(let c=0;c<A.nch;c++)old.getChannelData(c).set(ins[c],a);return}
 if(newLen<=0){A.buf=null;return}
 const nb=new AudioBuffer({length:newLen,numberOfChannels:A.nch,sampleRate:A.rate});
 for(let c=0;c<A.nch;c++){const d=nb.getChannelData(c);if(old){const o=old.getChannelData(c);d.set(o.subarray(0,a),0);d.set(o.subarray(b),a+insLen)}if(ins)d.set(ins[c],a)}
 A.buf=nb}
const snapA=()=>({cursor:A.cursor,selA:A.selA,selB:A.selB,markers:A.markers.map(m=>({...m})),rate:A.rate,nch:A.nch});
function restoreA(s){Object.assign(A,{cursor:s.cursor,selA:s.selA,selB:s.selB,markers:s.markers.map(m=>({...m})),rate:s.rate,nch:s.nch})}
function pushHist(entry){lastScope='editor';ahist.push(entry);aredo=[];let total=ahist.reduce((n,e)=>n+e.bytes,0);while(ahist.length>1&&(ahist.length>HIST_MAX||total>HIST_BYTES))total-=ahist.shift().bytes}
// I marcatori dopo il tratto si spostano; quelli dentro un tratto eliminato spariscono, quelli dentro un tratto
// sostituito restano entro la parte nuova.
function shiftMarkers(a,b,insLen){const d=insLen-(b-a);if(!d)return;A.markers=A.markers.filter(m=>!(insLen===0&&m.pos>a&&m.pos<b)).map(m=>({...m,pos:m.pos>=b?m.pos+d:m.pos>a?a+Math.min(m.pos-a,insLen):m.pos}))}
// mapPos (facoltativo) dice dove finisce, nella parte nuova, un punto della parte vecchia: lo usano gli effetti
// che cambiano la durata, così i marcatori restano sulle stesse parole.
function audioEdit(label,a,b,ins,{sel,cursor,mapPos}={}){stopPlayback(false);const before=snapA(),removed=A.buf&&b>a?sliceCh(A.buf,a,b):null,insLen=ins?ins[0].length:0;
 spliceAudio(a,b,ins);if(mapPos){const d=insLen-(b-a);A.markers=A.markers.map(m=>({...m,pos:m.pos>=b?m.pos+d:m.pos>=a?a+clamp(mapPos(m.pos-a),0,insLen):m.pos}))}else shiftMarkers(a,b,insLen);const [s0,s1]=sel||[a,a+insLen];A.selA=s0;A.selB=s1;A.cursor=cursor??s0;const after=snapA();
 pushHist({label,bytes:((b-a)+insLen)*A.nch*4,undo:()=>{spliceAudio(a,a+insLen,removed);restoreA(before)},redo:()=>{spliceAudio(a,b,ins);restoreA(after)}});audioChanged()}
// Sostituisce tutto l'audio (cambi di canali o di frequenza): la cronologia tiene i due AudioBuffer interi.
function audioReplaceAll(label,buf,{markers}={}){stopPlayback(false);const old=A.buf,before=snapA();A.buf=buf;if(buf){A.nch=buf.numberOfChannels;const k=buf.sampleRate/A.rate;if(k!==1){A.markers=A.markers.map(m=>({...m,pos:Math.round(m.pos*k)}));A.cursor=Math.round(A.cursor*k);A.selA=Math.round(A.selA*k);A.selB=Math.round(A.selB*k)}A.rate=buf.sampleRate}if(markers)A.markers=markers;clampSel();const after=snapA();
 pushHist({label,bytes:((old?.length||0)*(old?.numberOfChannels||0)+(buf?.length||0)*(buf?.numberOfChannels||0))*4,undo:()=>{A.buf=old;restoreA(before)},redo:()=>{A.buf=buf;restoreA(after)}});audioChanged()}
// Modifiche che toccano solo i marcatori o la selezione: la cronologia tiene lo stato prima e dopo.
function metaEdit(label,fn){const before=snapA();fn();const after=snapA();pushHist({label,bytes:200,undo:()=>restoreA(before),redo:()=>restoreA(after)});audioMetaChanged()}
function audioUndo(redoing){const from=redoing?aredo:ahist,to=redoing?ahist:aredo;if(!from.length){toast(redoing?'Niente da ripetere':'Niente da annullare');return}stopPlayback(false);const e=from.pop();redoing?e.redo():e.undo();to.push(e);audioChanged();announce((redoing?'Ripetuto: ':'Annullato: ')+e.label)}
function clampSel(){const L=alen();A.cursor=clamp(Math.round(A.cursor),0,L);A.selA=clamp(Math.round(A.selA),0,L);A.selB=clamp(Math.round(A.selB),A.selA,L);A.markers=A.markers.filter(m=>m.pos>=0&&m.pos<=L).sort((x,y)=>x.pos-y.pos)}
function audioChanged(){A.version++;clampSel();peakCache=null;envCache=null;pauseCache=null;viewClamp();drawAudio();updateAudioUI();if(A.region)regionFromEditor();schedulePersist('audio')}
function audioMetaChanged(){clampSel();drawAudio();updateAudioUI();regionMarkersFromEditor();schedulePersist('audio')}
// Picchi per disegnare la forma d'onda: minimo, massimo e potenza ogni 256 campioni, poi livelli 4 volte più grossi.
let peakCache=null;
function getPeaks(){if(peakCache)return peakCache;const levels=[];if(!A.buf)return peakCache={levels};let block=256;
 const base=[];for(let c=0;c<A.nch;c++){const d=A.buf.getChannelData(c),n=Math.ceil(d.length/block),mn=new Float32Array(n),mx=new Float32Array(n),sq=new Float32Array(n);
  for(let i=0;i<n;i++){let lo=1e9,hi=-1e9,s=0;const end=Math.min(d.length,(i+1)*block);for(let j=i*block;j<end;j++){const x=d[j];if(x<lo)lo=x;if(x>hi)hi=x;s+=x*x}mn[i]=lo;mx[i]=hi;sq[i]=s/(end-i*block)}base.push({mn,mx,sq})}
 levels.push({block,ch:base});
 while(levels.at(-1).ch[0].mn.length>2000){const prev=levels.at(-1),next=[];block*=4;for(const p of prev.ch){const n=Math.ceil(p.mn.length/4),mn=new Float32Array(n),mx=new Float32Array(n),sq=new Float32Array(n);for(let i=0;i<n;i++){let lo=1e9,hi=-1e9,s=0,k=0;for(let j=i*4;j<Math.min(p.mn.length,i*4+4);j++){if(p.mn[j]<lo)lo=p.mn[j];if(p.mx[j]>hi)hi=p.mx[j];s+=p.sq[j];k++}mn[i]=lo;mx[i]=hi;sq[i]=s/k}next.push({mn,mx,sq})}levels.push({block,ch:next})}
 return peakCache={levels}}
// Livello ogni centesimo di secondo (il canale più forte), in dB: serve a trovare pause e parlato.
let envCache=null;
function getEnv(){if(envCache)return envCache;const win=Math.max(1,Math.round(A.rate/100)),L=alen(),n=Math.ceil(L/win),db=new Float32Array(n);
 if(A.buf){const chans=Array.from({length:A.nch},(_,c)=>A.buf.getChannelData(c));for(let i=0;i<n;i++){let best=0;const a=i*win,b=Math.min(L,a+win);for(const d of chans){let s=0;for(let j=a;j<b;j++)s+=d[j]*d[j];if(s>best)best=s}db[i]=best>0?10*Math.log10(best/(b-a)):-120}}
 return envCache={win,db}}
// Pause: tratti sotto la soglia lunghi almeno minPause. Con la soglia automatica si parte dal rumore di fondo.
let pauseCache=null;
function pauseThreshold(){if(prefs.pauseDb!=='auto'&&Number.isFinite(Number(prefs.pauseDb)))return Number(prefs.pauseDb);const {db}=getEnv();if(!db.length)return -40;const sorted=Float32Array.from(db).sort(),floor=sorted[Math.floor(sorted.length*.1)];return clamp(floor+12,-60,-26)}
function getPauses(){if(pauseCache)return pauseCache;const {win,db}=getEnv(),th=pauseThreshold(),minW=Math.round((prefs.minPause||0.3)*100),out=[];let s=-1;
 for(let i=0;i<=db.length;i++){const quiet=i<db.length&&db[i]<th;if(quiet&&s<0)s=i;else if(!quiet&&s>=0){if(i-s>=minW||s===0||i===db.length)out.push({a:s*win,b:Math.min(alen(),i*win)});s=-1}}
 return pauseCache={th,list:out}}
// Punti di passaggio tra parlato e pausa, nell'ordine: Ctrl+frecce ci salta come tra le parole di un testo.
function pauseBoundaries(){const pts=[];for(const p of getPauses().list){if(p.a>0)pts.push({pos:p.a,kind:'start',p});if(p.b<alen())pts.push({pos:p.b,kind:'end',p})}return pts}
function levelAt(pos,half=Math.round(A.rate*0.05)){if(!A.buf)return{peak:-Infinity,rms:-Infinity};const a=clamp(pos-half,0,alen()),b=clamp(pos+half,0,alen());let pk=0,s=0,n=0;for(let c=0;c<A.nch;c++){const d=A.buf.getChannelData(c);for(let i=a;i<b;i++){const x=Math.abs(d[i]);if(x>pk)pk=x;s+=x*x;n++}}return{peak:toDb(pk),rms:n?10*Math.log10(s/n||1e-12):-Infinity}}
const levelWords=db=>db>-1?'al limite, rischio di distorsione':db>-6?'forte':db>-20?'buono':db>-35?'basso':db>-55?'molto basso':'silenzio';
// Riproduzione con il motore audio del browser. Il cursore si ferma dove metti in pausa, così puoi tagliare lì.
let actx=null;
function actxGet(){if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});actx.onstatechange=()=>{}}if(actx.state==='suspended')actx.resume();return actx}
const aplay={src:null,gain:null,analyser:null,startT:0,from:0,to:0,isLoop:false,loop:false,rate:1,playing:false,origin:0,raf:0,snippet:null};
function audioOut(){const ctx=actxGet();if(!aplay.gain){aplay.gain=ctx.createGain();aplay.analyser=ctx.createAnalyser();aplay.analyser.fftSize=2048;aplay.gain.connect(aplay.analyser);aplay.analyser.connect(ctx.destination)}return aplay.gain}
function playRange(a,b,{loop=false,origin=A.cursor}={}){if(MIX.playing)mixStop(true);stopSource();if(!A.buf||b<=a)return;const ctx=actxGet(),s=ctx.createBufferSource();s.buffer=A.buf;s.playbackRate.value=aplay.rate;s.connect(audioOut());
 const off=a/A.rate;if(loop){s.loop=true;s.loopStart=off;s.loopEnd=b/A.rate;s.start(0,off)}else s.start(0,off,(b-a)/A.rate);
 Object.assign(aplay,{src:s,startT:ctx.currentTime,from:a,to:b,isLoop:loop,playing:true,origin});s.onended=()=>{if(aplay.src===s)playbackEnded()};playUI(true);aTick()}
function playPos(){if(!aplay.playing||!actx)return A.cursor;const el=(actx.currentTime-aplay.startT)*aplay.rate*A.rate;if(aplay.isLoop){const L=aplay.to-aplay.from;return aplay.from+(L>0?el%L:0)}return Math.min(aplay.to,aplay.from+el)}
function stopSource(){const s=aplay.src;aplay.src=null;aplay.playing=false;cancelAnimationFrame(aplay.raf);if(s){s.onended=null;try{s.stop()}catch(e){}s.disconnect()}}
function stopPlayback(keep=true){if(!aplay.playing)return;const pos=Math.round(playPos());stopSource();if(keep)A.cursor=pos;playUI(false);drawAudio();updateAudioUI()}
// A fine ascolto il cursore torna dove l'ascolto era partito.
function playbackEnded(){stopSource();A.cursor=clamp(aplay.origin,0,alen());playUI(false);drawAudio();updateAudioUI();announce('Fine dell’ascolto')}
function audioPlayPause(){if(aplay.playing){stopPlayback(true);announce('Pausa a '+sayTime(sec(A.cursor),2));return}if(!A.buf){toast('Nessun audio da ascoltare: apri un file o registra');return}let from=A.cursor;if(from>=alen()-1)from=0;A.cursor=from;playRange(from,alen())}
function audioStop(){if(!aplay.playing){A.cursor=aplay.origin||0;audioMetaChanged();announce('Cursore a '+sayTime(sec(A.cursor)));return}const o=aplay.origin;stopPlayback(false);A.cursor=o;audioMetaChanged();announce('Fermato, cursore a '+sayTime(sec(o)))}
function playSelection(){if(!A.buf)return;if(!hasSel()){toast('Nessuna selezione: ascolto dal cursore');audioPlayPause();return}playRange(A.selA,A.selB,{loop:aplay.loop,origin:A.selA})}
function playAround(before){if(!A.buf)return;const n=Math.round(2*A.rate),a=before?Math.max(0,A.cursor-n):A.cursor,b=before?A.cursor:Math.min(alen(),A.cursor+n);playRange(a,b,{origin:A.cursor})}
// Breve ascolto quando sposti il cursore da tastiera (scrub): 150 millisecondi con attacco e coda morbidi.
function snippet(pos){if(!prefs.scrub||!A.buf||aplay.playing)return;const ctx=actxGet();try{aplay.snippet?.stop()}catch(e){}const s=ctx.createBufferSource(),g=ctx.createGain(),t=ctx.currentTime,d=0.15;s.buffer=A.buf;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+0.01);g.gain.setValueAtTime(1,t+d-0.03);g.gain.linearRampToValueAtTime(0,t+d);s.connect(g);g.connect(audioOut());s.start(t,Math.min(pos/A.rate,Math.max(0,adur()-0.01)),d);aplay.snippet=s}
// Contenuto dell'editor: sostituisce il suono e svuota la cronologia dell'editor.
function setAudioDoc(buffer,{title,markers=[]}={}){stopPlayback(false);Object.assign(A,{buf:buffer,rate:buffer?.sampleRate||A.rate,nch:buffer?.numberOfChannels||A.nch,cursor:0,selA:0,selB:0,markers,lastEffect:null});if(title!==undefined)A.title=title;ahist=[];aredo=[];A.exportedVersion=A.version+1;audioChanged();zoomFitAudio()}
// Adatta un suono all'editor: stessa frequenza e stesso numero di canali.
async function conformAudio(buf){if(!buf)return null;if(!A.buf&&!alen()){A.rate=buf.sampleRate;A.nch=Math.min(buf.numberOfChannels,MAX_CHANNELS)}if(buf.sampleRate!==A.rate)buf=await resampleBuffer(buf,A.rate);
 const out=[];for(let c=0;c<A.nch;c++){if(buf.numberOfChannels===1)out.push(buf.getChannelData(0).slice());else if(A.nch===1){const m=new Float32Array(buf.length);for(let k=0;k<buf.numberOfChannels;k++){const d=buf.getChannelData(k);for(let i=0;i<m.length;i++)m[i]+=d[i]/buf.numberOfChannels}out.push(m)}else out.push(buf.getChannelData(Math.min(c,buf.numberOfChannels-1)).slice())}return out}
async function insertAudioFile(file){const res=await work('Lettura di «'+file.name+'»',()=>decodeAudioFile(file));if(!res?.buffer)return;const ins=await conformAudio(res.buffer),at=A.cursor;audioEdit('Inserisci '+file.name,at,at,ins);announce(`Inserito ${file.name}, ${sayTime(res.buffer.duration)}, al cursore; ora è selezionato`)}
// Appunti dell'audio: copia, taglia, incolla e incolla mescolando.
function needSel(){if(!A.buf){toast('Nessun audio aperto');return false}if(!hasSel()){toast('Prima seleziona una parte: Maiusc con le frecce, oppure I e O');return false}return true}
function audioCopy(){if(!needSel())return;aclip=makeBuffer(sliceCh(A.buf,A.selA,A.selB),A.rate);announce('Copiati '+sayTime(aclip.duration))}
function audioCut(){if(!needSel())return;aclip=makeBuffer(sliceCh(A.buf,A.selA,A.selB),A.rate);const d=aclip.duration;audioEdit('Taglia',A.selA,A.selB,null);announce('Tagliati '+sayTime(d))}
async function audioPaste(){if(!aclip){toast('Gli appunti dell’audio sono vuoti: copia o taglia prima una parte');return}const ins=await conformAudio(aclip),a=hasSel()?A.selA:A.cursor,b=hasSel()?A.selB:A.cursor;audioEdit('Incolla',a,b,ins);announce('Incollati '+sayTime(aclip.duration)+(b>a?' al posto della selezione':' al cursore'))}
async function audioPasteMix(){if(!aclip){toast('Gli appunti dell’audio sono vuoti: copia o taglia prima una parte');return}if(!A.buf){audioPaste();return}const ins=await conformAudio(aclip),a=A.cursor,n=ins[0].length,b=Math.min(alen(),a+n),out=[];
 for(let c=0;c<A.nch;c++){const cur=A.buf.getChannelData(c).subarray(a,b),m=new Float32Array(n);m.set(cur);for(let i=0;i<n;i++)m[i]+=ins[c][i];out.push(m)}
 audioEdit('Incolla mescolando',a,b,out);const peak=Math.max(...out.map(d=>d.reduce((p,x)=>Math.max(p,Math.abs(x)),0)));announce('Mescolati '+sayTime(n/A.rate)+(peak>1?'. Attenzione: il livello supera il fondo scala, normalizza o attenua la parte selezionata':''))}
function deleteSelection(){if(!needSel())return;const d=sec(A.selB-A.selA);audioEdit('Elimina',A.selA,A.selB,null);announce('Eliminati '+sayTime(d)+', cursore a '+sayTime(sec(A.cursor)))}
function trimToSelection(){if(!needSel())return;const a=A.selA,b=A.selB;stopPlayback(false);const old=A.buf,before=snapA(),nb=makeBuffer(sliceCh(old,a,b),A.rate);A.buf=nb;A.markers=A.markers.filter(m=>m.pos>=a&&m.pos<=b).map(m=>({...m,pos:m.pos-a}));A.cursor=0;A.selA=0;A.selB=0;const after=snapA();
 pushHist({label:'Ritaglia',bytes:(old.length+nb.length)*A.nch*4,undo:()=>{A.buf=old;restoreA(before)},redo:()=>{A.buf=nb;restoreA(after)}});audioChanged();zoomFitAudio();announce('Tenuta solo la selezione: ora l’audio dura '+sayTime(adur()))}
function silenceSel(){if(!needSel())return;audioEdit('Silenzia',A.selA,A.selB,Array.from({length:A.nch},()=>new Float32Array(A.selB-A.selA)),{sel:[A.selA,A.selB]});announce('Selezione silenziata')}
function duplicateSel(){if(!needSel())return;const part=sliceCh(A.buf,A.selA,A.selB),b=A.selB;audioEdit('Duplica',b,b,part);announce('Selezione duplicata subito dopo: la copia è selezionata')}
function readAudioStatus(){if(!A.buf){toast('Nessuna regione nell’editor. Scegli una regione nelle tracce e premi Invio.');return}const pos=aplay.playing?Math.round(playPos()):A.cursor,l=levelAt(pos),near=nearestMarker(pos);
 toast(`Editor${A.region?' della regione «'+(regionOf(A.region)?.name||'')+'»':''}: ${aplay.playing?'in ascolto a':'cursore a'} ${sayTime(sec(pos),2)} di ${sayTime(adur())}. ${hasSel()?`Selezione da ${sayTime(sec(A.selA),2)} a ${sayTime(sec(A.selB),2)}, durata ${sayTime(sec(A.selB-A.selA),2)}. `:'Nessuna selezione. '}Livello ${levelWords(l.peak)}, picco ${fmtDb(l.peak)}. Audio ${chName()} a ${fmtInt(A.rate)} hertz. ${A.markers.length?`${A.markers.length} marcatori, il più vicino «${near.label}» a ${sayTime(sec(near.pos))}.`:'Nessun marcatore.'}`)}
function nearestMarker(pos=A.cursor){let best=null;for(const m of A.markers)if(!best||Math.abs(m.pos-pos)<Math.abs(best.pos-pos))best=m;return best}
