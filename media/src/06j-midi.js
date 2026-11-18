// Controller MIDI: tastiere, pedali e mixer MIDI comandano il programma come le scorciatoie. Il mapping sta nelle
// preferenze (nota o controllo → comando) e si fa con «Impara»: si preme il tasto e il programma lo registra.
// Niente dati MIDI nei progetti: gli ingressi servono solo a comandare il trasporto, non a registrare suoni.
// Le assegnazioni hanno una mappa per applicazione (Audio e Video), così «Impara» in una non tocca l'altra. I
// controlli continui (fader, pedali) scattano quando salgono a 64 da sotto e si riarmano sotto 32: sono armati di
// default, quindi il primo messaggio che supera 64 scatta — per un pedale che parte abbassato è quello giusto — e
// un fader già sopra non spara comandi a ogni minimo movimento.
const MIDI={access:null,arm:{},last:{},learn:null,lastAt:0,warnedOut:false};
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
function midiEvent(e){const [st,d1,d2]=e.data||[];if(st===undefined)return;const k=st&0xf0;
 // Durante «Impara» ogni nota o controllo diventa la nuova assegnazione, anche con una finestra aperta.
 // Per un controllo si fissa l'armatura sul valore ricevuto: se stavi salendo oltre 64, senza questo il
 // comando scatterebbe subito dopo l'assegnazione.
 if(MIDI.learn){if((k===0x90&&d2>0)||k===0xb0){if(k===0xb0)MIDI.arm[d1]=d2<32;MIDI.learn(midiKey(k===0xb0?'cc':'n',d1))}return}
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
 for(const [k,n] of midiOpen)midiKillNote(k,now);
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
