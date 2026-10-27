// Tracciati: parti (subs) fatte di nodi con le maniglie di Bézier. I nodi sono relativi all'angolo (x, y) del riquadro e
// le maniglie al loro nodo (ix, iy quella d'entrata, ox, oy quella d'uscita); s vale 1 nei nodi curvi, dove le due
// maniglie restano allineate. Il riquadro è quello vero della curva e si ricalcola dopo ogni modifica dei nodi.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-pointer" viewBox="0 0 24 24"><path d="M5 3l13 8-6 1.5L9 19z"/></symbol>
<symbol id="i-nodes" viewBox="0 0 24 24"><path d="M5 18C7 8 17 16 19 6"/><rect x="3" y="16" width="4" height="4"/><rect x="17" y="4" width="4" height="4"/><circle cx="12" cy="12" r="2"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24"><path d="M12 3l6 7-6 11-6-11z"/><path d="M12 13v8M10.5 11.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0"/></symbol>
<symbol id="i-pathI" viewBox="0 0 24 24"><path d="M4 19C6 6 18 18 20 5"/></symbol>
<symbol id="i-nodeType" viewBox="0 0 24 24"><path d="M3 17l6-8 4 6"/><path d="M13 15c2-6 6-6 8-2"/><rect x="7.5" y="7.5" width="3" height="3"/></symbol>
<symbol id="i-pathClose" viewBox="0 0 24 24"><path d="M6 18 4 8l8-5 8 5-2 10z" stroke-dasharray="3 2"/><circle cx="6" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></symbol>`);
const segs=s=>{const n=s.nodes,out=[];for(let i=0;i+1<n.length;i++)out.push([n[i],n[i+1],i]);if(s.closed&&n.length>1)out.push([n.at(-1),n[0],n.length-1]);return out};
const isLine=(a,b)=>!a.ox&&!a.oy&&!b.ix&&!b.iy;
function pathD(it,ox=it.x,oy=it.y){return it.subs.map(s=>{const f=s.nodes[0];if(!f)return '';return `M${n2(ox+f.x)} ${n2(oy+f.y)}`+segs(s).map(([a,b])=>isLine(a,b)?`L${n2(ox+b.x)} ${n2(oy+b.y)}`:`C${n2(ox+a.x+a.ox)} ${n2(oy+a.y+a.oy)} ${n2(ox+b.x+b.ix)} ${n2(oy+b.y+b.iy)} ${n2(ox+b.x)} ${n2(oy+b.y)}`).join('')+(s.closed?'Z':'')}).join('')}
const bez=(t,a,b,c,d)=>{const u=1-t;return u*u*u*a+3*u*u*t*b+3*u*t*t*c+t*t*t*d};
// Valore minimo e massimo di una curva di Bézier su un asse: gli estremi, più i punti dove la derivata si annulla.
function bezRange(a,b,c,d){let lo=Math.min(a,d),hi=Math.max(a,d);const A=d-3*c+3*b-a,B=2*(c-2*b+a),C=b-a,ts=[];if(Math.abs(A)<1e-9){if(Math.abs(B)>1e-9)ts.push(-C/B)}else{const q=B*B-4*A*C;if(q>=0){const r=Math.sqrt(q);ts.push((-B+r)/(2*A),(-B-r)/(2*A))}}
 for(const t of ts)if(t>0&&t<1){const v=bez(t,a,b,c,d);lo=Math.min(lo,v);hi=Math.max(hi,v)}return [lo,hi]}
function pathBounds(subs){let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const add=([lx,hx],[ly,hy])=>{x0=Math.min(x0,lx);x1=Math.max(x1,hx);y0=Math.min(y0,ly);y1=Math.max(y1,hy)};
 for(const s of subs){for(const n of s.nodes)add([n.x,n.x],[n.y,n.y]);for(const [a,b] of segs(s))if(!isLine(a,b))add(bezRange(a.x,a.x+a.ox,b.x+b.ix,b.x),bezRange(a.y,a.y+a.oy,b.y+b.iy,b.y))}
 return x0>x1?{x0:0,y0:0,x1:0,y1:0}:{x0,y0,x1,y1}}
// Riporta i nodi nel riquadro della curva. In un tracciato ruotato il centro di rotazione cambia con il riquadro:
// la posizione si corregge perché i nodi restino dove si vedevano.
function normPath(it){const o={x:it.x,y:it.y,w:it.w,h:it.h},b=pathBounds(it.subs);for(const s of it.subs)for(const n of s.nodes){n.x=n2(n.x-b.x0);n.y=n2(n.y-b.y0)}it.x=n2(it.x+b.x0);it.y=n2(it.y+b.y0);it.w=n2(b.x1-b.x0);it.h=n2(b.y1-b.y0);
 if(it.rot){const dx=it.x+it.w/2-o.x-o.w/2,dy=it.y+it.h/2-o.y-o.h/2,r=it.rot*Math.PI/180,c=Math.cos(r),s=Math.sin(r);it.x=n2(it.x-dx+c*dx-s*dy);it.y=n2(it.y-dy+s*dx+c*dy)}return it}
function fitGeometry(it,o){if(!o.subs)return;const sx=o.w?it.w/o.w:1,sy=o.h?it.h/o.h:1;it.subs=o.subs.map(s=>({...s,nodes:s.nodes.map(n=>({...n,x:n2(n.x*sx),y:n2(n.y*sy),ix:n2(n.ix*sx),iy:n2(n.iy*sy),ox:n2(n.ox*sx),oy:n2(n.oy*sy)}))}));if(o.brush)it.brush={...o.brush,pts:o.brush.pts.map(([x,y,p])=>[n2(x*sx),n2(y*sy),p])}}
// Punti del foglio e punti del tracciato non ruotato: le maniglie e i nodi si mostrano e si spostano dove si vedono.
function rotPt(it,x,y,dir=1){if(!it.rot)return{x,y};const r=dir*it.rot*Math.PI/180,c=Math.cos(r),s=Math.sin(r),cx=it.x+it.w/2,cy=it.y+it.h/2,dx=x-cx,dy=y-cy;return{x:cx+c*dx-s*dy,y:cy+s*dx+c*dy}}
const nodeVis=(it,n)=>rotPt(it,it.x+n.x,it.y+n.y),unrot=(it,pt)=>rotPt(it,pt.x,pt.y,-1);
function nodeList(it){const out=[];it.subs.forEach((s,si)=>s.nodes.forEach((n,i)=>out.push({s,si,n,i})));return out}
// Il nodo scelto è un indice in tutti i nodi del tracciato; si azzera quando si passa a un altro tracciato.
function curNode(it){if(Dw.nodeFor!==it.id){Dw.nodeFor=it.id;Dw.node=0}Dw.node=clamp(Dw.node,0,Math.max(0,nodeList(it).length-1));return Dw.node}
const nodePath=()=>{const it=selItem();return it?.kind==='path'&&selIds().length===1?it:null};
function setNodeVis(it,n,P){const A=unrot(it,P);n.x=A.x-it.x;n.y=A.y-it.y;normPath(it)}
// Curva o angolo: un nodo curvo prende le maniglie dalla direzione dei vicini, lunghe un terzo della distanza.
function smoothNode(s,i){const n=s.nodes[i],N=s.nodes.length,p=s.nodes[i-1]||(s.closed?s.nodes[N-1]:null),q=s.nodes[i+1]||(s.closed?s.nodes[0]:null);n.s=1;if(!p&&!q)return;
 const tx=(q||n).x-(p||n).x,ty=(q||n).y-(p||n).y,len=Math.hypot(tx,ty)||1,dp=p?Math.hypot(n.x-p.x,n.y-p.y)/3:0,dq=q?Math.hypot(q.x-n.x,q.y-n.y)/3:0;n.ix=n2(-tx/len*dp);n.iy=n2(-ty/len*dp);n.ox=n2(tx/len*dq);n.oy=n2(ty/len*dq)}
const cornerNode=n=>Object.assign(n,{ix:0,iy:0,ox:0,oy:0,s:0});
// Divide il tratto da a a b nel punto t (de Casteljau): restituisce il nodo nuovo e accorcia le maniglie di a e b.
function splitSeg(a,b,t){const L=(p,q)=>[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];if(isLine(a,b))return {x:n2(a.x+(b.x-a.x)*t),y:n2(a.y+(b.y-a.y)*t),ix:0,iy:0,ox:0,oy:0,s:0};
 const P1=[a.x+a.ox,a.y+a.oy],P2=[b.x+b.ix,b.y+b.iy],A=L([a.x,a.y],P1),B=L(P1,P2),Cc=L(P2,[b.x,b.y]),D=L(A,B),E=L(B,Cc),F=L(D,E);
 a.ox=n2(A[0]-a.x);a.oy=n2(A[1]-a.y);b.ix=n2(Cc[0]-b.x);b.iy=n2(Cc[1]-b.y);return {x:n2(F[0]),y:n2(F[1]),ix:n2(D[0]-F[0]),iy:n2(D[1]-F[1]),ox:n2(E[0]-F[0]),oy:n2(E[1]-F[1]),s:1}}
const segPt=(a,b,t)=>({x:bez(t,a.x,a.x+a.ox,b.x+b.ix,b.x),y:bez(t,a.y,a.y+a.oy,b.y+b.iy,b.y)});
// Spezzate che seguono le curve, in coordinate del foglio non ruotate: servono per toccare i tracciati e per la gomma.
function flatten(it,step=4){return it.subs.map(s=>{const f=s.nodes[0];if(!f)return [];const out=[[it.x+f.x,it.y+f.y]];for(const [a,b] of segs(s)){const n=isLine(a,b)?1:Math.max(2,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/step));for(let k=1;k<=n;k++){const p=segPt(a,b,k/n);out.push([it.x+p.x,it.y+p.y])}}return out})}
// Elenco e descrizione dei nodi, per lo screen reader e per l'elenco nelle proprietà.
const DIRS=['a destra','in basso a destra','in basso','in basso a sinistra','a sinistra','in alto a sinistra','in alto','in alto a destra'];
const dirWord=(dx,dy)=>DIRS[(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
function nodeLabel(it,j){const {s,n,i}=nodeList(it)[j],v=nodeVis(it,n);return `Nodo ${j+1}, ${n.s?'curvo':'d’angolo'}, x ${fmtInt(v.x)}, y ${fmtInt(v.y)}${!s.closed&&i===0?', inizio':!s.closed&&i===s.nodes.length-1?', fine':''}`}
function pathSummary(it){const L=nodeList(it),closed=it.subs.filter(s=>s.closed).length,curves=L.filter(x=>x.n.s).length;return `${it.subs.length>1?it.subs.length+' parti, ':''}${closed===it.subs.length?'chiuso':closed?'in parte chiuso':'aperto'}, ${L.length===1?'un nodo':L.length+' nodi'}: ${L.length-curves} d’angolo e ${curves===1?'uno curvo':curves+' curvi'}`}
function describePath(it){const parts=it.subs.map((s,si)=>{if(!s.nodes.length)return '';const P=n=>nodeVis(it,n),f=P(s.nodes[0]);let t=`${it.subs.length>1?`Parte ${si+1}: parte`:'Parte'} da x ${fmtInt(f.x)}, y ${fmtInt(f.y)}`;const sg=segs(s);
  if(sg.length>24){const l=P(s.nodes.at(-1));return t+`, ${s.nodes.length} nodi${s.closed?', e torna al punto di partenza':`, finisce a x ${fmtInt(l.x)}, y ${fmtInt(l.y)}`}`}
  for(const [a,b,i] of sg){const A=P(a),B=P(b),back=s.closed&&i===s.nodes.length-1;t+=`; ${isLine(a,b)?'linea retta':'curva'} di ${fmtInt(Math.hypot(B.x-A.x,B.y-A.y))} pixel ${dirWord(B.x-A.x,B.y-A.y)}${back?' fino al punto di partenza':` fino a x ${fmtInt(B.x)}, y ${fmtInt(B.y)}`}`}return t+'.'});
 return `«${it.name}», tracciato ${pathSummary(it)}. ${parts.join(' ')}`}
// Cursore da tastiera degli strumenti che disegnano: le frecce lo muovono di 10 pixel (con Maiusc di uno), Home, Fine,
// PgSu e PgGiù in diagonale. Si vede dal primo tasto finché non si usa il puntatore, e riparte da dove era il puntatore.
Dw.cur={x:0,y:0,on:false};
const CUR_KEYS={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],Home:[-1,-1],PageUp:[1,-1],End:[-1,1],PageDown:[1,1]};
function cursorKey(e){const D=CUR_KEYS[e.key];if(!D||e.altKey||e.ctrlKey||e.metaKey)return null;e.preventDefault();const c=Dw.cur,st=e.shiftKey?1:10;
 if(!c.on){c.on=true;if(!c.x&&!c.y){c.x=Math.round(Dw.p.w/2);c.y=Math.round(Dw.p.h/2)}}else{c.x=clamp(c.x+D[0]*st,0,Dw.p.w);c.y=clamp(c.y+D[1]*st,0,Dw.p.h)}return c}
const curSay=c=>`x ${fmtInt(c.x)}, y ${fmtInt(c.y)}`;
const curFromPointer=pt=>{Dw.cur={x:Math.round(pt.x),y:Math.round(pt.y),on:false}};
function cursorSvg(k){const c=Dw.cur;if(!c.on)return '';const r=9/k,sw=n2(1.5/k),C=(x,y)=>`${n2(x)} ${n2(y)}`;return `<g class="k-cur"><circle cx="${c.x}" cy="${c.y}" r="${n2(r)}" stroke-width="${sw}"/><path d="M${C(c.x-r*2,c.y)}H${n2(c.x-r/2)}M${C(c.x+r/2,c.y)}H${n2(c.x+r*2)}M${C(c.x,c.y-r*2)}V${n2(c.y-r/2)}M${C(c.x,c.y+r/2)}V${n2(c.y+r*2)}" stroke-width="${sw}"/></g>`}
// Nodi e maniglie sopra il foglio: quadrati i nodi d'angolo, tondi quelli curvi, pieno quello scelto; i tratti si possono
// cliccare per aggiungere un nodo. cur è il nodo scelto (−1 nessuno), all mostra le maniglie di tutti i nodi.
function nodesSvg(it,k,cur,{segsHit=false,all=false}={}){const sw=n2(1.2/k),hs=6/k,r=n2(4.5/k),L=nodeList(it),P=n=>[n2(it.x+n.x),n2(it.y+n.y)],b=box(it);let s='';
 if(segsHit){let j=0;for(const sub of it.subs){for(const [a,c,i] of segs(sub))s+=`<path class="n-seg" data-seg="${j+i}" d="M${P(a).join(' ')}C${n2(it.x+a.x+a.ox)} ${n2(it.y+a.y+a.oy)} ${n2(it.x+c.x+c.ix)} ${n2(it.y+c.y+c.iy)} ${P(c).join(' ')}" stroke-width="${n2(12/k)}" fill="none"/>`;j+=sub.nodes.length}}
 s+=`<path class="n-path" d="${pathD(it)}" fill="none" stroke-width="${sw}"/>`;
 L.forEach(({n},j)=>{const [x,y]=P(n);if(j===cur||all)for(const w of ['i','o'])if(n[w+'x']||n[w+'y']){const hx=n2(x+n[w+'x']),hy=n2(y+n[w+'y']);s+=`<line class="n-arm" x1="${x}" y1="${y}" x2="${hx}" y2="${hy}" stroke-width="${sw}"/><circle class="n-h" data-hn="${j}:${w}" cx="${hx}" cy="${hy}" r="${r}"/>`}
  s+=n.s?`<circle class="node${j===cur?' cur':''}" data-n="${j}" cx="${x}" cy="${y}" r="${n2(hs*.6)}" stroke-width="${sw}"/>`:`<rect class="node${j===cur?' cur':''}" data-n="${j}" x="${n2(x-hs/2)}" y="${n2(y-hs/2)}" width="${n2(hs)}" height="${n2(hs)}" stroke-width="${sw}"/>`});
 return `<g${it.rot?` transform="rotate(${it.rot} ${n2(b.x+b.w/2)} ${n2(b.y+b.h/2)})"`:''}>${s}</g>`}
// Strumenti: il nome, che cosa si annuncia quando si sceglie e la descrizione del foglio per lo screen reader.
const TOOL_INFO={select:['Selezione','Selezione: clic per scegliere, Maiusc+clic per aggiungere, trascina sul vuoto per scegliere con un riquadro.','Frecce per spostare l’oggetto scelto di un pixel, con Maiusc di dieci; Ctrl più frecce per cambiarne le dimensioni; Alt+Maiusc più frecce per agganciarlo alla guida successiva. PgSu e PgGiù scelgono l’oggetto sopra o sotto, con Maiusc lo aggiungono alla scelta; Ctrl+A sceglie tutto. Invio porta alle proprietà, Esc toglie la scelta, Canc elimina, Maiusc+F10 apre il menu. Più e meno cambiano lo zoom, zero mostra tutto il foglio. Alt+Maiusc+I descrive il foglio. Strumenti: V Selezione, A Nodi, P Penna.'],
 nodes:['Nodi','Nodi: clic su un nodo per sceglierlo e trascinarlo, su un tratto per aggiungerne uno, doppio clic per farlo d’angolo o curvo. Da tastiera PgSu e PgGiù scelgono il nodo e le frecce lo spostano.','Strumento Nodi. PgSu e PgGiù scelgono il nodo precedente o successivo, Home e Fine il primo e l’ultimo; le frecce spostano il nodo scelto di un pixel, con Maiusc di dieci; Spazio lo fa d’angolo o curvo, Ins aggiunge un nodo dopo, Canc lo toglie, Invio porta all’elenco dei nodi nelle proprietà, Alt+Maiusc+P descrive il tracciato, Esc torna alla Selezione.'],
 pen:['Penna','Penna: clic per un nodo d’angolo, trascina per un nodo curvo, clic sul primo nodo per chiudere il tracciato, Invio per finirlo aperto. Da tastiera: frecce per il cursore, Spazio per un nodo.','Strumento Penna. Frecce per muovere il cursore di dieci pixel, con Maiusc di uno; Home, Fine, PgSu e PgGiù in diagonale. Spazio aggiunge un nodo d’angolo, Maiusc+Spazio un nodo curvo; Spazio sul primo nodo o Maiusc+Invio chiude il tracciato, Invio lo finisce aperto. Esc o V tornano alla Selezione.']};
const TOOL_IDS=['select','nodes','pen'];
const toolCmd=id=>'tool'+id[0].toUpperCase()+id.slice(1);
// I pulsanti degli strumenti stanno nella barra sotto il foglio, prima dello zoom.
$('drawbar').setAttribute('aria-label','Strumenti e vista del foglio');
function renderToolButtons(){$$('#drawbar .tool-btn').forEach(b=>b.remove());$('drawbar').insertAdjacentHTML('afterbegin',TOOL_IDS.map(id=>{const c=C[toolCmd(id)];return `<button type="button" class="btn sm tool-btn" data-action="${c.id}" aria-pressed="${Dw.tool===id}" aria-label="${esc(c.label)}" aria-keyshortcuts="${esc(c.keys)}" data-tip="${esc(tipText(c))}">${ICON(c.icon)}</button>`}).join('')+'<span class="tsep tool-btn" aria-hidden="true"></span>')}
function setTool(id,{say=true}={}){const from=Dw.tool;if(from==='pen'&&id!=='pen')penFinish({say:false});toolReset();Dw.tool=id;Dw.cur.on=false;sheetWrap.dataset.tool=id;$('sheetHint').textContent=TOOL_INFO[id][2];
 for(const b of $$('#drawbar .tool-btn[data-action]'))b.setAttribute('aria-pressed',b.dataset.action===toolCmd(id));refreshToggles();renderOverlay();
 if(id==='nodes'){const it=nodePath();if(it)curNode(it);renderProps()}if(say)announce(TOOL_INFO[id][1]+(id==='nodes'&&!nodePath()?' Scegli prima un tracciato.':''))}
// Penna: un clic fa un nodo d'angolo, un trascinamento un nodo curvo (la maniglia segue il puntatore), un clic sul primo
// nodo chiude il tracciato, un doppio clic o Invio lo lasciano aperto. Ogni nodo è un passo da annullare.
const pen={id:null,drag:null,hover:null,closing:false};
const penPath=()=>{const it=itemOf(pen.id);return it&&Dw.sel===it.id?it:null};
function penAdd(pt,smooth,tol){let it=penPath();const sub=it?.subs.at(-1);
 if(it&&sub.nodes.length>1&&Math.hypot(it.x+sub.nodes[0].x-pt.x,it.y+sub.nodes[0].y-pt.y)<=tol){sub.closed=true;pen.closing=true;if(smooth)smoothNode(sub,0);normPath(it);return 'close'}
 if(it&&Math.hypot(it.x+sub.nodes.at(-1).x-pt.x,it.y+sub.nodes.at(-1).y-pt.y)<=tol/2)return 'end';
 if(!it){const s=Math.min(Dw.p.w,Dw.p.h);it={id:uid(),kind:'path',name:nextName('path'),x:n2(pt.x),y:n2(pt.y),w:0,h:0,rot:0,opacity:100,fill:'none',stroke:Dw.pen?.stroke||'#1b1b1b',sw:Dw.pen?.sw||Math.max(2,Math.round(s/216)),radius:0,subs:[{closed:false,nodes:[]}]};Dw.p.items.push(it);pen.id=it.id;pick([it.id],it.id)}
 const s=it.subs.at(-1);s.nodes.push({x:n2(pt.x-it.x),y:n2(pt.y-it.y),ix:0,iy:0,ox:0,oy:0,s:0});if(smooth){smoothNode(s,s.nodes.length-1);if(s.nodes.length>2&&s.nodes.at(-2).s)smoothNode(s,s.nodes.length-2)}normPath(it);return 'add'}
function penSettle(what){const it=penPath();if(!it)return;const s=it.subs.at(-1),n=s.nodes.length;settleD(what==='close'?'Chiudi il tracciato':n===1?'Disegna un tracciato':'Aggiungi un nodo',{props:true});
 if(what==='close'){pen.id=null;pen.closing=false;announce(`«${it.name}» chiuso, ${n} nodi. Il prossimo nodo inizia un tracciato nuovo.`)}
 else announce(n===1?`Nuovo tracciato «${it.name}»: ${nodeLabel(it,0)}. Aggiungi gli altri nodi; Invio lo finisce aperto.`:nodeLabel(it,nodeList(it).length-1))}
function penFinish({say=true}={}){const it=penPath();pen.id=null;pen.hover=null;pen.drag=null;if(!it){renderOverlay();return}
 if(nodeList(it).length<2){editD('Togli '+it.name,p=>{p.items=p.items.filter(x=>x!==it)},{props:true});pick([],null);selChanged({say:false});if(say)announce('Tracciato tolto: aveva un nodo solo');return}
 renderOverlay();if(say)announce(`«${it.name}» finito, aperto, ${nodeList(it).length} nodi. Il prossimo nodo inizia un tracciato nuovo.`)}
TOOLS.pen={sel:'box',
 reset(){pen.drag=null;pen.hover=null},
 down(e,pt){curFromPointer(pt);const r=penAdd(pt,false,8/sheetScale());if(r==='end'){penFinish();return false}pen.drag={pt0:pt,what:r};renderSheet();return true},
 move(e,pt){const d=pen.drag,it=penPath();if(!d){if(it){pen.hover=pt;renderOverlay()}return}if(!it)return;const dx=pt.x-d.pt0.x,dy=pt.y-d.pt0.y;if(!d.moved&&Math.hypot(dx,dy)*sheetScale()<3)return;d.moved=true;
  const s=it.subs.at(-1),n=d.what==='close'?s.nodes[0]:s.nodes.at(-1);Object.assign(n,{ox:n2(dx),oy:n2(dy),ix:n2(-dx),iy:n2(-dy),s:1});normPath(it);renderSheet()},
 up(){const d=pen.drag;if(!d)return;pen.drag=null;penSettle(d.what)},
 key(e){const it=penPath();
  if(e.key==='Enter'){e.preventDefault();if(!it)toast('Nessun tracciato in corso: Spazio aggiunge il primo nodo dove c’è il cursore');else if(e.shiftKey){if(nodeList(it).length<2)toast('Servono almeno due nodi per chiudere il tracciato');else{it.subs.at(-1).closed=true;normPath(it);penSettle('close')}}else penFinish();return true}
  if(e.key==='Escape'){e.preventDefault();if(it)penFinish();else setTool('select');return true}
  if(e.key===' '){e.preventDefault();if(!Dw.cur.on){toast('Muovi prima il cursore con le frecce: parte dal centro del foglio');return true}const r=penAdd(Dw.cur,e.shiftKey,.5);if(r==='end')penFinish();else penSettle(r);return true}
  const c=cursorKey(e);if(!c)return false;const p=penPath(),f=p?.subs.at(-1).nodes[0],on=f&&nodeList(p).length>1&&Math.hypot(p.x+f.x-c.x,p.y+f.y-c.y)<.5;announce(curSay(c)+(on?': sul primo nodo, Spazio chiude il tracciato':''));renderOverlay();return true},
 overlay(k){const it=penPath();let s=cursorSvg(k);if(!it)return s;const n=it.subs.at(-1).nodes.at(-1),h=Dw.cur.on?Dw.cur:pen.hover;
  if(h&&!pen.drag&&n){const x=it.x+n.x,y=it.y+n.y;s=`<path class="n-rubber" d="M${n2(x)} ${n2(y)}C${n2(x+n.ox)} ${n2(y+n.oy)} ${n2(h.x)} ${n2(h.y)} ${n2(h.x)} ${n2(h.y)}" fill="none" stroke-width="${n2(1.2/k)}" stroke-dasharray="${n2(4/k)} ${n2(3/k)}"/>`+s}
  return nodesSvg(it,k,nodeList(it).length-1)+s}};
// Nodi: si sceglie un nodo e lo si sposta, si tirano le maniglie (con Alt una sola, e il nodo diventa d'angolo), un clic
// su un tratto aggiunge un nodo; dalla tastiera lo stesso con PgSu, PgGiù, frecce, Spazio, Ins e Canc.
const nd={drag:null};
function moveNode(it,j,dx,dy,label='Sposta il nodo'){const {n}=nodeList(it)[j],v=nodeVis(it,n);return editD(label,()=>setNodeVis(it,n,{x:v.x+dx,y:v.y+dy}),{merge:true})}
function nodeStep(it,j){Dw.node=j;renderOverlay();renderProps();announce(nodeLabel(it,j))}
function nodeToggle(){const it=nodePath();if(!it)return needPath();const j=curNode(it),{s,i,n}=nodeList(it)[j],to=!n.s;editD(to?'Nodo curvo':'Nodo d’angolo',()=>{to?smoothNode(s,i):cornerNode(n);normPath(it)},{props:true});announce(nodeLabel(it,j))}
function nodeAdd(){const it=nodePath();if(!it)return needPath();const j=curNode(it),{s,i}=nodeList(it)[j],last=!s.closed&&i===s.nodes.length-1,a=last?s.nodes[i-1]:s.nodes[i],b=last?s.nodes[i]:s.nodes[(i+1)%s.nodes.length];if(!a||!b){toast('Un nodo solo: aggiungi gli altri con la Penna');return}
 editD('Aggiungi un nodo',()=>{s.nodes.splice(last?i:i+1,0,splitSeg(a,b,.5));normPath(it)},{props:true});Dw.node=last?j:j+1;renderOverlay();renderProps();announce('Aggiunto a metà del tratto: '+nodeLabel(it,Dw.node))}
function insertAt(it,k,pt){const L=nodeList(it),{s,i}=L[k],a=s.nodes[i],b=s.nodes[(i+1)%s.nodes.length],P=unrot(it,pt);let best=.5,bd=Infinity;for(let t=.02;t<1;t+=.02){const q=segPt(a,b,t),d=Math.hypot(it.x+q.x-P.x,it.y+q.y-P.y);if(d<bd){bd=d;best=t}}
 editD('Aggiungi un nodo',()=>{s.nodes.splice(i+1,0,splitSeg(a,b,best));normPath(it)},{props:true});Dw.node=k+1;renderOverlay();renderProps();announce('Aggiunto: '+nodeLabel(it,k+1))}
function deleteNode(){const it=nodePath();if(!it)return needPath();const L=nodeList(it),j=curNode(it),{s,i}=L[j];if(L.length<=2){toast('Un tracciato ha almeno due nodi: per toglierlo tutto usa Elimina con lo strumento Selezione');return}
 editD('Togli il nodo',()=>{s.nodes.splice(i,1);if(s.nodes.length<2&&it.subs.length>1)it.subs.splice(it.subs.indexOf(s),1);if(s.nodes.length<3)s.closed=s.closed&&s.nodes.some(n=>n.s);normPath(it)},{props:true});Dw.node=Math.max(0,j-1);renderOverlay();announce(`Nodo ${j+1} tolto. Scelto: ${nodeLabel(it,Dw.node)}`)}
function pathClose(){const it=nodePath();if(!it)return needPath();const {s}=nodeList(it)[curNode(it)];if(!s.closed&&s.nodes.length<2){toast('Servono almeno due nodi');return}editD(s.closed?'Apri il tracciato':'Chiudi il tracciato',()=>{s.closed=!s.closed;normPath(it)},{props:true});announce(`«${it.name}» ${s.closed?'chiuso: l’ultimo nodo si collega al primo':'aperto: tra l’ultimo e il primo nodo non c’è più il tratto'}`)}
function readPath(){const it=nodePath();if(!it)return needPath();toast(describePath(it))}
function needPath(){const it=selItem();toast(it?`«${it.name}» non è un tracciato: i nodi si modificano nei tracciati, disegnati con la Penna o convertiti`:'Scegli prima un tracciato');return null}
TOOLS.nodes={sel:'box',
 reset(){nd.drag=null},
 down(e,pt){const it=nodePath(),nn=e.target.closest?.('[data-n]'),hh=e.target.closest?.('[data-hn]'),sg=e.target.closest?.('[data-seg]');
  if(it&&hh){const [j,w]=hh.dataset.hn.split(':');Dw.node=+j;nd.drag={mode:'h',j:+j,w,pt0:pt};return true}
  if(it&&nn){const j=+nn.dataset.n;if(j!==Dw.node)nodeStep(it,j);nd.drag={mode:'n',j,pt0:pt,v:nodeVis(it,nodeList(it)[j].n)};return true}
  if(it&&sg){insertAt(it,+sg.dataset.seg,pt);return false}
  const t=e.target.closest?.('[data-id]'),o=t&&itemOf(t.dataset.id);if(!o){if(Dw.sel)selectItem(null,{say:false});return false}
  if(o.id!==Dw.sel||selIds().length>1){selectItem(o.id,{say:false});if(o.kind==='path'){curNode(o);announce(`${describeItem(o)}. ${nodeLabel(o,0)}`)}else needPath()}return false},
 move(e,pt){const d=nd.drag,it=nodePath();if(!d||!it)return;const dx=pt.x-d.pt0.x,dy=pt.y-d.pt0.y;if(!d.moved&&Math.hypot(dx,dy)*sheetScale()<3)return;d.moved=true;const {n}=nodeList(it)[d.j];
  if(d.mode==='n')setNodeVis(it,n,{x:d.v.x+dx,y:d.v.y+dy});
  else{const P=unrot(it,pt),w=d.w,o=w==='i'?'o':'i',hx=P.x-it.x-n.x,hy=P.y-it.y-n.y;n[w+'x']=n2(hx);n[w+'y']=n2(hy);if(e.altKey)n.s=0;else if(n.s){const l=Math.hypot(n[o+'x'],n[o+'y'])||Math.hypot(hx,hy),L=Math.hypot(hx,hy)||1;n[o+'x']=n2(-hx/L*l);n[o+'y']=n2(-hy/L*l)}normPath(it)}
  renderSheet();syncProps()},
 up(){const d=nd.drag,it=nodePath();nd.drag=null;if(d?.moved&&it&&settleD(d.mode==='n'?'Sposta il nodo':'Sposta la maniglia',{props:true}))announce(nodeLabel(it,d.j));renderOverlay()},
 key(e){const it=nodePath(),A={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(e.key==='Escape'){e.preventDefault();setTool('select');return true}if(!it)return false;const L=nodeList(it).length,j=curNode(it);
  if(A&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();const st=e.shiftKey?10:1;if(moveNode(it,j,A[0]*st,A[1]*st)){const v=nodeVis(it,nodeList(it)[j].n);announce(`x ${fmtInt(v.x)}, y ${fmtInt(v.y)}`)}return true}
  const to={PageDown:(j+1)%L,PageUp:(j-1+L)%L,Home:0,End:L-1}[e.key];if(to!=null&&!e.shiftKey){e.preventDefault();nodeStep(it,to);return true}
  if(e.key===' '){e.preventDefault();nodeToggle();return true}if(e.key==='Insert'){e.preventDefault();nodeAdd();return true}
  if(e.key==='Enter'){e.preventDefault();$('pr-nodes')?.focus();return true}return false},
 overlay(k){const it=nodePath();return it?nodesSvg(it,k,curNode(it),{segsHit:true}):''}};
sheetWrap.addEventListener('dblclick',e=>{const t=e.target.closest?.('[data-id]'),it=t&&itemOf(t.dataset.id);if(Dw.tool==='nodes'&&e.target.closest?.('[data-n]'))nodeToggle();else if(Dw.tool==='select'&&it?.kind==='path'&&!it.lock)setTool('nodes');else if(Dw.tool==='select'&&it?.kind==='text')$('pr-text')?.focus()});
// Proprietà di un tracciato: l'elenco dei nodi (frecce per scegliere, Ctrl+frecce per spostare), i campi del nodo scelto
// e la descrizione a parole.
function pathProps(it){const j=curNode(it),L=nodeList(it),{s,n}=L[j]||{},v=n&&nodeVis(it,n);
 let h=colorFld('fill','Riempimento',it.fill,'Nessun riempimento')+colorFld('stroke','Contorno',it.stroke)+fld('sw','Spessore del contorno (px)',it.sw)+`<h3 id="pr-nodes-h">Nodi</h3><p class="hint" id="pr-pathsay">Tracciato ${esc(pathSummary(it))}.</p>`;
 h+=`<div class="lb node-list" id="pr-nodes" role="listbox" tabindex="0" aria-labelledby="pr-nodes-h" aria-describedby="pr-nodes-k" aria-activedescendant="pr-node-${j}">${L.map((x,i)=>`<div role="option" id="pr-node-${i}" class="lb-item${i===j?' active':''}" data-node="${i}" aria-selected="${i===j}">${esc(nodeLabel(it,i))}</div>`).join('')}</div><small class="hint" id="pr-nodes-k">Frecce su e giù per scegliere un nodo, Ctrl+frecce per spostarlo (con Maiusc di dieci pixel), Spazio per farlo d’angolo o curvo, Ins per aggiungerne uno dopo, Canc per toglierlo.</small>`;
 if(!n)return h;h+=`<div class="row2"><div>${fld('nx','X del nodo',n2(v.x))}</div><div>${fld('ny','Y del nodo',n2(v.y))}</div></div>`+selFld('ntype','Tipo di nodo',n.s?'1':'0',[['0','D’angolo'],['1','Curvo']]);
 if(n.s||n.ix||n.iy||n.ox||n.oy)h+=`<div class="row2"><div>${fld('nix','Maniglia d’entrata, x',n.ix)}</div><div>${fld('niy','Maniglia d’entrata, y',n.iy)}</div><div>${fld('nox','Maniglia d’uscita, x',n.ox)}</div><div>${fld('noy','Maniglia d’uscita, y',n.oy)}</div></div>`;
 return h+`<label class="check"><input type="checkbox" data-prop="nclosed"${s.closed?' checked':''}> Tracciato chiuso</label><div class="btns"><button type="button" class="btn sm" id="pm-readPath" data-action="readPath">${ICON('speak')}Descrivi il tracciato</button></div>`}
function applyNodeProp(it,key,v,need){const L=nodeList(it),j=curNode(it),{s,i,n}=L[j];
 if(key==='nx'||key==='ny'){const P=nodeVis(it,n);P[key[1]]=need(-1e5,1e5);setNodeVis(it,n,P);return}
 if(key==='ntype'){v==='1'?smoothNode(s,i):cornerNode(n)}else if(key==='nclosed'){if(v&&s.nodes.length<2)throw Error('Servono almeno due nodi');s.closed=!!v}
 else{n[key.slice(1)]=need(-1e5,1e5);if(n.s&&(key==='nix'||key==='niy'||key==='nox'||key==='noy')){const w=key[1],o=w==='i'?'o':'i',l=Math.hypot(n[o+'x'],n[o+'y']),L2=Math.hypot(n[w+'x'],n[w+'y'])||1;n[o+'x']=n2(-n[w+'x']/L2*l);n[o+'y']=n2(-n[w+'y']/L2*l)}}normPath(it)}
function syncNodes(it){const j=curNode(it),a=document.activeElement,v=nodeVis(it,nodeList(it)[j].n);for(const [k,val] of [['nx',n2(v.x)],['ny',n2(v.y)]]){const el=$('pr-'+k);if(el&&el!==a)el.value=val}const o=$('pr-node-'+j);if(o)o.textContent=nodeLabel(it,j);if($('pr-pathsay'))$('pr-pathsay').textContent=`Tracciato ${pathSummary(it)}.`}
$('propBody').addEventListener('keydown',e=>{if(e.target.id!=='pr-nodes')return;const it=nodePath()||(selItem()?.kind==='path'?selItem():null);if(!it)return;const L=nodeList(it).length,j=curNode(it),A={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
 if(A&&(e.ctrlKey||e.metaKey)){e.preventDefault();const st=e.shiftKey?10:1;if(moveNode(it,j,A[0]*st,A[1]*st)){const v=nodeVis(it,nodeList(it)[j].n);announce(`x ${fmtInt(v.x)}, y ${fmtInt(v.y)}`)}return}
 const to={ArrowDown:Math.min(L-1,j+1),ArrowUp:Math.max(0,j-1),Home:0,End:L-1}[e.key];if(to!=null){e.preventDefault();nodeStep(it,to);return}
 if(e.key===' '){e.preventDefault();nodeToggle();return}if(e.key==='Insert'){e.preventDefault();nodeAdd();return}if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteNode();return}if(e.key==='Enter'){e.preventDefault();$('pr-nx')?.focus()}});
$('propBody').addEventListener('click',e=>{const o=e.target.closest('[data-node]'),it=selItem();if(!o||it?.kind!=='path')return;Dw.node=+o.dataset.node;renderOverlay();renderProps();$('pr-nodes')?.focus()});
STATIC_KEYS.d.push(['Penna',[['Muovi il cursore di dieci pixel (con Maiusc di uno)','← → ↑ ↓'],['Muovi il cursore in diagonale','Home / Fine / PgSu / PgGiù'],['Nodo d’angolo dove c’è il cursore','Spazio'],['Nodo curvo','Maiusc+Spazio'],['Chiudi il tracciato','Maiusc+Invio'],['Finisci il tracciato aperto','Invio o Esc']]],
 ['Nodi',[['Nodo precedente o successivo','PgSu / PgGiù'],['Primo o ultimo nodo','Home / Fine'],['Sposta il nodo di un pixel (con Maiusc di dieci)','← → ↑ ↓'],['Nodo d’angolo o curvo','Spazio'],['Aggiungi un nodo dopo','Ins'],['Togli il nodo','Canc'],['Elenco dei nodi nelle proprietà','Invio'],['Nell’elenco: sposta il nodo','Ctrl+← → ↑ ↓'],['Una maniglia sola, con il puntatore','Alt mentre trascini']]]);
renderToolButtons();sheetWrap.dataset.tool='select';$('sheetHint').textContent=TOOL_INFO.select[2];
