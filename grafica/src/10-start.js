// Avvio: preferenze, archivio delle bozze, ultima foto con la sua ricetta, poi il disegno dell'interfaccia.
async function start(){applyPrefs();
 suppressAutosave=true;try{db=await openStore();await restorePhoto().catch(e=>console.warn('Bozza della foto non recuperabile',e))}
 catch(e){console.error('Avvio non riuscito',e);toast('Avvio non riuscito: '+e.message)}finally{suppressAutosave=false}
 planCursor=Math.max(0,PLANS.findIndex(p=>p.id===I.plan));updateTitle();renderTabs();renderRibbon();renderPlans();renderPanel();showPhoto();refreshToggles();
 status(db?'Pronto · le foto restano sul dispositivo':'Pronto · il browser non permette di salvare le bozze: esporta la foto prima di chiudere')}
// Dal sito ufficiale, e non dal file aperto con un doppio clic, il programma si potrà installare come app;
// il manifest e la copia senza rete si aggiungono quando Tassello Grafica viene pubblicato.
start();
})();
</script>
</body></html>
