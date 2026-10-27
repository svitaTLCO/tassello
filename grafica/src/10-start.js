// Avvio: preferenze, archivio delle bozze, ultima foto con la sua ricetta e ultimo disegno, poi l'interfaccia
// nell'app usata per ultima.
async function start(){applyPrefs();
 suppressAutosave=true;try{db=await openStore();await restorePhoto().catch(e=>console.warn('Bozza della foto non recuperabile',e));await restoreDrawing().catch(e=>console.warn('Bozza del disegno non recuperabile',e))}
 catch(e){console.error('Avvio non riuscito',e);toast('Avvio non riuscito: '+e.message)}finally{suppressAutosave=false}
 planCursor=Math.max(0,PLANS.findIndex(p=>p.id===I.plan));$('docTitle').value=I.title;updateTitle();renderTabs();renderRibbon();renderPlans();renderPanel();showPhoto();renderLayers();renderProps();refreshToggles();
 const ui=await dbGet('ui').catch(()=>null);if(ui?.mode==='disegno'){suppressAutosave=true;setMode('disegno',{focus:false});suppressAutosave=false}
 status(db?'Pronto · i file restano sul dispositivo':'Pronto · il browser non permette di salvare le bozze: esporta il lavoro prima di chiudere')}
// Dal sito ufficiale, e non dal file aperto con un doppio clic, il programma si potrà installare come app;
// il manifest e la copia senza rete si aggiungono quando Tassello Grafica viene pubblicato.
start();
})();
</script>
</body></html>
