// Esportazione del video un fotogramma alla volta, di solito più veloce del tempo reale: i file del montaggio si
// decodificano con WebCodecs, ogni istante si compone nel canvas come nell'anteprima, il codificatore del browser lo
// comprime e i pacchetti finiscono in un MP4 o in un WebM. Il montaggio non deve scorrere, quindi la scheda può stare in
// secondo piano. Se un file non si può leggere così (contenitore o codice sconosciuto) resta l'esportazione in tempo reale.
const DEMUX=new Map();let fastBroken=false;
function mediaDemux(id){const m=mediaMeta(id),rt=MEDIA.get(id);if(!m||!rt||m.type==='image')return Promise.resolve(null);let p=DEMUX.get(id);if(!p||p.blob!==rt.blob){p=demuxMedia(rt.blob).catch(()=>null);p.blob=rt.blob;DEMUX.set(id,p)}return p}
// Una pausa che lascia rispondere la pagina senza usare timer, che con la scheda nascosta rallentano.
const yieldPage=()=>new Promise(r=>{const ch=new MessageChannel();ch.port1.onmessage=()=>r();ch.port2.postMessage(0)});
// Lettore dei fotogrammi di un file video: si chiede un istante alla volta, in avanti, e lui decodifica quanto serve.
// Tiene pochi fotogrammi in sospeso: quelli non ancora chiusi occupano la memoria del decodificatore, che con troppi si ferma.
function frameReader(blob,tr){const P=tr.packets,keys=[];for(let i=0;i<P.n;i++)if(P.key[i])keys.push(i);let next=0,flushed=false,err=null,wake=null,cur=null,reading=null;const ready=[];
 const ping=()=>{const w=wake;wake=null;w?.()},wait=()=>new Promise(r=>{wake=r});
 const dec=new VideoDecoder({output:f=>{ready.push(f);ping()},error:e=>{err=e;ping()}});dec.addEventListener('dequeue',ping);
 const configure=()=>dec.configure({codec:tr.codec,...(tr.description?{description:tr.description}:{}),...(tr.width?{codedWidth:tr.width,codedHeight:tr.height}:{})});configure();
 // Pacchetto da cui cominciare per arrivare a t: l'ultimo fotogramma chiave che si presenta entro t.
 const startAt=t=>{let lo=0,hi=keys.length-1,k=keys[0]||0;while(lo<=hi){const m=(lo+hi)>>1;if(P.pts[keys[m]]<=t+1e-6){k=keys[m];lo=m+1}else hi=m-1}return k};
 const feed=async()=>{const end=Math.min(P.n,next+8),data=await readPackets(blob,P,next,end);for(let i=next;i<end;i++)dec.decode(new EncodedVideoChunk({type:P.key[i]?'key':'delta',timestamp:Math.round(P.pts[i]*1e6),duration:Math.round(P.dur[i]*1e6),data:data[i-next]}));next=end};
 const drop=()=>{for(const f of ready)f.close();ready.length=0;cur?.close();cur=null};
 return{
  seek(t){if(next||ready.length||cur){drop();dec.reset();configure()}next=startAt(t);flushed=false},
  // Il fotogramma da mostrare all'istante t del file: l'ultimo che comincia entro t. Un salto oltre il prossimo
  // fotogramma chiave riparte da lì invece di decodificare tutto quello che c'è in mezzo.
  async frameAt(t){const T=Math.round(t*1e6)+1;if(startAt(t)>next)this.seek(t);
   for(;;){if(err)throw err;while(ready.length&&ready[0].timestamp<=T){cur?.close();cur=ready.shift()}
    if(ready.length||(flushed&&dec.decodeQueueSize===0))return cur||ready[0]||null;
    if(next<P.n&&dec.decodeQueueSize<4&&ready.length<3){await (reading??=feed().finally(()=>{reading=null}));continue}
    if(next>=P.n&&!flushed){flushed=true;await dec.flush();continue}
    await wait()}},
  close(){drop();try{dec.close()}catch(e){}}}}
// Audio di un tratto di un file, già a 48 kHz: si leggono solo i suoi pacchetti (più un poco prima, perché il
// decodificatore si assesti), si rimettono in un piccolo M4A o WebM e li decodifica il browser con il suo convertitore.
// Restituisce {buf, t0} (t0: istante del file del primo campione), {none} se il file non ha audio, null se non si sa leggere.
function wavLayout(b){if(b.length<12||fourcc(b,0)!=='RIFF'&&fourcc(b,0)!=='RF64'||fourcc(b,8)!=='WAVE')return null;const v=new DataView(b.buffer,b.byteOffset,b.length);let at=12,fmt=null;
 while(at+8<=b.length){const id=fourcc(b,at),size=v.getUint32(at+4,true);if(id==='fmt '&&at+24<=b.length){fmt={tag:v.getUint16(at+8,true),ch:v.getUint16(at+10,true),rate:v.getUint32(at+12,true),align:v.getUint16(at+20,true),bits:v.getUint16(at+22,true)};if(fmt.tag===0xFFFE&&at+34<=b.length)fmt.tag=v.getUint16(at+32,true)}
  else if(id==='data')return fmt&&fmt.align?{...fmt,off:at+8,size}:null;at+=8+size+(size&1)}return null}
async function wavRange(blob,t0,t1){const L=wavLayout(await readBytes(blob,0,Math.min(blob.size,1<<16)));if(!L)return null;const frames=Math.floor(Math.min(L.size,blob.size-L.off)/L.align),a=Math.max(0,Math.floor(t0*L.rate)),b=Math.min(frames,Math.ceil(t1*L.rate)+1);if(b<=a)return{none:true};
 const data=await readBytes(blob,L.off+a*L.align,(b-a)*L.align),head=new Uint8Array(44),v=new DataView(head.buffer),w4=(at,s)=>head.set(chars(s),at);
 w4(0,'RIFF');v.setUint32(4,36+data.length,true);w4(8,'WAVE');w4(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,L.tag,true);v.setUint16(22,L.ch,true);v.setUint32(24,L.rate,true);v.setUint32(28,L.rate*L.align,true);v.setUint16(32,L.align,true);v.setUint16(34,L.bits,true);w4(36,'data');v.setUint32(40,data.length,true);
 const w=readWav(await new Blob([head,data]).arrayBuffer());return w?.buffer?{buf:await resampleBuffer(w.buffer,48000),t0:a/L.rate}:{none:true}}
async function mediaAudioRange(id,t0,t1){const rt=MEDIA.get(id),m=mediaMeta(id);if(!rt||!m||m.type==='image')return null;
 if(/\.wav$/i.test(m.name)||rt.blob.type==='audio/wav'){const r=await wavRange(rt.blob,t0,t1);if(r)return r}
 const dm=await mediaDemux(id);if(!dm)return null;const tr=dm.tracks.find(t=>t.type==='audio');if(!tr)return{none:true};const c=tr.codec||'';if(!(c.startsWith('mp4a')&&tr.description||c==='opus'||c==='mp3'))return null;
 const P=tr.packets,pre=c==='opus'?0.08:0.1;let i=0;while(i<P.n&&P.pts[i]+P.dur[i]<t0-pre)i++;let j=i;while(j<P.n&&P.pts[j]<t1+0.05)j++;if(j<=i)return{none:true};
 const data=await readPackets(rt.blob,P,i,j),pk=data.map((d,q)=>({data:d,ts:Math.round((P.pts[i+q]-P.pts[i])*1e6),dur:Math.round(P.dur[i+q]*1e6)}));
 const file=c.startsWith('mp4a')?m4aBlob({packets:pk,desc:tr.description,rate:tr.sampleRate,ch:tr.channels,bitrate:128000}):c==='opus'?webmAudioBlob({packets:pk,desc:tr.description,rate:48000,ch:tr.channels}):new Blob(data);
 // Nel piccolo WebM il primo campione decodificato corrisponde all'istante del blocco, senza il ritardo dell'Opus (CodecDelay).
 const out=await decodeAudioFile(file,{rate:48000});return out?.buffer?{buf:await resampleBuffer(out.buffer,48000),t0:P.pts[i]+(c==='opus'?tr.codecDelay||0:0)}:{none:true}}
// Audio di una clip per il mixaggio: il tratto che serve, oppure (per i formati che non si leggono a pezzi) il file intero.
async function clipAudio(id,a,b){try{const r=await mediaAudioRange(id,a,b);if(r?.none)return null;if(r)return r}catch(e){console.warn('Tratto audio non letto',e)}const buf=await decodedAudio(id);return buf?{buf,t0:0}:null}
// Che cosa si può fare un fotogramma alla volta: decodable se ogni video del montaggio si decodifica con WebCodecs,
// formats i formati che il browser sa codificare (MP4 con H.264 e AAC, WebM con VP9 o VP8 e Opus).
async function fastPlan(){const out={decodable:false,ok:false,formats:[],reason:''};if(fastBroken||typeof VideoDecoder==='undefined'||typeof VideoEncoder==='undefined'||typeof EncodedVideoChunk==='undefined')return out;
 for(const s of layout()){if(s.c.kind!=='media')continue;const m=mediaMeta(s.c.media);if(m?.type!=='video')continue;const tr=(await mediaDemux(m.id))?.tracks.find(t=>t.type==='video');let ok=!!tr?.codec;
  if(ok)try{ok=(await VideoDecoder.isConfigSupported({codec:tr.codec,...(tr.description?{description:tr.description}:{}),...(tr.width?{codedWidth:tr.width,codedHeight:tr.height}:{})})).supported}catch(e){ok=false}
  if(!ok){out.reason=m.name;return out}}
 out.decodable=true;const W=V.p.w,H=V.p.h,enc=async(codec,extra={})=>{try{return (await VideoEncoder.isConfigSupported({codec,width:W,height:H,bitrate:8e6,framerate:V.p.fps,...extra})).supported?codec:null}catch(e){return null}};
 const avc=await enc(W*H>1920*1088?'avc1.640033':'avc1.640028',{avc:{format:'avc'}});if(avc&&await codecSupported('aac'))out.formats.push({ext:'mp4',codec:avc,audio:'aac',label:'MP4 (H.264 e AAC): si apre su tutti i dispositivi'});
 const vp=(await enc('vp09.00.10.08'))||(await enc('vp8'));if(vp&&await codecSupported('opus'))out.formats.push({ext:'webm',codec:vp,audio:'opus',label:vp==='vp8'?'WebM (VP8 e Opus)':'WebM (VP9 e Opus): leggero, per il web'});
 out.ok=out.formats.length>0;return out}
// Percorre il montaggio un fotogramma alla volta e disegna ogni istante come nell'anteprima, in un canvas a parte sulla
// scheda grafica: il codificatore prende il fotogramma direttamente dal canvas (rileggere i pixel con getImageData
// costerebbe più del resto). L'anteprima si aggiorna ogni 15 fotogrammi. onFrame(k, t, canvas) riceve il disegno pronto;
// restituisce false se stop() ha fermato il lavoro.
async function renderFrames({burn,onFrame,stop}){const fps=V.p.fps,N=Math.max(1,Math.round(totalDur()*fps)),readers=new Map(),xc=document.createElement('canvas');xc.width=V.p.w;xc.height=V.p.h;const xg=xc.getContext('2d',{alpha:false});VE.frames=new Map();let lastYield=performance.now();
 try{for(let k=0;k<N;k++){if(stop())return false;const t=k/fps,active=layout().filter(s=>s.c.kind==='media'&&t>=s.start&&t<s.end&&mediaMeta(s.c.media)?.type==='video');
   for(const [id,r] of readers)if(!active.some(s=>s.c.id===id)){r.close();readers.delete(id);VE.frames.delete(id)}
   for(const s of active){const tr=(await mediaDemux(s.c.media)).tracks.find(x=>x.type==='video'),st=srcTime(s,t);let r=readers.get(s.c.id);if(!r){r=frameReader(MEDIA.get(s.c.media).blob,tr);readers.set(s.c.id,r);r.seek(st)}
    const f=await r.frameAt(st);if(f)VE.frames.set(s.c.id,{img:f,w:f.displayWidth,h:f.displayHeight,rot:tr.rotation});else VE.frames.delete(s.c.id)}
   drawFrame(xg,t,{subs:burn});if(k%15===0)vg.drawImage(xc,0,0);await onFrame(k,t,xc);if(performance.now()-lastYield>40){await yieldPage();lastYield=performance.now()}}
  return true}
 finally{for(const r of readers.values())r.close();VE.frames=null}}
// Codificatore hardware o software: dipende dal computer quale sia più veloce, quindi si prova ognuno su 16 fotogrammi
// presi da un canvas, come nell'esportazione.
async function pickAccel(cfg){let best='no-preference',bestMs=Infinity;const W=cfg.width,H=cfg.height,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d',{alpha:false});
 for(const hw of ['prefer-software','prefer-hardware']){const c={...cfg,hardwareAcceleration:hw};try{if(!(await VideoEncoder.isConfigSupported(c)).supported)continue}catch(e){continue}
  let err=null;const enc=new VideoEncoder({output:()=>{},error:e=>{err=e}});try{enc.configure(c);const t0=performance.now();for(let k=0;k<16&&!err;k++){g.fillStyle=`hsl(${k*20},60%,45%)`;g.fillRect(0,0,W,H);g.fillStyle='#fff';g.fillRect(k*40%W,H/3,W/5,H/3);const vf=new VideoFrame(c,{timestamp:k*33333});enc.encode(vf,{keyFrame:k===0});vf.close()}
   await enc.flush();const ms=performance.now()-t0;if(!err&&ms<bestMs){bestMs=ms;best=hw}}catch(e){}finally{try{enc.close()}catch(e){}}}
 return best}
// Finestra di avanzamento comune a esportazione e analisi; annullare ferma il lavoro al fotogramma seguente.
function progressDialog(title,intro,button,what){let cancelled=false;VE.exp={rec:{state:'inactive',pause(){},resume(){}},burn:false,T:totalDur(),lum:[],finish:()=>{cancelled=true},lastPct:-1,step:-1,completed:false,close:null};
 modal(title,`<p>${intro}</p><div class="progress" id="expBar" role="progressbar" aria-label="${what}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div></div></div><p id="expText">Preparazione…</p>`,[],button,{noCancel:true,restore:false,onOpen:(p,close)=>{VE.exp.close=close}}).then(()=>{if(VE.exp&&!VE.exp.completed)cancelled=true});
 return{exp:VE.exp,cancelled:()=>cancelled,text:s=>{const el=$('expText');if(el)el.textContent=s},end:()=>{const e=VE.exp;if(e){e.completed=true;e.close?.(null)}VE.exp=null;requestFrame()}}}
async function fastExport(plan,{fmt,bps,burn,srt,name}){vStop();const f=plan.formats.find(x=>x.ext===fmt)||plan.formats[0],W=V.p.w,H=V.p.h,fps=V.p.fps,T=totalDur();
 const ui=progressDialog('Esportazione del video','Il video si prepara un fotogramma alla volta: puoi usare altre schede nel frattempo. Puoi annullare in qualsiasi momento.','Annulla l’esportazione','Avanzamento dell’esportazione');ui.exp.burn=burn;let enc=null;
 try{ui.text('Mixaggio dell’audio…');announce('Esportazione avviata: prima l’audio, poi i fotogrammi');const mix=await mixdown();if(ui.cancelled()){toast('Esportazione annullata');return}
  ui.text('Codifica dell’audio…');const audio=await encodeAudio(mix,f.audio,192000);
  // I pacchetti video si raccolgono in Blob da 16 MB: la memoria della pagina non cresce con la durata del video.
  const packets=[];let desc=null,err=null,batch=[],bytes=0;
  const seal=()=>{if(!batch.length)return;const blob=new Blob(batch.map(p=>p.data));let at=0;for(const p of batch){p.data=blob.slice(at,at+p.size);at+=p.size}batch=[];bytes=0};
  enc=new VideoEncoder({output:(ch,meta)=>{const d=new Uint8Array(ch.byteLength);ch.copyTo(d);const p={data:d,size:d.length,pts:ch.timestamp,dur:ch.duration||Math.round(1e6/fps),key:ch.type==='key'};packets.push(p);batch.push(p);bytes+=d.length;if(bytes>(16<<20))seal();
    const x=meta?.decoderConfig?.description;if(x&&!desc)desc=x instanceof ArrayBuffer?new Uint8Array(x.slice(0)):new Uint8Array(x.buffer.slice(x.byteOffset,x.byteOffset+x.byteLength))},error:e=>{err=e}});
  const cfg={codec:f.codec,width:W,height:H,bitrate:bps,framerate:fps,latencyMode:'quality',...(f.ext==='mp4'?{avc:{format:'avc'}}:{})};ui.text('Scelta del codificatore…');enc.configure({...cfg,hardwareAcceleration:await pickAccel(cfg)});
  const drained=()=>new Promise(r=>enc.addEventListener('dequeue',r,{once:true})),gop=Math.max(1,Math.round(fps*2)),t0=performance.now();
  const ok=await renderFrames({burn,stop:()=>ui.cancelled()||!!err,onFrame:async(k,t,xc)=>{expFrame(t,xc);const vf=new VideoFrame(xc,{timestamp:Math.round(k*1e6/fps),duration:Math.round(1e6/fps)});
   enc.encode(vf,{keyFrame:k%gop===0});vf.close();while(enc.encodeQueueSize>4&&!err)await drained()}});
  if(err)throw err;if(!ok){toast('Esportazione annullata');return}
  ui.text('Scrittura del file…');await enc.flush();seal();
  if(f.ext==='mp4'&&!desc)throw Error('il codificatore H.264 non ha fornito la configurazione');
  const blob=f.ext==='mp4'?mp4Movie({video:{width:W,height:H,desc,packets},audio}):webmMovie({video:{codec:f.codec==='vp8'?'vp8':'vp9',width:W,height:H,packets},audio});
  const file=extName(name,f.ext);download(blob,file);if(srt&&V.p.subs.length)download(srtText(V.p.subs),extName(name,'srt'),'application/x-subrip');
  await lumDone(ui.exp);const warn=flashWarnings(ui.exp.lum.sort((x,y)=>x[0]-y[0]));V.p.flash={when:new Date().toISOString(),key:visualKey(),warnings:warn};schedulePersist('video');const secs=(performance.now()-t0)/1000;
  toast(`Video esportato: ${file} (${fmtBytes(blob.size)}), in ${sayTime(secs)} per ${sayTime(T)} di montaggio.${warn.length?` Attenzione: possibili lampeggiamenti pericolosi a ${warn.slice(0,3).map(w=>fmtTime(w,0)).join(', ')}. Apri Verifica l’accessibilità.`:''}`)}
 catch(e){console.error('Esportazione fotogramma per fotogramma non riuscita',e);fastBroken=true;toast('Esportazione non riuscita ('+(e.message||e)+'). Riprova: si userà l’esportazione in tempo reale.')}
 finally{try{if(enc&&enc.state!=='closed')enc.close()}catch(e){}ui.end()}}
// Analisi dei lampeggiamenti senza esportare, un fotogramma alla volta.
async function fastFlashes(){vStop();const ui=progressDialog('Analisi dei lampeggiamenti','Si misura la luminosità di ogni fotogramma, senza far scorrere il montaggio.','Annulla','Avanzamento dell’analisi');ui.exp.burn=V.p.burnSubs;
 try{const ok=await renderFrames({burn:V.p.burnSubs,stop:ui.cancelled,onFrame:(k,t,xc)=>expFrame(t,xc)});if(!ok){toast('Analisi annullata');return null}
  await lumDone(ui.exp);const warn=flashWarnings(ui.exp.lum.sort((x,y)=>x[0]-y[0]));V.p.flash={when:new Date().toISOString(),key:visualKey(),warnings:warn};schedulePersist('video');return warn}
 catch(e){console.error('Analisi fotogramma per fotogramma non riuscita',e);fastBroken=true;toast('Analisi non riuscita: riprova, si userà l’analisi in tempo reale');return null}
 finally{ui.end()}}
