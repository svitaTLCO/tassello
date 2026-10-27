// Contenitori scritti a mano, senza librerie: M4A per l'AAC, WebM per l'Opus, la correzione della durata
// dei WebM registrati dal browser e gli archivi ZIP dei progetti video (file memorizzati senza compressione).
function joinBytes(list){const out=new Uint8Array(list.reduce((n,a)=>n+a.length,0));let at=0;for(const a of list){out.set(a,at);at+=a.length}return out}
const asBytes=p=>p instanceof Uint8Array?p:Uint8Array.from(p);
const be32=n=>[n>>>24&255,n>>>16&255,n>>>8&255,n&255],be16=n=>[n>>8&255,n&255],chars=s=>[...s].map(c=>c.charCodeAt(0));
// MP4: ogni scatola ha lunghezza, tipo di quattro lettere e contenuto; le "full box" aggiungono versione e opzioni.
function box(type,...parts){const body=joinBytes(parts.map(asBytes)),out=new Uint8Array(8+body.length);new DataView(out.buffer).setUint32(0,out.length);out.set(chars(type),4);out.set(body,8);return out}
const fullBox=(type,version,flags,...parts)=>box(type,[version,flags>>16&255,flags>>8&255,flags&255],...parts);
const MATRIX=[0x00010000,0,0,0,0x00010000,0,0,0,0x40000000].flatMap(be32);
// Descrittore MPEG-4: etichetta, lunghezza su quattro byte, contenuto.
const descr=(tag,body)=>[tag,0x80,0x80,0x80,body.length,...body];
// Descrizione della traccia AAC (mp4a con esds): la usano l'M4A e l'MP4 del video.
const mp4aEntry=(desc,ch,rate,bitrate)=>box('mp4a',[0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,...be16(ch),...be16(16),0,0,0,0,...be32(rate<<16>>>0)],fullBox('esds',0,0,descr(3,[0,1,0,...descr(4,[0x40,0x15,0,0,0,...be32(bitrate),...be32(bitrate),...descr(5,[...desc])]),...descr(6,[2])])));
function m4aBlob({packets,desc,rate,ch,bitrate}){if(!desc)throw Error('Il codificatore AAC non ha fornito la configurazione');
 const sizes=packets.map(p=>p.data.length),deltas=packets.map(p=>p.dur?Math.round(p.dur*rate/1e6):1024),duration=deltas.reduce((a,b)=>a+b,0);
 const runs=[];for(const d of deltas){const last=runs.at(-1);if(last&&last[1]===d)last[0]++;else runs.push([1,d])}
 const mp4a=mp4aEntry(desc,ch,rate,bitrate);
 const stbl=chunkOffset=>box('stbl',fullBox('stsd',0,0,be32(1),mp4a),fullBox('stts',0,0,be32(runs.length),runs.flatMap(([n,d])=>[...be32(n),...be32(d)])),fullBox('stsc',0,0,be32(1),be32(1),be32(packets.length),be32(1)),fullBox('stsz',0,0,be32(0),be32(packets.length),sizes.flatMap(be32)),fullBox('stco',0,0,be32(1),be32(chunkOffset)));
 const moov=chunkOffset=>box('moov',fullBox('mvhd',0,0,be32(0),be32(0),be32(rate),be32(duration),be32(0x00010000),be16(0x0100),[0,0,0,0,0,0,0,0,0,0],MATRIX,new Array(24).fill(0),be32(2)),
  box('trak',fullBox('tkhd',0,3,be32(0),be32(0),be32(1),be32(0),be32(duration),new Array(8).fill(0),be16(0),be16(0),be16(0x0100),be16(0),MATRIX,be32(0),be32(0)),
   box('mdia',fullBox('mdhd',0,0,be32(0),be32(0),be32(rate),be32(duration),be16(0x55C4),be16(0)),fullBox('hdlr',0,0,be32(0),chars('soun'),new Array(12).fill(0),[...chars('SoundHandler'),0]),
    box('minf',fullBox('smhd',0,0,be16(0),be16(0)),box('dinf',fullBox('dref',0,0,be32(1),fullBox('url ',0,1))),stbl(chunkOffset)))));
 const ftyp=box('ftyp',chars('M4A '),be32(0x200),chars('isomiso2M4A mp42')),size=moov(0).length,mdatLen=sizes.reduce((a,b)=>a+b,0);
 const mdatHead=new Uint8Array(8);new DataView(mdatHead.buffer).setUint32(0,8+mdatLen);mdatHead.set(chars('mdat'),4);
 return new Blob([ftyp,moov(ftyp.length+size+8),mdatHead,...packets.map(p=>p.data)],{type:'audio/mp4'})}
// EBML (Matroska/WebM): identificatore, lunghezza a numero variabile di byte, contenuto.
const ebmlId=id=>{const b=[];for(let x=id;x>0;x=Math.floor(x/256))b.unshift(x&255);return b};
function ebmlLen(n,width=0){let len=1;while(len<8&&n>=2**(7*len)-1)len++;len=Math.max(len,width);const out=new Uint8Array(len);let v=n;for(let i=len-1;i>=0;i--){out[i]=v%256;v=Math.floor(v/256)}out[0]|=1<<(8-len);return out}
const ebml=(id,...parts)=>{const body=joinBytes(parts.map(asBytes));return joinBytes([Uint8Array.from(ebmlId(id)),ebmlLen(body.length),body])};
const ebUint=(n,width=0)=>{const b=[];for(let x=n;x>0;x=Math.floor(x/256))b.unshift(x&255);while(b.length<Math.max(1,width))b.unshift(0);return b};
const ebFloat=f=>{const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,f);return b};
// Intestazione Opus richiesta dal formato quando il codificatore non la fornisce: versione 1, pre-skip di 312 campioni.
function opusHead(ch,rate){const b=new Uint8Array(19),v=new DataView(b.buffer);b.set(chars('OpusHead'));b[8]=1;b[9]=ch;v.setUint16(10,312,true);v.setUint32(12,rate,true);return b}
function webmAudioBlob({packets,desc,rate,ch}){const head=desc&&desc.length>=19&&String.fromCharCode(...desc.slice(0,8))==='OpusHead'?desc:opusHead(ch,rate),preSkip=new DataView(head.buffer,head.byteOffset).getUint16(10,true);
 const durMs=packets.reduce((t,p)=>Math.max(t,(p.ts+p.dur)/1000),0),clusters=[],cues=[];let i=0;
 while(i<packets.length){const t0=Math.max(0,Math.round(packets[i].ts/1000)),blocks=[];
  while(i<packets.length&&Math.round(packets[i].ts/1000)-t0<30000){const rel=Math.round(packets[i].ts/1000)-t0;blocks.push(ebml(0xA3,[0x81,rel>>8&255,rel&255,0x80],packets[i].data));i++}
  clusters.push({t0,bytes:ebml(0x1F43B675,ebml(0xE7,ebUint(t0)),...blocks)})}
 const info=ebml(0x1549A966,ebml(0x2AD7B1,ebUint(1e6)),ebml(0x4489,ebFloat(durMs)),ebml(0x4D80,te.encode('Tassello Media')),ebml(0x5741,te.encode('Tassello Media')));
 const tracks=ebml(0x1654AE6B,ebml(0xAE,ebml(0xD7,[1]),ebml(0x73C5,[1]),ebml(0x83,[2]),ebml(0x86,te.encode('A_OPUS')),ebml(0x63A2,head),ebml(0x56AA,ebUint(Math.round(preSkip/48000*1e9))),ebml(0x56BB,ebUint(80e6)),ebml(0xE1,ebml(0xB5,ebFloat(rate)),ebml(0x9F,[ch]))));
 // L'indice (SeekHead) ha dimensione fissa, così le posizioni si calcolano prima di scriverlo.
 const seek=(id,pos)=>ebml(0x4DBB,ebml(0x53AB,ebmlId(id)),ebml(0x53AC,ebUint(pos,8))),seekLen=ebml(0x114D9B74,seek(0x1549A966,0),seek(0x1654AE6B,0),seek(0x1C53BB6B,0)).length;
 let pos=seekLen+info.length+tracks.length;for(const c of clusters){cues.push(ebml(0xBB,ebml(0xB3,ebUint(c.t0)),ebml(0xB7,ebml(0xF7,[1]),ebml(0xF1,ebUint(pos)))));pos+=c.bytes.length}
 const cueEl=ebml(0x1C53BB6B,...cues),seekHead=ebml(0x114D9B74,seek(0x1549A966,seekLen),seek(0x1654AE6B,seekLen+info.length),seek(0x1C53BB6B,pos));
 const header=ebml(0x1A45DFA3,ebml(0x4286,[1]),ebml(0x42F7,[1]),ebml(0x42F2,[4]),ebml(0x42F3,[8]),ebml(0x4282,te.encode('webm')),ebml(0x4287,[4]),ebml(0x4285,[2]));
 const bodyLen=pos+cueEl.length;return new Blob([header,Uint8Array.from(ebmlId(0x18538067)),ebmlLen(bodyLen,8),seekHead,info,tracks,...clusters.map(c=>c.bytes),cueEl],{type:'audio/webm'})}
// I WebM registrati dal browser (MediaRecorder) non dichiarano la durata: i lettori non sanno quanto dura il video
// e non permettono di spostarsi. Si aggiunge l'elemento Duration nelle informazioni del segmento.
function readVint(b,at){const first=b[at];if(!first)return null;let len=1;while(len<=8&&!(first&(0x80>>(len-1))))len++;if(len>8||at+len>b.length)return null;let v=first&(0xFF>>len),unknown=v===(0xFF>>len);for(let i=1;i<len;i++){v=v*256+b[at+i];if(b[at+i]!==255)unknown=false}return{len,value:v,unknown}}
function readEbmlId(b,at){const first=b[at];let len=1;while(len<=4&&!(first&(0x80>>(len-1))))len++;if(len>4)return null;let id=0;for(let i=0;i<len;i++)id=id*256+b[at+i];return{len,id}}
async function fixWebmDuration(blob,durationMs){try{const head=new Uint8Array(await blob.slice(0,Math.min(blob.size,1<<20)).arrayBuffer());let at=0;
 const next=()=>{const id=readEbmlId(head,at);if(!id)return null;const size=readVint(head,at+id.len);if(!size)return null;const el={id:id.id,start:at,data:at+id.len+size.len,size:size.value,unknown:size.unknown,sizeAt:at+id.len,sizeLen:size.len};return el};
 const top=next();if(!top||top.id!==0x1A45DFA3)return blob;at=top.data+top.size;const seg=next();if(!seg||seg.id!==0x18538067)return blob;at=seg.data;
 while(at<head.length){const el=next();if(!el||el.unknown)return blob;if(el.id===0x1549A966){let p=el.data;while(p<el.data+el.size){at=p;const c=next();if(!c)return blob;if(c.id===0x4489){const v=new DataView(head.buffer);if(c.size===8)v.setFloat64(c.data,durationMs);else if(c.size===4)v.setFloat32(c.data,durationMs);return new Blob([head,blob.slice(head.length)],{type:blob.type})}p=c.data+c.size}
   const dur=ebml(0x4489,ebFloat(durationMs)),inner=head.subarray(el.data,el.data+el.size),info=ebml(0x1549A966,inner,dur),grow=info.length-(el.data+el.size-el.start);
   const parts=[head.subarray(0,el.start),info,head.subarray(el.data+el.size),blob.slice(head.length)];
   if(!seg.unknown){const fixed=ebmlLen(seg.size+grow,seg.sizeLen);if(fixed.length!==seg.sizeLen)return blob;const pre=head.slice(0,el.start);pre.set(fixed,seg.sizeAt);parts[0]=pre}
   return new Blob(parts,{type:blob.type})}
  at=el.data+el.size}return blob}catch(e){console.warn('Durata non aggiunta',e);return blob}}
// CRC32 a otto byte per passo (slicing-by-8): otto tabelle e una lettura di 8 byte alla volta, circa 5 volte più veloce
// del calcolo byte per byte. Serve per gli archivi ZIP, che con i video arrivano a qualche GB.
const CRC_TABLES=(()=>{const t=Array.from({length:8},()=>new Int32Array(256));for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[0][n]=c}for(let n=0;n<256;n++){let c=t[0][n];for(let k=1;k<8;k++){c=t[0][c&255]^(c>>>8);t[k][n]=c}}return t})();
async function crc32Blob(blob,progress=()=>{}){const [t0,t1,t2,t3,t4,t5,t6,t7]=CRC_TABLES,reader=blob.stream().getReader();let c=-1,done=0;
 for(;;){const {value:b,done:end}=await reader.read();if(end)break;const n=b.length,e=n-(n&7);let i=0;
  for(;i<e;i+=8){const lo=(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)^c,hi=b[i+4]|b[i+5]<<8|b[i+6]<<16|b[i+7]<<24;c=t7[lo&255]^t6[lo>>>8&255]^t5[lo>>>16&255]^t4[lo>>>24]^t3[hi&255]^t2[hi>>>8&255]^t1[hi>>>16&255]^t0[hi>>>24]}
  for(;i<n;i++)c=t0[(c^b[i])&255]^(c>>>8);done+=n;progress(done)}
 return (c^-1)>>>0}
// ZIP con i file memorizzati senza compressione: i video sono già compressi e i dati restano nei Blob, senza copiarli in memoria.
async function zipBlob(files,progress=()=>{}){const parts=[],dir=[],d=new Date(),time=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),total=files.reduce((n,f)=>n+(f.data.size??f.data.length),0);let offset=0,done=0;
 if(total>0xFFFFFFF0)throw Error('Il progetto supera i 4 GB che un file ZIP semplice può contenere');
 for(const f of files){const data=f.data instanceof Blob?f.data:new Blob([f.data]),name=te.encode(f.name),crc=await crc32Blob(data,n=>progress((done+n)/Math.max(1,total)));done+=data.size;
  const local=new DataView(new ArrayBuffer(30));local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,0x0800,true);local.setUint16(10,time,true);local.setUint16(12,date,true);local.setUint32(14,crc,true);local.setUint32(18,data.size,true);local.setUint32(22,data.size,true);local.setUint16(26,name.length,true);
  parts.push(new Uint8Array(local.buffer),name,data);
  const entry=new DataView(new ArrayBuffer(46));entry.setUint32(0,0x02014b50,true);entry.setUint16(4,20,true);entry.setUint16(6,20,true);entry.setUint16(8,0x0800,true);entry.setUint16(12,time,true);entry.setUint16(14,date,true);entry.setUint32(16,crc,true);entry.setUint32(20,data.size,true);entry.setUint32(24,data.size,true);entry.setUint16(28,name.length,true);entry.setUint32(42,offset,true);
  dir.push(new Uint8Array(entry.buffer),name);offset+=30+name.length+data.size}
 const dirSize=dir.reduce((n,a)=>n+a.length,0),end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,dirSize,true);end.setUint32(16,offset,true);
 return new Blob([...parts,...dir,new Uint8Array(end.buffer)],{type:'application/zip'})}
// Legge l'indice in fondo all'archivio e restituisce { percorso: Blob } senza caricare i file in memoria.
async function unzipBlob(blob){const tailLen=Math.min(blob.size,65557),tail=new Uint8Array(await blob.slice(blob.size-tailLen).arrayBuffer()),tv=new DataView(tail.buffer);let end=-1;
 for(let i=tail.length-22;i>=0;i--)if(tv.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('Il file non è un archivio ZIP valido');
 const count=tv.getUint16(end+10,true),dirSize=tv.getUint32(end+12,true),dirAt=tv.getUint32(end+16,true);if(count>5000)throw Error('Archivio con troppi file');
 const dir=new Uint8Array(await blob.slice(dirAt,dirAt+dirSize).arrayBuffer()),v=new DataView(dir.buffer),out={};let at=0;
 for(let k=0;k<count;k++){if(at+46>dir.length||v.getUint32(at,true)!==0x02014b50)throw Error('Indice dell’archivio danneggiato');
  const method=v.getUint16(at+10,true),packed=v.getUint32(at+20,true),nameLen=v.getUint16(at+28,true),local=v.getUint32(at+42,true),name=td.decode(dir.subarray(at+46,at+46+nameLen));at+=46+nameLen+v.getUint16(at+30,true)+v.getUint16(at+32,true);
  if(name.includes('../')||name.endsWith('/'))continue;
  const lh=new DataView(await blob.slice(local,local+30).arrayBuffer()),start=local+30+lh.getUint16(26,true)+lh.getUint16(28,true),data=blob.slice(start,start+packed);
  if(method===0)out[name]=data;else if(method===8){if(typeof DecompressionStream==='undefined')throw Error('Questo browser non sa aprire archivi compressi');out[name]=await new Response(data.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob()}else throw Error(`Compressione non supportata (metodo ${method})`)}
 return out}
