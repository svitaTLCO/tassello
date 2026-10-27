// Contenitori del video esportato: MP4 con H.264 e AAC, WebM con VP9 (o VP8) e Opus. Video e audio si alternano a tratti
// di un secondo, l'indice sta all'inizio (il file si apre e ci si sposta subito) e i dati restano nei Blob dei pacchetti,
// senza copiarli in un unico array: un video lungo non deve stare tutto nella memoria della pagina.
// Pacchetto: {data (Blob o Uint8Array), size, pts e dur in microsecondi, key}.
const be32s=list=>{const b=new Uint8Array(list.length*4),v=new DataView(b.buffer);for(let i=0;i<list.length;i++)v.setUint32(i*4,list[i]>>>0);return b};
const be64=n=>{const b=new Uint8Array(8);new DataView(b.buffer).setBigUint64(0,BigInt(Math.round(n)));return b};
const psize=p=>p.size??p.data.byteLength??p.data.size;
const seriesRuns=list=>{const r=[];for(const d of list){const l=r.at(-1);if(l&&l[1]===d)l[0]++;else r.push([1,d])}return r};
// Tratti di un secondo: per ogni traccia l'elenco dei pacchetti (indici) che cadono in ciascun secondo.
function chunkPlan(times,T){const out=[];let k=0;for(let w=0;w*1e6<T||k<times.length;w++){const from=k;while(k<times.length&&times[k]<(w+1)*1e6)k++;out.push([from,k])}return out}
function mp4Movie({video,audio}){const vs=90000,V=video.packets,Au=audio?.packets||[],T=Math.max(V.length?V.at(-1).pts+V.at(-1).dur:0,Au.length?Au.at(-1).ts+Au.at(-1).dur:0);
 // Ordine di decodifica = ordine d'uscita del codificatore; se i tempi di presentazione non crescono servono gli scarti (ctts).
 const dts=V.map(p=>p.pts).sort((a,b)=>a-b),vt=x=>Math.round(x*vs/1e6),vdur=V.map((p,i)=>i+1<V.length?vt(dts[i+1])-vt(dts[i]):vt(p.dur)),cto=V.map((p,i)=>vt(p.pts)-vt(dts[i])),keys=[];V.forEach((p,i)=>{if(p.key)keys.push(i+1)});
 const ar=audio?.rate||48000,adur=Au.map(p=>p.dur?Math.round(p.dur*ar/1e6):1024);
 // Tratti: secondo per secondo prima il video poi l'audio.
 const vPlan=chunkPlan(dts,T),aPlan=chunkPlan(Au.map(p=>p.ts),T),chunks=[];for(let w=0;w<Math.max(vPlan.length,aPlan.length);w++){const v=vPlan[w],a=aPlan[w];if(v&&v[1]>v[0])chunks.push({track:'v',from:v[0],to:v[1]});if(a&&a[1]>a[0])chunks.push({track:'a',from:a[0],to:a[1]})}
 let rel=0;for(const c of chunks){const list=c.track==='v'?V:Au;c.rel=rel;for(let i=c.from;i<c.to;i++)rel+=psize(list[i])}
 const payload=rel,mdatHead=payload+8>0xFFFFFFFF?16:8,big=payload+mdatHead+(1<<22)>0xFFFFFFFF;
 const table=(track,base)=>{const cs=chunks.filter(c=>c.track===track),sc=[];cs.forEach((c,i)=>{const n=c.to-c.from;if(!sc.length||sc.at(-1)[1]!==n)sc.push([i+1,n])});
  return[fullBox('stsc',0,0,be32(sc.length),be32s(sc.flat().flatMap((x,i)=>i%2?[x,1]:[x]))),big?fullBox('co64',0,0,be32(cs.length),...cs.map(c=>be64(base+c.rel))):fullBox('stco',0,0,be32(cs.length),be32s(cs.map(c=>base+c.rel)))]};
 const durMs=Math.round(T/1000),vDurTs=vdur.reduce((a,b)=>a+b,0),aDurTs=adur.reduce((a,b)=>a+b,0),w=video.width,h=video.height;
 const moov=base=>{const vr=seriesRuns(vdur),cr=seriesRuns(cto),stsz=list=>fullBox('stsz',0,0,be32(0),be32(list.length),be32s(list.map(psize)));
  const vtrak=box('trak',fullBox('tkhd',0,3,be32(0),be32(0),be32(1),be32(0),be32(durMs),new Array(8).fill(0),be16(0),be16(0),be16(0),be16(0),MATRIX,be32(w*65536),be32(h*65536)),
   box('mdia',fullBox('mdhd',0,0,be32(0),be32(0),be32(vs),be32(vDurTs),be16(0x55C4),be16(0)),fullBox('hdlr',0,0,be32(0),chars('vide'),new Array(12).fill(0),[...chars('VideoHandler'),0]),
    box('minf',fullBox('vmhd',0,1,new Array(8).fill(0)),box('dinf',fullBox('dref',0,0,be32(1),fullBox('url ',0,1))),
     box('stbl',fullBox('stsd',0,0,be32(1),box('avc1',[0,0,0,0,0,0,0,1,...new Array(16).fill(0),...be16(w),...be16(h),...be32(0x00480000),...be32(0x00480000),0,0,0,0,...be16(1),...new Array(32).fill(0),...be16(0x18),0xFF,0xFF],box('avcC',video.desc))),
      fullBox('stts',0,0,be32(vr.length),be32s(vr.flat())),...(cto.some(x=>x)?[fullBox('ctts',1,0,be32(cr.length),be32s(cr.flat()))]:[]),fullBox('stss',0,0,be32(keys.length),be32s(keys)),...table('v',base),stsz(V)))));
  const ats=audio?[box('trak',fullBox('tkhd',0,3,be32(0),be32(0),be32(2),be32(0),be32(durMs),new Array(8).fill(0),be16(0),be16(1),be16(0x0100),be16(0),MATRIX,be32(0),be32(0)),
   box('mdia',fullBox('mdhd',0,0,be32(0),be32(0),be32(ar),be32(aDurTs),be16(0x55C4),be16(0)),fullBox('hdlr',0,0,be32(0),chars('soun'),new Array(12).fill(0),[...chars('SoundHandler'),0]),
    box('minf',fullBox('smhd',0,0,be16(0),be16(0)),box('dinf',fullBox('dref',0,0,be32(1),fullBox('url ',0,1))),
     box('stbl',fullBox('stsd',0,0,be32(1),mp4aEntry(audio.desc,audio.ch,ar,audio.bitrate)),fullBox('stts',0,0,be32(seriesRuns(adur).length),be32s(seriesRuns(adur).flat())),...table('a',base),stsz(Au)))))]:[];
  return box('moov',fullBox('mvhd',0,0,be32(0),be32(0),be32(1000),be32(durMs),be32(0x00010000),be16(0x0100),new Array(10).fill(0),MATRIX,new Array(24).fill(0),be32(3)),vtrak,...ats)};
 const ftyp=box('ftyp',chars('isom'),be32(0x200),chars('isomiso2avc1mp41')),size=moov(0).length,base=ftyp.length+size+mdatHead,head=new Uint8Array(mdatHead),hv=new DataView(head.buffer);
 if(mdatHead===16){hv.setUint32(0,1);head.set(chars('mdat'),4);hv.setBigUint64(8,BigInt(payload+16))}else{hv.setUint32(0,payload+8);head.set(chars('mdat'),4)}
 const parts=[ftyp,moov(base),head];for(const c of chunks){const list=c.track==='v'?V:Au;for(let i=c.from;i<c.to;i++)parts.push(list[i].data)}
 return new Blob(parts,{type:'video/mp4'})}
// WebM: un cluster nuovo a ogni fotogramma chiave dopo almeno un secondo (al massimo ogni 5 secondi), blocchi di video e
// audio in ordine di tempo, indice dei fotogrammi chiave (Cues) in fondo e indice degli elementi (SeekHead) in testa.
function webmMovie({video,audio}){const ev=[];for(const p of video.packets)ev.push({t:Math.round(p.pts/1000),track:1,key:p.key,p});for(const p of audio?.packets||[])ev.push({t:Math.round(p.ts/1000),track:2,key:true,p});
 ev.sort((a,b)=>a.t-b.t||a.track-b.track);const T=ev.reduce((m,e)=>Math.max(m,e.t+Math.round((e.p.dur||0)/1000)),0),clusters=[];let cur=null;
 for(const e of ev){if(!cur||e.t-cur.t0>=5000||(e.track===1&&e.key&&e.t-cur.t0>=1000)){cur={t0:e.t,blocks:[],key:e.track===1&&e.key,size:0};clusters.push(cur)}
  const rel=e.t-cur.t0,hdr=Uint8Array.from([0x80|e.track,rel>>8&255,rel&255,e.key?0x80:0]),len=hdr.length+psize(e.p),idLen=Uint8Array.from([0xA3,...ebmlLen(len)]);cur.blocks.push(idLen,hdr,e.p.data);cur.size+=idLen.length+len}
 for(const c of clusters){c.tc=ebml(0xE7,ebUint(c.t0));c.head=Uint8Array.from([...ebmlId(0x1F43B675),...ebmlLen(c.tc.length+c.size,8)]);c.bytes=c.head.length+c.tc.length+c.size}
 const vcodec=video.codec==='vp8'?'V_VP8':'V_VP9',head=audio?(audio.desc&&audio.desc.length>=19?audio.desc:opusHead(audio.ch,audio.rate)):null;
 const info=ebml(0x1549A966,ebml(0x2AD7B1,ebUint(1e6)),ebml(0x4489,ebFloat(T)),ebml(0x4D80,te.encode('Tassello Media')),ebml(0x5741,te.encode('Tassello Media')));
 const tracks=ebml(0x1654AE6B,ebml(0xAE,ebml(0xD7,[1]),ebml(0x73C5,[1]),ebml(0x83,[1]),ebml(0x86,te.encode(vcodec)),ebml(0xE0,ebml(0xB0,ebUint(video.width)),ebml(0xBA,ebUint(video.height)))),
  ...(audio?[ebml(0xAE,ebml(0xD7,[2]),ebml(0x73C5,[2]),ebml(0x83,[2]),ebml(0x86,te.encode('A_OPUS')),ebml(0x63A2,head),ebml(0x56AA,ebUint(Math.round(new DataView(head.buffer,head.byteOffset).getUint16(10,true)/48000*1e9))),ebml(0x56BB,ebUint(80e6)),ebml(0xE1,ebml(0xB5,ebFloat(audio.rate)),ebml(0x9F,[audio.ch])))]:[]));
 const seek=(id,pos)=>ebml(0x4DBB,ebml(0x53AB,ebmlId(id)),ebml(0x53AC,ebUint(pos,8))),seekLen=ebml(0x114D9B74,seek(0x1549A966,0),seek(0x1654AE6B,0),seek(0x1C53BB6B,0)).length;
 let pos=seekLen+info.length+tracks.length;const cues=[];for(const c of clusters){if(c.key)cues.push(ebml(0xBB,ebml(0xB3,ebUint(c.t0)),ebml(0xB7,ebml(0xF7,[1]),ebml(0xF1,ebUint(pos)))));pos+=c.bytes}
 const cueEl=ebml(0x1C53BB6B,...cues),seekHead=ebml(0x114D9B74,seek(0x1549A966,seekLen),seek(0x1654AE6B,seekLen+info.length),seek(0x1C53BB6B,pos));
 const ebmlHead=ebml(0x1A45DFA3,ebml(0x4286,[1]),ebml(0x42F7,[1]),ebml(0x42F2,[4]),ebml(0x42F3,[8]),ebml(0x4282,te.encode('webm')),ebml(0x4287,[4]),ebml(0x4285,[2]));
 const parts=[ebmlHead,Uint8Array.from(ebmlId(0x18538067)),ebmlLen(pos+cueEl.length,8),seekHead,info,tracks];for(const c of clusters)parts.push(c.head,c.tc,...c.blocks);parts.push(cueEl);
 return new Blob(parts,{type:'video/webm'})}
