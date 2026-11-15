// Motore del progetto multitraccia. Ogni traccia ha una catena di nodi audio: bassi e alti, compressione,
// bilanciamento, volume (con muto e solo) e una mandata al riverbero comune; ogni regione è una sorgente programmata
// con il suo guadagno e le sue dissolvenze. La stessa catena suona in tempo reale e, fuori linea, produce il mix.
// Un effetto a zero non crea nodi: costano calcolo anche quando non cambiano il suono. Il compressore ritarda il
// suono di 6 ms (come il limitatore finale), quindi quando una traccia lo usa le altre ricevono lo stesso ritardo.
const MIX={playing:false,from:0,c0:0,origin:0,raf:0,timer:0,graph:null,srcs:[],passes:[],analyser:null,out:null,metroUntil:0,cycKey:'',recording:false,lat:0};
const PRE_DELAY=0.006,LOOKAHEAD=0.4,START_GAP=0.04,EDGE_FADE=0.003;
const hasAuto=(t,k)=>!!(t.autoOn?.[k]&&t[k+'Auto']?.length);
// Valore di un inviluppo a un istante: lineare fra un punto e il successivo, fermo prima del primo e dopo l'ultimo.
function autoValueAt(points,t){if(!points?.length)return null;if(t<=points[0].t)return points[0].v;const last=points.at(-1);if(t>=last.t)return last.v;
 let lo=0,hi=points.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(points[m].t<=t)lo=m;else hi=m}
 const a=points[lo],b=points[hi],k=(t-a.t)/((b.t-a.t)||1);return a.v+(b.v-a.v)*k}
// Riverbero: risposta all'impulso generata (rumore che si spegne in 2,4 secondi), una per contesto audio.
const IR=new WeakMap();
function impulse(ctx){let b=IR.get(ctx);if(b)return b;const n=Math.round(ctx.sampleRate*2.4);b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.5)}IR.set(ctx,b);return b}
// Percorso di una traccia fino al master: la traccia, il suo bus, il bus del bus e così via.
const pathOf=t=>{const out=[];let x=t,guard=0;while(x&&guard++<8){out.push(x);x=x.out?trackOf(x.out):null}return out};
const depthOf=t=>pathOf(t).length-1;
// Ogni compressore sul percorso ritarda il suono di PRE_DELAY: il ritardo totale è quello del percorso più lungo.
const pathComp=t=>pathOf(t).reduce((n,x)=>n+(x.comp>0?1:0),0);
const mixLatency=tracks=>PRE_DELAY*(1+Math.max(0,...tracks.map(pathComp)));
// Una traccia si sente se nessuno del suo percorso è muto e, con un solo acceso, se nel percorso c'è il solo.
function audible(t){const solo=P.tracks.some(x=>x.solo),path=pathOf(t);if(path.some(x=>x.mute))return false;return !solo||path.some(x=>x.solo)}
function newGraph(ctx,dest){const master=ctx.createGain(),lim=ctx.createDynamicsCompressor();lim.threshold.value=-1.5;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=0.002;lim.release.value=0.12;master.connect(lim);lim.connect(dest);return{ctx,master,lim,rev:null,tracks:new Map(),lat:PRE_DELAY}}
// Catena di una traccia con i soli effetti attivi; si rifà quando un effetto o l'uscita cambiano. Le sorgenti entrano
// in input, che resta sempre lo stesso. Il volume automatico ha un nodo suo; il riverbero è quello del bus di
// destinazione (o del master), così gruppi diversi non condividono lo stesso spazio.
function chainTrack(gr,t,delayUnits){const ctx=gr.ctx;let n=gr.tracks.get(t.id);
 if(!n){n={input:ctx.createGain(),pan:ctx.createStereoPanner(),vol:ctx.createGain(),auto:ctx.createGain(),meter:ctx.createAnalyser(),send:ctx.createGain(),rev:null,shape:''};n.meter.fftSize=256;n.pan.connect(n.vol);n.vol.connect(n.auto);n.auto.connect(n.meter);n.auto.connect(n.send);gr.tracks.set(t.id,n)}
 const shape=`${t.low!==0}|${t.high!==0}|${t.comp>0}|${t.reverb>0}|${t.out||''}|${delayUnits}`;
 if(n.shape===shape)return n;
 n.input.disconnect();n.send.disconnect();for(const k of ['low','high','comp','make','delay']){n[k]?.disconnect();n[k]=null}
 let at=n.input;const link=x=>{at.connect(x);at=x;return x};
 if(t.low!==0){link(n.low=ctx.createBiquadFilter());n.low.type='lowshelf';n.low.frequency.value=200}
 if(t.high!==0){link(n.high=ctx.createBiquadFilter());n.high.type='highshelf';n.high.frequency.value=4000}
 if(t.comp>0){link(n.comp=ctx.createDynamicsCompressor());n.comp.knee.value=6;n.comp.attack.value=0.006;n.comp.release.value=0.18;link(n.make=ctx.createGain())}
 if(delayUnits>0){link(n.delay=ctx.createDelay(0.06));n.delay.delayTime.value=delayUnits*PRE_DELAY}
 at.connect(n.pan);
 const holder=t.out?gr.tracks.get(t.out):null,dest=holder?holder.input:gr.master;
 n.meter.disconnect();n.meter.connect(dest);
 if(t.reverb>0){const rev=holder||gr;if(!rev.rev){rev.rev=ctx.createConvolver();rev.rev.buffer=impulse(ctx);rev.rev.connect(holder?holder.input:gr.master)}n.send.connect(rev.rev)}
 n.shape=shape;return n}
function setTrackNodes(t,n,{only=null,ctx=null}={}){const set=(p,v)=>ctx?p.setTargetAtTime(v,ctx.currentTime,0.02):p.value=v,c=t.comp/100,live=only?true:audible(t);
 if(n.low)set(n.low.gain,t.low);if(n.high)set(n.high.gain,t.high);if(n.comp){set(n.comp.threshold,-10-26*c);set(n.comp.ratio,1+7*c);set(n.make.gain,fromDb(9*c))}
 if(!hasAuto(t,'pan'))set(n.pan.pan,t.pan);
 set(n.vol.gain,hasAuto(t,'vol')?(live?1:0):(live?fromDb(t.vol):0));
 if(!hasAuto(t,'vol'))set(n.auto.gain,1);
 set(n.send.gain,t.reverb/100*0.6)}
// Allinea il mixer alle tracce: i bus prima delle loro tracce, poi i valori dei cursori. only: una sola traccia (e i
// suoi bus), per esportarla senza muto né solo.
function syncGraph(gr,tracks,{only=null,live=false}={}){const ids=new Set(tracks.map(t=>t.id));
 for(const [id,n] of gr.tracks)if(!ids.has(id)){for(const x of [n.input,n.low,n.high,n.comp,n.make,n.delay,n.pan,n.vol,n.auto,n.meter,n.send])x?.disconnect();n.rev?.disconnect();gr.tracks.delete(id)}
 const maxLat=Math.max(0,...tracks.map(pathComp));
 for(const t of [...tracks].sort((a,b)=>depthOf(a)-depthOf(b)))setTrackNodes(t,chainTrack(gr,t,maxLat-pathComp(t)),{only,ctx:live?gr.ctx:null});
 gr.lat=mixLatency(tracks);return gr}
// Programma l'automazione di una passata: punti in [from, end) e valore fermo ai due estremi. Gli eventi sono
// monotoni (un punto con lo stesso tempo viene saltato) perché Web Audio rifiuta due rampe sullo stesso istante.
function scheduleTrackAuto(ctx,gr,from,when,end,{only=null}={}){const stop=Math.max(from+0.01,Math.min(Number.isFinite(end)?end:projDur(),Math.max(projDur(),from+0.01)));
 for(const t of P.tracks){if(only&&t.id!==only)continue;const n=gr.tracks.get(t.id);if(!n)continue;
  for(const k of ['vol','pan']){const pts=t[k+'Auto'],param=k==='vol'?n.auto.gain:n.pan.pan;if(!hasAuto(t,k)){if(k==='vol'){param.cancelScheduledValues(when);param.setValueAtTime(1,when)}continue}
   const ev=[{t:from,v:autoValueAt(pts,from)}];for(const p of pts)if(p.t>from+1e-6&&p.t<stop-1e-6)ev.push({t:p.t,v:p.v});ev.push({t:stop,v:autoValueAt(pts,stop)});
   param.cancelScheduledValues(when);let last=-Infinity;
   ev.forEach((e,i)=>{if(i){if(e.t<=last+1e-6)return;
     // il volume va in linea retta in decibel: una rampa esponenziale in ampiezza, cioè lineare in dB
     if(k==='vol')param.exponentialRampToValueAtTime(fromDb(e.v),when+(e.t-from));else param.linearRampToValueAtTime(clamp(e.v,-1,1),when+(e.t-from))}
    else param.setValueAtTime(k==='vol'?fromDb(e.v):clamp(e.v,-1,1),when);last=e.t})}}}
// Il mixer della riproduzione resta pronto tra un ascolto e l'altro: spostarsi nel brano riprogramma solo le regioni.
function liveGraph(live){const ctx=actxGet();if(!MIX.graph||MIX.graph.ctx!==ctx)MIX.graph=newGraph(ctx,mixOut());return syncGraph(MIX.graph,P.tracks,{live})}
// Regioni del brano tra from ed end, a partire dall'istante when del contesto. Il guadagno segue i punti dell'inviluppo
// (dissolvenze della regione); dove la regione è tagliata (ascolto da metà, fine del ciclo) entra ed esce in 3 ms.
function regionGainAt(r,x){let v=fromDb(r.gain);if(r.fadeIn>0)v*=clamp(x/r.fadeIn,0,1);if(r.fadeOut>0)v*=clamp((r.dur-x)/r.fadeOut,0,1);return v}
// Le sezioni di comping di una regione: dove non c'è una sezione vale la take attiva. I tempi sono relativi alla
// regione e off è il punto dentro la take da cui partire (prendendo la sezione al tempo x si parte da take.off + x).
function compSegments(r){const dur=r.dur,base={a:0,b:dur,src:r.src,off:r.off};
 const cuts=(r.comp||[]).map(c=>({a:clamp(c.from,0,dur),b:clamp(c.to,0,dur),take:c.take})).filter(c=>c.b>c.a).sort((x,y)=>x.a-y.a);
 if(!cuts.length)return[base];
 const segs=[];let at=0;
 for(const c of cuts){if(c.a>at+1e-6)segs.push({...base,a:at,b:c.a});const tk=(r.takes||[]).find(t=>t.id===c.take),a=Math.max(at,c.a);
  if(c.b>a)segs.push({a,b:c.b,src:tk?tk.src:r.src,off:(tk?tk.off:r.off)+a});at=Math.max(at,c.b)}
 if(at<dur-1e-6)segs.push({...base,a:at,b:dur});
 return segs.filter(s=>s.b>s.a&&s.src&&SOURCES.has(s.src))}
function scheduleRegions(ctx,gr,from,when,{end=Infinity}={}){const out=[],stop=end===Infinity?Math.max(projDur(),from+1):end,duck=duckGains(from,stop);
 for(const r of P.regions){if(regionEnd(r)<=from+1e-6||r.start>=end)continue;const tn=gr.tracks.get(r.track);if(!tn)continue;
  for(const seg of compSegments(r)){const buf=SOURCES.get(seg.src);if(!buf)continue;
   const t=Math.max(from,r.start+seg.a),e=Math.min(end,r.start+seg.b);if(e-t<=1e-4)continue;
   const off=seg.off+(t-(r.start+seg.a)),len=e-t,a=t-r.start,z=e-r.start,x=Math.min(EDGE_FADE,len/2),cutIn=a>1e-4,cutOut=z<r.dur-1e-4,
    s=ctx.createBufferSource(),g=ctx.createGain(),at=when+(t-from);s.buffer=buf;
   const env=y=>regionGainAt(r,y)*(cutIn?clamp((y-a)/x,0,1):1)*(cutOut?clamp((z-y)/x,0,1):1),dg=duck.get(r.track);
   if(dg){const N=Math.max(2,Math.ceil(len/DUCK_STEP)+1),arr=new Float32Array(N);
    for(let i=0;i<N;i++){const y=a+(i/(N-1))*(z-a),d=dg[clamp(Math.floor((t+(y-a)-from)/DUCK_STEP),0,dg.length-1)]??1;arr[i]=env(y)*d}
    g.gain.setValueCurveAtTime(arr,at,len)}
   else{const pts=new Set([a,z]);if(cutIn)pts.add(a+x);if(cutOut)pts.add(z-x);for(const b of [r.fadeIn,r.dur-r.fadeOut])if(b>a&&b<z)pts.add(b);
    [...pts].sort((p,q)=>p-q).forEach((y,i)=>i?g.gain.linearRampToValueAtTime(env(y),at+(y-a)):g.gain.setValueAtTime(env(y),at))}
   s.connect(g);g.connect(tn.input);s.start(at,off,len);out.push({s,g,until:at+len})}}
 return out}
// ——— Ducking: quando parla la traccia della voce le altre si abbassano. Il livello della voce si misura a finestre
// di 20 ms, la soglia segue il materiale (95° percentile meno 30 dB) e l'abbassamento entra in 60 ms e risale in 350,
// così le consonanti non fanno "pompare" la musica. Il guadagno viene scritto nella curva della regione: suona
// uguale in tempo reale e nel mix esportato.
const DUCK_STEP=0.02;
function voiceWindowLevels(id,from,to){const n=Math.max(1,Math.ceil((to-from)/DUCK_STEP)),lv=new Float32Array(n).fill(-120),tr=trackOf(id);
 if(!tr||!audible(tr))return lv;
 for(const r of regionsOn(id)){if(regionEnd(r)<=from||r.start>=to)continue;const buf=SOURCES.get(r.src);if(!buf)continue;
  const rate=buf.sampleRate,a=Math.max(from,r.start),b=Math.min(to,regionEnd(r)),chans=Array.from({length:buf.numberOfChannels},(_,c)=>buf.getChannelData(c)),
   w0=Math.max(0,Math.floor((a-from)/DUCK_STEP)),w1=Math.min(n,Math.ceil((b-from)/DUCK_STEP));
  for(let w=w0;w<w1;w++){const t0=a+Math.max(0,w*DUCK_STEP-(a-from)),t1=Math.min(b,t0+DUCK_STEP),
   s0=Math.max(0,Math.round((r.off+(t0-r.start))*rate)),s1=Math.min(buf.length,Math.round((r.off+(t1-r.start))*rate));let pk=0;
   for(const d of chans)for(let j=s0;j<s1;j++){const v=d[j]<0?-d[j]:d[j];if(v>pk)pk=v}
   if(pk>0)lv[w]=Math.max(lv[w],20*Math.log10(pk))}}
 return lv}
function duckGains(from,to){const out=new Map(),voice=P.tracks.find(t=>t.voice&&audible(t));if(!voice)return out;
 const targets=P.tracks.filter(t=>t.id!==voice.id&&t.duck>0&&audible(t));if(!targets.length)return out;
 const lv=voiceWindowLevels(voice.id,from,to),n=lv.length,ordered=Array.from(lv).sort((a,b)=>a-b),
  thr=clamp((ordered[Math.min(n-1,Math.floor(n*0.95))]??-120)-30,-55,-30),
  att=1-Math.exp(-DUCK_STEP/0.06),rel=1-Math.exp(-DUCK_STEP/0.35);
 for(const t of targets){const g=new Float32Array(n),down=fromDb(-clamp(t.duck,0,18));let cur=1;
  for(let i=0;i<n;i++){const want=lv[i]>thr?down:1;cur=want<cur?cur+(want-cur)*att:cur+(want-cur)*rel;g[i]=cur}out.set(t.id,g)}
 return out}
// Metronomo: un colpo per tempo, più acuto sul primo della battuta.
function clickAt(ctx,dest,t,accent){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=accent?1600:1000;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(accent?0.55:0.38,t+0.002);g.gain.exponentialRampToValueAtTime(0.001,t+0.06);o.connect(g);g.connect(dest);o.start(t);o.stop(t+0.07);return{s:o,g,click:true,until:t+0.07}}
async function countIn(){const ctx=actxGet(),out=mixOut(),t0=ctx.currentTime+0.08;for(let k=0;k<P.sig;k++)clickAt(ctx,out,t0+k*beatDur(),k===0);announce('Conteggio di una battuta');await new Promise(r=>setTimeout(r,(P.sig*beatDur()+0.08)*1000-30))}
function mixOut(){const ctx=actxGet();if(!MIX.out){MIX.out=ctx.createGain();MIX.analyser=ctx.createAnalyser();MIX.analyser.fftSize=2048;MIX.out.connect(MIX.analyser);MIX.analyser.connect(ctx.destination)}return MIX.out}
// Il brano suona a passate: tratti [a, b) del brano, ognuno con l'istante w del contesto in cui comincia. Senza ciclo
// c'è una sola passata fino alla fine; con il ciclo la passata seguente si programma in anticipo, attaccata alla
// precedente, così il giro non ha buchi. Un timer, che continua anche con la scheda nascosta, programma passate e colpi
// del metronomo; l'indicatore si ridisegna a ogni fotogramma.
const cycleOn=()=>{const c=P.cycle;return c.on&&c.b>c.a+0.05&&!MIX.recording};
const cycleKey=()=>cycleOn()?P.cycle.a+':'+P.cycle.b:'';
function addPass(a,b,w){MIX.passes.push({a,b,w});MIX.srcs.push(...scheduleRegions(actx,MIX.graph,a,w,{end:b}));scheduleTrackAuto(actx,MIX.graph,a,w,b)}
function mixPos(){if(!MIX.playing||!actx||!MIX.passes.length)return P.t;const now=actx.currentTime;let p=MIX.passes[0];for(const q of MIX.passes)if(q.w<=now)p=q;return Math.min(p.b,p.a+Math.max(0,now-p.w))}
// Fermata: le regioni escono in 3 ms, i colpi del metronomo già programmati si staccano.
function mixKill(){clearInterval(MIX.timer);cancelAnimationFrame(MIX.raf);const now=actx?.currentTime||0;
 for(const x of MIX.srcs){if(x.click){x.g.disconnect();continue}try{x.g.gain.cancelScheduledValues(now);x.g.gain.setValueAtTime(x.g.gain.value,now);x.g.gain.linearRampToValueAtTime(0,now+EDGE_FADE);x.s.stop(now+EDGE_FADE)}catch(e){}}
 MIX.srcs=[];MIX.passes=[];MIX.playing=false;for(const t of P.tracks){const cv=$('tmtr-'+t.id);if(cv)drawLaneMeter(cv,-Infinity)}}
function mixPlay(from=P.t,{recording=false,origin=from}={}){mixKill();stopPlayback(false);const ctx=actxGet();MIX.recording=recording;liveGraph(false);const when=ctx.currentTime+START_GAP,c=P.cycle;
 const [a,b]=cycleOn()?[from>=c.b-1e-6?c.a:from,c.b]:[from,Infinity];
 Object.assign(MIX,{playing:true,from:a,c0:when,origin,lat:MIX.graph.lat,metroUntil:when-1e-3,cycKey:cycleKey()});P.t=a;addPass(a,b,when);
 playUIProject(true);mixPump();MIX.timer=setInterval(mixPump,25);MIX.raf=requestAnimationFrame(mixTick)}
function mixStop(keep=true){if(!MIX.playing)return;const pos=mixPos();mixKill();if(keep)P.t=pos;playUIProject(false);drawMeter($('aMeter'),-Infinity);updateArrangeUI()}
function mixRestart(){if(!MIX.playing)return;mixPlay(mixPos(),{recording:MIX.recording,origin:MIX.origin})}
// Cambi di volume, bilanciamento ed effetti durante l'ascolto; una traccia nuova va programmata, quindi si riparte.
function mixLive(){if(!MIX.playing||!MIX.graph)return;const had=new Set(MIX.graph.tracks.keys());syncGraph(MIX.graph,P.tracks,{live:true});MIX.lat=MIX.graph.lat;if(P.tracks.some(t=>!had.has(t.id)))mixRestart()}
function mixPump(){if(!MIX.playing)return;const ctx=actx,now=ctx.currentTime,horizon=now+LOOKAHEAD;if(cycleKey()!==MIX.cycKey){mixRestart();return}
 for(let last=MIX.passes.at(-1);last.b<Infinity&&last.w+(last.b-last.a)<horizon;last=MIX.passes.at(-1)){const w=last.w+(last.b-last.a);if(cycleOn())addPass(P.cycle.a,P.cycle.b,w);else addPass(last.b,Infinity,w)}
 if(P.metro){const bd=beatDur();for(const p of MIX.passes){if(p.w+(p.b-p.a)<=MIX.metroUntil)continue;for(let k=Math.ceil((p.a+Math.max(0,MIX.metroUntil-p.w))/bd-1e-6);;k++){const tb=k*bd,ct=p.w+(tb-p.a);if(tb>=p.b-1e-6||ct>horizon)break;if(ct>MIX.metroUntil+1e-6)MIX.srcs.push(clickAt(ctx,mixOut(),ct,k%P.sig===0))}}}
 MIX.metroUntil=horizon;MIX.srcs=MIX.srcs.filter(x=>x.until>now-0.1);MIX.passes=MIX.passes.filter((p,i,l)=>i===l.length-1||l[i+1].w>now-1);
 if(!MIX.recording&&!P.metro&&!cycleOn()&&mixPos()>=projDur()+0.05){const o=MIX.origin;mixKill();P.t=o;playUIProject(false);drawMeter($('aMeter'),-Infinity);updateArrangeUI();announce('Fine del brano')}}
function mixTick(){if(!MIX.playing)return;const pos=mixPos();placeArPlayhead(pos);$('aClock').textContent=fmtTime(pos);if(prefs.follow)followAr(pos);playingValue(arPlayheadEl,pos,arPlayheadText);
 if(MIX.analyser){MIX.analyser.getFloatTimeDomainData(meterBuf);let pk=0;for(const x of meterBuf)pk=Math.max(pk,Math.abs(x));drawMeter($('aMeter'),toDb(pk))}
 if(MIX.graph)for(const [id,n] of MIX.graph.tracks){const cv=$('tmtr-'+id);if(!cv)continue;n.meter.getFloatTimeDomainData(laneBuf);let pk=0;for(const x of laneBuf)pk=Math.max(pk,Math.abs(x));drawLaneMeter(cv,toDb(pk))}
 MIX.raf=requestAnimationFrame(mixTick)}
function playUIProject(on){const b=$('aPlay');b.setAttribute('aria-label',on?'Pausa del brano':'Riproduci il brano');b.innerHTML=ICON(on?'pause':'play')}
function songPlayPause(){if(MIX.playing){mixStop(true);announce('Pausa a '+sayTime(P.t,1));return}if(!P.regions.length&&!P.metro){toast('Il progetto è vuoto: registra o importa un file');return}let from=P.t;if(from>=projDur()-0.01&&!P.metro)from=0;mixPlay(from)}
function songStop(){const o=MIX.playing?MIX.origin:0;mixStop(false);P.t=o;updateArrangeUI();announce('Fermo, indicatore a '+sayTime(o))}
// Mixaggio fuori linea: tutto il brano, oppure una sola traccia (only) con la sua sola catena, per esportarla da sola.
// Si mixano 6 o 12 ms in più e si tolgono all'inizio: è il ritardo di limitatore e compressori.
async function renderMix({only=null,from=0,to=null,rate=48000,limit=true}={}){to??=projDur();if(to<=from)throw Error('Il progetto è vuoto');
 const chain=only?(()=>{const set=new Set();let x=trackOf(only);while(x&&!set.has(x.id)){set.add(x.id);x=x.out?trackOf(x.out):null}return P.tracks.filter(t=>set.has(t.id))})():P.tracks,
  tracks=chain,n=Math.max(1,Math.ceil((to-from)*rate)),skip=Math.round(mixLatency(tracks)*rate);
 const oc=new OfflineAudioContext(2,n+skip,rate),gr=syncGraph(newGraph(oc,oc.destination),tracks,{only});if(!limit){gr.lim.threshold.value=0;gr.lim.ratio.value=1}scheduleTrackAuto(oc,gr,from,0,to,{only});scheduleRegions(oc,gr,from,0,{end:to});const out=await oc.startRendering(),res=new AudioBuffer({length:n,numberOfChannels:2,sampleRate:rate});
 for(let c=0;c<2;c++)res.copyToChannel(out.getChannelData(c).subarray(skip,skip+n),c);return res}
// I marcatori delle regioni diventano marcatori del brano, nella posizione in cui suonano.
function songMarkers(rate){const out=[];for(const r of P.regions){const sr=SOURCES.get(r.src)?.sampleRate||rate;for(const m of r.markers||[]){const x=m.pos/sr;if(x<0||x>r.dur)continue;out.push({id:m.id,pos:Math.round((r.start+x)*rate),label:m.label})}}return out.sort((a,b)=>a.pos-b.pos)}
async function exportStems(){if(!P.regions.length){toast('Il progetto è vuoto');return}const [aac,opus]=await Promise.all([codecSupported('aac'),codecSupported('opus')]);
 const r=await modal('Esporta le tracce separate',`<p>Un file per ogni traccia, con i suoi effetti e lo stesso inizio, raccolti in un archivio ZIP: servono per continuare il lavoro in un altro programma.</p>`,[{id:'fmt',label:'Formato',type:'select',value:'wav24',options:[['wav16','WAV 16 bit'],['wav24','WAV 24 bit'],['wav32','WAV 32 bit in virgola mobile'],...(aac?[['aac','M4A con AAC']]:[]),...(opus?[['opus','WebM con Opus']]:[])]}],'Esporta');if(!r)return;
 const files=await work('Esportazione delle tracce',async()=>{const out=[];for(const [i,t] of P.tracks.entries()){if(!P.regions.some(x=>x.track===t.id))continue;status(`Mixaggio della traccia ${i+1} di ${P.tracks.length}: ${t.name}`);const buf=await renderMix({only:t.id});out.push({name:extName(`${String(i+1).padStart(2,'0')} ${t.name}`,r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext),data:r.fmt.startsWith('wav')?wavBlob(buf,Number(r.fmt.slice(3))):await compressedBlob(buf,r.fmt,(prefs.kbps||160)*1000)})}return out});
 if(!files?.length)return;const zip=await work('Creazione dell’archivio',()=>zipBlob(files));if(zip){download(zip,extName(P.title+' - tracce','zip'));toast(`Esportate ${files.length} tracce in un archivio ZIP`)}}
