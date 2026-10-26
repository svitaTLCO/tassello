// Avvio: preferenze, archivio delle bozze e ultima bozza, poi il disegno dell'interfaccia.
async function start(){applyPrefs();try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}
 try{db=await dbOpen();await restoreDraft();setPaper(state.paper);setZoom(state.zoom);applyDocStyle();
  for(const draw of [renderTabs,renderRibbon,renderSheetTabs,updateWordStats,updateTitle])draw();
  if(!isWord()){renderGrid();renderCharts();updateExcelStats()}
  status('Pronto · i dati restano sul dispositivo')}
 catch(e){console.error('Avvio non riuscito',e);toast('Avvio non riuscito: '+e.message)}}
// Dal sito ufficiale, e non dal file aperto con un doppio clic, il programma si può installare come app
// che funziona anche senza rete e si aggiorna dal sito.
function enableInstall(){if(location.protocol==='file:'||!('serviceWorker' in navigator))return;
 document.head.append(Object.assign(document.createElement('link'),{rel:'manifest',href:'manifest.webmanifest'}));
 navigator.serviceWorker.register('sw.js').catch(()=>{})}
start().then(enableInstall);
})();
</script>
</body></html>
