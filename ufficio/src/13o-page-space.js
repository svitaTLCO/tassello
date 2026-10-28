// Impagina: le relazioni nello spazio dette a parole. Da dove la cornice esce dalla pagina o dai margini, quanto, con quali
// cornici si tocca, a che distanza stanno i vicini e con chi è allineata: servono alla verifica, agli annunci degli
// spostamenti (Alt+Maiusc+R e le frecce) e alla panoramica della pagina (Alt+Maiusc+D).
const PG_SIDE=['a sinistra','in alto','a destra','in basso'],PG_MARGIN=['sinistro','superiore','destro','inferiore'];
// Di quanto il riquadro (già ruotato) sporge oltre il rettangolo R, lato per lato; tol è la tolleranza.
function pgPastSides(B,R,tol){const d=[R.x-B.x,R.y-B.y,B.x+B.w-R.x-R.w,B.y+B.h-R.y-R.h];return d.map((v,i)=>({side:PG_SIDE[i],i,d:v})).filter(x=>x.d>tol)}
const pgTol=()=>pgMM()?.5*MM:2;
// I lati da cui la cornice esce dalla pagina; [] se è dentro, null se è del tutto fuori.
function pgOffPage(it,p=Pg.p){const B=pgBoxOf(it);if(B.x>=p.w||B.y>=p.h||B.x+B.w<=0||B.y+B.h<=0)return null;return pgPastSides(B,{x:0,y:0,w:p.w,h:p.h},pgTol())}
const pgSidesSay=list=>list.map(x=>`${x.side} di ${pgU(x.d)}`).join(' e ');
const pgQ=n=>`«${n}»`,pgList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' e '+a.at(-1);
// Una cornice che copre quasi tutta la pagina è uno sfondo: non fa da vicina e non conta negli allineamenti.
const pgIsBack=(B,p=Pg.p)=>B.w*B.h>=p.w*p.h*.9;
const pgShapeKind=k=>k==='rect'||k==='ellipse'||k==='line'||k==='tri'||k==='shape';
// Le cornici con cui confrontarsi: quelle visibili della pagina e, sulle pagine, quelle del mastro, nell'ordine dei livelli.
function pgSpaceItems(h=pgHolder()){const m=Pg.mid?null:pgMasterOf(h);return [...(m?.items||[]).map(it=>({it,master:true})),...h.items.map(it=>({it,master:false}))].filter(x=>!x.it.hidden).map((x,z)=>({...x,z,B:pgBoxOf(x.it),name:pgQ(x.it.name)+(x.master?' del mastro':'')}))}
// Dove sta il centro della cornice, in terzi della pagina.
function pgZoneSay(B,p=Pg.p){const cx=(B.x+B.w/2)/p.w,cy=(B.y+B.h/2)/p.h,v=cy<1/3?'in alto':cy>2/3?'in basso':'',o=cx<1/3?'a sinistra':cx>2/3?'a destra':'';return v&&o?`${v} ${o}`:v?`${v} al centro`:o?`a metà altezza, ${o}`:'al centro della pagina'}
const PG_FRAC=[[1/4,'un quarto'],[1/3,'un terzo'],[1/2,'metà'],[2/3,'due terzi'],[3/4,'tre quarti']];
// Larghezza o altezza in parole facili: quanto la pagina, quanto i margini, una frazione dei margini o la percentuale.
function pgMeasureSay(v,inner,page,what){const tol=pgTol();if(Math.abs(v-page)<=tol)return `${what} quanto la pagina`;if(Math.abs(v-inner)<=tol)return `${what} quanto i margini`;const f=PG_FRAC.find(([q])=>Math.abs(v/inner-q)<.02);return f?`${what} ${f[1]} dei margini`:`${what} il ${Math.max(1,Math.round(v/page*100))}% della pagina`}
// Fuori dalla pagina o dai margini, a parole; '' se è dentro i margini.
function pgOutSay(it,p=Pg.p){const off=pgOffPage(it,p);if(off===null)return 'fuori dalla pagina';if(off.length)return 'esce dalla pagina '+pgSidesSay(off);const m=pgPastSides(pgBoxOf(it),pgInner(p),pgTol());return !m.length?'':m.length===1?`esce dal margine ${PG_MARGIN[m[0].i]} di ${pgU(m[0].d)}`:'esce dai margini '+pgList(m.map(x=>`${PG_MARGIN[x.i]} di ${pgU(x.d)}`))}
// Quanto di un riquadro è coperto da un altro, in parole.
const pgInter=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
const pgFracSay=f=>f>=.97?'per intero':f>=.7?'per tre quarti':f>=.45?'per metà':f>=.2?'per un quarto':'in piccola parte';
// Le relazioni della cornice con le altre: vicini sopra, sotto e ai lati con le distanze, sovrapposizioni e contatti.
function pgRelations(it,h=pgHolder()){const all=pgSpaceItems(h),me=all.find(x=>x.it===it);if(!me)return null;const B=me.B,tol=pgTol(),near={},over=[],touch=[];
 for(const o of all){if(o.it===it||pgIsBack(o.B))continue;const O=o.B,ox=Math.min(B.x+B.w,O.x+O.w)-Math.max(B.x,O.x),oy=Math.min(B.y+B.h,O.y+O.h)-Math.max(B.y,O.y);
  if(ox>tol&&oy>tol){const a=pgInter(B,O);over.push({o,above:me.z>o.z,mine:a/Math.max(1,B.w*B.h),theirs:a/Math.max(1,O.w*O.h)});continue}
  if((ox>tol&&oy>-tol)||(oy>tol&&ox>-tol)){touch.push(o);continue}
  const put=(k,g)=>{if(g>=0&&(!near[k]||g<near[k].g))near[k]={o,g}};
  if(ox>tol){put('above',B.y-O.y-O.h);put('below',O.y-B.y-B.h)}if(oy>tol){put('left',B.x-O.x-O.w);put('right',O.x-B.x-B.w)}}
 return {me,all,near,over,touch}}
function pgNearSay(R){const n=R.near,parts=[];for(const [k,w] of [['above','sotto'],['below','sopra'],['left','a destra di'],['right','a sinistra di']])if(n[k])parts.push(`${w} ${n[k].o.name}, a ${pgU(n[k].g)}`);return parts.join('; ')}
function pgOverSay(R){return R.over.map(x=>{const shape=pgShapeKind(x.o.it.kind)||x.o.it.deco;return x.above?(shape&&x.theirs<.97?`sta sopra la forma ${x.o.name}`:`copre ${pgFracSay(x.theirs)} ${x.o.name}`):`è coperta ${pgFracSay(x.mine)} da ${x.o.name}`}).concat(R.touch.map(o=>`tocca ${o.name}`)).join('; ')}
// Gli allineamenti: bordi e centri uguali a quelli di altre cornici, dei margini e del centro della pagina, raggruppati.
function pgAlignSay(R,p=Pg.p){const B=R.me.B,tol=pgTol(),i=pgInner(p),E=b=>[b.x,b.x+b.w/2,b.x+b.w,b.y,b.y+b.h/2,b.y+b.h],mine=E(B),names=['a sinistra','al centro','a destra','in alto','al centro in verticale','in basso'],
  marg=[i.x,null,i.x+i.w,i.y,null,i.y+i.h],mid=[null,p.w/2,null,null,p.h/2,null],sideName=['sinistro',null,'destro','superiore',null,'inferiore'],groups=new Map();
 for(let k=0;k<6;k++){const who=R.all.filter(o=>o.it!==R.me.it&&!pgIsBack(o.B)&&Math.abs(E(o.B)[k]-mine[k])<=tol).map(o=>o.name),m=marg[k]!=null&&Math.abs(marg[k]-mine[k])<=tol,c=mid[k]!=null&&Math.abs(mid[k]-mine[k])<=tol;if(!who.length&&!m&&!c)continue;
  const key=who.join('|')+'#'+m+c;if(!groups.has(key))groups.set(key,{who,m,c,ks:[]});groups.get(key).ks.push(k)}
 return [...groups.values()].map(g=>{const list=[...g.who.slice(0,4),...(g.who.length>4?[`altre ${g.who.length-4}`]:[]),...(g.m?[g.ks.length>1?'i margini':`il margine ${sideName[g.ks[0]]}`]:[]),...(g.c?['il centro della pagina']:[])];return `allineata ${pgList(g.ks.map(k=>names[k]))} con ${pgList(list)}`}).join('; ')}
const pgCap=s=>s?s[0].toUpperCase()+s.slice(1):s;
// Alt+Maiusc+R: dove sta la cornice scelta rispetto alla pagina, ai margini e alle altre cornici.
function pgPlaceSay(it,{short=false}={}){const p=Pg.p,B=pgBoxOf(it),i=pgInner(p),out=pgOutSay(it),line=it.kind==='line',size=line?`lunga ${pgU(Math.hypot(it.w,it.h))}`:`${pgMeasureSay(B.w,i.w,p.w,'larga')}, ${pgMeasureSay(B.h,i.h,p.h,'alta')}`;
 if(short)return [out==='fuori dalla pagina'?out:pgZoneSay(B,p),size,out!=='fuori dalla pagina'&&out].filter(Boolean).join(', ');
 const R=pgRelations(it),h=pgHolder(),z=h.items.indexOf(it);
 return [`${it.name}: ${out==='fuori dalla pagina'?out:pgZoneSay(B,p)}, ${size}${out&&out!=='fuori dalla pagina'?', '+out:''}.`,R&&pgNearSay(R),R&&pgOverSay(R),R&&pgAlignSay(R),h.items.length>1?`livello ${z+1} di ${h.items.length} dal fondo`:''].filter(Boolean).map(s=>pgCap(s.replace(/\.$/,''))+'.').join(' ')}
function pgPlace(){const it=pgNeed();if(it)sayLong('Posizione di «'+it.name+'»',pgPlaceSay(it))}
// Riscontri durante gli spostamenti: lo stato prima e dopo, e si dice solo ciò che è cambiato.
function pgRelState(it){const R=pgRelations(it),o=pgOffPage(it),m=pgPastSides(pgBoxOf(it),pgInner(Pg.p),pgTol()),keep=x=>!x.it.deco&&!pgIsBack(x.B);
 return {over:new Set((R?.over||[]).filter(x=>keep(x.o)).map(x=>x.o.name)),touch:new Set((R?.touch||[]).filter(keep).map(o=>o.name)),page:o===null?'fuori':o.length?'esce':'',margin:m.length>0}}
function pgRelDiff(a,b){if(!a||!b)return '';const out=[];for(const n of b.over)if(!a.over.has(n))out.push('ora si sovrappone a '+n);for(const n of a.over)if(!b.over.has(n)&&!b.touch.has(n))out.push('non si sovrappone più a '+n);
 for(const n of b.touch)if(!a.touch.has(n)&&!a.over.has(n))out.push('ora tocca '+n);for(const n of a.touch)if(!b.touch.has(n)&&!b.over.has(n))out.push('non tocca più '+n);
 if(b.page!==a.page)out.push(b.page==='fuori'?'è uscita dalla pagina':b.page?'esce dalla pagina':'di nuovo dentro la pagina');
 else if(!b.page&&b.margin!==a.margin)out.push(b.margin?'esce dai margini':'di nuovo dentro i margini');return out.join('; ')}
// Verifica della disposizione: sovrapposizioni tra contenuti, testo coperto, cornici nascoste, margini attraversati, testo
// di esempio del modello, cornici di testo vuote, foto con poca risoluzione per la stampa e allineamenti mancati di poco.
// Ogni avviso si può segnare «Va bene così»: il codice resta nella cornice (layOk) e l'avviso non torna.
function pgLayoutIssues(p,h,at,where,lay,ii,out){const mm=p.unit==='mm',tol=pgTol(),i=pgInner(p),m=at.mid?null:pgMasterOf(h),stack=[...(m?.items||[]),...h.items].filter(x=>!x.hidden),box=new Map(stack.map(x=>[x,pgBoxOf(x)])),own=new Set(h.items);
 const say=(it,code,msg)=>{if(!(it.layOk||[]).includes(code))out.push({...at,id:it.id,code,msg:`«${it.name}» (${where}): ${msg}`,fix:'lay'})},content=x=>PG_CONTENT.has(x.kind)&&!x.deco;
 for(const it of h.items){if(it.hidden)continue;const B=box.get(it),z=stack.indexOf(it);
  // Contenuti che si sovrappongono: due cornici di testo, insegne, tabelle o codici che si coprono. Il testo sopra una foto ha
  // già il suo avviso, quello del contrasto.
  for(const o of stack.slice(z+1)){if(!content(it)||!content(o)||it.kind==='image'||o.kind==='image')continue;if(pgInter(B,box.get(o))>tol*tol*4)say(it,'over:'+o.id,`si sovrappone a «${o.name}»${own.has(o)?'':' del mastro'}: i contenuti si coprono.`)}
  // Testo coperto da una cornice piena che sta sopra, misurato sulle righe vere.
  if(it.kind==='text'){const L=lay?.get(ii+'|'+it.id),hit=new Set();for(const o of stack.slice(z+1)){if(o.kind==='text'||o.kind==='line'||(o.kind!=='image'&&(o.fill==='none'||!o.fill)))continue;if(o.kind==='image'&&!o.img&&!o.field)continue;const O=box.get(o),n=(L?.lines||[]).filter(ln=>ln.pieces.length&&pgInter({x:B.x,y:ln.top,w:B.w,h:ln.lh},O)>0).length;if(n)hit.add(`«${o.name}» copre ${n===1?'una riga':n+' righe'} del testo`)}
   if(hit.size)say(it,'cover',[...hit].join('; ')+'.');
   if(L&&!L.lines.some(ln=>ln.pieces.some(pc=>pc.t.trim()))&&p.stories[it.story]?.chain[0]===it.id&&!storyText(p.stories[it.story]).trim())say(it,'empty','la cornice di testo è vuota.')}
  // Cornice nascosta del tutto sotto un'altra piena.
  if(!it.deco&&PG_CONTENT.has(it.kind))for(const o of stack.slice(z+1))if(o.kind!=='text'&&o.kind!=='line'&&o.fill&&o.fill!=='none'&&o.opacity===100&&pgCovers(o,it)){say(it,'hidden',`è nascosta sotto «${o.name}», che la copre per intero.`);break}
  // Margini attraversati: un contenuto della pagina in parte dentro e in parte fuori dai margini.
  if(content(it)&&pgOffPage(it,p)?.length===0){const past=pgPastSides(B,i,tol),inside=pgInter(B,i)>0;if(past.length&&inside&&!(it.kind==='image'&&past.every(x=>Math.abs(x.d-[i.x,i.y,p.w-i.x-i.w,p.h-i.y-i.h][x.i])<=tol)))say(it,'margin',`attraversa il margine ${pgList(past.map(x=>`${PG_MARGIN[x.i]} di ${pgU(x.d)}`))}.`)}
  // Testo di esempio rimasto dal modello: la storia è uguale a quella con cui il documento è nato.
  if(it.kind==='text'&&p.tpl?.texts&&p.stories[it.story]?.chain[0]===it.id){const t=storyText(p.stories[it.story]).trim();if(t&&p.tpl.texts.includes(t))say(it,'sample','c’è ancora il testo di esempio del modello.')}
  // Foto con poca risoluzione per la stampa: meno di 150 punti per pollice.
  if(mm&&it.kind==='image'&&it.img){const im=Pg.imgs.get(it.img);if(im?.w&&B.w>0){const a=im.w/(Math.abs(it.w)/MM/25.4),b=im.h/(Math.abs(it.h)/MM/25.4),dpi=it.fit==='fit'?Math.max(a,b):Math.min(a,b);if(dpi<150)say(it,'dpi',`la foto ha circa ${Math.round(dpi)} punti per pollice alla dimensione stampata: per la stampa ne servono almeno 150.`)}}
  // Allineamenti mancati di poco: il bordo sinistro o destro a meno di 1 mm da quello di un'altra cornice o dal margine, ma
  // non uguale. Sono le colonne che a occhio si vedono storte; differenze più grandi sono di solito volute.
  if(!it.deco&&mm&&PG_CONTENT.has(it.kind)){const E=b=>[b.x,b.x+b.w],me=E(B),names=['il bordo sinistro','il bordo destro'],refs=[[i.x],[i.x+i.w]];
   for(const o of h.items)if(o!==it&&!o.hidden&&!o.deco&&PG_CONTENT.has(o.kind)&&!pgIsBack(box.get(o),p)){const e=E(box.get(o));refs[0].push(e[0]);refs[1].push(e[1])}
   for(let k=0;k<2;k++){const d=refs[k].map(v=>Math.abs(v-me[k])).filter(v=>v>tol&&v<MM).sort((a,b)=>a-b)[0];if(d!=null&&!refs[k].some(v=>Math.abs(v-me[k])<=tol)){say(it,'near'+k,`${names[k]} è quasi allineato, a ${pgU(d)} da un altro bordo o dal margine: allinealo, o segnalo come voluto.`);break}}}}}
// Alt+Maiusc+D: la panoramica della composizione, in una finestra. In testa il modello di partenza, poi le fasce dall'alto,
// gli sfondi con il loro colore, le sovrapposizioni, lo spazio libero più grande e la mappa 3 × 3, da percorrere come una
// tabella: righe In alto, Al centro, In basso; colonne A sinistra, Al centro, A destra.
function pgOverview(){const p=Pg.p,h=pgHolder(),items=pgSpaceItems(h),pg=pgCurPage(),inner=pgInner(p),rows=[],seen=new Set();
 for(const it of pgAutoOrder(h)){if(it.deco||it.hidden)continue;const B=pgBoxOf(it),r=rows.find(r=>B.y<r.bot-Math.min(B.h,r.bot-r.top)*.5&&B.y+B.h>r.top);if(r){r.items.push(it);r.bot=Math.max(r.bot,B.y+B.h)}else rows.push({top:B.y,bot:B.y+B.h,items:[it]})}
 const backs=items.filter(x=>x.it.fill&&x.it.fill!=='none'&&(pgIsBack(x.B)||x.it.deco||pgShapeKind(x.it.kind))).map(x=>`${x.name}, ${x.it.kind==='image'?'immagine':colorSay(x.it.fill)}, ${pgIsBack(x.B)?'tutta la pagina':pgZoneSay(x.B)+', '+pgMeasureSay(x.B.w,inner.w,p.w,'larga')+', '+pgMeasureSay(x.B.h,inner.h,p.h,'alta')}`);
 const overs=[];for(const x of items){if(x.it.deco||pgIsBack(x.B))continue;for(const o of items)if(o.z>x.z&&!o.it.deco&&!pgIsBack(o.B)&&pgInter(x.B,o.B)>pgTol()**2*4&&!seen.has(o.it.id+x.it.id)){seen.add(o.it.id+x.it.id);overs.push(`${o.name} copre ${pgFracSay(pgInter(x.B,o.B)/Math.max(1,x.B.w*x.B.h))} ${x.name}`)}}
 // Lo spazio libero più grande: la fascia orizzontale più alta, dentro i margini, senza cornici di contenuto.
 const cuts=items.filter(x=>!x.it.deco&&!pgIsBack(x.B)).map(x=>[Math.max(inner.y,x.B.y),Math.min(inner.y+inner.h,x.B.y+x.B.h)]).filter(c=>c[1]>c[0]).sort((a,b)=>a[0]-b[0]);let y=inner.y,gap={h:0,y:0};for(const [a,b] of cuts){if(a-y>gap.h)gap={h:a-y,y};y=Math.max(y,b)}if(inner.y+inner.h-y>gap.h)gap={h:inner.y+inner.h-y,y};
 const zone=(r,c)=>items.filter(x=>!pgIsBack(x.B)&&!x.it.deco&&Math.min(2,Math.floor((x.B.y+x.B.h/2)/p.h*3))===r&&Math.min(2,Math.floor((x.B.x+x.B.w/2)/p.w*3))===c).map(x=>x.name).join(', ')||'vuoto';
 const li=a=>a.length?`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>Nessuna.</p>';
 const body=`${p.tpl?.n?`<p>Dal modello «${esc(p.tpl.n)}»${p.tpl.d?': '+esc(p.tpl.d):''}</p>`:''}<p>${esc(Pg.mid?h.name:`Pagina ${Pg.pi+1} di ${p.pages.length}`)}, ${esc(PG_PRESETS.find(x=>x[0]===p.preset)?.[1]||`${fmtU(p.w)} per ${pgU(p.h)}`)}, sfondo ${esc(p.bg==='none'?'trasparente':colorSay(p.bg))}.</p>`+
  `<h3>Fasce dall’alto</h3>${li(rows.map((r,k)=>`${k+1}, da ${pgU(r.top)} a ${pgU(r.bot)}: ${r.items.map(it=>it.name).join(', ')}`))}<h3>Sfondi e forme</h3>${li(backs)}<h3>Sovrapposizioni</h3>${li(overs)}`+
  `<h3>Spazio libero</h3><p>${gap.h>pgTol()*4?`Il più grande è una fascia alta ${esc(pgU(gap.h))}, da ${esc(pgU(gap.y))} dall’alto, larga quanto i margini.`:'Tra i margini non resta una fascia libera.'}</p>`+
  `<table><caption>La pagina in nove zone</caption><thead><tr><td></td><th scope="col">A sinistra</th><th scope="col">Al centro</th><th scope="col">A destra</th></tr></thead><tbody>${['In alto','Al centro','In basso'].map((n,r)=>`<tr><th scope="row">${n}</th>${[0,1,2].map(c=>`<td>${esc(zone(r,c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
 saidN++;return modal('Panoramica della pagina',body,[],'Chiudi',{noCancel:true,wide:true})}
// Il conto dei punti della verifica, da dire dopo «Adatta a un altro formato» (solo la disposizione) e prima di stampare o
// esportare (tutti): «La verifica trova 3 punti da controllare: …». '' se non trova nulla.
function pgIssuesSay(layout=false){let list=[];try{list=pgIssues().filter(x=>!layout||x.fix==='lay'||/esce dalla pagina|fuori dalla pagina/.test(x.msg))}catch(e){return ''}
 if(!list.length)return '';return ` La verifica trova ${list.length===1?'un punto':list.length+' punti'} da controllare${layout?' nella disposizione':''}: ${list.slice(0,2).map(x=>x.msg.replace(/\.$/,'')).join('; ')}${list.length>2?'; e altri':''}. Alt+Q, Verifica dell’accessibilità, li elenca tutti.`}
// I testi di esempio con cui nasce un documento da modello: la verifica li riconosce se restano uguali.
function pgTplMark(p,e){if(!e||e.mine||e.id==='vuoto')return;p.tpl={n:e.n,d:e.d||'',texts:[...new Set(Object.values(p.stories||{}).map(s=>storyText(s).trim()).filter(Boolean))]}}
