// Regolazioni globali in più: curve, colori per tinta (HSL), bianco e nero con il miscelatore, chiarezza, foschia,
// nitidezza e riduzione del rumore. Stanno in r.fx; con i valori iniziali la foto non cambia (anche in Disegno).
// Ordine nello sviluppo: rumore e foschia sui pixel di partenza; tinte, bianco e nero e curve nel ciclo sui pixel;
// chiarezza e nitidezza sulla foto sviluppata, prima delle maschere. I raggi seguono la misura: la stessa ricetta dà
// lo stesso aspetto nell'anteprima ridotta e nella foto intera (la nitidezza fine si vede bene solo nella foto intera).
function newFx(){const line=()=>[[0,0],[255,255]],z=()=>[0,0,0,0,0,0,0,0];return {curves:{rgb:line(),r:line(),g:line(),b:line()},hue:z(),sat:z(),lum:z(),bw:false,mix:z(),clarity:0,dehaze:0,sharp:0,sharpR:1,noise:0,noiseC:0}}
// Otto gruppi di colori, con il centro della loro tinta in gradi; il peso di una tinta va da un centro al vicino.
const FX_HUES=[['rossi','dei rossi','il rosso',0],['arancioni','degli arancioni','l’arancione',30],['gialli','dei gialli','il giallo',60],['verdi','dei verdi','il verde',120],['azzurri','degli azzurri','l’azzurro',180],['blu','dei blu','il blu',225],['viola','dei viola','il viola',270],['magenta','dei magenta','il magenta',315]];
function hueSpan(deg){for(let i=0;i<8;i++){const a=FX_HUES[i][3],b=i<7?FX_HUES[i+1][3]:360;if(deg>=a&&deg<b)return [i,(i+1)%8,(deg-a)/(b-a)]}return [0,1,0]}
// Curve monotone (Fritsch e Carlson): passano per i punti senza ondeggiare. Restituisce 256 valori tra 0 e 1, o null se dritta.
function curveTable(pts){const n=pts.length,xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);if(n===2&&!ys[0]&&ys[1]===255&&!xs[0]&&xs[1]===255)return null;
 const d=[],m=[];for(let i=0;i<n-1;i++)d.push((ys[i+1]-ys[i])/Math.max(1,xs[i+1]-xs[i]));m[0]=d[0];m[n-1]=d[n-2];for(let i=1;i<n-1;i++)m[i]=d[i-1]*d[i]<=0?0:(d[i-1]+d[i])/2;
 for(let i=0;i<n-1;i++){if(!d[i]){m[i]=m[i+1]=0;continue}const a=m[i]/d[i],b=m[i+1]/d[i],s=a*a+b*b;if(s>9){const t=3/Math.sqrt(s);m[i]=t*a*d[i];m[i+1]=t*b*d[i]}}
 const T=new Float32Array(256);for(let x=0,i=0;x<256;x++){if(x<=xs[0]){T[x]=ys[0]/255;continue}if(x>=xs[n-1]){T[x]=ys[n-1]/255;continue}while(i<n-2&&x>xs[i+1])i++;
  const h=xs[i+1]-xs[i],t=(x-xs[i])/h,t2=t*t,t3=t2*t;T[x]=clamp((ys[i]*(2*t3-3*t2+1)+h*m[i]*(t3-2*t2+t)+ys[i+1]*(-2*t3+3*t2)+h*m[i+1]*(t3-t2))/255,0,1)}return T}
const curveAt=(T,v)=>{if(!T)return v;const f=clamp(v,0,1)*255,i=Math.min(254,f|0);return T[i]+(T[i+1]-T[i])*(f-i)};
// Tabelle per il ciclo sui pixel: curve già composte (RGB poi canale) su 1024 livelli; per ogni grado di tinta lo
// spostamento di tinta, il fattore di saturazione, la luminosità e il miscelatore del bianco e nero.
function fxTables(fx){if(!fx)return null;const cv=fx.curves,T=Object.fromEntries(['rgb','r','g','b'].map(k=>[k,curveTable(cv[k])])),curves=T.rgb||T.r||T.g||T.b,hsl=[fx.hue,fx.sat,fx.lum].some(a=>a.some(v=>v));
 if(!curves&&!hsl&&!fx.bw)return null;const C=curves?['r','g','b'].map(k=>Float32Array.from({length:1024},(_,j)=>curveAt(T[k],curveAt(T.rgb,j/1023)))):null;
 const DH=new Float32Array(360),DS=new Float32Array(360),DL=new Float32Array(360),MX=new Float32Array(360),mixOf=(a,i,j,t)=>a[i]*(1-t)+a[j]*t;
 for(let g=0;g<360;g++){const [i,j,t]=hueSpan(g);DH[g]=mixOf(fx.hue,i,j,t)*.3;DS[g]=1+mixOf(fx.sat,i,j,t)/100;DL[g]=mixOf(fx.lum,i,j,t)/100;MX[g]=mixOf(fx.mix,i,j,t)/100}
 return {C,hsl,bw:fx.bw,DH,DS,DL,MX}}
// Riduzione del rumore a strisce di righe con un margine sopra e sotto, così anche a 24 megapixel bastano array piccoli.
// Luminosità: filtro guidato con la foto come guida (leviga dove è piatto, tiene i contorni); colore: le differenze di
// colore sfocate, perché il rumore colorato è a macchie larghe.
function denoise(img,lum,col,z){const w=img.width,h=img.height,d=img.data,r=Math.max(1,Math.round(1.6*z)),eps=.0035*lum*lum+1e-6,cb=Math.max(1,Math.round(3*z)),halo=2*Math.max(r,cb)+1,STRIP=128;
 for(let y0=0;y0<h;y0+=STRIP){const y1=Math.min(h,y0+STRIP),a0=Math.max(0,y0-halo),a1=Math.min(h,y1+halo),rows=a1-a0,n=rows*w,Y=new Float32Array(n),U=new Float32Array(n),V=new Float32Array(n);
  for(let i=0,o=a0*w*4;i<n;i++,o+=4){const y=(.299*d[o]+.587*d[o+1]+.114*d[o+2])/255;Y[i]=y;U[i]=d[o+2]/255-y;V[i]=d[o]/255-y}
  let A=null,B=null;const tmp=new Float32Array(n);if(lum){const mI=boxMean(Y.slice(),w,rows,r,tmp),II=new Float32Array(n);for(let i=0;i<n;i++)II[i]=Y[i]*Y[i];boxMean(II,w,rows,r,tmp);A=II;B=mI;for(let i=0;i<n;i++){const m=mI[i],v=Math.max(0,II[i]-m*m),a=v/(v+eps);A[i]=a;B[i]=m-a*m}boxMean(A,w,rows,r,tmp);boxMean(B,w,rows,r,tmp)}
  const Uf=col?boxMean(boxMean(U.slice(),w,rows,cb,tmp),w,rows,cb,tmp):U,Vf=col?boxMean(boxMean(V.slice(),w,rows,cb,tmp),w,rows,cb,tmp):V;
  for(let y=y0;y<y1;y++)for(let x=0,i=(y-a0)*w,o=y*w*4;x<w;x++,i++,o+=4){const yy=A?A[i]*Y[i]+B[i]:Y[i],u=U[i]+(Uf[i]-U[i])*col,v=V[i]+(Vf[i]-V[i])*col,R=yy+v,Bl=yy+u;d[o]=R*255+.5;d[o+2]=Bl*255+.5;d[o+1]=(yy-.299*R-.114*Bl)/.587*255+.5}}}
// Foschia con il «canale scuro» (He, Sun e Tang), su una copia ridotta: dove anche il canale più scuro è chiaro c'è un
// velo del colore della luce. Toglierla allontana i colori da quella luce in proporzione al velo; aggiungerla li avvicina.
function dehaze(img,a){const w=img.width,h=img.height,d=img.data,f=Math.max(1,Math.ceil(Math.max(w,h)/320)),gw=Math.ceil(w/f),gh=Math.ceil(h/f),N=gw*gh,dark=new Float32Array(N),col=new Float32Array(N*3),mn=new Uint8Array(gw),S=[0,1,2].map(()=>new Float64Array(gw)),xi=new Int32Array(w);for(let x=0;x<w;x++)xi[x]=(x/f)|0;
 for(let gy=0;gy<gh;gy++){mn.fill(255);for(const s of S)s.fill(0);const y0=gy*f,y1=Math.min(h,y0+f);for(let y=y0;y<y1;y++)for(let x=0,o=y*w*4;x<w;x++,o+=4){const j=xi[x],R=d[o],G=d[o+1],B=d[o+2],m=R<G?(R<B?R:B):(G<B?G:B);if(m<mn[j])mn[j]=m;S[0][j]+=R;S[1][j]+=G;S[2][j]+=B}
  for(let j=0,q=gy*gw;j<gw;j++,q++){const c=(y1-y0)*Math.min(f,w-j*f);dark[q]=mn[j]/255;for(let k=0;k<3;k++)col[q*3+k]=S[k][j]/c/255}}
 // Minimo su 5×5 blocchi, poi media: la trasmissione cambia piano, senza aloni intorno ai contorni.
 const tmp=new Float32Array(N);for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){let m=1;for(let k=Math.max(0,x-2);k<=Math.min(gw-1,x+2);k++)m=Math.min(m,dark[y*gw+k]);tmp[y*gw+x]=m}
 for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){let m=1;for(let k=Math.max(0,y-2);k<=Math.min(gh-1,y+2);k++)m=Math.min(m,tmp[k*gw+x]);dark[y*gw+x]=m}
 const order=[...dark.keys()].sort((p,q)=>dark[q]-dark[p]).slice(0,Math.max(1,Math.round(N*.005))),L=[0,1,2].map(k=>order.reduce((s,q)=>s+col[q*3+k],0)/order.length),Lm=Math.max(.2,...L);
 for(let q=0;q<N;q++)tmp[q]=1-.9*dark[q]/Lm;boxMean(tmp,gw,gh,3);boxMean(tmp,gw,gh,3);
 const {x0,x1,fx}=gridCols(w,gw,f),row=new Float32Array(gw);
 for(let y=0,i=0;y<h;y++){gridRow(tmp,gw,gh,y,f,row);for(let x=0;x<w;x++,i++){const t=clamp(row[x0[x]]+(row[x1[x]]-row[x0[x]])*fx[x],0,1),o=i*4;
  if(a>0){const k=1/Math.max(.25,1-a*(1-t));for(let c=0;c<3;c++){const A=L[c]*255;d[o+c]=A+(d[o+c]-A)*k}}else{const k=-a*.55*(1.2-t);for(let c=0;c<3;c++)d[o+c]+=(L[c]*255-d[o+c])*k}}}}
// Prima dello sviluppo: ritocchi (06k), foschia e rumore. Per l'anteprima il risultato si ricorda per misura e valori,
// all'esportazione si lavora sul posto.
const fxPreCache=new Map();
function fxPre(src,dst,r,mc){const fx=r.fx,heal=r.heal||[],z=mc.k/mc.S,pre=!!fx&&!!(fx.noise||fx.noiseC||fx.dehaze),run=img=>{if(heal.length)retouch(img,heal,mc);if(pre&&fx.dehaze)dehaze(img,fx.dehaze/100);if(pre&&(fx.noise||fx.noiseC))denoise(img,fx.noise/100,fx.noiseC/100,z);return img};if(src===dst||!mc.key)return run(src);
 const key=mc.key+JSON.stringify([heal,pre&&[fx.noise,fx.noiseC,fx.dehaze]]);let img=fxPreCache.get(key);if(!img){img=run(new ImageData(new Uint8ClampedArray(src.data),src.width,src.height));fxPreCache.set(key,img);while(fxPreCache.size>2)fxPreCache.delete(fxPreCache.keys().next().value)}return img}
// Dopo lo sviluppo: chiarezza (contrasto locale dei toni medi su un raggio dell'1% del lato lungo) e nitidezza (maschera
// di contrasto sulla luminosità, con il raggio in pixel della foto intera).
function fxPost(img,fx,mc){const w=img.width,h=img.height,d=img.data,n=w*h,lum=()=>{const Y=new Uint8Array(n);for(let i=0,o=0;i<n;i++,o+=4)Y[i]=(54*d[o]+183*d[o+1]+19*d[o+2])>>8;return Y};
 if(fx.clarity){const Y=lum(),{a}=blurField(Y,w,h,Math.max(2,.01*mc.k)),k=fx.clarity/100*1.8;for(let i=0,o=0;i<n;i++,o+=4){const y=Y[i]/255,dy=(y-a[i]/65535)*k*4*y*(1-y)*255;d[o]+=dy;d[o+1]+=dy;d[o+2]+=dy}}
 if(fx.sharp){const Y=lum(),a=blur3(to16(Y),w,h,Math.max(1,boxR((fx.sharpR||1)*mc.k/mc.S))),k=fx.sharp/100*1.5;for(let i=0,o=0;i<n;i++,o+=4){const dy=(Y[i]-a[i]/257)*k;d[o]+=dy;d[o+1]+=dy;d[o+2]+=dy}}}
// Cursori: le voci di Dettaglio, poi tinta, saturazione e luminosità degli otto colori e il miscelatore.
const FX_CTL={clarity:{label:'Chiarezza',min:-100,max:100,step:1,fmt:fmtSigned,hint:'Aumenta il contrasto dei toni medi nei dettagli ampi: dà rilievo a texture, nuvole e lineamenti. A sinistra ammorbidisce.'},
 dehaze:{label:'Foschia',min:-100,max:100,step:1,fmt:v=>v?fmtSigned(v)+(v>0?', toglie il velo':', aggiunge un velo'):'0',hint:'A destra toglie foschia e nebbia, ridando contrasto e colore alle zone lontane; a sinistra aggiunge un velo.'},
 sharp:{label:'Nitidezza',min:0,max:150,step:1,fmt:v=>fmtInt(v),hint:'Rende più netti i contorni. Si giudica meglio sulla foto esportata alla misura piena; troppa crea aloni chiari intorno ai contorni.'},
 sharpR:{label:'Raggio della nitidezza',min:.5,max:3,step:.1,fmt:v=>fmtNum(v,1)+' pixel',hint:'Quanto sono larghi i contorni rinforzati: piccolo per i dettagli fini, grande per i contorni ampi.',zero:1},
 noise:{label:'Riduzione del rumore',min:0,max:100,step:1,fmt:v=>fmtInt(v),hint:'Toglie la grana delle foto scattate con poca luce senza confondere i contorni; troppa rende la pelle liscia come plastica.'},
 noiseC:{label:'Rumore di colore',min:0,max:100,step:1,fmt:v=>fmtInt(v),hint:'Toglie le macchioline colorate che compaiono nelle zone scure.'}};
const FX_KIND={h:['hue','Tinta'],s:['sat','Saturazione'],l:['lum','Luminosità'],m:['mix','Grigio']};
CTL_EXT.push(id=>{if(!id.startsWith('fx:'))return null;const k=id.slice(3),b=FX_CTL[k];if(b)return {...b,get:r=>r.fx?.[k]??b.zero??0,set:(r,v)=>{r.fx[k]=v}};
 const m=/^([hslm])(\d)$/.exec(k);if(!m)return null;const i=+m[2],[key,word]=FX_KIND[m[1]],[name,of,one]=FX_HUES[i],next=FX_HUES[(i+1)%8][2],prev=FX_HUES[(i+7)%8][2];
 return {label:`${word} ${of}`,min:-100,max:100,step:1,get:r=>r.fx?.[key][i]??0,set:(r,v)=>{r.fx[key][i]=v},
  fmt:m[1]==='h'?v=>v?fmtSigned(v)+', verso '+(v>0?next:prev):'0':v=>v?fmtSigned(v)+(v>0?', più ':', meno ')+(m[1]==='s'?'intensi':'chiari'):'0',
  hint:{h:`Sposta la tinta ${of} verso il colore vicino: utile per la pelle, il cielo, le foglie.`,s:`Rende più intensi o più spenti solo i ${name}.`,l:`Schiarisce o scurisce solo i ${name}: per esempio il cielo più scuro o la pelle più luminosa.`,m:`Nel bianco e nero, quanto chiari diventano i ${name}.`}[m[1]]}});
// Curve: canale, punto scelto e i due cursori del punto (ingresso e uscita); sul grafico i punti si trascinano col mouse.
const CURVE_CH=[['rgb','RGB'],['r','Rosso'],['g','Verde'],['b','Blu']];
I.curveCh='rgb';I.curvePt=1;I.hslTab='h';
const curvePts=(r=I.r)=>r.fx.curves[I.curveCh];
const pointName=(p,i)=>`Punto ${i+1} di ${p.length}: ingresso ${fmtInt(p[i][0])}, uscita ${fmtInt(p[i][1])}${i===0?', il nero':i===p.length-1?', il bianco':''}`;
CTL_EXT.push(id=>{if(id!=='cv:x'&&id!=='cv:y')return null;const P=curvePts(),i=clamp(I.curvePt,0,P.length-1),end=i===0||i===P.length-1,at=r=>curvePts(r)[i];
 if(id==='cv:x')return {label:'Ingresso del punto',min:end?P[i][0]:P[i-1][0]+1,max:end?P[i][0]:P[i+1][0]-1,step:1,get:r=>at(r)?.[0]??0,set:(r,v)=>{const q=curvePts(r);if(!end&&q[i])q[i][0]=clamp(v,q[i-1][0]+1,q[i+1][0]-1)},fmt:v=>fmtInt(v)+(v<64?', ombre':v<192?', toni medi':', luci'),hint:'Quale tono della foto sposta il punto: da 0, il nero, a 255, il bianco. Gli estremi restano al loro posto.',get zero(){return at(I.r)?.[0]??0}};
 return {label:'Uscita del punto',min:0,max:255,step:1,get:r=>at(r)?.[1]??0,set:(r,v)=>{const q=at(r);if(q)q[1]=v},fmt:v=>{const dd=v-(at(I.r)?.[0]??v);return fmtInt(v)+(dd?`, ${fmtInt(Math.abs(dd))} ${dd>0?'più chiaro':'più scuro'}`:', invariato')},hint:'Dove va quel tono: più in alto schiarisce, più in basso scurisce. Più punti danno una curva più precisa.',get zero(){return at(I.r)?.[0]??0}}});
function curveSay(ch=I.curveCh,r=I.r){const p=r.fx.curves[ch],T=curveTable(p),name=CURVE_CH.find(c=>c[0]===ch)[1];if(!T)return `Curva ${name} dritta: nessun cambiamento.`;
 const at=v=>Math.round(T[v]*255)-v,parts=[['ombre',64],['toni medi',128],['luci',192]].map(([n,v])=>{const dd=at(v);return dd?`${n} ${dd>0?'più chiare':'più scure'} di ${fmtInt(Math.abs(dd))}`:''}).filter(Boolean);
 return `Curva ${name} con ${p.length} punti${parts.length?': '+parts.join(', '):''}.`}
function drawCurve(){const cv=$('curveCv');if(!cv)return;const dpr=devicePixelRatio||1,W=Math.max(1,Math.round(cv.clientWidth*dpr)),H=W;if(cv.width!==W||cv.height!==H){cv.width=W;cv.height=H}const c=cv.getContext('2d'),P=curvePts(),T=curveTable(P),X=v=>v/255*(W-1),Y=v=>(1-v/255)*(H-1);
 c.fillStyle=palette['hist-bg']||'#fff';c.fillRect(0,0,W,H);c.strokeStyle=palette.line||'#ccc';c.lineWidth=dpr;c.beginPath();for(let k=1;k<4;k++){c.moveTo(X(k*64),0);c.lineTo(X(k*64),H);c.moveTo(0,Y(k*64));c.lineTo(W,Y(k*64))}c.stroke();
 const st=I.stats,hk={rgb:0,r:1,g:2,b:3}[I.curveCh];if(st?.n){let top=1;for(let i=2;i<254;i++)top=Math.max(top,st.H[hk][i]);c.globalAlpha=.3;c.fillStyle=palette['hist-l']||'#888';c.beginPath();c.moveTo(0,H);for(let i=0;i<256;i++)c.lineTo(X(i),H-Math.min(1,Math.sqrt(st.H[hk][i]/top))*H*.9);c.lineTo(W,H);c.fill();c.globalAlpha=1}
 c.setLineDash([3*dpr,3*dpr]);c.beginPath();c.moveTo(0,H);c.lineTo(W,0);c.stroke();c.setLineDash([]);
 c.strokeStyle={rgb:palette['hist-l'],r:palette['hist-r'],g:palette['hist-g'],b:palette['hist-b']}[I.curveCh]||'#000';c.lineWidth=2*dpr;c.beginPath();for(let v=0;v<256;v++)c[v?'lineTo':'moveTo'](X(v),Y(T?T[v]*255:v));c.stroke();
 P.forEach(([x,y],i)=>{c.beginPath();c.arc(X(x),Y(y),(i===I.curvePt?6:4)*dpr,0,7);c.fillStyle=i===I.curvePt?palette.accent||'#b0306a':palette['hist-bg']||'#fff';c.fill();c.strokeStyle=palette['hist-l']||'#000';c.lineWidth=1.5*dpr;c.stroke()})}
// Dopo ogni disegno del pannello o cambio di valore: la curva e la descrizione del punto.
function afterPanel(){if(!$('curveCv'))return;drawCurve();const sel=$('curvePt'),P=curvePts();if(sel&&sel.options.length===P.length)P.forEach((_,i)=>{sel.options[i].textContent=pointName(P,i)});const d=$('curveDesc');if(d)d.textContent=curveSay()}
function curveEdit(label,fn,say){if(!I.bmp){toast('Apri prima una foto');return}if(edit(label,r=>fn(r.fx.curves[I.curveCh]),{panel:true})){afterPanel();announce(say?say():curveSay())}}
function curveAdd(){const P=curvePts();let gi=0;for(let i=1;i<P.length-1;i++)if(P[i+1][0]-P[i][0]>P[gi+1][0]-P[gi][0])gi=i;if(P[gi+1][0]-P[gi][0]<4){toast('Non c’è più spazio per un punto');return}
 const x=Math.round((P[gi][0]+P[gi+1][0])/2),T=curveTable(P),y=Math.round(T?T[x]*255:x);I.curvePt=gi+1;curveEdit('Aggiungi un punto alla curva',p=>p.splice(gi+1,0,[x,y]),()=>'Aggiunto il '+pointName(curvePts(),gi+1))}
function curveDel(){const P=curvePts(),i=I.curvePt;if(i<=0||i>=P.length-1){toast('Il primo e l’ultimo punto non si tolgono: spostali in alto o in basso');return}I.curvePt=i-1;curveEdit('Togli un punto della curva',p=>p.splice(i,1))}
function curveS(){I.curvePt=1;curveEdit('Curva a S',p=>{p.splice(0,p.length,[0,0],[64,48],[192,208],[255,255])},()=>'Curva a S: ombre più scure e luci più chiare, più contrasto. '+curveSay())}
function curveReset(){I.curvePt=0;curveEdit('Riporta la curva',p=>{p.splice(0,p.length,[0,0],[255,255])})}
$('adjBody').addEventListener('click',e=>{const b=e.target.closest('[data-curve-ch],[data-hsl-tab]');if(!b||!I.bmp)return;if(b.dataset.curveCh){I.curveCh=b.dataset.curveCh;I.curvePt=Math.min(1,curvePts().length-1);renderPanel();announce(curveSay())}else{I.hslTab=b.dataset.hslTab;renderPanel();announce(b.textContent+' degli otto colori')}});
$('adjBody').addEventListener('change',e=>{if(e.target.id!=='curvePt')return;I.curvePt=Number(e.target.value);renderPanel()});
$('adjBody').addEventListener('input',e=>{if(/^(cv|fx):/.test(e.target.dataset?.ctl||''))afterPanel()});
// Trascinare un punto sul grafico, o un punto nuovo dove si clicca; doppio clic su un punto lo toglie.
let curveDrag=null;
$('adjBody').addEventListener('pointerdown',e=>{const cv=e.target.closest('#curveCv');if(!cv||!I.bmp)return;e.preventDefault();const r=cv.getBoundingClientRect(),x=clamp(Math.round((e.clientX-r.left)/r.width*255),0,255),y=clamp(Math.round((1-(e.clientY-r.top)/r.height)*255),0,255),P=curvePts();
 let i=P.findIndex(p=>Math.hypot((p[0]-x)*r.width/255,(p[1]-y)*r.height/255)<10);if(i<0){i=P.findIndex(p=>p[0]>x);if(i<=0||x-P[i-1][0]<2||P[i][0]-x<2)return;P.splice(i,0,[x,y])}I.curvePt=i;curveDrag={cv};cv.setPointerCapture(e.pointerId);afterPanel();requestRender(true)});
$('adjBody').addEventListener('pointermove',e=>{if(!curveDrag)return;const r=curveDrag.cv.getBoundingClientRect(),P=curvePts(),i=I.curvePt,x=Math.round((e.clientX-r.left)/r.width*255),y=clamp(Math.round((1-(e.clientY-r.top)/r.height)*255),0,255);if(i>0&&i<P.length-1)P[i][0]=clamp(x,P[i-1][0]+1,P[i+1][0]-1);P[i][1]=y;afterPanel();requestRender(true)});
$('adjBody').addEventListener('pointerup',()=>{if(!curveDrag)return;curveDrag=null;if(settle('Curva',{panel:true}))announce(curveSay())});
$('adjBody').addEventListener('dblclick',e=>{if(!e.target.closest('#curveCv'))return;curveDel()});
PANEL_HTML.curves=()=>{const P=curvePts(),off=I.bmp?'':' disabled';I.curvePt=clamp(I.curvePt,0,P.length-1);
 return `<span class="seg" role="group" aria-label="Canale della curva">${CURVE_CH.map(([k,l])=>`<button type="button" data-curve-ch="${k}" aria-pressed="${k===I.curveCh}"${off}>${l}</button>`).join('')}</span><canvas class="curve-cv" id="curveCv" aria-hidden="true"></canvas>
  <label for="curvePt">Punto della curva</label><select id="curvePt"${off}>${P.map((_,k)=>`<option value="${k}"${k===I.curvePt?' selected':''}>${esc(pointName(P,k))}</option>`).join('')}</select>${rangeHtml('cv:x',false)}${rangeHtml('cv:y',false)}
  <div class="insp-actions">${['curveAdd','curveDel','curveS','curveReset'].map(id=>cmdButton(id)).join('')}</div><p class="sel-desc" id="curveDesc">${esc(curveSay())}</p>`};
PANEL_HTML.hsl=()=>{const off=I.bmp?'':' disabled';return `<span class="seg" role="group" aria-label="Che cosa cambiare negli otto colori">${[['h','Tinta'],['s','Saturazione'],['l','Luminosità']].map(([k,l])=>`<button type="button" data-hsl-tab="${k}" aria-pressed="${k===I.hslTab}"${off}>${l}</button>`).join('')}</span>${FX_HUES.map((_,i)=>rangeHtml(`fx:${I.hslTab}${i}`,false)).join('')}`};
PANEL_HTML.bw=()=>`<div class="insp-actions">${cmdButton('bwToggle')}</div>${I.r.fx.bw?FX_HUES.map((_,i)=>rangeHtml('fx:m'+i,false)).join(''):'<p class="sel-desc">Il bianco e nero con il miscelatore decide quanto chiaro diventa ogni colore: il cielo blu scuro e drammatico, la pelle più luminosa.</p>'}`;
// Descrizione delle regolazioni in più, per Descrivi la foto.
function fxSummary(r=I.r){const f=r.fx,out=[];for(const [k] of CURVE_CH)if(curveTable(f.curves[k]))out.push(curveSay(k,r).replace(/\.$/,''));
 for(const [m,[key,word]] of Object.entries(FX_KIND))f[key].forEach((v,i)=>{if(v&&(m!=='m'||f.bw))out.push(`${word} ${FX_HUES[i][1]} ${fmtSigned(v)}`)});if(f.bw)out.unshift('bianco e nero con il miscelatore');
 for(const [k,c] of Object.entries(FX_CTL))if(f[k]!==(c.zero??0)&&(k!=='sharpR'||f.sharp))out.push(c.label+' '+c.fmt(f[k]));return out}
function bwToggle(){if(!I.bmp){toast('Apri prima una foto');return}edit(I.r.fx.bw?'Torna al colore':'Bianco e nero',r=>{r.fx.bw=!r.fx.bw},{panel:true});announce(I.r.fx.bw?'Bianco e nero: i cursori del miscelatore decidono quanto chiaro diventa ogni colore':'Di nuovo a colori')}
Object.assign(PHOTO_TOOL_ACTIONS,{curveAdd,curveDel,curveS,curveReset,bwToggle,fxSharpen:()=>liveRange('Nitidezza','fx:sharp'),fxNoise:()=>liveRange('Riduzione del rumore','fx:noise'),fxClarity:()=>liveRange('Chiarezza','fx:clarity'),fxDehaze:()=>liveRange('Foschia','fx:dehaze')});
