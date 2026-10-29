// Disegno a parole, per chi non vede il foglio: i colori con il loro nome, i dintorni dell'oggetto scelto (Alt+Maiusc+R)
// e le relazioni che cambiano mentre lo si sposta, la composizione del foglio (Alt+Maiusc+D) e l'ascolto della forma.
// Le sovrapposizioni si misurano sulle forme vere, con una griglia di punti: tracciati e forme anche ruotati, testi e
// immagini come riquadri ruotati, linee e tracciati aperti come punti lungo il tratto.
const cName=hex=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return 'trasparente';const v=parseInt(m[1],16);return colorName(v>>16,v>>8&255,v&255)};
const pxSay=v=>fmtNum(v,v%1?1:0);
// Il colore di un oggetto: «blu scuro con il contorno nero di 2 pixel», «colore bianco» per un testo, «nera, spessa 4
// pixel» per una linea. Le sfumature le dice styleSay.
function colorSay(it){if(it.kind==='image')return '';const grad=it.grad&&it.fill!=='none';if(it.kind==='text')return grad?'':`, colore ${cName(it.fill)}`;
 if(drawIsOpen(it))return it.sw>0&&it.stroke!=='none'?`, ${cName(it.stroke)}, spessa ${pxSay(it.sw)} pixel`:', senza contorno';
 const stroke=it.sw>0&&it.stroke!=='none'?` con il contorno ${cName(it.stroke)} di ${pxSay(it.sw)} pixel`:'';return grad?(stroke?','+stroke:''):`, ${it.fill==='none'?'senza riempimento':cName(it.fill)}${stroke}`}
// Forma di un oggetto per le relazioni, in coordinate del foglio: b è il riquadro con la rotazione.
function relShape(it){const b=box(it);let polys=hasArea(it)&&!drawIsOpen(it)?itemPolys(it):[];
 if(!polys.length&&(it.kind==='text'||it.kind==='image'))polys=[[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>{const p=rotPt(it,x,y);return [p.x,p.y]})];
 return {it,b:rotBox(it),inside:polys.length?boolInside(it,polys):null,pts:polys.length?null:drawSheetSubs(it,true).flatMap(s=>flatten({x:0,y:0,subs:[s]},4)[0]||[])}}
const unionBox=bs=>{const x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));return {x,y,w:Math.max(...bs.map(b=>b.x+b.w))-x,h:Math.max(...bs.map(b=>b.y+b.h))-y}};
// Punti che stanno dentro l'insieme delle forme (una griglia sul riquadro), o i punti dei tratti se sono tutte linee.
function relSamples(S,N=28){const ar=S.filter(s=>s.inside);if(!ar.length)return S.flatMap(s=>s.pts||[]);const B=unionBox(ar.map(s=>s.b)),out=[];
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=B.x+(i+.5)/N*B.w,y=B.y+(j+.5)/N*B.h;if(ar.some(s=>s.inside(x,y)))out.push([x,y])}return out}
const coverBy=(pts,O)=>O.inside&&pts.length?pts.filter(([x,y])=>O.inside(x,y)).length/pts.length:0;
const boxGap=(a,b)=>Math.max(b.x-(a.x+a.w),a.x-(b.x+b.w),b.y-(a.y+a.h),a.y-(b.y+b.h));
const pctWord=v=>v>=.98?'tutto':v>=.45&&v<=.55?'metà':`il ${fmtPct(v)}`;
// Relazioni della scelta con gli altri oggetti visibili: chi copre chi (per quanto), chi la contiene, chi la tocca.
// above: l'altro sta sopra la scelta nei livelli.
function relations(items){const ids=new Set(items.map(x=>x.id)),top=Math.max(...items.map(x=>Dw.p.items.indexOf(x))),S=items.filter(x=>!x.hidden).map(relShape),sp=relSamples(S),B=unionBox(S.map(s=>s.b)),out=[];
 for(const o of Dw.p.items){if(ids.has(o.id)||o.hidden||isClipShape(o))continue;const O=relShape(o),gap=boxGap(B,O.b);if(gap>.5)continue;const above=Dw.p.items.indexOf(o)>top;
  const sIn=coverBy(sp,O),oIn=S.some(s=>s.inside)?coverBy(relSamples([O]),{inside:(x,y)=>S.some(s=>s.inside?.(x,y))}):0;
  if(sIn<.02&&oIn<.02){if(gap>-.5)out.push({o,k:'touch'});continue}
  out.push({o,k:above?'under':'over',sIn,oIn,inside:sIn>=.98})}
 return out}
function relPhrase(r){const n=`«${r.o.name}»`;if(r.k==='touch')return `tocca ${n}`;if(r.k==='under')return r.sIn>=.98?`è coperto del tutto da ${n}: non si vede`:`è coperto per ${pctWord(r.sIn)} da ${n}`;
 const c=pctWord(r.oIn);return r.inside?`sta tutto dentro ${n} e ne copre ${c}`:c==='tutto'?`copre tutto ${n}`:`copre ${c} di ${n}`}
// Fuori dal foglio: di quanto esce e da che parte, o se è tutto fuori.
function outSay(b){const p=Dw.p,o=[[-b.x,'a sinistra'],[b.x+b.w-p.w,'a destra'],[-b.y,'in alto'],[b.y+b.h-p.h,'in basso']].filter(([v])=>v>.5);if(!o.length)return '';
 if(b.x>=p.w||b.x+b.w<=0||b.y>=p.h||b.y+b.h<=0)return `è tutto fuori dal foglio, ${o.map(x=>x[1]).join(' e ')}`;return `esce dal foglio ${o.map(([v,s])=>`${s} di ${fmtInt(v)} pixel`).join(' e ')}`}
// I vicini nelle quattro direzioni (tra gli oggetti che stanno nella stessa fascia), con lo spazio che c'è in mezzo.
function nearSay(items){const p=Dw.p,ids=new Set(items.map(x=>x.id)),B=unionBox(items.map(rotBox)),D={right:null,left:null,down:null,up:null};
 for(const o of p.items){if(ids.has(o.id)||o.hidden||isClipShape(o))continue;const b=rotBox(o),v=b.y<B.y+B.h&&B.y<b.y+b.h,h=b.x<B.x+B.w&&B.x<b.x+b.w,put=(k,d)=>{if(d>=-.5&&(!D[k]||d<D[k].d))D[k]={o,d:Math.max(0,d)}};
  if(v){put('right',b.x-(B.x+B.w));put('left',B.x-(b.x+b.w))}if(h){put('down',b.y-(B.y+B.h));put('up',B.y-(b.y+b.h))}}
 const edge={right:p.w-(B.x+B.w),left:B.x,down:p.h-(B.y+B.h),up:B.y},word={right:'a destra',left:'a sinistra',down:'sotto',up:'sopra'};
 return Object.keys(D).map(k=>D[k]?`${word[k]}, ${D[k].d<.5?'attaccato':`a ${fmtInt(D[k].d)} pixel`}, «${D[k].o.name}»`:edge[k]>.5?`${word[k]} niente fino al bordo, ${fmtInt(edge[k])} pixel`:`${word[k]} il bordo del foglio`).join('; ')}
// Tutti gli allineamenti della scelta con il foglio e con gli altri oggetti, non solo il primo.
function alignAll(items){const B=boxOf(items),L=snapLines(new Set(items.map(x=>x.id))),out=[];
 for(const [lines,edges] of [[L.X,[[B.x,'il bordo sinistro'],[B.x+B.w/2,'il centro in orizzontale'],[B.x+B.w,'il bordo destro']]],[L.Y,[[B.y,'il bordo superiore'],[B.y+B.h/2,'il centro in verticale'],[B.y+B.h,'il bordo inferiore']]]])
  for(const [e,elab] of edges){const hits=lines.filter(([v])=>Math.abs(v-e)<.5).map(x=>'al '+x[1]);if(hits.length)out.push(`${elab} è allineato ${hits.length>1?hits.slice(0,-1).join(', ')+' e '+hits.at(-1):hits[0]}`)}
 return out.join('; ')}
// Alt+Maiusc+R: dove sta la scelta nel foglio, i vicini, le sovrapposizioni e gli allineamenti.
function readAround(){const many=needSel().filter(x=>!x.hidden);if(!many.length)return;const p=Dw.p,B=unionBox(many.map(rotBox)),who=many.length>1?`I ${many.length} oggetti scelti`:`«${many[0].name}»`;
 const near=[[B.x,'dal bordo sinistro'],[p.w-B.x-B.w,'dal bordo destro'],[B.y,'dal bordo superiore'],[p.h-B.y-B.h,'dal bordo inferiore']].filter(([v])=>v>=0).sort((a,b)=>a[0]-b[0]).slice(0,2);
 const out=outSay(B),rel=relations(many).sort((a,b)=>(b.k!=='touch')-(a.k!=='touch')),al=alignAll(many);
 announce(`${who}: ${placeName((B.x+B.w/2)/p.w,(B.y+B.h/2)/p.h)} nel foglio${near.length?', '+near.map(([v,s])=>`a ${fmtInt(v)} pixel ${s}`).join(' e '):''}${out?'; '+out:''}. ${nearSay(many)[0].toUpperCase()+nearSay(many).slice(1)}. ${rel.length?rel.map(relPhrase).join('; ').replace(/^./,c=>c.toUpperCase())+'.':'Non tocca e non copre altri oggetti.'}${al?' '+al[0].toUpperCase()+al.slice(1)+'.':''}`)}
// Spostando la scelta con le frecce si dice solo quello che cambia: copre, è coperto, tocca, esce dal foglio. Il confronto
// è con lo stato all'inizio della serie di tasti (Dw.relBurst, in moveKeys): con le frecce tenute premute ogni annuncio
// sostituisce il precedente, e l'ultimo dice il cambiamento netto.
function relKeys(items){const m=new Map();for(const r of relations(items))m.set(r.k+':'+r.o.id,r);const o=outSay(unionBox(items.filter(x=>!x.hidden).map(rotBox)));if(o)m.set('out',{say:o});return m}
function relChange(items,before){const after=relKeys(items),out=[];
 for(const [k,r] of after)if(!before.has(k)&&k!=='out')out.push(r.k==='over'?`ora copre «${r.o.name}»`:r.k==='under'?`ora è sotto «${r.o.name}»`:`ora tocca «${r.o.name}»`);
 for(const [k,r] of before)if(!after.has(k)&&r.k!=='touch'&&k!=='out')out.push(r.k==='over'?`non copre più «${r.o.name}»`:`non è più sotto «${r.o.name}»`);
 if(after.has('out')&&after.get('out').say!==before.get('out')?.say&&!before.has('out'))out.push(after.get('out').say);else if(before.has('out')&&!after.has('out'))out.push('di nuovo tutto nel foglio');
 return out.slice(0,3).join('; ')}
// Alt+Maiusc+D: la composizione in breve; premuto di nuovo entro tre secondi apre la finestra con tutte le parti.
let compoAt=0;
function compoParts(){const p=Dw.p,vis=p.items.filter(x=>!x.hidden&&!isClipShape(x)),inSheet=vis.filter(x=>!outSay(rotBox(x)).startsWith('è tutto')),out={};
 out.sheet=`${(SHEETS.find(s=>s[2]===p.w&&s[3]===p.h)||[0,'Formato personalizzato'])[1].split(',')[0]}, ${fmtInt(p.w)} per ${fmtInt(p.h)} pixel, sfondo ${p.bg==='none'?'trasparente':cName(p.bg)}; ${vis.length===1?'un oggetto visibile':vis.length+' oggetti visibili'}${p.items.length>vis.length?`, ${p.items.length-vis.length} nascosti o usati come ritaglio`:''}${vis.length>inSheet.length?`, ${vis.length-inSheet.length} tutti fuori dal foglio`:''}.`;
 if(!inSheet.length)return out;
 // Zone in terzi: gli oggetti per il loro centro; quelli grandi occupano anche le zone vicine.
 const zone=(x,y)=>Math.min(2,Math.max(0,Math.floor(y*3/p.h)))*3+Math.min(2,Math.max(0,Math.floor(x*3/p.w))),Z=ZONE_NAME.map(()=>[]);
 for(const it of inSheet){const b=rotBox(it);Z[zone(b.x+b.w/2,b.y+b.h/2)].push(it.name)}
 out.zones=ZONE_NAME.map((n,i)=>Z[i].length?`${n[0].toUpperCase()+n.slice(1)}: ${Z[i].map(x=>'«'+x+'»').join(', ')}`:'').filter(Boolean);out.empty=ZONE_NAME.filter((n,i)=>!Z[i].length);
 // Margini: lo spazio libero intorno al contenuto.
 const C=unionBox(inSheet.map(rotBox)),m=[Math.max(0,C.x),Math.max(0,p.w-C.x-C.w),Math.max(0,C.y),Math.max(0,p.h-C.y-C.h)],same=(a,b)=>Math.abs(a-b)<=Math.max(2,.02*Math.max(a,b));
 out.margins=`${fmtInt(m[0])} a sinistra e ${fmtInt(m[1])} a destra${same(m[0],m[1])?', uguali':''}; ${fmtInt(m[2])} sopra e ${fmtInt(m[3])} sotto${same(m[2],m[3])?', uguali':''}${!same(m[2],m[3])&&Math.abs(m[2]-m[3])>p.h*.1?`: il contenuto sta ${m[2]<m[3]?'in alto':'in basso'}`:''}${!same(m[0],m[1])&&Math.abs(m[0]-m[1])>p.w*.1?`${!same(m[2],m[3])&&Math.abs(m[2]-m[3])>p.h*.1?' e':': il contenuto sta'} ${m[0]<m[1]?'a sinistra':'a destra'}`:''}.`;
 // Equilibrio: il baricentro delle aree visibili nel foglio.
 let a=0,sx=0,sy=0;for(const it of inSheet){const b=rotBox(it),x0=clamp(b.x,0,p.w),x1=clamp(b.x+b.w,0,p.w),y0=clamp(b.y,0,p.h),y1=clamp(b.y+b.h,0,p.h),w=Math.max(1,(x1-x0)*(y1-y0));a+=w;sx+=w*(x0+x1)/2;sy+=w*(y0+y1)/2}
 const gx=sx/a/p.w-.5,gy=sy/a/p.h-.5,side=[Math.abs(gy)>.08?(gy<0?'in alto':'in basso'):'',Math.abs(gx)>.08?(gx<0?'a sinistra':'a destra'):''].filter(Boolean);out.balance=side.length?`Il peso è spostato ${side.join(' e ')}.`:'Il peso è al centro: il foglio è in equilibrio.';
 // Allineamenti: gruppi di almeno tre oggetti con lo stesso bordo o lo stesso centro, e la spaziatura di quelli in colonna.
 out.aligns=[];for(const [k,f,lab] of [['x',b=>b.x,'allineati a sinistra'],['cx',b=>b.x+b.w/2,'in colonna al centro'],['r',b=>b.x+b.w,'allineati a destra'],['y',b=>b.y,'allineati in alto'],['cy',b=>b.y+b.h/2,'in riga al centro']]){
  const used=new Set();for(const it of inSheet){if(used.has(it.id))continue;const v=f(rotBox(it)),g=inSheet.filter(o=>Math.abs(f(rotBox(o))-v)<1);if(g.length<(k==='x'||k==='r'||k==='y'?3:2))continue;g.forEach(o=>used.add(o.id));
   const col=k==='x'||k==='cx'||k==='r',sorted=[...g].sort((a,b)=>col?rotBox(a).y-rotBox(b).y:rotBox(a).x-rotBox(b).x),gaps=sorted.slice(1).map((o,i)=>{const a=rotBox(sorted[i]),b=rotBox(o);return col?b.y-(a.y+a.h):b.x-(a.x+a.w)}),eq=gaps.length>1&&gaps.every(d=>Math.abs(d-gaps[0])<=1)&&gaps[0]>0;
   out.aligns.push(`${lab[0].toUpperCase()+lab.slice(1)}: ${sorted.map(o=>'«'+o.name+'»').join(', ')}${eq?`, spaziati di ${fmtInt(gaps[0])} pixel`:''}`)}}
 // Sovrapposizioni: chi copre chi, per quanto, tra le coppie di oggetti visibili.
 out.overlaps=[];for(let i=0;i<inSheet.length;i++)for(let j=i+1;j<inSheet.length;j++){const lo=inSheet[i],hi=inSheet[j];if(boxGap(rotBox(lo),rotBox(hi))>0)continue;const L=relShape(lo),H=relShape(hi),c=coverBy(relSamples([L]),H);if(c>=.02)out.overlaps.push(`«${hi.name}» copre ${pctWord(c)==='tutto'?'tutto':pctWord(c)+' di'} «${lo.name}»`)}
 // Ordine di lettura dei testi: per righe dall'alto (testi che si sovrappongono in verticale stanno nella stessa riga), poi da sinistra.
 const T=inSheet.filter(x=>x.kind==='text'||x.alt).map(x=>({x,b:rotBox(x)})).sort((a,b)=>a.b.y-b.b.y),rows=[];for(const t of T){const r=rows.find(r=>r.some(o=>t.b.y<o.b.y+o.b.h*.6&&o.b.y<t.b.y+t.b.h*.6));if(r)r.push(t);else rows.push([t])}
 out.reading=rows.flatMap(r=>r.sort((a,b)=>a.b.x-b.b.x)).map(t=>`«${t.x.kind==='text'?t.x.text.replace(/\s+/g,' ').trim():altOf(t.x)}»`);return out}
function readCompo(){const p=Dw.p;if(!p.items.length){toast('Il foglio è vuoto');return}const c=compoParts();if(Date.now()-compoAt<3000){compoAt=0;compoWindow(c);return}compoAt=Date.now();
 announce(`${c.sheet} ${c.margins?'Margini: '+c.margins:''} ${c.balance||''} ${c.overlaps?.length?`${c.overlaps.length===1?'Una sovrapposizione':c.overlaps.length+' sovrapposizioni'}: ${c.overlaps.slice(0,2).join('; ')}${c.overlaps.length>2?' e altre':''}.`:'Nessuna sovrapposizione.'} Premi di nuovo Alt+Maiusc+D per la descrizione completa.`.replace(/\s+/g,' '))}
async function compoWindow(c){const sec=(t,body)=>body?`<h3>${esc(t)}</h3>${body}`:'',list=a=>a?.length?`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'';
 await modal('Composizione del foglio',`<p>${esc(c.sheet)}</p>${sec('Zone del foglio, per terzi',list(c.zones)+(c.empty?.length?`<p>Vuote: ${esc(c.empty.join(', '))}.</p>`:''))}${sec('Margini',c.margins?`<p>${esc(c.margins)}</p>`:'')}${sec('Equilibrio',c.balance?`<p>${esc(c.balance)}</p>`:'')}${sec('Allineamenti e spaziature',list(c.aligns)||(c.zones?'<p>Nessun gruppo di oggetti allineati.</p>':''))}${sec('Sovrapposizioni',list(c.overlaps)||(c.zones?'<p>Nessuna.</p>':''))}${sec('Ordine di lettura dei testi',c.reading?.length?`<ol>${c.reading.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:'')}`,[],'Chiudi',{noCancel:true,wide:true})}
// Ascolta la forma: il contorno dell'oggetto scelto in circa due secondi e mezzo, dal punto più in alto in senso orario;
// più acuto dove il contorno è più in alto, da sinistra a destra nello stereo, con un colpo breve sugli angoli.
function shapeOutline(it){const S=relShape(it);if(S.inside){const polys=hasArea(it)&&!drawIsOpen(it)?itemPolys(it):[[[S.b.x,S.b.y]]];const P=(polys.length?polys:[[]]).reduce((a,b)=>b.length>a.length?b:a,[]);if(P.length>2)return {pts:P,closed:true}}
 if(it.kind==='text'||it.kind==='image'){const b=box(it);return {pts:[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]].map(([x,y])=>{const q=rotPt(it,x,y);return [q.x,q.y]}),closed:true}}return {pts:S.pts||[],closed:false}}
function listenShape(){const it=needItem();if(!it)return;let {pts,closed}=shapeOutline(it);if(pts.length<2){toast('Questo oggetto non ha un contorno da ascoltare');return}
 if(closed){let a=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];a+=p[0]*q[1]-q[0]*p[1]}if(a<0)pts=[...pts].reverse();const k=pts.reduce((m,p,i)=>p[1]<pts[m][1]?i:m,0);pts=[...pts.slice(k),...pts.slice(0,k),pts[k]]}
 // Lungo il contorno, 48 punti a passi uguali; gli angoli sono i punti dove la direzione gira di più di 35 gradi.
 const len=[0];for(let i=1;i<pts.length;i++)len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));const tot=len.at(-1)||1,N=48,R=[];let j=0;
 for(let i=0;i<N;i++){const t=tot*i/(N-1);while(j<len.length-2&&len[j+1]<t)j++;const f=(t-len[j])/((len[j+1]-len[j])||1);R.push([pts[j][0]+(pts[j+1][0]-pts[j][0])*f,pts[j][1]+(pts[j+1][1]-pts[j][1])*f])}
 const B=unionBox([{x:Math.min(...R.map(p=>p[0])),y:Math.min(...R.map(p=>p[1])),w:1,h:1},{x:Math.max(...R.map(p=>p[0])),y:Math.max(...R.map(p=>p[1])),w:0,h:0}]),marks=new Set();
 for(let i=1;i<pts.length-1;i++){const a=Math.atan2(pts[i][1]-pts[i-1][1],pts[i][0]-pts[i-1][0]),b=Math.atan2(pts[i+1][1]-pts[i][1],pts[i+1][0]-pts[i][0]);let d=Math.abs(b-a);if(d>Math.PI)d=2*Math.PI-d;if(d>.6)marks.add(Math.round(len[i]/tot*(N-1)))}
 toneSeq([{vals:R.map(p=>B.h>1?1-(p[1]-B.y)/B.h:.5),pans:R.map(p=>B.w>1?-.8+1.6*(p[0]-B.x)/B.w:0),marks}],{dur:.045,gap:.008,say:`Ascolto di «${it.name}»: ${closed?'dal punto più in alto, in senso orario':'dall’inizio alla fine del tratto'}; il tono sale quando il contorno sale, un colpo su ogni angolo. Esc per fermare.`})}
sheetWrap.addEventListener('keydown',e=>{if(e.key==='Escape'&&toneHalt()){e.preventDefault();e.stopImmediatePropagation();announce('Ascolto interrotto')}},true);
const DRAW_DESCRIBE_ACTIONS={readAround,readCompo,listenShape};
