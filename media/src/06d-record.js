// Registrazione dal microfono. La finestra mostra l'indicatore di livello già prima di iniziare; durante la
// registrazione avvisa a voce se il livello è troppo alto (distorsione) o troppo basso. L'audio resta sul dispositivo.
// Con onStart la registrazione parte insieme a qualcos'altro (l'ascolto delle altre tracce, il conteggio): Avvia
// la fa partire e Ferma la conclude, senza pause. info.first è l'istante del contesto audio del primo campione.
// Vincoli della cattura: nessuna elaborazione del browser e, se scelto, un ingresso preciso. L'ingresso arriva come
// {id,label} (o vecchio stile, una stringa): se l'id non risponde (scollegato, ZIP aperto su un'altra macchina) si
// riprova con l'etichetta — due interfacce identiche hanno la stessa, si prende la prima e lo si dice — e in
//ultima istanza si parte dal predefinito, avvisando; la preferenza si azzera solo se l'id veniva da lì.
// ——— Registrazione MIDI ———
// Non distruttiva: le note catturate diventano una regione nuova (predefinito) oppure si aggiungono alla regione
// sotto l'indicatore (sovraincisione), sempre dentro un pCommit, quindi Ctrl+Z le toglie. Le note che cominciano
// fino a un sedicesimo prima del via (o del punto A del punch) si tengono, portate a zero: il «perdona» all'attacco.
function midiRecFinish(stopSec,reason){
 const rec=MIDI.rec;if(!rec)return;MIDI.rec=null;
 const t=rec.track;
 if(!t||!P.tracks.includes(t)){announce('Registrazione MIDI scartata: la traccia non c’è più');return}
 // Le note tenute fino al fermo si chiudono allo stop, con la stessa compensazione applicata agli ingressi.
 const stopAdj=stopSec-(Number(prefs.midiComp)||0)/1000;
 for(const n of rec.open.values()){n.end=stopAdj;rec.notes.push(n)}rec.open.clear();
 for(const n of rec.sustained){n.end=stopAdj;rec.notes.push(n)}rec.sustained=[];
 const sixteenth=beatDur()/4;
 let start=rec.startProject,list=rec.notes,dropped=0;
 if(rec.punch){start=rec.punch.a;list=list.filter(n=>n.start>=rec.punch.a-sixteenth&&n.start<rec.punch.b)}
 else list=list.filter(n=>n.start>=start-sixteenth);
 dropped=rec.notes.length-list.length;
 if(!list.length){announce('Registrazione MIDI: nessuna nota dentro '+(rec.punch?'il punch':'il brano')+(dropped?`, ${dropped} fuori`:''));return}
 const startT=midiTick(start),abs=list.map(n=>{const a=Math.max(startT,midiTick(n.start)),e=Math.max(a+1,midiTick(n.end));return{a,e,p:n.p,v:n.v}});
 let made=null,added=0,excluded=0;
 pCommit('Registrazione MIDI',()=>{
  const r=rec.overdub?P.regions.find(x=>x.track===t.id&&x.kind==='midi'&&x.start<=start+1e-6&&x.start+x.dur>start):null;
  if(r){
   const relAll=abs.map(n=>({t:n.a-r.startT+r.offT,d:n.e-n.a,p:n.p,v:n.v})).filter(n=>n.t>=r.offT),
    room=Math.max(0,2000-r.notes.length),rel=relAll.slice(0,room);
   added=rel.length;excluded+=relAll.length-rel.length;
   // Le note che c'erano restano tutte: si aggiungono solo le nuove che stanno nel limite, e si dice quante restano fuori.
   if(excluded)toast(`${excluded} ${excluded===1?'nota nuova non aggiunta':'note nuove non aggiunte'}: la regione ha già ${r.notes.length} note`);
   let maxEnd=r.offT+r.durT;
   for(const n of rel)maxEnd=Math.max(maxEnd,n.t+n.d);
   r.notes=[...r.notes,...rel].sort((a,b)=>a.t-b.t||a.p-b.p);
   // La durata si allunga fino all'ultima nota, altrimenti le note nuove restano nascoste e sembrano perse.
   const durT=Math.max(r.durT,maxEnd-r.offT);r.durT=durT;r.dur=midiSec(durT);
   made=r;P.sel=r.id;P.track=t.id;
  }else{
   const notes=abs.map(n=>({t:n.a-startT,d:n.e-n.a,p:n.p,v:n.v}));
   if(notes.length>2000)toast('Più di 2000 note: le eccedenti non sono state registrate');
   const ref=notes.reduce((m,n)=>Math.max(m,n.t+n.d),0),durT=Math.max(MIDIPPQ*P.sig,Math.ceil(ref/MIDIPPQ)*MIDIPPQ);
   made=newMidiRegion(t.id,startT,'Registrazione MIDI '+(P.regions.filter(x=>x.track===t.id&&x.kind==='midi').length+1));
   made.notes=notes.slice(0,2000);made.durT=durT;made.dur=midiSec(durT);
   P.regions.push(made);added=notes.length;P.sel=made.id;P.track=t.id;
  }
 },{live:true});
 P.t=start;updateArrangeUI();focusLane(t.id);
 const saved=rec.overdub?added:added;
 announce((reason==='modifica'?`Registrazione MIDI conclusa per una modifica al progetto: ${saved} ${saved===1?'nota salvata':'note salvate'}`:
  rec.overdub?`Registrazione MIDI: ${added} ${added===1?'nota aggiunta':'note aggiunte'} a «${made?.name||''}»${excluded?`, ${excluded} ${excluded===1?'nuova non aggiunta':'nuove non aggiunte'} perché la regione è piena`:''}`:
  `Registrazione MIDI: ${added} note in una nuova regione «${made?.name||''}» da ${sayTime(start,2)}`)+(dropped&&reason!=='modifica'?`, ${dropped} fuori`:''));
 return {saved,excluded,dropped};
}
// Avvio: conteggio, ascolto delle altre tracce, cattura. Si ferma con Ferma (mixStop chiude la registrazione).
async function recordMidi(){
 const t=selTrack();if(!t||t.kind!=='midi'){toast('Scegli una traccia MIDI per registrare le note');return}
 if(MIDI.rec){toast('La registrazione MIDI è già in corso: ferma prima');return}
 const ready=await midiStart({quiet:true}).catch(()=>false);
 if(!ready||!midiInputs().length){announce('Nessun ingresso MIDI: collega una tastiera e riprova');return}
 if(MIX.playing)mixStop(true);
 if(P.countIn)await countIn();
 const playFrom=P.t,punchOn=!!P.punch?.on,from=punchOn?Math.max(0,P.punch.a-punchPre()):playFrom;
 mixPlay(from,{recording:true,origin:playFrom});
 const pass=MIX.passes[0];
 MIDI.rec={track:t,a:from,w:pass?.w??MIX.c0,k:midiStampBase(),startProject:playFrom,punch:punchOn?{a:P.punch.a,b:P.punch.b}:null,notes:[],open:new Map(),pedal:false,sustained:[],overdub:!!prefs.midiOverdub};
 MIDI.lastAt=0;
 announce(`Registrazione MIDI su «${t.name}»${MIDI.rec.overdub?', sovraincidendo':''}.${punchOn?` Punch da ${sayTime(P.punch.a,1)} a ${sayTime(P.punch.b,1)}.`:''} Le note che suoni vanno nella traccia; ferma con Ferma.`);
}
const recConstraints=id=>({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,...(id?{deviceId:{exact:id}}:{})}});
async function recOpen(dev,{track=null}={}){const id=typeof dev==='object'?dev?.id:dev;
 if(!id)return navigator.mediaDevices.getUserMedia(recConstraints());
 try{return await navigator.mediaDevices.getUserMedia(recConstraints(id))}
 catch(e){
  const label=(typeof dev==='object'?dev?.label:'')||'';
  if(label&&navigator.mediaDevices?.enumerateDevices){const ds=await navigator.mediaDevices.enumerateDevices(),same=ds.filter(d=>d.kind==='audioinput'&&d.label===label);
   for(const d of same){try{return await navigator.mediaDevices.getUserMedia(recConstraints(d.deviceId))}catch(e2){}}
   if(same.length>1)announce(`L'ingresso «${label}» è presente più di una volta: uso il primo`)}
  if(track)toast(`L'ingresso della traccia «${track}» non c'è: uso il predefinito`);else toast('Ingresso non disponibile: uso il microfono predefinito');
  if(id===prefs.recDevice){prefs.recDevice='';savePrefs()}
  return navigator.mediaDevices.getUserMedia(recConstraints())}}
// Elenco degli ingressi: le etichette ci sono solo dopo il permesso del microfono; chi non l'ha ancora concesso
// vede un flusso breve e poi l'elenco vero. Senza l'API (per esempio su alcuni Safari) restano solo le voci anonime.
async function recInputs(){if(!navigator.mediaDevices?.enumerateDevices)return[];let ds=await navigator.mediaDevices.enumerateDevices();
 if(!ds.some(d=>d.kind==='audioinput'&&d.label))try{const s=await navigator.mediaDevices.getUserMedia(recConstraints());s.getTracks().forEach(t=>t.stop());ds=await navigator.mediaDevices.enumerateDevices()}catch(e){}
 return ds.filter(d=>d.kind==='audioinput')}
const inputOptions=ds=>[['','Predefinito (di sistema)'],...ds.map((d,i)=>[d.deviceId,d.label||`Ingresso ${i+1}`])];
async function recordDialog({title='Registra dal microfono',intro='',places=null,onStart=null,onStop=null,onDone,device=null,trackName=null,onDevice=null}){
 if(!navigator.mediaDevices?.getUserMedia){toast('Questo browser non permette di usare il microfono');return}
 let stream;try{stream=await recOpen(device??prefs.recDevice,{track:trackName})}catch(e){toast(e.name==='NotAllowedError'?'Il permesso per il microfono è stato negato: consentilo nelle impostazioni del sito e riprova':'Microfono non disponibile: '+e.message);return}
 const ctx=actxGet();
 // La cattura sta in cap: si ricostruisce quando si cambia ingresso, prima di aver registrato qualcosa.
 let track=stream.getAudioTracks()[0],settings=track.getSettings?.()||{},recording=false,starting=false,stopped=false,frames=0,first=null,peak=0,recent=[],lastWarn=0,lowWarned=false,raf=0,holdDb=-60,earconOn=!!prefs.recEarcon,earconTimer=0,testLeft=0,testPeak=0,testGainDb=null,applyGainDb=0;
 const cap={nch:clamp(settings.channelCount||1,1,2),chunks:[],src:null,proc:null};
 const buildCapture=()=>{cap.src?.disconnect();if(cap.proc){cap.proc.onaudioprocess=null;cap.proc.disconnect()}
  cap.nch=clamp(settings.channelCount||1,1,2);cap.chunks=Array.from({length:cap.nch},()=>[]);
  cap.src=ctx.createMediaStreamSource(stream);cap.proc=ctx.createScriptProcessor(4096,cap.nch,cap.nch);
  cap.proc.onaudioprocess=e=>{const ib=e.inputBuffer;let pk=0;for(let c=0;c<cap.nch;c++){const d=ib.getChannelData(Math.min(c,ib.numberOfChannels-1));for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>pk)pk=v}if(recording)cap.chunks[c].push(d.slice())}for(let c=0;c<e.outputBuffer.numberOfChannels;c++)e.outputBuffer.getChannelData(c).fill(0);
   if(recording){if(first===null)first=ctx.currentTime-ib.length/ctx.sampleRate;frames+=ib.length}peak=Math.max(pk,peak*0.85);recent.push(pk);if(recent.length>Math.ceil(ctx.sampleRate*1.5/4096))recent.shift();
   if(recording){const now=performance.now();if(pk>=0.99&&now-lastWarn>4000){lastWarn=now;announce('Livello troppo alto: allontanati dal microfono o abbassane il volume')}if(!lowWarned&&frames>ctx.sampleRate*3&&Math.max(...recent)<0.01){lowWarned=true;announce('Livello molto basso: avvicinati al microfono')}}};
  cap.src.connect(cap.proc);cap.proc.connect(ctx.destination)};
 buildCapture();
 const stopAll=()=>{if(recording||starting){recording=false;starting=false;stopped=true;onStop?.()}};
 const cleanup=()=>{stopAll();earconStop();cancelAnimationFrame(raf);cap.proc.onaudioprocess=null;try{cap.src.disconnect();cap.proc.disconnect()}catch(e){}stream.getTracks().forEach(t=>t.stop())};
 const recentDb=()=>toDb(Math.max(0,...recent));
 // Il livello si ascolta: impulsi brevi che salgono con la voce. Tacciono col metronomo, perché due ritmi insieme
 // non si decodificano. La stessa banda è disegnata sul misuratore, così il suono e lo schermo dicono la stessa cosa.
 const earconStop=()=>{if(earconTimer){clearInterval(earconTimer);earconTimer=0}};
 const earconBlip=()=>{if(!earconOn||P.metro)return;const db=toDb(Math.max(0,...recent)),ctx=actxGet(),o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
  o.type='sine';o.frequency.value=300*2**(clamp((db+60)/60,0,1)*2);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.03,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.038);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.045)};
 const earconSet=on=>{earconOn=!!on;prefs.recEarcon=earconOn;savePrefs();earconStop();if(earconOn)earconTimer=setInterval(earconBlip,120)};
 const updateApply=()=>{const b=$('recApply');if(!b)return;const d=applyGainDb||testGainDb;
  if(testGainDb==null||Math.abs(testGainDb)<=1){b.hidden=true;b.textContent='';b.removeAttribute('aria-pressed');return}
  b.hidden=false;
  if(applyGainDb){b.textContent=`Togli il guadagno di ${applyGainDb>0?'+':''}${applyGainDb} dB`;b.setAttribute('aria-pressed','true')}
  else{b.textContent=`Applica ${testGainDb>0?'+':''}${testGainDb} dB a questa registrazione`;b.setAttribute('aria-pressed','false')}};
 const toggleApply=()=>{if(!testGainDb)return;if(applyGainDb){applyGainDb=0;announce('Guadagno tolto: la registrazione resta com’è')}else{applyGainDb=testGainDb;announce(`Guadagno di ${applyGainDb>0?'+':''}${applyGainDb} dB applicato a questa registrazione`)}updateApply()};
 const testLevel=()=>{if(testLeft){announce('La prova del livello è già in corso');return}testLeft=3;testPeak=0;applyGainDb=0;announce('Prova del livello: parla per tre secondi');
  const t0=performance.now(),timer=setInterval(()=>{testPeak=Math.max(testPeak,Math.max(0,...recent));if(performance.now()-t0>=3000){clearInterval(timer);testLeft=0;const db=toDb(testPeak);
   if(!(testPeak>5e-4)){testGainDb=null;updateApply();announce('Non sento nulla: avvicinati al microfono o controlla l’ingresso')}
   else{const delta=Math.round(-6-db);testGainDb=Math.abs(delta)>1?delta:null;updateApply();announce(`Livello ${levelWords(db)}, picco ${fmtDb(db)}. ${delta>1?`Il guadagno consigliato è +${delta} dB.`:delta<-1?`Sei ${-delta} dB troppo alto: abbassa di ${-delta} dB.`:'Il livello va bene.'}`)}}},100)};
 const fields=[...(places?[{id:'place',label:'Dove mettere la registrazione',type:'select',value:places[0][0],options:places}]:[]),
  {id:'dev',label:'Ingresso',type:'select',value:settings.deviceId||'',options:inputOptions(await recInputs()),hint:'Cambia ingresso prima di avviare; a registrazione iniziata resta quello scelto.'},
  {id:'earcon',label:'Suono del livello: impulsi che salgono con la voce',type:'checkbox',value:!!prefs.recEarcon}];
 const clearDlgErr=()=>{const x=$('dlgErr');if(x){x.hidden=true;x.textContent=''}};
 const startStop=async(v,pane)=>{clearDlgErr();const b=pane.querySelector('#dlgBtn0');
  if(onStart){if(stopped||starting)return;if(recording){stopAll();b.disabled=true;b.textContent='Fermata';$('recDot').hidden=true;$('recState').textContent=`Registrazione conclusa: ${sayTime(frames/ctx.sampleRate)}${applyGainDb?`, con guadagno ${applyGainDb>0?'+':''}${applyGainDb} dB`:''}. Premi Inserisci la registrazione.`;announce('Registrazione fermata');pane.querySelector('#okDlg').focus();return}
   starting=true;b.textContent='Ferma';$('recState').textContent='Si parte…';await onStart(v.place);if(!starting)return;starting=false;recording=true;$('recDot').hidden=false;$('recState').textContent='Registrazione in corso.';announce('Registrazione avviata');return}
  recording=!recording;b.textContent=recording?'Pausa':'Riprendi';$('recDot').hidden=!recording;$('recState').textContent=recording?'Registrazione in corso.':'Registrazione in pausa: '+sayTime(frames/ctx.sampleRate)+' registrati.';announce(recording?'Registrazione avviata':'Registrazione in pausa')};
 const res=await modal(title,`${intro?`<p>${esc(intro)}</p>`:''}<p>Ingresso: <b id="recDev">${esc(track.label||'predefinito')}</b>, <span id="recNch">${cap.nch===1?'mono':'stereo'}</span>. Prova a parlare: l’indicatore mostra il livello. Con <b>Suono del livello</b> acceso senti degli impulsi che salgono con la voce; con il metronomo acceso tacciono. Premi <b>Avvia</b> per registrare${onStart?' e <b>Ferma</b> per concludere':''}, poi <b>Inserisci la registrazione</b>.</p><div class="rec-time" role="timer" aria-live="off" id="recTime"><span class="rec-dot" id="recDot" hidden></span>0:00,0</div><canvas class="rec-meter" id="recMeter" width="600" height="44" aria-hidden="true"></canvas><p id="recState" role="status">Pronto per registrare.</p><p class="pg-btns"><button type="button" class="btn sm" id="recTest">Prova il livello per tre secondi</button><button type="button" class="btn sm" id="recApply" hidden></button></p>`,fields,'Inserisci la registrazione',{
  buttons:[{label:'Avvia',run:startStop},{label:'Tempo e livello',run:()=>announce(`${recording?'In registrazione':'Fermo'}: ${sayTime(frames/ctx.sampleRate)} registrati. Livello ${levelWords(recentDb())}, picco ${fmtDb(recentDb())}`)}],
  validate:()=>frames>0?null:'Non hai ancora registrato nulla: premi Avvia',onClose:cleanup,
  onOpen:pane=>{const cv=$('recMeter'),t=$('recTime'),cb=$('dlg_earcon'),tb=$('recTest'),ab=$('recApply');if(cb)cb.addEventListener('change',()=>earconSet(cb.checked));if(tb)tb.onclick=testLevel;if(ab)ab.onclick=toggleApply;earconSet(earconOn);const loop=()=>{holdDb=Math.max(toDb(peak),holdDb-.08);drawMeter(cv,toDb(peak),{hold:holdDb});t.lastChild.textContent=fmtTime(frames/ctx.sampleRate,1);raf=requestAnimationFrame(loop)};loop();pane.querySelector('#dlgBtn0').classList.add('primary');
    // Cambio ingresso: solo prima di aver registrato qualcosa; si riapre lo stream e si ricostruisce la cattura.
    const sel=$('dlg_dev'),updateDev=()=>{$('recDev').textContent=track.label||'predefinito';$('recNch').textContent=cap.nch===1?'mono':'stereo';if(sel)sel.value=settings.deviceId||''};
    if(sel)sel.addEventListener('change',async()=>{const id=sel.value;
     if(id===(settings.deviceId||''))return;
     if(recording||starting||frames>0){announce('La registrazione è cominciata: con questo ingresso va avanti; il cambio vale dalla prossima volta');sel.value=settings.deviceId||'';return}
     try{const ns=await recOpen(id);stream.getTracks().forEach(x=>x.stop());stream=ns;track=ns.getAudioTracks()[0];settings=track.getSettings?.()||{};buildCapture();updateDev();
      if(onDevice)onDevice(settings.deviceId||'',track.label||'');else{prefs.recDevice=settings.deviceId||'';savePrefs()};announce(`Ingresso: ${track.label||'predefinito'}, ${cap.nch===1?'mono':'stereo'}`)}
     catch(e){toast('Ingresso non disponibile: '+e.message);sel.value=settings.deviceId||''}})}});
 stopAll();if(!res||!frames)return;
 if(res.earcon!==undefined){prefs.recEarcon=!!res.earcon;savePrefs()}
 // Il cambio di ingresso è già gestito dall'handler del campo: qui non serve ripeterlo, e un res.dev
 // diverso dal dispositivo aperto significherebbe ricordare un ingresso che non ha risposto.
 const out=cap.chunks.map(list=>{const d=new Float32Array(frames);let at=0;for(const c of list){d.set(c.subarray(0,Math.min(c.length,frames-at)),at);at+=c.length;if(at>=frames)break}return d});
 let buffer=makeBuffer(out,ctx.sampleRate);
 if(applyGainDb){
  let max=0;for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++)max=Math.max(max,Math.abs(d[i]))}
  let gain=10**(applyGainDb/20),actual=applyGainDb;
  if(gain>1&&max*gain>0.99){gain=0.99/Math.max(max,1e-9);actual=20*Math.log10(gain)}
  if(gain!==1){for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=gain}}
  announce(actual>0?`Guadagno di +${fmtNum(actual,1)} dB applicato alla registrazione${actual<applyGainDb?', ridotto per non arrivare al fondo scala':''}`:actual<0?`Guadagno di ${fmtNum(actual,1)} dB applicato alla registrazione`:'Il guadagno non si può applicare senza distorcere: la registrazione resta com’è')}
 await onDone(buffer,res.place,{first,inputLatency:Number(settings.latency)||0})}
// Registrazione nel progetto: sulla traccia scelta (o in una nuova) dall'indicatore, ascoltando le altre tracce
// e il metronomo; oppure dentro la regione aperta nell'editor, come un normale inserimento.
async function recordAudio(){if(MIX.playing)mixStop(true);stopPlayback(false);const t=selTrack(),from=P.t,inEditor=!!(A.buf&&A.region),cover=t?P.regions.find(x=>x.track===t.id&&x.start<=from&&regionEnd(x)>from):null;
 if(t?.kind==='bus'){toast('Un bus non registra: scegli una traccia audio');return}
 const punchOn=!!P.punch?.on,playFrom=punchOn?Math.max(0,P.punch.a-punchPre()):from;
 const places=[...(t?[['track',`Nella traccia «${t.name}», da ${fmtTime(from,1)}`]]:[]),...(cover?[['take',`Come nuova take nella regione «${cover.name}»`]]:[]),['newtrack',`In una nuova traccia, da ${fmtTime(from,1)}`],...(inEditor?[...(hasSel()?[['replace','Nell’editor, al posto della selezione della regione']]:[]),['cursor','Nell’editor, al cursore della regione']]:[])];
 let c0=null,glat=0;const hasOthers=P.regions.length>0||P.metro;
 const punchIntro=punchOn?`Punch attivo: entra solo il tratto da ${fmtTime(P.punch.a,1)} a ${fmtTime(P.punch.b,1)}, con ${sayTime(punchPre())} di ascolto prima. Ferma appena dopo il punto A. `:'';
 await recordDialog({title:'Registra',device:t?.input||null,trackName:t?.name,onDevice:t?(id,label)=>pCommit('Ingresso della traccia',()=>{t.input=id?{id,label:label||''}:null}):null,intro:punchIntro+(hasOthers?'Mentre registri senti le altre tracce dall’indicatore in poi: usa le cuffie, così il microfono non le riprende.'+(P.countIn?' Prima di iniziare senti una battuta di conteggio.':''):(P.countIn?'Prima di iniziare senti una battuta di conteggio.':'')),places,
  onStart:async place=>{if(place==='replace'||place==='cursor')return;if(P.countIn)await countIn();if(hasOthers){mixPlay(playFrom,{recording:true,origin:playFrom});c0=MIX.c0;glat=MIX.lat}},
  onStop:()=>{if(MIX.recording)mixStop(false)},
  onDone:async(buf,place,info)=>{
   if(place==='replace'||place==='cursor'){const ins=await conformAudio(buf),[a,b]=place==='replace'?[A.selA,A.selB]:[A.cursor,A.cursor];audioEdit('Registrazione',a,b,ins);announce('Registrazione di '+sayTime(buf.duration)+' inserita nella regione: ora è selezionata');$('wave').focus();return}
   const ctx=actxGet(),lat=P.latency==='auto'?(ctx.outputLatency||0)+(ctx.baseLatency||0)+info.inputLatency+glat:P.latency/1000;let start=playFrom;
   if(c0!==null&&info.first!==null)start=playFrom+(info.first-c0)-lat;if(start<0){const cut=Math.min(buf.length-1,Math.round(-start*buf.sampleRate));buf=makeBuffer(sliceCh(buf,cut,buf.length),buf.sampleRate);start=0}
   if(punchOn&&(place==='track'||place==='newtrack')){const pu=P.punch,cut=punchPart(buf,start,pu);
    if(!cut){toast('Il punch non ha preso audio: controlla i punti e riprova');return}
    const part=cut.part,tr=place==='track'&&t?t:newTrack(P.tracks.length?'Voce '+(P.tracks.length+1):'Voce');
    pCommit('Punch',()=>{if(!P.tracks.includes(tr))P.tracks.push(tr);clearRange(tr.id,pu.a,pu.a+part.duration);
     const r=newRegion(tr.id,addSource(part),pu.a,'Punch '+fmtTime(pu.a,0));P.regions.push(r);P.sel=r.id;P.track=tr.id});
    P.t=pu.a;updateArrangeUI();focusLane(tr.id);announce(`Punch: ${sayTime(part.duration)} nella traccia «${tr.name}», da ${sayTime(pu.a,2)}`);return}
   if(place==='take'){const r=cover&&regionOf(cover.id);if(!r){toast('La regione non c’è più: la registrazione non è stata inserita');return}
    let ta;const before=(r.takes||[]).length;pCommit('Nuova take',()=>{ta=addTakeToRegion(r,buf)});P.track=r.track;P.sel=r.id;focusLane(r.track);
    announce(`Take «${ta.name}» aggiunta alla regione «${r.name}»: ${sayTime(buf.duration)}, ${(before+1)+' take'}`);return}
   const src=addSource(buf);let r,tr;pCommit('Registrazione',()=>{tr=place==='track'&&t?t:null;if(!tr){tr=newTrack(P.tracks.length?'Voce '+(P.tracks.length+1):'Voce');P.tracks.push(tr)}r=newRegion(tr.id,src,start,'Registrazione '+(P.regions.filter(x=>x.track===tr.id).length+1));P.regions.push(r);P.sel=r.id;P.track=tr.id});
   P.t=from;updateArrangeUI();focusLane(tr.id);announce(`Registrazione di ${sayTime(buf.duration)} sulla traccia «${tr.name}», da ${sayTime(r.start,2)}`)}})}
