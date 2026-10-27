// Impagina: modelli di partenza e galleria «Nuovo da modello». Un modello è un elenco compatto di cornici, pagina per
// pagina. Le misure sono i bordi della cornice (sinistro, alto, destro, basso) in frazioni dell'area dei margini: 0 e 1 sono
// i margini, -1 e 2 i bordi della pagina, i valori in mezzo cadono nei margini. I colori sono nomi del tema del modello
// (PG_THEMES: bg, ink, head, accent, accent2, soft, dark, light) e i testi segnaposto spiegano che cosa fare. Così lo
// stesso modello si costruisce in formati diversi. Il primo modello di ogni formato è quello di pgStarter.
const PG_USES=[['evento','Evento'],['offerta','Offerta e vendita'],['annuncio','Annuncio'],['citazione','Citazione'],['menu','Menu e listino'],['elenco','Elenco e passi'],['confronto','Prima e dopo'],['notizie','Notizie'],['presentazione','Presentazione'],['auguri','Auguri e inviti'],['contatti','Contatti e biglietti'],['tuoi','I tuoi modelli']];
// I modelli di pgStarter: nome, descrizione e uso, per formato.
const PG_STARTER={post:['Post con foto','Occhiello, titolo, una foto e un messaggio di due righe.','annuncio'],carosello:['Guida in cinque passi','Copertina con foto, tre passi e una pagina finale che invita a salvare il post.','elenco'],storia:['Storia con foto di sfondo','Foto a tutta pagina e una fascia scura con il titolo e una frase.','annuncio'],
 a4:['Volantino con foto','Data e titolo, una foto, due paragrafi e i contatti in fondo.','evento'],a5:['Volantino con foto','Data e titolo, una foto, due paragrafi e i contatti in fondo.','evento'],brochure:['Brochure di presentazione','Copertina con foto e tre pagine di testo su due colonne, che scorre da solo da una pagina all’altra.','presentazione'],
 newsletter:['Newsletter con articolo','Testata, foto in apertura e un articolo su tre colonne che continua a pagina 2.','notizie'],a2:['Poster con insegna','Titolo d’effetto, una grande foto, dove e quando, contatti.','evento'],a1:['Poster con insegna','Titolo d’effetto, una grande foto, dove e quando, contatti.','evento'],a0:['Poster con insegna','Titolo d’effetto, una grande foto, dove e quando, contatti.','evento'],
 striscione:['Benvenuti','Una scritta d’effetto su tutto lo striscione.','auguri annuncio'],slide:['Presentazione semplice','Titolo, tre punti da ricordare e un’immagine con il suo commento.','presentazione']};
// Stili dei paragrafi nei modelli: una lettera per stile, la maiuscola è la variante per i fondi scuri.
const PG_TPL_PS={o:'occhiello',t:'titolo',s:'sottotitolo',h:'titoletto',c:'corpo',l:'elenco',q:'citazione',d:'didascalia',n:'note',k:'numero'};
const PG_TPL_NAME={o:'Titolo',t:'Titolo',s:'Sottotitolo',h:'Testo',c:'Testo',l:'Elenco',q:'Citazione',d:'Didascalia',n:'Note',k:'Numero di pagina'};
// Frasi segnaposto ricorrenti: nei testi si richiamano con @0, @1…
const PG_TIPS=[...PG_SAMPLE];
// I modelli. Campi: id, n nome, d descrizione, u usi, f formati, th tema, bg colore della pagina, st modifiche agli stili
// (a allineamento c/r/j, x corpo in volte il corpo del testo, f carattere, c colore, b grassetto, i corsivo, u maiuscolo),
// m cornici del mastro, p pagine. Una pagina è un elenco di cornici, oppure {r:3,p:[…]} da ripetere ({p} è il numero
// della ripetizione) o {d:1,p:[…]} da ripetere per ogni riga dei dati.
// Cornici: ['t',bordi…,'paragrafi',{…}] testo, ['i',bordi…,{…}] immagine, ['s',bordi…,'scritta',{…}] insegna,
// ['r'|'e'|'v',bordi…,'colore',{…}] rettangolo, ellisse e triangolo, ['l',bordi…,'colore'] linea, ['g',bordi…,'griglia',{…}]
// griglia di foto (PG_GRIDS). I paragrafi sono «lettera:testo» separati da |; con + davanti valgono solo nei formati da
// stampa, con - solo in quelli per lo schermo. Opzioni: n nome, f sfondo, r angoli (frazione del lato corto), v allineamento
// verticale m/b, c colonne, pad margine interno (in corpi del testo), k catena (le cornici con la stessa k si passano il
// testo), q quadrata al centro, i rientro (frazione del lato corto), m sagoma, d decorativa, a testo alternativo,
// rep [volte, dx, dy] ripete la cornice spostandola ({n} è il numero della copia); nelle insegne st stile e c1, c2, oc,
// oc2, shc, gc colori, x altre proprietà.
const PG_TEMPLATES=[
 {id:'evento',n:'Evento con foto',d:'Fascia scura con la data e il titolo, una grande foto, dove e quando, contatti in fondo.',u:'evento',f:'post storia a4 a5 a2 a1 a0',th:'mare',st:{occhielloInverso:{c:'accent2'}},
  p:[[['r',-1,-1,2,.27,'dark'],['t',0,0,1,.25,'O:Sabato 14 marzo · ore 18|T:Il titolo dell’evento',{v:'b'}],['i',0,.3,1,.7,{n:'Foto dell’evento'}],
   ['t',0,.73,1,.94,'h:Dove e quando|c:Scrivi qui il luogo, l’orario e come partecipare.|+c:Aggiungi le informazioni utili: se serve prenotare, quanto costa, come arrivare. Frasi brevi si leggono anche da lontano.'],['t',0,.95,1,1,'n:Indirizzo · telefono · sito']]]}];
// Costruisce il documento di un modello nel formato scelto.
function pgTplBuild(t,preset){const p=newPub(preset),T=PG_THEMES[t.th]?.[2]||PG_THEMES.classico[2],tok=v=>T[v]||v,print=p.unit==='mm',b=p.ps.corpo.size,I=pgInner(p),used=new Set(),chains={};
 Object.assign(p,{title:t.n,bg:tok(t.bg||'bg')});
 const restyle=k=>{const o=t.st?.[k],s=p.ps[k];if(!o||!s)return;if(o.a)s.align={c:'center',l:'left',r:'right',j:'justify'}[o.a];if(o.x)s.size=r1(b*o.x);if(o.f)s.font=o.f;if(o.c)s.color=tok(o.c);for(const [a,z] of [['b','bold'],['i','italic'],['u','caps']])if(a in o)s[z]=!!o[a];if(o.lh)s.lh=o.lh;if(o.af!=null)s.after=r1(b*o.af)};
 for(const [k,s] of Object.entries(p.ps)){s.color=/Inverso$/.test(k)?T.light:/^(titolo|sottotitolo|titoletto|citazione)$/.test(k)?T.head:k==='occhiello'?T.accent:T.ink;restyle(k)}
 // Le varianti per i fondi scuri nascono quando servono, dallo stile di base già modificato.
 const ps=c=>{const base=PG_TPL_PS[c.toLowerCase()];if(c===c.toLowerCase())return base;const k=base+'Inverso';if(!p.ps[k]){p.ps[k]={...p.ps[base],name:p.ps[base].name+' su fondo scuro',color:T.light,next:''};restyle(k)}return k};
 const fill=(s,n,pi)=>String(s).replace(/@(\d+)/g,(m,d)=>PG_TIPS[d]??m).replace(/\{n\}/g,n).replace(/\{p\}/g,pi);
 const paras=(s,n,pi)=>s.split('|').filter(x=>x[0]==='+'?print:x[0]==='-'?!print:true).map(x=>{x=x.replace(/^[+-]/,'');const i=x.indexOf(':');return P(ps(x.slice(0,i)),fill(x.slice(i+1),n,pi))});
 const name=s=>{let v=s,k=2;while(used.has(v))v=s+' '+k++;used.add(v);return v};
 const ax=(v,a,n,len)=>v<0?a*(v+1):v>1?a+n+(len-a-n)*(v-1):a+v*n;
 const box=(e,o)=>{let x=ax(e[1],I.x,I.w,p.w),y=ax(e[2],I.y,I.h,p.h),w=ax(e[3],I.x,I.w,p.w)-x,h=ax(e[4],I.y,I.h,p.h)-y;if(o.q){const s=Math.min(w,h);x+=(w-s)/2;y+=(h-s)/2;w=h=s}if(o.i){const d=Math.min(w,h)*o.i;x+=d;y+=d;w-=2*d;h-=2*d}return{x,y,w,h}};
 const put=(h,e,n,pi)=>{const k=e[0],a=e[5],o=[e[5],e[6]].find(v=>v&&typeof v==='object')||{},B=box(e,o),nm=d=>name(o.n?fill(o.n,n,pi):d),rad=o.r?Math.min(B.w,B.h)*o.r:0;
  if(k==='t'){const x={name:nm(PG_TPL_NAME[a.replace(/^[+-]/,'')[0].toLowerCase()]||'Testo'),...B,valign:{m:'middle',b:'bottom'}[o.v]||'top',cols:o.c||1,gut:p.gut,pad:(o.pad||0)*b,fill:o.f?tok(o.f):'none',radius:rad};
   if(o.k&&chains[o.k])return pgPutLinked(p,h,chains[o.k],x);const it=pgPutText(p,h,x,paras(a,n,pi));if(o.k)chains[o.k]=it;return it}
  if(k==='i')return pgPut(h,pgMk(p,'image',{name:nm('Foto'),...B,fill:o.f?tok(o.f):'none',radius:rad,deco:!!o.d,...(o.m?{mask:o.m}:{})}));
  if(k==='s'){const st=o.st||'classica',c={};for(const z of ['c1','c2','oc','oc2','shc','gc'])if(o[z])c[z]=tok(o[z]);return pgPut(h,pgMk(p,'sign',{...pgSignStyle(st),style:st,name:nm('Scritta'),text:fill(a,n,pi),...B,c1:T.head,...c,...o.x}))}
  if(k==='l')return pgPut(h,pgMk(p,'line',{name:nm('Linea'),...B,stroke:tok(a||'accent')}));
  if(k==='g'){const cells=PG_GRIDS.find(x=>x[0]===a)[2],g=p.gut*.6,gid=uid(),e6=1e-6;return cells.map(([u,v,cw,ch])=>{const l=u>e6?g/2:0,r=u+cw<1-e6?g/2:0,tp=v>e6?g/2:0,bt=v+ch<1-e6?g/2:0;return pgPut(h,pgMk(p,'image',{name:nm(o.n||'Foto'),x:B.x+u*B.w+l,y:B.y+v*B.h+tp,w:cw*B.w-l-r,h:ch*B.h-tp-bt,fill:o.f?tok(o.f):'none',g:gid,...(o.m?{mask:o.m}:{})}))})}
  const kind={r:'rect',e:'ellipse',v:'tri'}[k];return pgPut(h,pgMk(p,kind,{name:nm(PG_KIND[kind]),...B,fill:tok(a||'soft'),radius:rad,opacity:o.op||100,...(o.a?{alt:o.a,deco:false}:{})}))};
 const fillHolder=(h,list,pi)=>{for(const e of list){const o=[e[5],e[6]].find(v=>v&&typeof v==='object')||{},[cnt,dx,dy]=o.rep||[1,0,0];for(let j=0;j<cnt;j++)put(h,j?[e[0],e[1]+j*dx,e[2]+j*dy,e[3]+j*dx,e[4]+j*dy,...e.slice(5)]:e,j+1,pi)}};
 const pages=[];for(const pg of t.p){if(Array.isArray(pg))pages.push({list:pg,pi:pages.length+1});else for(let j=0;j<(pg.r||1);j++)pages.push({list:pg.p,pi:j+1,data:!!pg.d})}
 p.pages=pages.map(x=>({...pgBlankPage(p),data:x.data}));if(t.m)fillHolder(p.masters[0],t.m,1);pages.forEach((x,i)=>fillHolder(p.pages[i],x.list,x.pi));return p}
// Le voci della galleria per un formato: il documento vuoto, il modello di pgStarter, i modelli e quelli dell'utente.
function pgTplEntries(fmt,mine){const own=mine.filter(m=>m.preset===fmt).map(m=>({id:'m:'+m.id,n:m.n,d:m.d||'Un tuo modello.',u:'tuoi',mine:m,make:()=>pgClean(m.p)}));
 if(fmt==='festone')return [{id:'festone',n:'Festone di lettere',d:PG_PRESET_DESC.festone+'. Scegli le lettere, i fogli e i colori nella finestra che segue.',u:'auguri',make:null},...own];
 if(!PG_PRESETS.some(x=>x[0]===fmt))return own;const s=PG_STARTER[fmt];
 return [{id:'vuoto',n:'Documento vuoto',d:'Solo margini, colonne, mastri e stili: le cornici le aggiungi tu.',u:'',make:()=>newPub(fmt)},...(s?[{id:'base',n:s[0],d:s[1],u:s[2],make:()=>Object.assign(pgStarter(newPub(fmt)),{title:s[0]})}]:[]),
  ...PG_TEMPLATES.filter(t=>t.f.split(' ').includes(fmt)).map(t=>({id:t.id,n:t.n,d:t.d,u:t.u,make:()=>pgTplBuild(t,fmt)})),...own]}
// Anteprime: le pagine del modello disegnate come la pagina vera, con il documento del modello al posto di quello aperto.
// Le cornici per le foto ancora vuote si vedono come un riquadro grigio con un paesaggio stilizzato.
const pgTplCache=new Map();
function pgTplPhoto(it){const s=Math.min(Math.abs(it.w),Math.abs(it.h))*.32,cx=it.x+it.w/2,cy=it.y+it.h/2,X=u=>pr2(cx+u*s),Y=v=>pr2(cy+v*s);return `<path d="M${X(-.5)} ${Y(.32)}L${X(-.16)} ${Y(-.1)}L${X(.06)} ${Y(.14)}L${X(.2)} ${Y(0)}L${X(.5)} ${Y(.32)}Z" fill="#a9b1bb"/><circle cx="${X(.26)}" cy="${Y(-.24)}" r="${pr2(s*.1)}" fill="#a9b1bb"/>`}
function pgTplPreview(e,fmt){const key=fmt+'|'+e.id;let v=pgTplCache.get(key);if(v)return v;const p=e.make(),old=Pg.p,empty=pgAllItems(p).filter(x=>x.kind==='image'&&!x.img&&!x.hidden);for(const it of empty)if(it.fill==='none')it.fill='#dde1e6';Pg.p=p;
 try{const all=pgInstances(p),insts=Object.assign(all.slice(0,6),{total:all.length}),lay=pgLayout(p,insts);v={n:p.pages.length,svg:insts.map((I,ii)=>`<svg viewBox="0 0 ${pr2(p.w)} ${pr2(p.h)}" aria-hidden="true" focusable="false">${pgPageSvg(p,I,ii,lay)}${[...(pgMasterOf(I.pg)?.items||[]),...I.pg.items].filter(x=>empty.includes(x)).map(pgTplPhoto).join('')}</svg>`)}}finally{Pg.p=old}
 pgTplCache.set(key,v);return v}
// La galleria: formato e uso filtrano l'elenco; le frecce scelgono il modello, Invio lo crea.
async function pgGallery({fmt,use='',pick=''}={}){const mine=await pgMineList();await pgMineImgs(mine);
 const fmts=[...PG_PRESETS.map(([v,l])=>[v,l]),['festone','Festone di lettere'],...(mine.some(m=>m.preset!=='festone'&&!PG_PRESETS.some(x=>x[0]===m.preset))?[['','Formato personalizzato, i tuoi modelli']]:[])];
 fmt??=PG_PRESETS.some(x=>x[0]===Pg.p?.preset)?Pg.p.preset:'post';if(!fmts.some(x=>x[0]===fmt))fmt='post';
 let list=[],cur=0,act=null;const opt=(v,l,s)=>`<option value="${esc(v)}"${v===s?' selected':''}>${esc(l)}</option>`;
 const body=`<p id="tplIntro">Scegli il formato e l’uso, poi il modello: frecce per scorrere l’elenco, Invio per creare il documento.${mine.length?' I tuoi modelli si rinominano con F2 e si eliminano con Canc.':''}</p><div class="pg-tpl-bar"><div><label for="tplFmt">Formato</label><select id="tplFmt">${fmts.map(([v,l])=>opt(v,l,fmt)).join('')}</select></div>
  <div><label for="tplUse">Uso</label><select id="tplUse">${opt('','Tutti gli usi',use)}${PG_USES.map(([v,l])=>opt(v,l,use)).join('')}</select></div></div>
  <p class="pg-tpl-count" id="tplCount"></p><div class="pg-tpl"><div class="lb pg-tpl-list" id="tplList" role="listbox" tabindex="0" aria-labelledby="tplCount" data-autofocus></div><div class="pg-tpl-view" id="tplView" aria-hidden="true"></div></div>
  <p class="pg-btns" id="tplMine" hidden><button type="button" class="btn sm" data-tpl="rename">Rinomina il modello</button><button type="button" class="btn sm" data-tpl="delete">Elimina il modello</button></p>`;
 const fmtName=()=>fmts.find(x=>x[0]===$('tplFmt').value)?.[1]||'',countSay=()=>`${list.length===1?'Un modello':list.length+' modelli'} per ${fmtName()}${$('tplUse').value?', uso '+PG_USES.find(x=>x[0]===$('tplUse').value)[1].toLowerCase():''}`;
 const show=()=>{const L=$('tplList'),e=list[cur];L.querySelectorAll('[role=option]').forEach((o,i)=>{o.setAttribute('aria-selected',i===cur);o.classList.toggle('active',i===cur)});L.setAttribute('aria-activedescendant',e?'tpo-'+cur:'tpo-none');$(e?'tpo-'+cur:'tpo-none')?.scrollIntoView({block:'nearest'});
  const v=e?.make?pgTplPreview(e,$('tplFmt').value):null;$('tplView').innerHTML=v?v.svg.map(s=>`<span class="pg-tpl-page">${s}</span>`).join('')+(v.n>v.svg.length?`<span class="pg-tpl-more">e altre ${v.n-v.svg.length} pagine</span>`:''):'';$('tplMine').hidden=!e?.mine};
 const render=()=>{const f=$('tplFmt').value,u=$('tplUse').value,keep=list[cur]?.id||pick;list=pgTplEntries(f,mine).filter(e=>!u||e.u.split(' ').includes(u));pick='';cur=Math.max(0,list.findIndex(e=>e.id===keep));if(!keep||cur===0&&list[0]?.id!==keep)cur=list.findIndex(e=>e.id!=='vuoto')<0?0:list.findIndex(e=>e.id!=='vuoto');
  $('tplCount').textContent=countSay();$('tplList').innerHTML=list.length?list.map((e,i)=>{const v=e.make?pgTplPreview(e,f):null;return `<div role="option" id="tpo-${i}" class="lb-item pg-tpl-item" aria-selected="false"><span class="pg-tpl-thumb">${v?.svg[0]||ICON('festone')}</span><span class="n"><b>${esc(e.n)}</b><span class="sr-only">. </span><span class="d">${esc(e.d)}${v&&v.n>1?` ${v.n} pagine.`:''}</span></span></div>`}).join(''):'<div role="option" id="tpo-none" class="lb-item" aria-disabled="true">Nessun modello per quest’uso in questo formato: scegli un altro uso.</div>';show()};
 const v=await modal('Nuovo da modello',body,[],'Crea',{wide:true,onOpen:(pane,finish)=>{pane.classList.add('pg-tpl-dlg');pane.setAttribute('aria-describedby','tplIntro');render();const L=$('tplList');
  const go=j=>{if(!list.length)return;cur=clampV(j,0,list.length-1);show()},mineAct=k=>{if(list[cur]?.mine){act={k,m:list[cur].mine,i:cur};finish(null)}};
  for(const id of ['tplFmt','tplUse'])$(id).onchange=()=>{render();announce(countSay())};
  L.onkeydown=e=>{const k=e.key;if(k==='ArrowDown'||k==='ArrowRight')go(cur+1);else if(k==='ArrowUp'||k==='ArrowLeft')go(cur-1);else if(k==='Home')go(0);else if(k==='End')go(list.length-1);else if(k==='PageDown')go(cur+5);else if(k==='PageUp')go(cur-5);
   else if(k==='Enter'){if(list[cur])finish({})}else if(k==='F2')mineAct('rename');else if(k==='Delete')mineAct('delete');
   else if(k.length===1&&/\S/.test(k)&&!e.ctrlKey&&!e.altKey){const q=k.toLowerCase(),j=[...list.keys()].map(x=>(cur+1+x)%list.length).find(x=>list[x].n.toLowerCase().startsWith(q));if(j!=null)go(j)}else return;e.preventDefault()};
  L.onclick=e=>{const o=e.target.closest('[role=option][id^=tpo-]');if(o&&o.id!=='tpo-none'){cur=+o.id.slice(4);show()}};L.ondblclick=e=>{if(e.target.closest('[role=option]')&&list[cur])finish({})};
  pane.querySelector('#tplMine').onclick=e=>{const b=e.target.closest('[data-tpl]');if(b)mineAct(b.dataset.tpl)};
  setTimeout(()=>announce(countSay()+'. Frecce per scegliere, Invio per creare.'),400)}});
 $('modal').setAttribute('aria-describedby','dlgBody');const state={fmt:$('tplFmt')?.value??fmt,use:$('tplUse')?.value??use};
 if(act){const nb=list[act.i+1]||list[act.i-1];if(act.k==='rename'){if(await pgMineRename(act.m))pgTplCache.clear();pgGallery({...state,pick:'m:'+act.m.id})}else{if(await confirmAction(`Eliminare il modello «${act.m.n}»? Non si può annullare.`)){await pgMineDel(act.m.id);announce(`Modello «${act.m.n}» eliminato`);pgGallery({...state,pick:nb?.id||''})}else pgGallery({...state,pick:'m:'+act.m.id})}return}
 const e=v&&list[cur];if(!e)return;if(e.id==='festone'){pgFestoneDialog();return}const p=e.make();if(e.id!=='vuoto')p.title=e.n.slice(0,120);pgTplOpen(p,e.id==='vuoto'?'':e.n)}
// Il documento nuovo prende il posto di quello aperto (Ctrl+Z lo riporta) e si annuncia che cosa contiene.
function pgTplOpen(p,from){const old=Pg.p,ph=pgAllItems(p).filter(x=>x.kind==='image'&&!x.img&&!x.field).length;pgUseNew(p,from?'Nuovo da modello':'Nuovo documento');
 announce(`Nuovo documento ${from?`dal modello «${from}»`:`«${p.title}»`}: ${p.pages.length===1?'una pagina':p.pages.length+' pagine'}${p.tiles.on?`, da stampare su ${pgTileSay(pgTileGrid(p))}`:''}. ${from?`Sostituisci i testi di esempio${ph?` e scegli ${ph===1?'la foto':'le '+ph+' foto'}: Invio sulla cornice vuota apre la scelta del file`:''}. `:''}${old?'Ctrl+Z torna al documento di prima. ':''}F6 passa tra pagine, cornici, pagina e proprietà.`)}
// I modelli dell'utente stanno nel browser come le bozze: in IndexedDB con le immagini, altrimenti in localStorage senza.
const PG_MINE_KEY='tassello-ufficio.impagina.modelli';
async function pgMineList(){try{if(db)return ((await storeCall(db,'readonly',st=>st.getAll(IDBKeyRange.bound('pmod:','pmod:￿'))))||[]).sort((a,b)=>b.ts-a.ts);return JSON.parse(localStorage.getItem(PG_MINE_KEY)||'[]')}catch(e){return []}}
async function pgMinePut(m){if(db){await storeCall(db,'readwrite',st=>st.put(m,'pmod:'+m.id));return}const l=(await pgMineList()).filter(x=>x.id!==m.id);l.unshift({...m,imgs:{}});localStorage.setItem(PG_MINE_KEY,JSON.stringify(l))}
async function pgMineDel(id){if(db){await storeCall(db,'readwrite',st=>st.delete('pmod:'+id));return}localStorage.setItem(PG_MINE_KEY,JSON.stringify((await pgMineList()).filter(x=>x.id!==id)))}
async function pgMineImgs(list){for(const m of list)for(const [id,x] of Object.entries(m.imgs||{}))if(!Pg.imgs.has(id)&&x?.blob)try{await pgRegister(id,x.blob,x.name)}catch(e){}}
async function pgMineRename(m){return false}
