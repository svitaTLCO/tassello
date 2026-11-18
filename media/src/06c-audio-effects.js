// Effetti audio. Ognuno lavora sulla selezione, o su tutto l'audio se non c'è selezione, e riceve un array
// di canali (Float32Array): restituisce i canali nuovi, anche di lunghezza diversa. Le finestre hanno l'anteprima,
// che fa ascoltare i primi secondi con l'effetto applicato, e Ctrl+R ripete l'ultimo effetto.
const mapCh=(ch,f)=>ch.map(d=>{const o=new Float32Array(d.length);for(let i=0;i<d.length;i++)o[i]=f(d[i],i,d);return o});
// Picco di un tratto dai picchi già calcolati per il disegno, senza copiare i campioni.
function rangePeak(a,b){const lv=getPeaks().levels[0];if(!lv)return 0;let pk=0;for(let c=0;c<lv.ch.length;c++){const s=levelStats(lv,c,a,b);if(s)pk=Math.max(pk,s.hi,-s.lo)}return pk}
const headroom=pk=>pk>0?-toDb(pk):0;
const peakOf=ch=>ch.reduce((p,d)=>{for(let i=0;i<d.length;i++){const x=Math.abs(d[i]);if(x>p)p=x}return p},0);
const fadeCurve=t=>0.5-0.5*Math.cos(Math.PI*clamp(t,0,1));
// Volume percepito (ITU-R BS.1770): filtro di pesatura K, blocchi di 400 ms, soglie assoluta e relativa.
function kWeight(rate){let K=Math.tan(Math.PI*1681.974450955533/rate);const Vh=10**(3.999843853973347/20),Vb=Vh**0.4996667741545416,Q=0.7071752369554196,a0=1+K/Q+K*K;
 const s1=[(Vh+Vb*K/Q+K*K)/a0,2*(K*K-Vh)/a0,(Vh-Vb*K/Q+K*K)/a0,2*(K*K-1)/a0,(1-K/Q+K*K)/a0];K=Math.tan(Math.PI*38.13547087602444/rate);const Q2=0.5003270373238773,d=1+K/Q2+K*K;
 return[s1,[1,-2,1,2*(K*K-1)/d,(1-K/Q2+K*K)/d]]}
function biquad(x,[b0,b1,b2,a1,a2]){const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x[i];y2=y1;y1=v;y[i]=v}return y}
function loudness(ch,rate){const [s1,s2]=kWeight(rate),f=ch.slice(0,2).map(d=>biquad(biquad(d,s1),s2)),blk=Math.round(rate*0.4),hop=Math.round(rate*0.1),z=[];
 for(let s=0;s+blk<=f[0].length;s+=hop){let sum=0;for(const d of f){let q=0;for(let i=s;i<s+blk;i++)q+=d[i]*d[i];sum+=q/blk}z.push(sum)}
 if(!z.length)return -Infinity;const L=v=>-0.691+10*Math.log10(v),abs=z.filter(v=>L(v)>-70);if(!abs.length)return -Infinity;const rel=L(abs.reduce((a,b)=>a+b,0)/abs.length)-10,gated=abs.filter(v=>L(v)>rel);return L(gated.reduce((a,b)=>a+b,0)/gated.length)}
// Elaborazione con il motore del browser (filtri dell'equalizzatore).
async function renderOffline(ch,rate,build){const oc=new OfflineAudioContext(ch.length,ch[0].length,rate),src=oc.createBufferSource(),b=oc.createBuffer(ch.length,ch[0].length,rate);ch.forEach((d,c)=>b.copyToChannel(d,c));src.buffer=b;src.connect(build(oc));src.start();const out=await oc.startRendering();return Array.from({length:ch.length},(_,c)=>out.getChannelData(c).slice())}
// Interpolazione cubica per cambiare la velocità (durata e intonazione insieme).
function resampleCh(d,factor){const n=Math.max(1,Math.round(d.length/factor)),o=new Float32Array(n),at=i=>d[clamp(i,0,d.length-1)];for(let j=0;j<n;j++){const x=j*factor,i=Math.floor(x),t=x-i,p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);o[j]=p1+0.5*t*(p2-p0+t*(2*p0-5*p1+4*p2-p3+t*(3*(p1-p2)+p3-p0)))}return o}
// Ritmo senza cambiare intonazione (WSOLA): finestre di 40 ms riallineate cercando la somiglianza massima.
function wsola(ch,rate,f){const mono=ch.length===1?ch[0]:ch[0].map((x,i)=>ch.reduce((s,d)=>s+d[i],0)/ch.length),N=Math.round(rate*0.04)&~1,Hs=N/2,tol=Math.round(rate*0.012),L=mono.length,outLen=Math.max(1,Math.round(L/f)),w=new Float32Array(N);for(let i=0;i<N;i++)w[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
 const starts=[];let prev=0;for(let k=0;k*Hs<outLen;k++){const target=Math.min(Math.max(0,L-N),Math.round(k*Hs*f));let best=target;if(k>0){const nat=prev+Hs;let bestC=-Infinity;for(let d=-tol;d<=tol;d+=2){const s=target+d;if(s<0||s+N>L||nat+N>L)continue;let c=0;for(let i=0;i<N;i+=4)c+=mono[nat+i]*mono[s+i];if(c>bestC){bestC=c;best=s}}}starts.push(best);prev=best}
 return ch.map(d=>{const y=new Float32Array(outLen+N);starts.forEach((s,k)=>{for(let i=0;i<N&&s+i<d.length;i++)y[k*Hs+i]+=d[s+i]*w[i]});return y.slice(0,outLen)})}
// FFT complessa iterativa (radice 2) per la riduzione del rumore, con tabelle di inversione dei bit e seni precalcolate.
const FFT_TABLES=new Map();
function fftTables(n){let t=FFT_TABLES.get(n);if(t)return t;const bits=Math.log2(n),rev=new Uint32Array(n),cos=new Float64Array(n/2),sin=new Float64Array(n/2);for(let i=0;i<n;i++){let r=0;for(let k=0;k<bits;k++)r|=((i>>k)&1)<<(bits-1-k);rev[i]=r}for(let i=0;i<n/2;i++){cos[i]=Math.cos(2*Math.PI*i/n);sin[i]=Math.sin(2*Math.PI*i/n)}t={rev,cos,sin};FFT_TABLES.set(n,t);return t}
function fft(re,im,inverse){const n=re.length,{rev,cos,sin}=fftTables(n),sg=inverse?1:-1;for(let i=0;i<n;i++){const j=rev[i];if(i<j){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(let len=2;len<=n;len<<=1){const half=len>>1,step=n/len;for(let i=0;i<n;i+=len)for(let j=0,k=0;j<half;j++,k+=step){const wr=cos[k],wi=sg*sin[k],a=i+j,b=a+half,tr=re[b]*wr-im[b]*wi,ti=re[b]*wi+im[b]*wr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti}}
 if(inverse)for(let i=0;i<n;i++){re[i]/=n;im[i]/=n}}
const NR_N=2048;
function spectra(d,each){const N=NR_N,hop=N/4,w=new Float64Array(N);for(let i=0;i<N;i++)w[i]=Math.sqrt(0.5-0.5*Math.cos(2*Math.PI*i/N));const re=new Float64Array(N),im=new Float64Array(N);for(let s=-N;s<d.length;s+=hop){for(let i=0;i<N;i++){const k=s+i;re[i]=k>=0&&k<d.length?d[k]*w[i]:0;im[i]=0}fft(re,im,false);each(s,re,im,w)}}
// Profilo del rumore: spettro medio dei tratti più silenziosi (o del campione catturato dall'utente).
let noiseSample=null;
function noiseProfile(ch,all=false){const N=NR_N,frames=[];spectra(ch.length===1?ch[0]:ch[0].map((x,i)=>ch.reduce((s,d)=>s+d[i],0)/ch.length),(s,re,im)=>{const m=new Float32Array(N/2+1);let e=0;for(let k=0;k<=N/2;k++){m[k]=Math.sqrt(re[k]*re[k]+im[k]*im[k]);e+=m[k]*m[k]}frames.push({m,e})});
 frames.sort((a,b)=>a.e-b.e);const use=frames.slice(0,Math.max(1,Math.round(frames.length*(all?1:0.1)))),p=new Float32Array(N/2+1);for(const f of use)for(let k=0;k<p.length;k++)p[k]+=f.m[k]/use.length;return p}
function spectralDenoise(ch,rate,profile,reductionDb,sensDb=6){const N=NR_N,hop=N/4,floor=fromDb(-reductionDb),th2=profile.map(v=>(v*fromDb(sensDb))**2),release=Math.exp(-hop/(rate*0.08));
 return ch.map(d=>{const y=new Float32Array(d.length+N),prev=new Float32Array(N/2+1).fill(1);spectra(d,(s,re,im,w)=>{const g=new Float32Array(N/2+1);for(let k=0;k<=N/2;k++)g[k]=re[k]*re[k]+im[k]*im[k]>th2[k]?1:floor;
  for(let k=0;k<=N/2;k++){let v=(g[Math.max(0,k-1)]+g[k]+g[Math.min(N/2,k+1)])/3;v=Math.max(v,prev[k]*release,floor);prev[k]=v;re[k]*=v;im[k]*=v;if(k&&k<N/2){re[N-k]*=v;im[N-k]*=v}}
  fft(re,im,true);for(let i=0;i<N;i++){const k=s+i;if(k>=0&&k<d.length)y[k]+=re[i]*w[i]*0.5}});return y.slice(0,d.length)})}
// Soglia: abbassa il suono quando resta sotto il livello indicato (pause, respiri, rumore tra le frasi).
function gate(ch,rate,thDb,reductionDb){const win=Math.round(rate*0.01),n=ch[0].length,floor=fromDb(-reductionDb),att=Math.exp(-1/(rate*0.005)),rel=Math.exp(-1/(rate*0.12)),hold=Math.round(rate*0.08),out=ch.map(d=>new Float32Array(d.length));let g=1,held=0;
 for(let s=0;s<n;s+=win){let pk=0;for(const d of ch)for(let i=s;i<Math.min(n,s+win);i++)pk=Math.max(pk,Math.abs(d[i]));const open=toDb(pk)>thDb;if(open)held=hold;else held=Math.max(0,held-win);const target=open||held>0?1:floor;
  for(let i=s;i<Math.min(n,s+win);i++){g=target>g?target+(g-target)*att:target+(g-target)*rel;for(let c=0;c<ch.length;c++)out[c][i]=ch[c][i]*g}}return out}
function compress(ch,rate,{threshold,ratio,attack,release,makeup}){const a=Math.exp(-1/(rate*attack/1000)),r=Math.exp(-1/(rate*release/1000)),knee=6,n=ch[0].length,out=ch.map(d=>new Float32Array(d.length));let env=0;
 for(let i=0;i<n;i++){let x=0;for(const d of ch)x=Math.max(x,Math.abs(d[i]));env=x>env?x+(env-x)*a:x+(env-x)*r;const lv=toDb(env),over=lv-threshold;let gr=0;if(over>knee/2)gr=over*(1-1/ratio);else if(over>-knee/2)gr=(1-1/ratio)*(over+knee/2)**2/(2*knee);const g=fromDb(makeup-gr);for(let c=0;c<ch.length;c++)out[c][i]=ch[c][i]*g}return out}
// Pause in un tratto qualsiasi, con la soglia scelta: serve ad "Accorcia le pause".
function pausesIn(ch,rate,minSec){const win=Math.round(rate/100),n=ch[0].length,th=pauseThreshold(),list=[];let s=-1;for(let i=0;i*win<=n;i++){let q=0;const a=i*win,b=Math.min(n,a+win);for(const d of ch){let v=0;for(let j=a;j<b;j++)v+=d[j]*d[j];q=Math.max(q,v/Math.max(1,b-a))}const quiet=b>a&&10*Math.log10(q||1e-12)<th;if(quiet&&s<0)s=a;else if(!quiet&&s>=0){if(a-s>=minSec*rate)list.push([s,a]);s=-1}}if(s>=0&&n-s>=minSec*rate)list.push([s,n]);return list}
// ——— Pulizia della voce: filtri biquad (RBJ), de-esser, de-hum, de-click e limitatore. Sono gli interventi che
// servono prima di mandare in onda una registrazione: le "s" fastidiose, il ronzio a 50 Hz, i colpi del tavolo e i
// picchi che farebbero distorcere il trasmettitore.
function biqCoef(type,rate,f,q=0.707){const w=2*Math.PI*clamp(f,10,rate/2-10)/rate,c=Math.cos(w),s=Math.sin(w),al=s/(2*q),a0=1+al;
 if(type==='hp')return{b0:(1+c)/2/a0,b1:-(1+c)/a0,b2:(1+c)/2/a0,a1:-2*c/a0,a2:(1-al)/a0};
 if(type==='lp')return{b0:(1-c)/2/a0,b1:(1-c)/a0,b2:(1-c)/2/a0,a1:-2*c/a0,a2:(1-al)/a0};
 return{b0:1/a0,b1:-2*c/a0,b2:1/a0,a1:-2*c/a0,a2:(1-al)/a0}}
// Filtro del secondo ordine in forma diretta trasposta: stabile anche con frequenze molto basse.
function biqRun(d,co){const {b0,b1,b2,a1,a2}=co,out=new Float32Array(d.length);let x1=0,x2=0,y1=0,y2=0;
 for(let i=0;i<d.length;i++){const x=d[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;out[i]=y;x2=x1;x1=x;y2=y1;y1=y}return out}
// De-esser: divide il suono in due bande con un incrocio Linkwitz-Riley del quarto ordine (le due bande, sommate,
// ridanno il segnale con lo stesso livello), segue il livello della banda acuta e la abbassa solo quando supera la
// soglia. Sommare le bande invece di sottrarre la parte acuta evita le cancellazioni di fase che renderebbero
// l'intervento imprevedibile.
function lrSplit(d,rate,f){const lp=biqRun(biqRun(d,biqCoef('lp',rate,f,0.7071)),biqCoef('lp',rate,f,0.7071)),
 hp=biqRun(biqRun(d,biqCoef('hp',rate,f,0.7071)),biqCoef('hp',rate,f,0.7071));return{lp,hp}}
function deEsser(ch,rate,{freq=5000,thDb=-30,reduction=8}){const att=Math.exp(-1/(rate*0.001)),rel=Math.exp(-1/(rate*0.03));
 return ch.map(d=>{const {lp,hp}=lrSplit(d,rate,freq),out=new Float32Array(d.length);let env=0;
  for(let i=0;i<d.length;i++){const v=hp[i]<0?-hp[i]:hp[i];env=v>env?v+(env-v)*att:env+(env-v)*rel;const over=toDb(env)-thDb,g=over>0?fromDb(-Math.min(reduction,over*0.8)):1;
   out[i]=lp[i]+hp[i]*g}
  return out})}
// De-hum: notch a 50 o 60 Hz e sulle armoniche, strette (Q 30) per non toccare la voce.
function deHum(ch,rate,{base=50,harmonics=4}){let out=ch;for(let k=1;k<=harmonics;k++){const f=base*k;if(f>=rate/2-200)break;const co=biqCoef('notch',rate,f,30);out=out.map(d=>biqRun(d,co))}return out}
// De-click: un colpo è un campione che si stacca dai vicini; si sostituisce il tratto con una retta fra i due bordi.
// La soglia si misura sul livello tipico (la mediana a finestre di un millisecondo), che il colpo non sposta.
function deClick(ch,rate,{sensitivity=12,maxMs=5}){const n=ch[0].length,out=ch.map(d=>d.slice()),thr=fromDb(sensitivity),
 maxRun=Math.max(2,Math.round(rate*maxMs/1000)),step=Math.max(1,Math.round(rate*0.001)),m=Math.ceil(n/step),env=new Float32Array(m),vals=new Float32Array(ch.length*step);
 for(let k=0;k<m;k++){const a=k*step,b=Math.min(n,a+step);let q=0;for(const d of ch)for(let i=a;i<b;i++)vals[q++]=Math.abs(d[i]);
  const v=vals.subarray(0,q);v.sort();env[k]=q?v[Math.floor(q/2)]:0}
 const lim=i=>Math.max(thr*env[Math.min(m-1,Math.floor(i/step))],1e-4);
 for(let c=0;c<ch.length;c++){const d=ch[c],o=out[c];
  for(let i=2;i<n-2;i++){const med=(d[i-2]+d[i-1]+d[i+1]+d[i+2])/4;
   if(Math.abs(d[i]-med)>lim(i)){let b=i;while(b+1<n-2&&b-i<maxRun&&Math.abs(d[b+1]-(d[b]+d[b-1]+d[b+2]+d[b+3])/4)>lim(b+1))b++;
    const left=o[i-1]??0,right=o[Math.min(n-1,b+1)]??0;for(let j=i;j<=b;j++)o[j]=left+(right-left)*((j-i+1)/(b-i+2));i=b}}}
 return out}
// Limitatore: abbassa solo i picchi sopra il tetto, con rilascio regolabile. Usa lo stesso calcolo della consegna.
function limitSamples(ch,rate,ceilDb,releaseMs=50){const ceil=fromDb(ceilDb),rel=Math.exp(-1/(rate*releaseMs/1000)),n=ch[0].length,out=ch.map(d=>new Float32Array(d.length));let env=1,hit=0;
 for(let i=0;i<n;i++){let p=0;for(const d of ch){const v=d[i]<0?-d[i]:d[i];if(v>p)p=v}const t=p>ceil?ceil/p:1;env=t<env?t:Math.min(t,env+(1-env)*rel);if(env<0.999)hit++;
  for(let c=0;c<ch.length;c++)out[c][i]=ch[c][i]*env}
 return{out,hit}}
const EFFECTS={
 amplify:{label:'Amplifica o attenua',fields:(p,pk)=>[{id:'db',label:'Guadagno in decibel',type:'number',value:p.db??Math.round((headroom(pk)-1)*10)/10,hint:`Valori negativi attenuano. Il massimo senza distorsione è ${fmtDb(headroom(pk))}.`}],parse:v=>({db:num(v.db)}),check:p=>Number.isFinite(p.db)?null:{msg:'Guadagno in decibel: scrivi un numero, per esempio 3 o −6.',field:'db'},
  run:(ch,rate,p)=>{const g=fromDb(p.db);return mapCh(ch,x=>x*g)},done:(p,out)=>`Guadagno di ${fmtDb(p.db)} applicato${peakOf(out)>1?'. Attenzione: ora ci sono distorsioni':''}`},
 normalize:{label:'Normalizza',intro:'Porta il livello a un valore preciso. Il picco serve a sfruttare tutto il fondo scala; il volume percepito (LUFS) a rendere uniformi episodi e voci diversi.',
  fields:p=>[{id:'mode',label:'Che cosa normalizzare',type:'select',value:p.mode||'peak',options:[['peak','Il picco (il punto più forte)'],['lufs','Il volume percepito (LUFS)']]},{id:'peak',label:'Picco di destinazione in dB',type:'number',step:0.1,min:-60,max:0,value:p.peak??-1,hint:'Di solito −1 dB.'},{id:'lufs',label:'Volume percepito di destinazione in LUFS',type:'number',step:0.5,min:-50,max:-5,value:p.lufs??-16,hint:'−16 per podcast e voce, −14 per le piattaforme di musica, −23 per la televisione.'},{id:'dc',label:'Rimuovi anche lo spostamento continuo (DC)',type:'checkbox',value:p.dc??true},{id:'each',label:'Normalizza ogni canale per conto suo',type:'checkbox',value:!!p.each}],
  parse:v=>({mode:v.mode,peak:num(v.peak),lufs:num(v.lufs),dc:v.dc,each:v.each}),check:()=>null,
  run:(ch,rate,p)=>{let x=p.dc?ch.map(d=>{let m=0;for(const v of d)m+=v;m/=d.length||1;return d.map(v=>v-m)}):ch.map(d=>d.slice());if(p.mode==='lufs'){const l=loudness(x,rate);if(!Number.isFinite(l))throw Error('Troppo silenzioso per misurare il volume percepito');const g=fromDb(p.lufs-l);x=mapCh(x,v=>v*g);return x}
   if(p.each)return x.map(d=>{const pk=peakOf([d]);const g=pk?fromDb(p.peak)/pk:1;return d.map(v=>v*g)});const pk=peakOf(x),g=pk?fromDb(p.peak)/pk:1;return mapCh(x,v=>v*g)},
  now:true,saysChange:true,done:(p,out,{before:b,after:a})=>p.mode==='lufs'?`Volume percepito da ${fmtNum(b.lufs,1)} a ${fmtNum(a.lufs,1)} LUFS (${signedDb(a.lufs-b.lufs)}), picco ${fmtDb(a.peak)}${a.peak>0?': ci sono distorsioni, abbassa il volume di destinazione o usa il compressore':''}`:`Picco da ${fmtDb(b.peak)} a ${fmtDb(a.peak)} (${signedDb(a.peak-b.peak)})${Number.isFinite(a.lufs)?', volume percepito '+fmtLufs(a.lufs):''}`},
 fadeIn:{label:'Dissolvenza in entrata',run:ch=>ch.map(d=>d.map((x,i)=>x*fadeCurve(i/Math.max(1,d.length-1))))},
 fadeOut:{label:'Dissolvenza in uscita',run:ch=>ch.map(d=>d.map((x,i)=>x*fadeCurve(1-i/Math.max(1,d.length-1))))},
 reverse:{label:'Al contrario',run:ch=>ch.map(d=>d.slice().reverse())},
 removeDC:{label:'Rimuovi lo spostamento continuo',run:ch=>ch.map(d=>{let m=0;for(const v of d)m+=v;m/=d.length||1;return d.map(v=>v-m)})},
 speed:{label:'Cambia la velocità',intro:'Più veloce diventa anche più acuto, più lento anche più grave, come un nastro.',fields:p=>[{id:'pct',label:'Velocità in percentuale',type:'number',min:25,max:400,step:1,value:p.pct??100,hint:'100 lascia com’è, 200 raddoppia la velocità e dimezza la durata.'}],parse:v=>({pct:num(v.pct)}),check:()=>null,
  run:(ch,rate,p)=>ch.map(d=>resampleCh(d,p.pct/100)),map:p=>x=>Math.round(x/(p.pct/100)),done:p=>`Velocità al ${p.pct}%`},
 tempo:{label:'Cambia il ritmo',intro:'Accelera o rallenta senza cambiare l’intonazione della voce: utile per il parlato.',fields:p=>[{id:'pct',label:'Ritmo in percentuale',type:'number',min:50,max:200,step:1,value:p.pct??110,hint:'110 è il 10% più veloce, 90 il 10% più lento.'}],parse:v=>({pct:num(v.pct)}),check:()=>null,
  run:(ch,rate,p)=>wsola(ch,rate,p.pct/100),map:p=>x=>Math.round(x/(p.pct/100)),done:p=>`Ritmo al ${p.pct}%`},
 eq:{label:'Equalizzatore e filtri',intro:'Bassi, medi e alti in decibel; il filtro passa-alto toglie rimbombi e colpi al microfono, il passa-basso il fruscio acuto.',
  fields:p=>[{id:'low',label:'Bassi (120 Hz)',type:'range',min:-12,max:12,step:0.5,value:p.low??0,fmt:fmtDb},{id:'mid',label:'Medi (1000 Hz)',type:'range',min:-12,max:12,step:0.5,value:p.mid??0,fmt:fmtDb},{id:'high',label:'Alti (6000 Hz)',type:'range',min:-12,max:12,step:0.5,value:p.high??0,fmt:fmtDb},{id:'hp',label:'Filtro passa-alto',type:'select',value:p.hp??'0',options:[['0','Nessuno'],['60','Sotto i 60 Hz'],['80','Sotto gli 80 Hz (voce)'],['120','Sotto i 120 Hz'],['200','Sotto i 200 Hz (telefono)']]},{id:'lp',label:'Filtro passa-basso',type:'select',value:p.lp??'0',options:[['0','Nessuno'],['16000','Sopra i 16 kHz'],['12000','Sopra i 12 kHz'],['8000','Sopra gli 8 kHz'],['3400','Sopra i 3,4 kHz (telefono)']]}],
  parse:v=>({low:Number(v.low),mid:Number(v.mid),high:Number(v.high),hp:v.hp,lp:v.lp}),
  run:(ch,rate,p)=>renderOffline(ch,rate,oc=>{const nodes=[];const bq=(type,f,gain,q)=>{const n=oc.createBiquadFilter();n.type=type;n.frequency.value=Math.min(f,rate/2-100);if(gain!==undefined)n.gain.value=gain;if(q)n.Q.value=q;nodes.push(n)};
   if(+p.hp)bq('highpass',+p.hp,undefined,0.707);if(p.low)bq('lowshelf',120,p.low);if(p.mid)bq('peaking',1000,p.mid,0.8);if(p.high)bq('highshelf',6000,p.high);if(+p.lp)bq('lowpass',+p.lp,undefined,0.707);if(!nodes.length)nodes.push(oc.createGain());for(let i=0;i<nodes.length-1;i++)nodes[i].connect(nodes[i+1]);nodes.at(-1).connect(oc.destination);return nodes[0]})},
 compressor:{label:'Compressore',now:true,intro:'Avvicina le parti forti a quelle deboli: la voce si sente in modo più uniforme.',fields:p=>[{id:'threshold',label:'Soglia in dB',type:'number',min:-60,max:0,step:1,value:p.threshold??-24,hint:'Il suono sopra la soglia viene ridotto.'},{id:'ratio',label:'Rapporto',type:'select',value:p.ratio??'3',options:[['1.5','1,5 a 1 (leggero)'],['2','2 a 1'],['3','3 a 1 (voce)'],['4','4 a 1'],['8','8 a 1 (forte)'],['20','20 a 1 (limitatore)']]},{id:'attack',label:'Attacco in millisecondi',type:'number',min:0.1,max:200,step:0.1,value:p.attack??10},{id:'release',label:'Rilascio in millisecondi',type:'number',min:5,max:2000,step:1,value:p.release??150},{id:'norm',label:'Riporta il picco a −1 dB dopo la compressione',type:'checkbox',value:p.norm??true}],
  parse:v=>({threshold:num(v.threshold),ratio:num(v.ratio),attack:num(v.attack),release:num(v.release),norm:v.norm,makeup:0}),check:()=>null,
  run:(ch,rate,p)=>{let out=compress(ch,rate,p);if(p.norm){const pk=peakOf(out),g=pk?fromDb(-1)/pk:1;out=mapCh(out,x=>x*g)}return out}},
 noiseGate:{label:'Riduzione del rumore di fondo',now:true,intro:'Il metodo spettrale toglie fruscio e ronzio costanti anche mentre si parla. Il metodo a soglia abbassa solo le pause. Per un risultato migliore seleziona un tratto di solo rumore e usa prima «Cattura il campione di rumore» dal menu della finestra.',
  fields:p=>[{id:'method',label:'Metodo',type:'select',value:p.method||'spectral',options:[['spectral','Spettrale (fruscio, ronzio, ventola)'],['gate','A soglia (abbassa le pause)']]},{id:'amount',label:'Riduzione in decibel',type:'range',min:3,max:40,step:1,value:p.amount??12,fmt:fmtDb,hint:'Valori alti tolgono più rumore ma possono rendere la voce metallica.'},{id:'sample',label:'Campione di rumore',type:'select',value:noiseSample?'sample':'auto',options:[['auto','Le parti più silenziose (automatico)'],...(noiseSample?[['sample','Il campione catturato']]:[])]},{id:'th',label:'Soglia del metodo a soglia, in dB',type:'number',min:-80,max:-10,step:1,value:p.th??Math.round(pauseThreshold())}],
  parse:v=>({method:v.method,amount:num(v.amount),sample:v.sample,th:num(v.th)}),check:()=>null,
  run:(ch,rate,p)=>p.method==='gate'?gate(ch,rate,p.th,p.amount):spectralDenoise(ch,rate,p.sample==='sample'&&noiseSample?noiseProfile(noiseSample,true):noiseProfile(ch),p.amount)},
 truncate:{label:'Accorcia le pause',intro:'Le pause più lunghe della durata indicata vengono accorciate. Le pause si riconoscono con la soglia scelta in Analisi.',fields:p=>[{id:'longer',label:'Accorcia le pause più lunghe di (secondi)',type:'number',min:0.2,max:30,step:0.1,value:p.longer??1},{id:'keep',label:'Durata delle pause accorciate (secondi)',type:'number',min:0,max:10,step:0.1,value:p.keep??0.5}],
  parse:v=>({longer:num(v.longer),keep:num(v.keep)}),check:p=>p.keep<p.longer?null:{msg:'Durata delle pause accorciate: deve essere più corta della pausa da accorciare.',field:'keep'},
  run:(ch,rate,p,ctx)=>{const list=pausesIn(ch,rate,p.longer),keep=Math.round(p.keep*rate),half=Math.floor(keep/2),cuts=list.map(([a,b])=>[a+half,b-(keep-half)]).filter(([a,b])=>b>a),fade=Math.round(rate*0.01);ctx.cuts=cuts;ctx.removed=cuts.reduce((n,[a,b])=>n+b-a,0);
   return ch.map(d=>{const parts=[];let at=0;for(const [a,b] of cuts){parts.push(d.subarray(at,a));at=b}parts.push(d.subarray(at));const o=new Float32Array(parts.reduce((n,x)=>n+x.length,0));let w=0;for(const [k,x] of parts.entries()){o.set(x,w);if(k){for(let i=0;i<fade&&w+i<o.length;i++)o[w+i]*=i/fade;for(let i=1;i<=fade&&w-i>=0;i++)o[w-i]*=i/fade}w+=x.length}return o})},
  map:(p,ctx)=>x=>{let d=0;for(const [a,b] of ctx.cuts||[]){if(x>=b)d+=b-a;else if(x>a)return a-d}return x-d},done:(p,out,ctx)=>ctx.cuts?.length?`Accorciate ${ctx.cuts.length} pause: tolti ${sayTime(ctx.removed/A.rate)}`:'Nessuna pausa abbastanza lunga da accorciare'},
 echo:{label:'Eco',fields:p=>[{id:'delay',label:'Ritardo in millisecondi',type:'number',min:20,max:3000,step:10,value:p.delay??300},{id:'decay',label:'Volume di ogni ripetizione in percentuale',type:'range',min:5,max:90,step:1,value:p.decay??40,fmt:v=>v+'%'}],parse:v=>({delay:num(v.delay),decay:num(v.decay)}),check:()=>null,
  run:(ch,rate,p)=>{const D=Math.round(p.delay/1000*rate),k=p.decay/100;return ch.map(d=>{const o=Float32Array.from(d);for(let i=D;i<o.length;i++)o[i]+=o[i-D]*k;return o})}},
 deEsser:{label:'Riduci le “s” (de-esser)',intro:'Abbassa solo le frequenze delle sibilanti, e solo quando superano la soglia: la voce resta naturale e le “s” non fischiano più.',
  fields:p=>[{id:'freq',label:'Dove cominciano le “s”',type:'select',value:String(p.freq??5000),options:[['4000','4000 hertz (voci maschili)'],['5000','5000 hertz (voce media)'],['6000','6000 hertz (voci femminili)'],['7000','7000 hertz (voci molto acute)']]},{id:'th',label:'Soglia in dB',type:'number',min:-60,max:-10,step:1,value:p.th??-30,hint:'Più alta è (per esempio −24), più spesso interviene.'},{id:'red',label:'Quanto abbassare al massimo',type:'range',min:2,max:16,step:1,value:p.red??8,fmt:v=>v+' dB'}],
  parse:v=>({freq:Number(v.freq),th:num(v.th),red:Number(v.red)}),check:p=>Number.isFinite(p.th)?null:{msg:'Soglia: scrivi un numero di decibel tra −60 e −10, per esempio −30.',field:'th'},
  run:(ch,rate,p)=>deEsser(ch,rate,{freq:p.freq,thDb:p.th,reduction:p.red}),saysChange:true,
  done:p=>`Sibilanti sopra ${fmtDb(p.th)} ridotte fino a ${p.red} dB, a partire da ${fmtInt(p.freq)} hertz`},
 deHum:{label:'Togli il ronzio (de-hum)',intro:'Toglie il ronzio della rete elettrica e le sue armoniche: 50 hertz in Italia e in Europa, 60 negli Stati Uniti.',
  fields:p=>[{id:'base',label:'Frequenza della rete',type:'select',value:String(p.base??50),options:[['50','50 hertz (Europa)'],['60','60 hertz (Stati Uniti)']]},{id:'h',label:'Quante armoniche togliere',type:'select',value:String(p.h??4),options:[['2','2 (fino a 100 hertz)'],['3','3 (fino a 150 hertz)'],['4','4 (fino a 200 hertz)']]}],
  parse:v=>({base:Number(v.base),h:Number(v.h)}),check:()=>null,run:(ch,rate,p)=>deHum(ch,rate,{base:p.base,harmonics:p.h}),saysChange:true,
  done:p=>`Ronzio a ${p.base} hertz e ${p.h-1===1?'la sua armonica':(p.h-1)+' armoniche'} tolti`},
 deClick:{label:'Togli i colpi (de-click)',intro:'Trova i colpi secchi — il tavolo, il microfono urtato, un tic — e li sostituisce con una linea fra i due campioni vicini.',
  fields:p=>[{id:'sens',label:'Sensibilità in dB',type:'number',min:4,max:30,step:1,value:p.sens??12,hint:'Più basso è, più colpi trova, e più rischio di toccare il suono.'},{id:'len',label:'Durata massima di un colpo in millisecondi',type:'number',min:1,max:20,value:p.len??5}],
  parse:v=>({sens:num(v.sens),len:num(v.len)}),check:p=>Number.isFinite(p.sens)?null:{msg:'Sensibilità: scrivi un numero di decibel tra 4 e 30.',field:'sens'},
  run:(ch,rate,p)=>deClick(ch,rate,{sensitivity:p.sens,maxMs:p.len}),saysChange:true,done:p=>`Colpi che si staccano di più di ${p.sens} dB tolti, fino a ${fmtInt(p.len)} millisecondi`},
 limiter:{label:'Limitatore',intro:'Tiene i picchi sotto il tetto scelto senza cambiare il resto: serve prima di mandare in onda o di esportare.',
  fields:p=>[{id:'ceil',label:'Tetto in dB',type:'number',min:-20,max:0,step:0.5,value:p.ceil??-1,hint:'−1 dB è il valore dei capitolati broadcast.'},{id:'rel',label:'Rilascio in millisecondi',type:'range',min:10,max:500,step:10,value:p.rel??50,fmt:v=>v+' ms'}],
  parse:v=>({ceil:num(v.ceil),rel:Number(v.rel)}),check:p=>Number.isFinite(p.ceil)&&p.ceil<=0?null:{msg:'Tetto: scrivi un numero di decibel tra −20 e 0, per esempio −1.',field:'ceil'},
  run:(ch,rate,p)=>limitSamples(ch,rate,p.ceil,p.rel).out,now:true,saysChange:true,
  done:(p,out,{before,after})=>`Picco da ${fmtDb(before.peak)} a ${fmtDb(after.peak)}, con il tetto a ${fmtDb(p.ceil)}`},
 voiceChain:{label:'Prepara la voce',intro:'La catena della voce in un solo passaggio: taglia i toni bassi, toglie il ronzio e le “s”, comprime, porta il volume al valore scelto e tiene i picchi sotto il tetto. Si può ascoltare prima di applicarla.',
  fields:p=>[{id:'hp',label:'Togli i toni bassi sotto',type:'select',value:String(p.hp??80),options:[['0','Nessuno'],['60','60 hertz'],['80','80 hertz (voce)'],['120','120 hertz']]},{id:'hum',label:'Ronzio della rete',type:'select',value:String(p.hum??50),options:[['0','Nessuno'],['50','50 hertz'],['60','60 hertz']]},{id:'ess',label:'Riduci le “s”',type:'select',value:String(p.ess??5000),options:[['0','No'],['4000','Sì, voci maschili'],['5000','Sì, voce media'],['6000','Sì, voci femminili']]},{id:'lufs',label:'Volume percepito',type:'select',value:String(p.lufs??-23),options:[['-23','−23 LUFS (radio)'],['-19','−19 LUFS (radio parlata)'],['-16','−16 LUFS (podcast)']]},{id:'tp',label:'Picco vero massimo',type:'select',value:String(p.tp??-1),options:[['-1','−1 dBTP'],['-2','−2 dBTP']]}],
  parse:v=>({hp:Number(v.hp),hum:Number(v.hum),ess:Number(v.ess),lufs:Number(v.lufs),tp:Number(v.tp)}),check:()=>null,
  run:(ch,rate,p)=>{let x=ch.map(d=>d.slice());
   if(p.hp>0){const co=biqCoef('hp',rate,p.hp,0.707);x=x.map(d=>biqRun(d,co))}
   if(p.hum>0)x=deHum(x,rate,{base:p.hum,harmonics:4});
   if(p.ess>0)x=deEsser(x,rate,{freq:p.ess,thDb:-30,reduction:8});
   x=compress(x,rate,{threshold:-20,ratio:3,attack:8,release:150,makeup:0});
   const l=loudness(x,rate);if(Number.isFinite(l))x=mapCh(x,v=>v*fromDb(p.lufs-l));
   return limitSamples(x,rate,p.tp,50).out},
  now:true,saysChange:true,
  done:(p,out,{before,after})=>`Voce preparata: ${p.hp?`sotto i ${fmtInt(p.hp)} hertz tagliato, `:''}${p.hum?`ronzio a ${p.hum} hertz tolto, `:''}${p.ess?'sibilanti ridotte, ':''}compressione, volume da ${Number.isFinite(before.lufs)?fmtNum(before.lufs,1)+' LUFS':'non misurabile'} a ${Number.isFinite(after.lufs)?fmtNum(after.lufs,1)+' LUFS':'non misurabile'}, picco ${fmtDb(after.peak)}`}};
// Parte su cui agisce un effetto: la selezione, oppure (per le dissolvenze senza selezione) dall'inizio al cursore
// o dal cursore alla fine, oppure tutto l'audio.
function effectRange(id){if(hasSel())return[A.selA,A.selB];if(id==='fadeIn'&&A.cursor>0)return[0,A.cursor];if(id==='fadeOut'&&A.cursor<alen())return[A.cursor,alen()];return[0,alen()]}
const rangeWords=([a,b])=>a===0&&b===alen()?`tutto l’audio (${sayTime(sec(b-a))})`:`il tratto da ${sayTime(sec(a))} a ${sayTime(sec(b))} (${sayTime(sec(b-a))})`;
const lastParams={};
// Ogni effetto misura il tratto prima e dopo e dice che cosa è cambiato (solo le misure cambiate); Alt+Maiusc+O poi fa
// sentire lo stesso tratto prima e dopo.
async function applyEffect(id,params={}){const fx=EFFECTS[id];if(!A.buf){toast('Nessun audio aperto');return}const [a,b]=effectRange(id);if(b<=a){toast('Il tratto è vuoto');return}const ctx={},cur=A.cursor;
 const res=await work(fx.label,async()=>{const inp=sliceCh(A.buf,a,b),before=measureCh(inp,A.rate),out=await fx.run(inp,A.rate,params,ctx);return{inp,out,before,after:measureCh(out,A.rate)}});if(!res)return;const {inp,out}=res;ctx.before=res.before;ctx.after=res.after;
 const mapPos=fx.map?.(params,ctx),whole=a===0&&b===alen(),cursor=whole?clamp(mapPos?mapPos(A.cursor):A.cursor,0,out[0].length):a;audioEdit(fx.label,a,b,out,{sel:whole&&!hasSel()?[0,0]:[a,a+out[0].length],cursor,mapPos});A.lastEffect={id,params};
 const change=changeWords(res.before,res.after),done=fx.done?.(params,out,ctx);keepCompare(fx.label,a,b,inp,out,mapPos,cur,change);
 announce(done?(change&&!fx.saysChange?`${done}. ${capital(change)}.`:done):`${fx.label} applicata a ${rangeWords([a,a+out[0].length])}${change?': '+change:''}`)}
let previewSrc=null;
function stopPreview(){try{previewSrc?.stop()}catch(e){}previewSrc=null}
// Anteprima e originale: gli stessi sei secondi, dal cursore se è dentro il tratto, altrimenti dall'inizio del tratto.
function previewSpan(id){const [a,b]=effectRange(id),s0=A.cursor>a&&A.cursor<b-A.rate*0.5?A.cursor:a;return[s0,Math.min(b,s0+Math.round(A.rate*6))]}
async function previewEffect(id,params,original=false){stopPreview();stopPlayback(false);stopCompare();const [a,b]=previewSpan(id),ctx={};try{const inp=sliceCh(A.buf,a,b),out=original?inp:await fx_run(id,inp,params,ctx),buf=makeBuffer(out,A.rate);if(!buf)return;const s=actxGet().createBufferSource();s.buffer=buf;s.connect(audioOut());s.start();previewSrc=s;announce(`${original?'Originale':'Anteprima'}: ${sayTime(buf.duration)} da ${sayTime(sec(a))}`)}catch(e){toast(e.message)}}
const fx_run=(id,ch,params,ctx)=>EFFECTS[id].run(ch,A.rate,params,ctx);
async function effectDialog(id){const fx=EFFECTS[id];if(!A.buf){toast('Nessun audio aperto');return}if(!fx.fields)return applyEffect(id,{});const range=effectRange(id),p=lastParams[id]||{};
 // Per gli effetti che cambiano il livello la finestra dice da dove si parte.
 const now=fx.now?await work('Misura dei livelli',async()=>measureCh(sliceCh(A.buf,...range),A.rate)):null;
 const r=await modal(fx.label,`${fx.intro?`<p>${esc(fx.intro)}</p>`:''}<p>Si applica a ${esc(rangeWords(range))}.${now?` Ora: ${esc(levelSentence(now))}.`:''}</p>`,fx.fields(p,rangePeak(...range)),'Applica',{buttons:[{label:'Anteprima',run:v=>previewEffect(id,fx.parse(v))},{label:'Ascolta l’originale',run:()=>previewEffect(id,null,true)}],validate:v=>fx.check?.(fx.parse(v))||null,onClose:stopPreview});
 if(!r)return;const params=fx.parse(r);lastParams[id]=params;await applyEffect(id,params)}
function repeatEffect(){if(!A.lastEffect){toast('Nessun effetto da ripetere');return}applyEffect(A.lastEffect.id,A.lastEffect.params)}
function captureNoise(){if(!needSel())return;noiseSample=sliceCh(A.buf,A.selA,A.selB);announce('Campione di rumore catturato: '+sayTime(sec(A.selB-A.selA))+'. Ora seleziona la parte da ripulire e apri Riduzione del rumore di fondo')}
// Canali e frequenza: cambiano tutto l'audio.
function toMono(){if(!A.buf)return;if(A.nch===1){toast('L’audio è già mono');return}const ch=sliceCh(A.buf,0,alen()),m=new Float32Array(alen());for(const d of ch)for(let i=0;i<m.length;i++)m[i]+=d[i]/ch.length;audioReplaceAll('Converti in mono',makeBuffer([m],A.rate));announce('Audio convertito in mono')}
function toStereo(){if(!A.buf)return;if(A.nch>=2){toast('L’audio è già stereo');return}const d=A.buf.getChannelData(0);audioReplaceAll('Converti in stereo',makeBuffer([d.slice(),d.slice()],A.rate));announce('Audio convertito in stereo: i due canali sono uguali')}
function swapChannels(){if(!A.buf)return;if(A.nch!==2){toast('Servono due canali');return}const [a,b]=effectRange('swap'),l=A.buf.getChannelData(0).slice(a,b),r=A.buf.getChannelData(1).slice(a,b);audioEdit('Scambia i canali',a,b,[r,l],{sel:hasSel()?[a,b]:[0,0],cursor:a});announce('Canali sinistro e destro scambiati')}
async function resampleDialog(){if(!A.buf)return;const r=await fieldModal('Frequenza di campionamento',`<p>Ora è di ${fmtInt(A.rate)} hertz. Il CD usa 44100, il video 48000; per la voce al telefono bastano 16000.</p>`,[{id:'rate',label:'Nuova frequenza',type:'select',value:String(A.rate),options:[8000,16000,22050,32000,44100,48000,88200,96000].map(v=>[String(v),fmtInt(v)+' Hz'])}],'Cambia');if(!r)return;const rate=Number(r.rate);if(rate===A.rate)return;const nb=await work('Cambio di frequenza',()=>resampleBuffer(A.buf,rate));if(nb){audioReplaceAll('Frequenza a '+rate+' Hz',nb);announce('Frequenza di campionamento: '+fmtInt(rate)+' hertz')}}
// Generatore: tono, onde, rumore o silenzio al cursore (o al posto della selezione).
async function generateDialog(){const r=await fieldModal('Genera un suono',`<p>Il suono viene inserito ${A.buf?(hasSel()?'al posto della selezione':'al cursore'):'in un nuovo audio'}.</p>`,[{id:'kind',label:'Tipo',type:'select',value:'sine',options:[['sine','Tono puro (sinusoide)'],['square','Onda quadra'],['saw','Onda a dente di sega'],['white','Rumore bianco'],['pink','Rumore rosa'],['silence','Silenzio']]},{id:'freq',label:'Frequenza in hertz',type:'number',min:1,max:20000,value:440,hint:'440 è il La usato per accordare.'},{id:'db',label:'Livello in dB',type:'number',min:-90,max:0,value:-12},{id:'dur',label:'Durata',type:'time',value:'5',hint:'In secondi, oppure minuti:secondi.'},...(A.buf?[]:[{id:'stereo',label:'Stereo',type:'checkbox',value:true}])],'Genera',{validate:v=>parseTime(v.dur)>0&&parseTime(v.dur)<=3600?null:{msg:'Durata non valida',field:'dur'}});
 if(!r)return;if(!A.buf){A.rate=48000;A.nch=r.stereo?2:1}const n=Math.round(parseTime(r.dur)*A.rate),amp=fromDb(clamp(num(r.db)||-12,-90,0)),f=clamp(num(r.freq)||440,1,A.rate/2)/A.rate,d=new Float32Array(n);let b0=0,b1=0,b2=0;
 for(let i=0;i<n;i++){const ph=(i*f)%1;let v=0;switch(r.kind){case 'sine':v=Math.sin(2*Math.PI*ph);break;case 'square':v=ph<0.5?1:-1;break;case 'saw':v=2*ph-1;break;case 'white':v=Math.random()*2-1;break;case 'pink':{const w=Math.random()*2-1;b0=0.99765*b0+w*0.099046;b1=0.963*b1+w*0.2965164;b2=0.57*b2+w*1.0526913;v=(b0+b1+b2+w*0.1848)*0.2;break}}d[i]=v*amp}
 const fade=Math.min(n>>1,Math.round(A.rate*0.005));if(r.kind!=='silence')for(let i=0;i<fade;i++){d[i]*=i/fade;d[n-1-i]*=i/fade}
 const ins=Array.from({length:A.nch},()=>d.slice()),a=hasSel()?A.selA:A.cursor,b=hasSel()?A.selB:A.cursor;audioEdit('Genera suono',a,b,ins);if(alen()===n)zoomFitAudio();announce(`Generati ${sayTime(n/A.rate)} di suono: ora sono selezionati`)}
async function insertSilenceDialog(){const r=await fieldModal('Inserisci silenzio',`<p>Il silenzio viene inserito al cursore, a ${esc(fmtTime(sec(A.cursor)))}.</p>`,[{id:'dur',label:'Durata',type:'time',value:'1',hint:'In secondi, oppure minuti:secondi.'}],'Inserisci',{validate:v=>parseTime(v.dur)>0?null:{msg:'Durata non valida',field:'dur'}});if(!r)return;if(!A.buf)A.nch=A.nch||2;const n=Math.round(parseTime(r.dur)*A.rate);audioEdit('Inserisci silenzio',A.cursor,A.cursor,Array.from({length:A.nch},()=>new Float32Array(n)));announce('Inseriti '+sayTime(n/A.rate)+' di silenzio')}
// Analisi: statistiche, livello al cursore e distorsioni (campioni al fondo scala).
async function audioStats(){if(!A.buf){toast('Nessun audio aperto');return}const [a,b]=hasSel()?[A.selA,A.selB]:[0,alen()],res=await work('Analisi',()=>{const ch=sliceCh(A.buf,a,b),rows=[],per=ch.map(d=>{let pk=0,s=0,m=0,clip=0;for(const x of d){const v=Math.abs(x);if(v>pk)pk=v;s+=x*x;m+=x;if(v>=0.999)clip++}return{pk,rms:Math.sqrt(s/(d.length||1)),dc:m/(d.length||1),clip}});return{per,lufs:loudness(ch,A.rate)}});if(!res)return;
const names=A.nch===2?['sinistro','destro']:A.nch===1?['mono']:[],clip=res.per.reduce((n,p)=>n+p.clip,0),pk=Math.max(...res.per.map(p=>p.pk));
 const dd=(k,v)=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
 const pkDb=toDb(pk),pkTxt=Number.isFinite(pkDb)?`${Math.round(pkDb)} dB`:'silenzio',lufsTxt=Number.isFinite(res.lufs)?`${Math.round(res.lufs)} LUFS`:'troppo silenzioso per misurarlo';
 await modal('Statistiche del suono',`<p id="statSum">Durata ${esc(sayTime(sec(b-a)))}; picco massimo ${pkTxt}; volume percepito ${lufsTxt}.</p><p>Valori per ${esc(rangeWords([a,b]))}.</p><dl class="stats">${dd('Durata',fmtTime(sec(b-a))+' ('+sayTime(sec(b-a))+')')}${dd('Formato',`${chName()}, ${fmtInt(A.rate)} Hz`)}${dd('Picco massimo',fmtDb(toDb(pk))+' — '+levelWords(toDb(pk)))}${dd('Volume percepito',Number.isFinite(res.lufs)?fmtNum(res.lufs,1)+' LUFS':'troppo silenzioso per misurarlo')}${res.per.map((p,i)=>dd('Canale '+(names[i]||i+1),`picco ${fmtDb(toDb(p.pk))}, volume medio ${fmtDb(toDb(p.rms))}, DC ${fmtNum(p.dc*100,2)}%`)).join('')}${dd('Distorsioni (campioni al fondo scala)',clip?fmtInt(clip)+': usa Trova la prossima distorsione':'nessuna')}${dd('Marcatori',String(A.markers.length))}</dl>`,[],'Chiudi',{noCancel:true,describedBy:'statSum'})}
function readLevel(){if(!A.buf){toast('Nessun audio aperto');return}const pos=aplay.playing?playPos():A.cursor,l=levelAt(pos,Math.round(A.rate*0.25));announce(`Livello intorno al cursore: ${levelWords(l.peak)}, picco ${fmtDb(l.peak)}, medio ${fmtDb(l.rms)}`)}
function findClip(){if(!A.buf)return;const L=alen();for(let i=A.cursor+1;i<L;i++){let hit=false;for(let c=0;c<A.nch;c++)if(Math.abs(A.buf.getChannelData(c)[i])>=0.999){hit=true;break}if(hit){let j=i;while(j<L&&[...Array(A.nch).keys()].some(c=>Math.abs(A.buf.getChannelData(c)[j])>=0.999))j++;setSelection(i,j,{announceIt:false});announce(`Distorsione a ${sayTime(sec(i),2)}: ${fmtInt(j-i)} campioni al fondo scala, ora selezionati`);return}}toast('Nessuna distorsione dopo il cursore')}
async function pauseSettings(){const cur=prefs.pauseDb==='auto'?'auto':String(prefs.pauseDb);const r=await fieldModal('Soglia delle pause',`<p>Le pause servono a Ctrl+frecce, ai marcatori automatici, ad Accorcia le pause e al doppio clic. Con la soglia automatica si parte dal rumore di fondo del file${A.buf?`: ora vale ${fmtDb(pauseThreshold())}`:''}.</p>`,[{id:'db',label:'Soglia',type:'select',value:cur,options:[['auto','Automatica'],...[-60,-55,-50,-45,-40,-35,-30,-25,-20].map(v=>[String(v),fmtDb(v)])]},{id:'min',label:'Durata minima di una pausa (secondi)',type:'number',min:0.05,max:10,step:0.05,value:prefs.minPause||0.3}],'Salva');
 if(!r)return;prefs.pauseDb=r.db==='auto'?'auto':Number(r.db);prefs.minPause=clamp(num(r.min)||0.3,0.05,10);savePrefs();pauseCache=null;announce(A.buf?`Trovate ${getPauses().list.length} pause`:'Impostazioni salvate')}
async function markersFromPauses(){if(!A.buf){toast('Nessun audio aperto');return}const starts=getPauses().list.filter(p=>p.b<alen()).map(p=>p.b),fresh=starts.filter(s=>!A.markers.some(m=>Math.abs(m.pos-s)<A.rate*0.5));if(!fresh.length){toast('Nessuna pausa nuova trovata: prova a cambiare la soglia in Analisi');return}
 if(!(await confirmAction(`Aggiungo ${fresh.length} marcatori, uno all’inizio di ogni parte che segue una pausa?`,'Aggiungi')))return;let n=A.markers.length;metaEdit('Marcatori sulle pause',()=>{for(const s of fresh)A.markers.push({id:uid(),pos:s,label:'Parte '+(++n)});A.markers.sort((a,b)=>a.pos-b.pos)});paneSet('markPane','open',{say:false});announce(fresh.length+' marcatori aggiunti')}
// Esportazione: il brano (tutte le tracce mixate), la regione nell'editor o la sua selezione. WAV sempre,
// M4A (AAC) e WebM (Opus) se il browser sa codificarli; nel WAV del brano i marcatori delle regioni diventano cue.
// ——— Consegna in onda. Un preset mette insieme formato, frequenza, numero di canali, volume percepito e picco
// vero; poi il file viene misurato e il report dice, a parole, se rispetta quello che è stato chiesto.
const DELIVERY={
 manual:{label:'Manuale: scegli tu formato e volume',rate:'',bits:'',lufs:'none',tp:'none',ch:'auto',dither:false,bwf:false},
 radio:{label:'Radio EBU R128: WAV 24 bit 48 kHz, −23 LUFS, picco vero −1 dBTP',rate:'48000',bits:'wav24',lufs:'-23',tp:'-1',ch:'auto',dither:false,bwf:true},
 podcast:{label:'Podcast e web: WAV 24 bit 48 kHz, −16 LUFS, picco vero −1 dBTP',rate:'48000',bits:'wav24',lufs:'-16',tp:'-1',ch:'auto',dither:false,bwf:true},
 streaming:{label:'Streaming: WAV 24 bit 48 kHz, −14 LUFS, picco vero −1 dBTP',rate:'48000',bits:'wav24',lufs:'-14',tp:'-1',ch:'auto',dither:false,bwf:false},
 cd:{label:'CD e archivio: WAV 16 bit 44,1 kHz con dither, senza normalizzazione',rate:'44100',bits:'wav16',lufs:'none',tp:'none',ch:'2',dither:true,bwf:false}};
const LUFS_CHOICES=[['none','Nessuna normalizzazione'],['-23','−23 LUFS (radio, EBU R128)'],['-19','−19 LUFS (radio parlata)'],['-16','−16 LUFS (podcast)'],['-14','−14 LUFS (streaming)']];
const TP_CHOICES=[['none','Nessun limite'],['-1','−1 dBTP (broadcast)'],['-2','−2 dBTP (con margine)']];
// Guadagno applicato sul posto, campione per campione.
function gainBuffer(buf,g){if(!Number.isFinite(g)||!g||g===1)return buf;for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=g}return buf}
// Limitatore con attacco immediato e rilascio di 50 ms: abbassa solo i picchi sopra il tetto e poi torna su.
// Il tetto è sul picco dei campioni; chi chiama controlla il picco vero e, se serve, abbassa ancora un poco.
function limitBuffer(buf,ceilingDb){const ceil=fromDb(ceilingDb),n=buf.length,ch=Array.from({length:buf.numberOfChannels},(_,c)=>buf.getChannelData(c)),rel=Math.exp(-1/(buf.sampleRate*0.05));let env=1,hit=0;
 for(let i=0;i<n;i++){let p=0;for(const d of ch){const v=d[i]<0?-d[i]:d[i];if(v>p)p=v}const t=p>ceil?ceil/p:1;env=t<env?t:Math.min(t,env+(1-env)*rel);
  if(env<0.999){hit++;for(const d of ch)d[i]*=env}}
 return hit>0}
// Prepara la copia da esportare: canali, frequenza, volume percepito e picco vero. Non tocca l'audio del progetto.
async function prepareDelivery(buf,plan,progress=()=>{}){let out=makeBuffer(Array.from({length:buf.numberOfChannels},(_,c)=>buf.getChannelData(c).slice()),buf.sampleRate);
 if(plan.ch&&out.numberOfChannels!==plan.ch){progress('Conversione dei canali…');out=channelBuffer(out,plan.ch)}
 if(plan.rate&&out.sampleRate!==plan.rate){progress('Conversione della frequenza…');out=await resampleBuffer(out,plan.rate)}
 let limited=false;
 if(plan.lufs!==null||plan.tp!==null){const chans=()=>Array.from({length:out.numberOfChannels},(_,c)=>out.getChannelData(c));
  if(plan.lufs!==null){progress('Misura del volume percepito…');const m=measureCh(chans(),out.sampleRate);if(Number.isFinite(m.lufs))gainBuffer(out,fromDb(plan.lufs-m.lufs))}
  if(plan.tp!==null){progress('Controllo del picco vero…');limited=limitBuffer(out,plan.tp);
   const tp=truePeakDb(chans(),out.sampleRate);if(tp>plan.tp+0.02)gainBuffer(out,fromDb(plan.tp-tp))}}
 return{out,limited}}
// I marcatori da scrivere nel WAV: quelli del brano, oppure quelli della regione spostati all'inizio dell'esportazione.
function deliveryMarkers(what,base,end,rate){if(what==='song')return songMarkers(rate);const k=rate/A.rate;
 return A.markers.filter(m=>m.pos>=base&&m.pos<=end).map(m=>({id:m.id,pos:Math.round((m.pos-base)*k),label:m.label}))}
function deliveryFormatLabel(fmt,ch,rate,dither,kbps){const bits=fmt==='mp3'?`MP3 ${fmtInt(kbps||192)} kbps`:fmt.startsWith('wav')?`WAV ${fmt.slice(3)} bit${fmt==='wav16'&&dither?' con dither':''}`:CODECS[fmt].label;
 return `${bits}, ${fmtInt(rate)} hertz, ${ch===1?'mono':'stereo'}`}
// Righe del report: le stesse che si leggono nella finestra e che finiscono nel file di testo da allegare.
const fmtDbTp=d=>Number.isFinite(d)?fmtNum(d,1)+' dBTP':'non misurabile';
function deliveryReportData({name,fmtLabel,content,m,limited,plan,compressed,note,meta}){const lufs=Number.isFinite(m.lufs)?fmtNum(m.lufs,1)+' LUFS':'non misurabile';
 const rows=[['File',name],['Data',new Date().toLocaleString('it-IT')],['Contenuto',content],['Durata',`${fmtTime(m.dur)} (${sayTime(m.dur)})`],['Formato',fmtLabel],
  ['Volume percepito',lufs],['Picco vero',fmtDbTp(m.truePeak)],['Picco dei campioni',fmtDb(m.peak)],['Range di volume (LRA)',fmtNum(m.lra,1)+' LU'],
  ['Rumore di fondo',fmtDb(m.floor)],['Campioni al fondo scala',m.clip?fmtInt(m.clip):'nessuno'],['Limitatore',limited?'intervenuto sui picchi':'non è intervenuto'],...(meta?[['Metadati',meta]]:[])];
 const checks=[];
 if(plan.lufs!==null&&Number.isFinite(m.lufs))checks.push(Math.abs(m.lufs-plan.lufs)<=0.5?`volume conforme a ${fmtNum(plan.lufs,0)} LUFS`:`volume fuori di ${fmtNum(Math.abs(m.lufs-plan.lufs),1)} LU rispetto a ${fmtNum(plan.lufs,0)} LUFS`);
 if(plan.tp!==null)checks.push(m.truePeak<=plan.tp+0.05?`picco vero entro ${fmtNum(plan.tp,0)} dBTP`:`picco vero oltre ${fmtNum(plan.tp,0)} dBTP`);
 const lufsSpoken=Number.isFinite(m.lufs)?Math.round(m.lufs)+' LUFS':'non misurabile',tpSpoken=Number.isFinite(m.truePeak)?Math.round(m.truePeak)+' dBTP':'non misurabile',
  summary=`${sayTime(m.dur)}, ${lufsSpoken}, picco vero ${tpSpoken}.`+(checks.length?' '+capital(checks.join(' e '))+'.':'');
 const noteFinal=note||(compressed?'Le misure sono fatte sul mix prima della codifica: il file compresso può cambiarle di poco.':'Le misure valgono il file esportato.');
 const text=rows.map(([k,v])=>k+': '+v).join('\n')+'\n'+(checks.length?'Esito: '+checks.join('; ')+'\n':'')+(noteFinal?noteFinal+'\n':'');
 return{name,rows,summary,note:noteFinal,text}}
function showDeliveryReport(rep){const html=rep.rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
 return modal('Report di consegna',`<p id="dlvSum">${esc(rep.summary)}</p><dl class="stats">${html}</dl><p>${esc(rep.note)}</p>`,[],'Chiudi',{noCancel:true,wide:true,describedBy:'dlvSum',
  buttons:[{label:'Salva il report',run:()=>{download(rep.text,extName(rep.name+' - report','txt'),'text/plain');announce('Report di consegna salvato come file di testo')}}]})}
// Comando Alt+Maiusc+R: misura quello che c'è (selezione, regione o brano) senza esportare nulla.
async function deliveryReportDialog(){const inEditor=!!A.buf;
 if(!A.buf&&!P.regions.length){toast('Non c’è audio da misurare: apri una regione o importa un file');return}
 const sel=inEditor&&hasSel();const res=await work('Misure di consegna',async()=>{
  let src,content,plan={lufs:null,tp:null,ch:0,rate:0};
  if(inEditor){const [a,b]=sel?[A.selA,A.selB]:[0,alen()];src=makeBuffer(sliceCh(A.buf,a,b),A.rate);
   content=`${sel?'La selezione':'La regione'}${A.region?` «${regionOf(A.region)?.name||''}»`:''}`;plan={...plan,ch:src.numberOfChannels,rate:src.sampleRate}}
  else{status('Mixaggio del brano…');src=await renderMix({tail:true});content='Il brano, tutte le tracce mixate';plan={...plan,ch:2,rate:src.sampleRate}}
  const chs=Array.from({length:src.numberOfChannels},(_,c)=>src.getChannelData(c));
  return{ch:src.numberOfChannels,rate:src.sampleRate,m:analyzeDelivery(chs,src.sampleRate),content,plan}});
 if(!res)return;
 const name=inEditor?(A.title||P.title):P.title,rep=deliveryReportData({name:name,fmtLabel:`${res.ch===1?'mono':'stereo'}, ${fmtInt(res.rate)} hertz`,content:res.content,m:res.m,limited:false,plan:res.plan,compressed:false,note:'Nessun file esportato: la misura è fatta sull’audio del progetto.'});
 await showDeliveryReport(rep)}

// Il preset scelto nella finestra imposta formato, frequenza, canali, volume e metadati; i campi restano modificabili.
function bindDeliveryPreset(pane,opts){const pick=id=>pane.querySelector('#dlg_'+id),set=(id,v)=>{const el=pick(id);if(el&&String(el.value)!==String(v))el.value=String(v)};
 const sel=pick('preset');if(!sel)return;
 sel.addEventListener('change',e=>{const d=DELIVERY[e.target.value]||DELIVERY.manual;
  if(d.bits&&opts.some(o=>o[0]===d.bits))set('fmt',d.bits);
  set('rate',d.rate||'auto');set('ch',d.ch||'auto');set('lufs',d.lufs);set('tp',d.tp);
  const dh=pick('dither');if(dh)dh.checked=!!d.dither;const bh=pick('bwf');if(bh)bh.checked=!!d.bwf;announce(d.label)})}
async function exportAudioDialog(){const song=P.regions.length>0;if(!song&&!A.buf){toast('Il progetto è vuoto: niente da esportare');return}if(song&&!A.buf)midiExportNote();const [aac,opus]=await Promise.all([codecSupported('aac'),codecSupported('opus')]);
 const opts=[['wav16','WAV 16 bit (qualità CD, per tutti i programmi)'],['wav24','WAV 24 bit (per altri programmi professionali)'],['wav32','WAV 32 bit in virgola mobile (senza perdite)'],['mp3','MP3 (per playout, telefonini e archivio)'],...(aac?[['aac','M4A con AAC (compresso, per telefoni e messaggi)']]:[]),...(opus?[['opus','WebM con Opus (compresso, molto leggero)']]:[])];
 const what=[...(song?[['song',`Il brano: tutte le tracce mixate (${fmtTime(projDur(),1)})`]]:[]),...(A.buf?[['region','Solo la regione nell’editor'+(A.region?` «${regionOf(A.region)?.name||''}»`:'')]]:[]),...(A.buf&&hasSel()?[['sel','Solo la selezione nell’editor']]:[])];
 const fmt=opts.some(o=>o[0]===prefs.audioFormat)?prefs.audioFormat:'wav16';
 const r=await fieldModal('Esporta l’audio',`<p>La consegna mette insieme formato, frequenza, canali e volume; i campi si possono cambiare uno per uno. I formati WAV conservano i marcatori. ${aac||opus?'I formati compressi sono più leggeri ma perdono un po’ di qualità.':'Questo browser non sa creare file compressi: per M4A usa Chrome o Edge recenti.'}</p>`,[
  {id:'preset',label:'Consegna',type:'select',value:prefs.delivery||'manual',options:Object.entries(DELIVERY).map(([k,v])=>[k,v.label]),hint:'Il preset imposta i campi sotto; puoi cambiarli prima di esportare.'},
  {id:'what',label:'Che cosa esportare',type:'select',value:what[0][0],options:what},
  {id:'fmt',label:'Formato',type:'select',value:fmt,options:opts},
  {id:'rate',label:'Frequenza',type:'select',value:prefs.deliveryRate||'auto',options:[['auto','Come la sorgente'],['44100','44100 Hz (CD)'],['48000','48000 Hz (radio e video)']]},
  {id:'ch',label:'Canali',type:'select',value:prefs.deliveryCh||'auto',options:[['auto','Come la sorgente'],['1','Mono'],['2','Stereo']],hint:'Molti playout accettano la voce solo in mono.'},
  {id:'lufs',label:'Volume percepito',type:'select',value:prefs.deliveryLufs||'none',options:LUFS_CHOICES,hint:'Il volume viene portato al valore scelto prima di esportare.'},
  {id:'tp',label:'Picco vero massimo',type:'select',value:prefs.deliveryTp||'-1',options:TP_CHOICES,hint:'−1 dBTP è il tetto dei capitolati broadcast.'},
  {id:'dither',label:'Dither sui 16 bit',type:'checkbox',value:!!prefs.dither,hint:'Un rumore di un bit che serve quando si scende da 24 a 16 bit.'},
  {id:'report',label:'Mostra il report di consegna dopo l’esportazione',type:'checkbox',value:prefs.report!==false},
  {id:'kbps',label:'Qualità dei formati compressi',type:'select',value:String(prefs.kbps||160),options:[['96','96 kbps (voce)'],['128','128 kbps'],['160','160 kbps'],['192','192 kbps (musica)'],['256','256 kbps'],['320','320 kbps (il massimo per l’MP3)']]},
  {id:'artist',label:'Autore o emittente',value:prefs.artist||'',hint:'Finisce nei metadati: BWF per i WAV, ID3 per gli MP3, i tag del file per gli M4A.'},
  {id:'comment',label:'Descrizione',value:prefs.comment||'',hint:'Per esempio «Servizio del 15 novembre, primo blocco».'},
  {id:'bwf',label:'Metadati broadcast (BWF) nei WAV',type:'checkbox',value:prefs.bwf!==false,hint:'Descrizione, autore, data e i valori di volume che i playout mostrano in scaletta.'},
  {id:'name',label:'Nome del file',value:song?P.title:A.title||P.title}],'Esporta',{onOpen:pane=>bindDeliveryPreset(pane,opts)});
 if(!r)return;prefs.audioFormat=r.fmt;prefs.kbps=Number(r.kbps);prefs.delivery=r.preset;prefs.deliveryRate=r.rate;prefs.deliveryCh=r.ch;prefs.deliveryLufs=r.lufs;prefs.deliveryTp=r.tp;prefs.dither=r.dither;prefs.report=r.report;prefs.artist=r.artist.trim();prefs.comment=r.comment.trim();prefs.bwf=r.bwf;savePrefs();
 const plan={rate:r.rate==='auto'?0:Number(r.rate),ch:r.ch==='auto'?0:Number(r.ch),lufs:r.lufs==='none'?null:Number(r.lufs),tp:r.tp==='none'?null:Number(r.tp)};
 const bitrate=Number(r.kbps)*1000,progress=p=>status(`Esportazione ${Math.round(p*100)}%`),ext=r.fmt==='mp3'?'mp3':r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext;
 const title=r.name||(r.what==='song'?P.title:A.title||P.title),tags={title:title.trim().slice(0,200),artist:r.artist.trim(),comment:r.comment.trim(),year:String(new Date().getFullYear())};
 const res=await work('Preparazione della consegna',async()=>{let src,content,base=0;
  if(r.what==='song'){const rr=plan.rate||48000;status('Mixaggio del brano…');src=await renderMix({rate:rr,tail:true});content=`Il brano, ${P.tracks.length===1?'una traccia':P.tracks.length+' tracce'} mixate`}
  else{const [a,b]=r.what==='sel'?[A.selA,A.selB]:[0,alen()];src=makeBuffer(sliceCh(A.buf,a,b),A.rate);base=a;content=r.what==='sel'?'La selezione nell’editor':'La regione nell’editor'+(A.region?` «${regionOf(A.region)?.name||''}»`:'')}
  const prep=await prepareDelivery(src,plan,status),out=prep.out,chs=Array.from({length:out.numberOfChannels},(_,c)=>out.getChannelData(c));
  status('Misure di consegna…');const m=analyzeDelivery(chs,out.sampleRate),name=extName(r.name||(r.what==='song'?P.title:A.title||P.title),ext);
  const markers=r.fmt.startsWith('wav')?deliveryMarkers(r.what,base,base+src.length,out.sampleRate):[];
  let blob,meta;
  if(r.fmt==='mp3'){status('Codifica MP3…');blob=await mp3Blob(out,bitrate/1000,tags,progress);meta='ID3v2.3 con titolo, autore e descrizione'}
  else if(r.fmt.startsWith('wav')){const bex=r.bwf?{description:r.comment.trim()||tags.title,originator:r.artist.trim()||'Tassello Media',reference:name,date:new Date(),loudness:{value:m.lufs,range:m.lra,truePeak:m.truePeak},codingHistory:`A=PCM,F=${out.sampleRate},W=${r.fmt.slice(3)},M=${out.numberOfChannels===1?'mono':'stereo'},T=Tassello Media {{VERSIONE}}`}:null;
   blob=wavBlob(out,Number(r.fmt.slice(3)),markers,0,out.length,{dither:r.dither&&r.fmt==='wav16',bext:bex});meta=bex?'BWF bext con descrizione, autore e valori di volume':'nessuno'}
  else{blob=await compressedBlob(out,r.fmt,bitrate,progress,tags);meta=r.fmt==='aac'?'titolo, autore e descrizione nei tag del file':'il WebM non porta metadati'}
  return{blob,name,m,limited:prep.limited,content,meta,fmtLabel:deliveryFormatLabel(r.fmt,out.numberOfChannels,out.sampleRate,r.dither,bitrate/1000),plan,compressed:!r.fmt.startsWith('wav')}});
 if(!res)return;
 download(res.blob,res.name);if(r.what==='song'){P.exported=P.version;schedulePersist('audio')}
 toast(`Esportato ${res.name} (${fmtBytes(res.blob.size)})`);
 if(r.report)await showDeliveryReport(deliveryReportData(res))}
async function audioBlob(fmt,a,b,bitrate,progress){if(fmt.startsWith('wav'))return wavBlob(A.buf,Number(fmt.slice(3)),A.markers,a,b);const part=a===0&&b===alen()?A.buf:makeBuffer(sliceCh(A.buf,a,b),A.rate);return compressedBlob(part,fmt,bitrate,progress)}
async function exportParts(){if(!A.buf){toast('Apri prima una regione nell’editor: le parti vanno da un suo marcatore al successivo');return}if(!A.markers.length){toast('Servono dei marcatori: ogni parte va da un marcatore al successivo');return}const cuts=[...new Set([0,...A.markers.map(m=>m.pos),alen()])].sort((x,y)=>x-y).filter(p=>p>=0&&p<=alen()),parts=[];for(let i=0;i<cuts.length-1;i++)if(cuts[i+1]-cuts[i]>A.rate*0.05)parts.push([cuts[i],cuts[i+1]]);
 const r=await fieldModal('Esporta le parti tra i marcatori',`<p>${parts.length} parti, raccolte in un archivio ZIP. Ogni file prende il nome del marcatore da cui comincia.</p>`,[{id:'fmt',label:'Formato',type:'select',value:prefs.audioFormat?.startsWith('wav')?prefs.audioFormat:'wav16',options:[['wav16','WAV 16 bit'],['wav24','WAV 24 bit'],['wav32','WAV 32 bit in virgola mobile'],...((await codecSupported('aac'))?[['aac','M4A con AAC']]:[]),...((await codecSupported('opus'))?[['opus','WebM con Opus']]:[])]}],'Esporta');if(!r)return;
 const files=await work('Esportazione delle parti',async()=>{const out=[];for(const [i,[a,b]] of parts.entries()){status(`Esportazione della parte ${i+1} di ${parts.length}`);const m=A.markers.find(x=>x.pos===a),blob=await audioBlob(r.fmt,a,b,(prefs.kbps||160)*1000);out.push({name:extName(`${String(i+1).padStart(2,'0')} ${m?.label||A.title}`,r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext),data:blob})}return out});if(!files)return;
 const zip=await work('Creazione dell’archivio',()=>zipBlob(files));if(zip){download(zip,extName(A.title+' - parti','zip'));toast(`Esportate ${files.length} parti in un archivio ZIP`)}}
