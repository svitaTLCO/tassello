// Motore del progetto multitraccia. Ogni traccia ha una catena di nodi audio: bassi e alti, compressione,
// bilanciamento, volume (con muto e solo) e una mandata al riverbero comune; ogni regione è una sorgente programmata
// con il suo guadagno e le sue dissolvenze. La stessa catena suona in tempo reale e, fuori linea, produce il mix.
const MIX={playing:false,from:0,c0:0,origin:0,raf:0,nodes:null,srcs:[],analyser:null,out:null,metroK:0,recording:false};
const trackLive=t=>{const solo=P.tracks.some(x=>x.solo);return t.mute||(solo&&!t.solo)?0:fromDb(t.vol)};
// Riverbero: risposta all'impulso generata (rumore che si spegne in 2,4 secondi), una per contesto audio.
const IR=new WeakMap();
function impulse(ctx){let b=IR.get(ctx);if(b)return b;const n=Math.round(ctx.sampleRate*2.4);b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3.5)}IR.set(ctx,b);return b}
function setTrackNodes(t,n,{only=null,ctx=null}={}){const set=(p,v)=>ctx?p.setTargetAtTime(v,ctx.currentTime,0.02):p.value=v,c=t.comp/100;
 set(n.low.gain,t.low);set(n.high.gain,t.high);set(n.comp.threshold,-10-26*c);set(n.comp.ratio,1+7*c);set(n.make.gain,fromDb(9*c));set(n.pan.pan,t.pan);set(n.vol.gain,only?(only===t.id?fromDb(t.vol):0):trackLive(t));set(n.send.gain,t.reverb/100*0.6)}
function buildMix(ctx,dest,{only=null}={}){const master=ctx.createGain(),lim=ctx.createDynamicsCompressor();lim.threshold.value=-1.5;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=0.002;lim.release.value=0.12;master.connect(lim);lim.connect(dest);
 const rev=ctx.createConvolver();rev.buffer=impulse(ctx);rev.connect(master);const tracks=new Map();
 for(const t of P.tracks){const n={input:ctx.createGain(),low:ctx.createBiquadFilter(),high:ctx.createBiquadFilter(),comp:ctx.createDynamicsCompressor(),make:ctx.createGain(),pan:ctx.createStereoPanner(),vol:ctx.createGain(),send:ctx.createGain()};
  n.low.type='lowshelf';n.low.frequency.value=200;n.high.type='highshelf';n.high.frequency.value=4000;n.comp.knee.value=6;n.comp.attack.value=0.006;n.comp.release.value=0.18;
  n.input.connect(n.low);n.low.connect(n.high);n.high.connect(n.comp);n.comp.connect(n.make);n.make.connect(n.pan);n.pan.connect(n.vol);n.vol.connect(master);n.vol.connect(n.send);n.send.connect(rev);setTrackNodes(t,n,{only});tracks.set(t.id,n)}
 return{master,lim,rev,tracks}}
// Regioni dal tempo from in poi, a partire dall'istante when del contesto; end limita il mixaggio di un tratto.
function regionGainAt(r,x){let v=fromDb(r.gain);if(r.fadeIn>0)v*=clamp(x/r.fadeIn,0,1);if(r.fadeOut>0)v*=clamp((r.dur-x)/r.fadeOut,0,1);return v}
function scheduleRegions(ctx,mix,from,when,{end=Infinity}={}){const out=[];for(const r of P.regions){if(regionEnd(r)<=from+1e-6||r.start>=end)continue;const buf=SOURCES.get(r.src),tn=mix.tracks.get(r.track);if(!buf||!tn)continue;
  const t=Math.max(from,r.start),into=t-r.start,len=Math.min(r.dur-into,end-t);if(len<=1e-4)continue;const s=ctx.createBufferSource(),g=ctx.createGain(),at=when+(t-from);s.buffer=buf;
  g.gain.setValueAtTime(regionGainAt(r,into),at);if(r.fadeIn>into)g.gain.linearRampToValueAtTime(regionGainAt(r,r.fadeIn),at+(r.fadeIn-into));if(r.fadeOut>0){const fs=Math.max(into,r.dur-r.fadeOut);g.gain.setValueAtTime(regionGainAt(r,fs),at+(fs-into));g.gain.linearRampToValueAtTime(0,at+(r.dur-into))}
  s.connect(g);g.connect(tn.input);s.start(at,r.off+into,len);out.push(s)}return out}
// Metronomo: un colpo per tempo, più acuto sul primo della battuta.
function clickAt(ctx,dest,t,accent){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=accent?1600:1000;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(accent?0.55:0.38,t+0.002);g.gain.exponentialRampToValueAtTime(0.001,t+0.06);o.connect(g);g.connect(dest);o.start(t);o.stop(t+0.07)}
async function countIn(){const ctx=actxGet(),out=mixOut(),t0=ctx.currentTime+0.08;for(let k=0;k<P.sig;k++)clickAt(ctx,out,t0+k*beatDur(),k===0);announce('Conteggio di una battuta');await new Promise(r=>setTimeout(r,(P.sig*beatDur()+0.08)*1000-30))}
function mixOut(){const ctx=actxGet();if(!MIX.out){MIX.out=ctx.createGain();MIX.analyser=ctx.createAnalyser();MIX.analyser.fftSize=2048;MIX.out.connect(MIX.analyser);MIX.analyser.connect(ctx.destination)}return MIX.out}
const mixPos=()=>MIX.playing&&actx?MIX.from+Math.max(0,actx.currentTime-MIX.c0):P.t;
function mixKill(){cancelAnimationFrame(MIX.raf);for(const s of MIX.srcs){try{s.stop()}catch(e){}}MIX.srcs=[];if(MIX.nodes){try{MIX.nodes.lim.disconnect()}catch(e){}MIX.nodes=null}MIX.playing=false}
function mixPlay(from=P.t,{recording=false,origin=from}={}){mixKill();stopPlayback(false);const ctx=actxGet(),out=mixOut();MIX.nodes=buildMix(ctx,out);const when=ctx.currentTime+0.06;MIX.srcs=scheduleRegions(ctx,MIX.nodes,from,when);
 Object.assign(MIX,{playing:true,from,c0:when,origin,recording,metroK:Math.ceil(from/beatDur()-1e-6)});P.t=from;playUIProject(true);MIX.raf=requestAnimationFrame(mixTick)}
function mixStop(keep=true){if(!MIX.playing)return;const pos=mixPos();mixKill();if(keep)P.t=pos;playUIProject(false);drawMeter($('aMeter'),-Infinity);updateArrangeUI()}
function mixRestart(){if(!MIX.playing)return;mixPlay(mixPos(),{recording:MIX.recording,origin:MIX.origin})}
function mixLive(){if(!MIX.playing||!MIX.nodes)return;if(P.tracks.some(t=>!MIX.nodes.tracks.has(t.id))){mixRestart();return}for(const t of P.tracks)setTrackNodes(t,MIX.nodes.tracks.get(t.id),{ctx:actx})}
function mixTick(){if(!MIX.playing)return;const pos=mixPos(),cy=P.cycle;
 if(cy.on&&cy.b>cy.a+0.05&&!MIX.recording&&pos>=cy.b){mixPlay(cy.a,{origin:MIX.origin});return}
 if(!MIX.recording&&!P.metro&&pos>=projDur()+0.05){const o=MIX.origin;mixKill();P.t=o;playUIProject(false);drawMeter($('aMeter'),-Infinity);updateArrangeUI();announce('Fine del brano');return}
 if(P.metro||MIX.recording&&P.metro){const ctx=actx;while(MIX.metroK*beatDur()<pos+0.3){const tb=MIX.metroK*beatDur();if(tb>=MIX.from-1e-6)clickAt(ctx,mixOut(),MIX.c0+(tb-MIX.from),MIX.metroK%P.sig===0);MIX.metroK++}}
 placeArPlayhead(pos);$('aClock').textContent=fmtTime(pos);if(prefs.follow)followAr(pos);
 if(MIX.analyser){MIX.analyser.getFloatTimeDomainData(meterBuf);let pk=0;for(const x of meterBuf)pk=Math.max(pk,Math.abs(x));drawMeter($('aMeter'),toDb(pk))}
 MIX.raf=requestAnimationFrame(mixTick)}
function playUIProject(on){const b=$('aPlay');b.setAttribute('aria-label',on?'Pausa del brano':'Riproduci il brano');b.innerHTML=ICON(on?'pause':'play')}
function songPlayPause(){if(MIX.playing){mixStop(true);announce('Pausa a '+sayTime(P.t,1));return}if(!P.regions.length&&!P.metro){toast('Il progetto è vuoto: registra o importa un file');return}let from=P.t;if(from>=projDur()-0.01&&!P.metro)from=0;mixPlay(from)}
function songStop(){const o=MIX.playing?MIX.origin:0;mixStop(false);P.t=o;updateArrangeUI();announce('Fermo, indicatore a '+sayTime(o))}
// Mixaggio fuori linea: tutto il brano, oppure una sola traccia (only) per esportarla da sola.
async function renderMix({only=null,from=0,to=null,rate=48000}={}){to??=projDur();if(to<=from)throw Error('Il progetto è vuoto');const oc=new OfflineAudioContext(2,Math.max(1,Math.ceil((to-from)*rate)),rate),mix=buildMix(oc,oc.destination,{only});scheduleRegions(oc,mix,from,0,{end:to});return oc.startRendering()}
// I marcatori delle regioni diventano marcatori del brano, nella posizione in cui suonano.
function songMarkers(rate){const out=[];for(const r of P.regions){const sr=SOURCES.get(r.src)?.sampleRate||rate;for(const m of r.markers||[]){const x=m.pos/sr;if(x<0||x>r.dur)continue;out.push({id:m.id,pos:Math.round((r.start+x)*rate),label:m.label})}}return out.sort((a,b)=>a.pos-b.pos)}
async function exportStems(){if(!P.regions.length){toast('Il progetto è vuoto');return}const [aac,opus]=await Promise.all([codecSupported('aac'),codecSupported('opus')]);
 const r=await modal('Esporta le tracce separate',`<p>Un file per ogni traccia, con i suoi effetti e lo stesso inizio, raccolti in un archivio ZIP: servono per continuare il lavoro in un altro programma.</p>`,[{id:'fmt',label:'Formato',type:'select',value:'wav24',options:[['wav16','WAV 16 bit'],['wav24','WAV 24 bit'],['wav32','WAV 32 bit in virgola mobile'],...(aac?[['aac','M4A con AAC']]:[]),...(opus?[['opus','WebM con Opus']]:[])]}],'Esporta');if(!r)return;
 const files=await work('Esportazione delle tracce',async()=>{const out=[];for(const [i,t] of P.tracks.entries()){if(!P.regions.some(x=>x.track===t.id))continue;status(`Mixaggio della traccia ${i+1} di ${P.tracks.length}: ${t.name}`);const buf=await renderMix({only:t.id});out.push({name:extName(`${String(i+1).padStart(2,'0')} ${t.name}`,r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext),data:r.fmt.startsWith('wav')?wavBlob(buf,Number(r.fmt.slice(3))):await compressedBlob(buf,r.fmt,(prefs.kbps||160)*1000)})}return out});
 if(!files?.length)return;const zip=await work('Creazione dell’archivio',()=>zipBlob(files));if(zip){download(zip,extName(P.title+' - tracce','zip'));toast(`Esportate ${files.length} tracce in un archivio ZIP`)}}
