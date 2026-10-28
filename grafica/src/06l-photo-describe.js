// Immagini a parole, per chi non vede la foto: l'effetto di una modifica quando ci si ferma, la luce e l'istogramma da
// percorrere e da ascoltare, le zone con i colori e la dominante, il confronto con l'originale e lo strumento Esplora.
// Le misure si fanno a richiesta su circa 60.000 pixel dell'anteprima, come in describeMask: costano pochi millisecondi.
$$('svg defs')[0].insertAdjacentHTML('beforeend',`<symbol id="i-explore" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.2"/></symbol>`);
const ZONE_NAME=['in alto a sinistra','in alto al centro','in alto a destra','al centro a sinistra','al centro','al centro a destra','in basso a sinistra','in basso al centro','in basso a destra'];
// Misure campionate: nove zone in terzi, colori per nome, saturazione, gamma tonale (2° e 98° percentile), calore
// dell'insieme e i grigi di luce media, che dicono la dominante quando ce ne sono abbastanza.
function photoSample(img){const w=img.width,h=img.height,d=img.data,step=Math.max(1,Math.floor(Math.sqrt(w*h/60000))),HY=new Uint32Array(256),col=new Map(),Z=ZONE_NAME.map(()=>({n:0,y:0,hi:0,lo:0,col:new Map()}));let n=0,sat=0,R=0,B=0,gr=0,gg=0,gb=0,gn=0;
 for(let y=0;y<h;y+=step){const zy=Math.min(2,y*3/h|0);for(let x=0;x<w;x+=step){const i=(y*w+x)*4;if(d[i+3]<8)continue;const r=d[i],g=d[i+1],b=d[i+2],L=(54*r+183*g+19*b)>>8,mx=Math.max(r,g,b),mn=Math.min(r,g,b),name=colorName(r,g,b),z=Z[zy*3+Math.min(2,x*3/w|0)];
  n++;HY[L]++;sat+=mx?(mx-mn)/mx:0;R+=r;B+=b;col.set(name,(col.get(name)||0)+1);z.n++;z.y+=L;z.col.set(name,(z.col.get(name)||0)+1);if(mx>=253)z.hi++;else if(mx<=2)z.lo++;
  if(mx-mn<.2*mx&&L>40&&L<215){gr+=S2L[r];gg+=S2L[g];gb+=S2L[b];gn++}}}
 const pc=p=>{const t=n*p;let a=0;for(let i=0;i<256;i++){a+=HY[i];if(a>=t)return i/255}return 1};
 return {n,zones:Z,col,sat:n?sat/n:0,warm:R+B?(R-B)/(R+B):0,p2:pc(.02),p98:pc(.98),gray:gn>=Math.max(150,n*.02)?{r:gr/gn,g:gg/gn,b:gb/gn}:null}}
const lightWord=m=>m<.15?'molto scura':m<.3?'scura':m<.42?'un po’ scura':m<.58?'di luce media':m<.7?'un po’ chiara':m<.85?'chiara':'molto chiara';
const satWord=s=>s<.08?'quasi senza colore':s<.2?'colori tenui':s<.4?'colori pieni':'colori molto vivi';
const topCols=(map,n,k=3,min=.06)=>[...map].sort((a,b)=>b[1]-a[1]).filter(([,c])=>c/n>=min).slice(0,k);
// Dominante: quanto i grigi pendono verso il caldo o il freddo e verso il verde o il magenta, nella scala dei cursori
// Temperatura e Tinta (la stessa della regolazione automatica): il valore che la toglierebbe.
function castOf(s){const g=s.gray;return g?{t:Math.round((g.b-g.r)/(g.r+g.b)*120),u:Math.round((g.g-(g.r+g.b)/2)/g.g*120)}:null}
function castSay(c){if(!c)return 'Non ci sono abbastanza grigi per stimare la dominante.';const a=Math.abs(c.t),b=Math.abs(c.u),out=[];
 if(a>=4)out.push(`${a<10?'leggera ':''}${c.t<0?'calda':'fredda'}: Temperatura ${fmtSigned(clamp(c.t,-100,100))} la toglierebbe`);
 if(b>=4)out.push(`${b<10?'leggera ':''}verso il ${c.u>0?'verde':'magenta'}: Tinta ${fmtSigned(clamp(c.u,-100,100))} la toglierebbe`);
 return out.length?'Dominante '+out.join('; ')+'.':'Nessuna dominante: i grigi sono neutri.'}
// Zone: la più chiara e la più scura, con il colore prevalente, la luce e le parti bruciate o chiuse.
function zoneOf(z){return {c:topCols(z.col,z.n,1,0)[0]?.[0]||'vuota',y:z.n?z.y/z.n/255:0,hi:z.n?z.hi/z.n:0,lo:z.n?z.lo/z.n:0}}
const zoneText=Z=>`${Z.c}, luce ${fmtPct(Z.y)}${Z.hi>=.01?`, bruciata per il ${fmtPct(Z.hi)}`:''}${Z.lo>=.01?`, chiusa per il ${fmtPct(Z.lo)}`:''}`;
function zonesSay(s){const Z=s.zones.map(zoneOf),idx=[...Z.keys()].filter(i=>s.zones[i].n);if(!idx.length)return 'La foto è tutta trasparente.';const hi=idx.reduce((a,b)=>Z[b].y>Z[a].y?b:a),lo=idx.reduce((a,b)=>Z[b].y<Z[a].y?b:a);
 return Z[hi].y-Z[lo].y<.08?`La luce è uniforme in tutta la foto, intorno al ${fmtPct(Z[hi].y)}.`:`La parte più chiara è ${ZONE_NAME[hi]} (${zoneText(Z[hi])}); la più scura ${ZONE_NAME[lo]} (${zoneText(Z[lo])}).`}
const colorsSay=s=>`Colori: ${topCols(s.col,s.n).map(([k,c])=>`${k} ${fmtPct(c/s.n)}`).join(', ')||'molti, nessuno prevalente'}; ${satWord(s.sat)}.`;
// Effetto di una modifica: le misure di prima (a) e di dopo (b), {st: measure, s: photoSample}. Solo ciò che cambia oltre
// una soglia (luce media di un punto, gamma tonale di due, saturazione di due, parti bruciate o chiuse di 0,2), con le
// soglie superate per prime e le buone notizie.
function effectSay(a,b){const A=a.st,B=b.st,out=[],warn=[],p1=v=>fmtPct(v,1),tone=(x,y)=>`${fmtInt(x*100)}–${fmtPct(y)}`;
 if(Math.abs(B.mean-A.mean)>=.01)out.push(`Luminosità media da ${fmtPct(A.mean)} a ${fmtPct(B.mean)}.`);
 const da=a.s.p98-a.s.p2,db=b.s.p98-b.s.p2;if(Math.abs(b.s.p2-a.s.p2)>=.02||Math.abs(b.s.p98-a.s.p98)>=.02)out.push(`Toni da ${tone(a.s.p2,a.s.p98)} a ${tone(b.s.p2,b.s.p98)}${Math.abs(db-da)>=.03?(db>da?': più contrasto':': meno contrasto'):''}.`);
 if(Math.abs(b.s.sat-a.s.sat)>=.02)out.push(`Colori ${b.s.sat>a.s.sat?'più vivi':'più tenui'}: saturazione media da ${fmtPct(a.s.sat)} a ${fmtPct(b.s.sat)}.`);
 if(Math.abs(b.s.warm-a.s.warm)>=.015)out.push(b.s.warm>a.s.warm?'Più calda.':'Più fredda.');
 for(const [k,name,good] of [['high','luci bruciate','recuperate'],['low','ombre chiuse','riaperte']]){const x=A[k],y=B[k];if(Math.abs(y-x)<.002)continue;
  if(x<CLIP_WARN&&y>=CLIP_WARN)warn.push(`${name} da ${p1(x)} a ${p1(y)}`);else out.push(`${name[0].toUpperCase()+name.slice(1)} da ${p1(x)} a ${p1(y)}${x>=CLIP_WARN&&y<CLIP_WARN?': '+good:''}.`)}
 if(warn.length)out.unshift(`Attenzione: ${warn.join(' e ')}.`);return out.length?out.join(' '):'Nessun cambiamento misurabile nella luce e nei colori.'}
// L'effetto si dice da solo (si spegne con «Annuncia l’effetto delle modifiche»): 700 ms dopo l'ultimo disegno pieno
// la foto si misura di nuovo e si confronta con fxBase, la misura dell'ultimo stato detto. Contano le regolazioni (cursori,
// curve e dettaglio, look, maschere); inquadratura, ritocchi e scontorno hanno già i loro annunci, e dopo di loro la misura
// di partenza si rifà senza dire niente. La selezione non cambia i pixel. devStats sono le misure dell'ultima foto
// regolata mostrata, anche mentre si guarda l'originale.
let fxBase=null,fxTimer=null,devStats=null;
const fxKey=()=>JSON.stringify([I.r.adj,I.r.fx,I.r.look,I.r.lookAmt,(I.r.masks||[]).map(m=>[m.adj,m.ops,m.off,m.inv,m.amt])]),fxAll=()=>JSON.stringify({...I.r,sel:null});
const effectOn=()=>prefs.effectSay!==false;
const fxNow=()=>({bmp:I.bmp,key:fxKey(),all:fxAll(),st:I.stats,s:photoSample(outPx)});
function photoEffect(fast){clearTimeout(fxTimer);if(fast||I.compare||!I.bmp||!outPx||!I.stats)return;devStats=I.stats;if(fxBase?.bmp!==I.bmp){fxBase=fxNow();return}if(fxAll()===fxBase.all)return;if(fxKey()===fxBase.key){fxBase=fxNow();return}
 fxTimer=setTimeout(()=>{if(I.compare||!I.stats||fxBase?.bmp!==I.bmp)return;const now=fxNow(),msg=effectSay(fxBase,now);fxBase=now;if(effectOn())announce(msg)},700)}
// Alt+Maiusc+L: la frase della luce; premuto di nuovo entro tre secondi porta all'istogramma.
let lightAt=0;
function readLight(){if(!I.bmp||!I.stats){toast('Apri prima una foto');return}if(Date.now()-lightAt<3000&&document.activeElement!==$('histNav')){lightAt=0;$('histNav').focus();return}lightAt=Date.now();announce(`${histSentence(I.stats)} Premi di nuovo Alt+Maiusc+L per percorrere l’istogramma.`)}
// Alt+Maiusc+D: zone, colori e dominante in una frase; premuto di nuovo entro tre secondi apre la tabella delle zone.
let zonesAt=0;
function readZones(){if(!I.bmp||!lastMc){toast('Apri prima una foto');return}const s=photoSample(shownPx());if(Date.now()-zonesAt<3000){zonesAt=0;zonesTable(s);return}zonesAt=Date.now();
 announce(`${I.compare?'Originale. ':''}${zonesSay(s)} ${colorsSay(s)} ${castSay(castOf(s))} Premi di nuovo Alt+Maiusc+D per la tabella delle zone.`)}
async function zonesTable(s){const Z=s.zones.map(zoneOf),cols=['a sinistra','al centro','a destra'];
 await modal('Zone e colori della foto',`<p>${esc(zonesSay(s))}</p><table><caption>La foto divisa in nove zone, per terzi: colore prevalente, luce media e parti bruciate o chiuse</caption><thead><tr><td></td>${cols.map(c=>`<th scope="col">${c[0].toUpperCase()+c.slice(1)}</th>`).join('')}</tr></thead><tbody>${['In alto','Al centro','In basso'].map((r,i)=>`<tr><th scope="row">${r}</th>${[0,1,2].map(j=>`<td>${esc(s.zones[i*3+j].n?zoneText(Z[i*3+j]):'trasparente')}</td>`).join('')}</tr>`).join('')}</tbody></table><h3>Colori</h3><p>${esc(colorsSay(s))}</p><h3>Dominante</h3><p>${esc(castSay(castOf(s)))} Le scene di un colore solo, come un tramonto o un prato, possono sembrare una dominante.</p>`,[],'Chiudi',{noCancel:true,wide:true})}
// Alt+Maiusc+O: la foto regolata confrontata con l'originale con la stessa inquadratura, e la zona che cambia di più.
function readCompare(){if(!I.bmp||!lastMc||!outPx){toast('Apri prima una foto');return}const src=geometryPixels(),o={st:measure(src),s:photoSample(src)},m={st:measure(outPx),s:photoSample(outPx)},say=effectSay(o,m);
 const dz=o.s.zones.map((z,i)=>[i,zoneOf(z).y,zoneOf(m.s.zones[i]).y]).filter(([i])=>o.s.zones[i].n).sort((a,b)=>Math.abs(b[2]-b[1])-Math.abs(a[2]-a[1]))[0];
 announce(`Rispetto all’originale. ${say}${dz&&Math.abs(dz[2]-dz[1])>=.03?` Zona più cambiata: ${ZONE_NAME[dz[0]]}, luce da ${fmtPct(dz[1])} a ${fmtPct(dz[2])}.`:''}`)}
// Istogramma da percorrere, come i grafici di Calcolo: 16 fasce con le frecce, il canale con Su e Giù, gli estremi con Home e
// Fine, la tabella con T, la descrizione con D, l'ascolto con S (Maiusc+S i tre colori). La fascia scelta si vede sul grafico.
const HIST_CH=['Luminosità','Rosso','Verde','Blu'],HN={band:-1,ch:0};
const levelShare=(st,ch,a,b)=>{let c=0;for(let k=a;k<=b;k++)c+=st.H[ch][k];return c/(st.n||1)};
const bandSay=(st,i,ch=HN.ch)=>`${ch?HIST_CH[ch]+', f':'F'}ascia ${i+1} di 16, ${ch?'':'toni '}da ${fmtInt(i*16/2.55)} a ${fmtPct((i*16+15)/255)}: ${fmtPct(levelShare(st,ch,i*16,i*16+15),1)} dei pixel`;
// La forma dell'istogramma in cinque zone di tono, dai neri ai bianchi.
const TONE_BANDS=[['neri',0,12],['ombre',13,76],['toni medi',77,178],['luci',179,242],['bianchi',243,255]],TONE_ART={neri:'i neri',ombre:'le ombre','toni medi':'i toni medi',luci:'le luci',bianchi:'i bianchi'};
function histShape(st,ch=0){const q=TONE_BANDS.map(([n,a,b])=>[n,levelShare(st,ch,a,b)]),top=[...q].sort((a,b)=>b[1]-a[1]);return `${ch?HIST_CH[ch]+': ':''}${q.filter(x=>x[1]>=.005).map(([n,v])=>`${n} ${fmtPct(v)}`).join(', ')}; prevalgono ${TONE_ART[top[0][0]]}.`}
function histKey(e){const st=I.stats;if(!st||!I.bmp)return;const k=e.key;let say=null;
 if(k==='ArrowRight'||k==='ArrowLeft'){HN.band=clamp(HN.band<0?(k==='ArrowRight'?0:15):HN.band+(k==='ArrowRight'?1:-1),0,15);say=bandSay(st,HN.band)}
 else if(k==='ArrowUp'||k==='ArrowDown'){HN.ch=(HN.ch+(k==='ArrowDown'?1:3))%4;say=HN.band<0?`${HIST_CH[HN.ch]}: ${histShape(st,HN.ch).replace(/^[^:]*: /,'')}`:bandSay(st,HN.band)}
 else if(k==='Home')say=`${HN.ch?HIST_CH[HN.ch]+' al minimo':'Nero pieno'}: ${fmtPct(levelShare(st,HN.ch,0,2),1)} dei pixel`;
 else if(k==='End')say=`${HN.ch?HIST_CH[HN.ch]+' al massimo':'Bianco pieno'}: ${fmtPct(levelShare(st,HN.ch,253,255),1)} dei pixel`;
 else if(k==='t'||k==='T'){e.preventDefault();histTable(st);return}
 else if(k==='d'||k==='D')say=`${histSentence(st)} ${histShape(st,HN.ch)}`;
 else if(k==='s'||k==='S'){e.preventDefault();histListen(st,e.shiftKey);return}
 else if(k==='Escape'){e.preventDefault();if(toneHalt()){announce('Ascolto interrotto');return}$('photo').focus();return}
 if(say==null)return;e.preventDefault();announce(say);drawHist()}
async function histTable(st){await modal('Istogramma della foto',`<p>${esc(histSentence(st))}</p><table><caption>Quanti pixel cadono in ognuna delle 16 fasce di tono, per la luminosità e per i tre colori</caption><thead><tr><th scope="col">Fascia</th><th scope="col">Toni</th>${HIST_CH.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${Array.from({length:16},(_,i)=>`<tr><th scope="row">${i+1}</th><td>da ${fmtInt(i*16/2.55)} a ${fmtPct((i*16+15)/255)}</td>${HIST_CH.map((c,ch)=>`<td>${fmtPct(levelShare(st,ch,i*16,i*16+15),1)}</td>`).join('')}</tr>`).join('')}</tbody></table>`,[],'Chiudi',{noCancel:true,wide:true})}
// Ascolto: 32 note dalle ombre (a sinistra) alle luci (a destra), più acute dove ci sono più pixel (radice quadrata, come
// il disegno); un colpo breve all'inizio o alla fine se le ombre sono chiuse o le luci bruciate oltre l'1%.
function histListen(st,all){const part=ch=>{const v=Array.from({length:32},(_,i)=>levelShare(st,ch,i*8,i*8+7)),top=Math.max(...v)||1,marks=new Set();if(levelShare(st,ch,0,2)>=CLIP_WARN)marks.add(0);if(levelShare(st,ch,253,255)>=CLIP_WARN)marks.add(31);return {vals:v.map(x=>Math.sqrt(x/top)),marks,wave:ch===2?'triangle':'sine',label:all?HIST_CH[ch]:''}};
 toneSeq(all?[1,2,3].map(part):[part(HN.ch)],{say:`Ascolto dell’istogramma ${all?'del rosso, del verde e del blu':HN.ch?'del '+HIST_CH[HN.ch].toLowerCase():'della luminosità'}: a sinistra le ombre, a destra le luci; più acuto dove ci sono più pixel. Esc per fermare.`})}
function histCursor(ctx,W,H){if(HN.band<0||document.activeElement!==$('histNav'))return;const x0=HN.band*16/255*(W-1),x1=(HN.band*16+15)/255*(W-1),dpr=devicePixelRatio||1;ctx.save();ctx.strokeStyle=palette.accent||'#000';ctx.lineWidth=2*dpr;ctx.strokeRect(x0,dpr,Math.max(2,x1-x0),H-2*dpr);ctx.restore()}
$('histNav').addEventListener('keydown',histKey);
$('histNav').addEventListener('focus',()=>drawHist());$('histNav').addEventListener('blur',()=>{toneHalt();drawHist()});
// Il cursore degli strumenti dice anche la luce, se lì la foto è bruciata o chiusa, se è nel soggetto o nello sfondo tolto
// e quanto agisce la maschera scelta. Esplora è uno strumento che non cambia niente: Invio legge il dettaglio.
function cursorAt(p){const m=lastMc,i=Math.min(m.h-1,Math.floor(p[1]*m.h))*m.w+Math.min(m.w-1,Math.floor(p[0]*m.w)),c=colorAt(p),mx=Math.max(...c),out=[colorName(...c),`luce ${fmtPct((54*c[0]+183*c[1]+19*c[2])/256/255)}`];
 if(mx>=253)out.push('bruciato');else if(mx<=2)out.push('chiuso');
 if(I.r.cut){const v=maskOf(cutOps(I.r,m),m)[i];out.push(v>=230?'nel soggetto':v<=25?'nello sfondo tolto':`sul bordo del soggetto, ${fmtPct(v/255)}`)}
 const mk=maskIn();if(mk&&(['mbrush','linear','radial','explore'].includes(T.tool))){const v=maskPreview(mk)?.[i];if(v!=null)out.push(`maschera «${mk.name}» al ${fmtPct(v/255)}`)}
 const sm=(PHOTO_TOOLS[T.tool]?.sel||T.tool==='explore')&&selMask();if(sm)out.push(sm[i]>=128?'nella selezione':'fuori dalla selezione');return {c,text:out.join(', ')}}
function exploreDetail(p){const {c,text}=cursorAt(p);announce(`${posSay(p)}: ${text}; rosso ${fmtInt(c[0])}, verde ${fmtInt(c[1])}, blu ${fmtInt(c[2])}.`)}
// Alt+Maiusc+frecce: il cursore va al primo cambio netto di colore o di luce in quella direzione, sulla foto che si vede.
function edgeJump(dx,dy){const px=shownPx(),w=px.width,h=px.height,uv=(x,y)=>[(x+.5)/w,(y+.5)/h],step=2;let x=Math.min(w-1,T.u*w|0),y=Math.min(h-1,T.v*h|0),prev=colorAt(uv(x,y)),k=0;
 for(;;){x+=dx*step;y+=dy*step;k++;if(x<0||y<0||x>=w||y>=h){announce(`Nessun bordo netto fino al margine ${dx>0?'destro':dx<0?'sinistro':dy>0?'inferiore':'superiore'} della foto`);return}
  const c=colorAt(uv(x,y));if(k>2&&Math.hypot(c[0]-prev[0],c[1]-prev[1],c[2]-prev[2])>=34){[T.u,T.v]=uv(x,y);T.kbd=true;drawOver();
  // Il colore di là dal bordo si prende qualche pixel più avanti, fuori dalla sfumatura del passaggio.
  const to=colorAt(uv(clamp(x+dx*5,0,w-1),clamp(y+dy*5,0,h-1))),L=q=>fmtPct((54*q[0]+183*q[1]+19*q[2])/256/255);announce(`Bordo a ${posSay([T.u,T.v])}: da ${colorName(...prev)}, ${L(prev)}, a ${colorName(...to)}, ${L(to)}`);return}prev=c}}
photoCv.addEventListener('keydown',e=>{if(!T.tool||!I.bmp||overlayOpen()||!e.key.startsWith('Arrow')||!e.altKey||!e.shiftKey||e.ctrlKey)return;e.preventDefault();e.stopPropagation();edgeJump(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)});
PHOTO_TOOLS.explore={label:'Esplora',kind:'click',keys:'Le frecce muovono un cursore che non cambia niente e dicono che cosa c’è sotto; Invio legge il dettaglio, Alt+Maiusc+frecce portano il cursore al bordo successivo.',at:p=>exploreDetail(p)};
Object.assign(PHOTO_TOOL_ACTIONS,{toolExplore:()=>setPhotoTool('explore'),readLight,readZones,readCompare,effectSay:()=>{prefs.effectSay=!effectOn();savePrefs()}});
STATIC_KEYS.i[0][1].push(['Esplora la foto: le frecce dicono che cosa c’è sotto','X'],['Con uno strumento, porta il cursore al bordo successivo','Alt+Maiusc+← → ↑ ↓']);
STATIC_KEYS.i.splice(1,0,['Nell’istogramma (Alt+Maiusc+L due volte)',[['Fascia di tono successiva o precedente','← →'],['Luminosità, rosso, verde, blu','↑ ↓'],['Nero pieno e bianco pieno','Home / Fine'],['Tabella delle fasce','T'],['Descrizione','D'],['Ascolta; Maiusc i tre colori','S / Maiusc+S'],['Ferma l’ascolto o torna alla foto','Esc']]]);
