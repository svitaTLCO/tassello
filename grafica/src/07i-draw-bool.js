// Unisci, sottrai, interseca ed escludi: le forme scelte diventano spezzate fitte (con la loro rotazione), i lati si
// tagliano dove si incrociano e restano solo i pezzi che separano l'area del risultato da quella fuori, girati con
// l'area a sinistra. I pezzi si ricuciono in contorni chiusi, che si levigano in nodi come i tratti di matita: le curve
// tornano curve e gli incroci restano angoli. Il risultato è un tracciato nuovo; Ctrl+Z riporta le forme di prima.
// Le linee (e i tracciati aperti) restano linee: intersecate con le forme tengono i tratti dentro, sottratte i tratti
// fuori, unite o escluse entrano aperte nel tracciato composto. Taglia con una linea divide le forme lungo le linee.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-union" viewBox="0 0 24 24"><path d="M3 3h11v7h7v11H10v-7H3z" fill="currentColor" fill-opacity=".35"/></symbol>
<symbol id="i-subtract" viewBox="0 0 24 24"><path d="M3 3h11v7h-4v4H3z" fill="currentColor" fill-opacity=".35"/><rect x="10" y="10" width="11" height="11" stroke-dasharray="2 2"/></symbol>
<symbol id="i-intersect" viewBox="0 0 24 24"><rect x="3" y="3" width="11" height="11" stroke-dasharray="2 2"/><rect x="10" y="10" width="11" height="11" stroke-dasharray="2 2"/><rect x="10" y="10" width="4" height="4" fill="currentColor"/></symbol>
<symbol id="i-exclude" viewBox="0 0 24 24"><path d="M3 3h11v7h-4v4H3zM14 10h7v11H10v-7h4z" fill="currentColor" fill-opacity=".35"/><rect x="10" y="10" width="4" height="4"/></symbol>
<symbol id="i-cutLine" viewBox="0 0 24 24"><path d="M4 6h16v13H4z" fill="currentColor" fill-opacity=".35"/><path d="M15 2 8 22" stroke-dasharray="3 2"/></symbol>`);
const BOOL={union:['Unione','unite',c=>c.some(Boolean)],subtract:['Sottrazione','sottratte',c=>c[0]&&!c.slice(1).some(Boolean)],intersect:['Intersezione','intersecate',c=>c.every(Boolean)],exclude:['Esclusione','escluse',c=>c.filter(Boolean).length%2===1]};
const hasArea=it=>it.kind==='path'||!!SHAPE_SUBS[it.kind];
// Linee: le linee e i tracciati che hanno tutte le parti aperte, anche se riempiti.
const drawIsOpen=it=>it.kind==='line'||it.kind==='path'&&it.subs.every(s=>!s.closed);
// Le parti chiuse (open falso) o aperte di un oggetto, con i nodi in coordinate del foglio e la sua rotazione.
function drawSheetSubs(it,open){const b=box(it),src=it.kind==='path'?it:{x:b.x,y:b.y,subs:SHAPE_SUBS[it.kind](it)},r=(it.rot||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),R=(x,y)=>[n2(c*x-s*y),n2(s*x+c*y)];
 return src.subs.filter(sb=>!sb.closed===!!open&&sb.nodes.length>1).map(sb=>({closed:sb.closed,nodes:sb.nodes.map(n=>{const p=rotPt(it,src.x+n.x,src.y+n.y),[ix,iy]=R(n.ix,n.iy),[ox,oy]=R(n.ox,n.oy);return {...n,x:n2(p.x),y:n2(p.y),ix,iy,ox,oy}})}))}
// Spezzate chiuse delle aree di un oggetto, in coordinate del foglio.
const itemPolys=it=>drawSheetSubs(it,false).map(s=>flatten({x:0,y:0,subs:[s]},2)[0]).filter(p=>p.length>2);
// Numero di avvolgimento: quante volte il contorno gira attorno al punto (pari e dispari per la regola evenodd).
function winding(polys,x,y){let w=0;for(const p of polys)for(let i=0,n=p.length;i<n;i++){const [ax,ay]=p[i],[bx,by]=p[(i+1)%n],c=(bx-ax)*(y-ay)-(x-ax)*(by-ay);if(ay<=y){if(by>y&&c>0)w++}else if(by<=y&&c<0)w--}return w}
const boolInside=(it,polys)=>(x,y)=>{const w=winding(polys,x,y);return it.rule==='evenodd'?w%2!==0:w!==0};
const boolEdges=(polys,extra)=>polys.flatMap(p=>p.map((a,k)=>({a,b:p[(k+1)%p.length],...extra})).filter(e=>e.a[0]!==e.b[0]||e.a[1]!==e.b[1]));
// Incroci tra i lati (anche dentro la stessa forma): in e.cut i punti, con la loro posizione lungo il lato; i lati
// sovrapposti si tagliano dove finisce l'altro. pair sceglie le coppie di lati da confrontare. Con snap un incrocio a
// meno di un centesimo di pixel da un vertice cade sul vertice: un pezzetto più corto non saprebbe da che parte sta
// l'area, e il contorno ricucito si spezzerebbe.
function boolCuts(E,pair=()=>true,snap=true){E.forEach(e=>{e.cut=[];e.x0=Math.min(e.a[0],e.b[0]);e.x1=Math.max(e.a[0],e.b[0]);e.y0=Math.min(e.a[1],e.b[1]);e.y1=Math.max(e.a[1],e.b[1])});const S=[...E].sort((p,q)=>p.x0-q.x0);
 for(let m=0;m<S.length;m++){const e=S[m],r=[e.b[0]-e.a[0],e.b[1]-e.a[1]],rr=r[0]*r[0]+r[1]*r[1];for(let q=m+1;q<S.length&&S[q].x0<=e.x1;q++){const f=S[q];if(f.y0>e.y1||f.y1<e.y0||!pair(e,f))continue;
  const s=[f.b[0]-f.a[0],f.b[1]-f.a[1]],den=r[0]*s[1]-r[1]*s[0],qp=[f.a[0]-e.a[0],f.a[1]-e.a[1]];
  if(Math.abs(den)>1e-9){const t=(qp[0]*s[1]-qp[1]*s[0])/den,u=(qp[0]*r[1]-qp[1]*r[0])/den;if(t>1e-9&&t<1-1e-9||u>1e-9&&u<1-1e-9)if(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9){
   const lr=Math.sqrt(rr),ls=Math.hypot(s[0],s[1]),tol=snap?.01:0,te=t*lr>tol&&(1-t)*lr>tol,tf=u*ls>tol&&(1-u)*ls>tol,P=tf?te?[e.a[0]+t*r[0],e.a[1]+t*r[1]]:t<.5?e.a:e.b:u<.5?f.a:f.b;if(te)e.cut.push([t,P]);if(tf)f.cut.push([u,P])}}
  else if(Math.abs(qp[0]*r[1]-qp[1]*r[0])<1e-6*Math.sqrt(rr)){const ss=s[0]*s[0]+s[1]*s[1],on=(g,P,len2)=>{const t=((P[0]-g.a[0])*(g.b[0]-g.a[0])+(P[1]-g.a[1])*(g.b[1]-g.a[1]))/len2;if(t>1e-9&&t<1-1e-9)g.cut.push([t,P])};on(e,f.a,rr);on(e,f.b,rr);on(f,e.a,ss);on(f,e.b,ss)}}}
 return E}
// I pezzi di un lato tra i suoi incroci, con la loro direzione e l'area a sinistra e a destra secondo ins.
function boolPieces(e,ins){const pts=[e.a,...e.cut.sort((p,q)=>p[0]-q[0]).map(c=>c[1]),e.b],out=[];for(let k=1;k<pts.length;k++){const a=pts[k-1],b=pts[k],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy);if(l<1e-6)continue;
 const eps=Math.min(.02,l/4),mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,nx=-dy/l*eps,ny=dx/l*eps;out.push({a,b,L:ins(mx+nx,my+ny),R:ins(mx-nx,my-ny)})}return out}
const boolKey=P=>Math.round(P[0]*1e3)+','+Math.round(P[1]*1e3);
function boolPolys(op,items){const ops=items.map(it=>({it,polys:itemPolys(it)})),res=(x,y)=>BOOL[op][2](ops.map(o=>boolInside(o.it,o.polys)(x,y)));
 const E=boolCuts(ops.flatMap((o,i)=>boolEdges(o.polys,{i})));
 // Pezzi di confine del risultato, con l'area a sinistra; i doppioni (lati sovrapposti) contano una volta.
 const kept=new Map();for(const e of E)for(const {a,b,L,R} of boolPieces(e,res)){if(L===R)continue;const [s,t]=L?[a,b]:[b,a],key=boolKey(s)+'>'+boolKey(t);if(!kept.has(key))kept.set(key,{a:s,b:t,ka:boolKey(s),kb:boolKey(t)})}
 // Ricucitura: da ogni pezzo si passa a quello che parte dove finisce, fino a tornare all'inizio.
 const starts=new Map();for(const p of kept.values())starts.set(p.ka,[...(starts.get(p.ka)||[]),p]);const used=new Set(),loops=[];
 for(const p of kept.values()){if(used.has(p))continue;used.add(p);const loop=[p.a];let cur=p;for(let g=0;g<1e6&&cur.kb!==p.ka;g++){loop.push(cur.b);const nx=(starts.get(cur.kb)||[]).find(q=>!used.has(q));if(!nx)break;used.add(nx);cur=nx}if(loop.length>2)loops.push(loop)}
 return loops}
// Un contorno del risultato in nodi: le curve tornano curve, i lati dritti rette, gli angoli (anche dei poligoni) angoli.
const boolLoopSub=l=>drawFitSub(l,true,.25,25);
// Le parti aperte dove keep(x, y) è vero: ogni tratto si divide dove attraversa il contorno di un'area, con de Casteljau,
// così le curve restano le stesse curve; i pezzi tenuti uno dopo l'altro restano una parte sola.
function boolClipOpen(subs,polys,keep){const E=boolEdges(polys,{area:1}),out=[];
 subs.forEach((s,si)=>segs(s).forEach(([a,b],i)=>{const n=isLine(a,b)?1:Math.max(4,Math.ceil((Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(a.ox,a.oy)+Math.hypot(b.ix,b.iy))/2));let p=[a.x,a.y];for(let k=1;k<=n;k++){const q=segPt(a,b,k/n);E.push({a:p,b:[q.x,q.y],key:si+':'+i,t0:(k-1)/n,t1:k/n});p=[q.x,q.y]}}));
 boolCuts(E,(e,f)=>!e.area!==!f.area,false);const ts={};for(const e of E)if(e.key)for(const [u] of e.cut)(ts[e.key]??=[]).push(e.t0+u*(e.t1-e.t0));
 subs.forEach((s,si)=>{const N=s.nodes.map(n=>({...n}));let cur=null;const stop=()=>{if(cur){Object.assign(cur.nodes.at(-1),{ox:0,oy:0,s:0});cur=null}};
  for(let i=0;i+1<N.length;i++){const B=N[i+1],cuts=[...new Set(ts[si+':'+i]||[])].filter(t=>t>1e-6&&t<1-1e-6).sort((p,q)=>p-q),parts=[];let A=N[i],t0=0;
   for(const t of cuts){const m=splitSeg(A,B,(t-t0)/(1-t0));parts.push([A,m]);A=m;t0=t}parts.push([A,B]);
   for(const [P,Q] of parts){const m=segPt(P,Q,.5);if(!keep(m.x,m.y)){stop();continue}if(cur?.nodes.at(-1)===P)cur.nodes.push(Q);else{stop();Object.assign(P,{ix:0,iy:0,s:0});cur={closed:false,nodes:[P,Q]};out.push(cur)}}}stop()});
 return out}
// Il risultato prende lo stile dell'oggetto più in alto (per la sottrazione di quello in fondo); se tra gli oggetti ci sono
// linee e forme, il riempimento viene dalla forma più in alto e il contorno dalla linea più in alto, così si vedono tutte.
function boolStyle(it,src,area,line){for(const k of ['fill','stroke','sw','opacity','grad','dash','cap','join','shadow','blur','blend'])if(src[k]!==undefined)it[k]=structuredClone(src[k]);
 if(area&&it.fill==='none'){const a=area.fill!=='none'?area:null;it.fill=a?a.fill:src.stroke;if(a?.grad)it.grad=structuredClone(a.grad)}
 if(line&&!(it.sw>0&&it.stroke!=='none'))for(const k of ['stroke','sw','dash','cap','join'])if(line[k]!==undefined)it[k]=line[k]}
function boolOp(op){const many=selItems(),ok=many.filter(x=>hasArea(x)&&!x.lock),lines=ok.filter(drawIsOpen),areas=ok.filter(x=>!drawIsOpen(x));if(ok.length<2){toast(`Scegli almeno due forme, linee o tracciati: ${many.some(x=>!hasArea(x))?'i testi e le immagini non si combinano; ':''}Maiusc+clic sul foglio, Maiusc+frecce nei livelli o Ctrl+A`);return}
 if(lines.length&&(op==='intersect'||op==='subtract'&&drawIsOpen(ok[0]))){boolLines(op,ok,lines,areas);return}
 // Con la forma in fondo, le linee davanti non tolgono area: restano com'erano.
 const use=op==='subtract'?areas:ok,keepLines=op==='subtract'?lines:[];if(op==='subtract'&&areas.length<2){toast('Le linee non hanno un’area da togliere alla forma: sottrai un’altra forma, oppure usa Taglia con una linea');return}
 const A=use.filter(x=>!drawIsOpen(x)),loops=A.length?boolPolys(op,A):[],open=op==='union'||op==='exclude'?use.flatMap(x=>drawSheetSubs(x,true)):[],[name,done]=BOOL[op];
 if(!loops.length&&!open.length){toast(op==='intersect'?'Le forme scelte non hanno un’area in comune: non resta niente':'Il risultato è vuoto: le forme restano com’erano');return}
 const src=op==='subtract'?A[0]:use.at(-1),it={id:uid(),kind:'path',name:nextName('path',name),x:0,y:0,w:0,h:0,rot:0,radius:0,rule:'evenodd',subs:[...loops.map(boolLoopSub),...open]};
 boolStyle(it,src,loops.length&&A.at(-1),open.length&&use.filter(drawIsOpen).at(-1));normPath(it);
 const ids=new Set(use.map(x=>x.id)),at=Dw.p.items.indexOf(src);pick([it.id],it.id);editD(`${name} di ${use.length} ${open.length?'oggetti':'forme'}`,p=>{const rest=p.items.filter((x,i)=>i<at&&!ids.has(x.id));p.items=[...rest,it,...p.items.filter((x,i)=>i>at&&!ids.has(x.id))]},{props:true});
 const nl=use.filter(drawIsOpen).length,parts=it.subs.length;
 announce(`${use.length} ${nl?'oggetti':'forme'} ${nl?done.replace(/e$/,'i'):done}:«${it.name}», tracciato di ${parts===1?'una parte':parts+' parti'} e ${nodeList(it).length} nodi.${open.length?` ${nl===1?'La linea resta aperta':'Le linee restano aperte'} nello stesso tracciato: ha${nl===1?'':'nno'} il contorno, non il riempimento.`:''}${keepLines.length?` ${keepLines.length===1?'La linea scelta è rimasta':'Le linee scelte sono rimaste'} com’era: per sottrarre da una linea, mettila in fondo.`:''}${many.length>ok.length?' I testi, le immagini e gli oggetti bloccati sono rimasti com’erano.':''}`)}
// Linee e forme: intersecando restano i tratti delle linee dentro tutte le forme, sottraendo (con una linea in fondo) quelli
// fuori da tutte le forme. Ogni linea resta un oggetto con il suo stile; le forme fanno da sagoma e spariscono.
function boolLines(op,ok,lines,areas){if(!areas.length){toast(`Per ${op==='intersect'?'intersecare':'sottrarre da'} una linea serve almeno una forma chiusa: un rettangolo, un’ellisse o un tracciato chiuso`);return}
 const A=areas.map(it=>boolInside(it,itemPolys(it))),polys=areas.flatMap(itemPolys),keep=op==='intersect'?(x,y)=>A.every(f=>f(x,y)):(x,y)=>!A.some(f=>f(x,y));
 const res=lines.map(it=>[it,boolClipOpen(drawSheetSubs(it,true),polys,keep)]),kept=res.filter(r=>r[1].length),n=kept.reduce((s,r)=>s+r[1].length,0);
 if(!kept.length){toast(op==='intersect'?'Nessuna delle linee scelte passa dentro le forme: non resta niente':'Le linee scelte sono tutte dentro le forme: non resta niente');return}
 const gone=new Set([...areas,...res.filter(r=>!r[1].length).map(r=>r[0])].map(x=>x.id));pick(kept.map(r=>r[0].id),kept.at(-1)[0].id);
 editD(`${BOOL[op][0]} di ${ok.length} oggetti`,p=>{for(const [it,subs] of kept){Object.assign(it,{kind:'path',x:0,y:0,w:0,h:0,rot:0,subs});normPath(it)}p.items=p.items.filter(x=>!gone.has(x.id))},{props:true});
 announce(`${kept.length===1?`«${kept[0][0].name}»`:kept.length+' linee'}: ${n===1?'resta un tratto':`restano ${n} tratti`}, quell${n===1?'o':'i'} ${op==='intersect'?'dentro ':'fuori dal'}${areas.length>1?'le forme':'la forma'}. ${areas.length>1?'Le forme hanno fatto da sagoma e non ci sono più':'La forma ha fatto da sagoma e non c’è più'}${res.length>kept.length?`; ${res.length-kept.length===1?'una linea è sparita':res.length-kept.length+' linee sono sparite'} del tutto`:''}.`)}
// Taglia con una linea: le linee scelte dividono le forme che attraversano da parte a parte. I pezzi sono le facce del
// disegno fatto dai contorni e dai tratti delle linee dentro la forma: si percorrono con l'area a sinistra, girando a
// ogni incrocio il più possibile verso l'area. I buchi stanno nel pezzo che li contiene.
function boolFaces(it,L){const polys=itemPolys(it),ins=boolInside(it,polys),E=boolCuts([...boolEdges(polys,{area:1}),...L.flatMap(l=>l.slice(1).map((b,k)=>({a:l[k],b})).filter(e=>e.a[0]!==e.b[0]||e.a[1]!==e.b[1]))]),H=[],lineP=[];
 for(const e of E)for(const {a,b,L:l,R:r} of boolPieces(e,ins)){if(e.area){if(l!==r)H.push(l?{a,b}:{a:b,b:a})}else if(l&&r)lineP.push({a,b})}
 // I tratti che finiscono dentro la forma senza arrivare a un contorno o a un'altra linea non tagliano: si tolgono.
 const deg=new Map(),inc=k=>deg.set(k,(deg.get(k)||0)+1);for(const h of [...H,...lineP]){inc(h.ka=boolKey(h.a));inc(h.kb=boolKey(h.b))}
 for(let again=true;again;){again=false;for(let i=lineP.length-1;i>=0;i--){const p=lineP[i];if(deg.get(p.ka)<2||deg.get(p.kb)<2){deg.set(p.ka,deg.get(p.ka)-1);deg.set(p.kb,deg.get(p.kb)-1);lineP.splice(i,1);again=true}}}
 if(!lineP.length)return [];for(const p of lineP)H.push(p,{a:p.b,b:p.a,ka:p.kb,kb:p.ka});
 const from=new Map();for(const h of H)from.set(h.ka,[...(from.get(h.ka)||[]),h]);const used=new Set(),loops=[];
 for(const h0 of H){if(used.has(h0))continue;const loop=[];let h=h0;for(let g=0;g<1e6;g++){used.add(h);loop.push(h.a);const dx=h.b[0]-h.a[0],dy=h.b[1]-h.a[1];let best=null,bt=-Infinity;
   for(const c of from.get(h.kb)||[]){const ex=c.b[0]-c.a[0],ey=c.b[1]-c.a[1];if(c.kb===h.ka&&Math.abs(ex+dx)+Math.abs(ey+dy)<1e-9)continue;const t=Math.atan2(dx*ey-dy*ex,dx*ex+dy*ey);if(t>bt){bt=t;best=c}}
   if(best===h0){if(loop.length>2)loops.push(loop);break}if(!best||used.has(best))break;h=best}}
 const area=l=>l.reduce((s,p,i)=>{const q=l[(i+1)%l.length];return s+p[0]*q[1]-q[0]*p[1]},0)/2,outer=loops.filter(l=>area(l)>0).map(l=>({l,a:area(l),holes:[]}));
 for(const l of loops)if(area(l)<=0){const o=outer.filter(o=>winding([o.l],...l[0])!==0).sort((p,q)=>p.a-q.a)[0];o?.holes.push(l)}
 return outer.map(o=>[o.l,...o.holes])}
function boolCut(){const many=selItems(),ok=many.filter(x=>hasArea(x)&&!x.lock),lines=ok.filter(drawIsOpen),areas=ok.filter(x=>!drawIsOpen(x));
 if(!lines.length||!areas.length){toast('Scegli una forma e una linea che la attraversa da parte a parte (Maiusc+clic sul foglio o Maiusc+frecce nei livelli)');return}
 const L=lines.flatMap(it=>flatten({x:0,y:0,subs:drawSheetSubs(it,true)},2)),res=areas.map(it=>[it,boolFaces(it,L)]).filter(r=>r[1].length>1);
 if(!res.length){toast('Le linee non attraversano le forme da parte a parte: niente da tagliare');return}
 const made=new Map(res.map(([it,faces])=>[it.id,faces.map((f,k)=>{const o={id:uid(),kind:'path',name:`${it.name} ${k+1}`,x:0,y:0,w:0,h:0,rot:0,radius:0,rule:'evenodd',subs:f.map(boolLoopSub)};boolStyle(o,it);if(it.g)o.g=it.g;return normPath(o)})])),gone=new Set(lines.map(x=>x.id)),all=[...made.values()].flat();
 pick(all.map(x=>x.id),all.at(-1).id);editD(`Taglia ${res.length===1?res[0][0].name:res.length+' forme'} con ${lines.length===1?'una linea':lines.length+' linee'}`,p=>{p.items=p.items.flatMap(x=>made.get(x.id)||(gone.has(x.id)?[]:[x]))},{props:true});
 announce(`Taglio ${res.length===1?`di «${res[0][0].name}»`:`di ${res.length} forme`}: ${all.length} pezzi, ${namesOf(all)}. ${lines.length===1?'La linea ha fatto da coltello e non c’è più':'Le linee hanno fatto da coltello e non ci sono più'}.${areas.length>res.length?` ${areas.length-res.length===1?'Una forma non è attraversata da parte a parte ed è rimasta':areas.length-res.length+' forme non sono attraversate da parte a parte e sono rimaste'} com’era.`:''}`)}
