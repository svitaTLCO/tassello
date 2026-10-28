// HEIC e HEIF (le foto degli iPhone): il contenitore si legge qui, le immagini HEVC le decodifica il sistema con
// WebCodecs (VideoDecoder), senza WebAssembly. Si leggono ftyp, meta con pitm, iinf, iloc, iref, idat e le proprietà
// (iprp: ipco e ipma) con hvcC, ispe, irot, imir e clap. La foto principale può essere un'immagine sola, una griglia
// di riquadri (grid) o una trasformazione di un'altra (iden); si decodificano i riquadri, si ricompongono e si
// raddrizzano. Le sovrapposizioni (iovl) e le altre composizioni non si ricostruiscono: si spiega che cosa fare.
const HEIF_HELP='Esporta la foto in JPEG dal telefono (su iPhone: Impostazioni › Fotocamera › Formati › Più compatibile, oppure condividila come JPEG) o dall’app Foto del computer';
const heifErr=m=>Error(m+'. '+HEIF_HELP+'.');
const heif4=(v,p)=>String.fromCharCode(v.getUint8(p),v.getUint8(p+1),v.getUint8(p+2),v.getUint8(p+3));
// Scatole ISO BMFF tra start ed end: tipo, inizio del contenuto e fine. Le dimensioni 1 (a 64 bit) e 0 (fino in fondo) valgono.
function heifBoxes(v,start,end){const out=[];for(let p=start;p+8<=end;){let size=v.getUint32(p),hdr=8;if(size===1){size=Number(v.getBigUint64(p+8));hdr=16}else if(!size)size=end-p;if(size<hdr||p+size>end)break;out.push({type:heif4(v,p+4),start:p+hdr,end:p+size});p+=size}return out}
// Interi senza segno di n byte (0, 1, 2, 4 o 8), letti in avanti.
const heifUint=(v,p,n)=>n===0?0:n===1?v.getUint8(p):n===2?v.getUint16(p):n===4?v.getUint32(p):n===8?Number(v.getBigUint64(p)):NaN;
function heifParse(buf){const v=new DataView(buf),top=heifBoxes(v,0,buf.byteLength),ftyp=top.find(b=>b.type==='ftyp');if(!ftyp)throw heifErr('Il file non è una foto HEIF valida');
 const brands=[];for(let p=ftyp.start;p+4<=ftyp.end;p+=4)if(p!==ftyp.start+4)brands.push(heif4(v,p));const meta=top.find(b=>b.type==='meta');if(!meta)throw heifErr('Il file HEIF non contiene immagini');
 const kids=heifBoxes(v,meta.start+4,meta.end),box=t=>kids.find(b=>b.type===t),H={brands,items:new Map(),props:[],refs:[],idat:null,v};
 const pitm=box('pitm');if(pitm)H.primary=v.getUint8(pitm.start)?v.getUint32(pitm.start+4):v.getUint16(pitm.start+4);
 const idat=box('idat');if(idat)H.idat=[idat.start,idat.end];
 const item=id=>{let it=H.items.get(id);if(!it)H.items.set(id,it={id,type:'',ext:[],method:0,props:[]});return it};
 const iinf=box('iinf');if(iinf){const ver=v.getUint8(iinf.start);for(const b of heifBoxes(v,iinf.start+(ver?8:6),iinf.end)){if(b.type!=='infe')continue;const ev=v.getUint8(b.start);if(ev<2)continue;const p=b.start+4,id=ev===2?v.getUint16(p):v.getUint32(p),q=p+(ev===2?2:4)+2;const it=item(id);it.type=heif4(v,q);it.hidden=!!(v.getUint32(b.start)&1)}}
 const iloc=box('iloc');if(iloc){let p=iloc.start;const ver=v.getUint8(p);p+=4;const a=v.getUint8(p),b=v.getUint8(p+1);p+=2;const os=a>>4,ls=a&15,bs=b>>4,is=ver?b&15:0,n=ver<2?v.getUint16(p):v.getUint32(p);p+=ver<2?2:4;
  for(let i=0;i<n;i++){const id=ver<2?v.getUint16(p):v.getUint32(p);p+=ver<2?2:4;const it=item(id);if(ver){it.method=v.getUint16(p)&15;p+=2}p+=2;const base=heifUint(v,p,bs);p+=bs;const ne=v.getUint16(p);p+=2;
   for(let e=0;e<ne;e++){if(is)p+=is;const off=heifUint(v,p,os);p+=os;const len=heifUint(v,p,ls);p+=ls;it.ext.push([base+off,len])}}}
 const iref=box('iref');if(iref){const ver=v.getUint8(iref.start),w=ver?4:2,rd=p=>ver?v.getUint32(p):v.getUint16(p);for(const b of heifBoxes(v,iref.start+4,iref.end)){let p=b.start;const from=rd(p);p+=w;const n=v.getUint16(p);p+=2;const to=[];for(let i=0;i<n;i++,p+=w)to.push(rd(p));H.refs.push({type:b.type,from,to})}}
 const iprp=box('iprp');if(iprp){const sub=heifBoxes(v,iprp.start,iprp.end),ipco=sub.find(b=>b.type==='ipco');if(ipco)H.props=heifBoxes(v,ipco.start,ipco.end);
  for(const ipma of sub.filter(b=>b.type==='ipma')){let p=ipma.start;const ver=v.getUint8(p),big=v.getUint32(p)&1;p+=4;const n=v.getUint32(p);p+=4;
   for(let i=0;i<n;i++){const id=ver<1?v.getUint16(p):v.getUint32(p);p+=ver<1?2:4;const c=v.getUint8(p++),it=item(id);for(let k=0;k<c;k++){const x=big?v.getUint16(p):v.getUint8(p);p+=big?2:1;const idx=x&(big?0x7fff:0x7f);if(idx&&H.props[idx-1])it.props.push(H.props[idx-1])}}}}
 if(!H.items.has(H.primary))throw heifErr('Il file HEIF non indica la foto principale');return H}
const heifProp=(it,t)=>it.props.find(b=>b.type===t);
// I dati di un'immagine: i pezzi indicati da iloc, nel file (metodo 0) o dentro idat (metodo 1).
function heifData(H,it){const parts=it.ext.map(([o,l])=>{const s=it.method===1?H.idat[0]+o:o;return new Uint8Array(H.v.buffer,s,l||((it.method===1?H.idat[1]:H.v.byteLength)-s))});if(parts.length===1)return parts[0];const out=new Uint8Array(parts.reduce((a,p)=>a+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
// Il codice del codec per WebCodecs, dalla configurazione hvcC: profilo, compatibilità (bit rovesciati), livello e vincoli.
function heifCodec(c){const sp=c[1]>>6,tier=c[1]>>5&1,prof=c[1]&31,f=(c[2]<<24|c[3]<<16|c[4]<<8|c[5])>>>0;let rev=0;for(let i=0;i<32;i++)if(f>>>i&1)rev|=1<<(31-i);
 const cons=[...c.subarray(6,12)];while(cons.length&&!cons[cons.length-1])cons.pop();return ['hvc1',(sp?'ABC'[sp-1]:'')+prof,(rev>>>0).toString(16).toUpperCase(),(tier?'H':'L')+c[12],...cons.map(x=>x.toString(16).toUpperCase())].join('.')}
// Riquadri HEVC decodificati uno dopo l'altro con lo stesso decodificatore; ogni riquadro si disegna al suo posto.
async function heifTiles(H,list,draw){const cfgOf=it=>{const c=heifProp(it,'hvcC'),e=heifProp(it,'ispe');if(!c)throw heifErr('Questa foto HEIF non è in HEVC e il browser non sa aprirla');const d=new Uint8Array(H.v.buffer,c.start,c.end-c.start);return {codec:heifCodec(d),description:d,codedWidth:e?H.v.getUint32(e.start+4):undefined,codedHeight:e?H.v.getUint32(e.start+8):undefined}};
 if(typeof VideoDecoder==='undefined')throw heifErr('Questo browser non sa decodificare le foto HEIC');
 let cfg=null,dec=null,err=null;const pending=new Map();
 const open=async c=>{const ok=await VideoDecoder.isConfigSupported(c).then(r=>r.supported,()=>false);if(!ok)throw Error(`Il sistema non ha il decodificatore HEVC che serve per le foto HEIC. ${HEIF_HELP}; oppure, su Windows, installa l’estensione «Estensioni video HEVC» dal Microsoft Store e riapri la foto.`);
  dec=new VideoDecoder({output:f=>{const k=pending.get(f.timestamp);pending.delete(f.timestamp);try{if(k)draw(f,k)}finally{f.close()}},error:e=>{err=e}});dec.configure(c)};
 try{for(let i=0;i<list.length;i++){const it=list[i],c=cfgOf(it);if(!cfg||cfg.codec!==c.codec||cfg.description.join()!==c.description.join()){if(dec){await dec.flush();dec.close()}await open(c);cfg=c}
   pending.set(i,{i,it});dec.decode(new EncodedVideoChunk({type:'key',timestamp:i,data:heifData(H,it)}));if(dec.decodeQueueSize>8)await new Promise(r=>dec.addEventListener('dequeue',r,{once:true}))}
  await dec?.flush()}catch(e){throw err||e}finally{if(dec&&dec.state!=='closed')dec.close()}
 if(err)throw heifErr('La foto HEIC non si decodifica: '+(err.message||err));if(pending.size)throw heifErr('Alcuni riquadri della foto HEIC non si decodificano')}
// Trasformazioni nell'ordine in cui sono elencate: ritaglio (clap), rotazione antioraria (irot), specchiatura (imir).
function heifTransform(H,it,cv){const v=H.v;for(const b of it.props){let out;const W=cv.width,Ht=cv.height;
  if(b.type==='clap'){const r=k=>v.getInt32(b.start+k*4)/(v.getInt32(b.start+k*4+4)||1),cw=Math.round(r(0)),ch=Math.round(r(2)),x=Math.round(r(4)+(W-1)/2-(cw-1)/2),y=Math.round(r(6)+(Ht-1)/2-(ch-1)/2);
   if(cw>0&&ch>0&&(cw<W||ch<Ht)){out=new OffscreenCanvas(cw,ch);out.getContext('2d').drawImage(cv,-Math.max(0,x),-Math.max(0,y))}}
  else if(b.type==='irot'){const a=v.getUint8(b.start)&3;if(a){out=new OffscreenCanvas(a&1?Ht:W,a&1?W:Ht);const c=out.getContext('2d');c.translate(out.width/2,out.height/2);c.rotate(-a*Math.PI/2);c.drawImage(cv,-W/2,-Ht/2)}}
  else if(b.type==='imir'){const ax=v.getUint8(b.start)&1;out=new OffscreenCanvas(W,Ht);const c=out.getContext('2d');if(ax)c.setTransform(-1,0,0,1,W,0);else c.setTransform(1,0,0,-1,0,Ht);c.drawImage(cv,0,0)}
  if(out)cv=out}return cv}
// Un'immagine della foto, già ricomposta e trasformata.
async function heifImage(H,id,depth=0){const it=H.items.get(id);if(!it||depth>4)throw heifErr('La foto HEIF è incompleta');const dimg=H.refs.find(r=>r.type==='dimg'&&r.from===id)?.to||[];let cv;
 if(it.type==='hvc1'){const e=heifProp(it,'ispe');cv=new OffscreenCanvas(e?H.v.getUint32(e.start+4):1,e?H.v.getUint32(e.start+8):1);const x=cv.getContext('2d');
  await heifTiles(H,[it],f=>{if(cv.width!==f.displayWidth||cv.height!==f.displayHeight){cv.width=f.displayWidth;cv.height=f.displayHeight}x.drawImage(f,0,0)})}
 else if(it.type==='grid'){const d=heifData(H,it),dv=new DataView(d.buffer,d.byteOffset,d.byteLength),big=d[1]&1,rows=d[2]+1,cols=d[3]+1,W=big?dv.getUint32(4):dv.getUint16(4),Ht=big?dv.getUint32(8):dv.getUint16(6);
  if(dimg.length<rows*cols)throw heifErr('La griglia della foto HEIC è incompleta');if(W*Ht>MAX_PIXELS)throw Error(`La foto è troppo grande (${fmtInt(W)} × ${fmtInt(Ht)} pixel): il limite è di ${fmtInt(MAX_PIXELS/1e6)} milioni di pixel.`);
  cv=new OffscreenCanvas(W,Ht);const x=cv.getContext('2d');let tw=0,th=0;await heifTiles(H,dimg.slice(0,rows*cols).map(t=>H.items.get(t)),(f,{i})=>{tw||=f.displayWidth;th||=f.displayHeight;x.drawImage(f,(i%cols)*tw,Math.floor(i/cols)*th)})}
 else if(it.type==='iden'&&dimg.length)cv=await heifImage(H,dimg[0],depth+1);
 else throw heifErr(it.type==='iovl'?'Questa foto HEIF è una sovrapposizione di più immagini, che Immagini non sa ricomporre':`Questa foto HEIF usa un tipo d’immagine (${it.type||'sconosciuto'}) che Immagini non sa aprire`);
 return heifTransform(H,it,cv)}
// Le foto AV1 in un contenitore HEIF (AVIF con un altro nome) le apre il browser da solo.
async function heifDecode(file){const H=heifParse(await file.arrayBuffer());if(H.items.get(H.primary).type==='av01')return createImageBitmap(file,{imageOrientation:'from-image'}).catch(()=>{throw heifErr('Questa foto HEIF è in AV1 e il browser non sa aprirla')});
 return createImageBitmap(await heifImage(H,H.primary))}
