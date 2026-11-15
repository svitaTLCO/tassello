// Formati audio e di testo. Il WAV si legge e si scrive qui, con i marcatori nei blocchi cue e LIST adtl
// (li leggono anche molti programmi professionali); gli altri formati li decodifica il browser.
// La codifica compressa usa WebCodecs: AAC in M4A oppure Opus in WebM, più veloce del tempo reale.
const ascii4=(v,at)=>String.fromCharCode(v.getUint8(at),v.getUint8(at+1),v.getUint8(at+2),v.getUint8(at+3));
const MAX_CHANNELS=8;
function readWav(buf){const v=new DataView(buf);if(v.byteLength<12)return null;const riff=ascii4(v,0);if((riff!=='RIFF'&&riff!=='RF64')||ascii4(v,8)!=='WAVE')return null;
 let at=12,fmt=null,data=null,ds=null;const cues=[],labels=new Map();
 while(at+8<=v.byteLength){const id=ascii4(v,at),body=at+8;let size=v.getUint32(at+4,true);
  // RF64: le dimensioni vere stanno nel blocco ds64, perché il campo a 32 bit vale 0xFFFFFFFF.
  if(id==='ds64'&&size>=28)ds={riff:Number(v.getBigUint64(body,true)),data:Number(v.getBigUint64(body+8,true)),samples:Number(v.getBigUint64(body+16,true))};
  if(id==='data'&&size===0xFFFFFFFF&&ds){if(ds.data>Number.MAX_SAFE_INTEGER)throw Error('File RF64 troppo grande per essere letto in questa pagina');size=ds.data}
  if(id==='data'&&(size===0xFFFFFFFF||body+size>v.byteLength))size=v.byteLength-body;
  if(body+size>v.byteLength&&id!=='data')break;
  if(id==='fmt '&&size>=16){fmt={tag:v.getUint16(body,true),ch:v.getUint16(body+2,true),rate:v.getUint32(body+4,true),align:v.getUint16(body+12,true),bits:v.getUint16(body+14,true)};if(fmt.tag===0xFFFE&&size>=26)fmt.tag=v.getUint16(body+24,true)}
  else if(id==='data')data={off:body,len:size};
  else if(id==='cue '&&size>=4){const n=v.getUint32(body,true);for(let i=0;i<n&&body+4+i*24+24<=body+size;i++){const p=body+4+i*24,offset=v.getUint32(p+20,true)||v.getUint32(p+4,true);cues.push({id:v.getUint32(p,true),pos:offset})}}
  else if(id==='LIST'&&size>=4&&ascii4(v,body)==='adtl'){let q=body+4;while(q+12<=body+size){const sid=ascii4(v,q),ss=v.getUint32(q+4,true);if((sid==='labl'||sid==='note')&&!labels.has(v.getUint32(q+8,true)))labels.set(v.getUint32(q+8,true),td.decode(new Uint8Array(buf,q+12,Math.max(0,Math.min(ss-4,body+size-q-12)))).replace(/\0[\s\S]*$/,'').trim());q+=8+ss+(ss&1)}}
  at=body+size+(size&1)}
 if(!fmt||!data)throw Error('File WAV incompleto: manca il formato o i dati');
 const {tag,ch,rate,bits}=fmt,bps=bits/8;
 if(!(tag===1&&[8,16,24,32].includes(bits))&&!(tag===3&&(bits===32||bits===64)))throw Error(`Formato WAV non supportato (codifica ${tag}, ${bits} bit)`);
 if(!ch||ch>MAX_CHANNELS)throw Error(`File WAV con ${ch} canali: se ne aprono al massimo ${MAX_CHANNELS}`);
 if(rate<3000||rate>768000)throw Error('Frequenza di campionamento non supportata: '+rate+' Hz');
 // I campioni si leggono sul posto (senza copiare i dati del file quando la loro posizione lo permette) e vanno
 // direttamente nei canali dell'AudioBuffer; un ciclo per formato, così il browser lo rende veloce.
 const frames=Math.floor(data.len/(ch*bps)),n=frames*ch,out=frames?new AudioBuffer({length:frames,numberOfChannels:ch,sampleRate:rate}):null,chans=Array.from({length:out?ch:0},(_,c)=>out.getChannelData(c));
 const view=(T,size)=>data.off%size?new T(buf.slice(data.off,data.off+n*size)):new T(buf,data.off,n);
 if(tag===3&&bits===32){const a=view(Float32Array,4);for(let c=0;c<chans.length;c++){const d=chans[c];for(let i=0,k=c;i<frames;i++,k+=ch)d[i]=a[k]}}
 else if(tag===3){const a=view(Float64Array,8);for(let c=0;c<chans.length;c++){const d=chans[c];for(let i=0,k=c;i<frames;i++,k+=ch)d[i]=a[k]}}
 else if(bits===16){const a=view(Int16Array,2);for(let c=0;c<chans.length;c++){const d=chans[c];for(let i=0,k=c;i<frames;i++,k+=ch)d[i]=a[k]*(1/32768)}}
 else if(bits===32){const a=view(Int32Array,4);for(let c=0;c<chans.length;c++){const d=chans[c];for(let i=0,k=c;i<frames;i++,k+=ch)d[i]=a[k]*(1/2147483648)}}
 else if(bits===8){const a=new Uint8Array(buf,data.off,n);for(let c=0;c<chans.length;c++){const d=chans[c];for(let i=0,k=c;i<frames;i++,k+=ch)d[i]=(a[k]-128)*(1/128)}}
 else{const a=new Uint8Array(buf,data.off,n*3),step=ch*3;for(let c=0;c<chans.length;c++){const d=chans[c];for(let i=0,k=c*3;i<frames;i++,k+=step)d[i]=((a[k]|a[k+1]<<8|a[k+2]<<16)<<8>>8)*(1/8388608)}}
 const markers=cues.filter(c=>c.pos<=frames).sort((a,b)=>a.pos-b.pos).map((c,i)=>({id:uid(),pos:c.pos,label:labels.get(c.id)||'Marcatore '+(i+1)}));
 return{rate,buffer:out,markers}}
// Blocco bext del Broadcast Wave Format (EBU Tech 3285): descrizione, autore, data e ora e i valori di volume che i
// playout radiofonici leggono in scaletta senza ascoltare il file. Nella versione 2 ci sono LUFS, LRA e picco vero.
const bextText=(s,n)=>{const out=new Uint8Array(n),b=te.encode(String(s??'').slice(0,n));out.set(b.subarray(0,n));return out};
function bextChunk({description='',originator='',reference='',date=new Date(),loudness=null,codingHistory=''}={}){
 const hist=codingHistory?te.encode(/\r?\n$/.test(codingHistory)?codingHistory:codingHistory+'\r\n'):null,body=new Uint8Array(602+(hist?hist.length:0)),v=new DataView(body.buffer);
 body.set(bextText(description,256),0);body.set(bextText(originator,32),256);body.set(bextText(reference,32),288);
 body.set(bextText(`${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`,10),320);
 body.set(bextText(`${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,8),330);
 v.setUint32(338,0,true);v.setUint32(342,0,true);v.setUint16(346,2,true);
 const val=x=>Number.isFinite(x)?clamp(Math.round(x*100),-32768,32767):-32768;
 v.setInt16(412,val(loudness?.value),true);v.setInt16(414,val(loudness?.range),true);v.setInt16(416,val(loudness?.truePeak),true);
 if(hist)body.set(hist,602);
 const out=new Uint8Array(8+body.length);out.set(te.encode('bext'),0);new DataView(out.buffer).setUint32(4,body.length,true);out.set(body,8);return out}
// WAV a 16 o 24 bit interi oppure 32 bit in virgola mobile, dal campione start a end; i marcatori diventano cue e labl.
// Con dither i 16 bit ricevono un rumore triangolare di un bit: serve quando si scende da 24 o da 32 bit.
function wavBlob(buffer,bits=16,markers=[],start=0,end=buffer.length,{dither=false,bext=null,rf64=false}={}){const ch=buffer.numberOfChannels,rate=buffer.sampleRate,frames=Math.max(0,end-start),float=bits===32,bps=bits/8,dataLen=frames*ch*bps;
 const ms=markers.filter(m=>m.pos>=start&&m.pos<=end);
 const labl=ms.map((m,i)=>{const t=te.encode((m.label||'')+'\0'),pad=t.length&1,b=new Uint8Array(12+t.length+pad),v=new DataView(b.buffer);b.set([108,97,98,108]);v.setUint32(4,4+t.length,true);v.setUint32(8,i+1,true);b.set(t,12);return b});
 const tail=[];if(ms.length){const cue=new Uint8Array(12+ms.length*24),v=new DataView(cue.buffer);cue.set([99,117,101,32]);v.setUint32(4,4+ms.length*24,true);v.setUint32(8,ms.length,true);ms.forEach((m,i)=>{const p=12+i*24;v.setUint32(p,i+1,true);v.setUint32(p+4,m.pos-start,true);cue.set([100,97,116,97],p+8);v.setUint32(p+20,m.pos-start,true)});
  const listLen=4+labl.reduce((n,b)=>n+b.length,0),list=new Uint8Array(12),lv=new DataView(list.buffer);list.set([76,73,83,84]);lv.setUint32(4,listLen,true);list.set([97,100,116,108],8);tail.push(cue,list,...labl)}
 // Il blocco bext va per primo, subito dopo WAVE: è l'ordine che i playout radiofonici si aspettano.
 // Oltre i 4 GB il WAV diventa RF64: le dimensioni vere stanno nel blocco ds64 e i campi a 32 bit valgono 0xFFFFFFFF.
 const tailLen=tail.reduce((n,b)=>n+b.length,0),bx=bext?bextChunk(bext):null,bxLen=bx?bx.length:0,fmtLen=float?18:16,fact=float?12:0,
  big=rf64||12+36+bxLen+8+fmtLen+fact+8+dataLen+(dataLen&1)+tailLen>0xFFFFFFFF,
  head=new ArrayBuffer(12+(big?36:0)+bxLen+8+fmtLen+fact+8),v=new DataView(head);
 const w4=(at,s)=>{for(let i=0;i<4;i++)v.setUint8(at+i,s.charCodeAt(i))};
 w4(0,big?'RF64':'RIFF');v.setUint32(4,big?0xFFFFFFFF:head.byteLength-8+dataLen+(dataLen&1)+tailLen,true);w4(8,'WAVE');
 let at=12;
 if(big){const riff=head.byteLength-8+dataLen+(dataLen&1)+tailLen;w4(at,'ds64');v.setUint32(at+4,28,true);v.setBigUint64(at+8,BigInt(riff),true);v.setBigUint64(at+16,BigInt(dataLen),true);v.setBigUint64(at+24,BigInt(frames),true);v.setUint32(at+32,0,true);at+=36}
 if(bx){new Uint8Array(head).set(bx,at);at+=bxLen}
 w4(at,'fmt ');v.setUint32(at+4,fmtLen,true);v.setUint16(at+8,float?3:1,true);v.setUint16(at+10,ch,true);v.setUint32(at+12,rate,true);v.setUint32(at+16,rate*ch*bps,true);v.setUint16(at+20,ch*bps,true);v.setUint16(at+22,bits,true);at+=8+fmtLen;
 if(float){v.setUint16(at,0,true);at+=2;w4(at,'fact');v.setUint32(at+4,4,true);v.setUint32(at+8,frames,true);at+=12}
 w4(at,'data');v.setUint32(at+4,big?0xFFFFFFFF:dataLen,true);
 const parts=[head],chans=Array.from({length:ch},(_,c)=>buffer.getChannelData(c)),BLOCK=1<<18;
 for(let i=start;i<end;i+=BLOCK){const n=Math.min(BLOCK,end-i);
  if(float){const a=new Float32Array(n*ch);for(let c=0;c<ch;c++){const d=chans[c];for(let j=0,k=c;j<n;j++,k+=ch)a[k]=d[i+j]}parts.push(a)}
  else if(bits===16){const a=new Int16Array(n*ch);for(let c=0;c<ch;c++){const d=chans[c];for(let j=0,k=c;j<n;j++,k+=ch){const x=dither?d[i+j]+(Math.random()-Math.random())/32768:d[i+j];a[k]=x<=-1?-32768:x>=1?32767:Math.round(x*32767)}}parts.push(a)}
  else{const a=new Uint8Array(n*ch*3),step=ch*3;for(let c=0;c<ch;c++){const d=chans[c];for(let j=0,k=c*3;j<n;j++,k+=step){const x=d[i+j],s=x<=-1?-8388608:x>=1?8388607:Math.round(x*8388607);a[k]=s&255;a[k+1]=s>>8&255;a[k+2]=s>>16&255}}parts.push(a)}}
 if(dataLen&1)parts.push(new Uint8Array(1));parts.push(...tail);return new Blob(parts,{type:'audio/wav'})}
// AudioBuffer con i canali dati; la frequenza resta quella del file.
function makeBuffer(channels,rate){const len=channels[0]?.length||0;if(!len)return null;const b=new AudioBuffer({length:len,numberOfChannels:channels.length,sampleRate:rate});channels.forEach((d,c)=>b.copyToChannel(d,c));return b}
// Lo stesso audio con un altro numero di canali: verso il mono si sommano sinistro e destro a metà, dal mono i due
// canali diventano uguali. Serve alla consegna, dove alcuni playout accettano solo file mono.
function channelBuffer(buf,ch){if(buf.numberOfChannels===ch)return buf;const n=buf.length,out=new AudioBuffer({length:n,numberOfChannels:ch,sampleRate:buf.sampleRate}),src=Array.from({length:buf.numberOfChannels},(_,c)=>buf.getChannelData(c));
 if(ch===1){const d=out.getChannelData(0);for(let i=0;i<n;i++){let s=0;for(const x of src)s+=x[i];d[i]=s/src.length}return out}
 for(let c=0;c<ch;c++)out.copyToChannel(src[Math.min(c,src.length-1)],c);return out}
// Cambio di frequenza con il motore audio del browser (OfflineAudioContext).
async function resampleBuffer(buf,rate){if(!buf||buf.sampleRate===rate)return buf;const oc=new OfflineAudioContext(buf.numberOfChannels,Math.max(1,Math.round(buf.length*rate/buf.sampleRate)),rate),s=oc.createBufferSource();s.buffer=buf;s.connect(oc.destination);s.start();return oc.startRendering()}
// AIFF e AIFC, i formati dei registratori e dei Mac: i campioni sono in ordine big-endian e la frequenza è un
// numero in virgola mobile a 80 bit. Si leggono PCM a 8, 16, 24 e 32 bit, sowt (little-endian) e fl32/fl64.
function ext80(v,at){const e=v.getUint16(at);if(!e&&!v.getUint32(at+2)&&!v.getUint32(at+6))return 0;
 const exp=(e&0x7fff)-16383,mant=v.getUint32(at+2)*4294967296+v.getUint32(at+6);return (e&0x8000?-1:1)*mant*2**(exp-63)}
// Tabelle G.711 per i file AIFC compressi a 8 bit (telefono, dettatura, vecchi archivi).
const ULAW_TABLE=(()=>{const t=new Int16Array(256);for(let i=0;i<256;i++){const u=~i&255,s=(u&0x80)?-1:1,e=(u>>4)&7,m=u&15;t[i]=s*((((m<<3)+0x84)<<e)-0x84)}return t})();
const ALAW_TABLE=(()=>{const t=new Int16Array(256);for(let i=0;i<256;i++){let a=i^0x55;const s=(a&0x80)?1:-1,m=(a&0x0f)<<4,seg=(a&0x70)>>4;let v;
 if(seg===0)v=m+8;else if(seg===1)v=m+0x108;else{v=(m+0x108)<<(seg-1)}t[i]=s*v}return t})();
// IMA ADPCM di Apple (ima4): blocchi di 34 byte per canale, 64 campioni, intestazione con valore iniziale e passo.
const IMA_STEP=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024],
 IMA_INDEX=[-1,-1,-1,-1,2,4,6,8,-1,-1,-1,-1,2,4,6,8];
// Blocco IMA4: intestazione con il valore iniziale (16 bit, bassi 7 per il passo) e 32 byte di nibble, dal basso.
// Come in QuickTime, se il passo non cambia e il valore iniziale è vicino a quello del blocco precedente si continua
// da lì invece di ripartire: è quello che tiene unita la forma d'onda fra un blocco e l'altro.
function ima4Decode(v,at,out,start,count,st){const raw=(v.getUint8(at)<<8)|v.getUint8(at+1);let pred=raw&0xFF80;if(pred&0x8000)pred-=0x10000;
 const idx=raw&0x7f;
 if(st.idx===idx){if(Math.abs(pred-st.pred)>0x7f){st.idx=idx;st.pred=pred}}else{st.idx=idx;st.pred=pred}
 let m=0;for(let k=0;k<32;k++){const byte=v.getUint8(at+2+k);
  for(const nib of [byte&0x0f,byte>>4]){if(m>=Math.min(64,count))return;
   const step=IMA_STEP[st.idx];let diff=step>>3;if(nib&4)diff+=step;if(nib&2)diff+=step>>1;if(nib&1)diff+=step>>2;
   st.pred=clamp(st.pred+((nib&8)?-diff:diff),-32768,32767);st.idx=clamp(st.idx+IMA_INDEX[nib],0,88);out[start+m]=st.pred/32768;m++}}}
function readAiff(buf){const v=new DataView(buf);if(v.byteLength<12||ascii4(v,0)!=='FORM')return null;const kind=ascii4(v,8);
 if(kind!=='AIFF'&&kind!=='AIFC')return null;
 let at=12,comm=null,snd=null;
 while(at+8<=v.byteLength){const id=ascii4(v,at);let size=v.getUint32(at+4);const body=at+8;
  if(body+size>v.byteLength)size=v.byteLength-body;
  if(id==='COMM'&&size>=18)comm={ch:v.getUint16(body),frames:v.getUint32(body+2),bits:v.getUint16(body+6),rate:Math.round(ext80(v,body+8)),comp:size>=22?ascii4(v,body+18):'NONE'};
  else if(id==='SSND'&&size>=8)snd={off:body+8+v.getUint32(body),len:size-8-v.getUint32(body)};
  at=body+size+(size&1)}
 if(!comm||!snd)throw Error('File AIFF incompleto: mancano il formato o i campioni');
 const {ch,bits,frames,rate}=comm,comp=(comm.comp||'NONE').trim(),le=comp==='sowt'||comp==='in24'||comp==='in32',flt=/^(fl|FL)(32|64)$/.test(comp),
  ima=comp==='ima4',ulaw=comp==='ulaw'||comp==='ULAW',alaw=comp==='alaw'||comp==='ALAW',bps=bits/8;
 if(!(rate>=3000&&rate<=768000))throw Error('Frequenza di campionamento non supportata: '+rate+' hertz');
 if(!ch||ch>MAX_CHANNELS)throw Error(`File AIFF con ${ch} canali: se ne aprono al massimo ${MAX_CHANNELS}`);
 if(!(le||flt||ima||ulaw||alaw||comp==='NONE'||comp==='twos'))throw Error('Formato AIFF non supportato: '+comp);
 if(!le&&!flt&&!ima&&!ulaw&&!alaw&&![8,16,24,32].includes(bits))throw Error('Formato AIFF non supportato: '+bits+' bit');
 if(flt&&!(bits===32||bits===64))throw Error('Formato AIFF non supportato: '+bits+' bit');
 const imaBlocks=Math.floor(snd.len/(34*ch)),
  n=ima?Math.min(imaBlocks*64,frames<=imaBlocks?frames*64:frames):Math.min(frames,Math.floor(snd.len/(ch*bps))),
  out=new AudioBuffer({length:n,numberOfChannels:ch,sampleRate:rate}),chans=Array.from({length:ch},(_,c)=>out.getChannelData(c)),off=snd.off;
 if(ima){const blocks=Math.ceil(n/64),st=Array.from({length:ch},()=>({pred:0,idx:0}));for(let b=0;b<blocks;b++)for(let c=0;c<ch;c++){const at=off+(b*ch+c)*34;if(at+34>v.byteLength)continue;
   ima4Decode(v,at,chans[c],b*64,n-b*64,st[c])}}
 else if(ulaw||alaw)for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch)d[i]=(ulaw?ULAW_TABLE:ALAW_TABLE)[v.getUint8(off+k)]/32768}
 else if(flt&&bits===32)for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch)d[i]=v.getFloat32(off+k*4,le)}
 else if(flt)for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch)d[i]=v.getFloat64(off+k*8,le)}
 else if(bits===16)for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch)d[i]=v.getInt16(off+k*2,le)*(1/32768)}
 else if(bits===32)for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch)d[i]=v.getInt32(off+k*4,le)*(1/2147483648)}
 else if(bits===8)for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch)d[i]=v.getInt8(off+k)*(1/128)}
 else for(let c=0;c<ch;c++){const d=chans[c];for(let i=0,k=c;i<n;i++,k+=ch){const q=off+k*3,s=le?v.getUint8(q)|v.getUint8(q+1)<<8|v.getUint8(q+2)<<16:v.getUint8(q)<<16|v.getUint8(q+1)<<8|v.getUint8(q+2);d[i]=(s<<8>>8)*(1/8388608)}}
 return{rate,buffer:out,markers:[]}}
// Decodifica di qualunque file audio (o dell'audio di un video) che il browser sa leggere. I WAV passano dal lettore
// interno, che conserva la frequenza originale, i bit in virgola mobile e i marcatori. Con rate gli altri formati
// escono già a quella frequenza, convertiti dal decodificatore stesso invece che in un secondo passaggio.
let decodeCtx=null;const decodeAt=new Map();
async function decodeAudioFile(file,{rate=0}={}){const buf=await file.arrayBuffer();let wav=null,aiff=null;try{wav=readWav(buf)}catch(e){if(/WAV/.test(e.message)&&!/non supportato/.test(e.message))throw e}
 if(wav)return{buffer:wav.buffer,markers:wav.markers};
 try{aiff=readAiff(buf)}catch(e){if(/AIFF/.test(e.message)&&!/non supportato/.test(e.message))throw e}
 if(aiff)return{buffer:aiff.buffer,markers:aiff.markers};
 decodeCtx??=new (window.AudioContext||window.webkitAudioContext)();if(rate&&!decodeAt.has(rate))decodeAt.set(rate,new OfflineAudioContext(1,1,rate));let out;
 try{out=await (rate?decodeAt.get(rate):decodeCtx).decodeAudioData(buf)}catch(e){throw Error(`Il browser non sa leggere l’audio di «${file.name}»`)}
 return{buffer:out,markers:[]}}
// Codifica compressa: restituisce i pacchetti, la configurazione del decodificatore e il formato.
const CODECS={aac:{codec:'mp4a.40.2',label:'M4A (AAC)',ext:'m4a',mime:'audio/mp4'},opus:{codec:'opus',label:'WebM (Opus)',ext:'webm',mime:'audio/webm'}};
async function codecSupported(kind,rate=48000,ch=2){if(typeof AudioEncoder==='undefined')return false;try{return (await AudioEncoder.isConfigSupported({codec:CODECS[kind].codec,sampleRate:rate,numberOfChannels:ch,bitrate:128000})).supported}catch(e){return false}}
async function encodeAudio(buffer,kind,bitrate,progress=()=>{}){const ch=Math.min(2,buffer.numberOfChannels),rate=kind==='aac'&&buffer.sampleRate===44100?44100:48000,cfg={codec:CODECS[kind].codec,sampleRate:rate,numberOfChannels:ch,bitrate};
 if(!(await codecSupported(kind,rate,ch)))throw Error(`Questo browser non sa creare file ${CODECS[kind].label}: scegli WAV`);
 if(buffer.sampleRate!==rate)buffer=await resampleBuffer(buffer,rate);
 const packets=[];let desc=null,failure=null;
 const enc=new AudioEncoder({output:(chunk,meta)=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);packets.push({data,ts:chunk.timestamp,dur:chunk.duration||0});const d=meta?.decoderConfig?.description;if(d&&!desc)desc=d instanceof ArrayBuffer?new Uint8Array(d.slice(0)):new Uint8Array(d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength))},error:e=>{failure=e}});
 enc.configure(cfg);const N=buffer.length,BLOCK=rate,chans=Array.from({length:ch},(_,c)=>buffer.getChannelData(c));
 for(let i=0;i<N;i+=BLOCK){if(failure)break;const n=Math.min(BLOCK,N-i),data=new Float32Array(n*ch);for(let c=0;c<ch;c++)data.set(chans[c].subarray(i,i+n),c*n);
  enc.encode(new AudioData({format:'f32-planar',sampleRate:rate,numberOfFrames:n,numberOfChannels:ch,timestamp:Math.round(i/rate*1e6),data}));
  if(enc.encodeQueueSize>4)await new Promise(r=>enc.addEventListener('dequeue',r,{once:true}));progress(i/N)}
 await enc.flush();enc.close();if(failure)throw Error('Codifica non riuscita: '+failure.message);progress(1);
 return{packets,desc,rate,ch,bitrate,frames:N}}
async function compressedBlob(buffer,kind,bitrate,progress,tags){const enc=await encodeAudio(buffer,kind,bitrate,progress);return kind==='aac'?m4aBlob({...enc,tags}):webmAudioBlob(enc)}
// ——— MP3. Il codificatore è lamejs (vedi 05y-nota-lame.js): lavora in JavaScript, senza rete, e produce un file
// che playout e telefonini leggono. Il tag ID3v2.3 che gli sta davanti porta titolo, autore e descrizione.
const utf16le=s=>{const b=new Uint8Array(s.length*2),v=new DataView(b.buffer);for(let i=0;i<s.length;i++)v.setUint16(i*2,s.charCodeAt(i),true);return b};
const syncsafe=n=>[n>>21&127,n>>14&127,n>>7&127,n&127];
function id3Frame(id,text,{comment=false}={}){const body=new Uint8Array(comment?10+text.length*2:3+text.length*2);
 if(comment){body.set([1,105,116,97,0xFF,0xFE,0,0,0xFF,0xFE],0);body.set(utf16le(text),10)}else{body.set([1,0xFF,0xFE],0);body.set(utf16le(text),3)}
 const out=new Uint8Array(10+body.length);out.set(te.encode(id),0);new DataView(out.buffer).setUint32(4,body.length);out.set(body,10);return out}
function id3Tag({title='',artist='',album='',genre='',comment='',year=''}={}){const frames=[];
 if(title)frames.push(id3Frame('TIT2',title));if(artist)frames.push(id3Frame('TPE1',artist));if(album)frames.push(id3Frame('TALB',album));
 if(genre)frames.push(id3Frame('TCON',genre));if(year)frames.push(id3Frame('TYER',String(year).slice(0,4)));if(comment)frames.push(id3Frame('COMM',comment,{comment:true}));
 const size=frames.reduce((n,f)=>n+f.length,0),out=new Uint8Array(10+size);
 out.set([73,68,51,3,0,0,...syncsafe(size)],0);let at=10;for(const f of frames){out.set(f,at);at+=f.length}return out}
const MP3_RATES=[8000,11025,12000,16000,22050,24000,32000,44100,48000];
async function mp3Blob(buffer,kbps=192,tags={},progress=()=>{}){
 if(typeof lamejs==='undefined')throw Error('Il codificatore MP3 non è disponibile in questa copia di Tassello');
 if(!MP3_RATES.includes(buffer.sampleRate))buffer=await resampleBuffer(buffer,48000);
 const ch=Math.min(2,buffer.numberOfChannels),rate=buffer.sampleRate,enc=new lamejs.Mp3Encoder(ch,rate,clamp(Math.round(kbps),32,320));
 const block=1152,left=new Int16Array(block),right=new Int16Array(block),chans=Array.from({length:ch},(_,c)=>buffer.getChannelData(c)),parts=[],N=buffer.length;
 for(let i=0;i<N;i+=block){const n=Math.min(block,N-i);
  for(let j=0;j<n;j++){const l=chans[0][i+j],r=ch>1?chans[1][i+j]:l;left[j]=l<=-1?-32768:l>=1?32767:Math.round(l*32767);right[j]=r<=-1?-32768:r>=1?32767:Math.round(r*32767)}
  const out=enc.encodeBuffer(n===block?left:left.subarray(0,n),n===block?right:right.subarray(0,n));if(out.length)parts.push(new Uint8Array(out));
  if(i%(block*240)<block){progress(i/N);await new Promise(r=>setTimeout(r))}}
 const last=enc.flush();if(last.length)parts.push(new Uint8Array(last));progress(1);
 return new Blob([id3Tag(tags),...parts],{type:'audio/mpeg'})}
// Sottotitoli SRT e WebVTT: si leggono entrambi, i tag di formattazione vengono tolti.
const cueTimeOf=s=>{const m=/(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/.exec(String(s).trim());return m?(Number(m[1]||0))*3600+Number(m[2])*60+Number(m[3])+Number('0.'+m[4].padEnd(3,'0')):NaN};
function parseSubs(text){const out=[];for(const block of String(text).replace(/^﻿/,'').replace(/\r\n?/g,'\n').split(/\n[ \t]*\n/)){const lines=block.split('\n').filter(l=>l.trim()!=='');const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;const [a,z]=lines[i].split('-->'),s=cueTimeOf(a),e=cueTimeOf(z.trim().split(/\s+/)[0]);if(!(s>=0&&e>s))continue;const body=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();if(body)out.push({start:s,end:e,text:body})}return out.sort((a,b)=>a.start-b.start)}
const cueStamp=(s,sep)=>{const ms=Math.round(Math.max(0,s)*1000);return pad2(Math.floor(ms/3600000))+':'+pad2(Math.floor(ms/60000)%60)+':'+pad2(Math.floor(ms/1000)%60)+sep+String(ms%1000).padStart(3,'0')};
const srtText=cues=>cues.map((c,i)=>`${i+1}\n${cueStamp(c.start,',')} --> ${cueStamp(c.end,',')}\n${c.text}`).join('\n\n')+'\n';
const vttText=cues=>'WEBVTT\n\n'+cues.map(c=>`${cueStamp(c.start,'.')} --> ${cueStamp(c.end,'.')}\n${c.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/-->/g,'->')}`).join('\n\n')+'\n';
// Marcatori come testo: una riga per marcatore con inizio, fine e nome separati da tabulazioni (come molti editor audio).
const labelsText=(markers,rate)=>markers.map(m=>{const t=(m.pos/rate).toFixed(6);return `${t}\t${t}\t${m.label.replace(/[\t\n]/g,' ')}`}).join('\n')+'\n';
function parseLabels(text,rate){const out=[];for(const line of String(text).replace(/^﻿/,'').split(/\r?\n/)){if(!line.trim()||line.startsWith('\\'))continue;const p=line.split('\t'),t=Number(String(p[0]).trim().replace(',','.'));if(!Number.isFinite(t)||t<0)continue;out.push({id:uid(),pos:Math.round(t*rate),label:(p[2]??p[1]??'').trim()||'Marcatore'})}return out}
