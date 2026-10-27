// Scelta di più oggetti, gruppi, blocco, allineamento e distribuzione tra gli oggetti, guide intelligenti: lo stesso
// modello di Impagina. Un gruppo è un'etichetta g condivisa: i suoi oggetti stanno vicini nei livelli, si scelgono e
// si spostano insieme, e nel file SVG finiscono in un elemento <g>.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-selectAll" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><rect x="8" y="8" width="8" height="8" rx="1"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-group" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 2"/><rect x="6" y="6" width="6" height="6" rx="1"/><rect x="12" y="12" width="6" height="6" rx="1"/></symbol>
<symbol id="i-ungroup" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M14 4l6 6M20 4l-6 6"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>
<symbol id="i-distH" viewBox="0 0 24 24"><path d="M3 3v18M21 3v18"/><rect x="8" y="7" width="8" height="10" rx="1"/></symbol>
<symbol id="i-distV" viewBox="0 0 24 24"><path d="M3 3h18M3 21h18"/><rect x="7" y="8" width="10" height="8" rx="1"/></symbol>
<symbol id="i-magnet" viewBox="0 0 24 24"><path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z"/><path d="M6 7h4M14 7h4"/></symbol>`);
$('layList').setAttribute('aria-multiselectable','true');
$('layKeys').textContent='Frecce su e giù per scegliere un oggetto, Maiusc più frecce per aggiungere alla scelta quello sopra o sotto, Maiusc+clic per aggiungerlo o toglierlo, Alt+Maiusc più frecce per portarlo sopra o sotto gli altri, Invio per le proprietà, F2 per rinominarlo, Canc per eliminarlo, Maiusc+F10 per il menu.';
STATIC_KEYS.d[0][1].splice(3,0,['Aggiungi alla scelta l’oggetto sopra o sotto','Maiusc+PgSu / Maiusc+PgGiù'],['Aggancia la scelta alla guida successiva','Alt+Maiusc+← → ↑ ↓']);
STATIC_KEYS.d[1][1].splice(1,0,['Aggiungi alla scelta l’oggetto sopra o sotto','Maiusc+↑ / Maiusc+↓']);
STATIC_KEYS.d.push(['Con il puntatore',[['Aggiungi o togli un oggetto dalla scelta','Maiusc+clic'],['Scegli un oggetto solo dentro un gruppo','Alt+clic'],['Scegli gli oggetti dentro un riquadro','Trascina sul vuoto'],['Sposta senza agganciarti alle guide','Alt mentre trascini'],['Ridimensiona mantenendo le proporzioni','Maiusc sulle maniglie']]]);
const namesOf=items=>{const n=items.map(x=>'«'+x.name+'»');return n.length>6?n.slice(0,5).join(', ')+` e altri ${n.length-5}`:n.length>1?n.slice(0,-1).join(', ')+' e '+n.at(-1):n.join('')};
function boxOf(items){const b=items.map(box),x=Math.min(...b.map(v=>v.x)),y=Math.min(...b.map(v=>v.y));return{x,y,w:Math.max(...b.map(v=>v.x+v.w))-x,h:Math.max(...b.map(v=>v.y+v.h))-y}}
const groupIds=it=>it?.g?Dw.p.items.filter(x=>x.g===it.g).map(x=>x.id):it?[it.id]:[];
// Un gruppo scelto conta come un oggetto solo quando si allinea e si distribuisce.
const units=items=>[...items.reduce((m,it)=>m.set(it.g||it.id,[...(m.get(it.g||it.id)||[]),it]),new Map()).values()];
const hasFill=it=>it.kind!=='line'&&it.kind!=='image',hasStroke=it=>it.kind!=='text'&&it.kind!=='image';
function describeSel(){const many=selItems();if(many.length<2)return many[0]?describeItem(many[0]):'Nessun oggetto scelto';const B=boxOf(many);return `${many.length} oggetti scelti: ${namesOf(many)}; insieme x ${fmtInt(B.x)}, y ${fmtInt(B.y)}, ${fmtInt(B.w)} per ${fmtInt(B.h)}`}
// pick cambia la scelta senza ridisegnare (prima di una modifica, che ridisegna già); setSel ridisegna e annuncia.
function pick(ids,primary){Dw.sel=primary??null;Dw.multi={for:Dw.sel,ids}}
function selChanged({say=true}={}){Dw.last={label:'',t:0};Dw.lastAlign='';renderLayers();renderOverlay();renderProps();refreshToggles();sheetWrap.setAttribute('aria-label',sheetLabel());$('lay-'+Dw.sel)?.scrollIntoView({block:'nearest'});if(say)announce(Dw.sel?describeSel():'Nessun oggetto scelto: le proprietà sono quelle del foglio')}
function setSel(ids,primary,opts){ids=[...new Set(ids)].filter(itemOf);pick(ids,primary&&ids.includes(primary)?primary:ids.at(-1));selChanged(opts)}
// Aggiunge o toglie un oggetto, con il suo gruppo, dalla scelta.
function toggleSel(id){const it=itemOf(id);if(!it)return;const cur=new Set(selIds()),grp=groupIds(it),had=cur.has(id);for(const g of grp)had?cur.delete(g):cur.add(g);const rest=[...cur];setSel(rest,had?rest.at(-1):id,{say:false});
 announce(`${had?'Tolto dalla scelta':'Aggiunto alla scelta'}: «${it.name}»${grp.length>1?' con il suo gruppo':''}. ${rest.length===1?'Scelto un oggetto':rest.length?rest.length+' oggetti scelti':'Nessun oggetto scelto'}.`)}
function selectAll(){const items=Dw.p.items.filter(x=>!x.hidden);if(!items.length){toast('Il foglio è vuoto');return}setSel(items.map(x=>x.id),items.at(-1).id)}
// Riquadro di selezione: gli oggetti che ci stanno dentro per intero, con il loro gruppo; con Maiusc si aggiungono.
function marqueeSelect(m,add){const hit=Dw.p.items.filter(x=>!x.hidden&&!x.lock&&covers(m,box(x)));if(!hit.length&&!add.length){renderOverlay();announce('Nessun oggetto dentro il riquadro');return}setSel([...add,...hit.flatMap(groupIds)],hit.at(-1)?.id||Dw.sel)}
// Gli oggetti bloccati restano fermi: non si spostano, non si ridimensionano e non si eliminano.
function movable(items,what='spostarlo'){const ok=items.filter(x=>!x.lock),n=items.length-ok.length;if(n)toast(items.length===1?`«${items[0].name}» è bloccato: sbloccalo per ${what}`:`${n===1?'Un oggetto scelto è bloccato':n+' oggetti scelti sono bloccati'}${ok.length?' e resta'+(n>1?'no':'')+' com’è':': sbloccali con Ctrl+Maiusc+L'}`);return ok}
function needMany(n){const items=selItems();if(units(items).length<n){toast(`Scegli almeno ${n===2?'due':'tre'} oggetti: Maiusc+clic sul foglio, Maiusc+frecce nei livelli o Ctrl+A`);return null}return items}
// Raggruppa: gli oggetti vanno uno sopra l'altro nei livelli, all'altezza del più alto, nell'ordine che avevano.
function groupItems(){const items=needMany(2);if(!items)return;const g=uid(),ids=new Set(items.map(x=>x.id));
 editD('Raggruppa',p=>{const top=Math.max(...items.map(x=>p.items.indexOf(x))),rest=p.items.filter(x=>!ids.has(x.id));for(const it of items)it.g=g;rest.splice(p.items.slice(0,top+1).filter(x=>!ids.has(x.id)).length,0,...items);p.items=rest},{props:true});
 announce(`Gruppo di ${items.length} oggetti: si scelgono e si spostano insieme. Alt+clic sceglie un oggetto solo, Ctrl+Maiusc+G separa il gruppo.`)}
function ungroupItems(){const items=selItems().filter(x=>x.g);if(!items.length){toast('Gli oggetti scelti non sono in un gruppo');return}editD('Separa il gruppo',()=>{for(const it of items)delete it.g},{props:true});announce(`Gruppo separato: ${items.length} oggetti di nuovo indipendenti, ancora scelti`)}
function lockItems(){const items=needSel();if(!items.length)return;const on=!items.every(x=>x.lock),one=items.length===1;editD(on?'Blocca':'Sblocca',()=>{for(const it of items)it.lock=on},{props:true});
 announce(`${one?'«'+items[0].name+'»':items.length+' oggetti'} ${on?(one?'bloccato: non si sposta e non si elimina per sbaglio':'bloccati: non si spostano e non si eliminano per sbaglio'):(one?'sbloccato':'sbloccati')}`)}
function hideItems(){const items=needSel();if(!items.length)return;const on=!items.every(x=>x.hidden),one=items.length===1;editD(on?'Nascondi':'Mostra',()=>{for(const it of items)it.hidden=on},{props:true});
 announce(`${one?'«'+items[0].name+'»':items.length+' oggetti'} ${on?(one?'nascosto: resta nei livelli, ma non si vede e non va nei file':'nascosti: restano nei livelli, ma non si vedono e non vanno nei file'):(one?'di nuovo visibile':'di nuovo visibili')}`)}
// Allineamento tra gli oggetti scelti (al riquadro che li contiene tutti) e distribuzione a spazi uguali. Gli oggetti
// bloccati non si spostano ma contano per il riquadro: fanno da riferimento.
const ALIGN_MULTI={left:['a sinistra',(b,B)=>[B.x-b.x,0]],center:['al centro, in orizzontale',(b,B)=>[B.x+(B.w-b.w)/2-b.x,0]],right:['a destra',(b,B)=>[B.x+B.w-b.w-b.x,0]],top:['in alto',(b,B)=>[0,B.y-b.y]],middle:['al centro, in verticale',(b,B)=>[0,B.y+(B.h-b.h)/2-b.y]],bottom:['in basso',(b,B)=>[0,B.y+B.h-b.h-b.y]]};
function alignMulti(how,many){const B=boxOf(many),U=units(movable(many)),[say,fn]=ALIGN_MULTI[how];if(!U.length)return;
 if(editD('Allinea',()=>{for(const u of U){const [dx,dy]=fn(boxOf(u),B);for(const it of u){it.x=n2(it.x+dx);it.y=n2(it.y+dy)}}}))announce(`${units(many).length} oggetti allineati ${say} tra loro`);else toast(`Gli oggetti scelti sono già allineati ${say}`)}
function distribute(axis){const many=needMany(3);if(!many)return;const U=units(movable(many));if(U.length<3)return;const k=axis==='h'?'x':'y',s=axis==='h'?'w':'h',sorted=U.map(u=>[u,boxOf(u)]).sort((a,b)=>a[1][k]-b[1][k]),f=sorted[0][1],l=sorted.at(-1)[1],sum=sorted.reduce((n,[,b])=>n+b[s],0),gap=(l[k]+l[s]-f[k]-sum)/(sorted.length-1);let pos=f[k];
 if(editD('Distribuisci',()=>{for(const [u,b] of sorted){for(const it of u)it[k]=n2(it[k]+pos-b[k]);pos+=b[s]+gap}}))announce(`${sorted.length} oggetti distribuiti ${axis==='h'?'in orizzontale':'in verticale'}, con ${gap<0?'una sovrapposizione':'uno spazio'} di ${fmtInt(Math.abs(gap))} pixel tra l’uno e l’altro`);else toast('Gli oggetti sono già distribuiti a spazi uguali')}
// Guide intelligenti: i bordi e i centri del foglio e degli altri oggetti. Trascinando, la scelta si aggancia quando ci
// passa vicino; con Alt+Maiusc+frecce salta alla guida successiva; spostandola con le frecce si sente a che cosa è allineata.
const smartOn=()=>prefs.drawSmart!==false;
function snapLines(exclude){const p=Dw.p,X=[[0,'bordo sinistro del foglio'],[p.w/2,'centro del foglio'],[p.w,'bordo destro del foglio']],Y=[[0,'bordo superiore del foglio'],[p.h/2,'centro del foglio'],[p.h,'bordo inferiore del foglio']];
 for(const o of p.items){if(exclude.has(o.id)||o.hidden)continue;const b=box(o);X.push([b.x,`bordo sinistro di «${o.name}»`],[b.x+b.w/2,`centro di «${o.name}»`],[b.x+b.w,`bordo destro di «${o.name}»`]);Y.push([b.y,`bordo superiore di «${o.name}»`],[b.y+b.h/2,`centro di «${o.name}»`],[b.y+b.h,`bordo inferiore di «${o.name}»`])}return{X,Y}}
function snapNear(vals,lines,tol){let best=null;for(const [v,lab] of lines)for(const e of vals){const d=v-e;if(Math.abs(d)<=tol&&(!best||Math.abs(d)<Math.abs(best.d)))best={d,v,lab}}return best}
const guideSay=g=>g.length?': allineato '+g.map(x=>'al '+x.lab).join(' e '):'';
function alignSay(items){const B=boxOf(items),L=snapLines(new Set(items.map(x=>x.id))),out=[];
 for(const [lines,edges] of [[L.X,[[B.x,'il bordo sinistro'],[B.x+B.w/2,'il centro in orizzontale'],[B.x+B.w,'il bordo destro']]],[L.Y,[[B.y,'il bordo superiore'],[B.y+B.h/2,'il centro in verticale'],[B.y+B.h,'il bordo inferiore']]]])
  for(const [e,elab] of edges){const hit=lines.find(([v])=>Math.abs(v-e)<.5);if(hit){out.push(`${elab} è allineato al ${hit[1]}`);break}}
 return out.join('; ')}
function snapStep(ax,ay){const many=selItems();if(!many.length){needItem();return}const items=movable(many);if(!items.length)return;const B=boxOf(items),L=snapLines(new Set(items.map(x=>x.id))),dir=ax||ay,edges=ax?[[B.x,'il bordo sinistro'],[B.x+B.w/2,'il centro'],[B.x+B.w,'il bordo destro']]:[[B.y,'il bordo superiore'],[B.y+B.h/2,'il centro'],[B.y+B.h,'il bordo inferiore']];let best=null;
 for(const [v,lab] of ax?L.X:L.Y)for(const [e,elab] of edges){const d=v-e;if(d*dir>.5&&(!best||Math.abs(d)<Math.abs(best.d)))best={d,lab,elab}}
 if(!best){toast('Nessuna guida in quella direzione');return}editD('Aggancia alla guida',()=>{for(const it of items){if(ax)it.x=n2(it.x+best.d);else it.y=n2(it.y+best.d)}});Dw.lastAlign=alignSay(items);
 announce(`${items.length>1?'Gli oggetti scelti':'«'+items[0].name+'»'}: ${best.elab} è allineato al ${best.lab}`)}
// Frecce sul foglio: la scelta si sposta; se finisce allineata a qualcosa lo si sente, una volta sola.
function moveKeys(many,ax,ay,step){const ok=movable(many);if(!ok.length||!editD('Sposta',()=>{for(const x of ok){x.x+=ax*step;x.y+=ay*step}},{merge:true}))return;const B=boxOf(ok),a=alignSay(ok);
 announce(`${ok.length>1?ok.length+' oggetti, ':''}x ${fmtInt(B.x)}, y ${fmtInt(B.y)}${a&&a!==Dw.lastAlign?'. '+a:''}`);Dw.lastAlign=a}
// Più oggetti si ridimensionano insieme sul riquadro che li contiene: posizioni e misure in proporzione, i testi
// cambiano dimensione. B è il riquadro di prima, N quello nuovo.
function scaleItem(it,o,B,N){const sx=B.w?N.w/B.w:1,sy=B.h?N.h/B.h:1,b=box(o),nx=N.x+(b.x-B.x)*sx,ny=N.y+(b.y-B.y)*sy;
 if(it.kind==='text'){it.size=Math.max(1,Math.round(o.size*Math.min(sx,sy)));measureText(it)}else{it.w=n2(o.w*sx);it.h=n2(o.h*sy);fitGeometry(it,o)}
 const nb=box(it);it.x=n2(it.x+nx-nb.x);it.y=n2(it.y+ny-nb.y)}
function scaleDrag(d,dx,dy,shift){const B=d.B,H=d.h;let x=B.x,y=B.y,w=B.w,h=B.h;if(H.includes('e'))w=B.w+dx;if(H.includes('s'))h=B.h+dy;if(H.includes('w')){w=B.w-dx;x=B.x+dx}if(H.includes('n')){h=B.h-dy;y=B.y+dy}w=Math.max(1,w);h=Math.max(1,h);
 if(shift&&B.w&&B.h){const k=Math.max(w/B.w,h/B.h);w=B.w*k;h=B.h*k;if(H.includes('w'))x=B.x+B.w-w;if(H.includes('n'))y=B.y+B.h-h}for(const [it,o] of d.os)scaleItem(it,o,B,{x,y,w,h})}
function scaleKeys(many,ax,ay,step){const ok=movable(many,'ridimensionarlo');if(!ok.length)return;const B=boxOf(ok),N={x:B.x,y:B.y,w:Math.max(1,B.w+ax*step),h:Math.max(1,B.h+ay*step)},os=ok.map(x=>[x,structuredClone(x)]);
 if(editD('Ridimensiona',()=>{for(const [it,o] of os)scaleItem(it,o,B,N)},{merge:true}))announce(`${ok.length} oggetti, insieme ${fmtInt(N.w)} per ${fmtInt(N.h)}`)}
// Proprietà di più oggetti: posizione del riquadro comune, colori, contorno e opacità per tutti, e i comandi per disporli.
function multiProps(many){const B=boxOf(many),f=many.find(x=>hasFill(x)&&x.fill!=='none'),s=many.find(hasStroke),btn=id=>{const c=C[id];return `<button type="button" class="btn sm" id="pm-${id}" data-action="${id}"${c.toggle?` aria-pressed="${!!safe(c.toggle)}"`:''} aria-label="${esc(c.label)}" data-tip="${esc(c.label)}">${ICON(c.icon)}</button>`};
 return `<p class="hint">${esc(describeSel())}. Qui le modifiche valgono per tutti; per un oggetto solo sceglilo nei livelli.</p><div class="row2"><div>${fld('mx','X',n2(B.x))}</div><div>${fld('my','Y',n2(B.y))}</div></div>`
  +(f?colorFld('fill','Riempimento',f.fill):'')+(s?colorFld('stroke','Contorno',s.stroke)+fld('sw','Spessore del contorno (px)',s.sw):'')+rangeFld('opacity','Opacità',0,100,1,selItem().opacity,v=>fmtInt(v)+'%')
  +`<h3>Disponi</h3><div class="btns">${['groupItems','ungroupItems','lockItems','hideItems'].map(btn).join('')}</div><div class="btns">${['alignLeft','alignCenter','alignRight','alignTop','alignMiddle','alignBottom','distH','distV'].map(btn).join('')}</div>`}
function syncMulti(){if(!$('pr-mx')){renderProps();return}const a=document.activeElement,B=boxOf(selItems());for(const [k,v] of [['mx',n2(B.x)],['my',n2(B.y)]]){const el=$('pr-'+k);if(el!==a)el.value=v}}
function applyMulti(key,v,need){const many=selItems(),ok=many.filter(x=>!x.lock);
 if(key==='mx'||key==='my'){if(!ok.length)throw Error('Gli oggetti scelti sono bloccati');const k=key==='mx'?'x':'y',d=need(-1e5,1e5)-boxOf(ok)[k];for(const it of ok)it[k]=n2(it[k]+d)}
 else if(key==='opacity')for(const it of many)it.opacity=Number(v);
 else if(key==='fill'||key==='stroke'){for(const it of many)if(key==='fill'?hasFill(it):hasStroke(it))it[key]=v}
 else if(key==='sw'){const n=need(0,1000);for(const it of many)if(hasStroke(it))it.sw=n}}
// Lo strumento torna allo stato di riposo (per esempio dopo Annulla o quando cambia la scelta).
function toolReset(){for(const T of Object.values(TOOLS))T.reset?.()}
