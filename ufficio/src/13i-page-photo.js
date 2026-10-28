// Regolazioni delle foto nelle cornici per immagine: luce, colore e look. Il motore è quello di Tassello Grafica
// (grafica/src/06-photo-core.js per le regolazioni, 06b-photo-pipeline.js per lo sviluppo e i look), copiato perché i
// tasselli restano indipendenti. Il file della foto non cambia: la cornice tiene la ricetta (adj, look, lookAmt) e la foto
// regolata si calcola quando serve, più piccola per lo schermo e grande per il PNG e la stampa.
const pgSigned=(n,d=0)=>(n>0?'+':'')+Number(n).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}).replace(/^-/,'−');
const pgWarm=(v,plus,minus)=>v?pgSigned(v)+', '+(v>0?plus:minus):'0';
// Regolazioni: [id, nome, gruppo, minimo, massimo, passo, formato del valore, spiegazione letta con il cursore].
const PG_ADJ=[
 ['exposure','Esposizione','Luce',-4,4,.05,v=>pgSigned(v,2)+' EV','Schiarisce o scurisce tutta la foto: un EV raddoppia o dimezza la luce.'],
 ['contrast','Contrasto','Luce',-100,100,1,pgSigned,'Allontana o avvicina le zone chiare e quelle scure.'],
 ['highlights','Alte luci','Luce',-100,100,1,pgSigned,'A sinistra recupera i dettagli nelle zone chiare, a destra le schiarisce.'],
 ['shadows','Ombre','Luce',-100,100,1,pgSigned,'A destra apre le zone scure, a sinistra le chiude.'],
 ['whites','Bianchi','Luce',-100,100,1,pgSigned,'Sposta il punto più chiaro: a destra il bianco diventa pieno.'],
 ['blacks','Neri','Luce',-100,100,1,pgSigned,'Sposta il punto più scuro: a sinistra il nero diventa pieno.'],
 ['temp','Temperatura','Colore',-100,100,1,v=>pgWarm(v,'più calda','più fredda'),'A destra la luce diventa più calda (gialla), a sinistra più fredda (azzurra).'],
 ['tint','Tinta','Colore',-100,100,1,v=>pgWarm(v,'verso il magenta','verso il verde'),'Corregge una dominante verde (a destra) o magenta (a sinistra).'],
 ['vibrance','Vividezza','Colore',-100,100,1,pgSigned,'Ravviva soprattutto i colori spenti e rispetta i toni della pelle.'],
 ['saturation','Saturazione','Colore',-100,100,1,pgSigned,'Rende tutti i colori più intensi; a −100 la foto è in bianco e nero.'],
 ['vignette','Vignettatura','Effetti',-100,100,1,pgSigned,'A sinistra scurisce i bordi e porta l’attenzione al centro, a destra li schiarisce.']];
const PG_ADJ0=Object.fromEntries(PG_ADJ.map(a=>[a[0],0]));
for(const a of PG_ADJ){PG_PROP['a_'+a[0]]=a[1];PG_RFMT['a_'+a[0]]=a[6]}Object.assign(PG_PROP,{look:'Look della foto',lookAmt:'Intensità del look'});PG_RFMT.lookAmt=v=>v+'%';
// Sviluppo dei pixel: tabelle della luce per canale (esposizione e bilanciamento del bianco in luce lineare, poi neri,
// bianchi, ombre, alte luci e contrasto), vividezza e saturazione, vignettatura, look come tabella di colori 3D.
const PG_S2L=new Float32Array(256).map((_,i)=>{const c=i/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4});
const pgL2S=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055,pgSmooth=x=>x*x*(3-2*x);
function pgToneTables(a){const g=2**a.exposure,t=a.temp/100,n=a.tint/100;let wr=(1+.3*t)*(1+.12*n),wg=1-.25*n,wb=(1-.3*t)*(1+.12*n);const y=.2126*wr+.7152*wg+.0722*wb;
 const b0=-a.blacks*.0012,w0=1-a.whites*.0012,sh=a.shadows/100*1.69,hi=a.highlights/100*1.69,c=a.contrast/100;
 const curve=v=>{let x=clampV((v-b0)/(w0-b0),0,1);x+=sh*x*(1-x)*(1-x)+hi*x*x*(1-x);x=clampV(x,0,1);x=c>=0?x+c*(pgSmooth(x)-x):.5+(x-.5)*(1+c*.5);return clampV(x,0,1)};
 return [wr/y,wg/y,wb/y].map(w=>{const tab=new Float32Array(256);for(let i=0;i<256;i++)tab[i]=curve(pgL2S(Math.min(1,PG_S2L[i]*g*w)));return tab})}
// Applica la ricetta ai pixel di src e scrive in dst, della stessa misura; il ciclo sui pixel non chiama funzioni.
function pgDevelopPx(src,dst,ph){const A={...PG_ADJ0,...ph.adj},[TR,TG,TB]=pgToneTables(A),w=src.width,h=src.height,s=src.data,d=dst.data,sat=1+A.saturation/100,vib=A.vibrance/100,vg=A.vignette/100*.75,amt=clampV((ph.lookAmt??100)/100,0,1),lut=ph.look&&ph.look!=='none'?pgLut(ph.look):null,L=lut&&amt>0?lut:null,color=sat!==1||vib!==0;
 if(!color&&!vg&&!L){const BR=Uint8ClampedArray.from(TR,v=>v*255+.5),BG=Uint8ClampedArray.from(TG,v=>v*255+.5),BB=Uint8ClampedArray.from(TB,v=>v*255+.5);for(let i=0;i<s.length;i+=4){d[i]=BR[s[i]];d[i+1]=BG[s[i+1]];d[i+2]=BB[s[i+2]];d[i+3]=s[i+3]}return dst}
 const cx=w/2,cy=h/2,rad=1/Math.hypot(cx,cy),N=L?L.size:2,n=N-1,D=L?.data,SY=N*3,SZ=N*N*3,lx=L?L.min[0]:0,ly=L?L.min[1]:0,lz=L?L.min[2]:0,kx=L?n/(L.max[0]-lx):0,ky=L?n/(L.max[1]-ly):0,kz=L?n/(L.max[2]-lz):0;
 for(let y=0,i=0;y<h;y++){const dy=(y+.5-cy)*rad,dy2=dy*dy;for(let x=0;x<w;x++,i+=4){let R=TR[s[i]],G=TG[s[i+1]],B=TB[s[i+2]];
  if(color){const Y=.2126*R+.7152*G+.0722*B,mx=R>G?(R>B?R:B):(G>B?G:B),mn=R<G?(R<B?R:B):(G<B?G:B),k=sat*(1+vib*(1-(mx-mn)));R=Y+(R-Y)*k;G=Y+(G-Y)*k;B=Y+(B-Y)*k}
  if(vg){const dx=(x+.5-cx)*rad;let t=(dx*dx+dy2-.2)*1.25;t=t<0?0:t>1?1:t;const f=1+vg*t*t*(3-2*t);R*=f;G*=f;B*=f}
  // Look: tabella di colori 3D con interpolazione tetraedrica.
  if(L){let u=(R-lx)*kx,v=(G-ly)*ky,q=(B-lz)*kz;u=u<0?0:u>n?n:u;v=v<0?0:v>n?n:v;q=q<0?0:q>n?n:q;let u0=u|0,v0=v|0,q0=q|0;if(u0===n)u0--;if(v0===n)v0--;if(q0===n)q0--;
   const fu=u-u0,fv=v-v0,fq=q-q0,i0=((q0*N+v0)*N+u0)*3,i1=i0+3+SY+SZ;let f1,f2,f3,ia,ib;
   if(fu>=fv){if(fv>=fq){f1=fu;f2=fv;f3=fq;ia=i0+3;ib=ia+SY}else if(fu>=fq){f1=fu;f2=fq;f3=fv;ia=i0+3;ib=ia+SZ}else{f1=fq;f2=fu;f3=fv;ia=i0+SZ;ib=ia+3}}
   else{if(fq>=fv){f1=fq;f2=fv;f3=fu;ia=i0+SZ;ib=ia+SY}else if(fq>=fu){f1=fv;f2=fq;f3=fu;ia=i0+SY;ib=ia+SZ}else{f1=fv;f2=fu;f3=fq;ia=i0+SY;ib=ia+3}}
   R+=(D[i0]+f1*(D[ia]-D[i0])+f2*(D[ib]-D[ia])+f3*(D[i1]-D[ib])-R)*amt;
   G+=(D[i0+1]+f1*(D[ia+1]-D[i0+1])+f2*(D[ib+1]-D[ia+1])+f3*(D[i1+1]-D[ib+1])-G)*amt;
   B+=(D[i0+2]+f1*(D[ia+2]-D[i0+2])+f2*(D[ib+2]-D[ia+2])+f3*(D[i1+2]-D[ib+2])-B)*amt}
  d[i]=R*255+.5;d[i+1]=G*255+.5;d[i+2]=B*255+.5;d[i+3]=s[i+3]}}
 return dst}
// Look pronti: funzioni sul colore percepito, trasformate in tabelle 3D al primo uso.
const pgSCurve=(x,c)=>x+c*(pgSmooth(clampV(x,0,1))-x),pgLuma=(r,g,b)=>.2126*r+.7152*g+.0722*b,pgSatur=(r,g,b,k)=>{const y=pgLuma(r,g,b);return [y+(r-y)*k,y+(g-y)*k,y+(b-y)*k]};
const PG_LOOKS=[{id:'none',name:'Nessun look'},
 {id:'bn',name:'Bianco e nero',fn:(r,g,b)=>{const v=pgSCurve(.3*r+.59*g+.11*b,.25);return [v,v,v]}},
 {id:'seppia',name:'Seppia',fn:(r,g,b)=>{const v=pgSCurve(.3*r+.59*g+.11*b,.15);return [v*1.07+.02,v*.97+.01,v*.8+.01]}},
 {id:'caldo',name:'Caldo',fn:(r,g,b)=>[r*1.06+.01,g*1.01,b*.9]},
 {id:'freddo',name:'Freddo',fn:(r,g,b)=>[r*.92,g*.99,b*1.07+.01]},
 {id:'pellicola',name:'Pellicola',fn:(r,g,b)=>{const f=v=>.05+.9*pgSCurve(v,.3),[R,G,B]=pgSatur(r,g,b,.85);return [f(R)*1.03,f(G),f(B)*.92+.04]}},
 {id:'vivace',name:'Vivace',fn:(r,g,b)=>pgSatur(r,g,b,1.35).map(v=>pgSCurve(v,.2))},
 {id:'tenue',name:'Tenue',fn:(r,g,b)=>pgSatur(r,g,b,.7).map(v=>.04+.9*v)}];
function pgBakeLook(fn,N=17){const D=new Float32Array(N*N*N*3);let i=0;for(let b=0;b<N;b++)for(let g=0;g<N;g++)for(let r=0;r<N;r++){const o=fn(r/(N-1),g/(N-1),b/(N-1));D[i++]=o[0];D[i++]=o[1];D[i++]=o[2]}return {size:N,data:D,min:[0,0,0],max:[1,1,1]}}
function pgLut(id){const l=PG_LOOKS.find(x=>x.id===id);return l?.fn?(l.baked??=pgBakeLook(l.fn)):null}
// Regolazione automatica: luce media verso il grigio medio, bianchi e neri verso i bordi dell'istogramma, ombre e alte
// luci se servono, bilanciamento del bianco con la media dei colori a metà forza.
function pgAutoAdj(src){const d=src.data,HY=new Uint32Array(256);let n=0;for(let i=0;i<d.length;i+=4){if(d[i+3]<8)continue;HY[(54*d[i]+183*d[i+1]+19*d[i+2])>>8]++;n++}
 const p=q=>{const t=n*q;let acc=0;for(let i=0;i<256;i++){acc+=HY[i];if(acc>=t)return i/255}return 1},med=p(.5),lo=p(.005),hi=p(.995),toLin=v=>PG_S2L[Math.round(clampV(v,0,1)*255)];
 const ev=Math.round(clampV(Math.log2(toLin(.46)/Math.max(.002,toLin(med)))*.8,-2.5,2.5)*20)/20,g=2**ev,shift=v=>pgL2S(Math.min(1,toLin(v)*g)),hi2=shift(hi),lo2=shift(lo);
 const out={exposure:Math.abs(ev)<.01?0:ev,whites:Math.round(clampV((1-hi2/.97)/.0012,-40,60)),blacks:Math.round(clampV((.02-lo2)/.0012,-50,40)),
  contrast:Math.round(clampV((.75-(hi2-lo2))*40,0,25)),shadows:Math.round(clampV((.3-shift(p(.25)))*120,0,40)),highlights:-Math.round(clampV((shift(p(.9))-.85)*250,0,50))};
 let mr=0,mg=0,mb=0,k=0;for(let i=0;i<d.length;i+=16){const r=d[i],gg=d[i+1],b=d[i+2];if(d[i+3]<8||Math.max(r,gg,b)>=250||Math.max(r,gg,b)<8)continue;mr+=PG_S2L[r];mg+=PG_S2L[gg];mb+=PG_S2L[b];k++}
 if(k>100){out.temp=Math.round(clampV((mb-mr)/(mr+mb)*120,-25,25));out.tint=Math.round(clampV((mg-(mr+mb)/2)/mg*120,-20,20))}
 return out}
// La foto regolata: si decodifica il file (al massimo max pixel sul lato lungo), si sviluppa e diventa un'immagine
// come quelle caricate, con il suo indirizzo locale. Le foto in JPEG restano JPEG, le altre PNG per la trasparenza.
const pgPh=it=>({adj:it.adj||{},look:it.look||'none',lookAmt:it.lookAmt??100});
const pgPhotoOn=it=>it.kind==='image'&&(!!(it.adj&&Object.keys(it.adj).length)||(!!it.look&&it.look!=='none'&&(it.lookAmt??100)>0));
const pgPhotoKey=(it,m)=>m.url+'|'+JSON.stringify(pgPh(it));
async function pgDecode(m,max){let src;if(/svg/.test(m.type)){src=new Image();src.src=m.url;await src.decode()}else src=await createImageBitmap(m.blob);
 const W=src.naturalWidth||src.width||m.w,H=src.naturalHeight||src.height||m.h,k=Math.min(1,max/Math.max(W,H)),w=Math.max(1,Math.round(W*k)),h=Math.max(1,Math.round(H*k)),cv=new OffscreenCanvas(w,h),cx=cv.getContext('2d');cx.drawImage(src,0,0,w,h);src.close?.();return {cv,cx,img:cx.getImageData(0,0,w,h)}}
async function pgDevelop(m,ph,max){const {cv,cx,img}=await pgDecode(m,max);pgDevelopPx(img,img,ph);cx.putImageData(img,0,0);const blob=await cv.convertToBlob(/jpe?g/.test(m.type)?{type:'image/jpeg',quality:.92}:{type:'image/png'});
 return {blob,name:m.name,w:img.width,h:img.height,type:blob.type,url:URL.createObjectURL(blob),data:''}}
// Le foto regolate già calcolate: per lo schermo (v) una per ricetta, mentre si trascina un cursore se ne calcola una alla
// volta e intanto resta quella di prima; per il PNG e la stampa (f) alla misura grande. Le più vecchie si liberano.
const pgDev=new Map(),pgDevLast=new Map(),pgDevJob=new Map();
function pgDevPut(k,d){pgDev.set(k,d);if(pgDev.size<=30)return;const keep=new Set(pgDevLast.values());for(const [kk,v] of pgDev){if(pgDev.size<=24)break;if(keep.has(v))continue;if(v)URL.revokeObjectURL(v.url);pgDev.delete(kk)}}
function pgDevQueue(id,key,m,ph){const j=pgDevJob.get(id);if(j){j.next=[key,m,ph];return}pgDevJob.set(id,{next:null});
 (async()=>{let k=key,mm=m,pp=ph;for(;;){try{if(!pgDev.has(k+'|v'))pgDevPut(k+'|v',await pgDevelop(mm,pp,1600));if(pgDev.get(k+'|v'))pgDevLast.set(id,pgDev.get(k+'|v'))}catch(e){console.warn('Foto non regolata',e);pgDev.set(k+'|v',null)}
  const nx=pgDevJob.get(id).next;pgDevJob.get(id).next=null;if(!nx||nx[0]===k)break;[k,mm,pp]=nx}pgDevJob.delete(id);Pg.ver++;if(isPage()&&Pg.p)pgRenderAll()})()}
// L'immagine da disegnare nella cornice: la foto regolata se è pronta, altrimenti l'ultima regolata o l'originale.
function pgPhotoFor(it,ctx){const m=pgImgFor(it,ctx);if(!m||!pgPhotoOn(it))return m;const key=pgPhotoKey(it,m);if(Pg.hq){const f=pgDev.get(key+'|f');if(f)return f}const v=pgDev.get(key+'|v');if(v)return v;if(v===null)return m;
 pgDevQueue(it.id,key,m,pgPh(it));return pgDevLast.get(it.id)||m}
async function pgDevFull(it,m){const k=pgPhotoKey(it,m)+'|f';let d=pgDev.get(k);if(!d){d=await pgDevelop(m,pgPh(it),4096);pgDevPut(k,d)}return d}
// Prima della stampa: le foto regolate di tutte le copie di pagina, alla misura grande.
async function pgDevPreload(insts){for(const I of insts){const m=pgMasterOf(I.pg);for(const it of [...(m?.items||[]),...I.pg.items]){if(!pgPhotoOn(it))continue;const im=pgImgFor(it,{row:I.row});if(im)try{await pgDevFull(it,im)}catch(e){console.warn('Foto non regolata',e)}}}}
// A parole: le regolazioni diverse da zero e il look.
function pgPhotoSay(it){const a=PG_ADJ.filter(x=>it.adj?.[x[0]]),L=it.look&&it.look!=='none'?PG_LOOKS.find(l=>l.id===it.look):null;return [a.length?'regolata: '+a.map(x=>x[1].toLowerCase()+' '+x[6](it.adj[x[0]])).join(', '):'',L?`look ${L.name}${(it.lookAmt??100)<100?' al '+it.lookAmt+'%':''}`:''].filter(Boolean).join('; ')}
// Proprietà: i cursori per gruppo, ognuno con la sua spiegazione, poi il look e la sua intensità.
function pgAdjR(id,label,min,max,step,v,fmt,hint){return `<div class="adj"><label for="pp-${id}">${esc(label)}</label><output id="pp-${id}-o" aria-hidden="true">${esc(fmt(v))}</output><input type="range" id="pp-${id}" data-prop="${id}" min="${min}" max="${max}" step="${step}" value="${v}" aria-valuetext="${esc(fmt(v))}" aria-describedby="pp-${id}-h"></div><small class="hint" id="pp-${id}-h">${esc(hint)}</small>`}
function pgPhotoProps(it){if(!it.img&&!it.field)return '';let s='<h3>Regolazioni della foto</h3><p class="hint">Il file della foto non cambia: le regolazioni valgono solo in questa cornice. Le frecce cambiano il cursore, Inizio e Fine lo portano agli estremi.</p>',g='';
 for(const [id,label,group,min,max,step,fmt,hint] of PG_ADJ){if(group!==g){g=group;s+=`<h4>${esc(group)}</h4>`}s+=pgAdjR('a_'+id,label,min,max,step,it.adj?.[id]||0,fmt,hint)}
 s+=ppS('look','Look',it.look||'none',PG_LOOKS.map(l=>[l.id,l.name]))+(it.look&&it.look!=='none'?ppR('lookAmt','Intensità del look',0,100,it.lookAmt??100,v=>v+'%'):'');
 return s+`<div class="pg-btns">${ppBtn('pgPhotoAuto','Regolazione automatica')}${pgPhotoOn(it)?ppBtn('pgPhotoReset','Togli le regolazioni'):''}${ppBtn('pgPhotoCopy','Copia le regolazioni')}${Pg.photoClip?ppBtn('pgPhotoPaste','Incolla le regolazioni'):''}</div>`}
// Comandi: regolazione automatica, via le regolazioni, e il primo cursore nelle proprietà.
async function pgPhotoAuto(){const it=pgNeed('image');if(!it)return;const m=pgImgFor(it,{row:pgCur().I.row});if(!m){toast('Scegli prima la foto della cornice');return}let v;try{v=pgAutoAdj((await pgDecode(m,512)).img)}catch(e){toast('La foto non si legge: '+e.message);return}
 const a={};for(const [k,x] of Object.entries(v))if(x)a[k]=x;if(!pgEdit('Regolazione automatica di '+it.name,()=>{if(Object.keys(a).length)it.adj=a;else delete it.adj},{props:true})){toast('La foto è già regolata così');return}
 announce(`«${it.name}»: ${Object.keys(a).length?pgPhotoSay(it):'la foto non ha bisogno di regolazioni'}. Ctrl+Z torna a prima.`)}
function pgPhotoReset(){const it=pgNeed('image');if(!it)return;if(!pgEdit('Togli le regolazioni di '+it.name,()=>{delete it.adj;delete it.look;delete it.lookAmt},{props:true})){toast('La foto non ha regolazioni');return}announce(`«${it.name}»: la foto è di nuovo com’è nel file`)}
function pgPhotoAdj(){const it=pgNeed('image');if(!it)return;if(!it.img&&!it.field){toast('Scegli prima la foto della cornice: Invio sulla cornice vuota');return}pgShowProps();$('pp-a_exposure')?.focus();announce('Regolazioni della foto: Esposizione. Tab passa al cursore successivo')}
// Copia e incolla delle regolazioni tra cornici per immagine, come in Grafica e con gli stessi tasti: si copia la ricetta
// della cornice scelta (luce, colore, effetti e look) e si incolla in tutte le cornici per immagine scelte, anche in quelle
// ancora vuote, dove vale quando arriva la foto. Incolla alcune regolazioni chiede quali gruppi incollare.
const PG_PHOTO_PARTS=[...['Luce','Colore','Effetti'].map(g=>[g,`${g}: ${PG_ADJ.filter(a=>a[2]===g).map(a=>a[1].toLowerCase()).join(', ')}`]),['Look','Look e la sua intensità']];
function pgPhotoCopy(){const it=pgNeed('image');if(!it)return;Pg.photoClip={...structuredClone(pgPh(it)),from:it.name};
 announce(`Copiate le regolazioni di «${it.name}»: ${pgPhotoSay(it)||'nessuna, la foto è com’è nel file, e incollandole si tolgono quelle delle altre cornici'}. Alt+Maiusc+V le incolla nelle cornici per immagine scelte.`)}
function pgPhotoTargets(){if(!Pg.photoClip){toast('Non ci sono regolazioni copiate: Alt+Maiusc+C sulla cornice della foto da cui prenderle');return null}const to=pgSelItems().filter(x=>x.kind==='image');if(!to.length){toast('Scegli prima una o più cornici per immagine');return null}return to}
function pgPhotoPaste(parts=PG_PHOTO_PARTS.map(x=>x[0])){const c=Pg.photoClip,to=pgPhotoTargets();if(!to)return;const keys=PG_ADJ.filter(a=>parts.includes(a[2])).map(a=>a[0]),look=parts.includes('Look');
 const ok=pgEdit('Incolla le regolazioni',()=>{for(const it of to){const a={...it.adj};for(const k of keys)if(c.adj[k])a[k]=c.adj[k];else delete a[k];if(Object.keys(a).length)it.adj=a;else delete it.adj;
  if(look){if(c.look!=='none'){it.look=c.look;if(c.lookAmt!==100)it.lookAmt=c.lookAmt;else delete it.lookAmt}else{delete it.look;delete it.lookAmt}}}},{props:true});
 const n=to.length,names=n===1?`«${to[0].name}»`:`${n} cornici: ${to.map(x=>x.name).join(', ')}`;if(!ok){toast(n===1?`«${to[0].name}» ha già queste regolazioni`:'Le cornici scelte hanno già queste regolazioni');return}
 announce(`Regolazioni di «${c.from}» incollate${parts.length<PG_PHOTO_PARTS.length?`, solo ${parts.map(x=>x.toLowerCase()).join(', ')},`:''} in ${names}.${to.some(x=>!x.img&&!x.field)?' Nelle cornici vuote valgono quando scegli la foto.':''} Ctrl+Z torna a prima.`)}
async function pgPhotoPasteSome(){if(!pgPhotoTargets())return;const c=Pg.photoClip;
 const v=await modal('Incolla alcune regolazioni',`<p>Regolazioni copiate da «${esc(c.from)}»: ${esc(pgPhotoSay({kind:'image',...c})||'nessuna')}. Scegli quali incollare nelle cornici per immagine scelte; le altre restano come sono.</p>`,PG_PHOTO_PARTS.map(([id,label])=>({id,label,type:'checkbox',value:true})),'Incolla');if(!v)return;
 const parts=PG_PHOTO_PARTS.map(x=>x[0]).filter(id=>v[id]);if(!parts.length){toast('Non hai scelto niente da incollare');return}pgPhotoPaste(parts)}
