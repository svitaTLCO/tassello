// Controller MIDI: tastiere, pedali e mixer MIDI comandano il programma come le scorciatoie. Il mapping sta nelle
// preferenze (nota o controllo → comando) e si fa con «Impara»: si preme il tasto e il programma lo registra.
// Niente dati MIDI nei progetti: gli ingressi servono solo a comandare il trasporto, non a registrare suoni.
// Le assegnazioni hanno una mappa per applicazione (Audio e Video), così «Impara» in una non tocca l'altra. I
// controlli continui (fader, pedali) scattano quando salgono a 64 da sotto e si riarmano sotto 32: sono armati di
// default, quindi il primo messaggio che supera 64 scatta — per un pedale che parte abbassato è quello giusto — e
// un fader già sopra non spara comandi a ogni minimo movimento.
const MIDI={access:null,arm:{},last:{},learn:null};
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
