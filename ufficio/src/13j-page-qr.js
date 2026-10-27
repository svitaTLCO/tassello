// Codici QR fatti in locale, senza rete: una cornice con l'indirizzo o il testo, la correzione degli errori, i colori con
// il contrasto controllato e il margine chiaro. Il contenuto può venire da un campo dei dati (stampa unione: ogni copia
// della pagina ha il suo codice) e il testo alternativo dice dove porta.
// Il codice segue la norma ISO/IEC 18004: modalità byte in UTF-8, versioni da 1 a 40, correzione Reed-Solomon in blocchi
// intercalati, la maschera con la penalità più bassa (come la libreria QR Code generator di Project Nayuki).
const PG_QR_LV={L:0,M:1,Q:2,H:3},PG_QR_FMT=[1,0,3,2],PG_QR_ECS=[['L','Bassa: recupera il 7%, codice più piccolo'],['M','Media: recupera il 15%, consigliata'],['Q','Alta: recupera il 25%'],['H','Massima: recupera il 30%, per i codici stampati su superfici rovinabili']];
// Per livello (L, M, Q, H) e versione: parole di correzione per blocco e numero di blocchi.
const PG_QR_ECC=[[7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
 [10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
 [13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
 [17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30]];
const PG_QR_NB=[[1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25],
 [1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
 [1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68],
 [1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81]];
// Moduli per i dati (tutti meno quelli dei motivi fissi) e parole di dati per versione e livello.
function pgQrRaw(v){let r=(16*v+128)*v+64;if(v>=2){const a=Math.floor(v/7)+2;r-=(25*a-10)*a-55;if(v>=7)r-=36}return r}
const pgQrData=(v,l)=>Math.floor(pgQrRaw(v)/8)-PG_QR_ECC[l][v-1]*PG_QR_NB[l][v-1];
// Reed-Solomon nel campo GF(256) con il polinomio 0x11D.
function pgGfMul(x,y){let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z}
function pgRsDiv(n){const r=Array(n).fill(0);r[n-1]=1;let root=1;for(let i=0;i<n;i++){for(let j=0;j<n;j++){r[j]=pgGfMul(r[j],root);if(j+1<n)r[j]^=r[j+1]}root=pgGfMul(root,2)}return r}
function pgRsRem(data,div){const r=div.map(()=>0);for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>{r[i]^=pgGfMul(c,f)})}return r}
// La matrice dei moduli (true = scuro), oppure null se il testo non entra nemmeno nella versione 40. mask forza la maschera.
function pgQr(text,lvl='M',mask=-1){const bytes=[...new TextEncoder().encode(text)],l=PG_QR_LV[lvl]??1;let v=1;while(v<=40&&4+(v<10?8:16)+bytes.length*8>pgQrData(v,l)*8)v++;if(v>40)return null;
 const bits=[],put=(x,n)=>{for(let i=n-1;i>=0;i--)bits.push((x>>>i)&1)},cap=pgQrData(v,l)*8;put(4,4);put(bytes.length,v<10?8:16);for(const b of bytes)put(b,8);put(0,Math.min(4,cap-bits.length));put(0,(8-bits.length%8)%8);for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)put(p,8);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>a<<1|b,0));
 const nb=PG_QR_NB[l][v-1],ec=PG_QR_ECC[l][v-1],raw=Math.floor(pgQrRaw(v)/8),ns=nb-raw%nb,sl=Math.floor(raw/nb),div=pgRsDiv(ec),blocks=[],cw=[];
 for(let i=0,k=0;i<nb;i++){const d=data.slice(k,k+sl-ec+(i<ns?0:1));k+=d.length;const e=pgRsRem(d,div);if(i<ns)d.push(0);blocks.push(d.concat(e))}
 for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!==sl-ec||j>=ns)cw.push(b[i])});
 // Motivi fissi: riga e colonna di temporizzazione, i tre quadrati di ricerca, gli allineamenti, formato e versione.
 const n=v*4+17,M=Array.from({length:n},()=>Array(n).fill(false)),F=Array.from({length:n},()=>Array(n).fill(false)),set=(x,y,d)=>{M[y][x]=d;F[y][x]=true};
 for(let i=0;i<n;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
 for(const [cx,cy] of [[3,3],[n-4,3],[3,n-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=cx+dx,y=cy+dy,d=Math.max(Math.abs(dx),Math.abs(dy));if(x>=0&&x<n&&y>=0&&y<n)set(x,y,d!==2&&d!==4)}
 const al=[];if(v>1){const na=Math.floor(v/7)+2,step=v===32?26:Math.ceil((v*4+4)/(na*2-2))*2;al.push(6);for(let pos=n-7;al.length<na;pos-=step)al.splice(1,0,pos)}
 al.forEach((ax,i)=>al.forEach((ay,j)=>{if(i===0&&j===0||i===0&&j===al.length-1||i===al.length-1&&j===0)return;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(ax+dx,ay+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)}));
 const format=k=>{const d=PG_QR_FMT[l]<<3|k;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=(d<<10|r)^0x5412,g=i=>((b>>>i)&1)===1;
  for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));for(let i=0;i<8;i++)set(n-1-i,8,g(i));for(let i=8;i<15;i++)set(8,n-15+i,g(i));set(8,n-8,true)};
 format(0);if(v>=7){let r=v;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=v<<12|r;for(let i=0;i<18;i++){const d=((b>>>i)&1)===1,a=n-11+i%3,c=Math.floor(i/3);set(a,c,d);set(c,a,d)}}
 // I dati a zig-zag, due colonne alla volta dal basso a destra.
 let i=0;for(let right=n-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<n;vert++)for(let j=0;j<2;j++){const x=right-j,y=((right+1)&2)===0?n-1-vert:vert;if(!F[y][x]&&i<cw.length*8){M[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)===1;i++}}}
 const MASK=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,x=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
 const apply=k=>{for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(!F[y][x]&&MASK[k](x,y))M[y][x]=!M[y][x]};
 if(mask<0){let best=0,low=Infinity;for(let k=0;k<8;k++){apply(k);format(k);const s=pgQrPenalty(M);if(s<low){low=s;best=k}apply(k)}mask=best}
 apply(mask);format(mask);return M}
// Penalità della norma: file di cinque o più moduli uguali, quadrati 2×2, motivi simili ai quadrati di ricerca, equilibrio tra scuri e chiari.
function pgQrPenalty(M){const n=M.length;let s=0;
 const count=h=>{const c=h[1];const core=c>0&&h[2]===c&&h[3]===c*3&&h[4]===c&&h[5]===c;return (core&&h[0]>=c*4&&h[6]>=c?1:0)+(core&&h[6]>=c*4&&h[0]>=c?1:0)},add=(len,h)=>{if(h[0]===0)len+=n;h.pop();h.unshift(len)};
 for(const col of [false,true])for(let a=0;a<n;a++){let run=false,len=0;const h=[0,0,0,0,0,0,0];for(let b=0;b<n;b++){const d=col?M[b][a]:M[a][b];if(d===run){len++;if(len===5)s+=3;else if(len>5)s++}else{add(len,h);if(!run)s+=count(h)*40;run=d;len=1}}
  if(run){add(len,h);len=0}len+=n;add(len,h);s+=count(h)*40}
 let dark=0;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const d=M[y][x];if(d)dark++;if(y<n-1&&x<n-1&&d===M[y][x+1]&&d===M[y+1][x]&&d===M[y+1][x+1])s+=3}
 return s+(Math.ceil(Math.abs(dark*20-n*n*10)/(n*n))-1)*10}
// Il codice di una cornice: il contenuto (dal campo dei dati, o il testo con i campi riempiti) e la matrice, ricordata.
const pgQrCache=new Map();
function pgQrMatrix(t,ec){const k=ec+'|'+t;let m=pgQrCache.get(k);if(m===undefined){m=pgQr(t,ec);if(pgQrCache.size>300)pgQrCache.clear();pgQrCache.set(k,m)}return m}
function pgQrText(it,ctx){if(it.field&&ctx?.row&&Pg.p.data){const i=Pg.p.data.fields.indexOf(it.field);if(i>=0)return String(ctx.row[i]??'').trim()}return fillFields(String(it.text||''),ctx||{}).trim()}
// Disegno: lo sfondo chiaro con il margine e i moduli scuri, a righe, in una griglia di moduli interi (niente fessure).
function pgQrSvg(it,ctx){const t=pgQrText(it,ctx),M=t?pgQrMatrix(t,it.ec||'M'):null,q=it.quiet??4,s=Math.min(Math.abs(it.w),Math.abs(it.h)),x0=it.x+(it.w-s)/2,y0=it.y+(it.h-s)/2,op=it.opacity<100?` opacity="${it.opacity/100}"`:'';
 const back=`<rect x="${pr2(x0)}" y="${pr2(y0)}" width="${pr2(s)}" height="${pr2(s)}" fill="${esc(it.light||'#ffffff')}"/>`;if(!M)return `<g${op}>${back}</g>`;const n=M.length,u=s/(n+2*q);let d='';
 for(let y=0;y<n;y++)for(let x=0;x<n;){if(!M[y][x]){x++;continue}let e=x;while(e<n&&M[y][e])e++;d+=`M${x+q} ${y+q}h${e-x}v1h${x-e}z`;x=e}
 return `<g${op}>${back}<path transform="translate(${pr2(x0)} ${pr2(y0)}) scale(${+u.toFixed(5)})" d="${d}" fill="${esc(it.dark||'#000000')}" shape-rendering="crispEdges"/></g>`}
// A parole: dove porta il codice, dal suo contenuto, e la descrizione aggiunta da chi l'ha messo.
function pgQrSay(it,ctx){const t=pgQrText(it,ctx);if(!t)return 'codice QR vuoto';let s;const u=/^(https?):\/\/([^/?#\s]+)([^?#\s]*)/i.exec(t);
 if(u)s=`che porta al sito ${u[2].replace(/^www\./i,'')}${u[3].replace(/\/$/,'')}`;else if(/^mailto:/i.test(t))s=`per scrivere un’email a ${t.slice(7).split('?')[0]}`;else if(/^tel:/i.test(t))s=`per chiamare il numero ${t.slice(4)}`;else if(/^sms:/i.test(t))s=`per mandare un SMS al numero ${t.slice(4).split('?')[0]}`;
 else if(/^WIFI:/i.test(t)){const w=/[:;]S:((?:\\.|[^;])*)/.exec(t);s=`per collegarsi alla rete Wi-Fi${w?' «'+w[1].replace(/\\(.)/g,'$1')+'»':''}`}else if(/^BEGIN:VCARD/i.test(t)){const f=/\nFN:([^\r\n]*)/i.exec(t);s=`con il biglietto da visita${f?' di '+f[1]:''}`}
 else if(/^geo:/i.test(t))s='con una posizione sulla mappa';else s=`con il testo «${t.length>80?t.slice(0,80)+'…':t}»`;return `codice QR ${s}${it.alt?'. '+it.alt:''}`}
// Stato del codice per le proprietà e la verifica: vuoto, troppo lungo, oppure versione e misura.
function pgQrState(it,ctx){const t=pgQrText(it,ctx);if(!t)return it.field?`Il campo «${it.field}» è vuoto in questa riga dei dati.`:'Il codice è vuoto: scrivi l’indirizzo o il testo.';const M=pgQrMatrix(t,it.ec||'M');if(!M)return `Il contenuto è troppo lungo per un codice QR con questa correzione degli errori (${new TextEncoder().encode(t).length} byte).`;
 return `${M.length} × ${M.length} moduli (versione ${(M.length-17)/4}), ${t.length===1?'un carattere':t.length+' caratteri'}.`}
function pgQrInk(it){const c=pgContrast(it.dark,it.light),inv=(pgLum(it.dark)??0)>(pgLum(it.light)??1);return {c,inv,ok:c!=null&&c>=4&&!inv}}
// Proprietà del codice: contenuto, campo dei dati, correzione, colori con il contrasto, margine e descrizione.
function pgQrProps(it){const fields=Pg.p.data?.fields||[],k=pgQrInk(it);return `<h3>Codice QR</h3>`+ppT('text','Contenuto: indirizzo o testo',it.text,'Un indirizzo (https://…), un’email (mailto:…), un telefono (tel:…) o un testo qualsiasi. Puoi usare i campi dei dati, per esempio «Sito».',2)+
 `<p class="hint" id="pp-qr-state">${esc(pgQrState(it,{row:pgCur().I.row}))}</p>`+(fields.length?ppS('field','Contenuto dal campo dei dati',it.field||'',[['','Nessuno: usa il contenuto scritto'],...fields.map(f=>[f,f])],'Nelle pagine ripetute per ogni riga ogni copia ha il suo codice.'):'')+
 ppS('ec','Correzione degli errori',it.ec||'M',PG_QR_ECS,'Più correzione rende il codice più robusto, ma con più moduli.')+ppC('dark','Colore del codice',it.dark||'#000000')+ppC('light','Colore dello sfondo',it.light||'#ffffff')+
 `<p class="hint">${k.inv?'Il codice è più chiaro dello sfondo: molti telefoni non lo riconoscono. Usa un colore scuro su uno sfondo chiaro.':`Contrasto ${pgFmt(k.c??0)}:1: ${k.ok?'si legge bene.':'basso, alcuni telefoni non lo leggono. Serve almeno 4:1.'}`}</p>`+
 ppS('quiet','Margine chiaro attorno',String(it.quiet??4),[['4','Quattro moduli, consigliato'],['2','Due moduli'],['0','Nessuno: lo sfondo intorno è già chiaro']])+
 `<h3>Per chi non vede</h3><p class="hint">Il testo alternativo dice dove porta: «${esc(pgQrSay(it,{row:pgCur().I.row}))}».</p>`+ppT('alt','Descrizione aggiuntiva',it.alt,'Facoltativa: che cosa trova chi lo inquadra, per esempio «il menu del giorno».',2)}
// Verifica: vuoto, troppo lungo (anche in una riga dei dati), colori, misura dei moduli.
function pgQrIssues(it,nm,A,row,out){const p=Pg.p,mm=p.unit==='mm',t=pgQrText(it,{row}),M=t?pgQrMatrix(t,it.ec||'M'):null;
 if(it.field&&p.data&&!p.data.fields.includes(it.field))out.push({...A,msg:`${nm}: il campo «${it.field}» non c’è più nei dati.`});
 else if(it.field&&p.data){const i=p.data.fields.indexOf(it.field),long=p.data.rows.filter(r=>{const v=String(r[i]??'').trim();return v&&!pgQrMatrix(v,it.ec||'M')}).length,empty=p.data.rows.filter(r=>!String(r[i]??'').trim()).length;
  if(long)out.push({...A,msg:`${nm}: in ${long===1?'una riga':long+' righe'} dei dati il contenuto è troppo lungo per un codice QR.`});if(empty)out.push({...A,msg:`${nm}: in ${empty===1?'una riga':empty+' righe'} dei dati il campo «${it.field}» è vuoto: lì il codice non c’è.`})}
 else if(!t)out.push({...A,msg:`${nm}: il codice QR è vuoto.`});else if(!M)out.push({...A,msg:`${nm}: il contenuto è troppo lungo per un codice QR.`});
 const k=pgQrInk(it);if(!k.ok)out.push({...A,msg:k.inv?`${nm}: il codice è più chiaro del suo sfondo, molti telefoni non lo riconoscono.`:`${nm}: contrasto ${pgFmt(k.c??0)}:1 tra il codice e il suo sfondo, ne serve almeno 4:1 perché i telefoni lo leggano.`});
 if(M){const u=Math.min(Math.abs(it.w),Math.abs(it.h))/(M.length+2*(it.quiet??4)),least=mm?.33*MM:3;if(u<least)out.push({...A,msg:`${nm}: i moduli del codice sono di ${mm?pgFmt(u/MM,2)+' mm':pgFmt(u,1)+' px'}, troppo piccoli per essere letti: ingrandisci la cornice almeno a ${mm?Math.ceil(least*(M.length+2*(it.quiet??4))/MM)+' mm':Math.ceil(least*(M.length+2*(it.quiet??4)))+' px'} di lato.`})}}
// Inserimento: una cornice quadrata al centro, con il contenuto da scrivere nelle proprietà.
function pgAddQr(){const i=pgInner(Pg.p),s=Math.min(i.w,i.h)*.4,it=pgAdd('qr',{w:s,h:s});announce(`Inserito il codice QR «${it.name}» al centro della pagina. Scrivi nelle proprietà l’indirizzo o il testo: il codice si aggiorna mentre scrivi.`);pgShowProps();setTimeout(()=>{$('pp-text')?.focus();$('pp-text')?.select()},0)}
