// Video detto a parole, senza intelligenza artificiale: si misurano i pixel e il suono. Il fotogramma descritto
// (Alt+Maiusc+D), la clip descritta (Alt+Maiusc+C) con scene, luce, colori e movimento, i cambi di scena (Ctrl+↑ ↓
// sull'indicatore), che cosa si sovrappone nel punto, e le pause del parlato (Ctrl+← →) come in Audio, che servono
// anche ad agganciare i sottotitoli al parlato.

// Nomi dei colori e delle zone: gli stessi di Tassello Grafica (colorName e placeName), copiati con un nome proprio.
function tintName(r,g,b){const mx=Math.max(r,g,b)/255,mn=Math.min(r,g,b)/255,l=(mx+mn)/2,c=mx-mn,s=c?c/(1-Math.abs(2*l-1)):0;
 if(c<.07||s<.1)return l<.1?'nero':l<.3?'grigio scuro':l<.62?'grigio':l<.9?'grigio chiaro':'bianco';
 const R=r/255,G=g/255,B=b/255;let hue=mx===R?((G-B)/c+6)%6:mx===G?(B-R)/c+2:(R-G)/c+4;hue*=60;
 if(hue>=10&&hue<50&&l<.42)return l<.18?'marrone scuro':'marrone';if(hue>=18&&hue<55&&l>.62&&s<.6)return 'beige';
 const name=hue<12||hue>=345?(l>.7?'rosa':'rosso'):hue<40?'arancione':hue<66?'giallo':hue<160?'verde':hue<195?'azzurro':hue<255?'blu':hue<290?'viola':hue<330?'fucsia':'rosa';
 return name+(l<.25?' scuro':l>.75&&name!=='rosa'?' chiaro':'')+(s<.28?' tenue':'')}
function zoneName(cx,cy){const v=cy<1/3?'in alto':cy>2/3?'in basso':'',o=cx<1/3?'a sinistra':cx>2/3?'a destra':'';return v&&o?v+' '+o:v||o||'al centro'}

// ——— Pixel: ogni immagine si riduce a 48 × 27 e se ne ricavano luce (luma 0–1), contrasto, colori e zone.
const PX_W=48,PX_H=27,pxCanvas=document.createElement('canvas');pxCanvas.width=PX_W;pxCanvas.height=PX_H;const pxG=pxCanvas.getContext('2d',{willReadFrequently:true});
function pixelsOf(src){pxG.fillStyle='#000';pxG.fillRect(0,0,PX_W,PX_H);pxG.drawImage(src,0,0,PX_W,PX_H);return pxG.getImageData(0,0,PX_W,PX_H).data}
const luma=(d,i)=>(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2])/255;
// Bande nere: righe o colonne del bordo quasi nere per tutta la loro lunghezza.
function blackBands(d){const dark=(x0,y0,x1,y1)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(luma(d,(y*PX_W+x)*4)>0.04)return false;return true};let l=0,r=0,t=0,b=0;
 while(l<PX_W/3&&dark(l,0,l+1,PX_H))l++;while(r<PX_W/3&&dark(PX_W-1-r,0,PX_W-r,PX_H))r++;while(t<PX_H/3&&dark(0,t,PX_W,t+1))t++;while(b<PX_H/3&&dark(0,PX_H-1-b,PX_W,PX_H-b))b++;return{l,r,t,b}}
function pixelStats(d){const n=PX_W*PX_H,L=new Float32Array(n),C=new Float32Array(n*3),bands=blackBands(d),names=new Map();let sum=0;
 for(let i=0;i<n;i++){const v=luma(d,i*4);L[i]=v;sum+=v;C[i*3]=d[i*4]/255;C[i*3+1]=d[i*4+1]/255;C[i*3+2]=d[i*4+2]/255;const x=i%PX_W,y=(i/PX_W)|0;if(x<bands.l||x>=PX_W-bands.r||y<bands.t||y>=PX_H-bands.b)continue;const k=tintName(d[i*4],d[i*4+1],d[i*4+2]);names.set(k,(names.get(k)||0)+1)}
 // Colore di una zona: il nome più frequente tra i suoi pixel, con il secondo se ne copre almeno un terzo (una media
 // di cielo e prato darebbe un colore che non c'è).
 const s=Float32Array.from(L).sort(),zone=(x0,y0,x1,y1)=>{const cnt=new Map();let c=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const o=(y*PX_W+x)*4,k=tintName(d[o],d[o+1],d[o+2]);cnt.set(k,(cnt.get(k)||0)+1);c++}
  const top=[...cnt].sort((p,q)=>q[1]-p[1]);return top[1]&&top[1][1]>=c/3?top[0][0]+' e '+top[1][0]:top[0][0]};
 const top=[...names].sort((a,b)=>b[1]-a[1]),inside=top.reduce((x,y)=>x+y[1],0)||1;
 return{mean:sum/n,lo:s[Math.floor(n*0.05)],hi:s[Math.floor(n*0.95)],dom:top[0]?.[0]||'nero',share:(top[0]?.[1]||0)/inside,second:top[1]&&top[1][1]/inside>0.2?top[1][0]:'',bands,L,C,
  rows:[0,1,2].map(k=>zone(0,Math.round(k*PX_H/3),PX_W,Math.round((k+1)*PX_H/3))),cells:[0,1,2].flatMap(j=>[0,1,2].map(k=>zone(Math.round(k*PX_W/3),Math.round(j*PX_H/3),Math.round((k+1)*PX_W/3),Math.round((j+1)*PX_H/3))))}}
const lightWords=v=>v<0.12?'molto scuro':v<0.3?'scuro':v<0.6?'medio':v<0.82?'chiaro':'molto chiaro';
const contrastWords=(lo,hi)=>hi-lo<0.2?'contrasto basso':hi-lo<0.5?'contrasto medio':'contrasto alto';
const diffOf=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/a.length};
const changeOfFrame=d=>d<0.015?'Uguale al fotogramma prima.':d<0.06?'Cambia poco dal fotogramma prima.':d<0.18?'Cambia dal fotogramma prima.':'Cambio netto dal fotogramma prima: probabile cambio di scena.';
function lookWords(st){return `${lightWords(st.mean)}, luminosità ${Math.round(st.mean*100)}%, ${contrastWords(st.lo,st.hi)}, ${st.share>0.55?'dominante '+st.dom:st.second?st.dom+' e '+st.second:'colori vari, soprattutto '+st.dom}`}
function rowsWords(st){const names=['in alto','al centro','in basso'],out=[];st.rows.forEach((c,i)=>{if(out.length&&out.at(-1).c===c)out.at(-1).w.push(names[i]);else out.push({c,w:[names[i]]})});return capital(out.map(o=>`${andList(o.w)} ${o.c}`).join(', '))+'.'}
function bandsWords(b){const side=b.l>=2&&b.r>=2,tb=b.t>=2&&b.b>=2;return side&&tb?'Bande nere tutto intorno.':side?'Bande nere ai lati.':tb?'Bande nere sopra e sotto.':''}

// ——— Il fotogramma dell'indicatore, senza titoli né sottotitoli, in un canvas a parte (l'anteprima non cambia).
let frameCanvas=null;
async function montagePixels(t){vStop();await showFrame(t);frameCanvas??=document.createElement('canvas');if(frameCanvas.width!==V.p.w||frameCanvas.height!==V.p.h){frameCanvas.width=V.p.w;frameCanvas.height=V.p.h}
 drawFrame(frameCanvas.getContext('2d',{alpha:false}),t,{subs:false,titles:false});return pixelsOf(frameCanvas)}
// Alt+Maiusc+D: luce, contrasto, colori, zone, bande e differenza dal fotogramma prima. Di nuovo entro 4 secondi: le nove zone.
let lastFrameSaid={t:-1,at:0};
async function describeFrame(){if(totalDur()<=0){toast('La linea temporale è vuota');return}const t=V.t,again=lastFrameSaid.t===t&&Date.now()-lastFrameSaid.at<4000;lastFrameSaid={t,at:Date.now()};
 const d=await montagePixels(t),st=pixelStats(d),s=segAt(t),head=`${sayTime(t,2)}, ${s?`clip ${s.i+1} ${itemName('main',s.c)}`:'nessuna clip, sfondo'}`;
 if(again){toast(`${head}, le nove zone: ${st.cells.map((c,i)=>zoneName((i%3+0.5)/3,(Math.floor(i/3)+0.5)/3)+' '+c).join(', ')}.`);return}
 let change='';if(t>=frameDur()){const p=pixelStats(await montagePixels(Math.max(0,t-frameDur())));change=' '+changeOfFrame(diffOf(st.C,p.C));await showFrame(t)}
 toast(`${head}: ${lookWords(st)}. ${rowsWords(st)} ${bandsWords(st.bands)}${change}`.replace(/\s+/g,' ').trim())}

// ——— Analisi di un file video: un'immagine ogni step secondi (al più 400), con luce, colori e differenza dalla
// precedente. I tagli si riconoscono da una differenza molto più alta di quelle vicine, che non torna indietro subito
// (sarebbe un lampo), e si cercano poi fino al fotogramma. Il risultato resta nella raccolta (m.an).
const AN_V=1;
function seekTo2(el,t){return new Promise(ok=>{const done=()=>{el.removeEventListener('seeked',done);ok()};el.addEventListener('seeked',done);el.currentTime=t;setTimeout(done,3000)})}
async function analyzeMedia(m,{progress=null}={}){if(m.type==='image'){const rt=MEDIA.get(m.id);if(!rt?.bitmap)return null;const st=pixelStats(pixelsOf(rt.bitmap));return m.an={v:AN_V,step:m.dur,lum:[Math.round(st.mean*100)],mot:[0],tint:[st.dom],cuts:[],dark:[]}}
 const rt=MEDIA.get(m.id);if(!rt||m.type!=='video')return null;const el=document.createElement('video');el.muted=true;el.preload='auto';el.src=rt.url;await once(el,'loadedmetadata',10000);
 const dur=m.dur||el.duration,step=Math.max(0.2,dur/400),n=Math.max(1,Math.floor(dur/step)),lum=[],mot=[],tint=[],L=[];let prev=null;
 const grab=async t=>{await seekTo2(el,t);return pixelStats(pixelsOf(el))};
 try{for(let i=0;i<n;i++){const st=await grab(Math.min(dur-0.04,i*step+0.02));lum.push(Math.round(st.mean*100));tint.push(st.dom);L.push(st.C);mot.push(prev?Math.round(diffOf(st.C,prev)*1000):0);prev=st.C;progress?.((i+1)/n)}
  // Tagli: differenza oltre 0,12 e oltre tre volte la mediana vicina, e il fotogramma dopo non torna come quello prima.
  const cuts=[],med=i=>{const w=[];for(let k=Math.max(1,i-8);k<=Math.min(n-1,i+8);k++)if(k!==i)w.push(mot[k]);w.sort((a,b)=>a-b);return w[w.length>>1]||0};
  for(let i=1;i<n;i++){const v=mot[i];if(v<120||v<3*med(i))continue;if(i+1<n&&diffOf(L[i+1],L[i-1])<0.05)continue;if(cuts.length&&i*step-cuts.at(-1)<0.5)continue;
   let a=(i-1)*step+0.02,b=i*step+0.02;const left=L[i-1];for(let k=0;k<4&&b-a>1/30;k++){const mid=(a+b)/2,st=await grab(mid);if(diffOf(st.C,left)<diffOf(st.C,L[i]))a=mid;else b=mid}cuts.push(Math.round(b*100)/100)}
  const dark=[];let ds=-1;for(let i=0;i<=n;i++){const d=i<n&&lum[i]<4;if(d&&ds<0)ds=i;else if(!d&&ds>=0){if((i-ds)*step>=0.5)dark.push([Math.round(ds*step*100)/100,Math.round(Math.min(dur,i*step)*100)/100]);ds=-1}}
  m.an={v:AN_V,step,lum,mot,tint,cuts,dark};schedulePersist('video');return m.an}
 finally{el.removeAttribute('src');el.load()}}
// Analisi delle clip che servono, con l'avanzamento nella barra di stato (che si sente ogni pochi secondi).
async function ensureAnalysis(list){const todo=[...new Set(list)].map(mediaMeta).filter(m=>m&&m.type!=='audio'&&m.an?.v!==AN_V);if(!todo.length)return true;
 const r=await work('Analisi delle immagini',async()=>{for(const [k,m] of todo.entries()){status(`Analisi delle immagini di «${m.name}» (${k+1} di ${todo.length})`,{say:false});await analyzeMedia(m,{progress:f=>status(`Analisi delle immagini di «${m.name}»: ${Math.round(f*100)}%`)})}return true});return !!r}
// Valore di un'analisi a un istante del file: l'immagine più vicina.
const anAt=(an,ft)=>clamp(Math.round((ft-0.02)/an.step),0,an.lum.length-1);
const motionWords=v=>v<10?'immagine ferma':v<30?'poco movimento':v<80?'movimento':'molto movimento';
// Scene di una clip, nei suoi tempi (da 0 alla durata della clip), con luce, colore e movimento di ognuna.
function clipScenes(c){const m=mediaMeta(c.media),an=m?.an;if(!an)return null;const sp=c.speed||1,cuts=an.cuts.filter(x=>x>c.in+0.1&&x<c.out-0.1),edges=[c.in,...cuts,c.out];
 return edges.slice(0,-1).map((a,i)=>{const b=edges[i+1],i0=anAt(an,a),i1=Math.max(i0,anAt(an,b)-1),idx=[];for(let k=i0;k<=i1;k++)idx.push(k);const lum=idx.reduce((s,k)=>s+an.lum[k],0)/idx.length,mot=idx.slice(1).reduce((s,k)=>s+an.mot[k],0)/Math.max(1,idx.length-1),
  cnt=new Map();for(const k of idx)cnt.set(an.tint[k],(cnt.get(an.tint[k])||0)+1);const tint=[...cnt].sort((x,y)=>y[1]-x[1])[0]?.[0]||'';return{a:(a-c.in)/sp,b:(b-c.in)/sp,lum,mot,tint,fileA:a,fileB:b}})}

// ——— Alt+Maiusc+C: che cosa c'è nella clip scelta (o sotto l'indicatore).
async function describeClip(){const sel=V.sel?.kind==='main'?selected():null,s=sel?layout().find(x=>x.c===sel):segAt(V.t);if(!s){toast('Scegli una clip nella traccia video, o porta l’indicatore su una clip');return}const c=s.c;
 if(c.kind==='card'){toast(`Clip ${s.i+1}, cartello: sfondo ${tintName(...hexRgb(c.color))}, testo ${tintName(...hexRgb(c.textColor))} «${(c.text||'').replace(/\n/g,' ')}», ${sayTime(s.dur)}.`);return}
 const m=mediaMeta(c.media);if(!m){toast('Il file della clip manca');return}if(!(await ensureAnalysis([m.id])))return;
 const sc=clipScenes(c)||[],speech=await clipSpeech(s),head=`Clip ${s.i+1} di ${V.p.main.length}, ${itemName('main',c)}${m.type==='video'?`, dal file da ${sayTime(c.in)} a ${sayTime(c.out)}`:', immagine'}, sulla linea temporale da ${sayTime(s.start)} a ${sayTime(s.end)}`;
 const trend=sc.length&&m.type==='video'?(()=>{const a=sc[0].lum,b=sc.at(-1).lum;return Math.abs(b-a)<12?'':` La luce va da ${lightWords(a/100)} a ${lightWords(b/100)}.`})():'';
 const sum=`${head}${c.desc?' («'+c.desc.replace(/\s+/g,' ')+'»)':''}: ${sc.length<=1?'una sola scena':sc.length+' scene'}${sc.length===1?`, ${lightWords(sc[0].lum/100)}, ${sc[0].tint}${m.type==='video'?', '+motionWords(sc[0].mot):''}`:''}.${trend}${speech}`;
 if(sc.length<=1){toast(sum);return}
 modal('Descrizione della clip',`<p id="clipSum">${esc(sum)}</p><table><caption>Scene della clip</caption><thead><tr><th scope="col">Scena</th><th scope="col">Da</th><th scope="col">A</th><th scope="col">Luce</th><th scope="col">Colore</th><th scope="col">Movimento</th></tr></thead><tbody>${sc.map((x,i)=>`<tr><th scope="row">${i+1}</th><td>${esc(sayTime(s.start+x.a))}</td><td>${esc(sayTime(s.start+x.b))}</td><td>${esc(lightWords(x.lum/100))}</td><td>${esc(x.tint)}</td><td>${esc(motionWords(x.mot))}</td></tr>`).join('')}</tbody></table>`,[],'Chiudi',{noCancel:true,wide:true,describedBy:'clipSum'})}
const hexRgb=h=>{const n=parseInt(String(h).slice(1),16);return[n>>16&255,n>>8&255,n&255]};

// ——— Cambi di scena sul montaggio: i tagli dentro le clip analizzate più i passaggi tra una clip e l'altra.
function scenePoints(){const pts=[];for(const s of layout()){if(s.i>0)pts.push({t:s.start,s,edge:true});const an=s.c.kind==='media'?mediaMeta(s.c.media)?.an:null;if(!an)continue;for(const x of an.cuts)if(x>s.c.in+0.05&&x<s.c.out-0.05)pts.push({t:s.start+(x-s.c.in)/(s.c.speed||1),s,file:x})}return pts.sort((a,b)=>a.t-b.t)}
function lookAt(t){const s=segAt(t);if(!s)return 'nessuna clip';if(s.c.kind==='card')return 'cartello '+tintName(...hexRgb(s.c.color));const an=mediaMeta(s.c.media)?.an;if(!an)return itemName('main',s.c);const k=anAt(an,srcTime(s,t));return `${lightWords(an.lum[k]/100)}, ${an.tint[k]}`}
async function sceneStep(dir){const vids=V.p.main.filter(c=>c.kind==='media').map(c=>c.media);if(!vids.length){toast('Nessuna clip sulla linea temporale');return}if(!(await ensureAnalysis(vids)))return;
 const t=V.t,pts=scenePoints(),p=dir>0?pts.find(x=>x.t>t+1e-3):[...pts].reverse().find(x=>x.t<t-1e-3);if(!p){toast(dir>0?'Nessun cambio di scena dopo':'Nessun cambio di scena prima');return}
 seekTo(p.t);announce(`Cambio di scena a ${sayTime(p.t,2)}, ${p.edge?`inizio della clip ${p.s.i+1}`:`clip ${p.s.i+1}`}: da ${lookAt(Math.max(0,p.t-0.15))} a ${lookAt(p.t+0.05)}`)}

// ——— Parlato del montaggio: l'inviluppo a 100 valori al secondo dall'audio delle clip (la musica della traccia audio
// coprirebbe le pause; si usa solo se nessuna clip ha audio), riportato sui tempi della linea temporale.
let vEnvCache=null;
const speechKey=()=>JSON.stringify([V.p.main.map(c=>[c.media,c.in,c.out,c.speed,c.mute,c.gap,c.trans?.type,c.trans?.dur]),V.p.audio.map(a=>[a.media,a.start,a.in,a.out]),prefs.pauseDb,prefs.minPause]);
function envOf(buf,a,b){const win=Math.round(buf.sampleRate/100),n=Math.max(0,Math.floor((b-a)/win)),db=new Float32Array(n),ch=Array.from({length:buf.numberOfChannels},(_,c)=>buf.getChannelData(c));
 for(let i=0;i<n;i++){let best=0;const s0=a+i*win;for(const d of ch){let q=0;for(let j=s0;j<s0+win&&j<d.length;j++)q+=d[j]*d[j];if(q>best)best=q}db[i]=best>0?10*Math.log10(best/win):-120}return db}
async function speechEnv(){const key=speechKey();if(vEnvCache?.key===key)return vEnvCache;const T=totalDur(),n=Math.ceil(T*100)+1,db=new Float32Array(n).fill(-120);let any=false;
 const put=(env,start,speed)=>{for(let i=0;i<env.length;i++){const j=Math.round(start*100+i/speed);if(j>=0&&j<n&&env[i]>db[j])db[j]=env[i]}any=true};
 await work('Ascolto del parlato',async()=>{for(const s of layout()){if(s.c.kind!=='media'||s.c.mute)continue;const m=mediaMeta(s.c.media);if(!m||!(await mediaHasAudio(m)))continue;const src=await clipAudio(m.id,s.c.in,s.c.out);if(!src)continue;const r=src.buf.sampleRate;put(envOf(src.buf,Math.max(0,Math.round((s.c.in-src.t0)*r)),Math.round((s.c.out-src.t0)*r)),s.start,s.c.speed||1)}
  if(!any)for(const a of V.p.audio){const src=await clipAudio(a.media,a.in,a.out);if(!src)continue;const r=src.buf.sampleRate;put(envOf(src.buf,Math.max(0,Math.round((a.in-src.t0)*r)),Math.round((a.out-src.t0)*r)),a.start,1)}
  decoded.clear()});
 // Soglia: quella scelta in Audio, oppure automatica dal rumore di fondo, come in Audio.
 const sorted=Float32Array.from(db).sort(),th=prefs.pauseDb!=='auto'&&Number.isFinite(Number(prefs.pauseDb))?Number(prefs.pauseDb):clamp(sorted[Math.floor(sorted.length*.1)]+12,-60,-26),minW=Math.round((prefs.minPause||0.3)*100),pauses=[];let s=-1;
 for(let i=0;i<=n;i++){const quiet=i<n&&db[i]<th;if(quiet&&s<0)s=i;else if(!quiet&&s>=0){if(i-s>=minW||s===0||i===n)pauses.push({a:s/100,b:Math.min(T,i/100)});s=-1}}
 return vEnvCache={key,any,db,th,pauses,T}}
function pausePoints(env){const pts=[];for(const p of env.pauses){if(p.a>0.005)pts.push({t:p.a,kind:'start',p});if(p.b<env.T-0.005)pts.push({t:p.b,kind:'end',p})}return pts}
const clipAt=t=>{const s=segAt(t);return s?`, clip ${s.i+1}`:''};
// Ctrl+← → sull'indicatore: la pausa precedente o successiva nel parlato, con le stesse frasi di Audio.
async function vPauseStep(dir){if(totalDur()<=0){toast('La linea temporale è vuota');return}const env=await speechEnv();if(!env.any){toast('Il montaggio non ha audio: niente pause da cercare');return}
 const t=V.t,pts=pausePoints(env),p=dir>0?pts.find(x=>x.t>t+0.005):[...pts].reverse().find(x=>x.t<t-0.005);
 if(!p){seekTo(dir>0?totalDur():0);announce(dir>0?'Nessun’altra pausa: fine del montaggio':'Nessuna pausa prima: inizio del montaggio');return}
 seekTo(p.t);const len=sayTime(p.p.b-p.p.a,1);announce(p.kind==='start'?`Inizia una pausa di ${len}, a ${sayTime(p.t,1)}${clipAt(p.t)}`:`Finisce una pausa di ${len}, riprende il suono a ${sayTime(p.t,1)}${clipAt(p.t)}`)}
// Tratti parlati: tra una pausa e l'altra.
function speechSpans(env){const out=[];let at=0;for(const p of env.pauses){if(p.a-at>=0.2)out.push({a:at,b:p.a});at=p.b}if(env.T-at>=0.2)out.push({a:at,b:env.T});return out}
// Parlato di una clip, per Alt+Maiusc+C: quanto si parla e quante pause.
async function clipSpeech(s){const m=mediaMeta(s.c.media);if(s.c.mute||!m||!(await mediaHasAudio(m)))return m?.type==='video'?' Senza audio.':'';const env=await speechEnv();if(!env.any)return '';
 const inside=speechSpans(env).map(x=>Math.max(0,Math.min(x.b,s.end)-Math.max(x.a,s.start))).reduce((a,b)=>a+b,0),np=env.pauses.filter(p=>p.a>s.start+0.05&&p.b<s.end-0.05).length;
 return inside<0.2?' Nessun suono sopra la soglia delle pause.':` Suono o parlato per ${sayTime(inside)} su ${sayTime(s.dur)}, ${np===0?'senza pause':np===1?'con una pausa':`con ${np} pause`}.`}

// ——— Sottotitoli e parlato. L'inizio si aggancia alla ripresa del parlato più vicina (entro 1,5 secondi), la fine alla
// pausa successiva (al più 7 secondi dopo).
function speechStartNear(env,t,before=1.5,after=0){let best=null;for(const x of speechSpans(env))if(x.a>=t-before&&x.a<=t+after&&(!best||Math.abs(x.a-t)<Math.abs(best-t)))best=x.a;return best}
function speechEndAfter(env,a){const sp=speechSpans(env).find(x=>x.b>a+0.3);return sp?Math.min(sp.b,a+7):null}
async function subSnap(){const x=V.sel?.kind==='subs'?selected():null;if(!x){toast('Scegli prima un sottotitolo nella traccia dei sottotitoli');return}const env=await speechEnv();if(!env.any){toast('Il montaggio non ha audio: niente parlato a cui agganciarsi');return}
 const a=speechStartNear(env,x.start,1.5,1.5);if(a===null){toast('Nessuna ripresa del parlato entro un secondo e mezzo dall’inizio del sottotitolo');return}const next=V.p.subs.filter(s=>s!==x&&s.start>a).sort((p,q)=>p.start-q.start)[0],b=Math.min(speechEndAfter(env,a)??x.end,next?next.start:Infinity);
 vCommit('Aggancia al parlato',()=>{x.start=snapFrame(a);x.end=Math.max(x.start+0.5,snapFrame(b))});announce(`Sottotitolo agganciato al parlato: inizio a ${sayTime(x.start,2)}, fine a ${sayTime(x.end,2)}`)}
async function subsFromSpeech(){if(totalDur()<=0){toast('La linea temporale è vuota');return}const env=await speechEnv();if(!env.any){toast('Il montaggio non ha audio: niente parlato da sottotitolare');return}
 const free=speechSpans(env).flatMap(x=>{const out=[],n=Math.ceil((x.b-x.a)/6);for(let k=0;k<n;k++)out.push({a:x.a+(x.b-x.a)*k/n,b:x.a+(x.b-x.a)*(k+1)/n});return out}).filter(x=>!V.p.subs.some(s=>s.start<x.b&&s.end>x.a));
 if(!free.length){toast('Ogni tratto parlato ha già un sottotitolo');return}
 if(!(await confirmAction(`Preparo ${free.length} sottotitoli vuoti, uno per ogni tratto parlato senza sottotitolo (i tratti più lunghi di 6 secondi si dividono). Poi scegli ogni sottotitolo, ascoltalo con Maiusc+Spazio e scrivi il testo nelle Proprietà.`,'Prepara')))return;
 const made=free.map(x=>({id:uid(),start:snapFrame(x.a),end:snapFrame(x.b),text:''}));vCommit('Sottotitoli dal parlato',()=>V.p.subs.push(...made));V.sel={kind:'subs',id:made[0].id};videoChanged();announce(`Preparati ${made.length} sottotitoli vuoti: il primo è scelto, a ${sayTime(made[0].start)}`)}
// Verifica: parlato senza sottotitoli e sottotitoli vuoti.
async function speechIssues(){const out=[];for(const [i,s] of [...V.p.subs].sort((a,b)=>a.start-b.start).entries())if(!s.text.trim())out.push({msg:`Il sottotitolo ${i+1} è vuoto: scrivi il testo nelle Proprietà.`,go:['subs',s.id]});
 if(!V.p.subs.length)return out;const env=await speechEnv().catch(()=>null);if(!env?.any)return out;
 for(const x of speechSpans(env)){let cov=0;for(const s of V.p.subs)cov+=Math.max(0,Math.min(s.end,x.b)-Math.max(s.start,x.a));if(x.b-x.a>=1&&cov<(x.b-x.a)*0.3)out.push({msg:`Parlato senza sottotitoli da ${fmtTime(x.a,1)} a ${fmtTime(x.b,1)}.`,at:x.a})}return out}

// ——— Che cosa si sovrappone nel punto: transizione o dissolvenza in corso e audio della traccia audio.
function blendAt(t){const s=segAt(t);if(!s)return '';const L=layout(),next=L[s.i+1],prev=s.i>0?L[s.i-1]:null;
 if(s.tr>0&&t<s.start+s.tr&&prev&&s.c.trans.type!=='none')return `in ${TRANS[s.c.trans.type].toLowerCase()} dalla clip ${s.i} alla clip ${s.i+1}, al ${Math.round((t-s.start)/s.tr*100)}%`;
 if(next&&next.tr>0&&t>=next.start&&next.c.trans.type!=='none')return `in ${TRANS[next.c.trans.type].toLowerCase()} verso la clip ${next.i+1}`;
 if(s.c.fadeIn>0&&t<s.start+s.c.fadeIn)return 'in dissolvenza in entrata';if(s.c.fadeOut>0&&t>s.end-s.c.fadeOut)return 'in dissolvenza in uscita';return ''}
const audioHere=t=>V.p.audio.filter(a=>t>=a.start&&t<a.start+(a.out-a.in));
function audioWords(a,t){const g=Math.round(audioItemGain(a,t)*100);return `«${itemName('audio',a)}» al ${g}%`+(a.fadeIn>0&&t<a.start+a.fadeIn?', in dissolvenza in entrata':a.fadeOut>0&&t>a.start+(a.out-a.in)-a.fadeOut?', in dissolvenza in uscita':'')}
const POS_NAME={top:'in alto',center:'al centro',lower:'terzo inferiore',bottom:'in basso'};
