// Testo in tracciati: il contorno delle lettere viene dal file del carattere, letto con la Local Font Access API
// (window.queryLocalFonts, in Chrome e in Edge) oppure scelto dall'utente. Il lettore OpenType è qui, senza dipendenze:
// cmap (formati 4 e 12), head, hhea, hmtx, maxp, loca e glyf con i glifi composti, CFF con le curve cubiche, le raccolte
// .ttc e la crenatura (le coppie di GPOS o la vecchia tabella kern). Le lettere si dispongono come sul foglio: righe,
// allineamento, spaziatura, interlinea, a capo nel riquadro e lungo una curva.
// Un carattere (anche dentro una raccolta): misura dell'em, glifi dai codici Unicode, avanzamenti, crenatura e contorni
// in unità del carattere, con la y verso l'alto. Un contorno è un elenco di comandi M, L e C (le curve quadratiche di
// glyf diventano cubiche). pick sceglie il carattere della raccolta dai suoi nomi; senza, vale il primo.
function otfFont(buf,pick){const v=new DataView(buf),tag=o=>String.fromCharCode(v.getUint8(o),v.getUint8(o+1),v.getUint8(o+2),v.getUint8(o+3)),ttc=tag(0)==='ttcf';
 const faces=(ttc?Array.from({length:v.getUint32(8)},(_,i)=>v.getUint32(12+i*4)):[0]).map(o=>{const T={};for(let i=0,n=v.getUint16(o+4);i<n;i++){const r=o+12+i*16;T[tag(r)]={o:v.getUint32(r+8),l:v.getUint32(r+12)}}return {T,names:otfNames(v,T.name)}});
 const {T,names}=(pick&&faces.find(f=>pick(f.names)))||faces[0];
 if(T.CFF2)throw Error('usa contorni CFF2, quelli dei caratteri variabili, che Tassello non sa ancora leggere');
 if(!T.head||!T.hhea||!T.hmtx||!T.cmap||!(T.glyf&&T.loca||T['CFF ']))throw Error('non contiene i contorni delle lettere (forse è un carattere bitmap)');
 const upm=v.getUint16(T.head.o+18),long=v.getInt16(T.head.o+50),nG=T.maxp?v.getUint16(T.maxp.o+4):65535,nH=v.getUint16(T.hhea.o+34);
 const loca=T.loca&&(i=>long?v.getUint32(T.loca.o+i*4):v.getUint16(T.loca.o+i*2)*2),cff=!T.glyf&&otfCff(v,T['CFF '].o),memo=new Map();
 return {upm,names,cff:!!cff,gid:otfCmap(v,T.cmap.o),kern:otfKern(v,T,tag),adv:g=>v.getUint16(T.hmtx.o+4*Math.min(g,nH-1)),
  glyph:g=>{if(!memo.has(g))memo.set(g,g>=nG?[]:cff?cff(g):otfGlyf(v,T.glyf.o,loca,g,0));return memo.get(g)}}}
// Nomi del carattere (1 famiglia, 2 stile, 4 nome completo, 6 PostScript, 16 e 17 famiglia e stile tipografici),
// in inglese se ci sono più lingue.
function otfNames(v,t){const o={};if(!t)return o;const b=t.o,so=b+v.getUint16(b+4);
 for(let i=0,n=v.getUint16(b+2);i<n;i++){const r=b+6+i*12,pl=v.getUint16(r),id=v.getUint16(r+6),len=v.getUint16(r+8),at=so+v.getUint16(r+10);if(![1,2,4,6,16,17].includes(id)||o[id]&&!(pl===3&&v.getUint16(r+4)===0x409))continue;
  let s='';if(pl===3||pl===0)for(let k=0;k+1<len;k+=2)s+=String.fromCharCode(v.getUint16(at+k));else if(pl===1&&!v.getUint16(r+2))for(let k=0;k<len;k++)s+=String.fromCharCode(v.getUint8(at+k));else continue;o[id]=s}return o}
// cmap: prima la tabella completa (formato 12), poi quella del piano di base (formato 4). Restituisce glifo da codice.
function otfCmap(v,c){let o=0,best=0;for(let i=0,n=v.getUint16(c+2);i<n;i++){const r=c+4+i*8,pl=v.getUint16(r),en=v.getUint16(r+2),at=c+v.getUint32(r+4),f=v.getUint16(at),s=f===12&&(pl===0||pl===3&&en===10)?2:f===4&&(pl===0||pl===3&&en===1)?1:0;if(s>best){best=s;o=at}}
 if(!o)throw Error('non ha la tabella dei caratteri Unicode');
 if(best===2){const n=v.getUint32(o+12);return cp=>{let lo=0,hi=n-1;while(lo<=hi){const m=lo+hi>>1,r=o+16+m*12;if(cp<v.getUint32(r))hi=m-1;else if(cp>v.getUint32(r+4))lo=m+1;else return v.getUint32(r+8)+cp-v.getUint32(r)}return 0}}
 const n=v.getUint16(o+6)>>1,E=o+14,S=E+n*2+2,D=S+n*2,R=D+n*2;
 return cp=>{if(cp>65535)return 0;let lo=0,hi=n-1;while(lo<hi){const m=lo+hi>>1;if(v.getUint16(E+m*2)<cp)lo=m+1;else hi=m}const s=v.getUint16(S+lo*2);if(cp<s||cp>v.getUint16(E+lo*2))return 0;
  const ro=v.getUint16(R+lo*2),d=v.getUint16(D+lo*2);if(!ro)return cp+d&65535;const g=v.getUint16(R+lo*2+ro+(cp-s)*2);return g?g+d&65535:0}}
// glyf: contorni di punti sulla curva e fuori (le maniglie delle quadratiche); i glifi composti mettono insieme altri
// glifi spostati, scalati o trasformati. I componenti agganciati per punti (rari) restano senza spostamento.
function otfGlyf(v,base,loca,g,d){const a=loca(g),b=loca(g+1);if(b<=a||d>8)return [];const o=base+a,nc=v.getInt16(o);
 if(nc<0){const out=[];let p=o+10,f;do{f=v.getUint16(p);const c=v.getUint16(p+2),F2=q=>v.getInt16(q)/16384;p+=4;let dx,dy,m=[1,0,0,1];if(f&1){dx=v.getInt16(p);dy=v.getInt16(p+2);p+=4}else{dx=v.getInt8(p);dy=v.getInt8(p+1);p+=2}if(!(f&2))dx=dy=0;
   if(f&8){m=[F2(p),0,0,F2(p)];p+=2}else if(f&64){m=[F2(p),0,0,F2(p+2)];p+=4}else if(f&128){m=[F2(p),F2(p+2),F2(p+4),F2(p+6)];p+=8}
   for(const cs of otfGlyf(v,base,loca,c,d+1))out.push(cs.map(([t,...q])=>{const r=[t];for(let i=0;i<q.length;i+=2)r.push(m[0]*q[i]+m[2]*q[i+1]+dx,m[1]*q[i]+m[3]*q[i+1]+dy);return r}))}while(f&32);return out}
 const ends=[];for(let i=0;i<nc;i++)ends.push(v.getUint16(o+10+i*2));const np=nc?ends[nc-1]+1:0,fl=new Uint8Array(np);let p=o+10+nc*2;p+=2+v.getUint16(p);
 for(let i=0;i<np;){const f=v.getUint8(p++);fl[i++]=f;if(f&8)for(let r=v.getUint8(p++);r--&&i<np;)fl[i++]=f}
 const co=(sh,same)=>{const a=new Array(np);let c=0;for(let i=0;i<np;i++){const f=fl[i];if(f&sh){const d=v.getUint8(p++);c+=f&same?d:-d}else if(!(f&same)){c+=v.getInt16(p);p+=2}a[i]=c}return a};
 const X=co(2,16),Y=co(4,32);let s=0;return ends.map(e=>{const pts=[];for(let i=s;i<=e;i++)pts.push([X[i],Y[i],fl[i]&1]);s=e+1;return otfQuad(pts)}).filter(Boolean)}
// Un contorno di glyf in comandi: tra due punti fuori dalla curva c'è un punto sulla curva a metà; ogni quadratica
// diventa la cubica uguale (maniglie a due terzi).
function otfQuad(P){if(P.length<2)return null;const k=P.findIndex(p=>p[2]),st=k<0?[(P[0][0]+P[1][0])/2,(P[0][1]+P[1][1])/2,1]:P[k],L=k<0?[...P.slice(1),P[0]]:[...P.slice(k+1),...P.slice(0,k)],out=[['M',st[0],st[1]]];let cur=st,c=null;
 const q=e=>{out.push(['C',cur[0]+(c[0]-cur[0])*2/3,cur[1]+(c[1]-cur[1])*2/3,e[0]+(c[0]-e[0])*2/3,e[1]+(c[1]-e[1])*2/3,e[0],e[1]]);cur=e};
 for(const p of [...L,st]){if(p[2]){if(c)q(p);else{out.push(['L',p[0],p[1]]);cur=p}c=null}else{if(c)q([(c[0]+p[0])/2,(c[1]+p[1])/2]);c=p}}return out}
// CFF: le charstring di tipo 2, con le subroutine locali e globali, anche nei caratteri CID (FDArray e FDSelect).
// I suggerimenti (stem e hintmask) si saltano: servono allo schermo, non al contorno.
function otfCff(v,o){const idx=p=>{const n=v.getUint16(p);if(!n)return {n:0,end:p+2};const os=v.getUint8(p+2),rd=k=>{let x=0;for(let i=0;i<os;i++)x=x*256+v.getUint8(p+3+k*os+i);return x},b=p+2+(n+1)*os;return {n,end:b+rd(n),at:i=>[b+rd(i),b+rd(i+1)]}};
 const dict=(a,b)=>{const d={},st=[];for(let p=a;p<b;){const c=v.getUint8(p);if(c<22){let k=c;p++;if(c===12)k=1200+v.getUint8(p++);d[k]=st.splice(0);continue}
   if(c===28){st.push(v.getInt16(p+1));p+=3}else if(c===29){st.push(v.getInt32(p+1));p+=5}else if(c===30){let s='',end=false;p++;while(!end){const x=v.getUint8(p++);for(const h of [x>>4,x&15]){if(h===15){end=true;break}s+=h<10?h:['.','E','E-','','-'][h-10]}}st.push(parseFloat(s))}
   else if(c>=32&&c<247){st.push(c-139);p++}else if(c>=247&&c<251){st.push((c-247)*256+v.getUint8(p+1)+108);p+=2}else if(c>=251&&c<255){st.push(-(c-251)*256-v.getUint8(p+1)-108);p+=2}else p++}return d};
 const names=idx(o+v.getUint8(o+2)),tops=idx(names.end),strs=idx(tops.end),gs=idx(strs.end),top=dict(...tops.at(0)),cs=idx(o+top[17][0]);
 if((top[1206]?.[0]??2)!==2)throw Error('usa charstring CFF di tipo 1, che Tassello non sa leggere');
 const priv=pd=>{if(!pd)return {subrs:{n:0}};const [size,off]=pd,P=dict(o+off,o+off+size);return {subrs:P[19]?idx(o+off+P[19][0]):{n:0}}};
 let fds=null,sel=()=>0;if(top[1236]){const fa=idx(o+top[1236][0]),s=o+top[1237][0],f=v.getUint8(s);fds=Array.from({length:fa.n},(_,i)=>priv(dict(...fa.at(i))[18]));
  sel=g=>{if(f===0)return v.getUint8(s+1+g);for(let i=0,n=v.getUint16(s+1);i<n;i++)if(g<v.getUint16(s+3+(i+1)*3))return v.getUint8(s+5+i*3);return 0}}
 const P0=priv(top[18]),bias=n=>n<1240?107:n<33900?1131:32768;
 return g=>{if(g>=cs.n)return [];const pr=fds?fds[sel(g)]||fds[0]:P0,out=[],st=[];let x=0,y=0,stems=0,w=false,c=null;
  const mv=(dx,dy)=>{x+=dx;y+=dy;c=[['M',x,y]];out.push(c)},ln=(dx,dy)=>{x+=dx;y+=dy;c?.push(['L',x,y])},cu=(a,b,e,f,h,k)=>{const x1=x+a,y1=y+b,x2=x1+e,y2=y1+f;x=x2+h;y=y2+k;c?.push(['C',x1,y1,x2,y2,x,y])};
  // Il primo operatore che svuota la pila può avere in testa la larghezza del glifo: si scarta (vale hmtx).
  const wd=n=>{if(!w&&st.length>n)st.shift();w=true};
  const run=(a,b,d)=>{for(let p=a;p<b;){const b0=v.getUint8(p++);
    if(b0>=32||b0===28){if(b0===28){st.push(v.getInt16(p));p+=2}else if(b0<247)st.push(b0-139);else if(b0<251)st.push((b0-247)*256+v.getUint8(p++)+108);else if(b0<255)st.push(-(b0-251)*256-v.getUint8(p++)-108);else{st.push(v.getInt32(p)/65536);p+=4}continue}
    switch(b0){
     case 1:case 3:case 18:case 23:case 19:case 20:if(!w&&st.length%2)st.shift();w=true;stems+=st.length>>1;st.length=0;if(b0===19||b0===20)p+=stems+7>>3;break;
     case 21:wd(2);mv(st[0],st[1]);st.length=0;break;
     case 22:wd(1);mv(st[0],0);st.length=0;break;
     case 4:wd(1);mv(0,st[0]);st.length=0;break;
     case 5:for(let i=0;i+1<st.length;i+=2)ln(st[i],st[i+1]);st.length=0;break;
     case 6:case 7:{let h=b0===6;for(const n of st){h?ln(n,0):ln(0,n);h=!h}st.length=0;break}
     case 8:for(let i=0;i+5<st.length;i+=6)cu(...st.slice(i,i+6));st.length=0;break;
     case 24:{let i=0;for(;i+7<st.length;i+=6)cu(...st.slice(i,i+6));ln(st[i],st[i+1]);st.length=0;break}
     case 25:{let i=0;for(;i+7<st.length;i+=2)ln(st[i],st[i+1]);cu(...st.slice(i,i+6));st.length=0;break}
     case 26:{let i=st.length%2,e=i?st[0]:0;for(;i+3<st.length;i+=4){cu(e,st[i],st[i+1],st[i+2],0,st[i+3]);e=0}st.length=0;break}
     case 27:{let i=st.length%2,e=i?st[0]:0;for(;i+3<st.length;i+=4){cu(st[i],e,st[i+1],st[i+2],st[i+3],0);e=0}st.length=0;break}
     case 30:case 31:{let h=b0===31;for(let i=0;i+3<st.length;i+=4){const f=st.length-i===5?st[i+4]:0;h?cu(st[i],0,st[i+1],st[i+2],f,st[i+3]):cu(0,st[i],st[i+1],st[i+2],st[i+3],f);h=!h}st.length=0;break}
     case 10:case 29:{const S=b0===10?pr.subrs:gs,i=st.pop()+bias(S.n);if(S.at&&i>=0&&i<S.n&&d<10&&run(...S.at(i),d+1))return true;break}
     case 11:return false;
     case 14:wd(st.length===4||st.length===5?4:0);return true;
     case 12:{const e=v.getUint8(p++),s=st;if(e===35){cu(...s.slice(0,6));cu(...s.slice(6,12))}else if(e===34){cu(s[0],0,s[1],s[2],s[3],0);cu(s[4],0,s[5],-s[2],s[6],0)}else if(e===36){cu(...s.slice(0,5),0);cu(s[5],0,s[6],s[7],s[8],-(s[1]+s[3]+s[7]))}
      else if(e===37){const dx=s[0]+s[2]+s[4]+s[6]+s[8],dy=s[1]+s[3]+s[5]+s[7]+s[9];cu(...s.slice(0,6));Math.abs(dx)>Math.abs(dy)?cu(s[6],s[7],s[8],s[9],s[10],-dy):cu(s[6],s[7],s[8],s[9],-dx,s[10])}st.length=0;break}
     default:st.length=0}}return false};
  run(...cs.at(g),0);return out}}
// Crenatura: le coppie della funzione kern di GPOS (formati 1 e 2, anche dentro le estensioni) per la scrittura latina,
// altrimenti la vecchia tabella kern (formato 0). Come nel browser, GPOS vale se c'è.
function otfKern(v,T,tag){const memo=new Map(),sz=f=>{let n=0;for(let b=f&255;b;b>>=1)n+=b&1;return n*2},xa=(p,f)=>f&4?v.getInt16(p+((f&1)+(f>>1&1))*2):0;
 // Ricerca binaria in un elenco ordinato di glifi (sz 2) o di intervalli (sz 6): restituisce la posizione del record.
 const find=(c,g,sz)=>{let lo=0,hi=v.getUint16(c+2)-1;while(lo<=hi){const m=lo+hi>>1,r=c+4+m*sz,s=v.getUint16(r),e=sz===2?s:v.getUint16(r+2);if(g<s)hi=m-1;else if(g>e)lo=m+1;else return r}return 0};
 const cov=(c,g)=>{if(v.getUint16(c)===1){const r=find(c,g,2);return r?(r-c-4)/2:-1}const r=find(c,g,6);return r?v.getUint16(r+4)+g-v.getUint16(r):-1};
 const cls=(c,g)=>{if(v.getUint16(c)===1){const s=v.getUint16(c+2);return g>=s&&g<s+v.getUint16(c+4)?v.getUint16(c+6+(g-s)*2):0}const r=find(c,g,6);return r?v.getUint16(r+4):0};
 const pair=(s,a,b)=>{const ci=cov(s+v.getUint16(s+2),a);if(ci<0)return null;const f1=v.getUint16(s+4),rs=sz(f1)+sz(v.getUint16(s+6));
  if(v.getUint16(s)===1){const q=s+v.getUint16(s+10+ci*2),n=v.getUint16(q);let lo=0,hi=n-1;while(lo<=hi){const m=lo+hi>>1,r=q+2+m*(rs+2),g=v.getUint16(r);if(g===b)return xa(r+2,f1);if(g<b)lo=m+1;else hi=m-1}return null}
  return xa(s+16+(cls(s+v.getUint16(s+8),a)*v.getUint16(s+14)+cls(s+v.getUint16(s+10),b))*rs,f1)};
 let lk=[];if(T.GPOS){const g=T.GPOS.o,sl=g+v.getUint16(g+4),fl=g+v.getUint16(g+6),ll=g+v.getUint16(g+8),sr=Array.from({length:v.getUint16(sl)},(_,i)=>sl+2+i*6),sc=sr.find(r=>tag(r)==='latn')||sr.find(r=>tag(r)==='DFLT')||sr[0],ids=new Set();
  const ls=sc&&v.getUint16(sl+v.getUint16(sc+4));if(ls){const L=sl+v.getUint16(sc+4)+ls;for(let j=0,n=v.getUint16(L+4);j<n;j++){const r=fl+2+v.getUint16(L+6+j*2)*6;if(tag(r)==='kern'){const f=fl+v.getUint16(r+4);for(let k=0,m=v.getUint16(f+2);k<m;k++)ids.add(v.getUint16(f+4+k*2))}}}
  lk=[...ids].sort((a,b)=>a-b).map(i=>{const L=ll+v.getUint16(ll+2+i*2),t=v.getUint16(L);return Array.from({length:v.getUint16(L+4)},(_,j)=>{let s=L+v.getUint16(L+6+j*2),k=t;if(k===9){k=v.getUint16(s+2);s+=v.getUint32(s+4)}return k===2?s:0}).filter(Boolean)}).filter(l=>l.length)}
 let old=null;if(!lk.length&&T.kern&&v.getUint16(T.kern.o)===0){old=new Map();for(let i=0,p=T.kern.o+4,n=v.getUint16(T.kern.o+2);i<n;i++){const c=v.getUint16(p+4),np=v.getUint16(p+6);if(c>>8===0&&(c&7)===1)for(let j=0;j<np;j++){const r=p+14+j*6;old.set(v.getUint16(r)*65536+v.getUint16(r+2),v.getInt16(r+4))}p+=c>>8===0?14+np*6:v.getUint16(p+2)}}
 return (a,b)=>{const key=a*65536+b;if(old)return old.get(key)||0;if(!lk.length)return 0;if(memo.has(key))return memo.get(key);let k=0;for(const subs of lk)for(const s of subs){const r=pair(s,a,b);if(r!=null){k+=r;break}}memo.set(key,k);return k}}
// Caratteri del computer. Le famiglie di un testo si provano nell'ordine del browser; quelle generiche diventano i
// caratteri dei sistemi più diffusi (system-ui su Windows è Segoe UI).
const FONT_GENERIC={'system-ui':['Segoe UI','SF Pro Text','SF Pro','Helvetica Neue','Cantarell','Ubuntu','Noto Sans','DejaVu Sans'],'sans-serif':['Arial','Helvetica','Liberation Sans','DejaVu Sans'],serif:['Times New Roman','Times','Liberation Serif','DejaVu Serif'],monospace:['Consolas','Courier New','Menlo','Liberation Mono','DejaVu Sans Mono']};
const fontFamilies=css=>css.split(',').map(s=>s.trim().replace(/^['"]|['"]$/g,'')).flatMap(f=>FONT_GENERIC[f.toLowerCase()]||[f]);
// Peso e corsivo dal nome dello stile («Bold Italic», «Semibold», «Light»…), per scegliere la variante più vicina al testo.
function fontStyleOf(s){s=String(s||'').toLowerCase();return {w:/thin|hairline/.test(s)?100:/(extra|ultra) ?light/.test(s)?200:/(semi|demi) ?light/.test(s)?350:/light/.test(s)?300:/medium/.test(s)?500:/(semi|demi) ?bold/.test(s)?600:/(extra|ultra) ?bold/.test(s)?800:/black|heavy/.test(s)?900:/bold/.test(s)?700:400,i:/italic|oblique/.test(s)}}
const fontScore=(st,it)=>Math.abs(st.w-(it.bold?700:400))+(st.i!==!!it.italic?1000:0);
// I caratteri letti restano in memoria per la sessione, uno per famiglia, peso e corsivo dei testi; l'elenco di quelli
// installati si chiede una volta sola. slant: manca il corsivo e le lettere si inclinano; thin: manca il grassetto.
const fontFiles=new Map(),fontKey=it=>`${it.font}|${it.bold?700:400}|${!!it.italic}`;let fontList=null;
const fontEntry=(font,label,st,it)=>({font,label,slant:!!it.italic&&!st.i,thin:!!it.bold&&st.w<600});
// Prima di chiedere il permesso si spiega a che cosa serve; se il browser non legge i caratteri o il permesso è negato,
// si può scegliere il file del carattere. Restituisce 'ok', 'file' o null (annullato).
async function fontAccess(){if(fontList)return 'ok';const api=typeof window.queryLocalFonts==='function';let st='prompt',fin;if(api)try{st=(await navigator.permissions.query({name:'local-fonts'})).state}catch(e){}
 if(api&&st==='granted'&&await fontQuery())return 'ok';const ask=api&&st!=='denied';
 const why=!api?'<p>Questo browser non legge i caratteri installati sul computer: lo fanno Chrome ed Edge, dalla versione 103. Puoi scegliere tu il file del carattere (.ttf, .otf o .ttc); su Windows i caratteri stanno nella cartella C:\\Windows\\Fonts.</p>'
  :st==='denied'?'<p>Il permesso di leggere i caratteri installati è stato negato. Puoi darlo dalle impostazioni del sito (l’icona a sinistra dell’indirizzo) e riprovare, oppure scegliere tu il file del carattere (.ttf, .otf o .ttc).</p>'
  :'<p>Il browser ti chiederà il permesso di leggere i caratteri installati sul computer. Tassello Grafica legge solo i caratteri dei testi scelti, qui sul computer, e non manda niente in rete. Se preferisci, scegli tu il file del carattere (.ttf, .otf o .ttc).</p>';
 const r=await modal('Testo in tracciati','<p>Per trasformare un testo in tracciati serve il disegno delle sue lettere, che sta nel file del carattere.</p>'+why,[],ask?'Chiedi il permesso':'Scegli il file del carattere…',{buttons:ask?[{label:'Scegli il file…',run:()=>fin('file')}]:[],onOpen:(p,f)=>{fin=f}});
 if(!r)return null;if(r==='file'||!ask)return 'file';return await fontQuery()?'ok':null}
async function fontQuery(){try{const l=await window.queryLocalFonts();if(l.length){fontList=l;return true}}catch(e){if(e.name!=='NotAllowedError'&&e.name!=='SecurityError'){toast('I caratteri installati non si leggono: '+e.message);return false}}
 toast('Permesso negato: senza il file del carattere il testo resta un testo. Con «Converti in tracciato» puoi scegliere tu il file del carattere.');return false}
function fontPickFile(){return new Promise(ok=>{const inp=Object.assign(document.createElement('input'),{type:'file',accept:'.ttf,.otf,.ttc,.otc,font/ttf,font/otf,font/collection'});inp.onchange=()=>ok(inp.files[0]||null);inp.oncancel=()=>ok(null);inp.click()})}
// Il carattere di ogni testo: il primo della sua lista che è installato, nella variante più vicina per peso e corsivo.
// Il file scelto dall'utente vale per tutti i testi che lo aspettano (in una raccolta, il carattere della variante più
// vicina); si può scegliere anche per i testi il cui carattere non è tra quelli installati.
// Restituisce {out: id del testo → carattere, fail: [testo, perché]}, o null se l'utente ha annullato.
const fontLabel=it=>(FONTS.find(f=>f[0]===it.font)||[0,fontFamilies(it.font)[0]])[1];
async function fontFromFile(list){const f=await fontPickFile();if(!f)return false;let font;try{font=otfFont(await f.arrayBuffer(),n=>!fontScore(fontStyleOf(n[17]||n[2]),list[0]))}catch(e){toast(`«${f.name}» non è un carattere che Tassello sa leggere: ${e.message||'il file è rovinato'}.`);return false}
 for(const it of list)fontFiles.set(fontKey(it),fontEntry(font,font.names[4]||f.name,fontStyleOf(font.names[17]||font.names[2]),it));return true}
async function fontsFor(texts){const fail=[],need=texts.filter(it=>!fontFiles.has(fontKey(it))),lost=[];
 if(need.length){const how=await fontAccess();if(!how)return null;
  if(how==='file'){if(!await fontFromFile(need))return null}
  else for(const it of need){if(fontFiles.has(fontKey(it)))continue;const fams=fontFamilies(it.font);let fd=null;
   for(const fam of fams){const faces=fontList.filter(f=>f.family.toLowerCase()===fam.toLowerCase());if(faces.length){fd=faces.sort((a,b)=>fontScore(fontStyleOf(a.style),it)-fontScore(fontStyleOf(b.style),it))[0];break}}
   if(!fd){lost.push(it);continue}
   try{const font=otfFont(await (await fd.blob()).arrayBuffer(),n=>n[6]===fd.postscriptName);fontFiles.set(fontKey(it),fontEntry(font,font.names[4]||fd.fullName,fontStyleOf(fd.style),it))}catch(e){fail.push([it,`il carattere ${fd.fullName} ${e.message||'non si legge'}`])}}}
 if(lost.length){const names=[...new Set(lost.map(fontLabel))];if(!(await confirmAction(`${names.length>1?'I caratteri '+names.join(', ')+' non sono':'Il carattere '+names[0]+' non è'} tra quelli installati che il browser fa leggere. Vuoi scegliere tu il file del carattere (.ttf, .otf o .ttc)?`,'Scegli il file…')&&await fontFromFile(lost)))fail.push(...lost.map(it=>[it,`il carattere ${fontLabel(it)} non è tra quelli installati`]))}
 return {out:new Map(texts.filter(it=>fontFiles.has(fontKey(it))).map(it=>[it.id,fontFiles.get(fontKey(it))])),fail}}
// Le lettere come contorni, in pixel dall'angolo del riquadro del testo (di quello della curva, per il testo lungo un
// tracciato): le stesse righe, la stessa linea di base e lo stesso allineamento del testo sul foglio. Ogni carattere
// avanza della sua larghezza, più la crenatura con il successivo e la spaziatura; quelli che mancano nel carattere
// tengono il loro posto e restano fuori (miss li conta). dev è lo scarto più grande tra la larghezza di una riga e quella
// misurata dal browser: se supera l'1%, il carattere trovato non è proprio quello che si vede sul foglio.
function drawTextSubs(it,F){const f=F.font,k=it.size/f.upm,ls=it.ls||0,sk=F.slant?.2:0,subs=[];let miss=0,dev=0;measureCtx.font=fontCss(it);
 const run=s=>{const cs=[...s],gs=cs.map(c=>f.gid(c.codePointAt(0)));let x=0;const out=gs.map((g,i)=>{const at=x,a=g?f.adv(g)*k:measureCtx.measureText(cs[i]).width;if(!g&&cs[i].trim())miss++;x+=a+ls+(g&&gs[i+1]?f.kern(g,gs[i+1])*k:0);return [g,at,a]});
  const bw=measureCtx.measureText(s).width+ls*cs.length;if(bw>it.size)dev=Math.max(dev,Math.abs(x-bw)/bw);return {out,w:x}};
 // Un glifo con l'origine in (ox, oy), ruotato di r attorno al punto della linea di base a mid pixel dall'origine.
 const put=(g,ox,oy,r=0,mid=0)=>{const c=Math.cos(r),s=Math.sin(r),P=(x,y)=>{const lx=(x+y*sk)*k-mid,ly=-y*k;return [ox+c*lx-s*ly,oy+s*lx+c*ly]};
  for(const cmds of f.glyph(g)){const N=[];for(const [t,...q] of cmds){const [x,y]=P(q.at(-2),q.at(-1)),n={x:n2(x),y:n2(y),ix:0,iy:0,ox:0,oy:0,s:0};if(t==='C'){const [x1,y1]=P(q[0],q[1]),[x2,y2]=P(q[2],q[3]),a=N.at(-1);a.ox=n2(x1-a.x);a.oy=n2(y1-a.y);n.ix=n2(x2-x);n.iy=n2(y2-y)}N.push(n)}
   const a=N[0],b=N.at(-1);if(N.length>1&&Math.abs(a.x-b.x)<.01&&Math.abs(a.y-b.y)<.01){a.ix=b.ix;a.iy=b.iy;N.pop()}if(N.length<2)continue;
   for(const n of N){const li=Math.hypot(n.ix,n.iy),lo=Math.hypot(n.ox,n.oy);n.s=+(li>0&&lo>0&&n.ix*n.ox+n.iy*n.oy<0&&Math.abs(n.ix*n.oy-n.iy*n.ox)<.02*li*lo)}subs.push({closed:true,nodes:N})}};
 if(!it.subs){textLines(it).forEach((l,i)=>{const {out,w}=run(l),y=it.size*(it.lineH/2+.35)+i*it.size*it.lineH,x0=it.align==='center'?(it.w-w)/2:it.align==='right'?it.w-w:0;for(const [g,x] of out)if(g)put(g,x0+x,y)});return {subs,miss,dev}}
 // Lungo la curva ogni lettera sta con il centro della sua larghezza sul tracciato e gira con la tangente; quelle che
 // cadono prima dell'inizio o dopo la fine non si vedono, come nell'SVG.
 const seg=[];let L=0;for(const p of flatten({x:0,y:0,subs:it.subs},1))for(let i=1;i<p.length;i++){const [ax,ay]=p[i-1],[bx,by]=p[i],d=Math.hypot(bx-ax,by-ay);if(d>0){seg.push([L,ax,ay,bx,by,d]);L+=d}}
 const {out,w}=run(String(it.text).replace(/\n/g,' ')),st=(it.toff??(it.align==='center'?50:it.align==='right'?100:0))/100*L-(it.align==='center'?w/2:it.align==='right'?w:0);
 for(const [g,x,a] of out){const m=st+x+a/2;if(!g||m<0||m>L||!seg.length)continue;let lo=0,hi=seg.length-1;while(lo<hi){const q=lo+hi+1>>1;if(seg[q][0]<=m)lo=q;else hi=q-1}const [s0,ax,ay,bx,by,d]=seg[lo],u=(m-s0)/d;put(g,ax+(bx-ax)*u,ay+(by-ay)*u,Math.atan2(by-ay,bx-ax),a/2)}
 return {subs,miss,dev}}
// Il testo diventa un tracciato al suo posto, con riempimento, contorno, ombra, opacità, fusione e rotazione. Il testo
// resta per chi non vede: alt è la descrizione dell'oggetto e il titolo nell'SVG, e se il nome era quello automatico
// diventa il testo stesso; tsize e tbold servono alla verifica dell'accessibilità.
function drawTextToPath(it,o){const one=String(it.text).replace(/\s+/g,' ').trim();Object.assign(it,{kind:'path',subs:o.subs,alt:String(it.text),tsize:it.size,tbold:!!it.bold});
 if(/^Testo \d+$/.test(it.name))it.name=one.length>40?one.slice(0,39)+'…':one;for(const k of ['text','font','size','bold','italic','align','lineH','ls','wrap','toff','rule'])delete it[k];normPath(it)}
const altOf=it=>String(it.alt).replace(/\s+/g,' ').trim();
