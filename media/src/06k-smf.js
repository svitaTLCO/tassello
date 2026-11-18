// File MIDI standard (SMF, Standard MIDI File): lettura dei tipi 0 e 1 e scrittura del tipo 0.
// Il parser lavora in tick del file e non converte in secondi: importando in un progetto a tempo fisso le note
// restano sulla griglia musicale (stessa battuta, stesso movimento), che è ciò che ci si aspetta da una DAW.
// La divisione SMPTE (tempo in fotogrammi, non in tick per semiminima) si rifiuta con un messaggio chiaro.
const SMF_PPQ=480;
// Numero a lunghezza variabile (7 bit per byte, il primo bit alto segna la continuazione).
function smfVar(n){n=Math.max(0,Math.round(n));const out=[n&0x7f];n=Math.floor(n/128);while(n){out.unshift((n&0x7f)|0x80);n=Math.floor(n/128)}return out}
function smfBytes(n){return[0,1,2,3].map(i=>(n>>(24-8*i))&255)}
function smfText(body){try{return new TextDecoder('utf-8',{fatal:true}).decode(body).replace(/\0[\s\S]*$/,'').trim()}
 catch(e){let s='';for(const b of body){if(!b)break;s+=String.fromCharCode(b)}return s.trim()}}
// Una traccia SMF: eventi con running status, meta eventi, note on/off appaiate per canale e altezza in ordine
// FIFO (due note sulla stessa altezza che si sovrappongono si chiudono nella stessa sequenza in cui si aprono).
function smfReadTrack(d,at,end){
 // run è l'ultimo status di canale: non si azzera con meta e sysex, perché in giro ci sono file (sequencer
 // vecchi, export di notazione) che riusano lo status di canale dopo un meta evento. Per la specifica non
 // dovrebbero, ma essere tolleranti costa niente.
 let tick=0,status=0,run=0,name='',notes=[],channels=new Set(),programs={},tempo=[];
 const open=new Map(),readVar=()=>{let v=0,k=0,b;do{if(at>=end)throw Error('Traccia MIDI troncata');b=d[at++];v=(v<<7)|(b&0x7f);if(++k>4)throw Error('Numero variabile MIDI troppo lungo')}while(b&0x80);return v};
 const key=(ch,p)=>ch*128+p,close=(ch,p,t)=>{const q=open.get(key(ch,p));if(!q||!q.length)return;const n=q.shift();if(!q.length)open.delete(key(ch,p));notes.push({t:n.t,d:Math.max(1,t-n.t),p,v:n.v,ch})};
 while(at<end){
  const dt=readVar();tick+=dt;
  if(at>=end)throw Error('Traccia MIDI troncata');
  const b=d[at];
  if(b&0x80){at++;status=b;if(status<0xF0)run=status}
  else{if(!run)throw Error('Running status senza un evento prima: file MIDI danneggiato');status=run}
  if(status===0xFF){if(at>=end)throw Error('Traccia MIDI troncata');const type=d[at++],len=readVar();
   if(at+len>end)throw Error('Traccia MIDI troncata');const body=d.subarray(at,at+len);at+=len;
   if(type===0x03)name=smfText(body);
   else if(type===0x51&&len===3)tempo.push({t:tick,us:(body[0]<<16)|(body[1]<<8)|body[2]});
   if(type===0x2F)break;
   continue}
  if(status===0xF0||status===0xF7){const len=readVar();if(at+len>end)throw Error('Traccia MIDI troncata');at+=len;continue}
  const hi=status&0xF0,ch=status&15;
  if(hi===0xC0){programs[ch]=d[at++];channels.add(ch);continue}
  if(hi===0xD0){at++;continue}
  const two=hi===0x80||hi===0x90||hi===0xA0||hi===0xB0||hi===0xE0;
  if(at+(two?2:1)>end)throw Error('Traccia MIDI troncata');
  const d1=d[at++],d2=two?d[at++]:0;
  if(hi===0x90&&d2>0){channels.add(ch);const k=key(ch,d1);if(!open.has(k))open.set(k,[]);open.get(k).push({t:tick,p:d1,v:d2})}
  else if(hi===0x80||(hi===0x90&&d2===0))close(ch,d1,tick);
 }
 // Una nota senza il suo note off si chiude alla fine della traccia: meglio suonarla che perdere il contenuto.
 for(const q of open.values())for(const n of q)notes.push({t:n.t,d:Math.max(1,tick-n.t),p:n.p,v:n.v,ch:n.ch});
 notes.sort((a,b)=>a.t-b.t||a.p-b.p);
 return{name,notes,channels:[...channels].sort((a,b)=>a-b),programs,tempo,endTick:tick};
}
// Lettura: restituisce formato, divisione e tracce con note in tick del file (con il canale di ogni nota).
function smfRead(buf){
 const d=buf instanceof Uint8Array?buf:new Uint8Array(buf);
 if(d.length<14||String.fromCharCode(d[0],d[1],d[2],d[3])!=='MThd')throw Error('Non è un file MIDI: manca l’intestazione MThd');
 const hlen=(d[4]<<24|d[5]<<16|d[6]<<8|d[7])>>>0;
 if(hlen<6||8+hlen>d.length)throw Error('Intestazione MIDI danneggiata');
 const format=(d[8]<<8|d[9])>>>0,ntr=(d[10]<<8|d[11])>>>0,div=(d[12]<<8|d[13])>>>0;
 if(div&0x8000)throw Error('I file MIDI con divisione SMPTE (tempo in fotogrammi) non sono supportati');
 if(!(div>0))throw Error('Divisione MIDI non valida');
 if(format>1)throw Error('Formato MIDI '+format+' non supportato: si leggono i file di tipo 0 e 1');
 const tracks=[];let at=8+hlen;
 while(at+8<=d.length){
  const id=String.fromCharCode(d[at],d[at+1],d[at+2],d[at+3]),len=(d[at+4]<<24|d[at+5]<<16|d[at+6]<<8|d[at+7])>>>0,end=at+8+len;
  if(end>d.length)throw Error('Traccia MIDI troncata');
  if(id==='MTrk')tracks.push(smfReadTrack(d,at+8,end));
  at=end;
 }
 if(!tracks.length)throw Error('Il file MIDI non contiene tracce');
 return{format,ppq:div,tracks};
}
// Il primo tempo dichiarato dal file: serve all'importazione per dire a che velocità è il .mid, e ad adottarlo se
// il progetto è vuoto. changes dice quanti cambi di tempo ci sono: l'importazione tiene solo il primo.
function smfTempoInfo(parsed){const all=[];for(const t of parsed.tracks)for(const x of t.tempo||[])all.push(x);
 if(!all.length)return{bpm:null,changes:0};all.sort((a,b)=>a.t-b.t);const us=all[0].us;
 return{bpm:us>0?Math.round(60000000/us*100)/100:null,changes:all.length}}
// Una traccia SMF può contenere più canali: per l'importazione si separa per canale, così ogni parte diventa una
// traccia di Tassello con il suo midiCh (canale SMF 0-15 → midiCh 1-16). Le tracce senza note (per esempio quella
// del tempo nei file di tipo 1) si scartano.
function smfSplitChannels(parsed){
 const out=[],base=parsed.ppq||SMF_PPQ;
 for(const [ti,tr] of parsed.tracks.entries()){
  const byCh=new Map();
  for(const n of tr.notes){if(!byCh.has(n.ch))byCh.set(n.ch,[]);byCh.get(n.ch).push({t:Math.round(n.t*SMF_PPQ/base),d:Math.max(1,Math.round(n.d*SMF_PPQ/base)),p:n.p,v:n.v})}
  for(const [ch,notes] of [...byCh].sort((a,b)=>a[0]-b[0])){
   out.push({name:(tr.name||'Traccia '+(ti+1))+(byCh.size>1?' · canale '+(ch+1):''),ch:ch+1,program:tr.programs?.[ch]??null,notes})
  }
 }
 return out;
}
// Scrittura di un file di tipo 0 a 480 tick per semiminima, con il tempo dal BPM: tutte le parti finiscono in una
// sola traccia e ogni nota porta il proprio canale. I note off vengono prima dei note on sullo stesso tick, così
// una nota che finisce dove ne comincia un'altra sulla stessa altezza non si spegne per sbaglio.
function smfWrite({bpm=120,tracks=[],name='Tassello Media'}={}){
 const ppq=SMF_PPQ,events=[];
 for(const tr of tracks){const ch=Math.max(0,Math.min(15,(Number(tr.ch)||1)-1));
  if(tr.program!=null)events.push({tick:0,prio:1,data:[0xC0|ch,Math.max(0,Math.min(127,tr.program|0))]});
  for(const n of tr.notes||[]){const p=Math.max(0,Math.min(127,n.p|0)),v=Math.max(1,Math.min(127,n.v|0)),t=Math.max(0,Math.round(n.t)),e=t+Math.max(1,Math.round(n.d));
   events.push({tick:t,prio:3,data:[0x90|ch,p,v]});events.push({tick:e,prio:2,data:[0x80|ch,p,0]})}}
 events.sort((a,b)=>a.tick-b.tick||a.prio-b.prio);
 const tempo=Math.max(1,Math.round(60000000/Math.max(1,Number(bpm)||120))),body=[];
 const push=(...b)=>body.push(...b),varLen=n=>push(...smfVar(n)),nameBytes=[...new TextEncoder().encode(String(name))];
 // Meta eventi: nome della traccia e tempo iniziale (un file di tipo 0 ha tutto in una traccia).
 push(0x00,0xFF,0x03);varLen(nameBytes.length);push(...nameBytes);
 push(0x00,0xFF,0x51,0x03,(tempo>>16)&255,(tempo>>8)&255,tempo&255);
 // Ogni evento porta il suo delta dall'evento precedente; i delta sono a lunghezza variabile.
 let last=0;
 for(const e of events){varLen(e.tick-last);last=e.tick;push(...e.data)}
 push(0x00,0xFF,0x2F,0x00);
 const head=[0x4D,0x54,0x68,0x64,...smfBytes(6),0,0,0,1,(ppq>>8)&255,ppq&255],
  trk=[0x4D,0x54,0x72,0x6B,...smfBytes(body.length),...body];
 return new Uint8Array([...head,...trk]);
}
