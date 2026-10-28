// Barra di stato e zoom. Lo zoom è la variabile CSS --zoom; nel foglio la posizione di scorrimento segue la nuova scala.
// La barra di stato si vede e si sente: un lavoro che comincia («Apertura di…», «Esportazione della pagina 2 di 5…») viene
// annunciato; «Pronto» no, perché torna a ogni bozza salvata, e nemmeno gli esiti, che hanno già il loro messaggio.
function status(text){const el=$('statusText'),t=text||'Pronto';if(el.textContent===t)return;el.textContent=t;if(/…$/.test(t))announce(t)}
// Una bozza che non si salva va detta subito, una volta sola finché non torna a salvarsi: si vede solo nella barra in alto.
function draftFailed(msg){const label=$('saveState'),was=label.textContent==='Bozza non salvata';label.textContent='Bozza non salvata';status(msg);if(!was)toast(msg)}
function setZoom(value){const pct=Math.round(Math.min(160,Math.max(60,Number(value)||100))),root=document.documentElement,before=parseFloat(getComputedStyle(root).getPropertyValue('--zoom'))||1,after=pct/100,calc=state.mode==='excel';
 state.zoom=pct;if(calc&&cellEditorOpen())finishCell();
 const box=$('gridScroll'),top=box.scrollTop,left=box.scrollLeft,slider=$('zoomSlider');
 slider.value=pct;slider.setAttribute('aria-valuetext',pct+'%');$('zoomText').textContent=pct+'%';root.style.setProperty('--zoom',after);
 if(calc){const k=after/before;box.scrollTop=top*k;box.scrollLeft=left*k;renderedFirst=-1;renderGrid(true);syncChartViewport()}
 schedulePersist()}
