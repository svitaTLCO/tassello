// Ogni comando del registro corrisponde a una funzione: prima quelle dell'app attiva, poi quelle comuni.
const toggleMarkPane=()=>paneSet('markPane',paneState('markPane').st==='open'?'off':'open',{focus:true,say:false});
// In Audio alcuni comandi valgono per l'editor della regione o per le tracce secondo dove si sta lavorando.
const songOrEditor=(song,editor)=>()=>inEditorArea()?editor():song();
const undoScope=()=>document.activeElement?.closest?.('#editorArea,#markPane')?'editor':document.activeElement?.closest?.('#arrange')?'project':lastScope;
// --- Tracce MIDI ---------------------------------------------------------
// Le note di una regione che finiscono nel file .mid: solo la finestra [offT, offT+durT), relative all'inizio della
// regione, con le durate tagliate alla fine. Le note nascoste dal trim restano nel progetto ma non si esportano,
// come nell'esportazione audio della regione.
function midiRegionNotes(r){const a=r.offT,b=r.offT+r.durT;
 return (r.notes||[]).filter(n=>n.t>=a&&n.t<b).map(n=>({t:n.t-a,d:Math.min(n.d,b-n.t),p:n.p,v:n.v}))}
// Tutta la traccia: le regioni in sequenza, ognuna nella sua finestra, alle posizioni assolute del brano.
function midiTrackNotes(tr){const out=[];for(const r of P.regions.filter(x=>x.track===tr.id&&x.kind==='midi'))
 for(const n of midiRegionNotes(r))out.push({t:r.startT+n.t,d:n.d,p:n.p,v:n.v});return out}
function newMidiTrack(){let t,r;pCommit('Nuova traccia MIDI',()=>{
 t=newTrack('MIDI '+(P.tracks.filter(x=>x.kind==='midi').length+1),'midi');P.tracks.push(t);
 r=newMidiRegion(t.id,midiTick(Math.max(0,P.t)),'Regione MIDI');P.regions.push(r);P.track=t.id;P.sel=r.id});
 focusLane(t.id);announce(`Nuova traccia MIDI «${t.name}»: le note suonano sul sintetizzatore esterno e non finiscono nel mix esportato`)}
// Una regione MIDI scelta si esporta da sola; senza regione si esporta la traccia MIDI scelta per intero.
function exportMidi(){const r=selRegion(),tr=r?trackOf(r.track):selTrack();
 if(!r&&tr?.kind!=='midi'){toast('Scegli una regione o una traccia MIDI');return}
 if(r&&r.kind==='midi'){const notes=midiRegionNotes(r);if(!notes.length){toast('La regione non ha note da esportare');return}
  download(new Blob([smfWrite({bpm:P.bpm,name:r.name,tracks:[{ch:tr.midiCh,program:tr.program,notes}]})],{type:'audio/midi'}),extName(r.name,'mid'),'audio/midi');
  announce(`Regione «${r.name}» esportata come file MIDI: ${notes.length} note`);return}
 if(tr?.kind==='midi'){const notes=midiTrackNotes(tr);if(!notes.length){toast('La traccia non ha note da esportare');return}
  download(new Blob([smfWrite({bpm:P.bpm,name:tr.name,tracks:[{ch:tr.midiCh,program:tr.program,notes}]})],{type:'audio/midi'}),extName(tr.name,'mid'),'audio/midi');
  announce(`Traccia «${tr.name}» esportata come file MIDI: ${notes.length} note`);return}
 toast('Scegli una regione o una traccia MIDI')}
// Importazione di file .mid: una traccia per ogni parte (traccia SMF e canale), ognuna con il suo midiCh. Se il
// progetto è vuoto si adotta il primo tempo del file; altrimenti restano le note sulla griglia del progetto e si
// dice a che velocità era il file.
async function importMidiFiles(files){let tracce=0,note=0;const said=[];
 for(const f of files){let parsed;try{parsed=smfRead(await f.arrayBuffer())}catch(e){toast(`«${f.name}»: ${e.message}`);continue}
  const parts=smfSplitChannels(parsed);if(!parts.length){toast(`«${f.name}» non contiene note`);continue}
  const info=smfTempoInfo(parsed),empty=!P.regions.length;
  pCommit('Importa '+f.name,()=>{if(empty&&info.bpm&&Math.abs(info.bpm-P.bpm)>0.01)P.bpm=info.bpm;
   const startT=empty?0:midiTick(Math.max(0,P.t));
   for(const part of parts){const t=newTrack(part.name,'midi');t.midiCh=part.ch;t.program=part.program;P.tracks.push(t);
    const r=newMidiRegion(t.id,startT,part.name);r.notes=part.notes;P.regions.push(r);P.track=t.id;P.sel=r.id;tracce++;note+=part.notes.length}});
  if(info.bpm){if(empty)said.push(`Tempo del file «${f.name}»: ${fmtNum(info.bpm,0)} BPM, adottato nel progetto`);
   else if(Math.abs(info.bpm-P.bpm)>0.01)said.push(`Il file «${f.name}» è a ${fmtNum(info.bpm,0)} BPM, il progetto a ${fmtNum(P.bpm,0)}: le note restano sulla griglia del progetto`);
   if(info.changes>1)said.push(`Il file ha ${info.changes} cambi di tempo: si è tenuto il primo`)}}
 if(!tracce){announce('Nessuna traccia MIDI importata');return}
 announce(`Importate ${tracce} tracce MIDI (${note} note)${said.length?'. '+said.join('. '):''}`)}
// Armatura: una sola traccia MIDI alla volta ascolta l'ingresso (note in uscita, comandi a nota sospesi).
function toggleMidiArm(t=selTrack()){if(!t||t.kind!=='midi'){toast('Scegli una traccia MIDI');return}
 const on=!t.arm;pCommit('Armatura MIDI',()=>{for(const x of P.tracks)x.arm=!!(x.id===t.id&&on)});
 if(on)midiStart({quiet:true}).then(ok=>{if(ok&&!midiOutputs().length)announce('Nessuna uscita MIDI disponibile: le note non si sentono')}).catch(()=>{});
 const port=on?midiOutputFor(t):null;
 announce(on?`Traccia MIDI «${t.name}» armata: le note suonano su ${port?.name||'la prima uscita'} e non comandano il programma`:'Armatura MIDI tolta')}
// Quantizzazione sulla griglia ASSOLUTA del brano: tickAssoluto = startT − offT + t, aggancio, riconversione.
// Una regione spostata o tagliata fuori battuta non finisce così su una griglia sfasata. Durate intatte; pCommit.
async function quantizeMidi(){const sel=selRegion(),tr=selTrack();
 let regions=sel?.kind==='midi'?[sel]:tr?.kind==='midi'?P.regions.filter(r=>r.track===tr.id&&r.kind==='midi'):[];
 if(!regions.length){toast('Scegli una regione o una traccia MIDI');return}
 const v=await modal('Quantizza la regione MIDI',`<p>Gli inizi delle note si agganciano alla griglia del brano; le durate non cambiano. Si annulla con Ctrl+Z.</p>`,
  [{id:'grid',label:'Griglia',type:'select',value:'16',options:[['4','1/4 (un tempo)'],['8','1/8'],['16','1/16']]}],'Quantizza');
 if(!v)return;const step=MIDIPPQ*4/Number(v.grid);let moved=0,maxShift=0,total=0;
 pCommit('Quantizza MIDI',()=>{for(const r of regions)for(const n of r.notes||[]){
  const origin=r.startT-r.offT,abs=origin+n.t;let q=Math.round(abs/step)*step;
  // Una nota visibile non deve finire prima dell'inizio visibile (t<offT): diventerebbe muta e sembrerebbe
  // cancellata. In quel caso si aggancia alla linea di griglia successiva, restando dentro la regione e sulla
  // griglia. Per le note già nascoste resta il comportamento di prima.
  if(n.t>=r.offT&&q-origin<r.offT)q+=step;
  if(q!==abs){moved++;maxShift=Math.max(maxShift,Math.abs(q-abs))}
  n.t=Math.max(0,q-origin);total++}
  for(const r of regions)r.notes=(r.notes||[]).sort((a,b)=>a.t-b.t||a.p-b.p)});
 announce(`Quantizzate ${total} note su griglia 1/${v.grid}: ${moved} spostate${moved?`, al massimo di ${maxShift} tick (${sayTime(midiSec(maxShift),2)})`:''}`)}
const meAct=fn=>()=>{if(meEnsure())fn()};
const A_ACTIONS={newBus,newMidiTrack,exportMidi,midiArm:()=>toggleMidiArm(),midiQuantize:quantizeMidi,
midiAddNote:meAct(meAddNote),midiDeleteNotes:meAct(meDeleteNotes),midiSemiUp:meAct(()=>meTranspose(1,'Semitono')),midiSemiDown:meAct(()=>meTranspose(-1,'Semitono')),
midiOctaveUp:meAct(()=>meTranspose(12,'Ottava')),midiOctaveDown:meAct(()=>meTranspose(-12,'Ottava')),midiDurLonger:meAct(()=>meSetDuration(1)),midiDurShorter:meAct(()=>meSetDuration(-1)),
midiVelUp:meAct(()=>meSetVelocity(5)),midiVelDown:meAct(()=>meSetVelocity(-5)),midiNoteProps:meAct(meNoteProps),midiReadNote:meAct(meReadNote),midiShowHidden:meAct(()=>meToggleHidden()),midiPlayRegion:meAct(mePlayRegion),midiPlayNote:meAct(mePlayNote),
midiOverdub:()=>{prefs.midiOverdub=!prefs.midiOverdub;savePrefs();announce(prefs.midiOverdub?'Registrazione MIDI: sovraincisione nella regione sotto attiva':'Registrazione MIDI: regione nuova (sovraincisione spenta)')},saveAudio:exportAudioDialog,saveAudioProject:saveAudioProjectZip,exportStems,newTrack:addTrack,importTrack:()=>$('mediaInput').click(),trackSettings:()=>trackSettings(),trackMute:()=>{const t=selTrack();if(t)toggleTrack(t.id,'mute');else toast('Crea prima una traccia')},trackSolo:()=>{const t=selTrack();if(t)toggleTrack(t.id,'solo');else toast('Crea prima una traccia')},trackVoice:()=>{const t=selTrack();if(!t){toast('Crea prima una traccia');return}const on=!t.voice;pCommit('Traccia della voce',()=>{for(const x of P.tracks){x.voice=x.id===t.id&&on;if(x.voice)x.duck=0}});announce(on?`«${t.name}» è la traccia della voce: le tracce con l’abbassamento si abbasseranno quando parla`:'La traccia della voce è stata tolta');refreshToggles()},trackRename:()=>renameTrack(),trackDuplicate:()=>duplicateTrack(),trackDelete:()=>deleteTrack(),trackUp:()=>moveTrack(-1),trackDown:()=>moveTrack(1),
 regionEdit:()=>{const r=selRegion();if(r)openRegion(r);else toast('Scegli prima una regione nelle tracce')},regionProps:()=>regionProps(),regionSplit:splitRegion,regionTrimStart:()=>trimRegion(false),regionTrimEnd:()=>trimRegion(true),regionDuplicate:()=>duplicateRegion(),regionLoop:()=>loopRegion(),regionDelete:()=>deleteRegion(),regionFadeIn:()=>fadeRegion('in'),regionFadeOut:()=>fadeRegion('out'),regionCrossfade:crossfadeNext,autoEdit:autoEditDialog,takes:takesDialog,takeNext:()=>takeStep(1),takePrev:()=>takeStep(-1),takeDelete,compEdit:compDialog,regionGainAuto:regionGainDialog,regionGainPoint,limiterAuto:limiterDialog,limiterToggle,punchRange:punchDialog,punchToggle,autoAddVol:()=>autoAddPoint('vol'),autoAddPan:()=>autoAddPoint('pan'),autoToggleVol:()=>autoToggle('vol'),autoTogglePan:()=>autoToggle('pan'),autoClear,
 cycle:()=>{const c=P.cycle;if(!(c.b>c.a)){const r=selRegion();if(r){c.a=r.start;c.b=regionEnd(r)}else{c.a=P.t;c.b=P.t+barDur()*2}}c.on=!c.on;drawArRuler();schedulePersist('audio');announce(c.on?`Ciclo attivato, da ${sayTime(c.a)} a ${sayTime(c.b)}`:'Ciclo disattivato')},cycleRegion:()=>{const r=selRegion();if(!r){toast('Scegli prima una regione');return}P.cycle={on:true,a:r.start,b:regionEnd(r)};drawArRuler();refreshToggles();schedulePersist('audio');announce(`Ciclo sulla regione «${r.name}», da ${sayTime(r.start)} a ${sayTime(regionEnd(r))}`)},
 metronome:()=>{P.metro=!P.metro;schedulePersist('audio')},countInToggle:()=>{P.countIn=!P.countIn;schedulePersist('audio')},tempoSettings,toggleEditor:()=>{const open=$('editorArea').classList.contains('closed');showEditor(open);const target=open?(A.buf?$('wave'):meEditorActive()?$('midiNotes'):null):null;(target||$('lane-'+P.track)||arPlayheadEl)?.focus()},playRegion:()=>{if(!A.buf){toast('Nessuna regione nell’editor: scegli una regione e premi Invio');return}if(aplay.playing){stopPlayback(true);return}playRange(0,alen(),{origin:A.cursor})},focusTracks:()=>focusLane(P.track),
exportParts,batchConvert:batchConvertDialog,exportLabels:()=>{if(!A.markers.length){toast('Nessun marcatore da esportare');return}download(labelsText(A.markers,A.rate),extName(A.title+' - marcatori','txt'),'text/plain');toast('Marcatori esportati come testo')},importLabels:()=>pickText('labels'),insertFile:()=>pickFile('insert'),
 selectAll:()=>{if(A.buf)setSelection(0,alen())},selectNone:()=>{A.selA=A.selB=0;audioMetaChanged();announce('Selezione tolta')},selectRange:selectRangeDialog,selToStart:()=>{if(A.buf)setSelection(0,A.cursor)},selToEnd:()=>{if(A.buf)setSelection(A.cursor,alen())},selMarkers:selBetweenMarkers,zoomSel:zoomToSel,
 deleteSel:deleteSelection,trim:trimToSelection,silence:silenceSel,duplicate:duplicateSel,pasteMix:audioPasteMix,insertSilence:insertSilenceDialog,
 playSel:playSelection,loop:()=>{aplay.loop=!aplay.loop;$('aLoop').setAttribute('aria-pressed',aplay.loop)},playBefore:()=>playAround(true),playAfter:()=>playAround(false),scrub:()=>{prefs.scrub=!prefs.scrub;savePrefs()},recordAudio:()=>selTrack()?.kind==='midi'?recordMidi():recordAudio(),
 amplify:()=>effectDialog('amplify'),normalize:()=>effectDialog('normalize'),fadeIn:()=>applyEffect('fadeIn'),fadeOut:()=>applyEffect('fadeOut'),reverse:()=>applyEffect('reverse'),speed:()=>effectDialog('speed'),tempo:()=>effectDialog('tempo'),fitDuration:fitDurationDialog,eq:()=>effectDialog('eq'),compressor:()=>effectDialog('compressor'),voiceChain:()=>effectDialog('voiceChain'),deEsser:()=>effectDialog('deEsser'),deHum:()=>effectDialog('deHum'),deClick:()=>effectDialog('deClick'),limiter:()=>effectDialog('limiter'),noiseGate:()=>effectDialog('noiseGate'),captureNoise,truncate:()=>effectDialog('truncate'),echo:()=>effectDialog('echo'),removeDC:()=>applyEffect('removeDC'),
 toMono,toStereo,swapChannels,resample:resampleDialog,repeatEffect,generate:generateDialog,
 markerAdd:()=>{if(MIX.playing||!inEditorArea()){songMarker();return}if(!A.buf){toast('Nessun audio aperto');return}markerAt(aplay.playing?playPos():A.cursor)},markerNext:()=>markerStep(1),markerPrev:()=>markerStep(-1),markerRename:()=>markerRename(),markerDelete:()=>markerDelete(),markersClear:async()=>{if(!A.markers.length)return;if(await confirmAction(`Eliminare tutti i ${A.markers.length} marcatori?`,'Elimina')){metaEdit('Elimina i marcatori',()=>{A.markers=[]});announce('Marcatori eliminati')}},markersFromPauses,markPane:toggleMarkPane,
 stats:audioStats,deliveryReport:deliveryReportDialog,readLevel,describeSong,readLevels:()=>readLevels(),compareFx:compareBeforeAfter,nextPause:()=>jumpPause(1,false),prevPause:()=>jumpPause(-1,false),findClip,pauseSettings,
 undo:()=>undoScope()==='editor'?audioUndo(false):pUndo(false),redo:()=>undoScope()==='editor'?audioUndo(true):pUndo(true),
 cut:()=>['lane','arph'].includes(focusContext())?regionCopy(true):audioCut(),copy:()=>['lane','arph'].includes(focusContext())?regionCopy(false):audioCopy(),paste:()=>['lane','arph'].includes(focusContext())?regionPaste():audioPaste(),
 playPause:songOrEditor(songPlayPause,audioPlayPause),stop:songOrEditor(songStop,audioStop),
 toStart:songOrEditor(()=>{arSeek(0,{say:true})},()=>{stopPlayback(false);moveCursor(0,false,{listen:false});announce('Inizio della regione')}),toEnd:songOrEditor(()=>{arSeek(projDur(),{say:true})},()=>{stopPlayback(false);moveCursor(alen(),false,{listen:false});announce('Fine della regione, '+sayTime(adur()))}),
 zoomIn:songOrEditor(()=>arZoom(1.5),()=>zoomAudio(0.5)),zoomOut:songOrEditor(()=>arZoom(1/1.5),()=>zoomAudio(2)),zoomFit:songOrEditor(()=>{arZoomFit();announce('Si vede tutto il brano')},()=>{zoomFitAudio();announce('Si vede tutta la regione')}),readStatus:songOrEditor(readSongStatus,readAudioStatus)};
const V_ACTIONS={saveProject:saveProjectZip,exportVideo:exportVideoDialog,exportMix:exportMixDialog,exportFrame,importMedia:()=>$('mediaInput').click(),addToTimeline:()=>addToTimeline(),
 split:splitAtPlayhead,trimStart:()=>trimAtPlayhead(false),trimEnd:()=>trimAtPlayhead(true),deleteItem,duplicateItem,moveEarlier:()=>moveItem(-1),moveLater:()=>moveItem(1),snap:()=>{prefs.snap=!prefs.snap;savePrefs()},swapPrev:()=>swapItem(-1),swapNext:()=>swapItem(1),addCard,addTitle,recordVoice,
 transitionMenu,filterMenu,adjust:adjustDialog,clipSpeed:clipSpeedDialog,clipVolume:clipVolumeDialog,clipMute:()=>toggleClip('mute'),fadeInV:()=>fadeItem('in'),fadeOutV:()=>fadeItem('out'),rotate:rotateClip,flip:()=>toggleClip('flip'),fitMode:()=>{const x=needClip();if(!x)return;vCommit('Inquadratura',()=>{x.fit=x.fit==='cover'?'contain':'cover'});announce(x.fit==='cover'?'Inquadratura: riempi, i bordi sono ritagliati':'Inquadratura: adatta, si vede tutta l’immagine, con le bande se serve')},
 addSub,subSnap,subsFromSpeech,describeFrame,describeClip,sceneNext:()=>sceneStep(1),scenePrev:()=>sceneStep(-1),vNextPause:()=>vPauseStep(1),vPrevPause:()=>vPauseStep(-1),
 analyzeImages:async()=>{const ids=V.p.main.filter(c=>c.kind==='media').map(c=>c.media);if(!ids.length){toast('Nessuna clip sulla linea temporale');return}for(const m of V.p.media)if(ids.includes(m.id))delete m.an;if(await ensureAnalysis(ids)){const n=scenePoints().length;announce(`Immagini analizzate: ${n===0?'nessun cambio di scena':n===1?'un cambio di scena':n+' cambi di scena'} sul montaggio. Ctrl+frecce su e giù sull’indicatore li percorrono`)}},
 subImport:()=>pickText('subs'),subExport:exportSubs,subShow:()=>{prefs.showSubs=!prefs.showSubs;savePrefs();$('vSubs').setAttribute('aria-pressed',prefs.showSubs);requestFrame()},subBurn:()=>vCommit('Imprimi i sottotitoli',()=>{V.p.burnSubs=!V.p.burnSubs}),
 vPlayItem,vPlayBefore:()=>vPlayAround(true),vPlayAfter:()=>vPlayAround(false),frameBack:()=>frameStep(-1),frameFwd:()=>frameStep(1),prevEdit:()=>editStep(-1),nextEdit:()=>editStep(1),projectSettings,a11yCheck,focusTimeline:()=>{($(lastTrack)||playheadEl).focus()},
 undo:()=>vUndo(false),redo:()=>vUndo(true),cut:()=>videoCopy(true),copy:()=>videoCopy(false),paste:videoPaste,playPause:vPlayPause,stop:()=>{const o=VE.origin??0;vStop();seekTo(o,{say:true})},
 toStart:()=>seekTo(0,{say:true}),toEnd:()=>seekTo(totalDur(),{say:true}),zoomIn:()=>zoomTimeline(1.5),zoomOut:()=>zoomTimeline(1/1.5),zoomFit:zoomFitTimeline,readStatus:readVideoStatus};
const COMMON_ACTIONS={new:()=>isAudio()?newAudio():newVideo(),open:()=>pickFile('open'),filePanel:openFilePanel,palette:openPalette,shortcuts:showShortcuts,help,nextRegion:()=>cycleRegion(1),prevRegion:()=>cycleRegion(-1),
 midiPanel:()=>midiPanel(),
 switchAudio:()=>setMode('audio'),switchVideo:()=>setMode('video'),layoutMenu,layoutReset,showLibrary:()=>paneToggle('libPane'),showInspector:()=>paneToggle('inspPane'),bigPreview:()=>layoutPreset('tessera'),goTo:goToDialog,follow:()=>{prefs.follow=!prefs.follow;savePrefs()},
 themeDark:()=>{prefs.theme=prefs.theme==='dark'?'light':'dark';applyPrefs();savePrefs()},contrast:()=>{prefs.contrast=!prefs.contrast;applyPrefs();savePrefs()}};
async function handleAction(id){const f=(isAudio()?A_ACTIONS[id]:V_ACTIONS[id])??COMMON_ACTIONS[id];if(!f){toast('Comando non disponibile');return}await f()}
// Passa da Audio a Video e viceversa: ferma la riproduzione dell'app che si lascia e ridisegna l'altra.
function setMode(mode,{focus=true}={}){if(mode===state.mode)return;if(mode==='video')stopPlayback(true);else vStop();state.mode=mode;const audio=mode==='audio';
 $('app').className=mode;document.documentElement.dataset.mode=mode;$('audioPane').classList.toggle('hidden',!audio);$('videoPane').classList.toggle('hidden',audio);$('switchAudio').setAttribute('aria-pressed',audio);$('switchVideo').setAttribute('aria-pressed',!audio);
 $('docTitle').value=audio?P.title:V.p.title;$('saveTopLabel').textContent=audio?'Esporta':'Salva progetto';$('saveTop').dataset.tip=audio?'Esporta il brano (Ctrl+S)':'Salva il progetto (Ctrl+S)';updateTitle();
 renderBar();applyLayout(false);themeChanged();if(audio){renderArrange();viewClamp();drawAudio();updateAudioUI()}else{resizeCanvas();drawTimeline();renderLibrary();renderInspector();updateVideoUI()}
 if(focus){if(audio)focusLane(P.track);else($(lastTrack)||playheadEl).focus();announce(audio?'Audio: tracce':'Video: linea temporale')}schedulePersist(mode)}
function updateTitle(){document.title=($('docTitle').value.trim()||'Senza titolo')+' — '+(isAudio()?'Audio':'Video')+' · Tassello Media'}
// Apertura dei file: ogni app decide che cosa fare di audio, video, immagini, progetti e testi.
let pickMode='open';
function pickFile(mode){pickMode=mode;const inp=$('fileInput');inp.accept=isAudio()?'audio/*,video/*,.wav,.mp3,.m4a,.aac,.ogg,.oga,.opus,.flac,.webm,.mp4,.mov,.mkv':'video/*,audio/*,image/*,.zip,.srt,.vtt,.mkv,.mov,.m4a,.flac,.opus';inp.multiple=!isAudio();inp.click()}
function pickText(kind){pickMode=kind;$('textInput').click()}
async function openFiles(files){files=[...files];if(!files.length)return;const zip=files.find(f=>/\.zip$/i.test(f.name)),subs=files.filter(f=>/\.(srt|vtt)$/i.test(f.name)),labels=files.find(f=>/\.txt$/i.test(f.name)),mids=files.filter(f=>/\.(mid|midi)$/i.test(f.name));
 if(zip){const entries=await work('Lettura dell’archivio',()=>unzipBlob(zip));if(!entries)return;if(entries['progetto-audio.json']){if(!isAudio())setMode('audio',{focus:false});await openAudioProjectZip(entries);return}if(isAudio())setMode('video',{focus:false});if(!(await openProjectZip(zip)))toast('L’archivio non contiene un progetto di Tassello Media');return}
 if(isAudio()){if(mids.length&&!zip){await importMidiFiles(mids);if(mids.length===files.length)return}if(labels&&files.length===1){importLabelsFile(labels);return}const fs=files.filter(x=>kindOf(x)!=='image'&&!/\.(mid|midi)$/i.test(x.name));if(!fs.length){toast('Scegli un file audio o video');return}if(pickMode==='insert'){pickMode='open';if(!A.buf){toast('Apri prima una regione nell’editor');return}await insertAudioFile(fs[0])}else await importAudioTracks(fs);return}
 for(const s of subs)importSubsFile(s);const media=files.filter(f=>kindOf(f));if(media.length)await importMedia(media);else if(!subs.length)toast('Formato non riconosciuto')}
function importLabelsFile(file){file.text().then(text=>{if(!A.buf){toast('Apri prima l’audio a cui appartengono i marcatori');return}const ms=parseLabels(text,A.rate).filter(m=>m.pos<=alen());if(!ms.length){toast('Nessun marcatore trovato nel file');return}metaEdit('Importa marcatori',()=>{A.markers.push(...ms);A.markers.sort((a,b)=>a.pos-b.pos)});$('markPane').hidden=false;refreshToggles();announce(`Importati ${ms.length} marcatori`)})}
const newAudio=()=>newAudioProject();
async function newVideo(){if(hasVideoWork()&&!(await confirmAction('Il montaggio attuale verrà chiuso. Se non l’hai salvato come progetto lo perdi: vuoi continuare?','Nuovo progetto')))return;await loadProject(newProject());$('docTitle').value=V.p.title;updateTitle();await gcMedia();announce('Nuovo progetto video vuoto: importa i file con Ctrl+I')}
async function goToDialog(){const audio=isAudio();if(audio&&!inEditorArea()){const r=await modal('Vai a un tempo del brano',`<p>Durata del brano: ${esc(fmtTime(projDur()))}.</p>`,[{id:'t',label:'Tempo',type:'time',value:fmtTime(P.t),hint:'Per esempio 83,5 oppure 1:23,5.'}],'Vai',{validate:v=>parseTime(v.t)>=0?null:{msg:'Tempo non valido',field:'t'}});if(!r)return;arSeek(parseTime(r.t),{say:true});arPlayheadEl.focus();return}if(audio&&!A.buf){toast('Nessuna regione nell’editor');return}const cur=audio?sec(A.cursor):V.t,max=audio?adur():totalDur();const r=await modal('Vai a un tempo',`<p>Durata totale: ${esc(fmtTime(max))}.</p>`,[{id:'t',label:'Tempo',type:'time',value:fmtTime(cur),hint:audio?'Per esempio 83,5 oppure 1:23,5.':'Per esempio 1:23,5, oppure ore:minuti:secondi:fotogrammi.'}],'Vai',{validate:v=>{const t=parseTime(v.t,audio?undefined:V.p.fps);return Number.isFinite(t)&&t>=0&&t<=max+0.001?null:{msg:'Tempo non valido o oltre la fine',field:'t'}}});if(!r)return;const t=parseTime(r.t,audio?undefined:V.p.fps);
 if(audio){moveCursor(smp(t),false);$('wave').focus()}else{seekTo(t,{say:true});playheadEl.focus()}}
async function selectRangeDialog(){if(!A.buf)return;const r=await modal('Seleziona un intervallo',`<p>Durata totale: ${esc(fmtTime(adur()))}.</p>`,[{id:'a',label:'Inizio',type:'time',value:fmtTime(sec(hasSel()?A.selA:A.cursor))},{id:'b',label:'Fine',type:'time',value:fmtTime(sec(hasSel()?A.selB:alen()))}],'Seleziona',{validate:v=>{const a=parseTime(v.a),b=parseTime(v.b);return !(a>=0)?{msg:'Inizio non valido',field:'a'}:!(b>a)?{msg:'La fine deve essere dopo l’inizio',field:'b'}:null}});if(!r)return;setSelection(smp(parseTime(r.a)),smp(parseTime(r.b)));$('wave').focus()}
function readVideoStatus(){const T=totalDur(),t=VE.playing?nowT():V.t,x=selected(),s=segAt(t),parts=[`${jobNow()}${VE.playing?'In riproduzione a':'Indicatore a'} ${sayTime(t,2)} di ${sayTime(T)}.`];
 parts.push(s?`Clip ${s.i+1} di ${V.p.main.length}: ${itemName('main',s.c)}${s.c.desc?' ('+s.c.desc.replace(/\s+/g,' ').slice(0,200)+')':''}${s.c.kind==='media'&&mediaMeta(s.c.media)?.type!=='image'?', '+sayTime(srcTime(s,t),1)+' dall’inizio del file':''}${s.c.mute?', audio della clip disattivato':s.c.volume!==1?`, volume ${Math.round(s.c.volume*100)}%`:''}${blendAt(t)?', '+blendAt(t):''}.`:'Nessuna clip qui.');
 const aud=audioHere(t);parts.push(aud.length?'Audio: '+aud.map(a=>audioWords(a,t)).join('; ')+'.':V.p.audio.length?'Nessun audio della traccia audio qui.':'');
 for(const y of V.p.titles)if(t>=y.start&&t<y.start+y.dur)parts.push(`Titolo ${itemName('titles',y)}, ${POS_NAME[y.pos]}.`);for(const y of V.p.subs)if(t>=y.start&&t<y.end)parts.push('Sottotitolo '+itemName('subs',y)+'.');
 parts.push(x?'Elemento scelto: '+itemName(V.sel.kind,x)+'.':'Nessun elemento scelto.',`Progetto ${V.p.w} per ${V.p.h}, ${V.p.fps} fotogrammi al secondo.`);toast(parts.filter(Boolean).join(' '))}
// Pannello File a schermo intero, gestito come finestra di dialogo.
const FILE_MENU={a:[['new','new','Nuovo progetto'],['open','open','Apri file audio o un progetto'],['saveAudioProject','backup','Salva il progetto (ZIP)'],['saveAudio','save','Esporta il brano (WAV, M4A, WebM)'],['exportStems','export','Esporta le tracce separate'],['exportMidi','export','Esporta la regione o la traccia MIDI (.mid)'],['exportParts','export','Esporta le parti della regione'],['exportLabels','export','Esporta i marcatori come testo'],['importLabels','import','Importa marcatori'],['insertFile','import','Inserisci un file al cursore'],['batchConvert','export','Converti più file'],['shortcuts','keyboard','Scorciatoie da tastiera'],['help','info','Informazioni e limiti']],
 v:[['new','new','Nuovo progetto'],['open','open','Apri un progetto o dei file'],['importMedia','import','Importa file multimediali'],['saveProject','save','Salva il progetto (ZIP)'],['exportVideo','film','Esporta il video'],['exportMix','music','Esporta solo l’audio'],['exportFrame','camera','Esporta il fotogramma'],['subExport','subs','Esporta i sottotitoli'],['shortcuts','keyboard','Scorciatoie da tastiera'],['help','info','Informazioni e limiti']]};
const FILE_TILES={a:[['open','open','Apri','File audio (ognuno in una traccia) o un progetto ZIP'],['saveAudio','save','Esporta il brano','Tutte le tracce mixate: WAV, M4A o WebM'],['recordAudio','mic','Registra','Sulla traccia scelta, ascoltando le altre'],['saveAudioProject','backup','Salva il progetto','Un file ZIP con tracce, regioni e suoni']],
 v:[['importMedia','import','Importa','Video, audio e immagini nella raccolta'],['saveProject','save','Salva il progetto','Un file ZIP con il montaggio e i suoi file'],['exportVideo','film','Esporta il video','MP4 o WebM, con i sottotitoli se vuoi'],['open','open','Apri','Un progetto ZIP, file multimediali o sottotitoli']]};
let filePrev=null;
function openFilePanel(){filePrev=document.activeElement;const m=state.mode[0],dd=(k,v)=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`;
 $('fileSide').innerHTML=`<button type="button" class="file-back" data-file-action="close">${ICON('back')}Torna ${isAudio()?'alle tracce':'al montaggio'}</button>`+FILE_MENU[m].map(([id,icon,label])=>`<button type="button" data-file-action="${id}">${ICON(icon)}${esc(label)}</button>`).join('');
 $('fileTiles').innerHTML=FILE_TILES[m].map(([id,icon,b,s])=>`<button type="button" class="file-tile" data-file-action="${id}">${ICON(icon)}<b>${esc(b)}</b><span>${esc(s)}</span></button>`).join('');
 $('fileIntro').textContent=isAudio()?'Il progetto resta sul tuo dispositivo: la bozza viene salvata nel browser; salvalo in ZIP per spostarlo o conservarlo, ed esporta il brano in WAV o in formato compresso.':'Il montaggio resta sul tuo dispositivo: la bozza e i file importati stanno nel browser; salva il progetto in ZIP per spostarlo o conservarlo.';
 $('fileDetails').innerHTML=isAudio()?dd('Nome',P.title)+dd('Durata',fmtTime(projDur())+' ('+sayTime(projDur())+')')+dd('Contenuto',`${P.tracks.length} tracce, ${P.regions.length} regioni`)+dd('Tempo',`${fmtNum(P.bpm,0)} BPM, ${P.sig}/4`)+dd('Nell’editor',A.region?'«'+(regionOf(A.region)?.name||'')+'»':'nessuna regione')+dd('Bozza',$('saveState').textContent):dd('Nome',V.p.title)+dd('Durata',fmtTime(totalDur()))+dd('Formato',`${V.p.w} × ${V.p.h}, ${V.p.fps} fotogrammi al secondo`)+dd('Contenuto',`${V.p.main.length} clip, ${V.p.titles.length} titoli, ${V.p.audio.length} audio, ${V.p.subs.length} sottotitoli`)+dd('File nella raccolta',`${V.p.media.length} (${fmtBytes(V.p.media.reduce((n,x)=>n+(x.size||0),0))})`)+dd('Bozza',$('saveState').textContent);
 $('filepanel').hidden=false;$('fileBtn').setAttribute('aria-expanded','true');$('fileSide').querySelector('button')?.focus()}
function closeFilePanel(restore=true){if($('filepanel').hidden)return;$('filepanel').hidden=true;$('fileBtn').setAttribute('aria-expanded','false');if(restore)(filePrev?.isConnected?filePrev:$('fileBtn')).focus()}
