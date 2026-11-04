// Matita, pennello e gomma. La matita leviga il tratto a mano libera in un tracciato con il contorno; il pennello segue
// la pressione della penna (pointer events) e salva il tratto come contorno pieno di un tracciato, così resta vettoriale
// nell'SVG: la linea centrale con le pressioni resta in brush, e cambiando lo spessore il contorno si rifà. La gomma
// taglia i tratti dove passa, oppure toglie i tratti interi. Da tastiera il cursore del foglio disegna e cancella: Spazio
// abbassa e alza la matita, il pennello o la gomma.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/></symbol>
<symbol id="i-brush" viewBox="0 0 24 24"><path d="M20 4c-3 1-8 6-10 9l2 2c3-2 8-7 9-10z"/><path d="M9 14c-3 0-4 2-4 4s-1 2-2 2c3 1 8 0 8-4z"/></symbol>
<symbol id="i-eraser" viewBox="0 0 24 24"><path d="M4 16l9-10 7 7-7 7H8z"/><path d="M9 11l6 6M8 20h12"/></symbol>
<symbol id="i-simplify" viewBox="0 0 24 24"><path d="M3 17l3-4 2 3 3-6 2 4 3-5 2 3 3-4" stroke-dasharray="2 2"/><path d="M3 20C8 9 15 9 21 13"/></symbol>`);
// Colore e spessori degli strumenti: gli ultimi usati, oppure una misura adatta al foglio.
const INK_DIV={pen:216,pencil:180,brush:45,eraser:36};
const inkSize=t=>prefs.drawInk?.[t]||Math.max(1,Math.round(Math.min(Dw.p.w,Dw.p.h)/INK_DIV[t]));
const inkColor=()=>prefs.drawInk?.color||'#1b1b1b';
function setInk(k,v){(prefs.drawInk??={})[k]=v;savePrefs()}
const kindName=it=>it.tool==='brush'?'Pennellata':it.tool==='pencil'?'Tratto di matita':it.kind==='poly'&&it.star?'Stella':it.alt?'Testo in tracciati':KIND_NAME[it.kind];
const kindIcon=it=>it.tool==='brush'?'brush':it.tool==='pencil'?'pencil':it.kind==='poly'&&it.star?'star':it.alt?'textI':KIND_ICON[it.kind];
// Ramer-Douglas-Peucker: toglie i punti che si discostano dalla linea meno di tol. Con w conta anche il terzo valore
// (la pressione), pesato w: dove la pressione cambia, il punto resta anche se la linea è dritta.
function rdp(pts,tol,w=0){if(pts.length<3)return pts;const keep=new Uint8Array(pts.length),st=[[0,pts.length-1]];keep[0]=keep[pts.length-1]=1;
 while(st.length){const [a,b]=st.pop(),[ax,ay,ap=0]=pts[a],[bx,by,bp=0]=pts[b],dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy;let md=0,mi=-1;
  for(let i=a+1;i<b;i++){const [px,py,pp=0]=pts[i];let d=L2<1e-12?Math.hypot(px-ax,py-ay):Math.abs((px-ax)*dy-(py-ay)*dx)/Math.sqrt(L2);if(w){const t=L2?clamp(((px-ax)*dx+(py-ay)*dy)/L2,0,1):0;d=Math.max(d,Math.abs(pp-ap-(bp-ap)*t)*w)}if(d>md){md=d;mi=i}}
  if(md>tol){keep[mi]=1;st.push([a,mi],[mi,b])}}
 return pts.filter((_,i)=>keep[i])}
// Media mobile su tre punti: toglie il tremolio del puntatore senza spostare gli estremi.
const soften=pts=>pts.map((p,i)=>i&&i<pts.length-1?p.map((v,k)=>k<2?(pts[i-1][k]+v*2+pts[i+1][k])/4:v):p);
// Adattamento a curve (Schneider): i punti fitti di un tratto diventano poche curve di Bézier che passano a meno di tol
// pixel dai punti. Gli angoli restano angoli (dove la spezzata semplificata gira più di corner gradi), i tratti dritti
// diventano rette, i nodi tra due curve sono curvi con le maniglie allineate.
// I lati lunghi si riempiono di punti, così lo scarto si misura lungo tutta la curva e non solo nei punti dati.
function drawFitSub(pts,closed,tol=.5,corner=70){const P=[],st=Math.max(1,tol*4);for(const p of [...pts,...(closed&&pts.length?[pts[0]]:[])]){const q=P.at(-1),d=q?Math.hypot(p[0]-q[0],p[1]-q[1]):1;if(d<=1e-6)continue;for(let k=1,n=q?Math.ceil(d/st):1;k<n;k++)P.push([q[0]+(p[0]-q[0])*k/n,q[1]+(p[1]-q[1])*k/n]);P.push([p[0],p[1]])}
 if(closed&&P.length>2&&Math.hypot(P[0][0]-P.at(-1)[0],P[0][1]-P.at(-1)[1])<1e-6)P.pop();
 const nd=(p,ix=0,iy=0,ox=0,oy=0,s=0)=>({x:n2(p[0]),y:n2(p[1]),ix:n2(ix),iy:n2(iy),ox:n2(ox),oy:n2(oy),s});if(P.length<3)return {closed:closed&&P.length>2,nodes:P.map(p=>nd(p))};
 const D=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]),U=(a,b)=>{const l=D(a,b)||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l]},N=P.length;
 // Angoli: sulla spezzata semplificata con la stessa tolleranza, i vertici dove la direzione cambia di più di corner gradi.
 const R=rdp(closed?[...P,P[0]]:P,tol),at=new Map(P.map((p,i)=>[p,i])),cos=Math.cos(corner*Math.PI/180),C=[];
 for(let k=closed?0:1;k<R.length-1;k++){const p=R[k],a=R[k?k-1:R.length-2],b=R[k+1],u=U(a,p),v=U(p,b);if(u[0]*v[0]+u[1]*v[1]<cos)C.push(at.get(p))}
 const smooth=closed&&!C.length;if(smooth)C.push(0);const Q=closed?[...P.slice(C[0]),...P.slice(0,C[0]+1)]:P,cuts=closed?[...C.map(i=>(i-C[0]+N)%N),N]:[0,...C,N-1];
 // La direzione all'estremo di un pezzo: verso il primo punto a più di 2 pixel, per non seguire il tremolio.
 const tan=(i,d,lo,hi)=>{let j=i+d;while(j>lo&&j<hi&&D(Q[i],Q[j])<2)j+=d;return U(Q[i],Q[clamp(j,lo,hi)])};const bz=[];
 const fit=(a,b,t1,t2,depth)=>{const p0=Q[a],p3=Q[b],L=D(p0,p3);let far=0;for(let i=a+1;i<b;i++){const q=Q[i];far=Math.max(far,Math.abs((q[0]-p0[0])*(p3[1]-p0[1])-(q[1]-p0[1])*(p3[0]-p0[0]))/(L||1))}
  if(b-a<2||far<tol*.5&&L>0){bz.push([p0,p0,p3,p3]);return}
  let u=[0];for(let i=a+1;i<=b;i++)u.push(u.at(-1)+D(Q[i-1],Q[i]));u=u.map(v=>v/u.at(-1));
  const gen=()=>{let c00=0,c01=0,c11=0,x0=0,x1=0;u.forEach((t,i)=>{const s=1-t,b1=3*t*s*s,b2=3*t*t*s,h=s*s*s+b1,k=b2+t*t*t,A=[t1[0]*b1,t1[1]*b1],B=[t2[0]*b2,t2[1]*b2],d=[Q[a+i][0]-p0[0]*h-p3[0]*k,Q[a+i][1]-p0[1]*h-p3[1]*k];c00+=A[0]*A[0]+A[1]*A[1];c01+=A[0]*B[0]+A[1]*B[1];c11+=B[0]*B[0]+B[1]*B[1];x0+=A[0]*d[0]+A[1]*d[1];x1+=B[0]*d[0]+B[1]*d[1]});
   const det=c00*c11-c01*c01;let l1=det?(x0*c11-x1*c01)/det:0,l2=det?(c00*x1-c01*x0)/det:0;if(!(l1>L*1e-3&&l2>L*1e-3&&l1<L*3&&l2<L*3))l1=l2=L/3;return [p0,[p0[0]+t1[0]*l1,p0[1]+t1[1]*l1],[p3[0]+t2[0]*l2,p3[1]+t2[1]*l2],p3]};
  const pt=(c,t)=>[bez(t,c[0][0],c[1][0],c[2][0],c[3][0]),bez(t,c[0][1],c[1][1],c[2][1],c[3][1])],err=c=>{let m=0,k=a+1;u.forEach((t,i)=>{const q=pt(c,t),e=D(q,Q[a+i]);if(e>m&&i>0&&i<u.length-1){m=e;k=a+i}});return [m,k]};
  let c=gen(),[e,k]=err(c);
  // Newton-Raphson: ogni punto si riavvicina al punto più vicino della curva, poi si rifà la curva.
  for(let it=0;e>=tol&&e<tol*4&&it<4;it++){u=u.map((t,i)=>{const q=pt(c,t),d1=[0,1].map(j=>3*((1-t)**2*(c[1][j]-c[0][j])+2*(1-t)*t*(c[2][j]-c[1][j])+t*t*(c[3][j]-c[2][j]))),d2=[0,1].map(j=>6*((1-t)*(c[2][j]-2*c[1][j]+c[0][j])+t*(c[3][j]-2*c[2][j]+c[1][j]))),f=[q[0]-Q[a+i][0],q[1]-Q[a+i][1]],den=d1[0]**2+d1[1]**2+f[0]*d2[0]+f[1]*d2[1];return den?clamp(t-(f[0]*d1[0]+f[1]*d1[1])/den,0,1):t});c=gen();[e,k]=err(c)}
  if(e<tol||depth>14){bz.push(c);return}const tc=U(Q[k+1],Q[k-1]);fit(a,k,t1,tc,depth+1);fit(k,b,[-tc[0],-tc[1]],t2,depth+1)};
 for(let j=0;j+1<cuts.length;j++){const a=cuts[j],b=cuts[j+1],n0=bz.length;if(b<=a)continue;
  // In un contorno chiuso senza angoli il primo nodo è curvo: le direzioni ai due capi sono le stesse.
  const ts=smooth?U(Q[N-1],Q[1]):null;fit(a,b,ts||tan(a,1,a,b),ts?[-ts[0],-ts[1]]:tan(b,-1,a,b),0);bz[n0].corner=true}
 const nodes=[];bz.forEach((c,i)=>{const p=nodes.at(-1);if(!p)nodes.push(nd(c[0],0,0,c[1][0]-c[0][0],c[1][1]-c[0][1]));else{p.ox=n2(c[1][0]-c[0][0]);p.oy=n2(c[1][1]-c[0][1]);p.s=+(!c.corner&&!!(p.ix||p.iy)&&!!(p.ox||p.oy))}nodes.push(nd(c[3],c[2][0]-c[3][0],c[2][1]-c[3][1]))});
 if(closed&&nodes.length>1){const l=nodes.pop(),f=nodes[0];f.ix=l.ix;f.iy=l.iy;f.s=+(smooth&&!!(f.ix||f.iy)&&!!(f.ox||f.oy))}return {closed,nodes}}
// Contorno del pennello attorno alla linea centrale: lo spessore va da un quarto a tutto, secondo la pressione, con le
// estremità tonde. Un punto solo fa un cerchio.
function brushPoly(pts,size){const r=p=>Math.max(.3,size/2*(.25+.75*p)),arc=(x,y,w,a0,n=6)=>Array.from({length:n-1},(_,k)=>{const a=a0-(k+1)*Math.PI/n;return [x+Math.cos(a)*w,y+Math.sin(a)*w]});
 const len=pts.reduce((l,p,i)=>i?l+Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1]):0,0);if(pts.length<2||len<.5){const [x,y,p]=pts[0],w=r(p);return Array.from({length:12},(_,k)=>[x+Math.cos(k*Math.PI/6)*w,y+Math.sin(k*Math.PI/6)*w])}
 const L=[],R=[],ang=[];pts.forEach(([x,y,p],i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],t=Math.atan2(b[1]-a[1],b[0]-a[0]),w=r(p);ang.push(t);L.push([x-Math.sin(t)*w,y+Math.cos(t)*w]);R.push([x+Math.sin(t)*w,y-Math.cos(t)*w])});
 const e=pts.at(-1),f=pts[0];return [...L,...arc(e[0],e[1],r(e[2]),ang.at(-1)+Math.PI/2),...R.reverse(),...arc(f[0],f[1],r(f[2]),ang[0]-Math.PI/2)]}
// Rifà il contorno di una pennellata dalla sua linea centrale (relativa al riquadro, come i nodi), adattato a curve
// con lo scarto fit: 0,4 pixel dello schermo quando si disegna, o quello scelto con Semplifica.
function brushOutline(it){const B=it.brush;it.subs=[drawFitSub(brushPoly(B.pts,B.size),true,B.fit||.35)];const b=pathBounds(it.subs);normPath(it,true);B.pts=B.pts.map(([x,y,p])=>[n2(x-b.x0),n2(y-b.y0),p])}
// Un tratto finito diventa un oggetto: i punti sono in coordinate del foglio, con la pressione da 0 a 1. La matita si
// adatta a curve già mentre il tratto diventa oggetto, entro mezzo pixel dello schermo: meno nodi, stesso aspetto. Il
// tratto fatto da tastiera non trema e non si ammorbidisce: gli angoli restano angoli.
function addStroke(tool,raw,kb=false){const sm=kb?p=>p:soften;const k=sheetScale(),pts=[];for(const p of raw)if(!pts.length||Math.hypot(p[0]-pts.at(-1)[0],p[1]-pts.at(-1)[1])*k>=1)pts.push(p);if(!pts.length)return null;
 const it={id:uid(),kind:'path',tool,name:nextName('path',kindName({tool})),x:0,y:0,w:0,h:0,rot:0,opacity:100,radius:0,subs:[]};
 if(tool==='brush'){Object.assign(it,{fill:inkColor(),stroke:'#1b1b1b',sw:0,brush:{size:inkSize('brush'),fit:n2(.4/k),pts:rdp(sm(pts),.4/k,inkSize('brush')/2).map(([x,y,p])=>[n2(x),n2(y),Math.round(p*100)/100])}});brushOutline(it)}
 else{const line=pts.length<2?[pts[0],[pts[0][0]+.01,pts[0][1]]]:sm(pts);Object.assign(it,{fill:'none',stroke:inkColor(),sw:inkSize('pencil'),subs:[drawFitSub(line,false,kb?.5:.5/k,kb?20:70)]});normPath(it)}
 pick([it.id],it.id);editD(tool==='brush'?'Pennellata':'Tratto di matita',p=>{p.items.push(it)},{props:true});return it}
const strokeSay=it=>{const L=nodeList(it),f=nodeVis(it,L[0].n),b=box(it);return `«${it.name}», ${it.brush?`larga ${fmtInt(it.brush.size)} pixel`:`spessa ${fmtInt(it.sw)} pixel`}, nel riquadro x ${fmtInt(b.x)}, y ${fmtInt(b.y)}, ${fmtInt(b.w)} per ${fmtInt(b.h)}, ${L.length} nodi`};
// Il tratto in corso, con il puntatore o con la tastiera: anteprima sopra il foglio, poi un oggetto.
const ink={pts:null,kb:false,kp:1};
function liveSvg(k){if(!ink.pts?.length)return '';if(Dw.tool==='brush')return `<path d="M${brushPoly(ink.pts,inkSize('brush')).map(p=>n2(p[0])+' '+n2(p[1])).join('L')}Z" fill="${esc(inkColor())}" opacity=".85"/>`;
 return `<path d="M${ink.pts.map(p=>n2(p[0])+' '+n2(p[1])).join('L')}" fill="none" stroke="${esc(inkColor())}" stroke-width="${inkSize('pencil')}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`}
const pressureOf=e=>e.pointerType==='pen'?e.pressure:1;
// Gli eventi intermedi che il browser raccoglie tra due pointermove: il tratto segue meglio la mano.
const coalesced=e=>{const l=e.getCoalescedEvents?.();return l?.length?l:[e]};
function inkEnd({say=true}={}){const raw=ink.pts,kb=ink.kb;ink.pts=null;ink.kb=false;if(!raw){renderOverlay();return}const it=addStroke(Dw.tool,raw,kb);renderOverlay();if(it&&say)announce(strokeSay(it))}
const drawTool=tool=>({sel:'box',
 reset(){if(!ink.kb)ink.pts=null},
 down(e,pt){curFromPointer(pt);ink.kb=false;ink.pts=[[pt.x,pt.y,pressureOf(e)]];renderOverlay();return true},
 move(e,pt){if(!ink.pts||ink.kb)return;for(const c of coalesced(e)){const q=toSheet(c);ink.pts.push([q.x,q.y,pressureOf(c)])}renderOverlay()},
 up(){if(ink.pts&&!ink.kb)inkEnd()},
 key(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();if(ink.kb){inkEnd();return true}if(e.key==='Enter')return true;curShow();
   ink.kb=true;ink.pts=[[Dw.cur.x,Dw.cur.y,ink.kp]];renderOverlay();announce(`${tool==='brush'?'Pennello':'Matita'} giù a ${curSay(Dw.cur)}: muovi il cursore per disegnare, Spazio per finire il tratto`);return true}
  if(e.key==='Escape'){e.preventDefault();if(ink.kb){ink.pts=null;ink.kb=false;renderOverlay();announce('Tratto annullato')}else setTool('select');return true}
  // Pressione: 1…9 dal 10 al 90 per cento, Maiusc+0 piena (lo zero da solo resta «tutto il foglio»).
  if(tool==='brush'&&!e.ctrlKey&&!e.altKey&&(/^[1-9]$/.test(e.key)||e.shiftKey&&e.code==='Digit0')){e.preventDefault();ink.kp=e.code==='Digit0'?1:Number(e.key)/10;announce(`Pressione ${fmtInt(ink.kp*100)}%`);return true}
  const c=cursorKey(e);if(!c)return false;if(ink.kb)ink.pts.push([c.x,c.y,ink.kp]);announce(curSay(c));renderOverlay();return true},
 overlay(k){return liveSvg(k)+cursorSvg(k)}});
TOOLS.pencil=drawTool('pencil');TOOLS.brush=drawTool('brush');
// Gomma: vale per i tratti di matita e di pennello, non per le forme, le immagini, i testi e gli oggetti bloccati. Due
// modi, nelle proprietà dello strumento: «parte del tratto» (il predefinito) taglia i tratti dove passa e lascia i pezzi
// come oggetti a sé; «tratti interi» toglie ogni tratto che tocca. Una passata è un passo solo da annullare.
// Tagliando, durante la passata non si calcola niente: la scia si vede come maschera sui soli tratti toccati, e il taglio
// vero si fa una volta, al rilascio.
const er={drag:null,hover:null,kb:false};
const eraseCut=()=>prefs.drawErase!=='whole';
function setEraseMode(m){prefs.drawErase=m;savePrefs();if(Dw.tool==='eraser')renderProps();refreshToggles();announce(m==='whole'?'Gomma: toglie i tratti interi che tocca':'Gomma: cancella solo la parte del tratto su cui passa')}
const erasable=it=>it.kind==='path'&&it.tool&&!it.hidden&&!it.lock&&!it.clipOf;
// Riquadro di un tratto nel foglio, con il contorno e la rotazione: scarta in fretta i tratti lontani dalla gomma.
function eraseBox(it){const b=box(it),m=(it.sw||0)/2;if(!it.rot)return {x0:b.x-m,y0:b.y-m,x1:b.x+b.w+m,y1:b.y+b.h+m};const r=Math.hypot(b.w,b.h)/2+m,cx=b.x+b.w/2,cy=b.y+b.h/2;return {x0:cx-r,y0:cy-r,x1:cx+r,y1:cy+r}}
const eraseNear=(B,x,y,r)=>x>=B.x0-r&&x<=B.x1+r&&y>=B.y0-r&&y<=B.y1+r;
function hitStroke(it,pt,r,polys=flatten(it,3)){const P=unrot(it,pt),near=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?clamp(((P.x-a[0])*dx+(P.y-a[1])*dy)/L,0,1):0;return Math.hypot(a[0]+t*dx-P.x,a[1]+t*dy-P.y)};let inside=false;
 for(const poly of polys)for(let i=1;i<poly.length;i++){const a=poly[i-1],b=poly[i];if(near(a,b)<=r+it.sw/2)return true;if(it.fill!=='none'&&(a[1]>P.y)!==(b[1]>P.y)&&P.x<a[0]+(P.y-a[1])*(b[0]-a[0])/(b[1]-a[1]))inside=!inside}return inside}
const strokesAt=(pt,r)=>Dw.p.items.filter(it=>erasable(it)&&eraseNear(eraseBox(it),pt.x,pt.y,r)&&hitStroke(it,pt,r));
// Una spezzata passa a meno di r dalla scia? Si misura dai lati, non solo dai punti: un tratto dritto ha due punti soli.
// I punti della scia distano al più un terzo del raggio, quindi basta guardarli contro ogni lato.
// Al rilascio la distanza dalla scia si chiede migliaia di volte: una griglia la rende veloce. Ogni lato della scia sta
// nelle celle che il suo riquadro tocca e un punto guarda solo le nove celle intorno. Le celle sono larghe c, la distanza
// più grande che serve confrontare: oltre, basta sapere che è grande.
function sweepIndex(S,c){const G=new Map(),at=(i,j)=>i+','+j;S.forEach((a,n)=>{const b=S[n+1]||a;for(let i=Math.floor(Math.min(a[0],b[0])/c);i<=Math.floor(Math.max(a[0],b[0])/c);i++)for(let j=Math.floor(Math.min(a[1],b[1])/c);j<=Math.floor(Math.max(a[1],b[1])/c);j++){const k=at(i,j);(G.get(k)||G.set(k,[]).get(k)).push(n)}});
 return (x,y)=>{const i=Math.floor(x/c),j=Math.floor(y/c);let m=Infinity;for(let di=-1;di<2;di++)for(let dj=-1;dj<2;dj++)for(const n of G.get(at(i+di,j+dj))||[]){const a=S[n],b=S[n+1]||a,dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?clamp(((x-a[0])*dx+(y-a[1])*dy)/L,0,1):0,d=Math.hypot(a[0]+t*dx-x,a[1]+t*dy-y);if(d<m)m=d}return m}}
const sweepNear=(poly,S,r)=>poly.some((a,i)=>{const b=poly[i+1]||a,dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy;return S.some(([x,y])=>{const t=L?clamp(((x-a[0])*dx+(y-a[1])*dy)/L,0,1):0;return Math.hypot(a[0]+t*dx-x,a[1]+t*dy-y)<=r})});
// Pennellata: la linea centrale, resa fitta perché anche un tratto dritto di due punti si tagli nel mezzo, si interrompe
// dove entra nella scia (il punto esatto per bisezione). Ogni capo tagliato arretra di mezzo spessore, così l'estremità
// tonda finisce sul bordo della gomma. Restituisce i pezzi in coordinate del foglio, o null se la scia non la tocca.
function eraseBrush(it,S,R,dist){const B=it.brush,hw=p=>Math.max(.3,B.size/2*(.25+.75*p)),mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],st=Math.max(.5,R/3),out=q=>dist(q[0],q[1])>R;
 const P=[];B.pts.forEach(([x,y,p],i)=>{const q=rotPt(it,it.x+x,it.y+y),c=[q.x,q.y,p],a=P.at(-1);if(a){const n=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])/st);for(let k=1;k<n;k++)P.push(mix(a,c,k/n))}P.push(c)});
 const edge=(a,b)=>{let lo=0,hi=1;for(let k=0;k<12;k++){const m=(lo+hi)/2;if(out(mix(a,b,m)))lo=m;else hi=m}return mix(a,b,lo)},runs=[];let cur=null,cut=false;
 P.forEach((q,i)=>{if(out(q)){if(!cur){cur={pts:i?[edge(q,P[i-1])]:[],head:i>0};runs.push(cur)}cur.pts.push(q)}else{cut=true;if(cur){cur.pts.push(edge(P[i-1],q));cur.tail=true;cur=null}}});
 if(!cut)return null;
 // Il capo arretra finché tutto il cerchio dell'estremità sta fuori dalla scia: vale anche se la gomma passa di sbieco.
 const clear=q=>dist(q[0],q[1])>=R+hw(q[2]),trim=pts=>{const j=pts.findIndex(clear);if(j<1)return j<0?null:pts;let lo=0,hi=1;for(let k=0;k<12;k++){const m=(lo+hi)/2;if(clear(mix(pts[j-1],pts[j],m)))hi=m;else lo=m}return [mix(pts[j-1],pts[j],hi),...pts.slice(j)]};
 return runs.map(r=>{let p=r.pts;if(r.head)p=trim(p);if(p&&r.tail)p=trim(p.reverse())?.reverse();return p}).filter(p=>p&&p.length>1)}
// Tratto di matita: la scia allargata di mezzo spessore taglia le curve come «sottrai» con una linea, e i tratti fuori
// restano curve uguali a prima. Null se la scia non lo tocca, oppure le parti che restano, in coordinate del foglio.
function erasePencil(it,S,R,dist){const r=R+(it.sw||0)/2,subs=drawSheetSubs(it,true);if(!flatten({x:0,y:0,subs},3).some(p=>sweepNear(p,S,R)))return null;
 return boolClipOpen(subs,[brushPoly(S.map(([x,y])=>[x,y,1]),2*r)],(x,y)=>dist(x,y)>r)}
// Un tratto dopo la passata: i pezzi come oggetti (con lo stile, il gruppo e l'ordine del tratto), oppure null se la scia
// non lo tocca. Un tratto senza linea centrale o con parti chiuse, perché modificato a mano nei nodi, si toglie intero.
function eraseOne(it,S,R,dist){if(it.brush?.pts?.length){const runs=eraseBrush(it,S,R,dist);return runs&&runs.map(pts=>{const o=structuredClone(it);Object.assign(o,{x:0,y:0,w:0,h:0,rot:0,subs:[],brush:{...it.brush,pts:rdp(pts,it.brush.fit||.35,it.brush.size/2).map(([x,y,p])=>[n2(x),n2(y),Math.round(p*100)/100])}});brushOutline(o);return o})}
 if(it.tool==='pencil'&&it.subs.every(s=>!s.closed)){const subs=erasePencil(it,S,R,dist);return subs&&subs.map(s=>normPath(Object.assign(structuredClone(it),{x:0,y:0,w:0,h:0,rot:0,subs:[s]})))}
 return 'whole'}
// I pezzi di «Pennellata 3» si chiamano «Pennellata 3a», «3b»…; un nome che non finisce con un numero prende « a», « b».
function erasePieceName(base,i,used){for(let k=i;;k++){const l=String.fromCharCode(97+k%26)+(k>=26?Math.floor(k/26):''),n=/\d$/.test(base)?base+l:base+' '+l;if(!used.has(n)){used.add(n);return n}}}
// La passata: la scia è una spezzata con i punti ad almeno un terzo del raggio l'uno dall'altro; i tratti toccati si
// tengono da parte con le loro spezzate, calcolate una volta sola.
function eraseStart(pt){er.drag={sweep:[],r:inkSize('eraser')/2,hit:new Set(),wrapped:new Set(),flat:new Map()};eraseAdd(pt)}
function eraseAdd(pt,every){const d=er.drag,S=d.sweep,l=S.at(-1);if(l&&(every?pt.x===l[0]&&pt.y===l[1]:Math.hypot(pt.x-l[0],pt.y-l[1])<d.r/3))return;S.push([pt.x,pt.y]);
 for(const it of Dw.p.items)if(!d.hit.has(it.id)&&erasable(it)&&eraseNear(eraseBox(it),pt.x,pt.y,d.r)){let f=d.flat.get(it.id);if(!f)d.flat.set(it.id,f=flatten(it,3));if(hitStroke(it,pt,d.r,f))d.hit.add(it.id)}erasePreview()}
// Anteprima: i tratti toccati entrano in un gruppo con una maschera che nasconde la scia; si aggiorna solo la scia.
function erasePreview(){const d=er.drag,S=d.sweep;let m=sheet.querySelector('#er-mask');
 if(!m){sheet.insertAdjacentHTML('afterbegin',`<defs><mask id="er-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="${Dw.p.w}" height="${Dw.p.h}"><rect width="${Dw.p.w}" height="${Dw.p.h}" fill="#fff"/><path fill="none" stroke="#000" stroke-linecap="round" stroke-linejoin="round"/></mask></defs>`);m=sheet.querySelector('#er-mask')}
 const path=m.querySelector('path');path.setAttribute('stroke-width',n2(2*d.r));path.setAttribute('d','M'+S.map(p=>n2(p[0])+' '+n2(p[1])).join('L')+(S.length<2?'h.01':''));
 for(const id of d.hit)if(!d.wrapped.has(id)){const el=sheet.querySelector(`[data-id="${id}"]`);if(!el)continue;const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('mask','url(#er-mask)');el.replaceWith(g);g.append(el);d.wrapped.add(id)}}
function eraseCancel(){const d=er.drag;er.drag=null;er.kb=false;if(d?.wrapped.size||sheet.querySelector('#er-mask'))renderSheet()}
// Al rilascio: ogni tratto toccato si sostituisce, al suo posto nell'ordine dei livelli, con i pezzi che restano.
function eraseCommit(){const d=er.drag;er.drag=null;er.kb=false;if(!d)return;const S=d.sweep,R=d.r,res=new Map(),say=[],used=new Set(Dw.p.items.map(x=>x.name)),hit=Dw.p.items.filter(x=>d.hit.has(x.id)),
  dist=sweepIndex(S,R+Math.max(1,...hit.map(x=>x.brush?x.brush.size/2:(x.sw||0)/2))+1);
 for(const it of hit){const r=eraseOne(it,S,R,dist);if(!r)continue;
  const g=it.tool==='brush'?'a':'o';
  if(r==='whole'){res.set(it.id,[]);say.push(`«${it.name}» cancellat${g} inter${g}, perché i suoi nodi sono stati modificati a mano`);continue}
  res.set(it.id,r);if(!r.length)say.push(`«${it.name}» cancellat${g} del tutto`);else if(r.length===1){r[0].id=it.id;say.push(`«${it.name}» accorciat${g}`)}
  else{used.delete(it.name);r.forEach((o,i)=>{o.id=i?uid():it.id;o.name=erasePieceName(it.name,i,used)});say.push(`«${it.name}» tagliat${g} in ${r.length}: ${namesOf(r)}`)}}
 if(!res.size){renderSheet();announce(d.hit.size?`La gomma ha sfiorato ${namesOf(Dw.p.items.filter(x=>d.hit.has(x.id)))} senza passare sulla linea del tratto: niente da tagliare`:'Nessun tratto sotto la gomma');return}
 const gone=new Set([...res].filter(([,r])=>!r.length).map(([id])=>id)),orig=Dw.p.items.filter(x=>res.has(x.id));if(Dw.multi?.ids?.some(id=>gone.has(id))||gone.has(Dw.sel))pick([],null);
 editD(orig.length===1?'Gomma su '+orig[0].name:`Gomma su ${orig.length} tratti`,p=>{p.items=p.items.flatMap(x=>res.get(x.id)??[x])},{props:true});announce('Gomma: '+say.join('; '))}
// Modo «tratti interi»: come prima, i tratti toccati spariscono mentre si passa.
function eraseAt(pt){const gone=strokesAt(pt,inkSize('eraser')/2);if(!gone.length)return;const ids=new Set(gone.map(x=>x.id));Dw.p.items=Dw.p.items.filter(x=>!ids.has(x.id));if(ids.has(Dw.sel))pick([],null);er.drag.gone.push(...gone);renderSheet()}
function eraseEnd(gone){if(!gone.length)return;settleD(gone.length>1?`Cancella ${gone.length} tratti`:'Cancella '+gone[0].name,{props:true});announce(`Cancellat${gone.length>1?`i ${gone.length} tratti`:'o il tratto'}: ${namesOf(gone)}`)}
TOOLS.eraser={sel:'none',
 reset(){if(er.drag?.sweep)eraseCancel();er.drag=null;er.kb=false},
 down(e,pt){curFromPointer(pt);if(eraseCut())eraseStart(pt);else{er.drag={gone:[]};eraseAt(pt)}return true},
 move(e,pt){er.hover=pt;if(er.drag&&!er.kb)for(const c of coalesced(e)){const q=toSheet(c);if(er.drag.sweep)eraseAdd(q);else eraseAt(q)}renderOverlay()},
 up(){const d=er.drag;if(!d||er.kb)return;if(d.sweep)eraseCommit();else{er.drag=null;eraseEnd(d.gone)}},
 key(e){const R=inkSize('eraser')/2;
  if(e.key===' '){e.preventDefault();curShow();
   if(!eraseCut()){er.drag={gone:[]};eraseAt(Dw.cur);const g=er.drag.gone;er.drag=null;if(g.length)eraseEnd(g);else announce('Nessun tratto sotto il cursore');return true}
   if(er.kb){eraseCommit();return true}eraseStart(Dw.cur);er.kb=true;announce(`Gomma giù a ${curSay(Dw.cur)}${er.drag.hit.size?`, sopra ${namesOf(Dw.p.items.filter(x=>er.drag.hit.has(x.id)))}`:''}: muovi il cursore per cancellare, Spazio per finire, Esc per annullare`);renderOverlay();return true}
  if(e.key==='Escape'){e.preventDefault();if(er.kb){eraseCancel();announce('Gomma annullata');renderOverlay()}else setTool('select');return true}
  const c=cursorKey(e);if(!c)return false;let say=curSay(c);
  if(er.kb){const before=new Set(er.drag.hit);eraseAdd(c,true);const added=Dw.p.items.filter(x=>er.drag.hit.has(x.id)&&!before.has(x.id));if(added.length)say+=`, tocca ${namesOf(added)}`}
  else{const under=strokesAt(c,R);if(under.length)say+=`: sopra ${namesOf(under)}, Spazio per ${eraseCut()?'abbassare la gomma':'cancellare'}`}
  announce(say);renderOverlay();return true},
 overlay(k){const h=Dw.cur.on?Dw.cur:er.hover;return h?`<circle class="k-cur" cx="${n2(h.x)}" cy="${n2(h.y)}" r="${n2(inkSize('eraser')/2)}" stroke-width="${n2(1.5/k)}"/>`:''}};
sheetWrap.addEventListener('pointerleave',()=>{if(Dw.tool==='eraser'&&!er.drag){er.hover=null;renderOverlay()}});
// Colore e spessore dello strumento nelle proprietà, quando non c'è niente di scelto.
function toolProps(){const t=Dw.tool;if(!['pen','pencil','brush','eraser'].includes(t))return '';return `<h3>${esc(TOOL_INFO[t][0])}</h3>`+(t==='eraser'?selFld('tmode','Che cosa cancella',eraseCut()?'cut':'whole',[['cut','La parte del tratto su cui passa'],['whole','I tratti interi che tocca']])+fld('tsize','Dimensione della gomma (px)',inkSize('eraser'))+'<small class="hint">Tagliando, i pezzi che restano diventano tratti a sé, con lo stesso stile; la passata si annulla con Ctrl+Z.</small>':colorFld('tcolor','Colore',inkColor())+fld('tsize',t==='brush'?'Spessore del pennello (px)':'Spessore (px)',inkSize(t)))
 +(t==='brush'?'<small class="hint">Con la penna di una tavoletta lo spessore segue la pressione; disegnando da tastiera i numeri da 1 a 9 la portano dal 10 al 90 per cento, Maiusc+0 al massimo.</small>':'')+'<h3>Foglio</h3>'}
// Cambiando colore o spessore di un tratto, lo strumento li ricorda per il tratto successivo.
function strokeProp(it,key,v,need){if(key==='bsize'){it.brush.size=need(1,2000);brushOutline(it);setInk('brush',it.brush.size)}else if(key==='fill'&&it.tool==='brush'||key==='stroke'&&it.tool!=='brush')setInk('color',v);else if(key==='sw'&&it.tool==='pencil')setInk('pencil',num(v))}
// Semplifica il tracciato: ogni parte si ripercorre fitta e si riadatta a curve con lo scarto scelto (le pennellate
// semplificano la linea centrale e rifanno il contorno). Il cursore Quantità mostra subito il risultato sul foglio e
// quanti nodi restano; Annulla rimette tutto com'era, Semplifica è un passo solo da annullare. Una parte che non perde
// nodi resta com'era.
const simpTol=a=>.05*Math.pow(400,a/100),simpSay=a=>`${fmtInt(a)}%, scarto fino a ${fmtNum(simpTol(a),simpTol(a)<1?2:1)} pixel`;
function simplifyItem(it,o,tol){Object.assign(it,structuredClone(o));if(it.brush){it.brush.pts=rdp(it.brush.pts,tol,it.brush.size/2);it.brush.fit=n2(Math.max(it.brush.fit||.35,tol));brushOutline(it);if(nodeList(it).length>=nodeList(o).length)Object.assign(it,structuredClone(o));return}
 it.subs=it.subs.map(s=>{const p=flatten({x:0,y:0,subs:[s]},1)[0],f=p.length>2&&drawFitSub(p,s.closed,tol,it.tool?70:40);return f&&f.nodes.length<s.nodes.length?f:s});normPath(it)}
async function simplifyPaths(){const items=needSel().filter(x=>x.kind==='path'&&!x.lock);if(!items.length){if(selItems().length)toast('Semplifica vale per i tracciati, i tratti e i testi diventati tracciati: le forme si convertono prima con Converti in tracciato');return}
 const orig=items.map(x=>structuredClone(x)),count=()=>items.reduce((s,x)=>s+nodeList(x).length,0),before=count(),say=()=>`Nodi: ${fmtInt(before)} prima, ${fmtInt(count())} dopo.`,
  apply=a=>{items.forEach((it,i)=>simplifyItem(it,orig[i],simpTol(a)));renderSheet();if($('dlgSimp'))$('dlgSimp').textContent=say()};let a=prefs.drawSimp??40;apply(a);
 const r=await modal('Semplifica il tracciato',`<p>Toglie i nodi che non servono e riadatta le curve: più alta è la quantità, più il tracciato si allontana da quello di adesso. Il foglio mostra subito il risultato.</p><p id="dlgSimp" role="status">${esc(say())}</p>`,
  [{id:'amt',label:'Quantità',type:'range',min:1,max:100,value:a,fmt:simpSay}],'Semplifica',{onOpen:pane=>{const el=pane.querySelector('#dlg_amt');el.addEventListener('input',()=>apply(Number(el.value)))}});
 if(!r){items.forEach((it,i)=>Object.assign(it,structuredClone(orig[i])));renderSheet();announce('Semplifica annullato: i tracciati sono com’erano');return}
 a=Number(r.amt);prefs.drawSimp=a;savePrefs();apply(a);const after=count();settleD(items.length>1?`Semplifica ${items.length} tracciati`:'Semplifica '+items[0].name,{props:true});
 announce(`${items.length>1?items.length+' tracciati semplificati':`«${items[0].name}» semplificato`}: da ${fmtInt(before)} a ${fmtInt(after)} nodi${before?`, ${fmtInt((1-after/before)*100)}% in meno`:''}, con uno scarto fino a ${fmtNum(simpTol(a),simpTol(a)<1?2:1)} pixel.`)}
STATIC_KEYS.d.push(['Matita e pennello',[['Muovi il cursore di dieci pixel (con Maiusc di uno)','← → ↑ ↓'],['Muovi il cursore in diagonale','Home / Fine / PgSu / PgGiù'],['Abbassa o alza la matita: inizia e finisce il tratto','Spazio'],['Annulla il tratto in corso','Esc'],['Pressione del pennello, dal 10 al 90 per cento (Maiusc+0 piena)','1 … 9 / Maiusc+0']]],['Gomma',[['Cancella i tratti sotto il cursore','Spazio']]]);
