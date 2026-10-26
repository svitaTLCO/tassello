// Conferme e archivi ZIP (DOCX e XLSX sono archivi ZIP).
// In scrittura i file sono memorizzati senza compressione; in lettura si accettano dati memorizzati
// o compressi con DEFLATE, decompressi dal browser con DecompressionStream.
async function confirmAction(message){const answer=await modal('Conferma',esc(message),[],'Continua');return answer!==null}
const CRC_TABLE=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=CRC_TABLE[(c^bytes[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function joinBytes(list){const out=new Uint8Array(list.reduce((n,a)=>n+a.length,0));let at=0;for(const a of list){out.set(a,at);at+=a.length}return out}
// Data e ora nel formato DOS usato dalle intestazioni ZIP.
function dosStamp(d=new Date()){return{time:(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1),date:((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate()}}
function makeZip(files){const body=[],dir=[],{time,date}=dosStamp();let offset=0;
 for(const file of files){const name=te.encode(file.name),data=typeof file.data==='string'?te.encode(file.data):file.data,crc=crc32(data);
  const local=new DataView(new ArrayBuffer(30));local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,0x0800,true);local.setUint16(10,time,true);local.setUint16(12,date,true);local.setUint32(14,crc,true);local.setUint32(18,data.length,true);local.setUint32(22,data.length,true);local.setUint16(26,name.length,true);
  body.push(new Uint8Array(local.buffer),name,data);
  const entry=new DataView(new ArrayBuffer(46));entry.setUint32(0,0x02014b50,true);entry.setUint16(4,20,true);entry.setUint16(6,20,true);entry.setUint16(8,0x0800,true);entry.setUint16(12,time,true);entry.setUint16(14,date,true);entry.setUint32(16,crc,true);entry.setUint32(20,data.length,true);entry.setUint32(24,data.length,true);entry.setUint16(28,name.length,true);entry.setUint32(42,offset,true);
  dir.push(new Uint8Array(entry.buffer),name);offset+=30+name.length+data.length}
 const dirSize=dir.reduce((n,a)=>n+a.length,0),end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,dirSize,true);end.setUint32(16,offset,true);
 return joinBytes([...body,...dir,new Uint8Array(end.buffer)])}
async function inflate(packed){if(typeof DecompressionStream==='undefined')throw Error('Questo browser non sa aprire file compressi: usa Chrome o Edge recenti');const unpacked=new Response(packed).body.pipeThrough(new DecompressionStream('deflate-raw'));return new Uint8Array(await new Response(unpacked).arrayBuffer())}
// Legge la directory centrale (in fondo all'archivio) e restituisce { percorso: byte }.
async function zipEntries(buffer){const bytes=new Uint8Array(buffer),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22,stop=Math.max(0,bytes.length-65557);i>=stop;i--)if(view.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('Il file non è un documento DOCX o XLSX valido');
 const count=view.getUint16(end+10,true);if(count>2000)throw Error('Archivio con troppi file');
 const out={};let at=view.getUint32(end+16,true);
 for(let k=0;k<count;k++){if(at+46>bytes.length||view.getUint32(at,true)!==0x02014b50)throw Error('Indice dell\'archivio danneggiato');
  const method=view.getUint16(at+10,true),packed=view.getUint32(at+20,true),size=view.getUint32(at+24,true),nameLen=view.getUint16(at+28,true),local=view.getUint32(at+42,true),name=td.decode(bytes.subarray(at+46,at+46+nameLen));
  at+=46+nameLen+view.getUint16(at+30,true)+view.getUint16(at+32,true);
  if(name.includes('../')||name.endsWith('/')||size>60e6)continue;
  const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true),data=bytes.slice(start,start+packed);
  if(method===0)out[name]=data;else if(method===8)out[name]=await inflate(data);else throw Error(`Compressione non supportata (metodo ${method})`)}
 return out}
const zipText=(entries,path)=>entries[path]?td.decode(entries[path]):'';
const MIME_IMG={jpeg:'image/jpeg',jpg:'image/jpeg',gif:'image/gif',png:'image/png',webp:'image/webp'};
const mimeExt=path=>MIME_IMG[String(path).split('.').pop().toLowerCase()]||'application/octet-stream';
function uintBase64(bytes){const parts=[];for(let i=0;i<bytes.length;i+=0x8000){const piece=bytes.subarray?bytes.subarray(i,i+0x8000):bytes.slice(i,i+0x8000);parts.push(String.fromCharCode.apply(null,piece))}return btoa(parts.join(''))}
const base64Bytes=b64=>Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0));
