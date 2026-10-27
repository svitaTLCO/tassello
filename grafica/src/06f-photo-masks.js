// Selezioni e maschere. Una maschera è un elenco di operazioni scritte in coordinate della foto originale divise per il
// suo lato lungo («unità»): resta giusta se cambia l'inquadratura, si salva nella ricetta e si disegna a qualunque misura,
// ridotta per l'anteprima e piena per l'esportazione. Il risultato ha un byte per pixel: 0 fuori, 255 dentro, i valori
// intermedi sono i bordi morbidi.
// Forme, con mode add (aggiungi), sub (sottrai) o int (interseca): rect e poly (punti p), ellipse (cx, cy, rx, ry, angolo a),
// brush (punti p, diametro d, durezza h), wand (punto x y, tolleranza tol, contigua c), range (colore c, tolleranza tol),
// linear (da x1 y1, pieno, a x2 y2, nullo), radial (cx, cy, rx, ry, a, sfumatura f), raster (una maschera calcolata, id).
// Modifiche a tutta la maschera: invert, feather (raggio r), grow (r, negativo per contrarre), refine (raggio r, eps e).
// Contesto per disegnare le maschere alla misura w×h: matrice dalle unità ai pixel (U), pixel della foto inquadrata
// (px, per bacchetta, colori e rifinitura), pixel per unità (k) e chiave per ricordare le maschere dell'anteprima.
function maskCtx(r,w,h,px,key){const W=I.bmp.width,H=I.bmp.height,S=Math.max(W,H),U=geoMatrix(r,W,H,w,h).scale(S);return {r,w,h,px,U,S,k:Math.hypot(U.a,U.b),key}}
const toPx=(mc,x,y)=>{const p=mc.U.transformPoint(new DOMPoint(x,y));return [p.x,p.y]};
// Dal punto u, v dell'inquadratura (da 0 a 1) alle unità della foto, e ritorno.
function fullMatrix(r=I.r){const W=I.bmp.width,H=I.bmp.height,[fw,fh]=outSize(r,W,H);return {U:geoMatrix(r,W,H,fw,fh).scale(Math.max(W,H)),fw,fh}}
function unitsAt(u,v,r=I.r){const f=fullMatrix(r),p=f.U.inverse().transformPoint(new DOMPoint(u*f.fw,v*f.fh));return [p.x,p.y]}
function viewAt(x,y,r=I.r){const f=fullMatrix(r),p=f.U.transformPoint(new DOMPoint(x,y));return [p.x/f.fw,p.y/f.fh]}
const smoothRamp=(v,lo,hi)=>v<=lo?255:v>=hi?0:255*(hi-v)/(hi-lo)+.5;
// Le forme si disegnano su un canvas, con il bordo già sfumato di un pixel; si legge il canale indicato (3 l'opacità, 0 il rosso).
function canvasLayer(mc,draw,ch=3){const cv=new OffscreenCanvas(mc.w,mc.h),c=cv.getContext('2d',{willReadFrequently:true});draw(c);const d=c.getImageData(0,0,mc.w,mc.h).data,L=new Uint8Array(mc.w*mc.h);for(let i=0,j=ch;i<L.length;i++,j+=4)L[i]=d[j];return L}
function shapeLayer(op,mc){return canvasLayer(mc,c=>{c.setTransform(mc.U);c.fillStyle='#fff';c.beginPath();if(op.t==='ellipse')c.ellipse(op.cx,op.cy,Math.max(op.rx,1e-7),Math.max(op.ry,1e-7),op.a||0,0,Math.PI*2);else op.p.forEach(([x,y],i)=>c[i?'lineTo':'moveTo'](x,y));c.closePath();c.fill()})}
// Pennello: conta la distanza di ogni pixel dal tratto, con il bordo che sfuma secondo la durezza (la parte piena del
// raggio). Dove i tratti si sovrappongono vale il massimo, così la maschera non si riempie più del dovuto. Il tratto si
// divide in pezzi lunghi al massimo un diametro e si calcola solo nel riquadro di ogni pezzo.
function brushLayer(op,mc){const {w,h}=mc,L=new Uint8Array(w*h),R=Math.max(.7,op.d/2*mc.k),R2=R*R,hd=clamp(op.h??.5,0,.98),tab=new Uint8Array(258),k=256/R,pts=op.p.map(([x,y])=>toPx(mc,x,y));
 for(let i=0;i<258;i++){const t=Math.min(1,i/256);tab[i]=t<=hd?255:255*(1-smooth((t-hd)/(1-hd)))+.5}
 const seg=(ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy,q=l2?1/l2:0,x0=Math.max(0,Math.floor(Math.min(ax,bx)-R)),x1=Math.min(w-1,Math.ceil(Math.max(ax,bx)+R)),y0=Math.max(0,Math.floor(Math.min(ay,by)-R)),y1=Math.min(h-1,Math.ceil(Math.max(ay,by)+R));
  for(let y=y0;y<=y1;y++){const py=y+.5-ay;for(let x=x0,i=y*w+x0;x<=x1;x++,i++){const px=x+.5-ax;let t=(px*dx+py*dy)*q;t=t<0?0:t>1?1:t;const ex=px-t*dx,ey=py-t*dy,d2=ex*ex+ey*ey;if(d2>=R2)continue;const v=tab[(Math.sqrt(d2)*k)|0];if(v>L[i])L[i]=v}}};
 let [ax,ay]=pts[0];if(pts.length===1)seg(ax,ay,ax,ay);
 for(let i=1;i<pts.length;i++){const [bx,by]=pts[i],n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)/(2*R)));for(let j=0;j<n;j++)seg(ax+(bx-ax)*j/n,ay+(by-ay)*j/n,ax+(bx-ax)*(j+1)/n,ay+(by-ay)*(j+1)/n);ax=bx;ay=by}
 return L}
// Sfumatura lineare: piena prima del primo punto, nulla dopo il secondo, con un passaggio morbido in mezzo.
function linearLayer(op,mc){const {w,h}=mc,L=new Uint8Array(w*h),[x1,y1]=toPx(mc,op.x1,op.y1),[x2,y2]=toPx(mc,op.x2,op.y2),dx=x2-x1,dy=y2-y1,q=1/Math.max(1e-9,dx*dx+dy*dy);
 for(let y=0,i=0;y<h;y++){const by=(y+.5-y1)*dy;for(let x=0;x<w;x++,i++){let t=((x+.5-x1)*dx+by)*q;t=t<0?0:t>1?1:t;L[i]=255*(1-t*t*(3-2*t))+.5}}return L}
// Sfumatura radiale: un'ellisse piena al centro che sfuma verso il bordo; f è la parte del raggio che sfuma.
function radialLayer(op,mc){const {w,h}=mc,L=new Uint8Array(w*h),[cx,cy]=toPx(mc,op.cx,op.cy),ca=Math.cos(op.a||0),sa=Math.sin(op.a||0),[ax,ay]=toPx(mc,op.cx+op.rx*ca,op.cy+op.rx*sa),[bx,by]=toPx(mc,op.cx-op.ry*sa,op.cy+op.ry*ca);
 const ux=ax-cx,uy=ay-cy,vx=bx-cx,vy=by-cy,lu=ux*ux+uy*uy,lv=vx*vx+vy*vy,qu=1/Math.max(1e-9,lu),qv=1/Math.max(1e-9,lv),f=Math.max(clamp(op.f??.5,0,1),1/Math.max(1,Math.sqrt(Math.min(lu,lv)))),in0=1-f;
 for(let y=0,i=0;y<h;y++){const dy=y+.5-cy;for(let x=0;x<w;x++,i++){const dx=x+.5-cx,u=(dx*ux+dy*uy)*qu,v=(dx*vx+dy*vy)*qv,p=Math.sqrt(u*u+v*v);if(p>=1)continue;if(p<=in0){L[i]=255;continue}const t=(1-p)/f;L[i]=255*t*t*(3-2*t)+.5}}return L}
// Bacchetta magica: i pixel con un colore vicino a quello del punto (media 3×3; differenza massima tra i canali entro la
// tolleranza), con un piccolo passaggio morbido al limite. Contigua: solo quelli collegati al punto, riempiti per righe.
function wandLayer(op,mc){const {w,h}=mc,n=w*h,d=mc.px.data,L=new Uint8Array(n),[sx,sy]=toPx(mc,op.x,op.y),X=Math.floor(sx),Y=Math.floor(sy);if(X<0||Y<0||X>=w||Y>=h)return L;
 let R=0,G=0,B=0,c=0;for(let y=Math.max(0,Y-1);y<=Math.min(h-1,Y+1);y++)for(let x=Math.max(0,X-1);x<=Math.min(w-1,X+1);x++){const o=(y*w+x)*4;R+=d[o];G+=d[o+1];B+=d[o+2];c++}R/=c;G/=c;B/=c;
 const tol=op.tol??32,soft=Math.max(1,tol*.2),lo=tol-soft,hi=tol+soft,all=op.c===false,V=all?L:new Uint8Array(n);
 for(let i=0,o=0;i<n;i++,o+=4){let a=d[o]-R,b=d[o+1]-G,e=d[o+2]-B;a=a<0?-a:a;b=b<0?-b:b;e=e<0?-e:e;const m=a>b?(a>e?a:e):(b>e?b:e);V[i]=m<=lo?255:m>=hi?0:255*(hi-m)/(hi-lo)+.5}
 if(all)return L;
 const seed=Y*w+X;V[seed]||=255;const st=[seed];
 while(st.length){const s=st.pop();if(L[s])continue;const y=(s/w)|0,row=y*w;let l=s-row,r=l;
  while(l>0&&V[row+l-1]&&!L[row+l-1])l--;while(r<w-1&&V[row+r+1]&&!L[row+r+1])r++;for(let x=l;x<=r;x++)L[row+x]=V[row+x];
  for(const ny of [y-1,y+1]){if(ny<0||ny>=h)continue;const nr=ny*w;let run=false;for(let x=l;x<=r;x++){const ok=V[nr+x]&&!L[nr+x];if(ok&&!run)st.push(nr+x);run=ok}}}
 return L}
// Intervallo di colore: vicinanza a un colore misurata su luminosità e due assi di colore, con un passaggio morbido ampio.
function rangeLayer(op,mc){const {w,h}=mc,n=w*h,d=mc.px.data,L=new Uint8Array(n),[R,G,B]=op.c,Y0=.299*R+.587*G+.114*B,A0=R-G,B0=(R+G)/2-B,tol=op.tol??40,lo=tol*.5,hi=lo+tol;
 for(let i=0,o=0;i<n;i++,o+=4){const r=d[o],g=d[o+1],b=d[o+2],dy=(.299*r+.587*g+.114*b-Y0)*.7,da=r-g-A0,db=(r+g)/2-b-B0,m=Math.sqrt(dy*dy+da*da+db*db);L[i]=m<=lo?255:m>=hi?0:255*(hi-m)/(hi-lo)+.5}return L}
// Maschere calcolate (come lo scontorno): stanno a parte, nella misura di lavoro della foto originale, e si
// ridisegnano come la foto, con la stessa inquadratura.
const rasters=new Map();
function rasterCanvas(R){if(R.cv)return R.cv;const cv=new OffscreenCanvas(R.w,R.h),c=cv.getContext('2d'),img=c.createImageData(R.w,R.h),d=img.data;for(let i=0,j=0;i<R.data.length;i++,j+=4){d[j]=d[j+1]=d[j+2]=255;d[j+3]=R.data[i]}c.putImageData(img,0,0);return R.cv=cv}
function rasterLayer(op,mc){const R=rasters.get(op.id);if(!R)return new Uint8Array(mc.w*mc.h);const W=I.bmp.width,H=I.bmp.height;
 return canvasLayer(mc,c=>{c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.setTransform(mc.U.scale(W/mc.S/R.w,H/mc.S/R.h));c.drawImage(rasterCanvas(R),0,0)})}
const LAYERS={rect:shapeLayer,poly:shapeLayer,ellipse:shapeLayer,brush:brushLayer,linear:linearLayer,radial:radialLayer,wand:wandLayer,range:rangeLayer,raster:rasterLayer};
// Unione con il massimo, sottrazione e intersezione con il minimo: con i bordi morbidi danno passaggi puliti.
function combine(m,L,mode){if(!m||mode==='new')return mode==='sub'||mode==='int'?new Uint8Array(L.length):L;const n=L.length;
 if(mode==='sub')for(let i=0;i<n;i++){const v=255-L[i];if(m[i]>v)m[i]=v}else if(mode==='int')for(let i=0;i<n;i++){if(m[i]>L[i])m[i]=L[i]}else for(let i=0;i<n;i++){if(L[i]>m[i])m[i]=L[i]}return m}
// Sfocatura a scatola ripetuta tre volte (quasi gaussiana) su valori a 16 bit: in orizzontale con una somma che scorre,
// in verticale con una somma per colonna, così si leggono le righe in ordine anche sulle foto grandi.
function boxH(s,d,w,h,b){const k=1/(2*b+1),len=w*h;for(let o=0;o<len;o+=w){const last=o+w-1;let acc=s[o]*(b+1);for(let x=1;x<=b;x++)acc+=s[x<w?o+x:last];for(let x=0;x<w;x++){d[o+x]=(acc*k+.5)|0;const a=x+b+1,r=x-b;acc+=s[a<w?o+a:last]-s[r>0?o+r:o]}}}
function boxV(s,d,w,h,b){const k=1/(2*b+1),acc=new Float64Array(w);for(let x=0;x<w;x++)acc[x]=s[x]*(b+1);for(let y=1;y<=b;y++){const o=Math.min(y,h-1)*w;for(let x=0;x<w;x++)acc[x]+=s[o+x]}
 for(let y=0;y<h;y++){const o=y*w,add=Math.min(y+b+1,h-1)*w,sub=Math.max(y-b,0)*w;for(let x=0;x<w;x++){d[o+x]=(acc[x]*k+.5)|0;acc[x]+=s[add+x]-s[sub+x]}}}
function blur3(a,w,h,b){if(b<1)return a;const t=new a.constructor(a.length);for(let k=0;k<3;k++){boxH(a,t,w,h,b);boxV(t,a,w,h,b)}return a}
// Raggio della scatola per una sfocatura gaussiana di deviazione s (tre passate di raggio b danno varianza b(b+1)).
const boxR=s=>Math.max(0,Math.round(Math.sqrt(s*s+.25)-.5));
const to16=m=>{const a=new Uint16Array(m.length);for(let i=0;i<m.length;i++)a[i]=m[i]*257;return a};
// Da una griglia ridotta di passo s alla misura piena: per ogni riga si mescolano le due righe vicine della griglia,
// poi per ogni pixel i due valori vicini della riga, con indici e pesi delle colonne calcolati una volta sola.
function gridCols(w,gw,s){const x0=new Int32Array(w),x1=new Int32Array(w),fx=new Float32Array(w);for(let x=0;x<w;x++){let u=(x+.5)/s-.5;u=u<0?0:u>gw-1?gw-1:u;x0[x]=u|0;x1[x]=Math.min(gw-1,x0[x]+1);fx[x]=u-x0[x]}return {x0,x1,fx}}
function gridRow(a,gw,gh,y,s,out){let v=(y+.5)/s-.5;v=v<0?0:v>gh-1?gh-1:v;const o0=(v|0)*gw,o1=Math.min(gh-1,(v|0)+1)*gw,f=v-(v|0);for(let j=0;j<gw;j++)out[j]=a[o0+j]+(a[o1+j]-a[o0+j])*f;return out}
// Sfocatura di una maschera (deviazione sig) in valori a 16 bit; restituisce anche la deviazione ottenuta. Con un raggio
// grande si sfoca una copia ridotta e la si riporta alla misura piena: lo stesso risultato in una frazione del tempo.
function blurField(m,w,h,sig){const f=Math.max(1,Math.floor(sig/4));if(f===1){const b=boxR(sig);return {a:blur3(to16(m),w,h,b),s:Math.sqrt(b*(b+1))}}
 const gw=Math.ceil(w/f),gh=Math.ceil(h/f),n=gw*gh,g=new Float32Array(n),cnt=new Float32Array(n),xi=new Int32Array(w);for(let x=0;x<w;x++)xi[x]=(x/f)|0;
 for(let y=0,i=0;y<h;y++){const row=((y/f)|0)*gw;for(let x=0;x<w;x++,i++){const j=row+xi[x];g[j]+=m[i];cnt[j]++}}
 const g16=new Uint16Array(n);for(let j=0;j<n;j++)g16[j]=g[j]/cnt[j]*257+.5;const b=boxR(sig/f);blur3(g16,gw,gh,b);
 const a=new Uint16Array(w*h),{x0,x1,fx}=gridCols(w,gw,f),row=new Float32Array(gw);
 for(let y=0,i=0;y<h;y++){gridRow(g16,gw,gh,y,f,row);for(let x=0;x<w;x++,i++){const p=row[x0[x]];a[i]=(p+(row[x1[x]]-p)*fx[x]+.5)|0}}
 return {a,s:Math.hypot(f*Math.sqrt(b*(b+1)),Math.sqrt((f*f-1)/12))}}
// Sfuma: il bordo passa da dentro a fuori in circa due raggi.
function feather(m,w,h,R){if(R<1)return m;const {a}=blurField(m,w,h,R/2);for(let i=0;i<m.length;i++)m[i]=(a[i]/257+.5)|0;return m}
// Espandi o contrai: si sfoca con deviazione R e si sceglie il livello dove un bordo dritto si è spostato di R pixel,
// con un passaggio di un pixel per non avere scalini. Gli angoli escono arrotondati, i buchi piccoli si chiudono.
const Phi=x=>{const z=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*z),e=1-t*(.254829592+t*(-.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))))*Math.exp(-z*z);return x>=0?(1+e)/2:(1-e)/2};
function grow(m,w,h,R){const r=Math.abs(R);if(r<.5)return m;const {a,s}=blurField(m,w,h,r),sg=R>0?-1:1,lo=Phi(sg*r/s-.5/s)*65535,hi=Phi(sg*r/s+.5/s)*65535,k=255/Math.max(1,hi-lo);
 for(let i=0;i<m.length;i++){const v=a[i];m[i]=v<=lo?0:v>=hi?255:((v-lo)*k+.5)|0}return m}
// Media su una finestra quadrata di raggio r (i bordi contano solo i pixel che ci sono), sul posto.
function boxMean(f,w,h,r){const t=new Float32Array(f.length),cs=new Float64Array(w);
 for(let o=0;o<w*h;o+=w){let acc=0;for(let x=0;x<=Math.min(r,w-1);x++)acc+=f[o+x];for(let x=0;x<w;x++){t[o+x]=acc/(Math.min(x+r,w-1)-Math.max(x-r,0)+1);if(x+r+1<w)acc+=f[o+x+r+1];if(x-r>=0)acc-=f[o+x-r]}}
 for(let y=0;y<=Math.min(r,h-1);y++)for(let x=0,o=y*w;x<w;x++)cs[x]+=t[o+x];
 for(let y=0;y<h;y++){const o=y*w,cnt=Math.min(y+r,h-1)-Math.max(y-r,0)+1,a=(y+r+1)*w,s=(y-r)*w;for(let x=0;x<w;x++){f[o+x]=cs[x]/cnt;if(y+r+1<h)cs[x]+=t[a+x];if(y-r>=0)cs[x]-=t[s+x]}}return f}
// Rifinitura dei bordi con il filtro guidato a colori (He, Sun e Tang; versione veloce di He e Sun): in ogni finestra
// la maschera diventa una funzione lineare dei colori della foto, così il bordo segue i contorni veri, capelli e foglie
// compresi, invece della linea tracciata. I coefficienti si calcolano su una copia ridotta e si applicano a ogni pixel.
function guidedRefine(m,px,w,h,R,eps=1e-3){const s=Math.max(1,Math.floor(R/4),Math.ceil(Math.sqrt(w*h/6e5))),gw=Math.ceil(w/s),gh=Math.ceil(h/s),n=gw*gh,r=Math.max(1,Math.round(R/s)),d=px.data;
 const F=()=>new Float32Array(n),Ir=F(),Ig=F(),Ib=F(),P=F(),cnt=F(),xi=new Int32Array(w);for(let x=0;x<w;x++)xi[x]=(x/s)|0;
 for(let y=0,i=0;y<h;y++){const row=((y/s)|0)*gw;for(let x=0;x<w;x++,i++){const j=row+xi[x],o=i*4;Ir[j]+=d[o];Ig[j]+=d[o+1];Ib[j]+=d[o+2];P[j]+=m[i];cnt[j]++}}
 for(let j=0;j<n;j++){const c=cnt[j];Ir[j]/=255*c;Ig[j]/=255*c;Ib[j]/=255*c;P[j]/=255*c}
 const prod=(a,b)=>{const o=F();for(let j=0;j<n;j++)o[j]=a[j]*b[j];return boxMean(o,gw,gh,r)},rp=prod(Ir,P),gp=prod(Ig,P),bp=prod(Ib,P),rr=prod(Ir,Ir),rg=prod(Ir,Ig),rb=prod(Ir,Ib),gg=prod(Ig,Ig),gb=prod(Ig,Ib),bb=prod(Ib,Ib);
 for(const a of [Ir,Ig,Ib,P])boxMean(a,gw,gh,r);
 const Ar=F(),Ag=F(),Ab=F(),Bq=F();
 for(let j=0;j<n;j++){const mr=Ir[j],mg=Ig[j],mb=Ib[j],mp=P[j],cr=rp[j]-mr*mp,cg=gp[j]-mg*mp,cb=bp[j]-mb*mp,
  a=rr[j]-mr*mr+eps,b=rg[j]-mr*mg,c=rb[j]-mr*mb,e=gg[j]-mg*mg+eps,f=gb[j]-mg*mb,g=bb[j]-mb*mb+eps,
  i0=e*g-f*f,i1=f*c-b*g,i2=b*f-e*c,i4=a*g-c*c,i5=c*b-a*f,i8=a*e-b*b,det=a*i0+b*i1+c*i2,
  ar=(cr*i0+cg*i1+cb*i2)/det,ag=(cr*i1+cg*i4+cb*i5)/det,ab=(cr*i2+cg*i5+cb*i8)/det;Ar[j]=ar;Ag[j]=ag;Ab[j]=ab;Bq[j]=mp-ar*mr-ag*mg-ab*mb}
 for(const a of [Ar,Ag,Ab,Bq])boxMean(a,gw,gh,r);
 // Ritorno alla misura piena: coefficienti interpolati e applicati ai colori di ogni pixel. Dove nella finestra la
 // maschera era tutta piena o tutta vuota il risultato è già noto e non si calcola.
 const {x0,x1,fx}=gridCols(w,gw,s),G=()=>new Float32Array(gw),RA=G(),RG=G(),RB=G(),RQ=G(),RP=G(),k=1/255;
 for(let y=0,i=0;y<h;y++){gridRow(Ar,gw,gh,y,s,RA);gridRow(Ag,gw,gh,y,s,RG);gridRow(Ab,gw,gh,y,s,RB);gridRow(Bq,gw,gh,y,s,RQ);gridRow(P,gw,gh,y,s,RP);
  for(let x=0;x<w;x++,i++){const a=x0[x],b=x1[x],t=fx[x],pm=RP[a]+(RP[b]-RP[a])*t;if(pm<=.002){m[i]=0;continue}if(pm>=.998){m[i]=255;continue}
   const o=i*4,q=(RA[a]+(RA[b]-RA[a])*t)*d[o]*k+(RG[a]+(RG[b]-RG[a])*t)*d[o+1]*k+(RB[a]+(RB[b]-RB[a])*t)*d[o+2]*k+RQ[a]+(RQ[b]-RQ[a])*t;m[i]=q<=0?0:q>=1?255:(q*255+.5)|0}}
 return m}
function rasterOps(ops,mc,from=null,start=0){let m=from;for(let i=start;i<ops.length;i++){const op=ops[i],t=op.t,n=mc.w*mc.h;
 if(t==='invert'){m??=new Uint8Array(n);for(let j=0;j<n;j++)m[j]=255-m[j]}
 else if(t==='all'){m=new Uint8Array(n).fill(255)}
 else if(t==='feather'){if(m)feather(m,mc.w,mc.h,op.r*mc.k)}
 else if(t==='grow'){if(m)grow(m,mc.w,mc.h,op.r*mc.k)}
 else if(t==='refine'){if(m&&mc.px)guidedRefine(m,mc.px,mc.w,mc.h,Math.max(1,op.r*mc.k),op.e??1e-3)}
 else if(LAYERS[t])m=combine(m,LAYERS[t](op,mc),op.mode||'add')}
 return m||new Uint8Array(mc.w*mc.h)}
// Maschere dell'anteprima ricordate per chiave: aggiungere un tratto ricalcola solo l'ultima operazione.
const maskCache=new Map();
function maskOf(ops,mc){if(!mc.key)return mc.memo?.get(JSON.stringify(ops))??rasterOps(ops,mc);const key=mc.key+JSON.stringify(ops);let m=maskCache.get(key);if(m){maskCache.delete(key);maskCache.set(key,m);return m}
 const prev=ops.length>1&&maskCache.get(mc.key+JSON.stringify(ops.slice(0,-1)));m=prev?rasterOps(ops,mc,prev.slice(),ops.length-1):rasterOps(ops,mc);
 maskCache.set(key,m);while(maskCache.size>24)maskCache.delete(maskCache.keys().next().value);return m}
// All'esportazione la foto si sviluppa sul posto: le maschere che leggono i pixel si calcolano prima, dagli originali.
function prepareMasks(r,mc){mc.memo=new Map();for(const ops of [...(r.masks||[]).filter(m=>!m.off).map(m=>m.ops),...(typeof cutOps==='function'&&r.cut?[cutOps(r)]:[])])if(ops?.length)mc.memo.set(JSON.stringify(ops),rasterOps(ops,mc));return mc}
const maskEmpty=m=>{for(let i=0;i<m.length;i+=7)if(m[i])return false;return !m.some(v=>v)};
// Regolazione locale: le regolazioni della maschera applicate ai pixel già sviluppati e pesate dalla maschera, così più
// maschere si sommano una sull'altra. amt è l'intensità (da 0 a 1); inv usa la maschera rovesciata.
function applyLocal(img,m,a,amt=1,inv=false){const [TR,TG,TB]=toneTables(a),d=img.data,sat=1+(a.saturation||0)/100,vib=(a.vibrance||0)/100,color=sat!==1||vib!==0,k=amt/255;
 for(let j=0,i=0;j<m.length;j++,i+=4){const w=(inv?255-m[j]:m[j])*k;if(!w)continue;let R=TR[d[i]],G=TG[d[i+1]],B=TB[d[i+2]];
  if(color){const Y=.2126*R+.7152*G+.0722*B,mx=R>G?(R>B?R:B):(G>B?G:B),mn=R<G?(R<B?R:B):(G<B?G:B),s=sat*(1+vib*(1-(mx-mn)));R=Y+(R-Y)*s;G=Y+(G-Y)*s;B=Y+(B-Y)*s}
  d[i]+=(R*255-d[i])*w;d[i+1]+=(G*255-d[i+1])*w;d[i+2]+=(B*255-d[i+2])*w}}
// Dopo lo sviluppo: le maschere con le loro regolazioni, una sull'altra nell'ordine dell'elenco.
function developLocal(img,r,mc){for(const m of r.masks||[])if(!m.off&&m.ops?.length&&ADJ.some(([id])=>m.adj[id])&&m.amt!==0)applyLocal(img,maskOf(m.ops,mc),m.adj,(m.amt??100)/100,m.inv);if(r.cut&&typeof applyCut==='function')applyCut(img,r,mc)}
// Nomi dei colori, dalla tinta, dalla saturazione e dalla luminosità: servono a descrivere a parole selezioni e punti.
function colorName(r,g,b){const mx=Math.max(r,g,b)/255,mn=Math.min(r,g,b)/255,l=(mx+mn)/2,c=mx-mn,s=c?c/(1-Math.abs(2*l-1)):0;
 if(c<.07||s<.1)return l<.1?'nero':l<.3?'grigio scuro':l<.62?'grigio':l<.9?'grigio chiaro':'bianco';
 const R=r/255,G=g/255,B=b/255;let hue=mx===R?((G-B)/c+6)%6:mx===G?(B-R)/c+2:(R-G)/c+4;hue*=60;
 if(hue>=10&&hue<50&&l<.42)return l<.18?'marrone scuro':'marrone';if(hue>=18&&hue<55&&l>.62&&s<.6)return 'beige';
 const name=hue<12||hue>=345?(l>.7?'rosa':'rosso'):hue<40?'arancione':hue<66?'giallo':hue<160?'verde':hue<195?'azzurro':hue<255?'blu':hue<290?'viola':hue<330?'fucsia':'rosa';
 return name+(l<.25?' scuro':l>.75&&name!=='rosa'?' chiaro':'')+(s<.28?' tenue':'')}
// Dove sta una zona della foto: posizione del centro in terzi.
function placeName(cx,cy){const v=cy<1/3?'in alto':cy>2/3?'in basso':'',o=cx<1/3?'a sinistra':cx>2/3?'a destra':'';return v&&o?v+' '+o:v||o||'al centro'}
// Descrizione a parole di una maschera: quanta parte copre, dove, quante zone, quanto morbido è il bordo, quali colori.
function describeMask(m,w,h,px,what='La selezione'){let sum=0,cnt=0,sx=0,sy=0,x0=w,y0=h,x1=-1,y1=-1,soft=0;const col=new Map(),d=px?.data,step=Math.max(1,Math.floor(Math.sqrt(w*h/60000)));
 for(let y=0;y<h;y++)for(let x=0,i=y*w;x<w;x++,i++){const v=m[i];if(!v)continue;sum+=v;if(v<250)soft++;if(v>=128){cnt++;sx+=x;sy+=y;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
  if(d&&v>=128&&x%step===0&&y%step===0){const o=i*4,n=colorName(d[o],d[o+1],d[o+2]);col.set(n,(col.get(n)||0)+1)}}
 const cover=sum/255/(w*h);if(cover<.0005)return `${what} è vuota.`;if(cover>.995)return `${what} copre tutta la foto.`;
 const parts=countParts(m,w,h),tot=[...col.values()].reduce((a,b)=>a+b,0),top=[...col].sort((a,b)=>b[1]-a[1]).filter(([,n])=>n/tot>=.08).slice(0,3).map(([k,n])=>`${k} ${fmtPct(n/tot)}`);
 const pc=v=>fmtPct(v,0);
 return `${what} copre ${fmtPct(cover,cover<.1?1:0)} della foto, ${cnt?placeName(sx/cnt/w,sy/cnt/h):'al centro'}${parts>1?`, in ${parts} zone separate`:''}: da ${pc(x0/w)} a ${pc((x1+1)/w)} della larghezza e da ${pc(y0/h)} a ${pc((y1+1)/h)} dell’altezza. ${soft/Math.max(1,cnt)>.2?'Bordi morbidi. ':''}${top.length?'Colori: '+top.join(', ')+'.':''}`}
// Zone separate, contate su una copia ridotta; quelle sotto lo 0,2% della foto non contano.
function countParts(m,w,h){const s=Math.max(1,Math.ceil(Math.max(w,h)/256)),gw=Math.ceil(w/s),gh=Math.ceil(h/s),g=new Uint8Array(gw*gh);for(let y=0;y<h;y+=s)for(let x=0;x<w;x+=s)if(m[y*w+x]>=128)g[(y/s)*gw+x/s]=1;
 let parts=0;const min=gw*gh*.002,st=[];for(let i=0;i<g.length;i++){if(g[i]!==1)continue;let n=0;st.push(i);g[i]=2;while(st.length){const j=st.pop(),x=j%gw;n++;for(const k of [x>0?j-1:-1,x<gw-1?j+1:-1,j-gw,j+gw])if(k>=0&&k<g.length&&g[k]===1){g[k]=2;st.push(k)}}if(n>=min)parts++}return parts}
// Contorno della selezione: i pixel al confine tra dentro e fuori, su entrambi i lati (il bordo della foto conta come fuori).
function edgesOf(m,w,h){const out=[];for(let y=0;y<h;y++)for(let x=0,i=y*w;x<w;x++,i++){const a=m[i]>=128;if(a?(x===0||x===w-1||y===0||y===h-1||m[i-1]<128||m[i+1]<128||m[i-w]<128||m[i+w]<128):((x>0&&m[i-1]>=128)||(x<w-1&&m[i+1]>=128)||(y>0&&m[i-w]>=128)||(y<h-1&&m[i+w]>=128)))out.push(i)}return Int32Array.from(out)}
