// Avvio: preferenze, archivio delle bozze, ultimo audio e ultimo progetto, poi il disegno dell'interfaccia.
redrawAll=()=>{if(isAudio())drawAudio();else{drawTimeline();requestFrame()}};
async function start(){applyPrefs();$('stepSel').value=String(prefs.step);if(!$('stepSel').value){prefs.step=0.1;$('stepSel').value='0.1'}$('vSubs').setAttribute('aria-pressed',prefs.showSubs);
 suppressAutosave=true;try{db=await openStore();await restoreAudio().catch(e=>console.warn('Bozza audio non recuperabile',e));await restoreVideo().catch(e=>console.warn('Progetto video non recuperabile',e));await gcMedia();const ui=await dbGet('ui').catch(()=>null);if(ui?.mode==='video')setMode('video',{focus:false})}
 catch(e){console.error('Avvio non riuscito',e);toast('Avvio non riuscito: '+e.message)}finally{suppressAutosave=false}
 $('docTitle').value=isAudio()?A.title:V.p.title;updateTitle();renderTabs();renderRibbon();resizeCanvas();zoomFitAudio();updateAudioUI();renderLibrary();renderInspector();drawTimeline();updateVideoUI();
 status(db?'Pronto · i file restano sul dispositivo':'Pronto · il browser non permette di salvare le bozze: esporta il lavoro prima di chiudere')}
// Dal sito ufficiale, e non dal file aperto con un doppio clic, il programma si può installare come app
// che funziona anche senza rete e si aggiorna dal sito.
function enableInstall(){if(location.protocol==='file:'||!('serviceWorker' in navigator))return;
 document.head.append(Object.assign(document.createElement('link'),{rel:'manifest',href:'manifest-media.webmanifest'}));
 navigator.serviceWorker.register('sw.js').catch(()=>{})}
start().then(enableInstall);
})();
</script>
</body></html>
