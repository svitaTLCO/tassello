// Scontorno. «Togli lo sfondo» sceglie il soggetto con algoritmi classici, senza rete e senza modelli scaricati.
// Con un fondo uniforme (un prodotto su un telo, un oggetto su un tavolo chiaro) basta il colore del bordo, esteso come
// con la bacchetta; altrimenti GrabCut (Rother, Kolmogorov e Blake): due modelli di colore, soggetto e sfondo, e un
// taglio minimo su un grafo dei pixel che separa i due tenendo il confine dove il colore cambia. Si calcola su una
// copia ridotta della foto originale, a pezzi sul thread principale con l'avanzamento annunciato; il bordo si rifinisce
// poi con il filtro guidato alla misura dell'anteprima o dell'esportazione. I tratti «tieni» e «togli» correggono.
// Nella ricetta: cut={method, box (riquadro del soggetto, quattro punti in unità), keep e drop (tratti), edge (bordo
// da netto a morbido), raster (id della maschera calcolata), bg (none, color o blur), color, blur}.
const CUT_PIXELS=360000,CUT_METHODS={auto:'Automatico',uniform:'Fondo uniforme',grabcut:'Soggetto nel riquadro (GrabCut)'},CUT_BG={none:'Trasparente',color:'Colore pieno',blur:'Foto sfocata'};
const newCut=()=>({method:'auto',box:null,keep:[],drop:[],edge:50,raster:null,used:'',bg:'none',color:'#ffffff',blur:40});
// Lavori lunghi a pezzi: il generatore si ferma spesso e si riprende al giro dopo, così la pagina resta viva; i numeri
// che restituisce sono l'avanzamento, scritto nella barra di stato e annunciato ogni pochi secondi.
async function runChunks(gen,label){let r,pct=0,said=Date.now();status(label+'…');document.body.style.cursor='progress';
 try{for(;;){const t=performance.now();do{r=gen.next();if(typeof r.value==='number')pct=r.value}while(!r.done&&performance.now()-t<28);if(r.done)return r.value;
  status(`${label}: ${fmtPct(pct)}`);if(Date.now()-said>3500){said=Date.now();announce(`${label}: ${fmtPct(pct)}`)}await new Promise(res=>setTimeout(res,0))}}
 finally{document.body.style.cursor='';status()}}
// Flusso massimo (Boykov e Kolmogorov) su una griglia con 8 vicini. Due alberi crescono dalla sorgente (il soggetto) e
// dal pozzo (lo sfondo) finché si toccano; si spinge il flusso lungo il percorso trovato e i nodi rimasti senza genitore
// si riattaccano o tornano liberi. Alla fine i pixel dell'albero della sorgente sono il soggetto.
// cap: capacità residue, 8 per nodo (direzione k verso il vicino; la direzione opposta è k^4); tr: capacità verso i
// terminali, positiva dalla sorgente, negativa verso il pozzo. tree riceve 1 (sorgente), 2 (pozzo) o 0 (libero).
const NB_DX=[1,1,0,-1,-1,-1,0,1],NB_DY=[0,1,1,1,0,-1,-1,-1];
function* maxflow(w,h,cap,tr,tree){const n=w*h,OFF=NB_DX.map((dx,k)=>dx+NB_DY[k]*w),TERM=8,ORPH=9,NONE=10,par=new Uint8Array(n).fill(NONE),ts=new Int32Array(n),dist=new Int32Array(n),act=new Uint8Array(n),Q=new Int32Array(n),vm=new Uint8Array(n);
 let qh=0,qn=0,time=0,ops=0;const push=p=>{if(act[p])return;act[p]=1;Q[(qh+qn)%n]=p;qn++};
 for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++){let b=0;for(let k=0;k<8;k++){const X=x+NB_DX[k],Y=y+NB_DY[k];if(X>=0&&X<w&&Y>=0&&Y<h)b|=1<<k}vm[p]=b;tree[p]=0;if(tr[p]>0){tree[p]=1;par[p]=TERM;dist[p]=1;push(p)}else if(tr[p]<0){tree[p]=2;par[p]=TERM;dist[p]=1;push(p)}}
 const orph=[];
 for(;;){let s=-1,t=-1,mid=-1,rev=-1;
  // Crescita: dal primo nodo attivo si guardano i vicini raggiungibili con capacità residua.
  while(qn){const p=Q[qh],tp=tree[p];if(!tp){act[p]=0;qh=(qh+1)%n;qn--;continue}const vb=vm[p];
   for(let k=0;k<8;k++){if(!(vb>>k&1))continue;const q=p+OFF[k],c=tp===1?cap[p*8+k]:cap[q*8+(k^4)];if(c<=0)continue;const tq=tree[q];
    if(!tq){tree[q]=tp;par[q]=k^4;ts[q]=ts[p];dist[q]=dist[p]+1;push(q)}
    else if(tq!==tp){if(tp===1){s=p;t=q;mid=p*8+k;rev=q*8+(k^4)}else{s=q;t=p;mid=q*8+(k^4);rev=p*8+k}break}
    else if(ts[q]<=ts[p]&&dist[q]>dist[p]){par[q]=k^4;ts[q]=ts[p];dist[q]=dist[p]+1}}
   if(s>=0)break;act[p]=0;qh=(qh+1)%n;qn--;if(++ops>=4000){ops=0;yield}}
  if(s<0)return;time++;
  // Aumento: la capacità minima lungo il percorso passa da una parte all'altra; chi perde l'arco verso il genitore è orfano.
  let f=cap[mid];for(let u=s;;){const k=par[u];if(k===TERM){if(tr[u]<f)f=tr[u];break}const v=u+OFF[k],c=cap[v*8+(k^4)];if(c<f)f=c;u=v}
  for(let u=t;;){const k=par[u];if(k===TERM){if(-tr[u]<f)f=-tr[u];break}const c=cap[u*8+k];if(c<f)f=c;u+=OFF[k]}
  cap[mid]-=f;cap[rev]+=f;
  for(let u=s;;){const k=par[u];if(k===TERM){tr[u]-=f;if(!tr[u]){par[u]=ORPH;orph.push(u)}break}const v=u+OFF[k],a=v*8+(k^4);cap[a]-=f;cap[u*8+k]+=f;if(!cap[a]){par[u]=ORPH;orph.push(u)}u=v}
  for(let u=t;;){const k=par[u];if(k===TERM){tr[u]+=f;if(!tr[u]){par[u]=ORPH;orph.push(u)}break}const v=u+OFF[k],a=u*8+k;cap[a]-=f;cap[v*8+(k^4)]+=f;if(!cap[a]){par[u]=ORPH;orph.push(u)}u=v}
  // Adozione: ogni orfano cerca nello stesso albero un vicino collegato davvero a un terminale, il più vicino possibile.
  for(let oi=0;oi<orph.length;oi++){const p=orph[oi],tp=tree[p],vb=vm[p];let best=-1,dmin=1e9;
   for(let k=0;k<8;k++){if(!(vb>>k&1))continue;const q=p+OFF[k];if(tree[q]!==tp)continue;if((tp===1?cap[q*8+(k^4)]:cap[p*8+k])<=0)continue;
    let d=0,u=q,ok=true;for(;;){if(ts[u]===time){d+=dist[u];break}const a=par[u];d++;if(a===TERM){ts[u]=time;dist[u]=1;break}if(a>=ORPH){ok=false;break}u+=OFF[a]}
    if(!ok)continue;if(d<dmin){dmin=d;best=k}for(let u2=q,dd=d;ts[u2]!==time;u2+=OFF[par[u2]]){ts[u2]=time;dist[u2]=dd--}}
   if(best>=0){par[p]=best;ts[p]=time;dist[p]=dmin+1}
   else{for(let k=0;k<8;k++){if(!(vb>>k&1))continue;const q=p+OFF[k];if(tree[q]!==tp)continue;if((tp===1?cap[q*8+(k^4)]:cap[p*8+k])>0)push(q);const a=par[q];if(a<TERM&&q+OFF[a]===p){par[q]=ORPH;orph.push(q)}}tree[p]=0;par[p]=NONE}
   if(++ops>=4000){ops=0;yield}}
  orph.length=0}}
// Modelli di colore: K gaussiane in RGB con covarianza piena e una varianza minima, per il rumore e i colori piatti.
// Il logaritmo della densità usa il massimo tra le componenti per non perdere precisione.
function gmmFit(d,idx,comp,K){const S=new Float64Array(K*10);for(let i=0;i<idx.length;i++){const o=idx[i]*4,r=d[o],g=d[o+1],b=d[o+2],s=comp[i]*10;S[s]++;S[s+1]+=r;S[s+2]+=g;S[s+3]+=b;S[s+4]+=r*r;S[s+5]+=r*g;S[s+6]+=r*b;S[s+7]+=g*g;S[s+8]+=g*b;S[s+9]+=b*b}
 const out=[];for(let k=0;k<K;k++){const s=k*10,n=S[s];if(n<1)continue;const mr=S[s+1]/n,mg=S[s+2]/n,mb=S[s+3]/n,v=4,a=S[s+4]/n-mr*mr+v,b=S[s+5]/n-mr*mg,c=S[s+6]/n-mr*mb,e=S[s+7]/n-mg*mg+v,f=S[s+8]/n-mg*mb,g=S[s+9]/n-mb*mb+v,
  i0=e*g-f*f,i1=f*c-b*g,i2=b*f-e*c,i4=a*g-c*c,i5=c*b-a*f,i8=a*e-b*b,det=Math.max(1e-6,a*i0+b*i1+c*i2);out.push({ln:Math.log(n/idx.length)-.5*Math.log(det),mr,mg,mb,a:i0/det,b:i1/det,c:i2/det,e:i4/det,f:i5/det,g:i8/det})}return out}
const gmmTerm=(m,r,g,b)=>{const x=r-m.mr,y=g-m.mg,z=b-m.mb;return m.ln-.5*(x*(m.a*x+m.b*y+m.c*z)+y*(m.b*x+m.e*y+m.f*z)+z*(m.c*x+m.f*y+m.g*z))};
function gmmLog(G,r,g,b){let mx=-1e300;for(const m of G){const v=gmmTerm(m,r,g,b);if(v>mx)mx=v}let s=0;for(const m of G)s+=Math.exp(gmmTerm(m,r,g,b)-mx);return mx+Math.log(s)}
function gmmBest(G,r,g,b){let mx=-1e300,best=0;G.forEach((m,k)=>{const v=gmmTerm(m,r,g,b);if(v>mx){mx=v;best=k}});return best}
// Prime componenti con k-means (avvio k-means++ con un generatore fisso, così il risultato si ripete uguale).
function kmeansComp(d,idx,K){let seed=12345;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648,step=Math.max(1,Math.floor(idx.length/20000)),smp=[];for(let i=0;i<idx.length;i+=step){const o=idx[i]*4;smp.push([d[o],d[o+1],d[o+2]])}
 const C=[smp[Math.floor(rnd()*smp.length)]];while(C.length<K&&C.length<smp.length){const D=smp.map(p=>Math.min(...C.map(c=>(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2)));let t=rnd()*D.reduce((a,b)=>a+b,0),i=0;while(i<D.length-1&&(t-=D[i])>0)i++;C.push(smp[i])}
 const near=(r,g,b)=>{let bi=0,bd=1e18;C.forEach((c,k)=>{const v=(r-c[0])**2+(g-c[1])**2+(b-c[2])**2;if(v<bd){bd=v;bi=k}});return bi};
 for(let it=0;it<8;it++){const s=C.map(()=>[0,0,0,0]);for(const p of smp){const k=near(...p);s[k][0]+=p[0];s[k][1]+=p[1];s[k][2]+=p[2];s[k][3]++}s.forEach((v,k)=>{if(v[3])C[k]=[v[0]/v[3],v[1]/v[3],v[2]/v[3]]})}
 const comp=new Uint8Array(idx.length);for(let i=0;i<idx.length;i++){const o=idx[i]*4;comp[i]=near(d[o],d[o+1],d[o+2])}return comp}
// GrabCut. T: 0 sfondo certo, 1 soggetto certo, 2 da decidere; guess è la prima stima per i pixel da decidere (senza,
// partono come soggetto). I pixel dei tratti (boost: 1 tieni, 2 togli) contano otto volte nei modelli di colore, così
// un tratto sui capelli insegna quel colore al soggetto. Restituisce 1 per il soggetto.
function* grabcut(px,w,h,T,iters=4,guess=null,boost=null){const n=w*h,d=px.data,K=5,lab=new Uint8Array(n),tree=new Uint8Array(n);for(let p=0;p<n;p++)lab[p]=T[p]===0?0:T[p]===1?1:guess?guess[p]:1;
 // Archi tra vicini: forti dove il colore è simile, deboli sui contorni (β dalla differenza media tra vicini).
 const W=new Float32Array(n*4);let sum=0,cnt=0;for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++)for(let k=0;k<4;k++){const X=x+NB_DX[k],Y=y+NB_DY[k];if(X<0||X>=w||Y>=h)continue;const o=p*4,q=(Y*w+X)*4,dr=d[o]-d[q],dg=d[o+1]-d[q+1],db=d[o+2]-d[q+2],v=dr*dr+dg*dg+db*db;W[p*4+k]=v;sum+=v;cnt++}
 const beta=1/(2*Math.max(1e-6,sum/cnt)),gamma=50,HARD=9*gamma;for(let p=0;p<n;p++)for(let k=0;k<4;k++)W[p*4+k]=gamma/(k&1?Math.SQRT2:1)*Math.exp(-beta*W[p*4+k]);
 yield .05;const pick=v=>{const a=[];for(let p=0;p<n;p++)if(lab[p]===v){a.push(p);if(boost&&boost[p]===2-v)for(let k=0;k<7;k++)a.push(p)}return Int32Array.from(a)};
 let fgI=pick(1),bgI=pick(0);if(!fgI.length||!bgI.length)return lab;let fg=gmmFit(d,fgI,kmeansComp(d,fgI,K),K),bg=gmmFit(d,bgI,kmeansComp(d,bgI,K),K);
 for(let it=0;it<iters;it++){if(it){fgI=pick(1);bgI=pick(0);if(!fgI.length||!bgI.length)break;const cf=new Uint8Array(fgI.length),cb=new Uint8Array(bgI.length);
   for(let i=0;i<fgI.length;i++){const o=fgI[i]*4;cf[i]=gmmBest(fg,d[o],d[o+1],d[o+2])}for(let i=0;i<bgI.length;i++){const o=bgI[i]*4;cb[i]=gmmBest(bg,d[o],d[o+1],d[o+2])}fg=gmmFit(d,fgI,cf,K);bg=gmmFit(d,bgI,cb,K)}
  yield .05+.9*(it+.2)/iters;
  // Capacità intere, in sedicesimi: niente residui decimali minuscoli che il flusso continuerebbe a spingere.
  const cap=new Int32Array(n*8),tr=new Int32Array(n);for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++){for(let k=0;k<4;k++){const X=x+NB_DX[k],Y=y+NB_DY[k];if(X<0||X>=w||Y>=h)continue;const q=Y*w+X,v=Math.round(W[p*4+k]*16);cap[p*8+k]=v;cap[q*8+(k^4)]=v}
   const t=T[p];if(t===1)tr[p]=HARD*16;else if(t===0)tr[p]=-HARD*16;else{const o=p*4,v=gmmLog(fg,d[o],d[o+1],d[o+2])-gmmLog(bg,d[o],d[o+1],d[o+2]);tr[p]=Math.round((v>HARD?HARD:v<-HARD?-HARD:v)*16)}}
  // Ci si ferma quando le etichette non cambiano quasi più (meno di un pixel su mille).
  yield .05+.9*(it+.4)/iters;yield* maxflow(w,h,cap,tr,tree);let ch=0;for(let p=0;p<n;p++)if(T[p]===2){const v=tree[p]===1?1:0;if(v!==lab[p]){lab[p]=v;ch++}}yield .05+.9*(it+1)/iters;if(it&&ch<n*.001)break}
 return lab}
// GrabCut a due livelli (come le bande di Lombaert e altri): prima su una copia a metà lato, per la forma e i modelli di
// colore; poi alla misura di lavoro si ricalcola solo una fascia di pochi pixel intorno al contorno trovato, con il resto
// fermo. Il flusso massimo, che è la parte lenta, lavora così su molti meno pixel.
function* cutLevels(px,w,h,T,guess,boost){const W=Math.ceil(w/2),H=Math.ceil(h/2),m=W*H,d=px.data,acc=new Float32Array(m*4),d2=new Uint8ClampedArray(m*4),T2=new Uint8Array(m).fill(2),g2=new Uint8Array(m),b2=new Uint8Array(m);
 for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++){const q=(y>>1)*W+(x>>1),o=p*4;for(let c=0;c<3;c++)acc[q*4+c]+=d[o+c];acc[q*4+3]++;if(T[p]===1)T2[q]=1;else if(T[p]===0&&T2[q]!==1)T2[q]=0;if(guess[p])g2[q]=1;if(boost[p]>b2[q])b2[q]=boost[p]}
 for(let q=0;q<m;q++){const k=acc[q*4+3];for(let c=0;c<3;c++)d2[q*4+c]=acc[q*4+c]/k}
 const scaled=function*(g,a,b){let r;while(!(r=g.next()).done)yield typeof r.value==='number'?a+(b-a)*r.value:r.value;return r.value};
 const lab2=yield* scaled(grabcut({data:d2},W,H,T2,5,g2,b2),0,.75),up=new Uint8Array(w*h),edge=new Uint8Array(w*h);for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++)up[p]=lab2[(y>>1)*W+(x>>1)];
 for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++)if(x<w-1&&up[p]!==up[p+1]||y<h-1&&up[p]!==up[p+w])edge[p]=1;const band=morph(edge,w,h,4,true),Tf=new Uint8Array(w*h);
 for(let p=0;p<w*h;p++)Tf[p]=T[p]!==2?T[p]:band[p]?2:up[p];return yield* scaled(grabcut(px,w,h,Tf,1,up,boost),.75,.95)}
// Fondo uniforme: il colore tipico del bordo dell'inquadratura e quanto varia. Dai pixel del bordo simili a quel colore
// lo sfondo si estende ai vicini con un colore vicino al loro e non troppo lontano da quello tipico (regge le sfumature
// del telo); il soggetto è il resto, senza le briciole.
function borderStats(px,w,h,inside){const d=px.data,R=[],G=[],B=[],ring=[],b=Math.max(2,Math.round(Math.max(w,h)/150));
 for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++){if(!inside[p])continue;const edge=x<b||y<b||x>=w-b||y>=h-b||!inside[p-b]||!inside[p+b]||!inside[p-b*w]||!inside[p+b*w];if(edge){const o=p*4;R.push(d[o]);G.push(d[o+1]);B.push(d[o+2]);ring.push(p)}}
 const med=a=>{const s=Float32Array.from(a).sort();return s[s.length>>1]||0},mr=med(R),mg=med(G),mb=med(B),dev=R.map((r,i)=>Math.max(Math.abs(r-mr),Math.abs(G[i]-mg),Math.abs(B[i]-mb))),mad=med(dev),tol=Math.min(90,3*mad+14),near=dev.filter(v=>v<=tol).length/Math.max(1,dev.length);
 return {c:[mr,mg,mb],mad,tol,near,ring,dev,uniform:mad<=12&&near>=.8}}
function uniformCut(px,w,h,inside,st){const d=px.data,n=w*h,bgm=new Uint8Array(n),[mr,mg,mb]=st.c,tg=st.tol+25,tl=Math.max(8,st.mad*2+6),stack=[];
 const far=p=>{const o=p*4;return Math.max(Math.abs(d[o]-mr),Math.abs(d[o+1]-mg),Math.abs(d[o+2]-mb))};
 st.ring.forEach((p,i)=>{if(st.dev[i]<=st.tol&&!bgm[p]){bgm[p]=1;stack.push(p)}});
 while(stack.length){const p=stack.pop(),x=p%w,o=p*4;for(const q of [x>0?p-1:-1,x<w-1?p+1:-1,p-w,p+w]){if(q<0||q>=n||bgm[q]||!inside[q])continue;const o2=q*4;if(Math.max(Math.abs(d[o]-d[o2]),Math.abs(d[o+1]-d[o2+1]),Math.abs(d[o+2]-d[o2+2]))<=tl&&far(q)<=tg){bgm[q]=1;stack.push(q)}}}
 const lab=new Uint8Array(n);for(let p=0;p<n;p++)lab[p]=inside[p]&&!bgm[p]?1:0;return dropCrumbs(lab,w,h)}
// Il fondo uniforme è credibile se ne esce un soggetto vero: una zona principale, rimasta dopo le briciole e non quasi
// tutta la foto; altrimenti, in automatico, si passa a GrabCut.
// Le zone che vanno da un lato all'altro (un orizzonte, una fila di alberi) sono sfondo e si tolgono.
function uniformOk(lab,w,h){const n=w*h,seen=new Uint8Array(n),st=[],cells=[];let tot=0,big=0;
 for(let p=0;p<n;p++){if(!lab[p]||seen[p])continue;cells.length=0;let l=false,r=false;seen[p]=1;st.push(p);
  while(st.length){const q=st.pop(),x=q%w;cells.push(q);if(!x)l=true;if(x===w-1)r=true;for(const s of [x>0?q-1:-1,x<w-1?q+1:-1,q-w,q+w])if(s>=0&&s<n&&lab[s]&&!seen[s]){seen[s]=1;st.push(s)}}
  if(l&&r){for(const q of cells)lab[q]=0;continue}tot+=cells.length;if(cells.length>big)big=cells.length}
 return tot>n*.002&&tot<n*.9&&big>=tot*.5}
// Chiusura: massimo e poi minimo su un quadrato di raggio r, in passate orizzontali e verticali. Chiude le fessure
// sottili che il taglio lascia sui contorni forti (tra capelli e viso), così le parti del soggetto restano unite.
function morph(lab,w,h,r,max){const t=new Uint8Array(lab.length),o=new Uint8Array(lab.length),hit=a=>max?a:!a;
 for(let y=0;y<h;y++)for(let x=0,i=y*w;x<w;x++,i++){let v=max?0:1;for(let k=Math.max(0,x-r);k<=Math.min(w-1,x+r);k++)if(hit(lab[y*w+k])){v=1-v;break}t[i]=v}
 for(let y=0;y<h;y++)for(let x=0,i=y*w;x<w;x++,i++){let v=max?0:1;for(let k=Math.max(0,y-r);k<=Math.min(h-1,y+r);k++)if(hit(t[k*w+x])){v=1-v;break}o[i]=v}return o}
const closeGaps=(lab,w,h,r=2)=>morph(morph(lab,w,h,r,true),w,h,r,false);
// Tiene solo le zone di soggetto grandi almeno quanto una parte (min) della più grande: GrabCut senza riquadro lascia
// a volte qualche macchia dello sfondo con colori simili a quelli del soggetto.
function keepMain(lab,w,h,min=.15){const n=w*h,id=new Int32Array(n).fill(-1),size=[],st=[];
 for(let p=0;p<n;p++){if(!lab[p]||id[p]>=0)continue;const k=size.length;let c=0;id[p]=k;st.push(p);while(st.length){const q=st.pop(),x=q%w;c++;for(const r of [x>0?q-1:-1,x<w-1?q+1:-1,q-w,q+w])if(r>=0&&r<n&&lab[r]&&id[r]<0){id[r]=k;st.push(r)}}size.push(c)}
 const big=Math.max(0,...size)*min;for(let p=0;p<n;p++)if(lab[p]&&size[id[p]]<big)lab[p]=0;return lab}
// Toglie le isole di soggetto più piccole dello 0,2% della foto e riempie i buchi più piccoli dello 0,05%.
function dropCrumbs(lab,w,h){const n=w*h,seen=new Uint8Array(n),st=[],comp=[];
 for(const [v,min] of [[1,n*.002],[0,n*.0005]]){seen.fill(0);for(let p=0;p<n;p++){if(lab[p]!==v||seen[p])continue;comp.length=0;st.push(p);seen[p]=1;let border=false;
   while(st.length){const q=st.pop(),x=q%w;comp.push(q);if(x===0||x===w-1||q<w||q>=n-w)border=true;for(const r of [x>0?q-1:-1,x<w-1?q+1:-1,q-w,q+w])if(r>=0&&r<n&&!seen[r]&&lab[r]===v){seen[r]=1;st.push(r)}}
   if(comp.length<min&&(v===1||!border))for(const q of comp)lab[q]=1-v}}
 return lab}
// Calcolo dello scontorno, su una copia ridotta della foto originale (senza inquadratura): fuori dall'inquadratura è
// sfondo e i tratti sono certi. Con il riquadro, fuori è sfondo e dentro si decide, partendo dall'ellisse inscritta. Senza riquadro sono sfondo le fasce
// in alto e ai lati (in basso spesso il soggetto tocca il bordo) e la prima stima del soggetto è un'ellisse al centro.
// Dopo un tratto si riparte dal risultato precedente (from), come nel GrabCut interattivo: cambia solo quello che serve.
function* cutCompute(c,from=null){const W=I.bmp.width,H=I.bmp.height,S=Math.max(W,H),q=Math.min(1,Math.sqrt(CUT_PIXELS/(W*H))),w=Math.max(8,Math.round(W*q)),h=Math.max(8,Math.round(H*q)),n=w*h;
 const cv=new OffscreenCanvas(w,h),ctx=cv.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';ctx.drawImage(I.bmp,0,0,w,h);const px=ctx.getImageData(0,0,w,h);
 const toW=([x,y])=>[x*S*w/W,y*S*h/H],poly=(pts,fill='#fff')=>{ctx.beginPath();pts.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...toW(p)));ctx.closePath();ctx.fillStyle=fill;ctx.fill()};
 const area=pts=>{ctx.clearRect(0,0,w,h);poly(pts);const a=ctx.getImageData(0,0,w,h).data,m=new Uint8Array(n);for(let p=0;p<n;p++)m[p]=a[p*4+3]>=128?1:0;return m};
 // Per ogni pixel della copia, la sua posizione nell'inquadratura (da 0 a 1).
 const f=fullMatrix(),A=f.U.scale(W/(w*S),H/(h*S)),inside=new Uint8Array(n),guess=new Uint8Array(n),band=new Uint8Array(n);
 for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++){const u=(A.a*(x+.5)+A.c*(y+.5)+A.e)/f.fw,v=(A.b*(x+.5)+A.d*(y+.5)+A.f)/f.fh;inside[p]=u>=0&&u<=1&&v>=0&&v<=1?1:0;band[p]=u<.03||u>.97||v<.03?1:0;guess[p]=((u-.5)/.3)**2+((v-.62)/.42)**2<=1?1:0}
 // Con il riquadro la prima stima è l'ellisse inscritta nel riquadro.
 const box=c.box?area(c.box):null;if(box){const P=c.box.map(toW),xs=P.map(q=>q[0]),ys=P.map(q=>q[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,rx=(Math.max(...xs)-Math.min(...xs))*.45,ry=(Math.max(...ys)-Math.min(...ys))*.45;for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++)guess[p]=((x+.5-cx)/rx)**2+((y+.5-cy)/ry)**2<=1?1:0}
 const strokes=list=>{const m=new Uint8Array(n);if(!list.length)return m;ctx.clearRect(0,0,w,h);ctx.lineCap=ctx.lineJoin='round';ctx.strokeStyle='#fff';for(const s of list){ctx.lineWidth=Math.max(1,s.d*S*w/W);ctx.beginPath();s.p.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...toW(p)));if(s.p.length===1)ctx.lineTo(...toW(s.p[0]));ctx.stroke()}const a=ctx.getImageData(0,0,w,h).data;for(let p=0;p<n;p++)m[p]=a[p*4+3]>=128?1:0;return m};
 const keep=strokes(c.keep),drop=strokes(c.drop);yield .02;
 let method=c.method,st=null;if(method!=='grabcut'&&!c.box){st=borderStats(px,w,h,inside);if(method==='auto')method=st.uniform?'uniform':'grabcut'}else if(method==='auto')method='grabcut';
 const prev=from&&from.w===w&&from.h===h?from.data.map(v=>v>127?1:0):null,boost=new Uint8Array(n);for(let p=0;p<n;p++)boost[p]=keep[p]?1:drop[p]?2:0;let lab;
 // Dopo un tratto si ricalcola solo intorno ai pixel dei tratti che il risultato di prima contraddice, più un margine:
 // il resto resta com'era, così una correzione non sposta il contorno altrove. Vale per GrabCut e per il fondo uniforme.
 if(prev){let x0=w,y0=h,x1=-1,y1=-1;for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++)if(keep[p]&&!prev[p]||drop[p]&&prev[p]){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(x1<0)lab=prev;else{const R=Math.round(Math.max(w,h)*.08),T=new Uint8Array(n);x0-=R;x1+=R;y0-=R;y1+=R;
   for(let y=0,p=0;y<h;y++)for(let x=0;x<w;x++,p++)T[p]=drop[p]?0:keep[p]?1:!inside[p]||box&&!box[p]?0:x<x0||x>x1||y<y0||y>y1?prev[p]:2;lab=yield* grabcut(px,w,h,T,2,prev,boost);lab=dropCrumbs(closeGaps(lab,w,h),w,h)}}
 else if(method==='uniform'){lab=uniformCut(px,w,h,inside,st||borderStats(px,w,h,inside));if(!uniformOk(lab,w,h)&&c.method==='auto'){method='grabcut';lab=null}else yield .9}
 if(!lab){const T=new Uint8Array(n);for(let p=0;p<n;p++)T[p]=drop[p]?0:keep[p]?1:!inside[p]||(box?!box[p]:band[p])?0:2;lab=yield* cutLevels(px,w,h,T,guess,boost);lab=dropCrumbs(keepMain(closeGaps(lab,w,h),w,h),w,h)}
 for(let p=0;p<n;p++)if(keep[p])lab[p]=1;const data=new Uint8Array(n);for(let p=0;p<n;p++)data[p]=lab[p]?255:0;return {w,h,data,method}}
// La maschera dello scontorno: quella calcolata, il bordo rifinito sulla foto (più ampio quanto più la copia era piccola)
// e i tratti, che valgono sempre.
function cutOps(r,mc){const c=r.cut,R=c?.raster&&(mc?.ras||rasters).get(c.raster);if(!R)return [];const W=mc?mc.W:I.bmp.width,S=Math.max(W,mc?mc.H:I.bmp.height),k=W/R.w,e=c.edge??50;
 return [{t:'raster',id:c.raster},{t:'refine',r:U5(k*(1.2+e/30)/S),e:e<34?1e-4:e<67?1e-3:1e-2,c:1},...c.keep.map(s=>({...s,mode:'add'})),...c.drop.map(s=>({...s,mode:'sub'}))]}
const hexRgb=h=>{const v=parseInt(String(h).replace('#',''),16)||0;return [v>>16&255,v>>8&255,v&255]};
// Colori del bordo ripuliti: nella fascia semitrasparente il pixel mescola il soggetto e lo sfondo di prima, C = αF + (1−α)B.
// Con B stimato dai pixel di sfondo vicini, F = (C − (1−α)B)/α; dove α è piccola, quasi tutto sfondo, si va verso il
// colore del soggetto vicino. Così sul fondo nuovo, trasparente o colorato, non resta l'alone di quello vecchio.
function cutClean(img,m,w,h){const d=img.data,s=Math.max(2,Math.ceil(Math.sqrt(w*h/25e4))),gw=Math.ceil(w/s),gh=Math.ceil(h/s),N=gw*gh,A=[0,1,2,3,4,5,6,7].map(()=>new Float32Array(N)),xi=new Int32Array(w),band=new Uint8Array(h);for(let x=0;x<w;x++)xi[x]=(x/s)|0;
 for(let y=0;y<h;y++){const row=((y/s)|0)*gw;for(let x=0,i=y*w,o=i*4;x<w;x++,i++,o+=4){const v=m[i],q=row+xi[x];if(v>=242){if(v<255)band[y]=1;A[0][q]+=d[o];A[1][q]+=d[o+1];A[2][q]+=d[o+2];A[3][q]++}else if(v<=13){if(v)band[y]=1;A[4][q]+=d[o];A[5][q]+=d[o+1];A[6][q]+=d[o+2];A[7][q]++}else band[y]=1}}
 if(!band.some(v=>v))return;const t=new Float32Array(N);for(const a of A)boxMean(a,gw,gh,Math.max(2,Math.round(Math.max(w,h)*.01/s)),t);const {x0,x1,fx}=gridCols(w,gw,s),R=A.map(()=>new Float32Array(gw));
 for(let y=0,i=0;y<h;y++,i+=w){if(!band[y])continue;A.forEach((a,k)=>gridRow(a,gw,gh,y,s,R[k]));
  for(let x=0;x<w;x++){const v=m[i+x];if(!v||v===255)continue;const a=x0[x],b=x1[x],f=fx[x],L=k=>R[k][a]+(R[k][b]-R[k][a])*f,wf=L(3),wb=L(7);if(wf<1e-3||wb<1e-3)continue;
   const al=v/255,o=(i+x)*4,mix=al<.35?al/.35:1;for(let c=0;c<3;c++){const Fc=L(c)/wf,Bc=L(c+4)/wb,e=(d[o+c]-(1-al)*Bc)/al;d[o+c]=(e<0?0:e>255?255:e)*mix+Fc*(1-mix)}}}}
// Applica lo scontorno ai pixel sviluppati: trasparenza, oppure un colore pieno o la stessa foto sfocata dietro al soggetto.
function applyCut(img,r,mc){const c=r.cut;if(!c?.raster)return;if(!mc.ras.has(c.raster)){if(mc.ras===rasters)cutRestore();return}const m=maskOf(cutOps(r,mc),mc),d=img.data,n=m.length;cutClean(img,m,mc.w,mc.h);
 if(c.bg==='color'){const [R,G,B]=hexRgb(c.color);for(let i=0,j=0;i<n;i++,j+=4){const a=m[i];if(a===255)continue;const k=a/255,l=1-k;d[j]=d[j]*k+R*l;d[j+1]=d[j+1]*k+G*l;d[j+2]=d[j+2]*k+B*l;d[j+3]=255}return}
 if(c.bg==='blur'){blurBehind(img,m,mc.w,mc.h,Math.max(1,(c.blur??40)/100*.02*mc.k));return}
 for(let i=0,j=3;i<n;i++,j+=4)if(m[i]!==255)d[j]=d[j]*m[i]/255}
// Sfondo sfocato: si sfoca solo quello che non è soggetto (colori pesati per 1 meno la maschera) su una copia ridotta,
// così il soggetto non lascia un alone; poi si rimette dietro al soggetto a piena misura.
function blurBehind(img,m,w,h,sig){const d=img.data,f=Math.max(1,Math.floor(sig/3)),gw=Math.ceil(w/f),gh=Math.ceil(h/f),N=gw*gh,xi=new Int32Array(w),A=[0,1,2,3].map(()=>new Float64Array(gw)),L=[0,1,2,3].map(()=>new Uint16Array(N));for(let x=0;x<w;x++)xi[x]=(x/f)|0;
 for(let gy=0;gy<gh;gy++){for(const a of A)a.fill(0);const y0=gy*f,y1=Math.min(h,y0+f);for(let y=y0;y<y1;y++)for(let x=0,i=y*w;x<w;x++,i++){const j=xi[x],o=i*4,b=255-m[i];A[0][j]+=d[o]*b;A[1][j]+=d[o+1]*b;A[2][j]+=d[o+2]*b;A[3][j]+=b}
  for(let j=0,q=gy*gw;j<gw;j++,q++){const c=(y1-y0)*Math.min(f,w-j*f),wt=A[3][j];L[3][q]=wt/c*257+.5;for(let k=0;k<3;k++)L[k][q]=wt?A[k][j]/wt*256+.5:0}}
 // I colori si sfocano pesati: si moltiplicano per il peso prima e si dividono dopo.
 for(let q=0;q<N;q++){const wt=L[3][q]/65535;for(let k=0;k<3;k++)L[k][q]=L[k][q]*wt+.5}
 const b=boxR(sig/f);for(const a of L)blur3(a,gw,gh,b);const {x0,x1,fx}=gridCols(w,gw,f),row=[0,1,2,3].map(()=>new Float32Array(gw));
 for(let y=0,i=0;y<h;y++){for(let k=0;k<4;k++)gridRow(L[k],gw,gh,y,f,row[k]);for(let x=0;x<w;x++,i++){const a=m[i];if(a===255)continue;const j0=x0[x],j1=x1[x],t=fx[x],wt=row[3][j0]+(row[3][j1]-row[3][j0])*t,o=i*4;if(wt<40)continue;const k=a/255,l=1-k,s=65535/wt/256;
  for(let c=0;c<3;c++){const v=(row[c][j0]+(row[c][j1]-row[c][j0])*t)*s;d[o+c]=d[o+c]*k+v*l}d[o+3]=255}}}
// Comandi dello scontorno. Il calcolo avviene prima della modifica, che entra nella cronologia una volta sola.
let cutBusy=false;
// Una maschera calcolata che manca (bozza senza il suo calcolo, regolazioni incollate da un'altra foto) si ricalcola
// dagli stessi dati, con lo stesso id: la ricetta non cambia e non entra nella cronologia.
function cutRestore(){if(cutBusy||!I.r.cut)return;cutBusy=true;const c=structuredClone(I.r.cut);setTimeout(async()=>{try{const res=await runChunks(cutCompute({...c,method:c.used||c.method}),'Scontorno');if(res&&I.r.cut?.raster===c.raster){rasters.set(c.raster,{w:res.w,h:res.h,data:res.data});requestRender()}}catch(e){console.warn('Scontorno non ricalcolato',e)}finally{cutBusy=false}},0)}
async function cutRun(c,label,from=null){if(!I.bmp){toast('Apri prima una foto');return false}if(cutBusy){toast('Lo scontorno è già in corso');return false}cutBusy=true;const t0=performance.now();
 try{const res=await runChunks(cutCompute(c,from),'Scontorno');if(!res)return false;const id=uid();rasters.set(id,{w:res.w,h:res.h,data:res.data});
  edit(label,r=>{r.cut={...c,raster:id,used:res.method}},{panel:true});renderPhoto(false);I.cutTime=Math.round(performance.now()-t0);
  // Senza soggetto (succede quando il soggetto tocca i bordi o ha i colori dello sfondo) si dice che cosa fare.
  let k=0;for(let i=0;i<res.data.length;i+=4)if(res.data[i])k++;if(!from&&!c.box&&k<res.data.length/4*.003)toast(`${label}: non ho trovato il soggetto. Traccia un riquadro intorno con Riquadro del soggetto, oppure segnalalo con Tieni.`);
  else announce(`${label}: ${cutSummary()}`);return true}
 catch(e){console.error(e);toast('Scontorno non riuscito: '+(e.message||e));return false}finally{cutBusy=false}}
function cutSummary(r=I.r){const c=r.cut;if(!c)return 'Lo sfondo c’è ancora.';const R=rasters.get(c.raster);if(!R||!lastMc)return 'Sfondo tolto.';const m=maskOf(cutOps(r,lastMc),lastMc);
 return `${describeMask(m,lastMc.w,lastMc.h,null,'Il soggetto',true)} Metodo: ${c.used==='uniform'?'fondo uniforme':'GrabCut'}${c.keep.length||c.drop.length?`, ${c.keep.length} tratti tieni e ${c.drop.length} togli`:''}. Sfondo: ${c.bg==='color'?'colore '+c.color:c.bg==='blur'?'foto sfocata':'trasparente'}.`}
const cutAuto=()=>cutRun({...newCut(),method:prefs.cutMethod||'auto',bg:I.r.cut?.bg||'none',color:I.r.cut?.color||'#ffffff',blur:I.r.cut?.blur??40},'Togli lo sfondo');
const needCut=()=>{if(!I.bmp){toast('Apri prima una foto');return false}if(!I.r.cut){toast('Lo sfondo c’è ancora: usa prima Togli lo sfondo');return false}return true};
// Un tratto ricalcola lo scontorno intorno a sé, partendo dal risultato di prima, con il fondo uniforme come con GrabCut.
function cutStroke(kind,p){const c=structuredClone(I.r.cut||newCut()),s={t:'brush',p:p.map(uvUnits),d:U5(T.size),h:.8};c[kind]=[...c[kind],s];
 cutRun({...c,method:I.r.cut?.used||c.method},kind==='keep'?'Tratto tieni':'Tratto togli',rasters.get(I.r.cut?.raster))}
Object.assign(PHOTO_TOOLS,{
 cutBox:{label:'Riquadro del soggetto',kind:'two',keys:'Trascina un riquadro intorno al soggetto, con un po’ di sfondo intorno: quello che resta fuori è sfondo. Da tastiera: Invio su un angolo, poi su quello opposto.',two:(a,b)=>{const box=rectOp(a,b).p;endTool(false);cutRun({...(I.r.cut?structuredClone(I.r.cut):newCut()),box,method:'grabcut',keep:I.r.cut?.keep||[],drop:I.r.cut?.drop||[]},'Riquadro del soggetto')}},
 cutKeep:{label:'Tieni',kind:'paint',color:'#20c060',keys:'Dipingi sulle parti del soggetto che sono state tolte. Da tastiera: Spazio abbassa o alza il pennello e con il pennello giù le frecce dipingono; Invio lascia un’impronta.',opts:['size'],done:p=>cutStroke('keep',p)},
 cutDrop:{label:'Togli',kind:'paint',color:'#ff3050',keys:'Dipingi sulle parti di sfondo rimaste. Da tastiera: Spazio abbassa o alza il pennello e con il pennello giù le frecce dipingono; Invio lascia un’impronta.',opts:['size'],done:p=>cutStroke('drop',p)}});
function cutSetBg(bg){if(!needCut())return;edit('Sfondo: '+CUT_BG[bg].toLowerCase(),r=>{r.cut.bg=bg},{panel:true});announce('Sfondo: '+CUT_BG[bg].toLowerCase())}
async function cutColor(){if(!needCut())return;const v=await modal('Colore dello sfondo','<p>Il colore pieno che va dietro al soggetto. Scrivi un colore esadecimale, come #FFFFFF per il bianco.</p>',[{id:'c',label:'Colore',type:'color',value:I.r.cut.color}],'Applica');if(v)edit('Colore dello sfondo',r=>{r.cut.color=v.c;r.cut.bg='color'},{panel:true})&&announce('Sfondo: colore '+v.c)}
function cutRemove(){if(!needCut())return;edit('Rimetti lo sfondo',r=>{r.cut=null},{panel:true});announce('Sfondo rimesso com’era: Ctrl+Z per toglierlo di nuovo')}
function cutRecalc(){if(!needCut())return;cutRun({...I.r.cut,method:prefs.cutMethod||'auto'},'Ricalcola lo scontorno')}
// Anteprima della trasparenza: su scacchiera o su un colore; non cambia il file esportato.
const MATTES=[['checker','Scacchiera'],['white','Bianco'],['black','Nero'],['gray','Grigio']];
function setMatte(v){prefs.matte=v;savePrefs();photoCv.dataset.matte=v;announce('Anteprima della trasparenza su '+MATTES.find(x=>x[0]===v)[1].toLowerCase())}
photoCv.dataset.matte=prefs.matte||'checker';
CTL_EXT.push(id=>id==='cut:edge'?{label:'Bordo del soggetto',min:0,max:100,step:1,get:r=>r.cut?.edge??50,set:(r,v)=>{if(r.cut)r.cut.edge=v},fmt:v=>(v<34?'netto':v<67?'medio':'morbido')+`, ${fmtInt(v)}`,hint:'A sinistra il bordo è netto, a destra più largo e morbido: segue meglio capelli e pelo.',zero:50}
 :id==='cut:blur'?{label:'Sfocatura dello sfondo',min:0,max:100,step:1,get:r=>r.cut?.blur??40,set:(r,v)=>{if(r.cut)r.cut.blur=v},fmt:v=>fmtInt(v),hint:'Quanto è sfocata la foto dietro al soggetto, come con un obiettivo luminoso.',zero:40}:null);
PANEL_HTML.cutout=()=>{const c=I.r.cut,off=I.bmp?'':' disabled',sel=(id,label,opts,v)=>`<label for="${id}">${esc(label)}</label><select id="${id}"${off}>${opts.map(([k,l])=>`<option value="${k}"${k===v?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
 if(!c)return `<p class="sel-desc">Togli lo sfondo sceglie il soggetto da solo; poi i tratti Tieni e Togli correggono. Con un riquadro intorno al soggetto il risultato migliora.</p><div class="insp-actions">${['cutAuto','cutBox'].map(id=>cmdButton(id)).join('')}</div>${sel('cutMethod','Metodo',Object.entries(CUT_METHODS),prefs.cutMethod||'auto')}`;
 return `<p class="sel-desc" id="cutDesc">${esc(cutSummary())}</p><div class="insp-actions" role="group" aria-label="Correggi lo scontorno">${['cutKeep','cutDrop','cutBox','cutRecalc','cutRemove','cutDescribe'].map(id=>cmdButton(id)).join('')}</div>${rangeHtml('cut:edge',false)}
  <div class="insp-actions" role="group" aria-label="Sfondo">${['cutBgNone','cutBgColor','cutBgBlur'].map(id=>cmdButton(id)).join('')}</div>${c.bg==='color'?`<div class="insp-actions">${cmdButton('cutColor')}</div>`:''}${c.bg==='blur'?rangeHtml('cut:blur',false):''}
  ${sel('cutMethod','Metodo per Ricalcola',Object.entries(CUT_METHODS),prefs.cutMethod||'auto')}${c.bg==='none'?sel('cutMatte','Anteprima della trasparenza',MATTES,prefs.matte||'checker'):''}`};
$('adjBody').addEventListener('change',e=>{if(e.target.id==='cutMethod'){prefs.cutMethod=e.target.value;savePrefs();announce('Metodo: '+CUT_METHODS[e.target.value])}else if(e.target.id==='cutMatte')setMatte(e.target.value)});
Object.assign(PHOTO_TOOL_ACTIONS,{cutAuto,cutBox:()=>setPhotoTool('cutBox'),cutKeep:()=>{if(needCut())setPhotoTool('cutKeep')},cutDrop:()=>{if(needCut())setPhotoTool('cutDrop')},cutRecalc,cutRemove,
 cutBgNone:()=>cutSetBg('none'),cutBgColor:()=>cutSetBg('color'),cutBgBlur:()=>cutSetBg('blur'),cutColor,cutDescribe:()=>toast(cutSummary()),cutMatte:()=>{const i=MATTES.findIndex(x=>x[0]===(prefs.matte||'checker'));setMatte(MATTES[(i+1)%MATTES.length][0])}});
