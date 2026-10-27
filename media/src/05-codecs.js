// Formati audio e di testo. Il WAV si legge e si scrive qui, con i marcatori nei blocchi cue e LIST adtl
// (li leggono anche molti programmi professionali); gli altri formati li decodifica il browser.
// La codifica compressa usa WebCodecs: AAC in M4A oppure Opus in WebM, più veloce del tempo reale.
const ascii4=(v,at)=>String.fromCharCode(v.getUint8(at),v.getUint8(at+1),v.getUint8(at+2),v.getUint8(at+3));
const MAX_CHANNELS=8;
function readWav(buf){const v=new DataView(buf);if(v.byteLength<12)return null;const riff=ascii4(v,0);if((riff!=='RIFF'&&riff!=='RF64')||ascii4(v,8)!=='WAVE')return null;
 let at=12,fmt=null,data=null;const cues=[],labels=new Map();
 while(at+8<=v.byteLength){const id=ascii4(v,at),body=at+8;let size=v.getUint32(at+4,true);
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
// WAV a 16 o 24 bit interi oppure 32 bit in virgola mobile, dal campione start a end; i marcatori diventano cue e labl.
function wavBlob(buffer,bits=16,markers=[],start=0,end=buffer.length){const ch=buffer.numberOfChannels,rate=buffer.sampleRate,frames=Math.max(0,end-start),float=bits===32,bps=bits/8,dataLen=frames*ch*bps;
 if(dataLen+1e6>0xFFFFFFFF)throw Error('Il file supera i 4 GB del formato WAV: esporta una parte alla volta');
 const ms=markers.filter(m=>m.pos>=start&&m.pos<=end);
 const labl=ms.map((m,i)=>{const t=te.encode((m.label||'')+'\0'),pad=t.length&1,b=new Uint8Array(12+t.length+pad),v=new DataView(b.buffer);b.set([108,97,98,108]);v.setUint32(4,4+t.length,true);v.setUint32(8,i+1,true);b.set(t,12);return b});
 const tail=[];if(ms.length){const cue=new Uint8Array(12+ms.length*24),v=new DataView(cue.buffer);cue.set([99,117,101,32]);v.setUint32(4,4+ms.length*24,true);v.setUint32(8,ms.length,true);ms.forEach((m,i)=>{const p=12+i*24;v.setUint32(p,i+1,true);v.setUint32(p+4,m.pos-start,true);cue.set([100,97,116,97],p+8);v.setUint32(p+20,m.pos-start,true)});
  const listLen=4+labl.reduce((n,b)=>n+b.length,0),list=new Uint8Array(12),lv=new DataView(list.buffer);list.set([76,73,83,84]);lv.setUint32(4,listLen,true);list.set([97,100,116,108],8);tail.push(cue,list,...labl)}
 const fmtLen=float?18:16,fact=float?12:0,head=new ArrayBuffer(12+8+fmtLen+fact+8),v=new DataView(head),tailLen=tail.reduce((n,b)=>n+b.length,0);
 const w4=(at,s)=>{for(let i=0;i<4;i++)v.setUint8(at+i,s.charCodeAt(i))};
 w4(0,'RIFF');v.setUint32(4,head.byteLength-8+dataLen+(dataLen&1)+tailLen,true);w4(8,'WAVE');w4(12,'fmt ');v.setUint32(16,fmtLen,true);v.setUint16(20,float?3:1,true);v.setUint16(22,ch,true);v.setUint32(24,rate,true);v.setUint32(28,rate*ch*bps,true);v.setUint16(32,ch*bps,true);v.setUint16(34,bits,true);
 let at=36;if(float){v.setUint16(at,0,true);at+=2;w4(at,'fact');v.setUint32(at+4,4,true);v.setUint32(at+8,frames,true);at+=12}w4(at,'data');v.setUint32(at+4,dataLen,true);
 const parts=[head],chans=Array.from({length:ch},(_,c)=>buffer.getChannelData(c)),BLOCK=1<<18;
 for(let i=start;i<end;i+=BLOCK){const n=Math.min(BLOCK,end-i);
  if(float){const a=new Float32Array(n*ch);for(let c=0;c<ch;c++){const d=chans[c];for(let j=0,k=c;j<n;j++,k+=ch)a[k]=d[i+j]}parts.push(a)}
  else if(bits===16){const a=new Int16Array(n*ch);for(let c=0;c<ch;c++){const d=chans[c];for(let j=0,k=c;j<n;j++,k+=ch){const x=d[i+j];a[k]=x<=-1?-32768:x>=1?32767:Math.round(x*32767)}}parts.push(a)}
  else{const a=new Uint8Array(n*ch*3),step=ch*3;for(let c=0;c<ch;c++){const d=chans[c];for(let j=0,k=c*3;j<n;j++,k+=step){const x=d[i+j],s=x<=-1?-8388608:x>=1?8388607:Math.round(x*8388607);a[k]=s&255;a[k+1]=s>>8&255;a[k+2]=s>>16&255}}parts.push(a)}}
 if(dataLen&1)parts.push(new Uint8Array(1));parts.push(...tail);return new Blob(parts,{type:'audio/wav'})}
// AudioBuffer con i canali dati; la frequenza resta quella del file.
function makeBuffer(channels,rate){const len=channels[0]?.length||0;if(!len)return null;const b=new AudioBuffer({length:len,numberOfChannels:channels.length,sampleRate:rate});channels.forEach((d,c)=>b.copyToChannel(d,c));return b}
// Cambio di frequenza con il motore audio del browser (OfflineAudioContext).
async function resampleBuffer(buf,rate){if(!buf||buf.sampleRate===rate)return buf;const oc=new OfflineAudioContext(buf.numberOfChannels,Math.max(1,Math.round(buf.length*rate/buf.sampleRate)),rate),s=oc.createBufferSource();s.buffer=buf;s.connect(oc.destination);s.start();return oc.startRendering()}
// Decodifica di qualunque file audio (o dell'audio di un video) che il browser sa leggere. I WAV passano dal lettore
// interno, che conserva la frequenza originale, i bit in virgola mobile e i marcatori.
let decodeCtx=null;
async function decodeAudioFile(file){const buf=await file.arrayBuffer();let wav=null;try{wav=readWav(buf)}catch(e){if(/WAV/.test(e.message)&&!/non supportato/.test(e.message))throw e}
 if(wav)return{buffer:wav.buffer,markers:wav.markers};
 decodeCtx??=new (window.AudioContext||window.webkitAudioContext)();let out;
 try{out=await decodeCtx.decodeAudioData(buf)}catch(e){throw Error(`Il browser non sa leggere l’audio di «${file.name}»`)}
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
async function compressedBlob(buffer,kind,bitrate,progress){const enc=await encodeAudio(buffer,kind,bitrate,progress);return kind==='aac'?m4aBlob(enc):webmAudioBlob(enc)}
// Sottotitoli SRT e WebVTT: si leggono entrambi, i tag di formattazione vengono tolti.
const cueTimeOf=s=>{const m=/(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/.exec(String(s).trim());return m?(Number(m[1]||0))*3600+Number(m[2])*60+Number(m[3])+Number('0.'+m[4].padEnd(3,'0')):NaN};
function parseSubs(text){const out=[];for(const block of String(text).replace(/^﻿/,'').replace(/\r\n?/g,'\n').split(/\n[ \t]*\n/)){const lines=block.split('\n').filter(l=>l.trim()!=='');const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;const [a,z]=lines[i].split('-->'),s=cueTimeOf(a),e=cueTimeOf(z.trim().split(/\s+/)[0]);if(!(s>=0&&e>s))continue;const body=lines.slice(i+1).join('\n').replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();if(body)out.push({start:s,end:e,text:body})}return out.sort((a,b)=>a.start-b.start)}
const cueStamp=(s,sep)=>{const ms=Math.round(Math.max(0,s)*1000);return pad2(Math.floor(ms/3600000))+':'+pad2(Math.floor(ms/60000)%60)+':'+pad2(Math.floor(ms/1000)%60)+sep+String(ms%1000).padStart(3,'0')};
const srtText=cues=>cues.map((c,i)=>`${i+1}\n${cueStamp(c.start,',')} --> ${cueStamp(c.end,',')}\n${c.text}`).join('\n\n')+'\n';
const vttText=cues=>'WEBVTT\n\n'+cues.map(c=>`${cueStamp(c.start,'.')} --> ${cueStamp(c.end,'.')}\n${c.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/-->/g,'->')}`).join('\n\n')+'\n';
// Marcatori come testo: una riga per marcatore con inizio, fine e nome separati da tabulazioni (come molti editor audio).
const labelsText=(markers,rate)=>markers.map(m=>{const t=(m.pos/rate).toFixed(6);return `${t}\t${t}\t${m.label.replace(/[\t\n]/g,' ')}`}).join('\n')+'\n';
function parseLabels(text,rate){const out=[];for(const line of String(text).replace(/^﻿/,'').split(/\r?\n/)){if(!line.trim()||line.startsWith('\\'))continue;const p=line.split('\t'),t=Number(String(p[0]).trim().replace(',','.'));if(!Number.isFinite(t)||t<0)continue;out.push({id:uid(),pos:Math.round(t*rate),label:(p[2]??p[1]??'').trim()||'Marcatore'})}return out}
