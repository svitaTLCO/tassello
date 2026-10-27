// Sviluppo dei pixel: la stessa ricetta vale per l'anteprima e per la foto intera che si esporta.
// 1. inquadratura: rotazione di 90 gradi, riflessione, raddrizzamento e ritaglio, disegnati su un canvas;
// 2. luce: per ogni canale una tabella di 256 valori con esposizione e bilanciamento del bianco (in luce lineare),
//    poi neri, bianchi, ombre, alte luci e contrasto (in valori percepiti); 3. vividezza e saturazione;
// 4. vignettatura; 5. look, come tabella di colori 3D (LUT) mescolata con l'intensità scelta.
const S2L=new Float32Array(256).map((_,i)=>{const c=i/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4});
const l2s=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
const smooth=x=>x*x*(3-2*x);
// Inquadratura nel riferimento della foto ruotata di 90 gradi: dimensioni del riquadro e del ritaglio, angolo del ritaglio.
function cropRect(r,W,H){const q=r.rot%180!==0,RW=q?H:W,RH=q?W:H,k=(RATIOS.find(x=>x[0]===r.ratio)||RATIOS[0])[2];let cw=RW,ch=RH;if(k){if(RW/RH>k)cw=RH*k;else ch=RW/k}return{RW,RH,cw,ch,x:(RW-cw)*r.cx,y:(RH-ch)*r.cy}}
const outSize=(r,W,H)=>{const c=cropRect(r,W,H);return [Math.max(1,Math.round(c.cw)),Math.max(1,Math.round(c.ch))]};
// Matrice dalla foto originale (pixel del file) all'inquadratura di misura w×h, per la foto e per le maschere: la foto
// si ruota intorno al centro e si ingrandisce quanto basta perché il raddrizzamento non lasci angoli vuoti.
function geoMatrix(r,W,H,outW,outH){const c=cropRect(r,W,H),a=r.angle*Math.PI/180,co=Math.abs(Math.cos(a)),si=Math.abs(Math.sin(a)),s=Math.max((c.RW*co+c.RH*si)/c.RW,(c.RW*si+c.RH*co)/c.RH),kx=outW/c.cw,ky=outH/c.ch;
 let m=new DOMMatrix([kx,0,0,ky,-c.x*kx,-c.y*ky]).translate(c.RW/2,c.RH/2).rotate(r.angle).scale(s);if(r.flip)m=m.scale(-1,1);return m.rotate(r.rot).translate(-W/2,-H/2)}
function drawGeometry(ctx,bmp,r,outW,outH){ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(geoMatrix(r,bmp.width,bmp.height,outW,outH));ctx.drawImage(bmp,0,0);ctx.restore()}
// Tabelle della luce: ogni valore del file (0-255) diventa un valore percepito tra 0 e 1, già regolato.
function toneTables(a){const g=2**a.exposure,t=a.temp/100,n=a.tint/100;let wr=(1+.3*t)*(1+.12*n),wg=1-.25*n,wb=(1-.3*t)*(1+.12*n);const y=.2126*wr+.7152*wg+.0722*wb;
 const b0=-a.blacks*.0012,w0=1-a.whites*.0012,sh=a.shadows/100*1.69,hi=a.highlights/100*1.69,c=a.contrast/100;
 const curve=v=>{let x=clamp((v-b0)/(w0-b0),0,1);x+=sh*x*(1-x)*(1-x)+hi*x*x*(1-x);x=clamp(x,0,1);x=c>=0?x+c*(smooth(x)-x):.5+(x-.5)*(1+c*.5);return clamp(x,0,1)};
 return [wr/y,wg/y,wb/y].map(w=>{const tab=new Float32Array(256);for(let i=0;i<256;i++)tab[i]=curve(l2s(Math.min(1,S2L[i]*g*w)));return tab})}
// Applica la ricetta ai pixel di src (già inquadrati) e scrive in dst, della stessa misura; src e dst possono coincidere.
// Con il contesto mc (vedi maskCtx) seguono le maschere della foto: regolazioni locali e scontorno.
// Il ciclo sui pixel non chiama funzioni: con un'anteprima di qualche milione di pixel ogni chiamata si sente.
function develop(src,dst,r,lut,mc){const [TR,TG,TB]=toneTables(r.adj),w=src.width,h=src.height,s=src.data,d=dst.data,sat=1+r.adj.saturation/100,vib=r.adj.vibrance/100,vg=r.adj.vignette/100*.75,amt=clamp(r.lookAmt/100,0,1),L=lut&&amt>0?lut:null,color=sat!==1||vib!==0;
 // Solo luce: bastano tre tabelle di byte.
 if(!color&&!vg&&!L){const BR=Uint8ClampedArray.from(TR,v=>v*255+.5),BG=Uint8ClampedArray.from(TG,v=>v*255+.5),BB=Uint8ClampedArray.from(TB,v=>v*255+.5);for(let i=0;i<s.length;i+=4){d[i]=BR[s[i]];d[i+1]=BG[s[i+1]];d[i+2]=BB[s[i+2]];d[i+3]=s[i+3]}if(mc)developLocal(dst,r,mc);return dst}
 const cx=w/2,cy=h/2,rad=1/Math.hypot(cx,cy),N=L?L.size:2,n=N-1,D=L?.data,SY=N*3,SZ=N*N*3,lx=L?L.min[0]:0,ly=L?L.min[1]:0,lz=L?L.min[2]:0,kx=L?n/(L.max[0]-lx):0,ky=L?n/(L.max[1]-ly):0,kz=L?n/(L.max[2]-lz):0;
 for(let y=0,i=0;y<h;y++){const dy=(y+.5-cy)*rad,dy2=dy*dy;for(let x=0;x<w;x++,i+=4){let R=TR[s[i]],G=TG[s[i+1]],B=TB[s[i+2]];
  if(color){const Y=.2126*R+.7152*G+.0722*B,mx=R>G?(R>B?R:B):(G>B?G:B),mn=R<G?(R<B?R:B):(G<B?G:B),k=sat*(1+vib*(1-(mx-mn)));R=Y+(R-Y)*k;G=Y+(G-Y)*k;B=Y+(B-Y)*k}
  if(vg){const dx=(x+.5-cx)*rad;let t=(dx*dx+dy2-.2)*1.25;t=t<0?0:t>1?1:t;const f=1+vg*t*t*(3-2*t);R*=f;G*=f;B*=f}
  // Look: tabella di colori 3D (come nei file .cube il rosso cambia più in fretta, poi il verde, poi il blu)
  // con interpolazione tetraedrica: dal vertice di partenza si va verso l'asse con la frazione più grande.
  if(L){let u=(R-lx)*kx,v=(G-ly)*ky,q=(B-lz)*kz;u=u<0?0:u>n?n:u;v=v<0?0:v>n?n:v;q=q<0?0:q>n?n:q;let u0=u|0,v0=v|0,q0=q|0;if(u0===n)u0--;if(v0===n)v0--;if(q0===n)q0--;
   const fu=u-u0,fv=v-v0,fq=q-q0,i0=((q0*N+v0)*N+u0)*3,i1=i0+3+SY+SZ;let f1,f2,f3,ia,ib;
   if(fu>=fv){if(fv>=fq){f1=fu;f2=fv;f3=fq;ia=i0+3;ib=ia+SY}else if(fu>=fq){f1=fu;f2=fq;f3=fv;ia=i0+3;ib=ia+SZ}else{f1=fq;f2=fu;f3=fv;ia=i0+SZ;ib=ia+3}}
   else{if(fq>=fv){f1=fq;f2=fv;f3=fu;ia=i0+SZ;ib=ia+SY}else if(fq>=fu){f1=fv;f2=fq;f3=fu;ia=i0+SY;ib=ia+SZ}else{f1=fv;f2=fu;f3=fq;ia=i0+SY;ib=ia+3}}
   R+=(D[i0]+f1*(D[ia]-D[i0])+f2*(D[ib]-D[ia])+f3*(D[i1]-D[ib])-R)*amt;
   G+=(D[i0+1]+f1*(D[ia+1]-D[i0+1])+f2*(D[ib+1]-D[ia+1])+f3*(D[i1+1]-D[ib+1])-G)*amt;
   B+=(D[i0+2]+f1*(D[ia+2]-D[i0+2])+f2*(D[ib+2]-D[ia+2])+f3*(D[i1+2]-D[ib+2])-B)*amt}
  d[i]=R*255+.5;d[i+1]=G*255+.5;d[i+2]=B*255+.5;d[i+3]=s[i+3]}}
 if(mc)developLocal(dst,r,mc);return dst}
// Look pronti: funzioni sul colore percepito, trasformate in tabelle 3D al primo uso.
const sCurve=(x,c)=>x+c*(smooth(clamp(x,0,1))-x);
const luma=(r,g,b)=>.2126*r+.7152*g+.0722*b;
const satur=(r,g,b,k)=>{const y=luma(r,g,b);return [y+(r-y)*k,y+(g-y)*k,y+(b-y)*k]};
const LOOKS=[{id:'none',name:'Nessun look'},
 {id:'bn',name:'Bianco e nero',fn:(r,g,b)=>{const v=sCurve(.3*r+.59*g+.11*b,.25);return [v,v,v]}},
 {id:'seppia',name:'Seppia',fn:(r,g,b)=>{const v=sCurve(.3*r+.59*g+.11*b,.15);return [v*1.07+.02,v*.97+.01,v*.8+.01]}},
 {id:'caldo',name:'Caldo',fn:(r,g,b)=>[r*1.06+.01,g*1.01,b*.9]},
 {id:'freddo',name:'Freddo',fn:(r,g,b)=>[r*.92,g*.99,b*1.07+.01]},
 {id:'pellicola',name:'Pellicola',fn:(r,g,b)=>{const f=v=>.05+.9*sCurve(v,.3),[R,G,B]=satur(r,g,b,.85);return [f(R)*1.03,f(G),f(B)*.92+.04]}},
 {id:'vivace',name:'Vivace',fn:(r,g,b)=>satur(r,g,b,1.35).map(v=>sCurve(v,.2))},
 {id:'tenue',name:'Tenue',fn:(r,g,b)=>satur(r,g,b,.7).map(v=>.04+.9*v)}];
function bakeLook(fn,N=17){const D=new Float32Array(N*N*N*3);let i=0;for(let b=0;b<N;b++)for(let g=0;g<N;g++)for(let r=0;r<N;r++){const o=fn(r/(N-1),g/(N-1),b/(N-1));D[i++]=o[0];D[i++]=o[1];D[i++]=o[2]}return {size:N,data:D,min:[0,0,0],max:[1,1,1]}}
const lookList=()=>[...LOOKS.map(l=>[l.id,l.name]),...Object.entries(I.luts).map(([id,l])=>[id,l.name+' (LUT)'])];
const lookName=id=>(lookList().find(x=>x[0]===id)||[0,'Nessun look'])[1];
function lutOf(id){if(I.luts[id])return I.luts[id];const l=LOOKS.find(x=>x.id===id);return l?.fn?(l.baked??=bakeLook(l.fn)):null}
// File .cube (Adobe/Resolve): TITLE, LUT_3D_SIZE, DOMAIN_MIN e DOMAIN_MAX facoltativi, poi una riga "r g b" per colore.
function parseCube(text,fileName){let size=0,title='',min=[0,0,0],max=[1,1,1];const vals=[];
 for(const raw of text.split(/\r?\n/)){const l=raw.trim();if(!l||l[0]==='#')continue;const p=l.split(/\s+/),k=p[0].toUpperCase();
  if(k==='TITLE'){title=l.slice(5).trim().replace(/^"|"$/g,'');continue}
  if(k==='LUT_1D_SIZE')throw Error('Questo file contiene una tabella a una dimensione: servono le tabelle 3D (LUT_3D_SIZE).');
  if(k==='LUT_3D_SIZE'){size=parseInt(p[1],10);continue}
  if(k==='DOMAIN_MIN'){min=p.slice(1,4).map(Number);continue}if(k==='DOMAIN_MAX'){max=p.slice(1,4).map(Number);continue}
  if(/^[A-Z_]/.test(k))continue;vals.push(Number(p[0]),Number(p[1]),Number(p[2]))}
 if(!(size>=2&&size<=129))throw Error('File .cube non valido: manca la riga LUT_3D_SIZE.');
 if(vals.length!==size**3*3||vals.some(v=>!Number.isFinite(v)))throw Error(`File .cube non valido: servono ${fmtInt(size**3)} righe di colori, ce ne sono ${fmtInt(vals.length/3)}.`);
 if([0,1,2].some(k=>!(max[k]>min[k])))throw Error('File .cube non valido: DOMAIN_MAX deve essere maggiore di DOMAIN_MIN.');
 return {name:title||baseName(fileName),size,data:new Float32Array(vals),min,max}}
// Istogramma e misure della luce: luminosità per l'istogramma, rosso, verde e blu, parti bruciate e chiuse, trasparenza.
function measure(img){const d=img.data,H=[new Uint32Array(256),new Uint32Array(256),new Uint32Array(256),new Uint32Array(256)],[HY,HR,HG,HB]=H;let n=0,sum=0,hi=0,lo=0,alpha=false;
 for(let i=0;i<d.length;i+=4){if(d[i+3]<250)alpha=true;if(d[i+3]<8)continue;const r=d[i],g=d[i+1],b=d[i+2],y=(54*r+183*g+19*b)>>8;HY[y]++;HR[r]++;HG[g]++;HB[b]++;sum+=y;n++;if(r>=253&&g>=253&&b>=253)hi++;else if(r<=2&&g<=2&&b<=2)lo++}
 return {H,n,mean:n?sum/n/255:0,high:n?hi/n:0,low:n?lo/n:0,alpha}}
function pctl(st,p){const HY=st.H[0],t=st.n*p;let acc=0;for(let i=0;i<256;i++){acc+=HY[i];if(acc>=t)return i/255}return 1}
// Regolazione automatica, dai pixel inquadrati e non ancora regolati: luce media verso il grigio medio,
// bianchi e neri verso i bordi dell'istogramma, ombre e alte luci se servono, bilanciamento del bianco attenuato.
function autoValues(src){const st=measure(src),p=q=>pctl(st,q),med=p(.5),lo=p(.005),hi=p(.995),toLin=v=>S2L[Math.round(clamp(v,0,1)*255)];
 const ev=Math.round(clamp(Math.log2(toLin(.46)/Math.max(.002,toLin(med)))*.8,-2.5,2.5)*20)/20,g=2**ev,shift=v=>l2s(Math.min(1,toLin(v)*g)),hi2=shift(hi),lo2=shift(lo);
 const out={exposure:Math.abs(ev)<.01?0:ev,whites:Math.round(clamp((1-hi2/.97)/.0012,-40,60)),blacks:Math.round(clamp((.02-lo2)/.0012,-50,40)),
  contrast:Math.round(clamp((.75-(hi2-lo2))*40,0,25)),shadows:Math.round(clamp((.3-shift(p(.25)))*120,0,40)),highlights:-Math.round(clamp((shift(p(.9))-.85)*250,0,50))};
 // Bilanciamento del bianco con la media dei colori (mondo grigio), a metà forza: le scene di un solo colore non si stravolgono.
 const d=src.data;let mr=0,mg=0,mb=0,k=0;for(let i=0;i<d.length;i+=16){const r=d[i],gg=d[i+1],b=d[i+2];if(d[i+3]<8||Math.max(r,gg,b)>=250||Math.max(r,gg,b)<8)continue;mr+=S2L[r];mg+=S2L[gg];mb+=S2L[b];k++}
 if(k>100){out.temp=Math.round(clamp((mb-mr)/(mr+mb)*120,-25,25));out.tint=Math.round(clamp((mg-(mr+mb)/2)/mg*120,-20,20))}else{out.temp=0;out.tint=0}
 return out}
