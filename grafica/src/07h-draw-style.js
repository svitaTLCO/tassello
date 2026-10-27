// Stile: sfumature lineari e radiali con i punti di colore, tratteggio, estremità e angoli del contorno, ombra e
// sfocatura (filtri SVG), fusione con gli oggetti sotto. Per i testi: spaziatura tra le lettere, testo a capo dentro il
// riquadro e testo lungo una curva, presa da un tracciato o da una forma. Tutto è SVG 1.1 (più mix-blend-mode), così il
// file si vede uguale negli altri programmi e nelle immagini esportate.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-gradient" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M11 3v18M15 3v18" stroke-dasharray="2 2"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4z" fill="currentColor"/></symbol>
<symbol id="i-shadow" viewBox="0 0 24 24"><rect x="3" y="3" width="13" height="13" rx="1.5"/><path d="M19 8v11H8" stroke-width="3" opacity=".55"/></symbol>
<symbol id="i-textPath" viewBox="0 0 24 24"><path d="M3 19C7 9 17 9 21 19" stroke-dasharray="2 2"/><path d="M7 12l2-6 2 6M7.7 10h2.6M14 5v7M14 5h2.5a1.7 1.7 0 0 1 0 3.5H14h3a1.8 1.8 0 0 1 0 3.5h-3"/></symbol>`);
const fillOf=it=>it.fill==='none'?'none':it.grad&&hasFill(it)?`url(#gr-${it.id})`:esc(it.fill);
const DASH={dash:w=>[3*w,2*w],dot:(w,c)=>c==='round'?[0,2*w]:[w,w],dashdot:(w,c)=>[4*w,2*w,c==='round'?0:w,2*w]};
// Attributi del contorno; round dà estremità e angoli tondi se non sono scelti (linee e tracciati).
function strokeAttrs(it,round=false){if(!(it.sw>0)||it.stroke==='none')return '';const cap=it.cap||(round?'round':''),join=it.join||(round?'round':''),d=DASH[it.dash];
 return ` stroke="${esc(it.stroke)}" stroke-width="${it.sw}"${d?` stroke-dasharray="${d(it.sw,cap).map(n2).join(' ')}"`:''}${cap?` stroke-linecap="${cap}"`:''}${join?` stroke-linejoin="${join}"`:''}`}
function gradDefs(it){const g=it.grad,a=(g.angle??90)*Math.PI/180,c=Math.cos(a)/2,s=Math.sin(a)/2,stops=[...g.stops].sort((p,q)=>p.o-q.o).map(t=>`<stop offset="${t.o/100}" stop-color="${esc(t.c)}"/>`).join('');
 return g.type==='radial'?`<radialGradient id="gr-${it.id}" cx="0.5" cy="0.5" r="0.5">${stops}</radialGradient>`:`<linearGradient id="gr-${it.id}" x1="${n2(.5-c)}" y1="${n2(.5-s)}" x2="${n2(.5+c)}" y2="${n2(.5+s)}">${stops}</linearGradient>`}
// Riquadro dell'oggetto ruotato, nelle coordinate del foglio: l'ombra resta nella stessa direzione anche se l'oggetto gira.
function rotBox(it){const b=box(it);if(!it.rot)return b;const cx=b.x+b.w/2,cy=b.y+b.h/2,r=it.rot*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),w=b.w*c+b.h*s,h=b.w*s+b.h*c;return {x:cx-w/2,y:cy-h/2,w,h}}
function fxDefs(it){const sh=it.shadow,bl=it.blur||0;if(!sh&&!bl)return '';const b=rotBox(it),m=Math.ceil(bl*3+(sh?Math.max(Math.abs(sh.x),Math.abs(sh.y))+sh.blur*3:0)+(it.sw||0)+(it.kind==='text'?it.size:0)+2);
 let f=bl?`<feGaussianBlur in="SourceGraphic" stdDeviation="${n2(bl/2)}" result="src"/>`:'';
 if(sh)f+=`<feGaussianBlur in="${bl?'src':'SourceAlpha'}" stdDeviation="${n2(sh.blur/2)}" result="b"/><feOffset in="b" dx="${sh.x}" dy="${sh.y}" result="o"/><feFlood flood-color="${esc(sh.color)}" flood-opacity="${sh.op/100}"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="${bl?'src':'SourceGraphic'}"/></feMerge>`;
 return `<filter id="fx-${it.id}" filterUnits="userSpaceOnUse" x="${n2(b.x-m)}" y="${n2(b.y-m)}" width="${n2(b.w+2*m)}" height="${n2(b.h+2*m)}" color-interpolation-filters="sRGB">${f}</filter>`}
// L'oggetto con le sue definizioni (sfumatura, filtro) e, se servono, dentro un gruppo con il filtro e la fusione.
function styled(it,s){const defs=(it.grad&&it.fill!=='none'&&hasFill(it)?gradDefs(it):'')+fxDefs(it),fx=it.shadow||it.blur,bl=it.blend&&it.blend!=='normal';if(!defs&&!bl)return s;
 return (defs?`<defs>${defs}</defs>`:'')+(fx||bl?`<g${fx?` filter="url(#fx-${it.id})"`:''}${bl?` style="mix-blend-mode:${it.blend}"`:''}>${s}</g>`:s)}
const BLENDS=[['normal','Normale'],['multiply','Moltiplica'],['screen','Scolora'],['overlay','Sovrapponi'],['darken','Scurisci'],['lighten','Schiarisci'],['color-dodge','Colore scherma'],['color-burn','Colore brucia'],['hard-light','Luce intensa'],['soft-light','Luce soffusa'],['difference','Differenza'],['exclusion','Esclusione'],['hue','Tonalità'],['saturation','Saturazione'],['color','Colore'],['luminosity','Luminosità']];
function styleSay(it){const blend=BLENDS.find(b=>b[0]===it.blend&&it.blend!=='normal');return [it.grad&&it.fill!=='none'&&`sfumatura ${it.grad.type==='radial'?'radiale':'lineare'} di ${it.grad.stops.length} colori`,DASH[it.dash]&&it.sw>0&&'contorno tratteggiato',it.shadow&&'con l’ombra',it.blur&&`sfocato di ${fmtInt(it.blur)} pixel`,blend&&'fusione '+blend[1].toLowerCase()].filter(Boolean).map(s=>', '+s).join('')}
// Testo: le righe scritte, oppure quelle che vanno a capo da sole dentro la larghezza del riquadro.
function textLines(it){const paras=String(it.text).split('\n');if(!it.wrap)return paras;measureCtx.font=fontCss(it);const ls=it.ls||0,wid=s=>measureCtx.measureText(s).width+ls*[...s].length,out=[];
 for(const p of paras){let line='';for(const w of p.split(/ +/)){const t=line?line+' '+w:w;if(line&&wid(t)>it.w){out.push(line);line=w}else line=t}out.push(line)}return out}
function textOnPath(){const many=selItems(),t=many.find(x=>x.kind==='text'),g=many.find(x=>x!==t&&(x.kind==='path'||SHAPE_SUBS[x.kind]));
 if(!t||!g||many.length!==2){toast('Scegli un testo e un tracciato o una forma, insieme: Maiusc+clic sul foglio o Maiusc+frecce nei livelli');return}if(t.lock){toast(`«${t.name}» è bloccato`);return}
 editD('Testo lungo un tracciato',()=>{const b=box(g),subs=structuredClone(g.kind==='path'?g.subs:SHAPE_SUBS[g.kind](g)),ox=g.kind==='path'?g.x:b.x,oy=g.kind==='path'?g.y:b.y;
  // La rotazione del tracciato passa nei nodi: la curva del testo è già dove si vede.
  if(g.rot){const r=g.rot*Math.PI/180,c=Math.cos(r),s=Math.sin(r),cx=b.x+b.w/2-ox,cy=b.y+b.h/2-oy,R=(x,y)=>[c*x-s*y,s*x+c*y];for(const sb of subs)for(const n of sb.nodes){[n.x,n.y]=R(n.x-cx,n.y-cy);n.x+=cx;n.y+=cy;[n.ix,n.iy]=R(n.ix,n.iy);[n.ox,n.oy]=R(n.ox,n.oy)}}
  Object.assign(t,{subs,x:ox,y:oy,rot:0,wrap:false});normPath(t)},{props:true});pick([t.id],t.id);selChanged({say:false});
 announce(`«${t.name}» ora segue la curva di «${g.name}». Il tracciato resta com’è: puoi nasconderlo o eliminarlo; lo strumento Nodi cambia la curva del testo.`)}
function textOffPath(){const t=selItem();if(t?.kind!=='text'||!t.subs){toast('Scegli un testo che segue una curva');return}editD('Togli il testo dalla curva',()=>{delete t.subs;delete t.toff;measureText(t)},{props:true});announce(`«${t.name}» è di nuovo un testo su righe dritte`)}
function textPathSvg(it,{id,tr,op,hit,font}){const d=pathD(it),anchor=it.align==='center'?'middle':it.align==='right'?'end':'start',off=it.toff??(it.align==='center'?50:it.align==='right'?100:0);
 return `<g${id}${tr}${op}>${hit?`<path d="${d}" fill="none" stroke="transparent" stroke-width="${it.size}" pointer-events="stroke"/>`:''}<defs><path id="tp-${it.id}" d="${d}"/></defs><text ${font} fill="${fillOf(it)}" text-anchor="${anchor}"${it.ls?` letter-spacing="${it.ls}"`:''}><textPath href="#tp-${it.id}" xlink:href="#tp-${it.id}" startOffset="${n2(off)}%">${esc(String(it.text).replace(/\n/g,' '))}</textPath></text></g>`}
// Campi delle proprietà: sfumatura con i suoi punti di colore, contorno, testo ed effetti.
function gradFields(it){const g=it.grad;let h=selFld('gtype','Sfumatura del riempimento',g?.type||'none',[['none','Nessuna: colore pieno'],['linear','Lineare'],['radial','Radiale, dal centro']]);if(!g)return h;
 if(g.type==='linear')h+=fld('gangle','Direzione in gradi: 0 da sinistra a destra, 90 dall’alto in basso',g.angle??90);
 return h+g.stops.map((s,i)=>`<div class="row2"><div>${colorFld(`gstop.${i}.c`,`Punto ${i+1}: colore`,s.c)}</div><div>${fld(`gstop.${i}.o`,`Punto ${i+1}: posizione (%)`,s.o)}</div></div>${g.stops.length>2?`<button type="button" class="btn sm" id="pr-gdel-${i}" data-gdel="${i}">Togli il punto ${i+1}</button>`:''}`).join('')
  +`<div class="btns"><button type="button" class="btn sm" id="pr-gadd" data-gadd="1">${ICON('plus')}Aggiungi un punto di colore</button></div>`}
function strokeFields(it){const round=['line','path','poly','arrow','bubble'].includes(it.kind);return selFld('dash','Tratteggio del contorno',it.dash||'none',[['none','Linea continua'],['dash','Tratteggiata'],['dot','A punti'],['dashdot','Tratto e punto']])
 +`<div class="row2"><div>${selFld('cap','Estremità',it.cap||(round?'round':'butt'),[['butt','Piatte'],['round','Tonde'],['square','Quadrate']])}</div><div>${selFld('join','Angoli',it.join||(round?'round':'miter'),[['miter','Vivi'],['round','Arrotondati'],['bevel','Smussati']])}</div></div>`}
function textFields(it){return fld('ls','Spaziatura tra le lettere (px)',it.ls||0)+(it.subs?fld('toff','Inizio lungo la curva (%)',it.toff??(it.align==='center'?50:it.align==='right'?100:0))+`<div class="btns"><button type="button" class="btn sm" id="pm-textOffPath" data-action="textOffPath">Togli il testo dalla curva</button></div>`
 :`<label class="check"><input type="checkbox" data-prop="wrap"${it.wrap?' checked':''}> A capo dentro il riquadro</label>`+(it.wrap?fld('w','Larghezza del riquadro (px)',it.w):''))}
function fxFields(it){const sh=it.shadow;return `<h3>Effetti</h3><label class="check"><input type="checkbox" data-prop="shadowOn"${sh?' checked':''}> Ombra</label>`
 +(sh?`<div class="row2"><div>${fld('sx','Ombra: spostamento x (px)',sh.x)}</div><div>${fld('sy','Ombra: spostamento y (px)',sh.y)}</div></div>${fld('sblur','Ombra: sfocatura (px)',sh.blur)}${colorFld('scolor','Colore dell’ombra',sh.color)}${rangeFld('sop','Opacità dell’ombra',0,100,1,sh.op,pct)}`:'')
 +fld('blur','Sfocatura dell’oggetto (px)',it.blur||0)+selFld('blend','Fusione con gli oggetti sotto',it.blend||'normal',BLENDS)}
function styleProps(it){return (hasFill(it)&&it.tool!=='pencil'?gradFields(it):'')+(hasStroke(it)&&it.tool!=='brush'?strokeFields(it):'')+(it.kind==='text'?textFields(it):'')+fxFields(it)}
const newShadow=()=>{const s=Math.min(Dw.p.w,Dw.p.h);return {x:Math.round(s/100),y:Math.round(s/100),blur:Math.round(s/50),color:'#000000',op:35}};
function applyStyleProp(it,key,v,need){const g=it.grad,m=/^gstop\.(\d+)\.(c|o)$/.exec(key),SH={sx:'x',sy:'y',sblur:'blur'};
 if(key==='gtype'){if(v==='none')delete it.grad;else{it.grad={type:v,angle:g?.angle??90,stops:g?.stops||[{o:0,c:it.fill==='none'?'#0e6f8a':it.fill},{o:100,c:'#ffffff'}]};if(it.fill==='none')it.fill=it.grad.stops[0].c}}
 else if(key==='gangle')g.angle=((need(-360,360)%360)+360)%360;
 else if(m){const s=g.stops[+m[1]];if(m[2]==='c')s.c=v;else s.o=Math.round(need(0,100))}
 else if(['dash','cap','join','blend'].includes(key))it[key]=v;
 else if(key==='shadowOn'){if(v)it.shadow=newShadow();else delete it.shadow}
 else if(SH[key])it.shadow[SH[key]]=need(key==='sblur'?0:-2000,2000);else if(key==='sop')it.shadow.op=Number(v);else if(key==='scolor')it.shadow.color=v;
 else if(key==='blur'){const n=need(0,500);if(n)it.blur=n;else delete it.blur}
 else if(key==='ls'){it.ls=need(-100,1000);measureText(it)}else if(key==='wrap'){it.wrap=!!v;measureText(it)}else if(key==='toff')it.toff=need(0,100);
 else return false;return true}
// Punti di colore della sfumatura: Aggiungi ne mette uno a metà tra gli ultimi due, Togli quello accanto.
$('propBody').addEventListener('click',e=>{const it=selItem(),a=e.target.closest('[data-gadd],[data-gdel]');if(!a||!it?.grad)return;const g=it.grad;
 if(a.dataset.gadd){editD('Aggiungi un punto di colore',()=>{const s=[...g.stops].sort((p,q)=>p.o-q.o),i=s.length-1;g.stops.push({o:Math.round((s[i-1].o+s[i].o)/2),c:s[i].c})},{props:true});$(`pr-gstop.${g.stops.length-1}.c`)?.focus();announce(`Aggiunto il punto ${g.stops.length}, alla posizione ${g.stops.at(-1).o}%: scegli il colore`)}
 else{const i=+a.dataset.gdel;editD('Togli un punto di colore',()=>g.stops.splice(i,1),{props:true});$('pr-gadd')?.focus();announce(`Punto ${i+1} tolto: restano ${g.stops.length} punti di colore`)}});
// Comandi: la sfumatura e l'ombra si accendono e si spengono sugli oggetti scelti.
function toggleGrad(){const many=needSel().filter(x=>hasFill(x)&&x.tool!=='pencil');if(!many.length){if(selItems().length)toast('La sfumatura vale per i riempimenti: non per linee, immagini e tratti di matita');return}const on=!many.every(x=>x.grad);
 editD(on?'Sfumatura':'Togli la sfumatura',()=>{for(const it of many)applyStyleProp(it,'gtype',on?'linear':'none')},{props:true});announce(on?`Sfumatura lineare dall’alto in basso: i punti di colore sono nelle proprietà`:'Sfumatura tolta: il riempimento torna di un colore')}
function toggleShadow(){const many=needSel();if(!many.length)return;const on=!many.every(x=>x.shadow);editD(on?'Ombra':'Togli l’ombra',()=>{for(const it of many)applyStyleProp(it,'shadowOn',on)},{props:true});announce(on?'Ombra aggiunta, in basso a destra: spostamento, sfocatura e colore sono nelle proprietà':'Ombra tolta')}
Object.assign(KIND_SAY,{text:it=>it.subs?', lungo una curva':it.wrap?`, a capo in un riquadro largo ${fmtInt(it.w)} pixel`:''});
