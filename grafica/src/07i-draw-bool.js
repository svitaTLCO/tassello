// Unisci, sottrai, interseca ed escludi: le forme scelte diventano spezzate fitte (con la loro rotazione), i lati si
// tagliano dove si incrociano e restano solo i pezzi che separano l'area del risultato da quella fuori, girati con
// l'area a sinistra. I pezzi si ricuciono in contorni chiusi, che si levigano in nodi come i tratti di matita: le curve
// tornano curve e gli incroci restano angoli. Il risultato è un tracciato nuovo; Ctrl+Z riporta le forme di prima.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-union" viewBox="0 0 24 24"><path d="M3 3h11v7h7v11H10v-7H3z" fill="currentColor" fill-opacity=".35"/></symbol>
<symbol id="i-subtract" viewBox="0 0 24 24"><path d="M3 3h11v7h-4v4H3z" fill="currentColor" fill-opacity=".35"/><rect x="10" y="10" width="11" height="11" stroke-dasharray="2 2"/></symbol>
<symbol id="i-intersect" viewBox="0 0 24 24"><rect x="3" y="3" width="11" height="11" stroke-dasharray="2 2"/><rect x="10" y="10" width="11" height="11" stroke-dasharray="2 2"/><rect x="10" y="10" width="4" height="4" fill="currentColor"/></symbol>
<symbol id="i-exclude" viewBox="0 0 24 24"><path d="M3 3h11v7h-4v4H3zM14 10h7v11H10v-7h4z" fill="currentColor" fill-opacity=".35"/><rect x="10" y="10" width="4" height="4"/></symbol>`);
const BOOL={union:['Unione','unite',c=>c.some(Boolean)],subtract:['Sottrazione','sottratte',c=>c[0]&&!c.slice(1).some(Boolean)],intersect:['Intersezione','intersecate',c=>c.every(Boolean)],exclude:['Esclusione','escluse',c=>c.filter(Boolean).length%2===1]};
const hasArea=it=>it.kind==='path'||!!SHAPE_SUBS[it.kind];
// Spezzate chiuse di un oggetto, in coordinate del foglio; i tracciati aperti si chiudono come per il riempimento.
function itemPolys(it){const b=box(it),src=it.kind==='path'?it:{x:b.x,y:b.y,subs:SHAPE_SUBS[it.kind](it)};return flatten(src,2).filter(p=>p.length>2).map(p=>p.map(([x,y])=>{const q=rotPt(it,x,y);return [q.x,q.y]}))}
// Numero di avvolgimento: quante volte il contorno gira attorno al punto (pari e dispari per la regola evenodd).
function winding(polys,x,y){let w=0;for(const p of polys)for(let i=0,n=p.length;i<n;i++){const [ax,ay]=p[i],[bx,by]=p[(i+1)%n],c=(bx-ax)*(y-ay)-(x-ax)*(by-ay);if(ay<=y){if(by>y&&c>0)w++}else if(by<=y&&c<0)w--}return w}
function boolPolys(op,items){const ops=items.map(it=>({it,polys:itemPolys(it)})),inside=(o,x,y)=>{const w=winding(o.polys,x,y);return o.it.rule==='evenodd'?w%2!==0:w!==0},res=(x,y)=>BOOL[op][2](ops.map(o=>inside(o,x,y)));
 const E=[];ops.forEach((o,i)=>o.polys.forEach(p=>p.forEach((a,k)=>{const b=p[(k+1)%p.length];if(a[0]!==b[0]||a[1]!==b[1])E.push({a,b,i,cut:[]})})));
 // Incroci, anche dentro la stessa forma; i lati sovrapposti si tagliano dove finisce l'altro.
 E.forEach(e=>{e.x0=Math.min(e.a[0],e.b[0]);e.x1=Math.max(e.a[0],e.b[0]);e.y0=Math.min(e.a[1],e.b[1]);e.y1=Math.max(e.a[1],e.b[1])});const S=[...E].sort((p,q)=>p.x0-q.x0);
 for(let m=0;m<S.length;m++){const e=S[m],r=[e.b[0]-e.a[0],e.b[1]-e.a[1]],rr=r[0]*r[0]+r[1]*r[1];for(let q=m+1;q<S.length&&S[q].x0<=e.x1;q++){const f=S[q];if(f.y0>e.y1||f.y1<e.y0)continue;
  const s=[f.b[0]-f.a[0],f.b[1]-f.a[1]],den=r[0]*s[1]-r[1]*s[0],qp=[f.a[0]-e.a[0],f.a[1]-e.a[1]];
  if(Math.abs(den)>1e-9){const t=(qp[0]*s[1]-qp[1]*s[0])/den,u=(qp[0]*r[1]-qp[1]*r[0])/den;if(t>1e-9&&t<1-1e-9||u>1e-9&&u<1-1e-9)if(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9){const P=[e.a[0]+t*r[0],e.a[1]+t*r[1]];e.cut.push([t,P]);f.cut.push([u,P])}}
  else if(Math.abs(qp[0]*r[1]-qp[1]*r[0])<1e-6*Math.sqrt(rr)){const ss=s[0]*s[0]+s[1]*s[1],on=(g,P,len2)=>{const t=((P[0]-g.a[0])*(g.b[0]-g.a[0])+(P[1]-g.a[1])*(g.b[1]-g.a[1]))/len2;if(t>1e-9&&t<1-1e-9)g.cut.push([t,P])};on(e,f.a,rr);on(e,f.b,rr);on(f,e.a,ss);on(f,e.b,ss)}}}
 // Pezzi di confine del risultato, con l'area a sinistra; i doppioni (lati sovrapposti) contano una volta.
 const K=P=>Math.round(P[0]*1e3)+','+Math.round(P[1]*1e3),kept=new Map(),eps=.02;
 for(const e of E){const pts=[e.a,...e.cut.sort((p,q)=>p[0]-q[0]).map(c=>c[1]),e.b];for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<1e-6)continue;
  const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,nx=-dy/l*eps,ny=dx/l*eps,L=res(mx+nx,my+ny),R=res(mx-nx,my-ny);if(L===R)continue;const [s,t]=L?[a,b]:[b,a],key=K(s)+'>'+K(t);if(!kept.has(key))kept.set(key,{a:s,b:t,ka:K(s),kb:K(t)})}}
 // Ricucitura: da ogni pezzo si passa a quello che parte dove finisce, fino a tornare all'inizio.
 const starts=new Map();for(const p of kept.values())starts.set(p.ka,[...(starts.get(p.ka)||[]),p]);const used=new Set(),loops=[];
 for(const p of kept.values()){if(used.has(p))continue;used.add(p);const loop=[p.a];let cur=p;for(let g=0;g<1e6&&cur.kb!==p.ka;g++){loop.push(cur.b);const nx=(starts.get(cur.kb)||[]).find(q=>!used.has(q));if(!nx)break;used.add(nx);cur=nx}if(loop.length>2)loops.push(loop)}
 return loops}
function boolOp(op){const many=selItems(),ok=many.filter(x=>hasArea(x)&&!x.lock);if(ok.length<2){toast(`Scegli almeno due forme o tracciati: ${many.some(x=>!hasArea(x))?'i testi e le immagini non si combinano; ':''}Maiusc+clic sul foglio, Maiusc+frecce nei livelli o Ctrl+A`);return}
 const loops=boolPolys(op,ok),[name,done]=BOOL[op];if(!loops.length){toast(op==='intersect'?'Le forme scelte non hanno un’area in comune: non resta niente':'Il risultato è vuoto: le forme restano com’erano');return}
 // Lo stile viene dalla forma in fondo per la sottrazione, da quella più in alto per le altre operazioni.
 const src=op==='subtract'?ok[0]:ok.at(-1),it={id:uid(),kind:'path',name:nextName('path',name),x:0,y:0,w:0,h:0,rot:0,radius:0,rule:'evenodd',subs:loops.map(l=>strokeSub(rdp([...l,l[0]],.3).slice(0,-1),true))};
 for(const k of ['fill','stroke','sw','opacity','grad','dash','cap','join','shadow','blur','blend'])if(src[k]!==undefined)it[k]=structuredClone(src[k]);if(it.fill==='none')it.fill=src.stroke;normPath(it);
 const ids=new Set(ok.map(x=>x.id)),at=Dw.p.items.indexOf(src);pick([it.id],it.id);editD(`${name} di ${ok.length} forme`,p=>{const rest=p.items.filter((x,i)=>i<at&&!ids.has(x.id));p.items=[...rest,it,...p.items.filter((x,i)=>i>at&&!ids.has(x.id))]},{props:true});
 announce(`${ok.length} forme ${done}: «${it.name}», tracciato di ${it.subs.length===1?'una parte':it.subs.length+' parti'} e ${nodeList(it).length} nodi.${many.length>ok.length?' I testi, le immagini e gli oggetti bloccati sono rimasti com’erano.':''}`)}
