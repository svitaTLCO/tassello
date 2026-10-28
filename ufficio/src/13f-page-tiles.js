// Stampa a tessere: un poster o uno striscione si stampa diviso su fogli normali (A4, A3, A5, Lettera), con il
// margine che la stampante non raggiunge, una striscia di sovrapposizione per incollarli, i segni nei margini e un
// foglio di montaggio. Ogni tessera è una finestra vettoriale sulla stessa pagina: il testo resta nitido.
const PG_SHEETS={a4:['A4',210,297],a3:['A3',297,420],a5:['A5',148,210],letter:['Lettera',215.9,279.4]};
const PG_TILED=new Set(['a2','a1','a0','striscione']);
const pgTilesDefault=on=>({on,sheet:'a4',orient:'auto',safe:5*MM,over:10*MM,marks:true,map:true});
// La griglia delle tessere per la pagina: con l'orientamento scelto, o quello che usa meno fogli.
function pgTileGrid(p){const t=p.tiles||pgTilesDefault(false),[name,w0,h0]=PG_SHEETS[t.sheet]||PG_SHEETS.a4,make=land=>{const sw=(land?h0:w0)*MM,sh=(land?w0:h0)*MM,aw=sw-2*t.safe,ah=sh-2*t.safe,ov=Math.min(t.over,aw/3,ah/3),cols=Math.max(1,Math.ceil((p.w-ov)/(aw-ov)-1e-6)),rows=Math.max(1,Math.ceil((p.h-ov)/(ah-ov)-1e-6));return{land,name,sw,sh,aw,ah,ov,cols,rows,n:cols*rows}};
 const g=t.orient==='land'?make(true):t.orient==='port'?make(false):[make(false),make(true)].sort((a,b)=>a.n-b.n)[0];g.ox=(g.cols*g.aw-(g.cols-1)*g.ov-p.w)/2;g.oy=(g.rows*g.ah-(g.rows-1)*g.ov-p.h)/2;return g}
const pgTileBox=(g,c,r)=>({x:c*(g.aw-g.ov)-g.ox,y:r*(g.ah-g.ov)-g.oy,w:g.aw,h:g.ah});
const pgTileSay=g=>`${g.n===1?'un foglio':g.n+' fogli'} ${g.name} ${g.n===1?(g.land?'orizzontale':'verticale'):(g.land?'orizzontali':'verticali')}${g.n>1?`, ${g.cols} ${g.cols===1?'colonna':'colonne'} per ${g.rows} ${g.rows===1?'riga':'righe'}`:''}`;
// Una tessera: la finestra sulla pagina dentro il margine, e nei margini i segni d'angolo, quelli della sovrapposizione
// (dove appoggiare il bordo del foglio vicino) e l'etichetta con la posizione. Nel PDF con i tag (mode) la tessera è una
// figura con la sua posizione ('fig'), oppure ha la pagina nei tag ('tags', quando la pagina sta in un foglio solo), oppure
// resta fuori dai tag ('hide', quando la pagina è nei tag nel foglio di montaggio).
function pgTileSvg(p,I,ii,lay,g,c,r,href,mode='fig'){const b=pgTileBox(g,c,r),t=p.tiles,sf=t.safe,L=Math.min(sf*.8,4*MM),sw=pr2(.25*MM),line=(x1,y1,x2,y2)=>`<line x1="${pr2(x1)}" y1="${pr2(y1)}" x2="${pr2(x2)}" y2="${pr2(y2)}"/>`;let m='';
 if(t.marks&&sf>=1.5*MM){const X=[sf,sf+g.aw],Y=[sf,sf+g.ah];for(const x of X)for(const y of Y)m+=line(x,y<sf+1?y-L-.5*MM:y+.5*MM,x,y<sf+1?y-.5*MM:y+L+.5*MM)+line(x<sf+1?x-L-.5*MM:x+.5*MM,y,x<sf+1?x-.5*MM:x+L+.5*MM,y);
  // Sovrapposizione: sui lati con un vicino, dove arriva il bordo del foglio accanto.
  const tick=(x,y,v)=>v?line(x,y-L,x,y):line(x-L,y,x,y);if(c>0)for(const y of [sf,sf+g.ah+L])m+=tick(sf+g.ov,y,true);if(c<g.cols-1)for(const y of [sf,sf+g.ah+L])m+=tick(sf+g.aw-g.ov,y,true);if(r>0)for(const x of [sf,sf+g.aw+L])m+=tick(x,sf+g.ov,false);if(r<g.rows-1)for(const x of [sf,sf+g.aw+L])m+=tick(x,sf+g.ah-g.ov,false)}
 const fs=Math.min(sf*.55,2.6*MM),label=sf>=3*MM?`<text x="${pr2(g.sw/2)}" y="${pr2(g.sh-sf/2+fs/3)}" font-family="'Segoe UI', sans-serif" font-size="${pr2(fs)}" fill="#555" text-anchor="middle">Tessera ${r+1}·${c+1}, riga ${r+1} di ${g.rows}, colonna ${c+1} di ${g.cols}${I.total>1?`, pagina ${I.n}`:''}${g.ov>0?` · sovrapposizione ${pgFmt(g.ov/MM)} mm`:''}</text>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pr2(g.sw)} ${pr2(g.sh)}" style="width:${pr2(g.sw/MM)}mm;height:${pr2(g.sh/MM)}mm"${mode==='fig'?` role="img" aria-label="Pagina ${I.n}, tessera riga ${r+1} colonna ${c+1}"`:mode==='hide'?' aria-hidden="true"':''}><svg x="${pr2(sf)}" y="${pr2(sf)}" width="${pr2(g.aw)}" height="${pr2(g.ah)}" viewBox="${pr2(b.x)} ${pr2(b.y)} ${pr2(g.aw)} ${pr2(g.ah)}" overflow="hidden">${mode==='tags'?pgPageSvg(p,I,ii,lay,href):pgUntagged(()=>pgPageSvg(p,I,ii,lay,href))}</svg><g${mode==='tags'?' aria-hidden="true"':''}>${m?`<g stroke="#555" stroke-width="${sw}" fill="none">${m}</g>`:''}${label}</g></svg>`}
// Foglio di montaggio: lo schema numerato delle tessere sopra la pagina in piccolo e le istruzioni per incollarle. Con tags
// (il PDF con i tag) le istruzioni sono paragrafi e la pagina in piccolo è nei tag, con lo schema fuori.
function pgTileMapSvg(p,I,ii,lay,g,href,tags=false){const sf=Math.max(p.tiles.safe,8*MM),W=g.sw-2*sf,tw=g.cols*g.aw-(g.cols-1)*g.ov,th=g.rows*g.ah-(g.rows-1)*g.ov,css=`400 10px ${fontStack('Segoe UI')}`;
 const lines=[`Montaggio di «${p.title}»: ${pgTileSay(g)}.`,'Stampa al 100%, senza «Adatta alla pagina».',`Ritaglia il margine bianco a sinistra e in alto di ogni foglio, tranne quelli della prima colonna e della prima riga.`,`Appoggia il bordo ritagliato sui segni del foglio vicino: si sovrappone per ${pgFmt(g.ov/MM)} mm. Fissa con colla o nastro sul retro.`];
 const fs=Math.min(4.2*MM,W/Math.max(...lines.map(l=>textWidth(css,l)/10)))*.98,head=lines.length*fs*1.5,boxH=g.sh-2*sf-head-fs,k=Math.min(W/tw,boxH/th),bw=tw*k,bh=th*k,bx=sf+(W-bw)/2,by=sf+head+fs/2;let grid='';
 for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){const b=pgTileBox(g,c,r);grid+=`<rect x="${pr2(b.x)}" y="${pr2(b.y)}" width="${pr2(b.w)}" height="${pr2(b.h)}" fill="none" stroke="#c0399a" stroke-width="${pr2(.6*MM/k)}"/><text x="${pr2(b.x+b.w/2)}" y="${pr2(b.y+b.h/2)}" font-family="'Segoe UI', sans-serif" font-size="${pr2(Math.min(b.w,b.h)*.18)}" font-weight="700" fill="#c0399a" text-anchor="middle" dominant-baseline="middle" stroke="#fff" stroke-width="${pr2(Math.min(b.w,b.h)*.02)}" paint-order="stroke">${r+1}·${c+1}</text>`}
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pr2(g.sw)} ${pr2(g.sh)}" style="width:${pr2(g.sw/MM)}mm;height:${pr2(g.sh/MM)}mm"${tags?'':` role="img" aria-label="${esc(lines.join(' '))}"`}>${lines.map((l,i)=>{const t=`<text x="${pr2(sf)}" y="${pr2(sf+fs*(1.1+i*1.5))}" font-family="'Segoe UI', sans-serif" font-size="${pr2(fs)}"${i?'':' font-weight="700"'} fill="#1b1b1b">${esc(l)}</text>`;return tags?`<g role="paragraph">${t}</g>`:t}).join('')}<svg x="${pr2(bx)}" y="${pr2(by)}" width="${pr2(bw)}" height="${pr2(bh)}" viewBox="${pr2(-g.ox)} ${pr2(-g.oy)} ${pr2(tw)} ${pr2(th)}"><rect x="${pr2(-g.ox)}" y="${pr2(-g.oy)}" width="${pr2(tw)}" height="${pr2(th)}" fill="#f3f3f3"/>${tags?pgPageSvg(p,I,ii,lay,href):pgUntagged(()=>pgPageSvg(p,I,ii,lay,href))}${tags?`<g aria-hidden="true">${grid}</g>`:grid}</svg></svg>`}
// I fogli della stampa a tessere, ognuno con la copia di pagina che ha nei tag (ii, -1 per nessuna). Nel PDF con i tag
// (pgTagPlan) una pagina va nei tag una volta sola: la prima nel foglio di montaggio, che la mostra intera, oppure nella
// tessera quando la pagina sta in un foglio solo; le sue tessere restano fuori. Le altre tessere sono figure con la loro
// posizione, come le pagine che restano una figura.
function pgTilesMarkup(insts,lay,href=m=>m.url){const p=Pg.p,g=pgTileGrid(p),map=p.tiles.map&&g.n>1,T=pgTags,tagged=ii=>!!T?.pages[ii]&&(g.n===1||map&&ii===0),out=[];
 if(map)out.push({svg:pgTileMapSvg(p,insts[0],0,lay,g,href,tagged(0)),ii:tagged(0)?0:-1});
 insts.forEach((I,ii)=>{const mode=!tagged(ii)?'fig':g.n===1?'tags':'hide';for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++)out.push({svg:pgTileSvg(p,I,ii,lay,g,c,r,href,mode),ii:mode==='tags'?ii:-1})});return out}
const pgTilePrintCss=()=>{const g=pgTileGrid(Pg.p);return `@page{size:${pr2(g.sw/MM)}mm ${pr2(g.sh/MM)}mm;margin:0}`};
// Abbondanza e segni di taglio, per la stampa in tipografia di qualunque documento: il foglio è più grande della pagina,
// lo sfondo e le cornici a filo continuano nell'abbondanza, nei margini del foglio ci sono i segni d'angolo per tagliare e
// una riga con il titolo e il numero di pagina. Con la stampa a tessere valgono i segni delle tessere.
const PG_SLUG=6*MM,pgBleedOn=p=>!p.tiles?.on&&(p.bleed>0||!!p.marks);
const pgSheet=p=>{const b=p.bleed||0,s=p.marks?PG_SLUG:0;return {b,s,o:b+s,w:p.w+2*(b+s),h:p.h+2*(b+s)}};
// Si allungano i rettangoli e le immagini (senza sagoma) diritti che toccano un bordo della pagina: i testi no, perché
// andrebbero a capo in un altro modo, e nemmeno le forme che cambierebbero aspetto.
function pgBleedItem(it,p,b){if(pgRot(it)||!(it.kind==='rect'||it.kind==='image'&&(!it.mask||it.mask==='rect')))return it;const e=.5,x0=it.x<=e?-b:it.x,y0=it.y<=e?-b:it.y,x1=it.x+it.w>=p.w-e?p.w+b:it.x+it.w,y1=it.y+it.h>=p.h-e?p.h+b:it.y+it.h;
 return x0===it.x&&y0===it.y&&x1===it.x+it.w&&y1===it.y+it.h?it:{...it,x:x0,y:y0,w:x1-x0,h:y1-y0}}
// Il foglio di una copia di pagina: dims in pixel per il PNG, altrimenti la misura in millimetri per la stampa.
function pgSheetSvg(p,I,ii,lay,href,dims){const S=pgSheet(p),{b,s}=S,line=(x1,y1,x2,y2)=>`<line x1="${pr2(x1)}" y1="${pr2(y1)}" x2="${pr2(x2)}" y2="${pr2(y2)}"/>`;let m='';
 if(s){for(const x of [0,p.w])for(const y of [0,p.h]){const dx=x?1:-1,dy=y?1:-1;m+=line(x+dx*(b+.5*MM),y,x+dx*(b+s-.5*MM),y)+line(x,y+dy*(b+.5*MM),x,y+dy*(b+s-.5*MM))}
  m=`<g stroke="#000" stroke-width="${pr2(.25*MM)}">${m}</g><text x="0" y="${pr2(p.h+b+s*.66)}" font-family="'Segoe UI', sans-serif" font-size="${pr2(2.2*MM)}" fill="#000">${esc(`${p.title} · pagina ${I.n} di ${I.total}${b?` · abbondanza ${pgFmt(b/MM)} mm`:''}`)}</text>`}
 const alt=I.pg.alt?': '+esc(fillFields(I.pg.alt,{n:I.n,total:I.total,row:I.row,title:p.title,date:pgToday()})):'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${pr2(-S.o)} ${pr2(-S.o)} ${pr2(S.w)} ${pr2(S.h)}" ${dims?`width="${dims[0]}" height="${dims[1]}"`:`style="width:${pr2(S.w/MM)}mm;height:${pr2(S.h/MM)}mm"${pgTags?'':` role="img" aria-label="Pagina ${I.n}${alt}"`}`}>${dims?`<rect x="${pr2(-S.o)}" y="${pr2(-S.o)}" width="${pr2(S.w)}" height="${pr2(S.h)}" fill="#ffffff"/>`:''}<svg x="${pr2(-b)}" y="${pr2(-b)}" width="${pr2(p.w+2*b)}" height="${pr2(p.h+2*b)}" viewBox="${pr2(-b)} ${pr2(-b)} ${pr2(p.w+2*b)} ${pr2(p.h+2*b)}" overflow="hidden">${pgPageSvg(p,I,ii,lay,href,b)}</svg>${pgTags&&m?`<g aria-hidden="true">${m}</g>`:m}</svg>`}
// Verifica per la tipografia: le cornici con un contenuto troppo vicine al taglio, i fondi che non arrivano al bordo.
function pgBleedIssues(p,h,at,where,out){const near=3*MM,gap=2*MM;for(const it of h.items){if(it.hidden)continue;const B=pgBoxOf(it),nm=`«${it.name}» (${where})`,A={...at,id:it.id},d=[B.x,B.y,p.w-B.x-B.w,p.h-B.y-B.h];
 if(PG_CONTENT.has(it.kind)&&it.kind!=='image'&&d.some(v=>v>-1&&v<near))out.push({...A,msg:`${nm} è a meno di 3 mm dal taglio: la tipografia potrebbe tagliarla. Spostala verso l’interno.`});
 else if(p.bleed>0&&(it.kind==='rect'||it.kind==='image')&&d.some(v=>v>.5&&v<gap))out.push({...A,msg:`${nm} arriva quasi al bordo della pagina ma non lo tocca: dopo il taglio resterebbe un filo bianco. Portala fino al bordo, così continua nell’abbondanza.`})}}
// Sulla pagina, con le guide: il bordo di ogni tessera e la sua etichetta.
function pgTileOverlay(k){const p=Pg.p,g=pgTileGrid(p),sw=pr2(1.2/k);let s='';for(let r=0;r<g.rows;r++)for(let c=0;c<g.cols;c++){const b=pgTileBox(g,c,r);s+=`<rect class="g-tile" x="${pr2(b.x)}" y="${pr2(b.y)}" width="${pr2(b.w)}" height="${pr2(b.h)}" fill="none" stroke-width="${sw}" stroke-dasharray="${pr2(8/k)} ${pr2(4/k)}"/><text class="g-tile-l" x="${pr2(b.x+6/k)}" y="${pr2(b.y+16/k)}" font-size="${pr2(12/k)}">${r+1}·${c+1}</text>`}return s}
// Festone: una lettera grande per foglio, su una bandierina o sul foglio intero, con i segni dei fori per il filo.
const PG_FEST_PAL={festa:['Festa: colori vivaci',['#c2185b','#0e6f8a','#e8a33d','#1e7a46','#7a3db8','#b35500']],pastello:['Pastello',['#f8c8d8','#c8e6f0','#fde2a6','#cdeccd','#e2d4f2','#fbe0c8']],bn:['Bianco e nero',['#ffffff','#1b1b1b']]};
async function pgFestoneDialog(){const sel=(id,label,value,opts)=>({id,label,type:'select',value,options:opts.map(([value,label])=>({value,label}))});
 const v=await modal('Festone di lettere','<p>Una lettera grande per foglio, da appendere a un filo. Ogni foglio ha la descrizione per chi non vede, e il festone si stampa con Stampa o PDF.</p>',[{id:'text',label:'Frase',value:'BUON COMPLEANNO'},sel('sheet','Foglio','a4',Object.entries(PG_SHEETS).map(([k,x])=>[k,x[0]])),sel('orient','Orientamento','port',[['port','Verticale'],['land','Orizzontale']]),sel('shape','Forma','flag',[['flag','Bandierina a punta'],['rect','Foglio intero']]),
  sel('pal','Colori','festa',Object.entries(PG_FEST_PAL).map(([k,x])=>[k,x[0]])),sel('style','Stile delle lettere','classica',Object.entries(PG_SIGN_STYLES).filter(([k])=>k!=='foto'&&k!=='cerchio').map(([k,x])=>[k,x[0]])),{id:'holes',label:'Segni dei fori per il filo',type:'checkbox',value:true},{id:'spaces',label:'Una stellina al posto degli spazi',type:'checkbox',value:false}],'Crea il festone');if(!v)return;
 const chars=[...v.text.trim().replace(/\s+/g,' ')].filter(ch=>v.spaces||ch!==' ').slice(0,80);if(!chars.length){toast('Scrivi la frase del festone');return}
 const [,w0,h0]=PG_SHEETS[v.sheet],land=v.orient==='land',w=(land?h0:w0)*MM,h=(land?w0:h0)*MM,pal=PG_FEST_PAL[v.pal][1],flag=v.shape==='flag',p=newPub('a4');
 Object.assign(p,{title:v.text.trim().slice(0,120),preset:'festone',w,h,m:{t:10*MM,r:10*MM,b:10*MM,l:10*MM},masters:[],pages:[],tiles:pgTilesDefault(false)});const letters=chars.filter(ch=>ch!==' ').length;let n=0;
 chars.forEach((ch,i)=>{const pg={...pgBlankPage(p),master:''},bg=pal[i%pal.length],ink=(pgContrast(bg,'#ffffff')||0)>=(pgContrast(bg,'#1b1b1b')||0)?'#ffffff':'#1b1b1b',star=ch===' ',st=pgSignStyle(v.style);
  if(st.fillType==='solid'||st.fillType==='grad'){st.fillType='solid';st.c1=ink}if(st.fillType==='none')st.oc=ink;if(st.ow>0&&st.fillType!=='none')st.oc=ink==='#ffffff'?'#1b1b1b':'#ffffff';
  pgPut(pg,pgMk(p,flag?'tri':'rect',{name:flag?'Bandierina':'Sfondo',x:0,y:0,w,h,fill:bg,stroke:'#8c8c8c',sw:bg==='#ffffff'?.3*MM:0}));
  const box=flag?{x:w*.2,y:h*.08,w:w*.6,h:h*.5}:{x:w*.12,y:h*.12,w:w*.76,h:h*.76};pgPut(pg,pgMk(p,'sign',{...st,name:star?'Stellina':`Lettera ${ch}`,text:star?'★':ch,...box,fit:true}));
  if(v.holes)for(const x of [w*.1,w*.9])pgPut(pg,pgMk(p,'ellipse',{name:'Foro',x:x-3*MM,y:6*MM,w:6*MM,h:6*MM,fill:'#ffffff',stroke:'#555555',sw:.3*MM}));
  if(!star)n++;pg.alt=star?'Stellina tra due parole':`Lettera «${ch}», ${n} di ${letters}, del festone «${p.title}»`;pg.readOk=true;p.pages.push(pg)});
 pgUseNew(p,'Festone');announce(`Festone «${p.title}»: ${p.pages.length} fogli ${PG_SHEETS[v.sheet][0]}, uno per lettera, ognuno con la sua descrizione. Stampalo con Stampa o PDF.`)}
