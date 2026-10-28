// Matita, pennello e gomma. La matita leviga il tratto a mano libera in un tracciato con il contorno; il pennello segue
// la pressione della penna (pointer events) e salva il tratto come contorno pieno di un tracciato, così resta vettoriale
// nell'SVG: la linea centrale con le pressioni resta in brush, e cambiando lo spessore il contorno si rifà. La gomma
// toglie i tratti che tocca. Da tastiera il cursore del foglio disegna: Spazio abbassa e alza la matita.
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
// Gomma: toglie i tratti di matita e di pennello che tocca, non le forme e non gli oggetti bloccati. Una passata è un
// passo solo da annullare.
const er={drag:null,hover:null};
function hitStroke(it,pt,r){const P=unrot(it,pt),near=(a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?clamp(((P.x-a[0])*dx+(P.y-a[1])*dy)/L,0,1):0;return Math.hypot(a[0]+t*dx-P.x,a[1]+t*dy-P.y)};let inside=false;
 for(const poly of flatten(it,3))for(let i=1;i<poly.length;i++){const a=poly[i-1],b=poly[i];if(near(a,b)<=r+it.sw/2)return true;if(it.fill!=='none'&&(a[1]>P.y)!==(b[1]>P.y)&&P.x<a[0]+(P.y-a[1])*(b[0]-a[0])/(b[1]-a[1]))inside=!inside}return inside}
const strokesAt=(pt,r)=>Dw.p.items.filter(it=>it.kind==='path'&&it.tool&&!it.hidden&&!it.lock&&hitStroke(it,pt,r));
function eraseAt(pt){const gone=strokesAt(pt,inkSize('eraser')/2);if(!gone.length)return;const ids=new Set(gone.map(x=>x.id));Dw.p.items=Dw.p.items.filter(x=>!ids.has(x.id));if(ids.has(Dw.sel))pick([],null);er.drag.gone.push(...gone);renderSheet()}
function eraseEnd(gone){if(!gone.length)return;settleD(gone.length>1?`Cancella ${gone.length} tratti`:'Cancella '+gone[0].name,{props:true});announce(`Cancellat${gone.length>1?`i ${gone.length} tratti`:'o il tratto'}: ${namesOf(gone)}`)}
TOOLS.eraser={sel:'none',
 reset(){er.drag=null},
 down(e,pt){curFromPointer(pt);er.drag={gone:[]};eraseAt(pt);return true},
 move(e,pt){er.hover=pt;if(er.drag)for(const c of coalesced(e))eraseAt(toSheet(c));renderOverlay()},
 up(){const d=er.drag;er.drag=null;if(d)eraseEnd(d.gone)},
 key(e){if(e.key===' '){e.preventDefault();curShow();er.drag={gone:[]};eraseAt(Dw.cur);const g=er.drag.gone;er.drag=null;if(g.length)eraseEnd(g);else announce('Nessun tratto sotto il cursore');return true}
  if(e.key==='Escape'){e.preventDefault();setTool('select');return true}
  const c=cursorKey(e);if(!c)return false;const under=strokesAt(c,inkSize('eraser')/2);announce(curSay(c)+(under.length?`: sopra ${namesOf(under)}, Spazio per cancellare`:''));renderOverlay();return true},
 overlay(k){const h=Dw.cur.on?Dw.cur:er.hover;return h?`<circle class="k-cur" cx="${n2(h.x)}" cy="${n2(h.y)}" r="${n2(inkSize('eraser')/2)}" stroke-width="${n2(1.5/k)}"/>`:''}};
sheetWrap.addEventListener('pointerleave',()=>{if(Dw.tool==='eraser'&&!er.drag){er.hover=null;renderOverlay()}});
// Colore e spessore dello strumento nelle proprietà, quando non c'è niente di scelto.
function toolProps(){const t=Dw.tool;if(!['pen','pencil','brush','eraser'].includes(t))return '';return `<h3>${esc(TOOL_INFO[t][0])}</h3>`+(t==='eraser'?fld('tsize','Dimensione della gomma (px)',inkSize('eraser')):colorFld('tcolor','Colore',inkColor())+fld('tsize',t==='brush'?'Spessore del pennello (px)':'Spessore (px)',inkSize(t)))
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
