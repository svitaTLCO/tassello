// RAW delle fotocamere: si apre l'anteprima JPEG più grande che la fotocamera ha messo nel file, già sviluppata da lei
// (non è uno sviluppo del RAW). Quasi tutti i RAW sono TIFF (CR2, NEF, ARW, DNG, ORF, RW2, PEF…): l'anteprima sta in un
// IFD come JPEGInterchangeFormat o come strip JPEG, nel RW2 nel tag JpgFromRaw. Il CR3 è ISO BMFF: il JPEG intero è il
// primo campione della prima traccia, quello piccolo nella scatola PRVW. Il RAF dice nell'intestazione dove sta il
// JPEG. Le anteprime nascoste altrove (nelle note del produttore di ORF e PEF) si trovano cercando i JPEG nel file.
// I dati grezzi in JPEG senza perdita (SOF3) non sono anteprime e si scartano.
const RAW_FMT={cr2:'CR2',cr3:'CR3',nef:'NEF',nrw:'NRW',arw:'ARW',srf:'SRF',sr2:'SR2',orf:'ORF',rw2:'RW2',raf:'RAF',dng:'DNG',pef:'PEF',srw:'SRW',x3f:'X3F','3fr':'3FR',iiq:'IIQ'};
// Un JPEG che comincia in off: misura, orientamento scritto nel suo EXIF e fine (dopo FFD9). null se non è un JPEG
// che il browser sa aprire.
function rawJpeg(u,off,max=u.length){if(u[off]!==255||u[off+1]!==216||u[off+2]!==255)return null;let p=off+2,w=0,h=0,orient=0;
 while(p+2<=max){if(u[p]!==255)return null;const m=u[p+1];if(m===255){p++;continue}if(m===217)return w?{off,end:p+2,w,h,orient}:null;if(m>=208&&m<=215){p+=2;continue}if(p+4>max)return null;const len=u[p+2]<<8|u[p+3];
  if(m===225&&u[p+4]===69&&u[p+5]===120&&u[p+6]===105&&u[p+7]===102)orient=rawTiffOrient(u,p+10,p+2+len)||orient;
  if(m>=192&&m<=207&&m!==196&&m!==200&&m!==204){if(m!==192&&m!==193&&m!==194)return null;h=u[p+5]<<8|u[p+6];w=u[p+7]<<8|u[p+8]}
  p+=2+len;
  // Dopo SOS i dati compressi arrivano fino al marcatore seguente: FF00, FFFF e le ripartenze (FFD0–FFD7) non contano.
  if(m===218){if(!w||!h)return null;while(p+1<max&&!(u[p]===255&&u[p+1]&&u[p+1]!==255&&!(u[p+1]>=208&&u[p+1]<=215)))p++}}
 return null}
// TIFF dentro il file, a partire da base: lettura degli IFD in ordine, con i sotto-IFD, sapendo l'ordine dei byte.
function rawTiff(u,base,end=u.length){const v=new DataView(u.buffer,u.byteOffset),le=u[base]===73,g16=p=>v.getUint16(p,le),g32=p=>v.getUint32(p,le),magic=g16(base+2);
 if(!(u[base]===73&&u[base+1]===73||u[base]===77&&u[base+1]===77)||![42,0x4f52,0x5352,0x55].includes(magic))return null;
 const ifds=[],seen=new Set(),todo=[g32(base+4)];
 // Ogni voce: tipo e numero di valori; i valori stanno nella voce se occupano al massimo 4 byte, altrimenti all'indirizzo indicato.
 const SZ=[0,1,1,2,4,8,1,1,2,4,8,4,8,4];
 while(todo.length&&ifds.length<40){const o=todo.shift();if(!o||seen.has(o)||base+o+2>end)continue;seen.add(o);const n=g16(base+o),tags=new Map();
  for(let i=0;i<n&&base+o+2+i*12+12<=end;i++){const e=base+o+2+i*12,tag=g16(e),type=g16(e+2),cnt=g32(e+4),bytes=(SZ[type]||1)*cnt,at=bytes>4?base+g32(e+8):e+8;
   const val=k=>type===3?g16(at+k*2):g32(at+k*4);tags.set(tag,{type,cnt,at,val,list:()=>Array.from({length:Math.min(cnt,64)},(_,k)=>val(k))})}
  ifds.push(tags);const next=g32(base+o+2+n*12);if(next)todo.push(next);for(const t of [330,34665])if(tags.has(t))todo.push(...tags.get(t).list())}
 return {ifds,orient:ifds[0]?.get(274)?.val(0)||1}}
const rawTiffOrient=(u,base,end)=>{try{return rawTiff(u,base,end)?.orient}catch(e){return 0}};
// Le anteprime possibili: posizione e lunghezza, poi rawJpeg controlla che siano davvero JPEG.
function rawCandidates(u,name){const v=new DataView(u.buffer,u.byteOffset),c=[];let orient=1;const head=String.fromCharCode(...u.subarray(0,16));
 if(head.startsWith('FUJIFILMCCD-RAW')){c.push([v.getUint32(84),v.getUint32(88)])}
 else if(head.slice(4,8)==='ftyp'){const walk=(s,e,f)=>{for(let p=s;p+8<=e;){let size=v.getUint32(p),hdr=8;if(size===1){size=Number(v.getBigUint64(p+8));hdr=16}else if(!size)size=e-p;if(size<hdr)break;f(String.fromCharCode(...u.subarray(p+4,p+8)),p+hdr,p+size);p+=size}};
  // CR3: tracce nella scatola moov (stsz dice la misura del primo campione, stco o co64 dove sta), PRVW e CMT1 nelle scatole uuid.
  walk(0,u.length,(t,s,e)=>{if(t==='moov')walk(s,e,(t2,s2,e2)=>{if(t2==='uuid')walk(s2+16,e2,(t3,s3,e3)=>{if(t3==='CMT1')orient=rawTiff(u,s3,e3)?.orient||1});
    if(t2!=='trak')return;let size=0,off=0;const deep=(a,b)=>walk(a,b,(t3,s3,e3)=>{if(['mdia','minf','stbl'].includes(t3))deep(s3,e3);else if(t3==='stsz')size=v.getUint32(s3+4)||v.getUint32(s3+12);else if(t3==='co64')off=Number(v.getBigUint64(s3+8));else if(t3==='stco')off=v.getUint32(s3+8)});deep(s2,e2);if(size&&off)c.push([off,size])});
   if(t==='uuid')for(let p=s+16;p+12<e;p++)if(u[p]===255&&u[p+1]===216){c.push([p,e-p]);break}})}
 else{const T=rawTiff(u,0);if(T){orient=T.orient;for(const d of T.ifds){const at=(t,k=0)=>d.get(t)?.val(k);
   if(d.has(513))c.push([at(513),at(514)||u.length-at(513)]);if(d.has(46))c.push([d.get(46).at,d.get(46).cnt]);
   // Strip JPEG (compressione 6 o 7): le strip una dopo l'altra formano un JPEG solo.
   if(d.has(273)&&[6,7].includes(at(259))){const so=d.get(273).list(),sc=d.get(279)?.list()||[];c.push([so[0],sc.reduce((a,b)=>a+b,0)||u.length-so[0]])}}}}
 return {c,orient}}
async function rawDecode(file){const u=new Uint8Array(await file.arrayBuffer()),fmt=RAW_FMT[(file.name.match(/\.(\w+)$/)||[])[1]?.toLowerCase()]||'RAW',{c,orient}=rawCandidates(u,file.name);
 let best=null;const take=j=>{if(j&&(!best||j.w*j.h>best.w*best.h))best=j};for(const [o,l] of c)if(o>0&&o<u.length)take(rawJpeg(u,o,Math.min(u.length,o+(l>0?l:u.length))));
 // Se le anteprime trovate sono piccole si cercano altri JPEG nel file (ORF e PEF le tengono nelle note del produttore).
 if(!best||Math.max(best.w,best.h)<1200)for(let p=0,k=0;p<u.length-3&&k<400;p++){if(u[p]!==255||u[p+1]!==216||u[p+2]!==255)continue;k++;const j=rawJpeg(u,p);if(j){take(j);p=j.end-1}}
 if(!best)throw Error(`In questo file ${fmt} non c’è un’anteprima JPEG che si possa aprire: esporta la foto in JPEG dalla fotocamera o dal suo programma.`);
 const blob=new Blob([u.subarray(best.off,best.end)],{type:'image/jpeg'}),o=best.orient>1?1:orient;let bmp=await createImageBitmap(blob,{imageOrientation:'from-image'});
 // Il JPEG senza orientamento suo prende quello del RAW: 3 capovolta, 6 da girare a destra, 8 a sinistra (con 2, 4, 5, 7 riflesse).
 if(o>1&&o<=8){const W=bmp.width,H=bmp.height,sw=o>=5,cv=new OffscreenCanvas(sw?H:W,sw?W:H),x=cv.getContext('2d');
  x.setTransform(...{2:[-1,0,0,1,W,0],3:[-1,0,0,-1,W,H],4:[1,0,0,-1,0,H],5:[0,1,1,0,0,0],6:[0,1,-1,0,H,0],7:[0,-1,-1,0,H,W],8:[0,-1,1,0,0,W]}[o]);x.drawImage(bmp,0,0);bmp.close();bmp=await createImageBitmap(cv)}
 bmp.rawInfo={fmt,w:bmp.width,h:bmp.height};return bmp}
const rawNote=({fmt,w,h})=>`Del file ${fmt} si apre l’anteprima JPEG che la fotocamera ha già sviluppato e messo nel file, di ${fmtInt(w)} per ${fmtInt(h)} pixel: non è uno sviluppo del RAW.`;
