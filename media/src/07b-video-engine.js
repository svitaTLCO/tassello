// Motore del video. Un compositore disegna su un canvas l'istante t del montaggio: clip con filtri, rotazione,
// dissolvenze e transizioni, cartelli, titoli e sottotitoli. Durante la riproduzione un piccolo gruppo di elementi
// <video> e <audio> nascosti segue l'orologio; l'audio passa dal motore audio del browser, così volume e
// dissolvenze si regolano in tempo reale. L'esportazione registra il canvas e l'audio mentre il montaggio scorre.
const view=$('viewCanvas'),vg=view.getContext('2d',{alpha:false});
function resizeCanvas(){if(view.width!==V.p.w||view.height!==V.p.h){view.width=V.p.w;view.height=V.p.h}requestFrame()}
const VE={playing:false,t0:0,c0:0,rate:1,raf:0,frame:0,bound:new Map(),stalled:false,suspended:false,exp:null};
const SLOTS=[];let vMasterNode=null,vAnalyser=null;
// Uscita del montaggio: un limitatore evita che clip e musica sommate superino il fondo scala e distorcano.
function vMaster(){if(!vMasterNode){const ctx=actxGet(),lim=ctx.createDynamicsCompressor();lim.threshold.value=-2;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=0.002;lim.release.value=0.12;vMasterNode=ctx.createGain();vAnalyser=ctx.createAnalyser();vAnalyser.fftSize=2048;vMasterNode.connect(lim);lim.connect(vAnalyser);vAnalyser.connect(ctx.destination);vMasterNode.limiter=lim}return vMasterNode}
function makeSlot(kind){const el=document.createElement(kind);el.preload='auto';el.playsInline=true;el.preservesPitch=true;const ctx=actxGet(),gain=ctx.createGain();gain.gain.value=0;ctx.createMediaElementSource(el).connect(gain);gain.connect(vMaster());const s={el,gain,kind,key:null,url:null,used:-9};el.addEventListener('error',()=>{s.url=null});SLOTS.push(s);return s}
function slotFor(key,url,kind){const f=VE.frame;let s=SLOTS.find(x=>x.key===key&&x.kind===kind&&x.url===url);if(!s){const free=SLOTS.filter(x=>x.kind===kind&&x.used<f);s=free.find(x=>x.url===url)||free[0]||(SLOTS.filter(x=>x.kind===kind).length<6?makeSlot(kind):null);if(!s)return null;s.key=key;if(s.url!==url){s.el.src=url;s.url=url}}s.used=f;return s}
// Volume di una clip all'istante t: volume, dissolvenze e transizioni con la clip vicina.
function clipGain(s,t){const c=s.c;if(c.mute)return 0;let g=c.volume;if(c.fadeIn>0)g*=clamp((t-s.start)/c.fadeIn,0,1);if(c.fadeOut>0)g*=clamp((s.end-t)/c.fadeOut,0,1);const next=layout()[s.i+1];
 if(s.tr>0){if(overlaps(c)&&t<s.start+s.tr)g*=(t-s.start)/s.tr;else if(c.trans.type==='black'&&t<s.start+s.tr/2)g*=(t-s.start)/(s.tr/2)}
 if(next&&next.tr>0){if(overlaps(next.c)&&t>next.start&&s.end>next.start)g*=clamp((s.end-t)/(s.end-next.start),0,1);else if(next.c.trans.type==='black'&&t>s.end-next.tr/2)g*=clamp((s.end-t)/(next.tr/2),0,1)}return clamp(g,0,2)}
function audioItemGain(a,t){let g=a.volume;const end=a.start+(a.out-a.in);if(a.fadeIn>0)g*=clamp((t-a.start)/a.fadeIn,0,1);if(a.fadeOut>0)g*=clamp((end-t)/a.fadeOut,0,1);return clamp(g,0,2)}
// Opacità e tendina della clip: dissolvenze dal colore di sfondo e transizioni.
function clipLook(s,t){const c=s.c,next=layout()[s.i+1];let a=1,wipe=null;if(c.fadeIn>0)a*=clamp((t-s.start)/c.fadeIn,0,1);if(c.fadeOut>0)a*=clamp((s.end-t)/c.fadeOut,0,1);
 if(s.tr>0){const type=c.trans.type;if(type==='dissolve'&&t<s.start+s.tr)a*=(t-s.start)/s.tr;else if(type==='wipe'&&t<s.start+s.tr)wipe=(t-s.start)/s.tr;else if(type==='black'&&t<s.start+s.tr/2)a*=(t-s.start)/(s.tr/2)}
 if(next&&next.c.trans.type==='black'&&next.tr>0&&t>s.end-next.tr/2)a*=clamp((s.end-t)/(next.tr/2),0,1);return{a:clamp(a,0,1),wipe}}
// Quali elementi servono all'istante t: le clip attive e quelle che iniziano entro un secondo e mezzo (precaricate).
function syncMedia(t,playing){VE.frame++;VE.bound.clear();const want=[];
 for(const s of layout()){if(s.c.kind!=='media')continue;const m=mediaMeta(s.c.media),rt=MEDIA.get(s.c.media);if(!m||!rt||m.type==='image')continue;const active=t>=s.start&&t<s.end,soon=playing&&s.start>t&&s.start-t<1.5;if(!active&&!soon)continue;
  want.push({key:s.c.id,url:rt.url,kind:m.type==='audio'?'audio':'video',expected:active?srcTime(s,t):s.c.in,rate:s.c.speed||1,gain:active?clipGain(s,t):0,active,s})}
 for(const a of V.p.audio){const m=mediaMeta(a.media),rt=MEDIA.get(a.media);if(!m||!rt)continue;const end=a.start+(a.out-a.in),active=t>=a.start&&t<end,soon=playing&&a.start>t&&a.start-t<1.5;if(!active&&!soon)continue;want.push({key:a.id,url:rt.url,kind:m.type==='video'?'video':'audio',expected:active?a.in+(t-a.start):a.in,rate:1,gain:active?audioItemGain(a,t):0,active})}
 want.sort((x,y)=>y.active-x.active);for(const w of want){w.slot=slotFor(w.key,w.url,w.kind);if(w.slot&&w.s&&w.kind==='video')VE.bound.set(w.key,w.slot)}
 for(const s of SLOTS)if(s.used!==VE.frame){if(!s.el.paused)s.el.pause();s.gain.gain.value=0}return want}
// Disegno di un istante.
const FONT_STACK={sans:'"Segoe UI",system-ui,Arial,sans-serif',serif:'Georgia,"Times New Roman",serif'};
function wrapLines(g,text,maxW){const out=[];for(const para of String(text||'').split('\n')){let line='';for(const w of para.split(/\s+/).filter(Boolean)){const tryL=line?line+' '+w:w;if(g.measureText(tryL).width>maxW&&line){out.push(line);line=w}else line=tryL}out.push(line)}return out}
function drawText(g,text,{color='#ffffff',size=7,pos='lower',box='dark',bold=true,font='sans',alpha=1}){if(!String(text||'').trim())return;const W=V.p.w,H=V.p.h,fs=Math.max(8,Math.round(H*size/100)),lh=Math.round(fs*1.25),pad=Math.round(fs*0.45);
 g.save();g.globalAlpha=alpha;g.filter='none';g.font=`${bold?'700 ':''}${fs}px ${FONT_STACK[font]||FONT_STACK.sans}`;g.textAlign='center';g.textBaseline='top';const lines=wrapLines(g,text,W*0.84),tw=Math.max(...lines.map(l=>g.measureText(l).width)),bh=lines.length*lh;
 const y=pos==='top'?H*0.07:pos==='center'?(H-bh)/2:pos==='lower'?H*0.72-bh/2:H*0.93-bh;
 if(box!=='none'){g.fillStyle=box==='light'?'rgba(245,245,245,.88)':'rgba(0,0,0,.72)';const bw=tw+pad*2;g.beginPath();g.roundRect?g.roundRect((W-bw)/2,y-pad*0.6,bw,bh+pad*1.2,pad*0.6):g.rect((W-bw)/2,y-pad*0.6,bw,bh+pad*1.2);g.fill()}else{g.shadowColor='rgba(0,0,0,.85)';g.shadowBlur=fs*0.18;g.shadowOffsetY=fs*0.05}
 g.fillStyle=color;lines.forEach((l,i)=>g.fillText(l,W/2,y+i*lh));g.restore()}
function filterOf(c){const blur=Math.round((c.blur||4)*V.p.w/1280);return [c.bright!==100&&`brightness(${c.bright}%)`,c.contrast!==100&&`contrast(${c.contrast}%)`,c.sat!==100&&`saturate(${c.sat}%)`,(FILTERS[c.filter]?.[1]||'').replace('var',blur+'px')].filter(Boolean).join(' ')||'none'}
function drawClip(g,s,t){const c=s.c,W=V.p.w,H=V.p.h,{a,wipe}=clipLook(s,t);if(a<=0)return;g.save();g.globalAlpha=a;if(wipe!==null){g.beginPath();g.rect(0,0,W*wipe,H);g.clip()}
 if(c.kind==='card'){g.fillStyle=c.color||'#2457c5';g.fillRect(0,0,W,H);g.restore();drawText(g,c.text,{color:c.textColor||'#ffffff',size:8,pos:'center',box:'none',alpha:a});return}
 const m=mediaMeta(c.media),rt=MEDIA.get(c.media);let src=null,sw=0,sh=0;if(m?.type==='image'){src=rt?.bitmap;sw=m.w;sh=m.h}else{const slot=VE.bound.get(c.id);if(slot&&slot.el.readyState>=2){src=slot.el;sw=slot.el.videoWidth;sh=slot.el.videoHeight}}
 if(!rt){g.restore();drawText(g,'File mancante: '+(m?.name||''),{size:4,pos:'center',box:'dark'});return}
 if(!src||!sw){g.restore();return}
 const rot=((c.rotate||0)%360+360)%360,side=rot===90||rot===270,rw=side?sh:sw,rh=side?sw:sh,k=c.fit==='cover'?Math.max(W/rw,H/rh):Math.min(W/rw,H/rh);
 g.filter=filterOf(c);g.translate(W/2,H/2);if(rot)g.rotate(rot*Math.PI/180);if(c.flip)g.scale(-1,1);g.drawImage(src,-sw*k/2,-sh*k/2,sw*k,sh*k);g.restore()}
function titleAlpha(x,t){let a=1;if(x.fadeIn>0)a*=clamp((t-x.start)/x.fadeIn,0,1);if(x.fadeOut>0)a*=clamp((x.start+x.dur-t)/x.fadeOut,0,1);return a}
function drawFrame(g,t,{subs=prefs.showSubs}={}){const W=V.p.w,H=V.p.h;g.save();g.globalAlpha=1;g.filter='none';g.fillStyle=V.p.bg;g.fillRect(0,0,W,H);g.restore();
 for(const s of layout())if(t>=s.start&&t<s.end)drawClip(g,s,t);
 for(const x of V.p.titles)if(t>=x.start&&t<x.start+x.dur)drawText(g,x.text,{...x,alpha:titleAlpha(x,t)});
 if(subs)for(const x of V.p.subs)if(t>=x.start&&t<x.end)drawText(g,x.text,{color:'#ffffff',size:5,pos:'bottom',box:'dark',bold:false})}
// Riproduzione. L'orologio si ferma se un file non è ancora pronto, così audio e video restano allineati.
const nowT=()=>VE.playing&&!VE.stalled&&!VE.suspended?VE.t0+(performance.now()-VE.c0)/1000*VE.rate:V.t;
function vPlay(){if(VE.playing)return;const T=totalDur();if(T<=0){toast('La linea temporale è vuota: importa dei file e aggiungili');return}if(V.t>=T-frameDur())V.t=0;actxGet();vMaster();Object.assign(VE,{playing:true,t0:V.t,c0:performance.now(),stalled:false,origin:V.t});vPlayUI(true);cancelAnimationFrame(VE.raf);VE.raf=requestAnimationFrame(vTick)}
function vStop(){if(!VE.playing)return;V.t=clamp(nowT(),0,totalDur());VE.playing=false;VE.rate=1;cancelAnimationFrame(VE.raf);for(const s of SLOTS){s.el.pause();s.gain.gain.value=0}vPlayUI(false);drawMeter($('vMeter'),-Infinity);updateVideoUI();requestFrame()}
function vPlayPause(){if(VE.playing){vStop();announce('Pausa a '+sayTime(V.t,1))}else vPlay()}
function vTick(){if(!VE.playing)return;let t=nowT();const T=totalDur();if(t>=T){V.t=T;if(VE.exp){drawFrame(vg,T-1e-3,{subs:VE.exp.burn});VE.exp.finish?.('end')}vStop();if(!VE.exp)announce('Fine del montaggio');return}
 const want=syncMedia(t,true),ctx=actxGet();let stalled=false;
 for(const w of want){if(!w.slot)continue;const el=w.slot.el;if(w.active){const rate=w.rate*VE.rate;if(Math.abs(el.playbackRate-rate)>1e-3)el.playbackRate=rate;const dur=el.duration||Infinity,drift=el.currentTime-w.expected;
   if(el.readyState<3||el.seeking){stalled=true;if(Math.abs(drift)>0.3&&!el.seeking)el.currentTime=w.expected}
   else if(el.paused){if(w.expected<dur-0.05){if(Math.abs(drift)>0.04)el.currentTime=w.expected;else el.play().catch(()=>{})}}
   else if(Math.abs(drift)>0.25)el.currentTime=w.expected;
   w.slot.gain.gain.setTargetAtTime(w.gain*(VE.rate>1.01?0.6:1),ctx.currentTime,0.015)}
  else{if(!el.paused)el.pause();w.slot.gain.gain.value=0;if(!el.seeking&&Math.abs(el.currentTime-w.expected)>0.05)el.currentTime=w.expected}}
 if(stalled!==VE.stalled){if(stalled){VE.t0=t;VE.stalled=true;for(const w of want)if(w.active&&w.slot&&!w.slot.el.paused&&w.slot.el.readyState>=3)w.slot.el.pause();if(VE.exp?.rec.state==='recording')VE.exp.rec.pause()}else{VE.stalled=false;VE.c0=performance.now();VE.t0=t;if(VE.exp?.rec.state==='paused')VE.exp.rec.resume()}}
 if(!VE.stalled){drawFrame(vg,t,VE.exp?{subs:VE.exp.burn}:undefined);if(VE.exp)expFrame(t);V.t=t;tickTimelineUI(t)}
 if(vAnalyser){vAnalyser.getFloatTimeDomainData(meterBuf);let pk=0;for(const x of meterBuf)pk=Math.max(pk,Math.abs(x));drawMeter($('vMeter'),toDb(pk))}
 VE.raf=requestAnimationFrame(vTick)}
function vPlayUI(on){const b=$('vPlay');b.setAttribute('aria-label',on?'Pausa':'Riproduci');b.innerHTML=ICON(on?'pause':'play')}
// Con la scheda nascosta il browser rallenta il disegno: riproduzione ed esportazione si sospendono e riprendono da sole.
document.addEventListener('visibilitychange',()=>{if(!VE.playing)return;if(document.hidden){VE.t0=nowT();VE.suspended=true;for(const s of SLOTS)s.el.pause();if(VE.exp?.rec.state==='recording')VE.exp.rec.pause()}else{VE.suspended=false;VE.c0=performance.now();if(VE.exp&&!VE.stalled&&VE.exp.rec.state==='paused')VE.exp.rec.resume();if(VE.exp)announce('Esportazione ripresa')}});
// Fotogramma da fermo: si portano gli elementi al punto giusto e si disegna quando sono pronti.
let frameToken=0,frameReq=false;
function requestFrame(){if(VE.playing||frameReq)return;frameReq=true;requestAnimationFrame(()=>{frameReq=false;showFrame(V.t)})}
// Una ricerca alla volta per elemento: se ne arriva un'altra mentre il video cerca ancora (trascinando l'indicatore),
// si tiene solo l'ultima posizione e la si chiede appena la prima è pronta. Così l'immagine si aggiorna mentre ci si
// muove, invece di restare ferma finché non ci si ferma.
function seekEl(el,time){el._want=time;if(el._seek)return el._seek;const near=x=>Math.abs(el.currentTime-x)<0.5/V.p.fps;
 const p=el._seek=(async()=>{if(el.readyState<1)await once(el,'loadedmetadata',6000).catch(()=>{});const t=el._want;if(!(near(t)&&el.readyState>=2)){el.currentTime=t;await once(el,'seeked',6000).catch(()=>{})}})();
 p.finally(()=>{if(el._seek===p)el._seek=null;if(!near(el._want))requestFrame()});return p}
async function showFrame(t){if(isAudio())return;const tok=++frameToken,want=syncMedia(t,false);await Promise.all(want.filter(w=>w.active&&w.slot).map(w=>{const el=w.slot.el;el.pause();w.slot.gain.gain.value=0;return seekEl(el,w.expected)}));if(tok!==frameToken||VE.playing)return;drawFrame(vg,t);updateVideoUI()}
// Esportazione in tempo reale: MediaRecorder registra il canvas e l'audio del montaggio.
function recorderTypes(){if(typeof MediaRecorder==='undefined')return[];const list=[['video/mp4;codecs=avc1.640028,mp4a.40.2','mp4','MP4 (H.264 e AAC): si apre su tutti i dispositivi'],['video/mp4;codecs=avc1.42E01F,mp4a.40.2','mp4','MP4 (H.264 e AAC): si apre su tutti i dispositivi'],['video/mp4','mp4','MP4'],['video/webm;codecs=vp9,opus','webm','WebM (VP9 e Opus): leggero, per il web'],['video/webm;codecs=vp8,opus','webm','WebM (VP8 e Opus)'],['video/webm','webm','WebM']],seen=new Set();return list.filter(([m,ext])=>{if(seen.has(ext)||!MediaRecorder.isTypeSupported(m))return false;seen.add(ext);return true})}
async function exportVideoDialog(){const T=totalDur();if(T<=0){toast('La linea temporale è vuota');return}const types=recorderTypes();if(!types.length||!view.captureStream){toast('Questo browser non sa registrare video: usa Chrome o Edge recenti');return}
 const missing=V.p.main.filter(c=>c.kind==='media'&&!MEDIA.get(c.media)).length;if(missing){toast(`Mancano i file di ${missing} clip: importali di nuovo prima di esportare`);return}
 const px=V.p.w*V.p.h,q=px>=3840*2160*0.9?[20,35,50]:px>=1920*1080*0.9?[6,10,16]:[3,5,8];
 const r=await modal('Esporta il video',`<p>Formato ${V.p.w} × ${V.p.h} a ${V.p.fps} fotogrammi al secondo, durata ${esc(sayTime(T))}. L’esportazione avviene mentre il montaggio scorre, quindi dura circa ${esc(sayTime(T))}: tieni questa scheda in primo piano (se la nascondi, l’esportazione si mette in pausa).</p>`,[{id:'fmt',label:'Formato',type:'select',value:types.some(x=>x[1]===prefs.videoFormat)?prefs.videoFormat:types[0][1],options:types.map(x=>[x[1],x[2]])},{id:'q',label:'Qualità',type:'select',value:String(q[1]),options:[[String(q[0]),`Leggera (${q[0]} Mbit/s)`],[String(q[1]),`Buona (${q[1]} Mbit/s)`],[String(q[2]),`Alta (${q[2]} Mbit/s)`]]},{id:'burn',label:'Imprimi i sottotitoli nel video',type:'checkbox',value:V.p.burnSubs,hint:'Così si vedono ovunque, ma non si possono spegnere.'},...(V.p.subs.length?[{id:'srt',label:'Scarica anche i sottotitoli in un file SRT separato',type:'checkbox',value:true}]:[]),{id:'name',label:'Nome del file',value:V.p.title}],'Esporta');
 if(!r)return;prefs.videoFormat=r.fmt;savePrefs();const type=types.find(x=>x[1]===r.fmt);await runExport({mime:type[0],ext:type[1],bps:Number(r.q)*1e6,burn:r.burn,srt:r.srt,name:r.name||V.p.title})}
async function runExport({mime,ext,bps,burn,srt,name}){vStop();const T=totalDur(),ctx=actxGet();await ctx.resume();const stream=view.captureStream(V.p.fps),dest=ctx.createMediaStreamDestination();vMaster().limiter.connect(dest);
 const rec=new MediaRecorder(new MediaStream([...stream.getVideoTracks(),...dest.stream.getAudioTracks()]),{mimeType:mime,videoBitsPerSecond:bps,audioBitsPerSecond:192000}),chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 let finish;const done=new Promise(res=>{finish=res});VE.exp={rec,burn,T,lum:[],finish,lastPct:-1,step:-1,completed:false,close:null};
 modal('Esportazione del video',`<p>Il montaggio scorre nell’anteprima mentre viene registrato. Puoi annullare in qualsiasi momento.</p><div class="progress" id="expBar" role="progressbar" aria-label="Avanzamento dell’esportazione" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div></div></div><p id="expText">Preparazione…</p>`,[],'Annulla l’esportazione',{noCancel:true,restore:false,onOpen:(pane,close)=>{VE.exp.close=close}}).then(()=>{if(VE.exp&&!VE.exp.completed)VE.exp.finish('cancel')});
 V.t=0;VE.frame++;await showFrame(0);rec.start(1000);announce('Esportazione avviata');vPlay();
 const outcome=await done,exp=VE.exp;exp.completed=true;vStop();await new Promise(r=>{rec.onstop=r;if(rec.state!=='inactive')rec.stop();else r()});try{vMaster().limiter.disconnect(dest)}catch(e){}stream.getTracks().forEach(t=>t.stop());exp.close?.(null);VE.exp=null;$('viewCanvas').focus();
 if(outcome==='cancel'){toast('Esportazione annullata');return}
 let blob=new Blob(chunks,{type:mime.split(';')[0]});if(ext==='webm')blob=await fixWebmDuration(blob,T*1000);const file=extName(name,ext);download(blob,file);if(srt&&V.p.subs.length)download(srtText(V.p.subs),extName(name,'srt'),'application/x-subrip');
 await lumDone(exp);const warn=flashWarnings(exp.lum.sort((x,y)=>x[0]-y[0]));V.p.flash={when:new Date().toISOString(),key:visualKey(),warnings:warn};schedulePersist('video');
 toast(`Video esportato: ${file} (${fmtBytes(blob.size)}).${warn.length?` Attenzione: possibili lampeggiamenti pericolosi a ${warn.slice(0,3).map(w=>fmtTime(w,0)).join(', ')}. Apri Verifica l’accessibilità.`:''}`)}
// Durante l'esportazione: avanzamento e misura della luminosità media di ogni fotogramma, per trovare i lampeggiamenti.
const lumCanvas=document.createElement('canvas');lumCanvas.width=32;lumCanvas.height=18;const lumG=lumCanvas.getContext('2d',{willReadFrequently:true});
const linear=v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4};
function frameLuminance(src){lumG.drawImage(src,0,0,32,18);const d=lumG.getImageData(0,0,32,18).data;let s=0;for(let i=0;i<d.length;i+=4)s+=0.2126*linear(d[i])+0.7152*linear(d[i+1])+0.0722*linear(d[i+2]);return s/(d.length/4)}
// Il fotogramma si riduce a 32 × 18 fuori dalla pagina (createImageBitmap): leggerlo intero bloccherebbe il disegno
// per circa 14 ms in 1080p e all'esportazione si perderebbero fotogrammi. Le misure arrivano poco dopo, in ordine di tempo.
function measureFrame(e,t){e.inflight=(e.inflight||0)+1;createImageBitmap(view,{resizeWidth:32,resizeHeight:18,resizeQuality:'medium'}).then(b=>{e.lum.push([t,frameLuminance(b)]);b.close()}).catch(()=>{}).finally(()=>{if(--e.inflight===0)e.idle?.()})}
const lumDone=e=>e.inflight?new Promise(r=>{e.idle=r}):Promise.resolve();
function expFrame(t){const e=VE.exp;measureFrame(e,t);const pct=Math.floor(t/e.T*100);if(pct!==e.lastPct){e.lastPct=pct;const bar=$('expBar');if(bar){bar.setAttribute('aria-valuenow',pct);bar.setAttribute('aria-valuetext',`${pct}%, ${sayTime(t)} di ${sayTime(e.T)}`);bar.firstChild.style.width=pct+'%';$('expText').textContent=`${pct}% · ${fmtTime(t,0)} di ${fmtTime(e.T,0)}`}const step=Math.floor(pct/10);if(step!==e.step&&step>0){e.step=step;announce(`Esportazione al ${step*10}%`)}}}
// Impronta di ciò che si vede: se cambia, l'analisi dei lampeggiamenti va rifatta.
function visualKey(){const s=JSON.stringify([V.p.main,V.p.titles,V.p.w,V.p.h,V.p.fps,V.p.bg,V.p.burnSubs&&V.p.subs]);let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)}
// Lampeggiamenti (WCAG 2.3.1): coppie di variazioni opposte di luminosità di almeno il 10%, più di tre in un secondo.
function flashWarnings(series){const ev=[];if(series.length<2)return[];let ext=series[0][1],trend=0;for(const [t,L] of series){if(trend>=0){if(L>ext)ext=L;else if(ext-L>=0.1&&Math.min(ext,L)<0.8){ev.push(t);trend=-1;ext=L}}else{if(L<ext)ext=L;else if(L-ext>=0.1&&Math.min(ext,L)<0.8){ev.push(t);trend=1;ext=L}}}
 const out=[];for(let i=0,j=0;i<ev.length;i++){while(ev[i]-ev[j]>1)j++;if(i-j+1>6&&(!out.length||ev[i]-out.at(-1)>2))out.push(ev[j])}return out}
// Analisi dei lampeggiamenti senza esportare: il montaggio scorre senza audio e si misura ogni fotogramma.
async function analyzeFlashes(){const T=totalDur();if(T<=0){toast('La linea temporale è vuota');return null}vStop();vMaster().gain.value=0;let finish;const done=new Promise(r=>{finish=r});
 VE.exp={rec:{state:'inactive',pause(){},resume(){}},burn:V.p.burnSubs,T,lum:[],finish,lastPct:-1,step:-1,completed:false,close:null};
 modal('Analisi dei lampeggiamenti',`<p>Il montaggio scorre senza audio e viene misurata la luminosità di ogni fotogramma. Dura circa ${esc(sayTime(T))}.</p><div class="progress" id="expBar" role="progressbar" aria-label="Avanzamento dell’analisi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div></div></div><p id="expText">Preparazione…</p>`,[],'Annulla',{noCancel:true,restore:false,onOpen:(p,close)=>{VE.exp.close=close}}).then(()=>{if(VE.exp&&!VE.exp.completed)VE.exp.finish('cancel')});
 V.t=0;await showFrame(0);vPlay();const outcome=await done,exp=VE.exp;exp.completed=true;vStop();exp.close?.(null);VE.exp=null;vMaster().gain.value=1;if(outcome==='cancel'){toast('Analisi annullata');return null}
 await lumDone(exp);const warn=flashWarnings(exp.lum.sort((x,y)=>x[0]-y[0]));V.p.flash={when:new Date().toISOString(),key:visualKey(),warnings:warn};schedulePersist('video');return warn}
// Solo audio: mixaggio fuori linea delle clip e della traccia audio, molto più veloce del tempo reale.
// Le clip accelerate o rallentate mantengono l'intonazione, come nell'anteprima.
const decoded=new Map();
async function decodedAudio(id){if(decoded.has(id))return decoded.get(id);const rt=MEDIA.get(id);let buf=null;if(rt){try{const r=await decodeAudioFile(rt.blob,{rate:48000});buf=r.buffer?await resampleBuffer(r.buffer,48000):null}catch(e){buf=null}}decoded.set(id,buf);return buf}
// L'audio decodificato dei file serve solo durante il mixaggio (un'ora di video occupa più di un GB): poi si libera.
async function mixdown(){try{return await mixAll()}finally{decoded.clear()}}
async function mixAll(){const rate=48000,T=totalDur(),n=Math.max(1,Math.ceil(T*rate)),L=new Float32Array(n),R=new Float32Array(n);
 const add=(buf,srcIn,srcOut,start,speed,gainAt)=>{const a=Math.floor(srcIn*rate),b=Math.min(buf.length,Math.ceil(srcOut*rate));if(b<=a)return;let ch=[0,1].map(c=>buf.getChannelData(Math.min(c,buf.numberOfChannels-1)).slice(a,b));if(Math.abs(speed-1)>1e-3)ch=wsola(ch,rate,speed);const off=Math.round(start*rate);
  for(let i=0;i<ch[0].length;i+=64){const g=gainAt(start+i/rate);for(let k=i;k<Math.min(i+64,ch[0].length);k++){const j=off+k;if(j>=n||j<0)continue;L[j]+=ch[0][k]*g;R[j]+=ch[1][k]*g}}};
 for(const s of layout()){if(s.c.kind!=='media'||s.c.mute)continue;const m=mediaMeta(s.c.media);if(!m||m.type==='image')continue;status('Mixaggio: '+m.name);const buf=await decodedAudio(m.id);if(buf)add(buf,s.c.in,s.c.out,s.start,s.c.speed||1,t=>clipGain(s,t))}
 for(const a of V.p.audio){const m=mediaMeta(a.media);status('Mixaggio: '+(m?.name||''));const buf=await decodedAudio(a.media);if(buf)add(buf,a.in,a.out,a.start,1,t=>audioItemGain(a,t))}
 // Se la somma supera il fondo scala si abbassa tutto il mixaggio fino a −1 dB, invece di distorcere.
 let pk=0;for(const d of [L,R])for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>pk)pk=v}if(pk>fromDb(-1)){const g=fromDb(-1)/pk;for(const d of [L,R])for(let i=0;i<d.length;i++)d[i]*=g;toast(`Il mixaggio superava il fondo scala: abbassato di ${fmtDb(toDb(g)).replace('−','')}`)}
 return makeBuffer([L,R],rate)}
async function exportMixDialog(){const T=totalDur();if(T<=0){toast('La linea temporale è vuota');return}const [aac,opus]=await Promise.all([codecSupported('aac'),codecSupported('opus')]);
 const r=await modal('Esporta solo l’audio',`<p>L’audio del montaggio (${esc(sayTime(T))}): clip, musica e voce fuori campo con volumi e dissolvenze. Puoi anche aprirlo nell’editor Audio per ripulirlo o normalizzarlo.</p>`,[{id:'dest',label:'Che cosa fare',type:'select',value:'file',options:[['file','Scaricarlo come file'],['audio','Metterlo in una nuova traccia di Audio']]},{id:'fmt',label:'Formato del file',type:'select',value:'wav16',options:[['wav16','WAV 16 bit'],['wav24','WAV 24 bit'],...(aac?[['aac','M4A con AAC']]:[]),...(opus?[['opus','WebM con Opus']]:[])]},{id:'name',label:'Nome del file',value:V.p.title+' (audio)'}],'Continua');if(!r)return;
 const buf=await work('Mixaggio dell’audio',mixdown);if(!buf)return;
 if(r.dest==='audio'){const reg=importBufferAsTrack(buf,r.name||V.p.title,{at:0});setMode('audio');selectRegion(reg,{focus:true});announce('Audio del montaggio in una nuova traccia di Audio: '+sayTime(buf.duration));return}
 const blob=await work('Esportazione',()=>r.fmt.startsWith('wav')?wavBlob(buf,Number(r.fmt.slice(3))):compressedBlob(buf,r.fmt,192000));if(!blob)return;const file=extName(r.name||V.p.title,r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext);download(blob,file);toast(`Esportato ${file} (${fmtBytes(blob.size)})`)}
async function exportFrame(){if(totalDur()<=0&&!V.p.media.length){toast('La linea temporale è vuota');return}vStop();await showFrame(V.t);drawFrame(vg,V.t,{subs:V.p.burnSubs});const blob=await new Promise(r=>view.toBlob(r,'image/png'));if(!blob){toast('Fotogramma non disponibile');return}const file=extName(`${V.p.title} ${fmtTime(V.t,1).replace(/[:,]/g,'.')}`,'png');download(blob,file);requestFrame();toast('Fotogramma esportato: '+file)}
