// Registro unico dei comandi: barra multifunzione, ricerca comandi, menu, scorciatoie e guida leggono da qui.
// modes: 'a' Audio, 'v' Video, 'av' entrambe. g: la scorciatoia vale anche dentro i campi di testo.
// ctx: la scorciatoia vale solo con il focus in quell'area (wave, list, timeline).
const C={};
function def(modes,cat,list){for(const [id,label,icon,keys,extra] of list)C[id]={id,label,icon,keys:keys||'',modes,cat,...(extra||{})}}
const isAudio=()=>state.mode==='audio';
def('av','File',[
 ['new','Nuovo','new','Ctrl+Alt+N',{g:1,short:'Nuovo'}],
 ['open','Apri file','open','Ctrl+O',{g:1,short:'Apri'}],
 ['filePanel','Apri il menu File','file','',{}]]);
def('a','File',[
 ['saveAudio','Esporta il brano o la regione (WAV, M4A o WebM)','save','Ctrl+S',{g:1,short:'Esporta'}],
 ['saveAudioProject','Salva il progetto (ZIP con le tracce e i suoni)','backup','Ctrl+Maiusc+S',{g:1,short:'Salva progetto'}],
 ['exportStems','Esporta ogni traccia in un file separato (ZIP)','export','',{short:'Tracce separate'}],
 ['exportParts','Esporta le parti tra i marcatori','export','',{short:'Esporta le parti'}],
 ['exportLabels','Esporta i marcatori come testo','export','',{short:'Esporta marcatori'}],
 ['importLabels','Importa marcatori da un file di testo','import','',{short:'Importa marcatori'}],
 ['insertFile','Inserisci un file audio al cursore della regione','import','',{short:'Inserisci file'}]]);
def('a','Tracce',[
 ['newTrack','Nuova traccia vuota','plus','Alt+Maiusc+N',{short:'Nuova traccia'}],
 ['importTrack','Importa file audio, ognuno in una nuova traccia','import','Ctrl+I',{g:1,short:'Importa audio'}],
 ['trackSettings','Suono della traccia: volume, bilanciamento, bassi, alti, compressione e riverbero…','eq','',{short:'Suono della traccia'}],
 ['trackMute','Muto della traccia scelta','mute','',{short:'Muto',toggle:()=>!!selTrack()?.mute}],
 ['trackSolo','Solo della traccia scelta','speak','',{short:'Solo',toggle:()=>!!selTrack()?.solo}],
 ['trackRename','Rinomina la traccia scelta','rename','',{short:'Rinomina'}],
 ['trackDuplicate','Duplica la traccia scelta con le sue regioni','duplicate','',{short:'Duplica traccia'}],
 ['trackDelete','Elimina la traccia scelta','trash','',{short:'Elimina traccia'}],
 ['trackUp','Sposta la traccia in su','up','',{short:'Su'}],
 ['trackDown','Sposta la traccia in giù','down','',{short:'Giù'}],
 ['regionEdit','Apri la regione nell’editor','wave','',{short:'Modifica regione'}],
 ['regionProps','Proprietà della regione: nome, traccia, inizio, guadagno, dissolvenze…','gear','',{short:'Proprietà'}],
 ['regionSplit','Dividi la regione all’indicatore','split','Ctrl+K',{short:'Dividi'}],
 ['regionDuplicate','Duplica la regione subito dopo','duplicate','Ctrl+D',{ctx:'lane',short:'Duplica'}],
 ['regionLoop','Ripeti la regione più volte…','loop','',{short:'Ripeti'}],
 ['regionDelete','Elimina la regione','trash','',{short:'Elimina'}],
 ['regionFadeIn','Dissolvenza in entrata della regione','fadeIn','',{short:'Entrata',toggle:()=>selRegion()?.fadeIn>0}],
 ['regionFadeOut','Dissolvenza in uscita della regione','fadeOut','',{short:'Uscita',toggle:()=>selRegion()?.fadeOut>0}],
 ['cycle','Ciclo: ripeti il tratto tra inizio e fine del ciclo','loop','',{short:'Ciclo',toggle:()=>P.cycle.on}],
 ['cycleRegion','Ciclo sulla regione scelta','loop','',{short:'Ciclo sulla regione'}],
 ['metronome','Metronomo','metronome','',{short:'Metronomo',toggle:()=>P.metro}],
 ['countInToggle','Battuta di conteggio prima di registrare','metronome','',{short:'Conteggio',toggle:()=>P.countIn}],
 ['tempoSettings','Tempo, battuta, griglia e latenza…','metronome','',{short:'Tempo'}],
 ['toggleEditor','Editor della regione','wave','Ctrl+E',{short:'Editor',toggle:()=>!$('editorArea').classList.contains('closed')}],
 ['playRegion','Ascolta la regione nell’editor','play','',{short:'Ascolta la regione'}],
 ['focusTracks','Vai alle tracce','tracks','Ctrl+Alt+L',{g:1}]]);
def('v','File',[
 ['saveProject','Salva il progetto (ZIP con i file)','save','Ctrl+S',{g:1,short:'Salva progetto'}],
 ['exportVideo','Esporta il video','film','Ctrl+Maiusc+E',{g:1,short:'Esporta video'}],
 ['exportMix','Esporta solo l’audio del montaggio','music','',{short:'Solo audio'}],
 ['exportFrame','Esporta il fotogramma come immagine PNG','camera','',{short:'Fotogramma'}],
 ['importMedia','Importa file multimediali','import','Ctrl+I',{g:1,short:'Importa'}]]);
def('av','Generale',[
 ['palette','Cerca comando','search','Alt+Q',{g:1,short:'Cerca comando'}],
 ['shortcuts','Scorciatoie da tastiera','keyboard','F1 / Ctrl+/',{g:1,short:'Scorciatoie'}],
 ['help','Informazioni e limiti','info','',{short:'Informazioni'}],
 ['nextRegion','Vai all’area successiva','','F6',{g:1}],
 ['prevRegion','Vai all’area precedente','','Maiusc+F6',{g:1}],
 ['switchAudio','Passa ad Audio','wave','Ctrl+Alt+A',{g:1}],
 ['switchVideo','Passa a Video','film','Ctrl+Alt+V',{g:1}],
 ['readStatus','Leggi posizione e stato','speak','Alt+Maiusc+I',{g:1,short:'Leggi stato'}],
 ['undo','Annulla','undo','Ctrl+Z',{short:'Annulla'}],
 ['redo','Ripeti','redo','Ctrl+Y / Ctrl+Maiusc+Z',{short:'Ripeti'}],
 ['cut','Taglia','cut','Ctrl+X',{short:'Taglia'}],
 ['copy','Copia','copy','Ctrl+C',{short:'Copia'}],
 ['paste','Incolla','paste','Ctrl+V',{short:'Incolla'}],
 ['goTo','Vai a un tempo…','goto','Ctrl+G',{g:1,short:'Vai a…'}],
 ['playPause','Riproduci o metti in pausa','play','Ctrl+Spazio',{g:1,short:'Riproduci'}],
 ['stop','Ferma e torna al punto di partenza','stop','',{short:'Ferma'}],
 ['toStart','Vai all’inizio','toStart','',{short:'Inizio'}],
 ['toEnd','Vai alla fine','toEnd','',{short:'Fine'}],
 ['zoomIn','Aumenta lo zoom','zoomIn','',{short:'Zoom avanti'}],
 ['zoomOut','Riduci lo zoom','zoomOut','',{short:'Zoom indietro'}],
 ['zoomFit','Mostra tutto','zoomFit','',{short:'Tutto'}],
 ['follow','Segui la riproduzione','follow','',{short:'Segui',toggle:()=>prefs.follow}],
 ['snap','Aggancio ai bordi durante il trascinamento (Alt lo sospende)','magnet','',{short:'Aggancio',toggle:()=>prefs.snap}],
 ['themeDark','Tema scuro','moon','',{short:'Tema scuro',toggle:()=>prefs.theme==='dark'}],
 ['contrast','Contrasto elevato','contrast','',{short:'Contrasto elevato',toggle:()=>prefs.contrast}]]);
def('a','Selezione',[
 ['selectAll','Seleziona tutto','selAll','Ctrl+A',{short:'Tutto'}],
 ['selectNone','Togli la selezione','close','',{short:'Nessuna'}],
 ['selectRange','Seleziona un intervallo di tempo…','selAll','Ctrl+Maiusc+A',{short:'Intervallo…'}],
 ['selToStart','Seleziona dal cursore all’inizio','toStart','',{short:'Fino all’inizio'}],
 ['selToEnd','Seleziona dal cursore alla fine','toEnd','',{short:'Fino alla fine'}],
 ['selMarkers','Seleziona la parte tra i marcatori intorno al cursore','markers','',{short:'Tra marcatori'}],
 ['zoomSel','Zoom sulla selezione','zoomSel','',{short:'Selezione'}]]);
def('a','Modifica',[
 ['deleteSel','Elimina la selezione','trash','',{short:'Elimina'}],
 ['trim','Ritaglia: tieni solo la selezione','crop','Ctrl+Maiusc+X',{short:'Ritaglia'}],
 ['silence','Silenzia la selezione','silence','Ctrl+L',{short:'Silenzia'}],
 ['duplicate','Duplica la selezione','duplicate','Ctrl+D',{short:'Duplica'}],
 ['pasteMix','Incolla mescolando con l’audio esistente','pasteMix','Ctrl+Maiusc+V',{short:'Incolla mescolando'}],
 ['insertSilence','Inserisci silenzio al cursore…','insertSilence','',{short:'Inserisci silenzio'}]]);
def('a','Riproduzione',[
 ['playSel','Riproduci la selezione','playSel','',{short:'Selezione'}],
 ['loop','Ripetizione ciclica della selezione','loop','',{short:'Ciclo',toggle:()=>aplay.loop}],
 ['playBefore','Ascolta i 2 secondi prima del cursore','frameBack','',{short:'Prima'}],
 ['playAfter','Ascolta i 2 secondi dopo il cursore','frameFwd','',{short:'Dopo'}],
 ['scrub','Ascolta mentre sposti il cursore','speak','',{short:'Ascolto al passaggio',toggle:()=>prefs.scrub}],
 ['recordAudio','Registra sulla traccia scelta, dall’indicatore','mic','Ctrl+Alt+R',{g:1,short:'Registra'}]]);
def('a','Effetti',[
 ['amplify','Amplifica o attenua…','amplify','',{short:'Amplifica'}],
 ['normalize','Normalizza…','normalize','',{short:'Normalizza'}],
 ['fadeIn','Dissolvenza in entrata (sulla selezione, o dall’inizio al cursore)','fadeIn','',{short:'Entrata'}],
 ['fadeOut','Dissolvenza in uscita (sulla selezione, o dal cursore alla fine)','fadeOut','',{short:'Uscita'}],
 ['reverse','Al contrario','reverse','',{short:'Al contrario'}],
 ['speed','Cambia la velocità (anche l’intonazione)…','speed','',{short:'Velocità'}],
 ['tempo','Cambia il ritmo senza cambiare l’intonazione…','speed','',{short:'Ritmo'}],
 ['eq','Equalizzatore e filtri…','eq','',{short:'Equalizzatore'}],
 ['compressor','Compressore…','compress','',{short:'Compressore'}],
 ['noiseGate','Riduzione del rumore di fondo…','noise','',{short:'Riduci rumore'}],
 ['captureNoise','Cattura il campione di rumore dalla selezione','noise','',{short:'Campione di rumore'}],
 ['truncate','Accorcia le pause…','truncate','',{short:'Accorcia pause'}],
 ['echo','Eco…','echo','',{short:'Eco'}],
 ['removeDC','Rimuovi lo spostamento continuo (DC)','dc','',{short:'Rimuovi DC'}],
 ['toMono','Converti in mono','mono','',{short:'Mono'}],
 ['toStereo','Converti in stereo','stereo','',{short:'Stereo'}],
 ['swapChannels','Scambia i canali sinistro e destro','swap','',{short:'Scambia canali'}],
 ['resample','Cambia la frequenza di campionamento…','tone','',{short:'Frequenza'}],
 ['repeatEffect','Ripeti l’ultimo effetto con le stesse impostazioni','redo','Ctrl+R',{short:'Ripeti effetto'}]]);
def('a','Inserisci',[
 ['generate','Genera un suono: tono, rumore o silenzio…','tone','',{short:'Genera suono'}],
 ['markerAdd','Aggiungi un marcatore al cursore','marker','Ctrl+M',{short:'Marcatore'}],
 ['markerNext','Vai al marcatore successivo','markerNext','Alt+Maiusc+PgGiù',{short:'Successivo'}],
 ['markerPrev','Vai al marcatore precedente','markerPrev','Alt+Maiusc+PgSu',{short:'Precedente'}],
 ['markerRename','Rinomina il marcatore più vicino','rename','',{short:'Rinomina'}],
 ['markerDelete','Elimina il marcatore più vicino','trash','',{short:'Elimina'}],
 ['markersClear','Elimina tutti i marcatori','trash','',{short:'Elimina tutti'}],
 ['markersFromPauses','Aggiungi marcatori all’inizio di ogni parte dopo una pausa','pauses','',{short:'Sulle pause'}],
 ['markPane','Riquadro dei marcatori','markers','',{short:'Riquadro',toggle:()=>!$('markPane').hidden}]]);
def('a','Analisi',[
 ['stats','Statistiche: durata, picco, volume medio e distorsioni','stats','',{short:'Statistiche'}],
 ['readLevel','Leggi il livello intorno al cursore','speak','',{short:'Livello'}],
 ['nextPause','Vai alla pausa successiva','right','',{short:'Pausa dopo'}],
 ['prevPause','Vai alla pausa precedente','left','',{short:'Pausa prima'}],
 ['findClip','Trova la prossima distorsione (clipping)','search','',{short:'Distorsioni'}],
 ['pauseSettings','Soglia per riconoscere le pause…','gear','',{short:'Soglia pause'}]]);
def('v','Montaggio',[
 ['addToTimeline','Aggiungi il file scelto alla linea temporale','plus','',{short:'Aggiungi'}],
 ['split','Dividi la clip all’indicatore','split','Ctrl+K',{short:'Dividi'}],
 ['trimStart','Taglia l’inizio della clip fino all’indicatore','trimStart','',{short:'Taglia inizio'}],
 ['trimEnd','Taglia la fine della clip dall’indicatore','trimEnd','',{short:'Taglia fine'}],
 ['deleteItem','Elimina l’elemento selezionato','trash','',{short:'Elimina'}],
 ['duplicateItem','Duplica l’elemento selezionato','duplicate','Ctrl+D',{short:'Duplica'}],
 ['moveEarlier','Sposta l’elemento indietro di un secondo (le clip attaccate prima di lei si spostano insieme)','left','',{short:'Indietro'}],
 ['moveLater','Sposta l’elemento avanti di un secondo (le clip attaccate dopo di lei si spostano insieme)','right','',{short:'Avanti'}],
 ['swapPrev','Scambia la clip con la precedente','left','Alt+Maiusc+←',{short:'Scambia con la precedente'}],
 ['swapNext','Scambia la clip con la successiva','right','Alt+Maiusc+→',{short:'Scambia con la successiva'}],
 ['addCard','Aggiungi un cartello: sfondo colorato con testo','card','',{short:'Cartello'}],
 ['addTitle','Aggiungi un titolo all’indicatore','titleT','',{short:'Titolo'}],
 ['recordVoice','Registra una voce fuori campo all’indicatore','mic','Ctrl+Alt+R',{g:1,short:'Voce fuori campo'}]]);
def('v','Clip',[
 ['transitionMenu','Transizione all’inizio della clip','transition','',{menu:1,short:'Transizione'}],
 ['filterMenu','Filtro colore della clip','filter','',{menu:1,short:'Filtro'}],
 ['adjust','Luce e colore della clip…','light','',{short:'Luce e colore'}],
 ['clipSpeed','Velocità della clip…','speed','',{short:'Velocità'}],
 ['clipVolume','Volume dell’elemento…','volume','',{short:'Volume'}],
 ['clipMute','Audio della clip disattivato','mute','',{short:'Muto',toggle:()=>!!selected()?.mute}],
 ['fadeInV','Dissolvenza in entrata dell’elemento','fadeIn','',{short:'Entrata'}],
 ['fadeOutV','Dissolvenza in uscita dell’elemento','fadeOut','',{short:'Uscita'}],
 ['rotate','Ruota la clip di 90 gradi','rotate','',{short:'Ruota'}],
 ['flip','Clip riflessa orizzontalmente','flip','',{short:'Rifletti',toggle:()=>!!selected()?.flip}],
 ['fitMode','Riempi l’inquadratura ritagliando i bordi','fit','',{short:'Riempi',toggle:()=>selected()?.fit==='cover'}]]);
def('v','Testo',[
 ['addSub','Aggiungi un sottotitolo all’indicatore','subs','Ctrl+Alt+S',{g:1,short:'Sottotitolo'}],
 ['subImport','Importa sottotitoli (SRT o VTT)','import','',{short:'Importa'}],
 ['subExport','Esporta i sottotitoli (SRT o VTT)','export','',{short:'Esporta'}],
 ['subShow','Mostra i sottotitoli nell’anteprima','subs','',{short:'Mostra',toggle:()=>prefs.showSubs}],
 ['subBurn','Imprimi i sottotitoli nel video esportato','subs','',{short:'Imprimi nel video',toggle:()=>!!V.p.burnSubs}]]);
def('v','Riproduzione',[
 ['frameBack','Fotogramma precedente','frameBack','',{}],
 ['frameFwd','Fotogramma successivo','frameFwd','',{}],
 ['prevEdit','Vai al taglio precedente','prevEdit','',{short:'Taglio prima'}],
 ['nextEdit','Vai al taglio successivo','nextEdit','',{short:'Taglio dopo'}],
 ['projectSettings','Impostazioni del progetto: formato, fotogrammi, sfondo…','gear','',{short:'Progetto'}],
 ['a11yCheck','Verifica l’accessibilità del video','a11y','',{short:'Verifica accessibilità'}],
 ['focusTimeline','Vai alla linea temporale','','Ctrl+Alt+L',{g:1}]]);
const KEYNAME={Invio:'enter',Spazio:' ',Canc:'delete',Esc:'escape',PgSu:'pageup',PgGiù:'pagedown',Home:'home',Fine:'end','←':'arrowleft','→':'arrowright','↑':'arrowup','↓':'arrowdown',Tab:'tab'};
const keyCache=new Map();
function parseKey(s){let key,mods;if(s.endsWith('++')){key='+';mods=s.slice(0,-2).split('+')}else{const p=s.split('+');key=p.pop();mods=p}return{ctrl:mods.includes('Ctrl'),alt:mods.includes('Alt'),shift:mods.includes('Maiusc'),key:(KEYNAME[key]||key).toLowerCase()}}
const keysOf=c=>c.keys;
function parsedKeys(spec){if(!keyCache.has(spec))keyCache.set(spec,spec?spec.split(' / ').map(parseKey):[]);return keyCache.get(spec)}
function keyMatch(e,k){if((e.ctrlKey||e.metaKey)!==k.ctrl||e.altKey!==k.alt)return false;const sym=k.key.length===1&&!/[a-z0-9 ]/.test(k.key);if(!sym&&e.shiftKey!==k.shift)return false;const ek=e.key.toLowerCase();if(ek===k.key)return true;if(/^[a-z0-9]$/.test(k.key)&&(!(e.ctrlKey&&e.altKey)||/\d/.test(k.key)))return e.code===(/\d/.test(k.key)?'Digit':'Key')+k.key.toUpperCase();if(k.key===' '&&e.code==='Space')return true;return false}
function ariaKeys(spec){const M={Ctrl:'Control',Maiusc:'Shift',Alt:'Alt',Invio:'Enter',Spazio:'Space',Canc:'Delete',PgSu:'PageUp',PgGiù:'PageDown','←':'ArrowLeft','→':'ArrowRight','↑':'ArrowUp','↓':'ArrowDown',Esc:'Escape'};return spec.split(' / ').map(s=>s.split('+').map(p=>M[p]||p).join('+')).join(' ')}
const kbdHtml=spec=>spec.split(' / ').map(s=>s.split('+').map(p=>`<kbd>${esc(p)}</kbd>`).join('+')).join(' o ');
const available=c=>c.modes.includes(state.mode[0]);
function focusContext(){const a=document.activeElement;if(!a||a===document.body)return 'other';if(a.id==='wave')return 'wave';if(a.classList.contains('ar-lane'))return 'lane';if(a.id==='arPlayhead')return 'arph';if(a.id==='playhead'||a.id==='viewCanvas'||a.classList.contains('track'))return 'timeline';if(a.classList.contains('lb'))return 'list';if(a.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),textarea,select'))return 'input';return 'other'}
function findShortcut(e,ctx){let fallback=null;for(const c of Object.values(C)){const spec=keysOf(c);if(!spec||!available(c))continue;if(c.ctx&&c.ctx!==ctx)continue;if(ctx==='input'&&!c.g)continue;if(parsedKeys(spec).some(k=>keyMatch(e,k))){if(c.ctx===ctx)return c;fallback??=c}}return fallback}
const safe=fn=>{try{return fn()}catch(e){return false}};
async function runCommand(id){const c=C[id];if(!c)return;if(!available(c)){toast('«'+c.label+'» non è disponibile in '+(isAudio()?'Audio':'Video'));return}hideTip();
 try{await handleAction(id)}catch(e){console.error(e);toast(e.message||String(e));return}
 if(c.toggle&&!c.quiet){refreshToggles();announce(c.label+(safe(c.toggle)?' attivato':' disattivato'))}else{if(c.say)announce(c.say);refreshToggles()}}
let toggleTimer;function refreshToggles(){clearTimeout(toggleTimer);toggleTimer=setTimeout(()=>{for(const b of $$('#ribbon [aria-pressed][data-action],.transport [aria-pressed][data-action]')){const c=C[b.dataset.action];if(c?.toggle)b.setAttribute('aria-pressed',!!safe(c.toggle))}},40)}
// Ricerca comandi (Alt+Q): combobox con elenco filtrato, navigabile con le frecce.
let palItems=[],palIdx=0,palPrev=null;
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function openPalette(){palPrev=document.activeElement;$('palettebg').hidden=false;$('palInput').value='';renderPalette();$('palInput').focus()}
function closePalette(restore=true){$('palettebg').hidden=true;if(restore)refocus(palPrev)}
function renderPalette(){const q=norm($('palInput').value.trim()),all=Object.values(C).filter(c=>available(c)&&c.id!=='palette');palItems=(q?all.map(c=>{const hay=norm(c.label+' '+(c.short||'')+' '+c.cat+' '+c.id);const sc=norm(c.label).startsWith(q)?4:hay.includes(q)?3:q.split(/\s+/).every(w=>hay.includes(w))?2:0;return[c,sc]}).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]):all).slice(0,80);palIdx=0;
 $('palList').innerHTML=palItems.length?palItems.map((c,i)=>{const k=keysOf(c),on=c.toggle?safe(c.toggle):null;return `<div role="option" id="pal-${i}" class="pal-opt" data-i="${i}" aria-selected="${i===0}">${ICON(c.icon)}<span class="pal-label">${esc(c.label)}${on===null?'':`<span class="sr-only">, ${on?'attivo':'non attivo'}</span>`}${k?`<span class="sr-only">, scorciatoia ${esc(k)}</span>`:''}</span><span class="pal-cat" aria-hidden="true">${esc(c.cat)}</span>${k?`<kbd aria-hidden="true">${esc(k)}</kbd>`:''}</div>`}).join(''):'<div class="pal-empty" role="option" aria-disabled="true" aria-selected="false" id="pal-empty">Nessun comando trovato</div>';palActive()}
function palActive(){$$('#palList [role=option]').forEach((o,i)=>o.setAttribute('aria-selected',i===palIdx&&!!palItems.length));const id=palItems.length?'pal-'+palIdx:'pal-empty';$('palInput').setAttribute('aria-activedescendant',id);$(id)?.scrollIntoView({block:'nearest'})}
function palRun(i){const c=palItems[i];if(!c)return;closePalette(true);setTimeout(()=>runCommand(c.id),0)}
// Menu contestuale generico (ruolo menu, frecce, Invio, Esc).
let menuState=null;
function openMenu(items,x,y,label='Menu',opener=null){closeMenu(false);const m=$('menu'),prev=document.activeElement;opener?.setAttribute('aria-expanded','true');m.setAttribute('aria-label',label);m.innerHTML=items.map((it,i)=>it==='-'?'<div class="menu-sep" role="separator"></div>':`<button type="button" role="${it.checked===undefined?'menuitem':'menuitemradio'}"${it.checked===undefined?'':` aria-checked="${!!it.checked}"`} tabindex="-1" data-i="${i}"${it.disabled?' aria-disabled="true"':''}>${it.checked===undefined?ICON(it.icon):`<span class="mi-check" aria-hidden="true">${it.checked?'✓':''}</span>`}<span class="mi-text"><span class="mi-label">${esc(it.label)}</span>${it.desc?`<span class="mi-desc">${esc(it.desc)}</span>`:''}</span>${it.keys?`<kbd aria-hidden="true">${esc(it.keys)}</kbd>`:''}</button>`).join('');m.hidden=false;const w=m.offsetWidth,h=m.offsetHeight;m.style.left=Math.max(4,Math.min(x,innerWidth-w-4))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-h-4))+'px';menuState={items,prev,opener};(m.querySelector('[aria-checked=true]:not([aria-disabled])')||m.querySelector('[role^=menuitem]:not([aria-disabled])'))?.focus()}
function closeMenu(restore=true){if(!menuState)return;const p=menuState.prev;menuState.opener?.setAttribute('aria-expanded','false');menuState=null;$('menu').hidden=true;if(restore)refocus(p)}
function menuRun(i){const it=menuState?.items[i];if(!it||it.disabled)return;closeMenu(true);setTimeout(()=>it.run(),0)}
const mi=(id,run)=>{const c=C[id];return{label:c.label,icon:c.icon,keys:keysOf(c),run:run||(()=>runCommand(id))}};
// Posizione per un menu aperto da un pulsante della barra, o dall'elemento con il focus.
function menuAnchor(action){const el=document.querySelector(`#ribbon [data-action="${action}"]`)||document.activeElement,r=el?.getBoundingClientRect?.()||{left:200,bottom:200};return{x:r.left,y:r.bottom,el:el?.closest?.('#ribbon')?el:null}}
// Scorciatoie che dipendono dall'area con il focus: non passano dal registro, ma la guida le elenca.
const STATIC_KEYS={g:[['Navigazione generale',[['Passa tra le aree','F6 / Maiusc+F6'],['Schede della barra multifunzione','← → poi Invio o ↓'],['Torna alla scheda dalla barra','Esc o ↑'],['Chiudi finestre e menu','Esc']]]],
 a:[['Sull’indicatore del brano',[['Un passo della griglia indietro o avanti (un secondo o un tempo)','← →'],['Un passo piccolo','Maiusc+← / Maiusc+→'],['Cinque secondi o una battuta','PgSu / PgGiù'],['Bordo di regione precedente o successivo','↑ / ↓'],['Inizio o fine del brano','Home / Fine'],['Riproduci o pausa il brano','Spazio'],['Inizio o fine del ciclo all’indicatore','I / O'],['Attiva o disattiva il ciclo','C'],['Registra sulla traccia scelta','R'],['Alle tracce','Invio']]],['Nelle tracce',[['Regione precedente o successiva','← →'],['Traccia sopra o sotto','↑ / ↓'],['Sposta la regione di un passo (con Maiusc di un passo piccolo)','Ctrl+← / Ctrl+→'],['Porta la regione sulla traccia sopra o sotto','Ctrl+↑ / Ctrl+↓'],['Apri la regione nell’editor','Invio'],['Proprietà della regione','Alt+Invio'],['Rinomina la regione','F2'],['Elimina la regione','Canc'],['Muto o solo della traccia','M / S'],['Registra su questa traccia','R'],['Riproduci o pausa il brano','Spazio'],['Menu della regione','Maiusc+F10'],['Zoom avanti, indietro, tutto','+ / − / 0']]],['Nell’editor della regione (forma d’onda)',[['Sposta il cursore del passo scelto','← →'],['Cinque secondi indietro o avanti','PgSu / PgGiù'],['Pausa precedente o successiva nel parlato','Ctrl+← / Ctrl+→'],['Inizio o fine del file','Home / Fine'],['Estendi la selezione','Maiusc con i tasti di spostamento'],['Ascolta o metti in pausa','Spazio'],['Ascolta la selezione','Maiusc+Spazio'],['Ascolta 2 secondi prima o dopo il cursore','P / D'],['Inizio o fine della selezione al cursore (anche durante l’ascolto)','I / O'],['Aggiungi un marcatore (anche durante l’ascolto)','M o Ctrl+M'],['Leggi il livello al cursore','L'],['Elimina la selezione','Canc o Backspace'],['Zoom avanti, indietro, tutto, selezione','+ / − / 0 / Z'],['Ferma l’ascolto o togli la selezione','Esc'],['Menu della forma d’onda','Maiusc+F10']]],['Nel riquadro dei marcatori',[['Scegli un marcatore','↑ ↓'],['Porta il cursore sul marcatore','Invio'],['Seleziona fino al marcatore successivo','Maiusc+Invio'],['Rinomina','F2'],['Elimina','Canc']]],['Nei campi del tempo',[['Conferma il tempo scritto','Invio'],['Torna alla forma d’onda','Esc']]]],
 v:[['Sull’indicatore di riproduzione',[['Un fotogramma indietro o avanti','← →'],['Un secondo indietro o avanti','Maiusc+← / Maiusc+→'],['Cinque secondi indietro o avanti','PgSu / PgGiù'],['Taglio precedente o successivo','↑ / ↓'],['Inizio o fine del montaggio','Home / Fine'],['Riproduci o pausa','Spazio'],['Indietro, pausa, avanti veloce','J / K / L'],['Dividi la clip all’indicatore','S'],['Taglia inizio o fine della clip all’indicatore','Q / W'],['Zoom avanti, indietro, tutto','+ / − / 0']]],['Nelle tracce',[['Elemento precedente o successivo','← →'],['Primo o ultimo elemento','Home / Fine'],['Sposta l’elemento di un secondo indietro o avanti: le clip attaccate in quella direzione si spostano insieme','Ctrl+← / Ctrl+→'],['Sposta l’elemento di un fotogramma','Ctrl+Maiusc+← / Ctrl+Maiusc+→'],['Modifica le proprietà','Invio'],['Elimina l’elemento','Canc'],['Menu dell’elemento','Maiusc+F10'],['Traccia sopra o sotto','↑ / ↓']]],['Nella raccolta',[['Scegli un file','↑ ↓'],['Aggiungi alla linea temporale','Invio'],['Menu del file','Maiusc+F10'],['Togli dalla raccolta','Canc']]]]};
function shortcutsHtml(){const m=state.mode[0],groups=new Map();for(const c of Object.values(C)){const k=keysOf(c);if(!k||!available(c))continue;if(!groups.has(c.cat))groups.set(c.cat,[]);groups.get(c.cat).push([c.label,k])}const table=(cap,rows,raw)=>`<table><caption>${esc(cap)}</caption><thead><tr><th scope="col">Azione</th><th scope="col">Tasti</th></tr></thead><tbody>${rows.map(([a,k])=>`<tr><th scope="row">${esc(a)}</th><td>${raw?esc(k):kbdHtml(k)}</td></tr>`).join('')}</tbody></table>`;return `<p>Scorciatoie per ${isAudio()?'Audio':'Video'}. Su Mac usa Cmd al posto di Ctrl. Puoi trovare ogni comando anche con <kbd>Alt</kbd>+<kbd>Q</kbd>.</p><div class="kcols">${[...STATIC_KEYS.g,...STATIC_KEYS[m]].map(([cap,rows])=>table(cap,rows,true)).join('')}${[...groups].map(([cap,rows])=>table(cap,rows)).join('')}</div>`}
async function showShortcuts(){await modal('Scorciatoie da tastiera',shortcutsHtml(),[],'Chiudi',{noCancel:true,wide:true})}
async function help(){await modal('Tassello Media',`<p><b>Tassello Media {{VERSIONE}}</b> fa parte di <b>Tassello</b>, una famiglia di piccoli strumenti liberi e gratuiti per lavorare sui propri file: un coltellino svizzero, ordinato e leggero. Sta in un solo file HTML che funziona nel browser anche senza rete, senza programmi da installare e senza account. Contiene due app: <b>Audio</b> per registrare, montare su più tracce e modificare suoni, musica e parlato, <b>Video</b> per montare filmati con titoli e sottotitoli. I file restano sul tuo computer.</p><p><b>Copia ufficiale:</b> scarica Tassello solo dal sito <b>svitatlco.github.io/tassello</b> o dalle release su GitHub (<b>github.com/svitaTLCO/tassello</b>). Se questo file ti è arrivato per email, in chat o su una chiavetta, scaricalo di nuovo da lì prima di usarlo; per far conoscere Tassello, condividi il link invece del file. Sul sito puoi controllare un file con la pagina Verifica. Questo programma non si collega a internet e non chiede mai password, account o pagamenti: una copia che lo fa non è quella ufficiale.</p><p><b>Cosa non è:</b> Tassello Media non sostituisce gli studi di registrazione e i programmi di montaggio professionali, e non è un clone delle app famose. Ha un disegno suo, con le funzioni che servono per il lavoro di tutti i giorni (un’intervista da ripulire, un podcast, un video per la scuola o per il lavoro) tutte raggiungibili da tastiera.</p><p><b>Accessibilità:</b> per Tassello non è un di più ma la condizione per distribuire ogni strumento: tutto si usa con uno screen reader e con la sola tastiera. F6 passa tra le aree, Alt+Q cerca qualsiasi comando, F1 elenca le scorciatoie, Alt+Maiusc+I legge posizione e stato. In Audio ogni traccia è un elenco di regioni che si scorre con le frecce, con muto, solo, volume e bilanciamento etichettati; Invio apre la regione nell’editor, dove la forma d’onda è un cursore che si sposta con le frecce e fa ascoltare il punto in cui ti trovi; Ctrl+frecce salta da una pausa all’altra del parlato, P e D ascoltano prima e dopo il cursore, I e O fissano la selezione anche durante l’ascolto, e ogni effetto ha l’anteprima. In Video la linea temporale è fatta di tracce che si scorrono con le frecce, gli elementi si spostano di un secondo o di un fotogramma con Ctrl+frecce (una clip spinge con sé quelle attaccate nella stessa direzione e dall’altra parte lascia uno spazio vuoto), Alt+Maiusc+frecce cambia l’ordine delle clip, ogni proprietà si modifica con campi etichettati nel riquadro Proprietà, i sottotitoli si scrivono, importano ed esportano in SRT e VTT, e la verifica dell’accessibilità controlla sottotitoli, tempi di lettura, contrasto dei titoli e lampeggiamenti pericolosi.</p><p><b>Audio:</b> progetto a più tracce con volume, bilanciamento, muto, solo, bassi, alti, compressione e riverbero per traccia; regioni da spostare, accorciare, dividere, duplicare e ripetere; tempo, griglia a battute, metronomo, ciclo e registrazione sulla traccia mentre si ascoltano le altre; esporta il brano mixato, le tracce separate o il progetto in ZIP. L’editor della regione apre WAV, MP3, M4A, AAC, OGG, Opus, FLAC e l’audio dei video; taglia, copia, incolla, incolla mescolando, duplica, ritaglia, silenzia e inserisce silenzio; marcatori con nome che si salvano nel WAV e si esportano come testo; amplifica, normalizza, dissolvenze, al contrario, velocità, ritmo senza cambiare intonazione, equalizzatore con filtri, compressore, riduzione del rumore di fondo, accorcia le pause, eco, rimozione del DC, mono, stereo, scambio dei canali e frequenza di campionamento; statistiche con picco, volume medio e distorsioni; esporta WAV a 16, 24 o 32 bit e, se il browser lo permette, M4A (AAC) o WebM (Opus), anche una parte per ogni tratto tra i marcatori.</p><p><b>Video:</b> importa video, audio e immagini; li monta su una traccia principale con divisione, tagli, spostamenti, velocità, volume, dissolvenze, transizioni (dissolvenza incrociata, passaggio al nero, tendina), filtri e regolazioni di luce e colore, rotazione e riflessione; aggiunge cartelli, titoli, una traccia audio per musica e voce fuori campo, sottotitoli; esporta il video in MP4 o WebM con i sottotitoli impressi se vuoi, solo l’audio, un fotogramma o i sottotitoli; salva il progetto in un unico file ZIP con i suoi file.</p><p><b>Privacy:</b> i file e le registrazioni restano nel browser e sul tuo computer. Il microfono si usa solo quando lo chiedi tu e la registrazione non lascia il dispositivo. Questo vale per la copia ufficiale: una copia modificata da altri può comportarsi in modo diverso.</p><p><b>Limiti:</b> Tassello Media copre il lavoro di base, non tutto. In Audio le tracce sono solo audio (niente strumenti virtuali o MIDI), gli effetti di traccia sono semplici e i progetti molto lunghi richiedono molta memoria; la registrazione usa una compensazione della latenza stimata, da regolare in Tempo se le parti registrate risultano in ritardo. In Video l’esportazione avviene in tempo reale, quindi dura quanto il montaggio, e va lasciata in primo piano; il formato MP4 dipende dal browser (Chrome ed Edge recenti), altrimenti si ottiene WebM; non ci sono fotogrammi chiave, più tracce video sovrapposte o correzione del colore avanzata; i formati che il browser non sa riprodurre non si possono importare. Conserva sempre una copia degli originali.</p>`,[],'Chiudi',{noCancel:true})}
// Aree raggiungibili con F6 e Maiusc+F6.
let lastTrack='trk-main';
function regions(){const l=[$('titlebar'),$('tabrow'),$('ribbon')];if(isAudio()){l.push($('aTransport'),$('arrange'));if(!$('editorArea').classList.contains('closed'))l.push($('wave'),$('selbar'));if(!$('markPane').hidden)l.push($('markPane'))}else l.push($('libList').closest('.library'),$('vTransport'),$('timeline'),$('inspBody').closest('.inspector'));l.push($('statusbar'));return l.filter(el=>el.offsetWidth||el.offsetHeight)}
const REGION_NAME={titlebar:'Barra del titolo',tabrow:'Schede della barra multifunzione',ribbon:'Barra multifunzione',aTransport:'Riproduzione del brano',arrange:'Tracce',wave:'Editor della regione',selbar:'Posizione e selezione',markPane:'Marcatori',vTransport:'Riproduzione video',timeline:'Linea temporale',statusbar:'Barra di stato'};
function focusRegion(el){if(el.id==='tabrow'){$('tab-'+slug(currentTab))?.focus();return}if(el.id==='markPane'){$('markList').focus();return}if(el.classList.contains('library')){$('libList').focus();return}if(el.id==='timeline'){($(lastTrack)||$('playhead')).focus();return}if(el.classList.contains('inspector')){(focusables($('inspBody'))[0]||$('inspBody')).focus();announce('Proprietà');return}if(el.id==='wave'){el.focus();return}if(el.id==='arrange'){focusLane(P.track);return}focusables(el)[0]?.focus()}
function cycleRegion(dir){const list=regions(),a=document.activeElement;let i=list.findIndex(r=>r.contains(a));i=i<0?(dir>0?0:list.length-1):(i+dir+list.length)%list.length;focusRegion(list[i]);const name=REGION_NAME[list[i].id];if(name&&!['wave','timeline','arrange'].includes(list[i].id))announce(name)}
