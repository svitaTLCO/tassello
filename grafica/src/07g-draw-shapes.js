// Forme: poligoni e stelle, frecce e fumetti, le estremità delle linee e dei tracciati aperti (freccia o punto) e
// «Converti in tracciato». Ogni forma ha i suoi nodi (SHAPE_SUBS), relativi al riquadro che riempie per intero: così
// sul foglio, nell'SVG e nella conversione la forma è sempre la stessa.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-polygon" viewBox="0 0 24 24"><path d="M12 3l8 5v8l-8 5-8-5V8z"/></symbol>
<symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z"/></symbol>
<symbol id="i-arrowR" viewBox="0 0 24 24"><path d="M3 9h10V5l8 7-8 7v-4H3z"/></symbol>
<symbol id="i-bubble" viewBox="0 0 24 24"><path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/></symbol>
<symbol id="i-arrowLine" viewBox="0 0 24 24"><path d="M4 20 18 6"/><path d="M11 6h7v7" /></symbol>
<symbol id="i-toPath" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="1" stroke-dasharray="3 2"/><rect x="2.5" y="2.5" width="3" height="3"/><rect x="18.5" y="2.5" width="3" height="3"/><rect x="2.5" y="18.5" width="3" height="3"/><rect x="18.5" y="18.5" width="3" height="3"/></symbol>`);
Object.assign(KIND_DEFAULTS,{poly:(p,s)=>({w:Math.round(s*.35),h:Math.round(s*.35),fill:'#7a3db8',sides:6,star:false,inner:50}),
 arrow:(p,s)=>({w:Math.round(s*.45),h:Math.round(s*.2),fill:'#b35500',head:100,shaft:50,double:false}),
 bubble:(p,s)=>({w:Math.round(s*.5),h:Math.round(s*.35),fill:'#ffffff',stroke:'#1b1b1b',sw:Math.max(2,Math.round(s/240)),radius:Math.round(s*.04),tail:30,tip:15,tl:22})});
const KAPPA=.5523;
const node=(x,y,ix=0,iy=0,ox=0,oy=0,s=0)=>({x:n2(x),y:n2(y),ix:n2(ix),iy:n2(iy),ox:n2(ox),oy:n2(oy),s});
// I punti di un poligono si allargano fino a riempire il riquadro w per h, come fa la forma quando la si ridimensiona.
function fitPts(pts,w,h){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys),sx=w/((Math.max(...xs)-x0)||1),sy=h/((Math.max(...ys)-y0)||1);return pts.map(([x,y])=>[(x-x0)*sx,(y-y0)*sy])}
const polySub=pts=>({closed:true,nodes:pts.map(([x,y])=>node(x,y))});
// Rettangolo con gli angoli arrotondati (archi con le maniglie di Bézier); extra sono i nodi da mettere sul lato di
// sotto, da destra a sinistra (la coda del fumetto).
function roundRect(w,h,r,extra=[]){r=Math.max(0,Math.min(r,w/2,h/2));const k=r*KAPPA;
 return {closed:true,nodes:r?[node(r,0,-k,0),node(w-r,0,0,0,k,0),node(w,r,0,-k),node(w,h-r,0,0,0,k),node(w-r,h,k,0),...extra,node(r,h,0,0,-k,0),node(0,h-r,0,k),node(0,r,0,0,0,-k)]:[node(0,0),node(w,0),node(w,h),...extra,node(0,h)]}}
const SHAPE_SUBS={
 rect:it=>[roundRect(it.w,it.h,it.radius||0)],
 ellipse:it=>{const a=it.w/2,b=it.h/2,ka=a*KAPPA,kb=b*KAPPA;return [{closed:true,nodes:[node(a,0,-ka,0,ka,0,1),node(it.w,b,0,-kb,0,kb,1),node(a,it.h,ka,0,-ka,0,1),node(0,b,0,kb,0,-kb,1)]}]},
 line:it=>{const b=box(it);return [{closed:false,nodes:[node(it.x-b.x,it.y-b.y),node(it.x+it.w-b.x,it.y+it.h-b.y)]}]},
 poly:it=>{const n=clamp(Math.round(it.sides||5),3,60),pts=[];for(let k=0;k<(it.star?2*n:n);k++){const a=-Math.PI/2+k*Math.PI*(it.star?1:2)/n,r=it.star&&k%2?(it.inner??50)/100:1;pts.push([Math.cos(a)*r,Math.sin(a)*r])}return [polySub(fitPts(pts,it.w,it.h))]},
 arrow:it=>{const w=it.w,h=it.h,hl=Math.min(w/(it.double?2:1),h*(it.head??100)/100),c=h/2,t=h*(it.shaft??50)/200;
  return [polySub(it.double?[[hl,c-t],[w-hl,c-t],[w-hl,0],[w,c],[w-hl,h],[w-hl,c+t],[hl,c+t],[hl,h],[0,c],[hl,0]]:[[0,c-t],[w-hl,c-t],[w-hl,0],[w,c],[w-hl,h],[w-hl,c+t],[0,c+t]])]},
 bubble:it=>{const w=it.w,h=it.h,bh=h*(1-(it.tl??22)/100),r=Math.min(it.radius||0,w/2,bh/2),bw=Math.min(w*.18,w-2*r),b0=clamp(w*(it.tail??30)/100-bw/2,r,w-r-bw);
  return [roundRect(w,bh,r,[node(b0+bw,bh),node(w*(it.tip??15)/100,h),node(b0,bh)])]}};
const shapeD=it=>pathD({x:it.x,y:it.y,subs:SHAPE_SUBS[it.kind](it)});
// Estremità di linee e tracciati aperti: la punta della freccia finisce sul punto e la linea si accorcia sotto la punta,
// così l'estremità tonda del tratto non sporge. Sono forme piene, del colore del tratto: si vedono uguali ovunque.
const ENDS=[['none','Nessuna'],['arrow','Freccia'],['dot','Punto']];
const hasEnd=v=>v&&v!=='none',endLen=it=>Math.max(8,it.sw*3.5);
function capSvg(kind,x,y,dx,dy,it){const l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,c=esc(it.stroke);if(kind==='dot')return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(Math.max(4,it.sw*1.6))}" fill="${c}"/>`;
 const L=endLen(it),W=L*.5,bx=x-ux*L,by=y-uy*L;return `<path d="M${n2(x)} ${n2(y)}L${n2(bx-uy*W)} ${n2(by+ux*W)}L${n2(bx+uy*W)} ${n2(by-ux*W)}Z" fill="${c}"/>`}
function lineEnds(it){let x1=it.x,y1=it.y,x2=it.x+it.w,y2=it.y+it.h;const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,cut=Math.min(endLen(it)*.6,l/2.5);let caps='';
 if(hasEnd(it.start)){caps+=capSvg(it.start,x1,y1,-dx,-dy,it);if(it.start==='arrow'){x1+=dx/l*cut;y1+=dy/l*cut}}
 if(hasEnd(it.end)){caps+=capSvg(it.end,x2,y2,dx,dy,it);if(it.end==='arrow'){x2-=dx/l*cut;y2-=dy/l*cut}}return {xy:`x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}"`,caps}}
// Nei tracciati vale la prima parte, se è aperta: la direzione è quella della maniglia vicina all'estremità.
function pathEnds(it){const s0=it.subs[0];if(!s0||s0.closed||s0.nodes.length<2||!hasEnd(it.start)&&!hasEnd(it.end))return null;const subs=structuredClone(it.subs),N=subs[0].nodes,P=n=>[it.x+n.x,it.y+n.y];let caps='';
 const dirAt=(b,a,w)=>{const o=w==='i'?'o':'i';return b[w+'x']||b[w+'y']?[-b[w+'x'],-b[w+'y']]:a[o+'x']||a[o+'y']?[b.x-a.x-a[o+'x'],b.y-a.y-a[o+'y']]:[b.x-a.x,b.y-a.y]};
 const trim=(a,b,atEnd)=>{const cut=endLen(it)*.6,B=atEnd?b:a;let t=atEnd?1:0;for(let k=1;k<50;k++){const tt=atEnd?1-k/50:k/50,q=segPt(a,b,tt);t=tt;if(Math.hypot(q.x-B.x,q.y-B.y)>=cut)break}return splitSeg(a,b,t)};
 if(hasEnd(it.end)){const b=N.at(-1),a=N.at(-2),[dx,dy]=dirAt(b,a,'i');caps+=capSvg(it.end,...P(b),dx,dy,it);if(it.end==='arrow'){const f=trim(a,b,true);f.ox=f.oy=0;N.splice(-1,1,f)}}
 if(hasEnd(it.start)){const b=N[0],a=N[1],[dx,dy]=dirAt(b,a,'o');caps+=capSvg(it.start,...P(b),dx,dy,it);if(it.start==='arrow'){const f=trim(b,a,false);f.ix=f.iy=0;N.splice(0,1,f)}}
 return {d:pathD({x:it.x,y:it.y,subs}),caps}}
const endsFld=it=>`<div class="row2"><div>${selFld('start','Inizio',it.start||'none',ENDS)}</div><div>${selFld('end','Fine',it.end||'none',ENDS)}</div></div>`;
const pct=v=>fmtInt(v)+'%';
const SHAPE_PROPS={poly:it=>fld('sides',it.star?'Punte':'Lati',it.sides)+`<label class="check"><input type="checkbox" data-prop="star"${it.star?' checked':''}> Stella</label>`+(it.star?rangeFld('inner','Raggio interno',5,95,1,it.inner??50,pct):''),
 arrow:it=>rangeFld('head','Lunghezza della punta',10,300,5,it.head??100,pct)+rangeFld('shaft','Spessore del corpo',5,100,1,it.shaft??50,pct)+`<label class="check"><input type="checkbox" data-prop="double"${it.double?' checked':''}> Due punte</label>`,
 bubble:it=>rangeFld('tail','Posizione della coda',0,100,1,it.tail??30,pct)+rangeFld('tip','Punta della coda',0,100,1,it.tip??15,pct)+rangeFld('tl','Lunghezza della coda',5,60,1,it.tl??22,pct)+fld('radius','Angoli arrotondati (px)',it.radius),
 line:endsFld,path:it=>it.subs[0]&&!it.subs[0].closed?endsFld(it):''};
Object.assign(KIND_SAY,{poly:it=>`, ${it.sides} ${it.star?'punte':'lati'}`,arrow:it=>`, ${it.double?'a due punte, ':''}punta ${dirWord(Math.cos((it.rot||0)*Math.PI/180),Math.sin((it.rot||0)*Math.PI/180))}`,
 bubble:it=>`, con la coda in basso ${(it.tip??15)<34?'a sinistra':(it.tip??15)>66?'a destra':'al centro'}`,line:it=>endsSay(it)});
const endsSay=it=>{const e=[hasEnd(it.start)&&`${it.start==='arrow'?'una freccia':'un punto'} all’inizio`,hasEnd(it.end)&&`${it.end==='arrow'?'una freccia':'un punto'} alla fine`].filter(Boolean);return e.length?', con '+e.join(' e '):''};
// Converti in tracciato: le forme scelte diventano nodi modificabili, con lo stesso aspetto. I testi e le immagini restano.
function toPath(){const many=needSel();if(!many.length)return;const ok=many.filter(x=>SHAPE_SUBS[x.kind]&&!x.lock),rest=many.length-ok.length;
 if(!ok.length){toast(many.every(x=>x.kind==='path')?'Sono già tracciati: modificali con lo strumento Nodi':'I testi e le immagini non diventano tracciati; gli oggetti bloccati restano com’erano');return}
 editD(ok.length>1?`Converti ${ok.length} oggetti in tracciati`:`Converti ${ok[0].name} in tracciato`,()=>{for(const it of ok){const subs=SHAPE_SUBS[it.kind](it),b=box(it);if(it.kind==='line')Object.assign(it,{fill:'none',x:b.x,y:b.y,w:b.w,h:b.h});for(const k of ['sides','star','inner','head','shaft','double','tail','tip','tl'])delete it[k];it.kind='path';it.subs=subs;normPath(it)}},{props:true});
 announce(`${ok.length>1?ok.length+' oggetti convertiti in tracciati':`«${ok[0].name}» è ora un tracciato di ${nodeList(ok[0]).length} nodi`}: lo strumento Nodi li modifica.${rest?` ${rest===1?'Un oggetto è rimasto':rest+' oggetti sono rimasti'} com’era: i testi, le immagini e gli oggetti bloccati non si convertono.`:''}`)}
