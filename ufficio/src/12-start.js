async function start(){applyPrefs();try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}try{db=await dbOpen();await restoreDraft();setPaper(state.paper);setZoom(state.zoom);applyDocStyle();renderTabs();renderRibbon();renderSheetTabs();updateWordStats();updateTitle();if(!isWord()){renderGrid();renderCharts();updateExcelStats()}status('Pronto · i dati restano sul dispositivo')}catch(e){console.error('Errore di avvio',e);toast('Errore di inizializzazione: '+e.message)}}
start();
})();
</script>
</body></html>
