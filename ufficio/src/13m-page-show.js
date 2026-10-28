// Presentazione: le pagine a schermo intero, una alla volta, comprese quelle ripetute per le righe dei dati. Frecce,
// Spazio, PgSu e PgGiù cambiano pagina, Inizio e Fine vanno alla prima e all'ultima, Esc esce; un clic va avanti.
// A ogni pagina lo screen reader sente il numero e quello che c'è scritto, nell'ordine di lettura.
let pgShowSt=null;
function pgPresent(){const p=Pg.p;pgStorySync();const insts=pgInstances(p);if(!insts.length)return;let el=$('pgShow');
 if(!el){el=Object.assign(document.createElement('div'),{id:'pgShow',tabIndex:-1,hidden:true});el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-roledescription','presentazione');document.body.append(el);
  el.innerHTML='<div class="pg-show-page"></div><p class="pg-show-bar" aria-hidden="true"></p><p class="sr-only" aria-live="polite"></p>';el.addEventListener('click',()=>pgShowGo(pgShowSt.i+1));el.addEventListener('contextmenu',e=>{e.preventDefault();pgShowGo(pgShowSt.i-1)})}
 pgShowSt={insts,lay:pgLayout(p,insts),i:0,prev:document.activeElement};el.hidden=false;el.focus();el.requestFullscreen?.().catch(()=>{});
 pgShowGo(Math.max(0,insts.findIndex(I=>I.i===Pg.pi&&(I.ri<0||I.ri===Math.min(Pg.row,(p.data?.rows.length||1)-1)))),true)}
// A parole: la descrizione della pagina se c'è, altrimenti i testi, le insegne, le immagini descritte, i codici e le tabelle,
// prima quelli della pagina e poi quelli del mastro (il numero di pagina, l'intestazione).
function pgShowSay(I){const p=Pg.p,ctx={n:I.n,total:I.total,row:I.row,title:p.title,date:pgToday()};if(I.pg.alt?.trim())return fillFields(I.pg.alt,ctx);const m=pgMasterOf(I.pg),out=[];
 for(const it of [...pgReadOrder(I.pg),...(m?pgReadOrder(m):[])]){if(it.deco||it.hidden)continue;let t='';if(it.kind==='text'){const L=pgShowSt.lay.get(pgShowSt.insts.indexOf(I)+'|'+it.id);t=(L?.lines||[]).map(l=>l.pieces.map(pc=>pc.t).join('')).join(' ')}
  else if(it.kind==='sign')t=pgSignMetrics(it,ctx).lines.join(' ');else if(it.kind==='image')t=it.alt?'Immagine: '+fillFields(it.alt,ctx):'';else if(it.kind==='qr')t=pgQrSay(it,ctx);else if(it.kind==='table')t=pgTableSay(it);else t=it.alt||'';
  if(t.trim())out.push(t.replace(/\s+/g,' ').trim())}return out.join('. ')||'Pagina senza testo.'}
function pgShowGo(i,first=false){const S=pgShowSt;if(!S)return;if(!first&&(i<0||i>=S.insts.length)){toast(i<0?'Sei sulla prima pagina':'Fine della presentazione: Esc per uscire');return}S.i=clampV(i,0,S.insts.length-1);
 const p=Pg.p,I=S.insts[S.i],el=$('pgShow'),label=`Pagina ${S.i+1} di ${S.insts.length}`;el.firstChild.innerHTML=`<svg viewBox="0 0 ${pr2(p.w)} ${pr2(p.h)}" aria-hidden="true" focusable="false">${pgPageSvg(p,I,S.i,S.lay)}</svg>`;el.children[1].textContent=`${S.i+1} / ${S.insts.length} · frecce per cambiare pagina, Esc per uscire`;
 el.setAttribute('aria-label',`Presentazione di «${p.title}», ${label}`);
 // L'annuncio sta dentro la finestra della presentazione, così si sente anche mentre il resto del programma è nascosto.
 const live=el.children[2];live.textContent='';setTimeout(()=>{live.textContent=`${first?'Presentazione a schermo intero: frecce o Spazio per andare avanti, Esc per uscire. ':''}${label}. ${pgShowSay(I)}`},70)}
function pgShowEnd(){const S=pgShowSt;if(!S)return;pgShowSt=null;const el=$('pgShow');el.hidden=true;el.firstChild.replaceChildren();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});(S.prev&&document.contains(S.prev)?S.prev:pgStage).focus();announce('Presentazione finita')}
document.addEventListener('fullscreenchange',()=>{if(pgShowSt&&!document.fullscreenElement)pgShowEnd()});
// Durante la presentazione i tasti valgono solo per lei (questo ascoltatore viene prima di quello dei comandi).
window.addEventListener('keydown',e=>{if(!pgShowSt)return;const k=e.key,S=pgShowSt,go={ArrowRight:1,ArrowDown:1,PageDown:1,' ':1,Enter:1,ArrowLeft:-1,ArrowUp:-1,PageUp:-1,Backspace:-1}[k];e.preventDefault();e.stopImmediatePropagation();
 if(go)pgShowGo(S.i+go);else if(k==='Home')pgShowGo(0);else if(k==='End')pgShowGo(S.insts.length-1);else if(k==='Escape')pgShowEnd();else if(k==='Tab')$('pgShow').focus()},true);
