// Barra di stato e zoom. Lo zoom è la variabile CSS --zoom; nel foglio la posizione di scorrimento segue la nuova scala.
function status(text){$('statusText').textContent=text||'Pronto'}
function setZoom(value){const pct=Math.round(Math.min(160,Math.max(60,Number(value)||100))),root=document.documentElement,before=parseFloat(getComputedStyle(root).getPropertyValue('--zoom'))||1,after=pct/100,calc=state.mode==='excel';
 state.zoom=pct;if(calc&&cellEditorOpen())finishCell();
 const box=$('gridScroll'),top=box.scrollTop,left=box.scrollLeft,slider=$('zoomSlider');
 slider.value=pct;slider.setAttribute('aria-valuetext',pct+'%');$('zoomText').textContent=pct+'%';root.style.setProperty('--zoom',after);
 if(calc){const k=after/before;box.scrollTop=top*k;box.scrollLeft=left*k;renderedFirst=-1;renderGrid(true);syncChartViewport()}
 schedulePersist()}
