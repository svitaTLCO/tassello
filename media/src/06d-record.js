// Registrazione dal microfono. La finestra mostra l'indicatore di livello già prima di iniziare; durante la
// registrazione avvisa a voce se il livello è troppo alto (distorsione) o troppo basso. L'audio resta sul dispositivo.
async function recordDialog({title='Registra dal microfono',intro='',places=null,onDone}){
 if(!navigator.mediaDevices?.getUserMedia){toast('Questo browser non permette di usare il microfono');return}
 let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}})}catch(e){toast(e.name==='NotAllowedError'?'Il permesso per il microfono è stato negato: consentilo nelle impostazioni del sito e riprova':'Microfono non disponibile: '+e.message);return}
 const ctx=actxGet(),track=stream.getAudioTracks()[0],nch=clamp(track.getSettings?.().channelCount||1,1,2),src=ctx.createMediaStreamSource(stream),proc=ctx.createScriptProcessor(4096,nch,nch),chunks=Array.from({length:nch},()=>[]);
 let recording=false,frames=0,peak=0,recent=[],lastWarn=0,lowWarned=false,raf=0;
 proc.onaudioprocess=e=>{const ib=e.inputBuffer;let pk=0;for(let c=0;c<nch;c++){const d=ib.getChannelData(Math.min(c,ib.numberOfChannels-1));for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>pk)pk=v}if(recording)chunks[c].push(d.slice())}for(let c=0;c<e.outputBuffer.numberOfChannels;c++)e.outputBuffer.getChannelData(c).fill(0);
  if(recording)frames+=ib.length;peak=Math.max(pk,peak*0.85);recent.push(pk);if(recent.length>Math.ceil(ctx.sampleRate*1.5/4096))recent.shift();
  if(recording){const now=performance.now();if(pk>=0.99&&now-lastWarn>4000){lastWarn=now;announce('Livello troppo alto: allontanati dal microfono o abbassane il volume')}if(!lowWarned&&frames>ctx.sampleRate*3&&Math.max(...recent)<0.01){lowWarned=true;announce('Livello molto basso: avvicinati al microfono')}}};
 src.connect(proc);proc.connect(ctx.destination);
 const cleanup=()=>{cancelAnimationFrame(raf);proc.onaudioprocess=null;try{src.disconnect();proc.disconnect()}catch(e){}stream.getTracks().forEach(t=>t.stop())};
 const recentDb=()=>toDb(Math.max(0,...recent));
 const fields=places?[{id:'place',label:'Dove mettere la registrazione',type:'select',value:places[0][0],options:places}]:[];
 const res=await modal(title,`${intro?`<p>${esc(intro)}</p>`:''}<p>Microfono: <b>${esc(track.label||'predefinito')}</b>, ${nch===1?'mono':'stereo'}. Prova a parlare: l’indicatore mostra il livello. Premi <b>Avvia</b> per registrare, poi <b>Inserisci la registrazione</b>.</p><div class="rec-time" role="timer" aria-live="off" id="recTime"><span class="rec-dot" id="recDot" hidden></span>0:00,0</div><canvas class="rec-meter" id="recMeter" width="600" height="44" aria-hidden="true"></canvas><p id="recState" role="status">Pronto per registrare.</p>`,fields,'Inserisci la registrazione',{
  buttons:[{label:'Avvia',run:(v,pane)=>{const b=pane.querySelector('#dlgBtn0');recording=!recording;b.textContent=recording?'Pausa':'Riprendi';$('recDot').hidden=!recording;$('recState').textContent=recording?'Registrazione in corso.':'Registrazione in pausa: '+sayTime(frames/ctx.sampleRate)+' registrati.';announce(recording?'Registrazione avviata':'Registrazione in pausa')}},
   {label:'Tempo e livello',run:()=>announce(`${recording?'In registrazione':'Fermo'}: ${sayTime(frames/ctx.sampleRate)} registrati. Livello ${levelWords(recentDb())}, picco ${fmtDb(recentDb())}`)}],
  validate:()=>frames>0?null:'Non hai ancora registrato nulla: premi Avvia',onClose:cleanup,
  onOpen:pane=>{const cv=$('recMeter'),t=$('recTime');const loop=()=>{drawMeter(cv,toDb(peak));t.lastChild.textContent=fmtTime(frames/ctx.sampleRate,1);raf=requestAnimationFrame(loop)};loop();pane.querySelector('#dlgBtn0').classList.add('primary')}});
 if(!res||!frames)return;
 const out=chunks.map(list=>{const d=new Float32Array(frames);let at=0;for(const c of list){d.set(c.subarray(0,Math.min(c.length,frames-at)),at);at+=c.length;if(at>=frames)break}return d});
 await onDone(makeBuffer(out,ctx.sampleRate),res.place)}
async function recordAudio(){const places=A.buf?[...(hasSel()?[['replace','Al posto della selezione']]:[]),['cursor','Al cursore, a '+fmtTime(sec(A.cursor),1)],['end','Alla fine dell’audio'],['new','In un nuovo audio']]:null;
 await recordDialog({places,onDone:async(buf,place)=>{if(!A.buf||place==='new'){if(place==='new'&&audioModified()&&!(await confirmAction('L’audio aperto ha modifiche non esportate. Se crei un nuovo audio le perdi: vuoi continuare?','Nuovo audio')))return;setAudioDoc(buf,{title:A.buf?'Registrazione':A.title,markers:[]});A.selA=0;A.selB=0;audioMetaChanged();announce('Registrazione di '+sayTime(buf.duration)+' pronta')}
  else{const ins=await conformAudio(buf),[a,b]=place==='replace'?[A.selA,A.selB]:place==='end'?[alen(),alen()]:[A.cursor,A.cursor];audioEdit('Registrazione',a,b,ins);announce('Registrazione di '+sayTime(buf.duration)+' inserita: ora è selezionata')}
  $('wave').focus()}})}
