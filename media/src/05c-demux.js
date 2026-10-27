// Lettori dei contenitori MP4 (anche frammentati, come quelli registrati dal browser) e WebM/Matroska. Trovano le
// tracce, i parametri dei decodificatori, la rotazione e la posizione di ogni pacchetto nel file leggendolo a pezzi:
// video e audio si decodificano poi con WebCodecs solo nei tratti che servono, senza tenere il file in memoria.
const readBytes=async(blob,at,len)=>new Uint8Array(await blob.slice(at,at+len).arrayBuffer());
const fourcc=(b,at)=>String.fromCharCode(b[at],b[at+1],b[at+2],b[at+3]);
const hex2=n=>n.toString(16).padStart(2,'0');
// Pacchetti di una traccia: posizione e dimensione nel file, istanti di presentazione (pts) e di decodifica (dts) in
// secondi, durata, fotogramma chiave. Si raccolgono in elenchi e diventano array tipizzati alla fine.
const packetList=()=>({off:[],size:[],pts:[],dts:[],dur:[],key:[]});
function packPackets(p){const n=p.off.length;for(let i=0;i<n;i++)if(!(p.dur[i]>0))p.dur[i]=i+1<n?Math.max(0,p.dts[i+1]-p.dts[i]):(p.dur[i-1]||0);
 return{n,off:Float64Array.from(p.off),size:Uint32Array.from(p.size),pts:Float64Array.from(p.pts),dts:Float64Array.from(p.dts),dur:Float64Array.from(p.dur),key:Uint8Array.from(p.key)}}
async function demuxMedia(blob){if(!blob||blob.size<16)return null;const head=await readBytes(blob,0,16);
 try{if(head[0]===0x1A&&head[1]===0x45&&head[2]===0xDF&&head[3]===0xA3)return await demuxWebm(blob);
  if(['ftyp','moov','mdat','free','skip','wide','styp'].includes(fourcc(head,4)))return await demuxMp4(blob)}catch(e){console.warn('Contenitore non letto',e)}
 return null}
// Codici dei decodificatori dalle loro configurazioni, nel formato che WebCodecs si aspetta.
function avcCodec(fmt,c){return`${fmt==='avc3'?'avc3':'avc1'}.${hex2(c[1])}${hex2(c[2])}${hex2(c[3])}`}
function hevcCodec(fmt,c){const space=c[1]>>6,tier=(c[1]>>5)&1,prof=c[1]&31;let compat=((c[2]<<24)|(c[3]<<16)|(c[4]<<8)|c[5])>>>0,rev=0;for(let i=0;i<32;i++){rev=(rev<<1)|(compat&1);compat>>>=1}
 const cons=[c[6],c[7],c[8],c[9],c[10],c[11]];while(cons.length&&!cons.at(-1))cons.pop();return`${fmt==='hev1'?'hev1':'hvc1'}.${['','A','B','C'][space]}${prof}.${(rev>>>0).toString(16)}.${tier?'H':'L'}${c[12]}${cons.map(x=>'.'+x.toString(16)).join('')}`}
function av1Codec(c){const prof=c[1]>>5,level=c[1]&31,tier=c[2]>>7,high=(c[2]>>6)&1,twelve=(c[2]>>5)&1;return`av01.${prof}.${String(level).padStart(2,'0')}${tier?'H':'M'}.${high?(twelve?'12':'10'):'08'}`}
function aacCodec(asc){let aot=asc[0]>>3;if(aot===31)aot=32+(((asc[0]&7)<<3)|(asc[1]>>5));return'mp4a.40.'+aot}
// Intestazione Opus (OpusHead, in little endian) ricostruita dalla scatola dOps dell'MP4 (in big endian).
function opusHeadFromDops(b,v,at,end){const ch=b[at+1],out=new Uint8Array(19+(b[at+10]?2+ch:0)),o=new DataView(out.buffer);out.set([79,112,117,115,72,101,97,100]);out[8]=1;out[9]=ch;o.setUint16(10,v.getUint16(at+2),true);o.setUint32(12,v.getUint32(at+4),true);o.setInt16(16,v.getInt16(at+8),true);out[18]=b[at+10];if(b[at+10])out.set(b.subarray(at+11,Math.min(end,at+13+ch)),19);return out}
// ---- MP4 ----
function* mp4Boxes(b,v,start,end){let at=start;while(at+8<=end){let size=v.getUint32(at),hdr=8;const type=fourcc(b,at+4);if(size===1){size=Number(v.getBigUint64(at+8));hdr=16}else if(size===0)size=end-at;if(size<hdr||at+size>end)return;yield{type,at,start:at+hdr,end:at+size};at+=size}}
function mp4Child(b,v,box,type){if(!box)return null;for(const c of mp4Boxes(b,v,box.start,box.end))if(c.type===type)return c;return null}
const mp4Path=(b,v,box,...types)=>types.reduce((x,t)=>mp4Child(b,v,x,t),box);
// Lunghezza dei descrittori MPEG-4: fino a quattro byte da 7 bit.
function descLen(b,at){let n=0,i=0;for(;i<4;i++){const x=b[at+i];n=(n<<7)|(x&127);if(!(x&128))break}return{n,len:i+1}}
function esdsConfig(b,at,end){let p=at+4;if(b[p]!==3)return null;let d=descLen(b,p+1);p+=1+d.len;const flags=b[p+2];p+=3;if(flags&128)p+=2;if(flags&64)p+=1+b[p];if(flags&32)p+=2;if(b[p]!==4)return null;d=descLen(b,p+1);p+=1+d.len;const oti=b[p];p+=13;
 if(b[p]!==5)return{oti,asc:null};d=descLen(b,p+1);p+=1+d.len;return{oti,asc:b.slice(p,Math.min(end,p+d.n))}}
function mp4SampleEntry(b,v,stsd,type){const e=stsd.start+8,size=v.getUint32(e),fmt=fourcc(b,e+4),end=Math.min(stsd.end,e+size),t={fmt,codec:null,description:null};
 if(type==='video'){t.width=v.getUint16(e+32);t.height=v.getUint16(e+34);const kids=[...mp4Boxes(b,v,e+86,end)],cfg=x=>{const k=kids.find(c=>c.type===x);return k?b.slice(k.start,k.end):null};
  if(fmt==='avc1'||fmt==='avc3'){const c=cfg('avcC');if(c){t.codec=avcCodec(fmt,c);t.description=c}}
  else if(fmt==='hvc1'||fmt==='hev1'){const c=cfg('hvcC');if(c){t.codec=hevcCodec(fmt,c);t.description=c}}
  else if(fmt==='vp09'){const c=cfg('vpcC');t.codec=c?`vp09.${String(c[4]).padStart(2,'0')}.${String(c[5]).padStart(2,'0')}.${String(c[6]>>4).padStart(2,'0')}`:'vp09.00.10.08'}
  else if(fmt==='av01'){const c=cfg('av1C');if(c)t.codec=av1Codec(c)}}
 else{const ver=v.getUint16(e+16);t.channels=v.getUint16(e+24);t.sampleRate=v.getUint32(e+32)>>>16;if(ver===2){t.sampleRate=Math.round(v.getFloat64(e+40));t.channels=v.getUint32(e+48)}
  const kids=[...mp4Boxes(b,v,e+36+(ver===1?16:ver===2?36:0),end)];
  if(fmt==='mp4a'){const k=kids.find(c=>c.type==='esds')||[...kids].map(c=>c.type==='wave'?[...mp4Boxes(b,v,c.start,c.end)].find(x=>x.type==='esds'):null).find(Boolean);const cf=k&&esdsConfig(b,k.start,k.end);
   if(cf?.asc&&[0x40,0x66,0x67,0x68].includes(cf.oti)){t.codec=aacCodec(cf.asc);t.description=cf.asc;const sr=[96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000,7350][((cf.asc[0]&7)<<1)|(cf.asc[1]>>7)];if(sr)t.sampleRate=sr}else if(cf&&(cf.oti===0x6B||cf.oti===0x69))t.codec='mp3'}
  else if(fmt==='Opus'){const k=kids.find(c=>c.type==='dOps');t.codec='opus';t.sampleRate=48000;if(k){t.description=opusHeadFromDops(b,v,k.start,k.end);t.preSkip=v.getUint16(k.start+2)}}
  else if(fmt==='.mp3')t.codec='mp3'}
 return t}
// Tabelle dei campioni di una traccia non frammentata.
function mp4Samples(b,v,stbl,scale,shift){const box=t=>mp4Child(b,v,stbl,t),P=packetList(),stts=box('stts'),ctts=box('ctts'),stss=box('stss'),stsc=box('stsc'),stsz=box('stsz'),stz2=box('stz2'),stco=box('stco'),co64=box('co64');
 const sizes=[];if(stsz){const fixed=v.getUint32(stsz.start+4),n=v.getUint32(stsz.start+8);for(let i=0;i<n;i++)sizes.push(fixed||v.getUint32(stsz.start+12+i*4))}
 else if(stz2){const fs=b[stz2.start+7],n=v.getUint32(stz2.start+8);for(let i=0;i<n;i++)sizes.push(fs===16?v.getUint16(stz2.start+12+i*2):fs===8?b[stz2.start+12+i]:(b[stz2.start+12+(i>>1)]>>(i&1?0:4))&15)}
 const n=sizes.length;if(!n||!stsc||!(stco||co64))return P;
 const chunks=[];if(stco){const k=v.getUint32(stco.start+4);for(let i=0;i<k;i++)chunks.push(v.getUint32(stco.start+8+i*4))}else{const k=v.getUint32(co64.start+4);for(let i=0;i<k;i++)chunks.push(Number(v.getBigUint64(co64.start+8+i*8)))}
 const sc=[];{const k=v.getUint32(stsc.start+4);for(let i=0;i<k;i++)sc.push([v.getUint32(stsc.start+8+i*12),v.getUint32(stsc.start+12+i*12)])}
 let s=0;for(let ci=0,e=0;ci<chunks.length&&s<n;ci++){while(e+1<sc.length&&sc[e+1][0]<=ci+1)e++;let at=chunks[ci];for(let k=0;k<sc[e][1]&&s<n;k++,s++){P.off.push(at);P.size.push(sizes[s]);at+=sizes[s]}}
 const durs=[];if(stts){const k=v.getUint32(stts.start+4);for(let i=0;i<k;i++){const c=v.getUint32(stts.start+8+i*8),d=v.getUint32(stts.start+12+i*8);for(let j=0;j<c&&durs.length<n;j++)durs.push(d)}}
 const cts=new Array(n).fill(0);if(ctts){const ver=b[ctts.start],k=v.getUint32(ctts.start+4);for(let i=0,q=0;i<k&&q<n;i++){const c=v.getUint32(ctts.start+8+i*8),o=ver?v.getInt32(ctts.start+12+i*8):v.getUint32(ctts.start+12+i*8);for(let j=0;j<c&&q<n;j++)cts[q++]=o}}
 const keys=stss?new Set(Array.from({length:v.getUint32(stss.start+4)},(_,i)=>v.getUint32(stss.start+8+i*4))):null;
 let dts=0;for(let i=0;i<P.off.length;i++){const d=durs[i]??durs.at(-1)??0;P.dts.push((dts-shift)/scale);P.pts.push((dts+cts[i]-shift)/scale);P.dur.push(d/scale);P.key.push(keys?(keys.has(i+1)?1:0):1);dts+=d}return P}
async function demuxMp4(blob){const top=[];let at=0;
 while(at+8<=blob.size&&top.length<400000){const h=await readBytes(blob,at,16),v=new DataView(h.buffer);let size=v.getUint32(0),hdr=8;const type=fourcc(h,4);if(size===1){size=Number(v.getBigUint64(8));hdr=16}else if(size===0)size=blob.size-at;if(size<hdr)break;top.push({type,at,size,hdr});at+=size}
 const mb=top.find(x=>x.type==='moov');if(!mb)return null;const b=await readBytes(blob,mb.at,mb.size),v=new DataView(b.buffer),moov={start:mb.hdr,end:b.length};
 const mvhd=mp4Child(b,v,moov,'mvhd'),mver=mvhd&&b[mvhd.start],movieScale=mvhd?v.getUint32(mvhd.start+(mver?20:12)):1000,tracks=[],trex=new Map();
 for(const x of mp4Boxes(b,v,mp4Child(b,v,moov,'mvex')?.start??0,mp4Child(b,v,moov,'mvex')?.end??0))if(x.type==='trex')trex.set(v.getUint32(x.start+4),{dur:v.getUint32(x.start+12),size:v.getUint32(x.start+16),flags:v.getUint32(x.start+20)});
 for(const trak of mp4Boxes(b,v,moov.start,moov.end)){if(trak.type!=='trak')continue;const tkhd=mp4Child(b,v,trak,'tkhd'),mdia=mp4Child(b,v,trak,'mdia'),mdhd=mp4Child(b,v,mdia,'mdhd'),hdlr=mp4Child(b,v,mdia,'hdlr');if(!tkhd||!mdhd||!hdlr)continue;
  const handler=fourcc(b,hdlr.start+8),type=handler==='vide'?'video':handler==='soun'?'audio':null;if(!type)continue;const tv=b[tkhd.start],mo=tkhd.start+(tv?52:40),scale=v.getUint32(mdhd.start+(b[mdhd.start]?20:12));
  const rotation=((Math.round(Math.atan2(v.getInt32(mo+4),v.getInt32(mo))*2/Math.PI)*90)%360+360)%360,stbl=mp4Path(b,v,mdia,'minf','stbl'),stsd=mp4Child(b,v,stbl,'stsd');if(!stsd)continue;
  // Elenco delle modifiche (edts/elst): un tratto vuoto iniziale ritarda la traccia, media_time dice da dove si comincia.
  let shift=0,delay=0;const elst=mp4Path(b,v,trak,'edts','elst');if(elst){const ev=b[elst.start],k=v.getUint32(elst.start+4);for(let i=0;i<k;i++){const p=elst.start+8+i*(ev?20:12),dur=ev?Number(v.getBigUint64(p)):v.getUint32(p),mt=ev?Number(v.getBigInt64(p+8)):v.getInt32(p+4);if(mt===-1){delay+=dur/movieScale;continue}shift=mt;break}}
  const t={id:v.getUint32(tkhd.start+(tv?20:12)),type,scale,rotation,...mp4SampleEntry(b,v,stsd,type)},P=mp4Samples(b,v,stbl,scale,shift);if(delay)for(const k of ['pts','dts'])P[k]=P[k].map(x=>x+delay);t.P=P;t.shift=shift;t.delay=delay;tracks.push(t)}
 // MP4 frammentato: i campioni stanno nei moof, ognuno con la sua tabella (trun) per traccia.
 if(tracks.some(t=>!t.P.off.length)&&top.some(x=>x.type==='moof')){const next=new Map();
  for(const mf of top){if(mf.type!=='moof')continue;const fb=await readBytes(blob,mf.at,mf.size),fv=new DataView(fb.buffer);
   for(const traf of mp4Boxes(fb,fv,mf.hdr,fb.length)){if(traf.type!=='traf')continue;const tfhd=mp4Child(fb,fv,traf,'tfhd');if(!tfhd)continue;const fl=fv.getUint32(tfhd.start)&0xFFFFFF,id=fv.getUint32(tfhd.start+4),t=tracks.find(x=>x.id===id);if(!t)continue;
    let p=tfhd.start+8,base=mf.at;const df=trex.get(id)||{dur:0,size:0,flags:0};let dDur=df.dur,dSize=df.size,dFlags=df.flags;if(fl&1){base=Number(fv.getBigUint64(p));p+=8}if(fl&2)p+=4;if(fl&8){dDur=fv.getUint32(p);p+=4}if(fl&16){dSize=fv.getUint32(p);p+=4}if(fl&32){dFlags=fv.getUint32(p);p+=4}
    const tfdt=mp4Child(fb,fv,traf,'tfdt');let dts=tfdt?(fb[tfdt.start]?Number(fv.getBigUint64(tfdt.start+4)):fv.getUint32(tfdt.start+4)):(next.get(id)?.dts||0),pos=base;
    for(const tr of mp4Boxes(fb,fv,traf.start,traf.end)){if(tr.type!=='trun')continue;const tf=fv.getUint32(tr.start)&0xFFFFFF,ver=fb[tr.start],cnt=fv.getUint32(tr.start+4);let q=tr.start+8;if(tf&1){pos=base+fv.getInt32(q);q+=4}let first=null;if(tf&4){first=fv.getUint32(q);q+=4}
     for(let i=0;i<cnt;i++){let d=dDur,s=dSize,f=i===0&&first!==null?first:dFlags,o=0;if(tf&0x100){d=fv.getUint32(q);q+=4}if(tf&0x200){s=fv.getUint32(q);q+=4}if(tf&0x400){f=fv.getUint32(q);q+=4}if(tf&0x800){o=ver?fv.getInt32(q):fv.getUint32(q);q+=4}
      if(i===0&&first!==null)f=first;const P=t.P;P.off.push(pos);P.size.push(s);P.dts.push((dts-t.shift)/t.scale+t.delay);P.pts.push((dts+o-t.shift)/t.scale+t.delay);P.dur.push(d/t.scale);P.key.push(f&0x10000?0:1);pos+=s;dts+=d}}
    next.set(id,{dts})}}}
 for(const t of tracks)t.packets=packPackets(t.P),delete t.P;const live=tracks.filter(t=>t.packets.n);
 return{kind:'mp4',tracks:live,duration:live.reduce((m,t)=>Math.max(m,t.packets.pts[t.packets.n-1]+t.packets.dur[t.packets.n-1]),0)}}
// ---- WebM / Matroska ----
// Si legge il file una volta, a finestre di 4 MB, annotando dove sta ogni blocco; i dati dei blocchi si saltano.
async function demuxWebm(blob){const WIN=4<<20;let buf=new Uint8Array(0),base=0;
 const have=async(pos,len)=>{if(pos>=base&&pos+len<=base+buf.length)return true;if(pos>=blob.size)return false;buf=await readBytes(blob,pos,Math.min(blob.size,pos+Math.max(len,WIN))-pos);base=pos;return pos+len<=base+buf.length};
 const byte=p=>buf[p-base];
 const id=async p=>{if(!await have(p,4)&&p>=blob.size)return null;const f=byte(p);let len=1;while(len<=4&&!(f&(0x80>>(len-1))))len++;if(len>4||!await have(p,len))return null;let x=0;for(let i=0;i<len;i++)x=x*256+byte(p+i);return{id:x,len}};
 const vint=async p=>{if(!await have(p,8)&&!await have(p,1))return null;const f=byte(p);let len=1;while(len<=8&&!(f&(0x80>>(len-1))))len++;if(len>8||!await have(p,len))return null;let x=f&(0xFF>>len),all=x===(0xFF>>len);for(let i=1;i<len;i++){x=x*256+byte(p+i);if(byte(p+i)!==255)all=false}return{value:x,len,unknown:all}};
 const head=async p=>{const a=await id(p);if(!a)return null;const s=await vint(p+a.len);if(!s)return null;return{id:a.id,data:p+a.len+s.len,size:s.unknown?Infinity:s.value}};
 const bytesOf=async(p,n)=>{await have(p,n);return buf.slice(p-base,p-base+n)};
 const uintOf=b=>b.reduce((x,y)=>x*256+y,0),floatOf=b=>{const v=new DataView(b.buffer,b.byteOffset,b.length);return b.length===4?v.getFloat32(0):v.getFloat64(0)};
 // Figli di un elemento piccolo già in memoria (Info, Tracks).
 const kids=b=>{const out=[];let p=0;while(p<b.length){let f=b[p],l=1;while(l<=4&&!(f&(0x80>>(l-1))))l++;let x=0;for(let i=0;i<l;i++)x=x*256+b[p+i];p+=l;f=b[p];let sl=1;while(sl<=8&&!(f&(0x80>>(sl-1))))sl++;let s=f&(0xFF>>sl);for(let i=1;i<sl;i++)s=s*256+b[p+i];p+=sl;out.push({id:x,b:b.subarray(p,Math.min(b.length,p+s))});p+=s}return out};
 const top=await head(0);if(!top||top.id!==0x1A45DFA3)return null;const seg=await head(top.data+top.size);if(!seg||seg.id!==0x18538067)return null;
 const segEnd=Math.min(blob.size,seg.data+seg.size),TOP=new Set([0x1F43B675,0x1C53BB6B,0x1254C367,0x1043A770,0x1941A469,0x114D9B74,0x1549A966,0x1654AE6B]);let scale=1e6,duration=0;const tracks=new Map();
 const block=async(p,size,tc,keyFlag)=>{const tn=await vint(p);if(!tn)return;const t=tracks.get(tn.value);if(!t)return;await have(p,tn.len+4);const rel=((byte(p+tn.len)<<8|byte(p+tn.len+1))<<16)>>16,flags=byte(p+tn.len+2),lace=(flags>>1)&3;let q=p+tn.len+3;const end=p+size;
  const ts=((tc+rel)*scale/1e9)-(t.codecDelay||0),key=keyFlag===null?flags&0x80?1:0:keyFlag,push=(o,s,k)=>{t.P.off.push(o);t.P.size.push(s);t.P.pts.push(ts);t.P.dts.push(ts);t.P.dur.push(0);t.P.key.push(k)};
  if(!lace){push(q,end-q,key);return}
  await have(q,Math.min(end-q,4096));const n=byte(q)+1;q++;const sizes=[];
  if(lace===2){for(let i=0;i<n-1;i++){let s=0,x;do{x=byte(q++);s+=x}while(x===255);sizes.push(s)}}
  else if(lace===3){let r=await vint(q);sizes.push(r.value);q+=r.len;for(let i=1;i<n-1;i++){r=await vint(q);const range=2**(7*r.len-1)-1;sizes.push(sizes.at(-1)+r.value-range);q+=r.len}}
  else{const s=Math.floor((end-q)/n);for(let i=0;i<n-1;i++)sizes.push(s)}
  sizes.push(end-q-sizes.reduce((a,b)=>a+b,0));for(const s of sizes){push(q,s,key);q+=s}};
 let p=seg.data;
 while(p<segEnd){const e=await head(p);if(!e)break;
  if(e.id===0x1549A966){const ks=kids(await bytesOf(e.data,e.size));for(const k of ks){if(k.id===0x2AD7B1)scale=uintOf(k.b);else if(k.id===0x4489)duration=floatOf(k.b)}}
  else if(e.id===0x1654AE6B){for(const te of kids(await bytesOf(e.data,e.size))){if(te.id!==0xAE)continue;const t={P:packetList()};let num=0,type=0,cid='',priv=null;
    for(const k of kids(te.b)){if(k.id===0xD7)num=uintOf(k.b);else if(k.id===0x83)type=uintOf(k.b);else if(k.id===0x86)cid=td.decode(k.b);else if(k.id===0x63A2)priv=k.b.slice();else if(k.id===0x56AA)t.codecDelay=uintOf(k.b)/1e9;
     else if(k.id===0xE0)for(const x of kids(k.b)){if(x.id===0xB0)t.width=uintOf(x.b);else if(x.id===0xBA)t.height=uintOf(x.b)}
     else if(k.id===0xE1)for(const x of kids(k.b)){if(x.id===0xB5)t.sampleRate=Math.round(floatOf(x.b));else if(x.id===0x9F)t.channels=uintOf(x.b)}}
    t.type=type===1?'video':type===2?'audio':null;t.rotation=0;t.channels??=1;t.sampleRate??=8000;
    const map={V_VP8:'vp8',V_VP9:'vp09.00.10.08',A_OPUS:'opus',A_VORBIS:'vorbis','A_MPEG/L3':'mp3'};t.codec=map[cid]||null;
    if(cid==='V_AV1'&&priv)t.codec=av1Codec(priv);if(cid==='V_MPEG4/ISO/AVC'&&priv){t.codec=avcCodec('avc1',priv);t.description=priv}if(cid==='V_MPEGH/ISO/HEVC'&&priv){t.codec=hevcCodec('hvc1',priv);t.description=priv}
    if(cid==='A_AAC'&&priv){t.codec=aacCodec(priv);t.description=priv}if((cid==='A_OPUS'||cid==='A_VORBIS')&&priv)t.description=priv;if(cid==='A_OPUS'){t.sampleRate=48000;if(priv?.length>=12)t.preSkip=priv[10]|priv[11]<<8}
    if(t.type&&num)tracks.set(num,t)}}
  else if(e.id===0x1F43B675){let q=e.data,tc=0;const end=e.size===Infinity?segEnd:Math.min(segEnd,e.data+e.size);
   while(q<end){const c=await head(q);if(!c)break;if(e.size===Infinity&&TOP.has(c.id))break;const cs=c.size===Infinity?0:c.size;
    if(c.id===0xE7)tc=uintOf(await bytesOf(c.data,cs));
    else if(c.id===0xA3)await block(c.data,cs,tc,null);
    else if(c.id===0xA0){let r=c.data,blk=null,ref=false;const ge=c.data+cs;while(r<ge){const g=await head(r);if(!g)break;if(g.id===0xA1)blk=[g.data,g.size];else if(g.id===0xFB)ref=true;r=g.data+g.size}if(blk)await block(blk[0],blk[1],tc,ref?0:1)}
    q=c.data+cs}
   p=q;continue}
  if(e.size===Infinity)break;p=e.data+e.size}
 const list=[...tracks.values()].filter(t=>t.P.off.length);for(const t of list){t.packets=packPackets(t.P);delete t.P}
 return{kind:'webm',tracks:list,duration:duration?duration*scale/1e9:list.reduce((m,t)=>Math.max(m,t.packets.pts[t.packets.n-1]+t.packets.dur[t.packets.n-1]),0)}}
// Legge i pacchetti da i a j (escluso) con poche letture: quelli vicini nel file si leggono insieme, fino a 8 MB.
async function readPackets(blob,P,i,j){const out=[];let k=i;while(k<j){const a=P.off[k];let e=a+P.size[k],m=k+1;while(m<j&&P.off[m]>=a&&P.off[m]-e<65536&&P.off[m]+P.size[m]-a<(8<<20)){e=Math.max(e,P.off[m]+P.size[m]);m++}
  const bytes=await readBytes(blob,a,e-a);for(let q=k;q<m;q++)out.push(bytes.subarray(P.off[q]-a,P.off[q]-a+P.size[q]));k=m}return out}
