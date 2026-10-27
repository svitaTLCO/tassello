// Registrazione dal microfono. La finestra mostra l'indicatore di livello già prima di iniziare; durante la
// registrazione avvisa a voce se il livello è troppo alto (distorsione) o troppo basso. L'audio resta sul dispositivo.
// Con onStart la registrazione parte insieme a qualcos'altro (l'ascolto delle altre tracce, il conteggio): Avvia
// la fa partire e Ferma la conclude, senza pause. info.first è l'istante del contesto audio del primo campione.
async function recordDialog({title='Registra dal microfono',intro='',places=null,onStart=null,onStop=null,onDone}){
 if(!navigator.mediaDevices?.getUserMedia){toast('Questo browser non permette di usare il microfono');return}
 let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}catch(e){toast(e.name==='NotAllowedError'?'Il permesso per il microfono è stato negato: consentilo nelle impostazioni del sito e riprova':'Microfono non disponibile: '+e.message);return}
 const ctx=actxGet(),track=stream.getAudioTracks()[0],settings=track.getSettings?.()||{},nch=clamp(settings.channelCount||1,1,2),src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,nch,nch),chunks=Array.from({length:nch},()=>[]);
 let recording=false,starting=false,stopped=false,frames=0,first=null,peak=0,recent=[],lastWarn=0,lowWarned=false,raf=0;
 proc.onaudioprocess=e=>{const ib=e.inputBuffer;let pk=0;for(let c=0;c<nch;c++){const d=ib.getChannelData(Math.min(c,ib.numberOfChannels-1));for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>pk)pk=v}if(recording)chunks[c].push(d.slice())}for(let c=0;c<e.outputBuffer.numberOfChannels;c++)e.outputBuffer.getChannelData(c).fill(0);
  if(recording){if(first===null)first=ctx.currentTime-ib.length/ctx.sampleRate;frames+=ib.length}peak=Math.max(pk,peak*0.85);recent.push(pk);if(recent.length>Math.ceil(ctx.sampleRate*1.5/4096))recent.shift();
  if(recording){const now=performance.now();if(pk>=0.99&&now-lastWarn>4000){lastWarn=now;announce('Livello troppo alto: allontanati dal microfono o abbassane il volume')}if(!lowWarned&&frames>ctx.sampleRate*3&&Math.max(...recent)<0.01){lowWarned=true;announce('Livello molto basso: avvicinati al microfono')}}};
 src.connect(proc);proc.connect(ctx.destination);
 const stopAll=()=>{if(recording||starting){recording=false;starting=false;stopped=true;onStop?.()}};
 const cleanup=()=>{stopAll();cancelAnimationFrame(raf);proc.onaudioprocess=null;try{src.disconnect();proc.disconnect()}catch(e){}stream.getTracks().forEach(t=>t.stop())};
 const recentDb=()=>toDb(Math.max(0,...recent));
 const fields=places?[{id:'place',label:'Dove mettere la registrazione',type:'select',value:places[0][0],options:places}]:[];
 const startStop=async(v,pane)=>{const b=pane.querySelector('#dlgBtn0');
  if(onStart){if(stopped||starting)return;if(recording){stopAll();b.disabled=true;b.textContent='Fermata';$('recDot').hidden=true;$('recState').textContent=`Registrazione conclusa: ${sayTime(frames/ctx.sampleRate)}. Premi Inserisci la registrazione.`;announce('Registrazione fermata');pane.querySelector('#okDlg').focus();return}
   starting=true;b.textContent='Ferma';$('recState').textContent='Si parte…';await onStart(v.place);if(!starting)return;starting=false;recording=true;$('recDot').hidden=false;$('recState').textContent='Registrazione in corso.';announce('Registrazione avviata');return}
  recording=!recording;b.textContent=recording?'Pausa':'Riprendi';$('recDot').hidden=!recording;$('recState').textContent=recording?'Registrazione in corso.':'Registrazione in pausa: '+sayTime(frames/ctx.sampleRate)+' registrati.';announce(recording?'Registrazione avviata':'Registrazione in pausa')};
 const res=await modal(title,`${intro?`<p>${esc(intro)}</p>`:''}<p>Microfono: <b>${esc(track.label||'predefinito')}</b>, ${nch===1?'mono':'stereo'}. Prova a parlare: l’indicatore mostra il livello. Premi <b>Avvia</b> per registrare${onStart?' e <b>Ferma</b> per concludere':''}, poi <b>Inserisci la registrazione</b>.</p><div class="rec-time" role="timer" aria-live="off" id="recTime"><span class="rec-dot" id="recDot" hidden></span>0:00,0</div><canvas class="rec-meter" id="recMeter" width="600" height="44" aria-hidden="true"></canvas><p id="recState" role="status">Pronto per registrare.</p>`,fields,'Inserisci la registrazione',{
  buttons:[{label:'Avvia',run:startStop},{label:'Tempo e livello',run:()=>announce(`${recording?'In registrazione':'Fermo'}: ${sayTime(frames/ctx.sampleRate)} registrati. Livello ${levelWords(recentDb())}, picco ${fmtDb(recentDb())}`)}],
  validate:()=>frames>0?null:'Non hai ancora registrato nulla: premi Avvia',onClose:cleanup,
  onOpen:pane=>{const cv=$('recMeter'),t=$('recTime');const loop=()=>{drawMeter(cv,toDb(peak));t.lastChild.textContent=fmtTime(frames/ctx.sampleRate,1);raf=requestAnimationFrame(loop)};loop();pane.querySelector('#dlgBtn0').classList.add('primary')}});
 stopAll();if(!res||!frames)return;
 const out=chunks.map(list=>{const d=new Float32Array(frames);let at=0;for(const c of list){d.set(c.subarray(0,Math.min(c.length,frames-at)),at);at+=c.length;if(at>=frames)break}return d});
 await onDone(makeBuffer(out,ctx.sampleRate),res.place,{first,inputLatency:Number(settings.latency)||0})}
// Registrazione nel progetto: sulla traccia scelta (o in una nuova) dall'indicatore, ascoltando le altre tracce
// e il metronomo; oppure dentro la regione aperta nell'editor, come un normale inserimento.
async function recordAudio(){if(MIX.playing)mixStop(true);stopPlayback(false);const t=selTrack(),from=P.t,inEditor=!!(A.buf&&A.region);
 const places=[...(t?[['track',`Nella traccia «${t.name}», da ${fmtTime(from,1)}`]]:[]),['newtrack',`In una nuova traccia, da ${fmtTime(from,1)}`],...(inEditor?[...(hasSel()?[['replace','Nell’editor, al posto della selezione della regione']]:[]),['cursor','Nell’editor, al cursore della regione']]:[])];
 let c0=null;const hasOthers=P.regions.length>0||P.metro;
 await recordDialog({title:'Registra',intro:hasOthers?'Mentre registri senti le altre tracce dall’indicatore in poi: usa le cuffie, così il microfono non le riprende.'+(P.countIn?' Prima di iniziare senti una battuta di conteggio.':''):(P.countIn?'Prima di iniziare senti una battuta di conteggio.':''),places,
  onStart:async place=>{if(place==='replace'||place==='cursor')return;if(P.countIn)await countIn();if(hasOthers){mixPlay(from,{recording:true,origin:from});c0=MIX.c0}},
  onStop:()=>{if(MIX.recording)mixStop(false)},
  onDone:async(buf,place,info)=>{
   if(place==='replace'||place==='cursor'){const ins=await conformAudio(buf),[a,b]=place==='replace'?[A.selA,A.selB]:[A.cursor,A.cursor];audioEdit('Registrazione',a,b,ins);announce('Registrazione di '+sayTime(buf.duration)+' inserita nella regione: ora è selezionata');$('wave').focus();return}
   const ctx=actxGet(),lat=P.latency==='auto'?(ctx.outputLatency||0)+(ctx.baseLatency||0)+info.inputLatency:P.latency/1000;let start=from;
   if(c0!==null&&info.first!==null)start=from+(info.first-c0)-lat;if(start<0){const cut=Math.min(buf.length-1,Math.round(-start*buf.sampleRate));buf=makeBuffer(sliceCh(buf,cut,buf.length),buf.sampleRate);start=0}
   const src=addSource(buf);let r,tr;pCommit('Registrazione',()=>{tr=place==='track'&&t?t:null;if(!tr){tr=newTrack(P.tracks.length?'Voce '+(P.tracks.length+1):'Voce');P.tracks.push(tr)}r=newRegion(tr.id,src,start,'Registrazione '+(P.regions.filter(x=>x.track===tr.id).length+1));P.regions.push(r);P.sel=r.id;P.track=tr.id});
   P.t=from;updateArrangeUI();focusLane(tr.id);announce(`Registrazione di ${sayTime(buf.duration)} sulla traccia «${tr.name}», da ${sayTime(r.start,2)}`)}})}
