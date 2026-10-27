// Motore del progetto multitraccia. Ogni traccia ha una catena di nodi audio: bassi e alti, compressione,
// bilanciamento, volume (con muto e solo) e una mandata al riverbero comune; ogni regione è una sorgente programmata
// con il suo guadagno e le sue dissolvenze. La stessa catena suona in tempo reale e, fuori linea, produce il mix.
// Un effetto a zero non crea nodi: costano calcolo anche quando non cambiano il suono. Il compressore ritarda il
// suono di 6 ms (come il limitatore finale), quindi quando una traccia lo usa le altre ricevono lo stesso ritardo.
const MIX={playing:false,from:0,c0:0,origin:0,raf:0,timer:0,graph:null,srcs:[],passes:[],analyser:null,out:null,metroUntil:0,cycKey:'',recording:false,lat:0};
const PRE_DELAY=0.006,LOOKAHEAD=0.4,START_GAP=0.04,EDGE_FADE=0.003;
const trackLive=t=>{const solo=P.tracks.some(x=>x.solo);return t.mute||(solo&&!t.solo)?0:fromDb(t.vol)};
// Riverbero: risposta all'impulso generata (rumore che si spegne in 2,4 secondi), una per contesto audio.
const IR=new WeakMap();
function impulse(ctx){let b=IR.get(ctx);if(b)return b;const n=Math.round(ctx.sampleRate*2.4);b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.5)}IR.set(ctx,b);return b}
const anyComp=tracks=>tracks.some(t=>t.comp>0);
// Ritardo di tutto il mixer: limitatore, più il compressore se almeno una traccia lo usa.
const mixLatency=tracks=>PRE_DELAY*(anyComp(tracks)?2:1);
const chainShape=(t,comp)=>`${t.low!==0}${t.high!==0}${t.comp>0}${comp&&!(t.comp>0)}${t.reverb>0}`;
function newGraph(ctx,dest){const master=ctx.createGain(),lim=ctx.createDynamicsCompressor();lim.threshold.value=-1.5;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=0.002;lim.release.value=0.12;master.connect(lim);lim.connect(dest);return{ctx,master,lim,rev:null,tracks:new Map(),lat:PRE_DELAY}}
// Catena di una traccia con i soli effetti attivi; si rifà quando un effetto passa da zero ad attivo o viceversa.
// Le sorgenti entrano in input, che resta sempre lo stesso.
function chainTrack(gr,t,comp){const ctx=gr.ctx;let n=gr.tracks.get(t.id);
 if(!n){n={input:ctx.createGain(),pan:ctx.createStereoPanner(),vol:ctx.createGain(),send:ctx.createGain(),shape:''};n.pan.connect(n.vol);n.vol.connect(gr.master);n.vol.connect(n.send);gr.tracks.set(t.id,n)}
 const shape=chainShape(t,comp);if(n.shape===shape)return n;n.input.disconnect();n.send.disconnect();for(const k of ['low','high','comp','make','delay']){n[k]?.disconnect();n[k]=null}
 let at=n.input;const link=x=>{at.connect(x);at=x;return x};
 if(t.low!==0){link(n.low=ctx.createBiquadFilter());n.low.type='lowshelf';n.low.frequency.value=200}
 if(t.high!==0){link(n.high=ctx.createBiquadFilter());n.high.type='highshelf';n.high.frequency.value=4000}
 if(t.comp>0){link(n.comp=ctx.createDynamicsCompressor());n.comp.knee.value=6;n.comp.attack.value=0.006;n.comp.release.value=0.18;link(n.make=ctx.createGain())}
 else if(comp){link(n.delay=ctx.createDelay(0.05));n.delay.delayTime.value=PRE_DELAY}
 at.connect(n.pan);if(t.reverb>0){if(!gr.rev){gr.rev=ctx.createConvolver();gr.rev.buffer=impulse(ctx);gr.rev.connect(gr.master)}n.send.connect(gr.rev)}
 n.shape=shape;return n}
function setTrackNodes(t,n,{only=null,ctx=null}={}){const set=(p,v)=>ctx?p.setTargetAtTime(v,ctx.currentTime,0.02):p.value=v,c=t.comp/100;
 if(n.low)set(n.low.gain,t.low);if(n.high)set(n.high.gain,t.high);if(n.comp){set(n.comp.threshold,-10-26*c);set(n.comp.ratio,1+7*c);set(n.make.gain,fromDb(9*c))}
 set(n.pan.pan,t.pan);set(n.vol.gain,only?fromDb(t.vol):trackLive(t));set(n.send.gain,t.reverb/100*0.6)}
// Allinea il mixer alle tracce: catene nuove o da rifare, tracce tolte, poi i valori dei cursori.
// only: una sola traccia, per esportarla da sola (senza muto né solo).
function syncGraph(gr,tracks,{only=null,live=false}={}){const comp=anyComp(tracks),ids=new Set(tracks.map(t=>t.id));
 for(const [id,n] of gr.tracks)if(!ids.has(id)){for(const x of [n.input,n.low,n.high,n.comp,n.make,n.delay,n.pan,n.vol,n.send])x?.disconnect();gr.tracks.delete(id)}
 for(const t of tracks)setTrackNodes(t,chainTrack(gr,t,comp),{only,ctx:live?gr.ctx:null});gr.lat=mixLatency(tracks);return gr}
// Il mixer della riproduzione resta pronto tra un ascolto e l'altro: spostarsi nel brano riprogramma solo le regioni.
function liveGraph(live){const ctx=actxGet();if(!MIX.graph||MIX.graph.ctx!==ctx)MIX.graph=newGraph(ctx,mixOut());return syncGraph(MIX.graph,P.tracks,{live})}
// Regioni del brano tra from ed end, a partire dall'istante when del contesto. Il guadagno segue i punti dell'inviluppo
// (dissolvenze della regione); dove la regione è tagliata (ascolto da metà, fine del ciclo) entra ed esce in 3 ms.
function regionGainAt(r,x){let v=fromDb(r.gain);if(r.fadeIn>0)v*=clamp(x/r.fadeIn,0,1);if(r.fadeOut>0)v*=clamp((r.dur-x)/r.fadeOut,0,1);return v}
function scheduleRegions(ctx,gr,from,when,{end=Infinity}={}){const out=[];for(const r of P.regions){if(regionEnd(r)<=from+1e-6||r.start>=end)continue;const buf=SOURCES.get(r.src),tn=gr.tracks.get(r.track);if(!buf||!tn)continue;
  const t=Math.max(from,r.start),into=t-r.start,len=Math.min(r.dur-into,end-t);if(len<=1e-4)continue;const s=ctx.createBufferSource(),g=ctx.createGain(),at=when+(t-from),e=into+len,x=Math.min(EDGE_FADE,len/2),cutIn=into>1e-4,cutOut=e<r.dur-1e-4;s.buffer=buf;
  const pts=new Set([into,e]);if(cutIn)pts.add(into+x);if(cutOut)pts.add(e-x);for(const b of [r.fadeIn,r.dur-r.fadeOut])if(b>into&&b<e)pts.add(b);
  const env=y=>regionGainAt(r,y)*(cutIn?clamp((y-into)/x,0,1):1)*(cutOut?clamp((e-y)/x,0,1):1);
  [...pts].sort((a,b)=>a-b).forEach((y,i)=>i?g.gain.linearRampToValueAtTime(env(y),at+(y-into)):g.gain.setValueAtTime(env(y),at));
  s.connect(g);g.connect(tn.input);s.start(at,r.off+into,len);out.push({s,g,until:at+len})}return out}
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
function addPass(a,b,w){MIX.passes.push({a,b,w});MIX.srcs.push(...scheduleRegions(actx,MIX.graph,a,w,{end:b}))}
function mixPos(){if(!MIX.playing||!actx||!MIX.passes.length)return P.t;const now=actx.currentTime;let p=MIX.passes[0];for(const q of MIX.passes)if(q.w<=now)p=q;return Math.min(p.b,p.a+Math.max(0,now-p.w))}
// Fermata: le regioni escono in 3 ms, i colpi del metronomo già programmati si staccano.
function mixKill(){clearInterval(MIX.timer);cancelAnimationFrame(MIX.raf);const now=actx?.currentTime||0;
 for(const x of MIX.srcs){if(x.click){x.g.disconnect();continue}try{x.g.gain.cancelScheduledValues(now);x.g.gain.setValueAtTime(x.g.gain.value,now);x.g.gain.linearRampToValueAtTime(0,now+EDGE_FADE);x.s.stop(now+EDGE_FADE)}catch(e){}}
 MIX.srcs=[];MIX.passes=[];MIX.playing=false}
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
function mixTick(){if(!MIX.playing)return;const pos=mixPos();placeArPlayhead(pos);$('aClock').textContent=fmtTime(pos);if(prefs.follow)followAr(pos);
 if(MIX.analyser){MIX.analyser.getFloatTimeDomainData(meterBuf);let pk=0;for(const x of meterBuf)pk=Math.max(pk,Math.abs(x));drawMeter($('aMeter'),toDb(pk))}
 MIX.raf=requestAnimationFrame(mixTick)}
function playUIProject(on){const b=$('aPlay');b.setAttribute('aria-label',on?'Pausa del brano':'Riproduci il brano');b.innerHTML=ICON(on?'pause':'play')}
function songPlayPause(){if(MIX.playing){mixStop(true);announce('Pausa a '+sayTime(P.t,1));return}if(!P.regions.length&&!P.metro){toast('Il progetto è vuoto: registra o importa un file');return}let from=P.t;if(from>=projDur()-0.01&&!P.metro)from=0;mixPlay(from)}
function songStop(){const o=MIX.playing?MIX.origin:0;mixStop(false);P.t=o;updateArrangeUI();announce('Fermo, indicatore a '+sayTime(o))}
// Mixaggio fuori linea: tutto il brano, oppure una sola traccia (only) con la sua sola catena, per esportarla da sola.
// Si mixano 6 o 12 ms in più e si tolgono all'inizio: è il ritardo di limitatore e compressori.
async function renderMix({only=null,from=0,to=null,rate=48000}={}){to??=projDur();if(to<=from)throw Error('Il progetto è vuoto');const tracks=only?P.tracks.filter(t=>t.id===only):P.tracks,n=Math.max(1,Math.ceil((to-from)*rate)),skip=Math.round(mixLatency(tracks)*rate);
 const oc=new OfflineAudioContext(2,n+skip,rate),gr=syncGraph(newGraph(oc,oc.destination),tracks,{only});scheduleRegions(oc,gr,from,0,{end:to});const out=await oc.startRendering(),res=new AudioBuffer({length:n,numberOfChannels:2,sampleRate:rate});
 for(let c=0;c<2;c++)res.copyToChannel(out.getChannelData(c).subarray(skip,skip+n),c);return res}
// I marcatori delle regioni diventano marcatori del brano, nella posizione in cui suonano.
function songMarkers(rate){const out=[];for(const r of P.regions){const sr=SOURCES.get(r.src)?.sampleRate||rate;for(const m of r.markers||[]){const x=m.pos/sr;if(x<0||x>r.dur)continue;out.push({id:m.id,pos:Math.round((r.start+x)*rate),label:m.label})}}return out.sort((a,b)=>a.pos-b.pos)}
async function exportStems(){if(!P.regions.length){toast('Il progetto è vuoto');return}const [aac,opus]=await Promise.all([codecSupported('aac'),codecSupported('opus')]);
 const r=await modal('Esporta le tracce separate',`<p>Un file per ogni traccia, con i suoi effetti e lo stesso inizio, raccolti in un archivio ZIP: servono per continuare il lavoro in un altro programma.</p>`,[{id:'fmt',label:'Formato',type:'select',value:'wav24',options:[['wav16','WAV 16 bit'],['wav24','WAV 24 bit'],['wav32','WAV 32 bit in virgola mobile'],...(aac?[['aac','M4A con AAC']]:[]),...(opus?[['opus','WebM con Opus']]:[])]}],'Esporta');if(!r)return;
 const files=await work('Esportazione delle tracce',async()=>{const out=[];for(const [i,t] of P.tracks.entries()){if(!P.regions.some(x=>x.track===t.id))continue;status(`Mixaggio della traccia ${i+1} di ${P.tracks.length}: ${t.name}`);const buf=await renderMix({only:t.id});out.push({name:extName(`${String(i+1).padStart(2,'0')} ${t.name}`,r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext),data:r.fmt.startsWith('wav')?wavBlob(buf,Number(r.fmt.slice(3))):await compressedBlob(buf,r.fmt,(prefs.kbps||160)*1000)})}return out});
 if(!files?.length)return;const zip=await work('Creazione dell’archivio',()=>zipBlob(files));if(zip){download(zip,extName(P.title+' - tracce','zip'));toast(`Esportate ${files.length} tracce in un archivio ZIP`)}}
