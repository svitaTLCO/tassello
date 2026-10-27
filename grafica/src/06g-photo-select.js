// Strumenti sulla foto: selezioni, maschere, scontorno e ritocco si usano con il mouse o con un cursore mosso da tastiera.
// Ogni strumento ha un modo d'uso (kind): two (due punti: due angoli, oppure inizio e fine), lasso (tratto libero; da
// tastiera punto per punto), poly (un punto alla volta), paint (pennello) e click (un punto solo), e la funzione che
// riceve i punti, in coordinate dell'inquadratura da 0 a 1, con il modo scelto (new, add, sub, int).
const SEL_MODES=[['new','Nuova'],['add','Aggiungi'],['sub','Sottrai'],['int','Interseca']];
const TOOLS={
 rect:{label:'Selezione rettangolare',kind:'two',sel:1,keys:'Trascina da un angolo all’altro. Da tastiera: Invio sul primo angolo, poi sul secondo.',two:(a,b,m)=>commitSel(rectOp(a,b),m,'Selezione rettangolare')},
 ellipse:{label:'Selezione ellittica',kind:'two',sel:1,keys:'Trascina da un angolo all’altro del riquadro dell’ellisse. Da tastiera: Invio su un angolo, poi su quello opposto.',two:(a,b,m)=>commitSel(ellipseOp(a,b),m,'Selezione ellittica')},
 lasso:{label:'Lazo',kind:'lasso',sel:1,keys:'Disegna il contorno tenendo premuto il pulsante. Da tastiera: Invio aggiunge un punto, Maiusc+Invio chiude il contorno, Backspace toglie l’ultimo punto.',done:(p,m)=>commitSel({t:'poly',p:p.map(uvUnits)},m,'Lazo')},
 poly:{label:'Lazo poligonale',kind:'poly',sel:1,keys:'Un clic per ogni angolo, doppio clic o clic sul primo punto per chiudere. Da tastiera: Invio aggiunge un punto, Maiusc+Invio chiude, Backspace toglie l’ultimo punto.',done:(p,m)=>commitSel({t:'poly',p:p.map(uvUnits)},m,'Lazo poligonale')},
 brush:{label:'Pennello di selezione',kind:'paint',sel:1,keys:'Dipingi la zona da scegliere. Da tastiera: Spazio abbassa o alza il pennello e con il pennello giù le frecce dipingono; Invio lascia un’impronta. Parentesi quadre cambiano la dimensione, con Maiusc la durezza.',done:(p,m)=>commitSel(brushOp(p),m,'Pennello di selezione')},
 wand:{label:'Bacchetta magica',kind:'click',sel:1,keys:'Clic su un colore: si scelgono i pixel simili. Da tastiera: Invio sceglie il colore sotto il cursore.',at:([u,v],m)=>{const [x,y]=uvUnits([u,v]);commitSel({t:'wand',x,y,tol:T.tol,c:T.contig},m,'Bacchetta magica')}},
 range:{label:'Intervallo di colore',kind:'click',sel:1,keys:'Clic su un colore: si scelgono in tutta la foto i colori vicini. Da tastiera: Invio sceglie il colore sotto il cursore.',at:(p,m)=>commitSel({t:'range',c:colorAt(p,true).map(Math.round),tol:T.range},m,'Intervallo di colore')}};
// Stato dello strumento: modo, opzioni (dimensione del pennello in unità della foto, durezza, tolleranze), cursore, punti in corso.
const T={tool:null,mode:'new',size:.03,hard:.5,tol:32,contig:true,range:40,u:.5,v:.5,pts:[],drag:false,down:false,kbd:false,pmode:'new',...(prefs.photoTool||{})};
const saveTool=()=>{prefs.photoTool={size:T.size,hard:T.hard,tol:T.tol,contig:T.contig,range:T.range};savePrefs()};
const antsCv=$('photoAnts'),overCv=$('photoOver');
let lastMc=null;
const U5=v=>Math.round(v*1e5)/1e5;
const uvUnits=([u,v])=>unitsAt(u,v).map(U5);
function rectOp(a,b){const [u0,v0]=a,[u1,v1]=b;return {t:'rect',p:[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(uvUnits)}}
function ellipseOp(a,b){const cu=(a[0]+b[0])/2,cv=(a[1]+b[1])/2,[cx,cy]=unitsAt(cu,cv),[ax,ay]=unitsAt(cu+Math.abs(b[0]-a[0])/2,cv),[bx,by]=unitsAt(cu,cv+Math.abs(b[1]-a[1])/2);
 return {t:'ellipse',cx:U5(cx),cy:U5(cy),rx:U5(Math.hypot(ax-cx,ay-cy)),ry:U5(Math.hypot(bx-cx,by-cy)),a:U5(Math.atan2(ay-cy,ax-cx))}}
const brushOp=p=>({t:'brush',p:p.map(uvUnits),d:U5(T.size),h:T.hard});
// La selezione è una maschera nella ricetta: si annulla con Ctrl+Z e torna con la bozza. Con il modo Nuova sostituisce
// quella che c'era; il pennello dopo il primo tratto continua ad aggiungere.
function commitSel(op,mode,label){op.mode=mode==='new'?'add':mode;if(!edit(label,r=>{r.sel={ops:mode==='new'||!r.sel?[op]:[...r.sel.ops,op]}}))return;if(TOOLS[T.tool]?.kind==='paint'&&T.mode==='new'){T.mode='add';renderToolOpts()}announce(selSummary())}
// La maschera della selezione alla misura dell'anteprima, e la sua descrizione breve o completa.
function selMask(){return I.bmp&&I.r.sel&&lastMc?maskOf(I.r.sel.ops,lastMc):null}
const shownPx=()=>I.compare||!outPx||outPx.width!==lastMc.w||outPx.height!==lastMc.h?lastMc.px:outPx;
function selSummary(){const m=selMask();return m?describeMask(m,lastMc.w,lastMc.h,null).replace(/: da .*$/,'.'):'Nessuna selezione: le operazioni valgono per tutta la foto.'}
function selDescribe(){const m=selMask();toast(m?describeMask(m,lastMc.w,lastMc.h,shownPx()):'Nessuna selezione: le operazioni valgono per tutta la foto.')}
// Colore sotto un punto: della foto originale (per scegliere) o di quella regolata che si vede (per descrivere).
function colorAt([u,v],orig=false){const px=orig?lastMc.px:shownPx(),w=px.width,h=px.height,X=Math.min(w-1,Math.floor(u*w)),Y=Math.min(h-1,Math.floor(v*h)),d=px.data;let r=0,g=0,b=0,n=0;
 for(let y=Math.max(0,Y-1);y<=Math.min(h-1,Y+1);y++)for(let x=Math.max(0,X-1);x<=Math.min(w-1,X+1);x++){const o=(y*w+x)*4;r+=d[o];g+=d[o+1];b+=d[o+2];n++}return [r/n,g/n,b/n]}
const posSay=([u,v])=>`${fmtPct(u)} da sinistra, ${fmtPct(v)} dall’alto`;
function sayCursor(){const p=[T.u,T.v],m=selMask(),i=m?Math.min(lastMc.h-1,Math.floor(p[1]*lastMc.h))*lastMc.w+Math.min(lastMc.w-1,Math.floor(p[0]*lastMc.w)):-1;
 announce(`${posSay(p)}: ${colorName(...colorAt(p))}${m?m[i]>=128?', nella selezione':', fuori dalla selezione':''}${T.down?', pennello giù':''}`)}
// Scelta dello strumento: la foto diventa un'area interattiva (le frecce muovono il cursore) finché lo strumento è attivo.
function setTool(id){if(!I.bmp){toast('Apri prima una foto');return}if(T.tool===id){endTool();return}T.tool=id;T.pts=[];T.drag=T.down=false;toolChanged();photoCv.focus();announce(`${TOOLS[id].label}. ${TOOLS[id].keys} Esc chiude lo strumento.`)}
function endTool(say=true){if(!T.tool)return;const t=TOOLS[T.tool];T.tool=null;T.pts=[];T.drag=T.down=false;toolChanged();if(say)announce(t.label+': chiuso')}
function toolChanged(){const t=T.tool&&TOOLS[T.tool];photoCv.setAttribute('role',t?'application':'img');if(t)photoCv.setAttribute('aria-roledescription','foto');else photoCv.removeAttribute('aria-roledescription');
 $('toolHint').textContent=t?`${t.label}. ${t.keys} Le frecce muovono il cursore (con Maiusc di più, con Ctrl di un pixel) e dicono il colore sotto il cursore. Esc annulla il punto in corso o chiude lo strumento.`:'';
 photoCv.setAttribute('aria-describedby',t?'toolHint':'photoHint');photoCv.classList.toggle('tooling',!!t);renderToolOpts();refreshToggles();drawOver()}
// Opzioni dello strumento sotto la foto: modo della selezione, dimensione e durezza del pennello, tolleranze.
const sizeToV=s=>Math.round(Math.log(s/.001)/Math.log(250)*100),vToSize=v=>.001*250**(v/100);
const TOOL_OPTS={size:{label:'Dimensione',min:0,max:100,get:()=>sizeToV(T.size),set:v=>{T.size=vToSize(v)},fmt:()=>fmtInt(T.size*Math.max(I.bmp?.width||0,I.bmp?.height||0))+' px'},
 hard:{label:'Durezza',min:0,max:100,get:()=>Math.round(T.hard*100),set:v=>{T.hard=v/100},fmt:()=>fmtPct(T.hard)},
 tol:{label:'Tolleranza',min:0,max:128,get:()=>T.tol,set:v=>{T.tol=v},fmt:()=>fmtInt(T.tol)},
 range:{label:'Tolleranza',min:5,max:150,get:()=>T.range,set:v=>{T.range=v},fmt:()=>fmtInt(T.range)}};
function toolOptsOf(id){const t=TOOLS[id];return t.opts||(t.kind==='paint'?['size','hard']:id==='wand'?['tol','contig']:id==='range'?['range']:[])}
function renderToolOpts(){const box=$('toolOpts'),t=T.tool&&TOOLS[T.tool];box.hidden=!t;if(!t){box.innerHTML='';return}
 const modes=t.modes||(t.sel?SEL_MODES:null);let h=`<b id="toolName">${esc(t.label)}</b>`;
 if(modes)h+=`<span class="seg" role="group" aria-label="Modo">${modes.map(([v,l])=>`<button type="button" data-tool-mode="${v}" aria-pressed="${v===T.mode}">${esc(l)}</button>`).join('')}</span>`;
 for(const o of toolOptsOf(T.tool)){if(o==='contig'){h+=`<label class="check"><input type="checkbox" data-tool-opt="contig"${T.contig?' checked':''}> Solo i pixel collegati</label>`;continue}const d=TOOL_OPTS[o],v=d.get();
  h+=`<span class="opt"><label for="to-${o}">${esc(d.label)}</label><input type="range" id="to-${o}" data-tool-opt="${o}" min="${d.min}" max="${d.max}" step="1" value="${v}" aria-valuetext="${esc(d.fmt())}"><output id="to-${o}-o" aria-hidden="true">${esc(d.fmt())}</output></span>`}
 box.innerHTML=h+`<span class="grow"></span><button type="button" class="btn sm" data-tool-end>${ICON('close')}Fine</button>`}
$('toolOpts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.toolMode){T.mode=b.dataset.toolMode;renderToolOpts();$('toolOpts').querySelector(`[data-tool-mode="${T.mode}"]`)?.focus();announce('Modo: '+b.textContent)}else if(b.hasAttribute('data-tool-end')){endTool();photoCv.focus()}});
$('toolOpts').addEventListener('input',e=>{const el=e.target,o=el.dataset.toolOpt;if(!o)return;if(o==='contig')T.contig=el.checked;else{const d=TOOL_OPTS[o];d.set(Number(el.value));el.setAttribute('aria-valuetext',d.fmt());$('to-'+o+'-o').textContent=d.fmt()}saveTool();drawOver()});
// Cambia dimensione o durezza del pennello da tastiera, sulla foto.
function brushKey(bigger,hard){if(hard)T.hard=clamp(Math.round(T.hard*10+(bigger?1:-1))/10,0,1);else T.size=clamp(T.size*(bigger?1.25:.8),.001,.25);saveTool();renderToolOpts();drawOver();announce(hard?'Durezza '+TOOL_OPTS.hard.fmt():'Dimensione '+TOOL_OPTS.size.fmt())}
// Fine di un'operazione con i punti raccolti.
function finishTwo(a,b,mode){const t=TOOLS[T.tool];T.pts=[];drawOver();const [fw,fh]=outSize(I.r,I.bmp.width,I.bmp.height);
 if(Math.abs(b[0]-a[0])*fw<2&&Math.abs(b[1]-a[1])*fh<2&&!t.point){if(t.sel&&mode==='new'&&I.r.sel){selNone();return}announce('Troppo piccolo: sposta il cursore prima del secondo punto');return}t.two(a,b,mode)}
function finishPoly(mode){const t=TOOLS[T.tool],p=T.pts;T.pts=[];drawOver();if(p.length<3){announce('Servono almeno tre punti');return}t.done(p,mode)}
function finishPaint(mode){const t=TOOLS[T.tool],p=T.pts;T.pts=[];T.down=false;drawOver();if(p.length)t.done(p,mode)}
function keyEnter(shift){const t=TOOLS[T.tool],p=[T.u,T.v],m=T.mode;
 if(t.kind==='click'){t.at(p,m);return}
 if(t.kind==='two'){if(!T.pts.length){T.pts=[p];drawOver();announce(`${t.first||'Primo punto'}: ${posSay(p)}. Sposta il cursore e premi Invio ${t.second||'sul secondo'}; Esc annulla.`)}else finishTwo(T.pts[0],p,m);return}
 if(t.kind==='poly'||t.kind==='lasso'){if(shift||(T.pts.length>=3&&Math.hypot(p[0]-T.pts[0][0],p[1]-T.pts[0][1])<.005)){finishPoly(m);return}T.pts.push(p);drawOver();announce(`Punto ${T.pts.length}: ${posSay(p)}${T.pts.length>=3?'. Maiusc+Invio chiude il contorno':''}`);return}
 if(t.kind==='paint'){if(T.down)penToggle();else{T.pts=[p];finishPaint(m)}}}
function penToggle(){if(!T.down){T.down=true;T.pts=[[T.u,T.v]];drawOver();announce('Pennello giù: le frecce dipingono, Spazio lo alza')}else finishPaint(T.mode)}
photoCv.addEventListener('keydown',e=>{const t=T.tool&&TOOLS[T.tool];if(!t||!I.bmp||overlayOpen())return;const k=e.key;
 if(k.startsWith('Arrow')&&!e.altKey){e.preventDefault();const [fw,fh]=outSize(I.r,I.bmp.width,I.bmp.height),sx=e.ctrlKey?1/fw:e.shiftKey?.1:.01,sy=e.ctrlKey?1/fh:e.shiftKey?.1:.01;
  T.u=clamp(T.u+(k==='ArrowRight'?sx:k==='ArrowLeft'?-sx:0),0,1);T.v=clamp(T.v+(k==='ArrowDown'?sy:k==='ArrowUp'?-sy:0),0,1);T.kbd=true;if(T.down)T.pts.push([T.u,T.v]);drawOver();sayCursor();return}
 if(k==='Enter'&&!e.ctrlKey){e.preventDefault();keyEnter(e.shiftKey);return}
 if(k===' '){e.preventDefault();if(t.kind==='paint')penToggle();else keyEnter(false);return}
 if(k==='Backspace'&&T.pts.length&&(t.kind==='poly'||t.kind==='lasso')){e.preventDefault();T.pts.pop();drawOver();announce(T.pts.length?`Tolto l’ultimo punto, ne restano ${T.pts.length}`:'Nessun punto');return}
 if(k==='Escape'){e.preventDefault();if(T.pts.length||T.down){T.pts=[];T.down=false;drawOver();announce('Annullato')}else endTool();return}
 if((k==='['||k===']'||k==='{'||k==='}')&&t.kind==='paint'){e.preventDefault();brushKey(k===']'||k==='}',e.shiftKey)}});
// Mouse e penna: Maiusc aggiunge, Alt sottrae, tutti e due intersecano.
const eventUV=e=>{const r=photoCv.getBoundingClientRect();return [clamp((e.clientX-r.left)/r.width,0,1),clamp((e.clientY-r.top)/r.height,0,1)]};
const dispDist=(a,b)=>{const r=photoCv.getBoundingClientRect();return Math.hypot((a[0]-b[0])*r.width,(a[1]-b[1])*r.height)};
photoCv.addEventListener('pointerdown',e=>{const t=T.tool&&TOOLS[T.tool];if(!t||e.button!==0)return;e.preventDefault();photoCv.focus({preventScroll:true});const p=eventUV(e),mode=e.shiftKey&&e.altKey?'int':e.shiftKey?'add':e.altKey?'sub':T.mode;[T.u,T.v]=p;T.kbd=false;T.pmode=mode;
 if(t.kind==='click'){t.at(p,mode);return}
 if(t.kind==='poly'){if(T.pts.length>=3&&dispDist(p,T.pts[0])<8)finishPoly(mode);else{T.pts.push(p);drawOver()}return}
 photoCv.setPointerCapture(e.pointerId);T.pts=[p];T.drag=true;drawOver()});
photoCv.addEventListener('pointermove',e=>{if(!T.tool||!I.bmp)return;const p=eventUV(e);[T.u,T.v]=p;T.kbd=false;if(T.drag){const t=TOOLS[T.tool];if(t.kind==='two')T.pts[1]=p;else if(dispDist(p,T.pts.at(-1))>=Math.max(2,t.kind==='paint'?brushDisp()*.2:0))T.pts.push(p)}drawOver()});
photoCv.addEventListener('pointerup',()=>{if(!T.drag)return;T.drag=false;const t=TOOLS[T.tool];if(!t)return;if(t.kind==='two')finishTwo(T.pts[0],T.pts[1]||T.pts[0],T.pmode);else if(t.kind==='lasso')finishPoly(T.pmode);else if(t.kind==='paint'){T.pts.push([T.u,T.v]);finishPaint(T.pmode)}});
photoCv.addEventListener('dblclick',()=>{if(T.tool&&TOOLS[T.tool].kind==='poly'&&T.pts.length>=3)finishPoly(T.pmode)});
photoCv.addEventListener('pointerleave',()=>{if(T.tool&&!T.drag)drawOver(false)});
// Il contorno della selezione e i segni degli strumenti stanno su due canvas sopra la foto, della stessa misura.
function placeOverlays(){for(const cv of [antsCv,overCv]){cv.style.left=photoCv.offsetLeft+'px';cv.style.top=photoCv.offsetTop+'px';cv.style.width=photoCv.style.width;cv.style.height=photoCv.style.height}overCv.hidden=photoCv.hidden;drawOver()}
// Contorno: pixel bianchi e neri a tratti che scorrono (formiche in marcia), visibili su ogni colore; con il contrasto
// elevato la linea è più spessa. Con «Mostra in rosso» la parte non scelta si copre di rosso.
const ants={m:null,key:'',edges:null,base:null,img:null,phase:0,timer:0,text:''};
function drawAnts(){const m=selMask(),show=!!m&&!photoCv.hidden;antsCv.hidden=!show;
 if(!show){ants.m=null;clearInterval(ants.timer);ants.timer=0;ants.text='';const el=$('selDesc');if(el)el.textContent=selSummary();return}
 const {w,h}=lastMc,key=`${!!prefs.quickMask},${!!prefs.contrast}`;if(antsCv.width!==w||antsCv.height!==h){antsCv.width=w;antsCv.height=h}
 if(ants.m!==m||ants.key!==key){const img=new ImageData(w,h),d=img.data;if(prefs.quickMask)for(let i=0,j=3;i<m.length;i++,j+=4){const a=(255-m[i])*.55;if(a>=1){d[j-3]=220;d[j-2]=20;d[j-1]=60;d[j]=a}}
  let e=edgesOf(m,w,h);if(prefs.contrast){const s=new Set(e);for(const i of e){if((i+1)%w)s.add(i+1);if(i+w<w*h)s.add(i+w)}e=Int32Array.from(s)}
  const base=new Uint8Array(e.length);for(let k=0;k<e.length;k++){const i=e[k];base[k]=(i%w+((i/w)|0))&7}
  Object.assign(ants,{m,key,edges:e,base,img,text:describeMask(m,w,h,null).replace(/: da .*$/,'.')});const el=$('selDesc');if(el)el.textContent=ants.text}
 paintAnts();if(!ants.timer&&!matchMedia('(prefers-reduced-motion: reduce)').matches)ants.timer=setInterval(()=>{if(document.hidden||antsCv.hidden||!ants.img)return;ants.phase=(ants.phase+1)&7;paintAnts()},180)}
function paintAnts(){const {edges:e,base,img,phase}=ants,d=img.data;for(let k=0;k<e.length;k++){const j=e[k]*4,v=((base[k]+8-phase)&7)<4?0:255;d[j]=d[j+1]=d[j+2]=v;d[j+3]=255}antsCv.getContext('2d').putImageData(img,0,0)}
// Segni degli strumenti: forma in corso, cursore della tastiera, cerchio del pennello. Linea bianca sotto, nera sopra.
const brushDisp=()=>{if(!I.bmp)return 0;const f=fullMatrix(),r=photoCv.getBoundingClientRect();return T.size/2*Math.hypot(f.U.a,f.U.b)*r.width/f.fw};
function drawOver(cursor=true){if(overCv.hidden)return;const r=photoCv.getBoundingClientRect(),dpr=devicePixelRatio||1,W=Math.max(1,Math.round(r.width*dpr)),H=Math.max(1,Math.round(r.height*dpr));if(overCv.width!==W||overCv.height!==H){overCv.width=W;overCv.height=H}
 const c=overCv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);if(!I.bmp)return;c.lineJoin='round';c.lineCap='round';
 const P=([u,v])=>[u*W,v*H],line=(draw,dash=true)=>{c.beginPath();draw();c.setLineDash([]);c.strokeStyle='#fff';c.lineWidth=3*dpr;c.stroke();c.setLineDash(dash?[5*dpr,4*dpr]:[]);c.strokeStyle='#000';c.lineWidth=1.4*dpr;c.stroke();c.setLineDash([])};
 const t=T.tool&&TOOLS[T.tool];
 for(const g of overGuides)g(c,P,line,W,H,dpr);
 if(!t)return;const pts=T.pts,cur=[T.u,T.v];
 if(t.kind==='two'&&pts.length){const a=P(pts[0]),b=P(pts[1]||(T.drag?pts[0]:cur));if(t.drawTwo)t.drawTwo(c,a,b,line,dpr);else if(T.tool==='ellipse')line(()=>c.ellipse((a[0]+b[0])/2,(a[1]+b[1])/2,Math.abs(b[0]-a[0])/2,Math.abs(b[1]-a[1])/2,0,0,Math.PI*2));else line(()=>c.rect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1])))}
 if((t.kind==='poly'||t.kind==='lasso')&&pts.length){line(()=>{pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...P(p)));if(!T.drag)c.lineTo(...P(cur))});for(const p of pts.slice(0,1)){const [x,y]=P(p);c.fillStyle='#fff';c.fillRect(x-3*dpr,y-3*dpr,6*dpr,6*dpr);c.strokeStyle='#000';c.lineWidth=dpr;c.strokeRect(x-3*dpr,y-3*dpr,6*dpr,6*dpr)}}
 if(t.kind==='paint'){const R=brushDisp()*dpr;if(pts.length){c.globalAlpha=.45;c.beginPath();pts.forEach((p,i)=>c[i?'lineTo':'moveTo'](...P(p)));if(pts.length===1)c.lineTo(...P(pts[0]));c.strokeStyle=t.color||'#ff2d6f';c.lineWidth=2*R;c.stroke();c.globalAlpha=1}
  if(cursor){const [x,y]=P(cur);line(()=>c.arc(x,y,Math.max(2,R),0,Math.PI*2),false);if(T.hard<1&&R*T.hard>3)line(()=>c.arc(x,y,R*T.hard,0,Math.PI*2))}}
 if(cursor&&(T.kbd||t.kind==='two'&&pts.length&&!T.drag)){const [x,y]=P(cur),s=9*dpr;line(()=>{c.moveTo(x-s,y);c.lineTo(x-3*dpr,y);c.moveTo(x+3*dpr,y);c.lineTo(x+s,y);c.moveTo(x,y-s);c.lineTo(x,y-3*dpr);c.moveTo(x,y+3*dpr);c.lineTo(x,y+s)},false)}}
// Altri segni da disegnare sopra la foto (maniglie delle sfumature, riquadro dello scontorno…): funzioni aggiunte dagli altri moduli.
const overGuides=[];
// Operazioni sulla selezione.
const needSel=()=>{if(!I.bmp){toast('Apri prima una foto');return false}if(!I.r.sel){toast('Non c’è una selezione: scegli prima una zona della foto');return false}return true};
function selAll(){if(!I.bmp){toast('Apri prima una foto');return}edit('Seleziona tutto',r=>{r.sel={ops:[{t:'all'}]}});announce('Selezionata tutta la foto')}
function selNone(){if(!I.r.sel){toast('Non c’è una selezione');return}edit('Deseleziona',r=>{r.sel=null});announce('Selezione tolta')}
function selModify(op,label){if(!needSel())return false;edit(label,r=>{r.sel={ops:[...r.sel.ops,op]}});announce(label+'. '+selSummary());return true}
function selInvert(){selModify({t:'invert'},'Selezione invertita')}
// Finestre per sfumare, espandere o contrarre e rifinire: le misure sono pixel della foto.
const photoLong=()=>Math.max(I.bmp.width,I.bmp.height);
async function selPixels(title,text,label,value,min,max,make,extra=[]){if(!needSel())return;const v=await modal(title,`<p>${esc(text)}</p>`,[{id:'px',label,type:'number',value},...extra],'Applica',{validate:x=>{const n=num(x.px);return Number.isFinite(n)&&n>=min&&n<=max?null:{msg:`Scrivi un numero tra ${fmtInt(min)} e ${fmtInt(max)}`,field:'px'}}});
 if(v)selModify(make(num(v.px)/photoLong(),v),title.replace('…',''))}
const selFeather=()=>selPixels('Sfuma la selezione…','Il bordo della selezione passa gradualmente da dentro a fuori: utile perché una regolazione locale non lasci un segno netto.','Raggio della sfumatura in pixel',20,1,1000,r=>({t:'feather',r:U5(r)}));
const selGrow=()=>selPixels('Espandi o contrai la selezione…','Con un numero positivo il bordo si allarga, con uno negativo si stringe; gli angoli si arrotondano e i buchi piccoli si chiudono.','Pixel, positivi per espandere e negativi per contrarre',5,-500,500,r=>({t:'grow',r:U5(r)}));
const selRefine=()=>selPixels('Rifinisci i bordi…','Il bordo segue i contorni veri della foto, come capelli, foglie o pelo, invece della linea tracciata. Il raggio è la fascia intorno al bordo che viene ricalcolata.','Raggio del bordo in pixel',Math.max(4,Math.round(photoLong()/400)),1,300,(r,v)=>({t:'refine',r:U5(r),e:Number(v.edge)}),[{id:'edge',label:'Bordo',type:'select',value:'0.001',options:[['0.0001','Netto'],['0.001','Medio'],['0.01','Morbido']]}]);
// Selezione scritta con le misure, in pixel dell'inquadratura o in percentuale.
async function selMeasure(){if(!I.bmp){toast('Apri prima una foto');return}const [fw,fh]=outSize(I.r,I.bmp.width,I.bmp.height),dim=(s,full)=>{const t=String(s).trim();return t.endsWith('%')?num(t.slice(0,-1))/100*full:num(t)};
 const v=await modal('Selezione con le misure',`<p>Misure in pixel della foto inquadrata, che è di ${fmtInt(fw)} × ${fmtInt(fh)} pixel, contate dall’angolo in alto a sinistra. Puoi scrivere anche una percentuale, come 25%.</p>`,[
  {id:'shape',label:'Forma',type:'select',value:'rect',options:[['rect','Rettangolo'],['ellipse','Ellisse']]},
  {id:'mode',label:'Modo',type:'select',value:I.r.sel?'add':'new',options:[['new','Nuova selezione'],['add','Aggiungi alla selezione'],['sub','Sottrai dalla selezione'],['int','Interseca con la selezione']]},
  {id:'x',label:'Da sinistra',value:'25%'},{id:'y',label:'Dall’alto',value:'25%'},{id:'w',label:'Larghezza',value:'50%'},{id:'h',label:'Altezza',value:'50%'}],'Seleziona',
  {validate:x=>{for(const [k,full] of [['x',fw],['y',fh],['w',fw],['h',fh]]){const n=dim(x[k],full);if(!Number.isFinite(n)||n<(k==='w'||k==='h'?1:0))return {msg:'Scrivi un numero di pixel o una percentuale',field:k}}return null}});
 if(!v)return;const x=dim(v.x,fw),y=dim(v.y,fh),a=[x/fw,y/fh],b=[(x+dim(v.w,fw))/fw,(y+dim(v.h,fh))/fh];commitSel(v.shape==='ellipse'?ellipseOp(a,b):rectOp(a,b),v.mode,v.shape==='ellipse'?'Ellisse con le misure':'Rettangolo con le misure')}
function toggleQuickMask(){prefs.quickMask=!prefs.quickMask;savePrefs();drawAnts()}
// Gruppo Selezione nel pannello: strumenti, operazioni e descrizione della selezione.
const SEL_TOOL_CMDS=['toolRect','toolEllipse','toolLasso','toolPoly','toolBrush','toolWand','toolRange'];
const cmdButton=(id,cls='btn sm')=>{const c=C[id];return `<button type="button" class="${cls}" data-action="${id}"${c.toggle?` aria-pressed="${!!safe(c.toggle)}"`:''}${I.bmp?'':' disabled'}>${ICON(c.icon)}${esc(c.short||c.label)}</button>`};
const PANEL_HTML={selection:()=>`<div class="tool-grid" role="group" aria-label="Strumenti di selezione">${SEL_TOOL_CMDS.map(id=>cmdButton(id)).join('')}</div><div class="insp-actions" role="group" aria-label="Operazioni sulla selezione">${['selAll','selNone','selInvert','selFeather','selGrow','selRefine','selMeasure','selDescribe','selShow'].map(id=>cmdButton(id)).join('')}</div><p class="sel-desc" id="selDesc">${esc(ants.text||selSummary())}</p>`};
// Comandi di questo modulo e dei successivi, uniti a quelli di Immagini in 08-actions.js.
// Tasti sulla foto quando uno strumento è attivo, elencati nella guida delle scorciatoie.
STATIC_KEYS.i.push(['Sulla foto con uno strumento',[['Muovi il cursore (con Maiusc di più, con Ctrl di un pixel)','← → ↑ ↓'],['Usa il punto: angolo, punto del lazo, colore','Invio'],['Chiudi il lazo','Maiusc+Invio'],['Togli l’ultimo punto del lazo','Backspace'],['Abbassa o alza il pennello','Spazio'],['Pennello più piccolo o più grande (con Maiusc la durezza)','[ / ]'],['Annulla il punto in corso o chiudi lo strumento','Esc']]]);
const PHOTO_TOOL_ACTIONS={toolRect:()=>setTool('rect'),toolEllipse:()=>setTool('ellipse'),toolLasso:()=>setTool('lasso'),toolPoly:()=>setTool('poly'),toolBrush:()=>setTool('brush'),toolWand:()=>setTool('wand'),toolRange:()=>setTool('range'),
 selAll,selNone,selInvert,selFeather,selGrow,selRefine,selMeasure,selDescribe,selShow:toggleQuickMask};
