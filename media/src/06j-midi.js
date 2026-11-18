// Controller MIDI: tastiere, pedali e mixer MIDI comandano il programma come le scorciatoie. Il mapping sta nelle
// preferenze (nota o controllo → comando) e si fa con «Impara»: si preme il tasto e il programma lo registra.
// Niente dati MIDI nei progetti: gli ingressi servono solo a comandare il trasporto, non a registrare suoni.
// Le assegnazioni hanno una mappa per applicazione (Audio e Video), così «Impara» in una non tocca l'altra. I
// controlli continui (fader, pedali) scattano quando salgono a 64 da sotto e si riarmano sotto 32: sono armati di
// default, quindi il primo messaggio che supera 64 scatta — per un pedale che parte abbassato è quello giusto — e
// un fader già sopra non spara comandi a ogni minimo movimento.
const MIDI={access:null,arm:{},last:{},learn:null,lastAt:0,warnedOut:false,rec:null,cal:null};
const midiKey=(k,v)=>k==='cc'?`cc${v}`:`nota${v}`;
const midiName=k=>k.startsWith('cc')?`Controllo ${k.slice(2)}`:`Nota ${k.slice(3)}`;
// Comandi mappabili, per applicazione: trasporto, registrazione e traccia scelta.
const MIDI_CMDS={a:['playPause','stop','recordAudio','punchToggle','countInToggle','metronome','cycle','trackMute','trackSolo'],v:['playPause','stop','recordVoice']};
// Migrazione silenziosa del vecchio formato piatto: ogni assegnazione finisce nelle modalità in cui il suo
// comando esiste ancora, così in Video non restano comandi che lì non significano niente.
if(prefs.midi&&!prefs.midi.a){const flat=prefs.midi;prefs.midi={a:{},v:{}};
 for(const [k,id] of Object.entries(flat))for(const m of ['a','v'])if(MIDI_CMDS[m].includes(id))prefs.midi[m][k]=id}
MIDI.map=prefs.midi=prefs.midi||{a:{},v:{}};
const midiMap=()=>MIDI.map[isAudio()?'a':'v']||{};
const midiAny=()=>['a','v'].some(m=>Object.keys(MIDI.map[m]||{}).length);
function midiRun(key){const id=midiMap()[key];if(!id)return;const now=performance.now();if(now-(MIDI.last[id]||0)<250)return;MIDI.last[id]=now;runCommand(id)}
// ——— Ascolto (MIDI thru) e registrazione ———
const midiInputs=()=>MIDI.access?[...MIDI.access.inputs.values()]:[];
// La traccia che ascolta l'ingresso: quella in registrazione, altrimenti l'unica armata e udibile.
const midiThruTrack=()=>MIDI.rec?.track||P.tracks.find(t=>t.kind==='midi'&&t.arm&&audible(t))||null;
// Inoltro immediato (timestamp 0): la nota esce subito sul sintetizzatore della traccia. Il note off va dove è
// andato il note on (per altezza), così cambiando traccia armata o fermando la registrazione con un tasto premuto
// la nota si spegne sul synth giusto, non su quello nuovo.
const midiThruOpen=new Map();
function midiThru(track,on,p,v){if(on){const port=midiOutputFor(track);if(!port)return;const ch=clamp((track.midiCh||1)-1,0,15);
  midiNoteOn(port,ch,p,v,0,track.id);midiThruOpen.set(p,{port,ch});return}
 const o=midiThruOpen.get(p);midiThruOpen.delete(p);
 if(o){midiNoteOff(o.port,o.ch,p,0);return}
 const port=midiOutputFor(track);if(port)midiNoteOff(port,clamp((track.midiCh||1)-1,0,15),p,0)}
// I controlli che una tastiera ha sempre: pedale, modulazione e pitch bend si inoltrano anche loro, altrimenti chi
// suona col pedale sente note corte mentre nella regione finiscono lunghe. Il canale entra in midiUsed, così panic
// e CC121 coprono anche un pedale rimasto giù senza note.
function midiThruCC(track,cc,val){const port=midiOutputFor(track);if(!port)return;const ch=clamp((track.midiCh||1)-1,0,15);
 midiUsed.add(port.id+'|'+ch);midiSend(port,[0xB0|ch,cc,val],0)}
function midiThruBend(track,lsb,msb){const port=midiOutputFor(track);if(!port)return;const ch=clamp((track.midiCh||1)-1,0,15);
 midiUsed.add(port.id+'|'+ch);midiSend(port,[0xE0|ch,lsb,msb],0)}
// Tempo di un messaggio in secondi del brano: timeStamp → contesto con la base fissata al via, poi il tempo del
// brano con la passata. La base di getOutputTimestamp mappa già l'istante che si sta sentendo, quindi la latenza di
// uscita audio è compresa e NON si sottrae: sottrarla sarebbe contarla due volte.
const midiRecTime=e=>{const r=MIDI.rec,comp=(Number(prefs.midiComp)||0)/1000;return r.a+((Number(e.timeStamp)-r.k)/1000-r.w)-comp};
function midiRecOn(e,p,v){const r=MIDI.rec;if(!r)return;
 // Limite della validazione: a 2000 note la registrazione si ferma e lo dice, invece di perdere note in silenzio.
 if(r.notes.length>=2000){if(!r.full){r.full=true;announce('Limite di 2000 note raggiunto: la registrazione MIDI si ferma');mixStop(true)}return}
 const t=midiRecTime(e);if(!Number.isFinite(t))return;
 const prev=r.open.get(p);if(prev)midiRecOff(r,prev,t);r.open.set(p,{p,v,start:t,end:null})}
function midiRecOff(r,n,t){if(!r.open.has(n.p))return;r.open.delete(n.p);
 // Col pedale di risonanza giù la nota non finisce al rilascio: si chiude quando il pedale si alza.
 if(r.pedal){n.end=null;r.sustained.push(n)}else{n.end=t;r.notes.push(n)}}
function midiRecPedal(e,down){const r=MIDI.rec;if(!r)return;r.pedal=down;
 if(!down){const t=midiRecTime(e);for(const n of r.sustained){n.end=t;r.notes.push(n)}r.sustained=[]}}
function midiEvent(e){const [st,d1,d2]=e.data||[];if(st===undefined)return;const k=st&0xf0;
 // Durante «Impara» ogni nota o controllo diventa la nuova assegnazione, anche con una finestra aperta.
 // Per un controllo si fissa l'armatura sul valore ricevuto: se stavi salendo oltre 64, senza questo il
 // comando scatterebbe subito dopo l'assegnazione.
 if(MIDI.learn){if((k===0x90&&d2>0)||k===0xb0){if(k===0xb0)MIDI.arm[d1]=d2<32;MIDI.learn(midiKey(k===0xb0?'cc':'n',d1))}return}
 // Calibrazione: si prendono solo i note on grezzi (nessuna compensazione: si misura il valore assoluto).
 if(MIDI.cal){if(k===0x90&&d2>0)MIDI.cal.notes.push((Number(e.timeStamp)-MIDI.cal.k)/1000);return}
 const thru=midiThruTrack(),rec=MIDI.rec;
 if((k===0x90&&d2>0)||k===0x80||(k===0x90&&d2===0)){
  const on=k===0x90&&d2>0;
  if(thru)midiThru(thru,on,d1,on?d2:0);
  if(rec){if(on)midiRecOn(e,d1,d2);else{const n=rec.open.get(d1);if(n)midiRecOff(rec,n,midiRecTime(e))}}
  // Con una traccia armata o in registrazione le note suonano e non comandano il programma.
  if(thru||rec)return}
 // Pedale di risonanza e modulazione: si catturano (il pedale) e si inoltrano, e non comandano il programma.
 if(k===0xb0&&(d1===64||d1===1)&&(thru||rec)){if(rec&&d1===64)midiRecPedal(e,d2>=64);if(thru)midiThruCC(thru,d1,d2);return}
 if(k===0xe0&&thru){midiThruBend(thru,d1,d2);return}
 if(overlayOpen())return;
 if(k===0x90&&d2>0)midiRun(midiKey('n',d1));
 else if(k===0xb0){if(!(d1 in MIDI.arm))MIDI.arm[d1]=true;
  if(MIDI.arm[d1]&&d2>=64){MIDI.arm[d1]=false;midiRun(midiKey('cc',d1))}
  else if(!MIDI.arm[d1]&&d2<32)MIDI.arm[d1]=true}}
// Accesso MIDI: lo si chiede al primo uso (o all'avvio, se ci sono già assegnazioni); dopo la prima concessione
// il browser ricorda il permesso. Con quiet niente messaggi se il permesso manca: all'avvio non deve sembrare
// un errore, lo si chiede di nuovo al primo uso del pannello.
async function midiStart({quiet=false}={}){if(!navigator.requestMIDIAccess){if(!quiet)toast('Questo browser non gestisce il MIDI');return false}
 if(MIDI.access)return true;
 try{MIDI.access=await navigator.requestMIDIAccess()}catch(e){if(!quiet)toast('Permesso MIDI negato: consenti l’accesso agli strumenti MIDI per usare il controller');return false}
 for(const i of MIDI.access.inputs.values())i.onmidimessage=midiEvent;
 MIDI.access.addEventListener?.('statechange',e=>{if(!MIDI.access)return;for(const i of MIDI.access.inputs.values())i.onmidimessage=midiEvent;
  if(e.port?.type==='input')announce(e.port.state==='connected'?`MIDI collegato: ${e.port.name||'dispositivo'}`:`MIDI scollegato: ${e.port.name||'dispositivo'}`)});
 const names=[...MIDI.access.inputs.values()].map(i=>i.name).filter(Boolean);
 if(names.length)announce(`MIDI attivo: ${names.join(', ')}`);
 return true}
// Pannello di assegnazione: si sceglie il comando, «Impara» aspetta un messaggio dallo strumento, «Togli» lo
// elimina. I messaggi che arrivano mentre si impara valgono anche con la finestra aperta.
async function midiPanel(){if(!await midiStart())return;const map=midiMap(),cmds=MIDI_CMDS[isAudio()?'a':'v'].map(id=>[id,C[id]?.label||id]);
 const list=()=>{const ms=Object.entries(map).filter(([k,id])=>cmds.some(([cid])=>cid===id));return ms.length?`<ul>${ms.map(([k,id])=>`<li>${esc(C[id]?.label||id)}: ${esc(midiName(k))}</li>`).join('')}</ul>`:'<p>Nessun comando assegnato: scegli un comando e premi Impara.</p>'};
 let timer=0;
 const res=await modal('Controller MIDI','<p>Tasti e pedali dello strumento MIDI comandano il programma. L’assegnazione resta nelle preferenze e vale anche alla prossima apertura.</p><div id="midiList">'+list()+'</div>',[{id:'cmd',label:'Comando',type:'select',value:cmds[0][0],options:cmds}],'Chiudi',{
  buttons:[{label:'Impara',run:v=>{const id=v.cmd;announce('Premi un tasto o muovi un controllo sullo strumento MIDI');clearTimeout(timer);
    let done=false;MIDI.learn=key=>{if(done)return;done=true;MIDI.learn=null;clearTimeout(timer);
     for(const [k,x] of Object.entries(map))if(x===id)delete map[k];map[key]=id;savePrefs();
     $('midiList').innerHTML=list();announce(`${C[id]?.label||id} assegnato a ${midiName(key)}`)};
    timer=setTimeout(()=>{if(MIDI.learn){MIDI.learn=null;announce('Nessun messaggio arrivato: premi Impara e riprova')}},15000)}},
   {label:'Togli',run:v=>{let n=0;for(const [k,id] of Object.entries(map))if(id===v.cmd){delete map[k];n++}
    if(!n){toast('Questo comando non ha assegnazioni');return}savePrefs();$('midiList').innerHTML=list();announce('Assegnazione tolta')}}]});
 clearTimeout(timer);MIDI.learn=null;if(!res)return}
// Uscite MIDI: le tracce MIDI mandano le note a un sintetizzatore esterno. La porta scelta si ritrova per id e, se
// l'id non c'è più su questa macchina, per nome (gli id cambiano tra origini del browser e computer); senza scelta
// si usa la prima uscita disponibile.
const midiOutputs=()=>MIDI.access?[...MIDI.access.outputs.values()]:[];
function midiOutputFor(t){const outs=midiOutputs();if(!outs.length)return null;const o=t?.midiOut;
 if(o?.id){const p=outs.find(x=>x.id===o.id);if(p)return p}
 if(o?.name){const p=outs.find(x=>x.name===o.name);if(p)return p}
 return outs[0]}
// Le note aperte: si registra ogni note on mandato e si toglie al note off corrispondente. Al fermo si spengono
// quelle rimaste, poi si mandano CC123 (tutte le note off) e CC121 (ripristino dei controlli) su ogni canale usato:
// molti sintetizzatori ignorano o trattano male CC123, e un registro delle note aperte costa poco.
// Il registro delle note aperte tiene anche l'istante in cui il note on è stato accodato (può essere nel futuro,
// fino a 100 ms) e la traccia: il note off del panic va dopo quel note on, altrimenti la nota partirebbe dopo
// l'off e resterebbe bloccata.
const midiOpen=new Map(),midiUsed=new Set();
function midiSend(port,data,at){try{port.send(data,at);if(at>MIDI.lastAt)MIDI.lastAt=at}catch(e){}}
function midiNoteOn(port,ch,p,v,at,tid){if(!port)return;midiSend(port,[0x90|ch,p,v],at);midiOpen.set(port.id+'|'+ch+'|'+p,{port,ch,p,at,tid});midiUsed.add(port.id+'|'+ch)}
function midiNoteOff(port,ch,p,at){if(!port)return;midiSend(port,[0x80|ch,p,0],at);midiOpen.delete(port.id+'|'+ch+'|'+p)}
function midiProgram(port,ch,prog,at){if(port&&prog!=null)midiSend(port,[0xC0|ch,prog],at)}
// Spegne subito una nota aperta (muto, solo, traccia o regione cambiata durante l'ascolto): il taglio è piccolo,
// una nota bloccata no. Il note off va comunque dopo il note on accodato.
function midiKillNote(key,now=performance.now()){const n=midiOpen.get(key);if(!n)return;
 midiSend(n.port,[0x80|n.ch,n.p,0],Math.max(now,(n.at||0)+1));midiOpen.delete(key)}
function midiKillTrack(tid){const now=performance.now();for(const [k,n] of midiOpen)if(n.tid===tid)midiKillNote(k,now)}
function midiKillInaudible(){const now=performance.now(),byId=new Map(P.tracks.map(t=>[t.id,t]));
 for(const [k,n] of midiOpen){const t=byId.get(n.tid);if(!t||!audible(t))midiKillNote(k,now)}}
function midiPanic(){const now=performance.now();
 for(const [k,n] of midiOpen)midiKillNote(k,now);midiThruOpen.clear();
 // CC123/121 solo sui canali che hanno davvero suonato, e dopo l'ultima nota accodata (lastAt): una traccia muta
 // non ha aperto nulla e non va disturbata.
 const ccAt=Math.max(now,(MIDI.lastAt||0)+1);
 for(const k of midiUsed){const [id,ch]=k.split('|'),port=midiOutputs().find(x=>x.id===id);
  if(port){midiSend(port,[0xB0|(+ch),123,0],ccAt);midiSend(port,[0xB0|(+ch),121,0],ccAt)}}
 midiUsed.clear();MIDI.lastAt=0}
// Le tracce MIDI non finiscono nel mix esportato: il suono arriva dal sintetizzatore, non dal browser. L'esportazione
// lo dice, così nessuno cerca nel file un suono che non c'è.
const midiAudible=()=>P.tracks.filter(t=>t.kind==='midi'&&audible(t)&&P.regions.some(r=>r.track===t.id&&r.kind==='midi'));
function midiExportNote(){const n=midiAudible().length;if(n)announce(`Attenzione: ${n===1?'una traccia MIDI non suona':'le tracce MIDI non suonano'} nel file esportato, il suono arriva dal sintetizzatore esterno`)}

// ——— Orologio MIDI ———
// Orologio verso un altro strumento: 24 colpi per semiminima, Start da zero, Continue + Song Position Pointer da un
// punto interno, Stop al fermo e al salto del ciclo. L'impostazione è globale (dipende dal dispositivo).
async function midiClockDialog(){await midiStart({quiet:true}).catch(()=>false);const outs=midiOutputs(),cur=prefs.midiClockOut;
 const sel=outs.find(o=>o.id===cur?.id)||outs.find(o=>cur?.name&&o.name===cur.name)||null;
 const v=await modal('Orologio MIDI',`<p>Manda l’orologio a un altro strumento (drum machine, sequencer, sintetizzatore con arpeggiatore): 24 colpi per semiminima, Start, Continue e Song Position Pointer, Stop al fermo e al salto del ciclo. Serve un’uscita MIDI; le note possono usare la stessa porta o un’altra.</p>${outs.length?'':'<p>Nessuna uscita MIDI trovata.</p>'}`,
  [{id:'on',label:'Manda l’orologio durante l’ascolto e la registrazione',type:'checkbox',value:!!prefs.midiClock},
   {id:'out',label:'Uscita dell’orologio',type:'select',value:sel?.id||'',options:[['','Prima uscita disponibile'],...outs.map(o=>[o.id,o.name||o.id])],hint:'Si ritrova per id e, se l’id cambia, per nome.'}],'Salva');
 if(!v)return;const out=outs.find(o=>o.id===v.out)||null;
 prefs.midiClock=!!v.on;prefs.midiClockOut=out?{id:out.id,name:out.name||''}:null;savePrefs();
 announce(`Orologio MIDI ${prefs.midiClock?'attivo':'spento'}${prefs.midiClock&&out?` su ${out.name||out.id}`:''}${MIX.playing?' (vale dal prossimo ascolto)':''}`)}
// ——— Calibrazione dell'ingresso MIDI ———
const midiMedian=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
async function midiMeasure(){const ctx=actxGet();try{await ctx.resume()}catch(e){}
 const beat=60/90,lead=2,n=8,base=midiStampBase(),t0=ctx.currentTime+0.2,total=(lead+n)*beat;
 MIDI.cal={notes:[],k:base,t0,beat,lead,n};
 for(let k=0;k<lead+n;k++)clickAt(ctx,mixOut(),t0+k*beat,k%4===0);
 announce('Calibrazione: due battute di avvio, poi suona otto note a tempo');
 await new Promise(r=>setTimeout(r,(total+0.25)*1000));
 const notes=MIDI.cal.notes.slice();MIDI.cal=null;
 const offs=[];for(const ct of notes){const rel=(ct-t0)/beat,k=Math.round(rel);
  if(k<lead-0.5||k>lead+n-0.5)continue;if(Math.abs(ct-(t0+k*beat))>beat/2)continue;offs.push((ct-(t0+k*beat))*1000)}
 if(offs.length<4)return{ok:false,reason:`Solo ${offs.length} note valide su ${notes.length}: servono almeno quattro note a tempo.`,count:offs.length};
 const med=midiMedian(offs),dev=offs.map(x=>Math.abs(x-med)),mad=midiMedian(dev);
 if(mad>25)return{ok:false,reason:`Le note sono troppo irregolari per una misura affidabile (scarto ${Math.round(mad)} ms): riprova.`,count:offs.length,mad};
 const ms=Math.round(clamp(med,-200,200));
 return{ok:true,ms,raw:Math.round(med),mad:Math.round(mad),count:offs.length,notes:notes.length,audioLatency:Math.round((ctx.outputLatency||ctx.baseLatency||0)*1000)};
}
async function midiCalibrateDialog(){if(MIDI.cal){toast('La calibrazione è già in corso');return}
 const ok=await midiStart({quiet:true}).catch(()=>false);
 if(!ok||!midiInputs().length){announce('Nessun ingresso MIDI: collega una tastiera e riprova');return}
 for(;;){const cur=Number(prefs.midiComp)||0,prev=Number(prefs.midiCompPrev)||0;
  const go=await modal('Calibra l’ingresso MIDI',`<p>Suona otto note a tempo con il metronomo (90 BPM, due battute di avvio). Si misura lo scarto medio tra quando premi e il tempo più vicino; il valore si applica solo alle registrazioni MIDI, anticipandole. La latenza audio dichiarata dal browser è solo un’informazione e non entra nel calcolo.</p><p>Compensazione attuale: ${cur} ms${prev!==cur?` (precedente ${prev} ms)`:''}.</p>`,[],
   'Misura',{buttons:[{label:'Torna a zero',run:(v,pane,finish)=>{const before=Number(prefs.midiComp)||0;prefs.midiCompPrev=before;prefs.midiComp=0;savePrefs();announce(`Compensazione MIDI tornata a zero (prima ${before} ms)`);finish(null)}},{label:'Annulla',run:(v,pane,finish)=>finish(null)}]});
  if(!go)return;
  const res=await midiMeasure();
  if(!res.ok){const again=await modal('Calibrazione non riuscita',`<p>${esc(res.reason)}</p>`,[],'Chiudi',{buttons:[{label:'Riprova',run:(v,pane,finish)=>finish({retry:true})}]});
   if(again?.retry)continue;return}
  const v=await modal('Calibrazione MIDI',`<p>Compensazione proposta: <b>${res.ms} ms</b>. Misura grezza ${res.raw} ms su ${res.count} note (scarto ${res.mad} ms). Latenza audio dichiarata: ${res.audioLatency} ms, solo informazione. Il valore è assoluto: sostituisce quello attuale (${Number(prefs.midiComp)||0} ms).</p>`,[],
   'Applica',{buttons:[{label:'Riprova',run:(v2,pane,finish)=>finish({retry:true})},{label:'Torna a zero',run:(v2,pane,finish)=>{const before=Number(prefs.midiComp)||0;prefs.midiCompPrev=before;prefs.midiComp=0;savePrefs();announce(`Compensazione MIDI tornata a zero (prima ${before} ms)`);finish(null)}}]});
  if(v?.retry)continue;
  if(v){const before=Number(prefs.midiComp)||0;prefs.midiCompPrev=before;prefs.midiComp=res.ms;savePrefs();announce(`Compensazione MIDI: ${res.ms} ms (prima ${before} ms)`)}
  return}}
