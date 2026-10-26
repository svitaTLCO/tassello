// Avvio: preferenze, archivio delle bozze e ultima bozza, poi il disegno dell'interfaccia.
async function start(){applyPrefs();try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}
 try{db=await dbOpen();await restoreDraft();setPaper(state.paper);setZoom(state.zoom);applyDocStyle();
  for(const draw of [renderTabs,renderRibbon,renderSheetTabs,updateWordStats,updateTitle])draw();
  if(!isWord()){renderGrid();renderCharts();updateExcelStats()}
  status('Pronto · i dati restano sul dispositivo')}
 catch(e){console.error('Avvio non riuscito',e);toast('Avvio non riuscito: '+e.message)}}
start();
})();
</script>
</body></html>
