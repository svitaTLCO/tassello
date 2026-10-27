// Barra multifunzione: "!" pulsante grande, "/" nuova riga di pulsanti piccoli, suffisso "+" mostra l'etichetta.
const RIBBON={
 i:{Inizio:[['Foto','!open !export'],['Regolazioni','!auto !compare / resetAll+ / readStatus+'],['Piano','!planMenu stepPrev+ / stepNext+ / planFree+'],['Cronologia','!undo !redo']],
  Inquadra:[['Ruota','!rotateLeft !rotateRight / flipH+'],['Formato','!ratioMenu !straighten / resetGeometry+']],
  Look:[['Look','!lookMenu !lutImport / lookAmount+ / lookOff+']],
  Vista:[['Confronto','!compare'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette !help']]},
 d:{Inizio:[['Disegno','!openDraw !saveSvg !exportDraw'],['Appunti','!paste cut / copy / duplicateItem+'],['Inserisci','!addText !addImage / addRect+ / addEllipse+'],['Cronologia','!undo !redo']],
  Inserisci:[['Forme','!addRect !addEllipse !addLine'],['Testo','!addText'],['Immagini','!addImage']],
  Disponi:[['Ordine','!bringFront !sendBack / forward+ / backward+'],['Allinea al foglio','alignLeft alignCenter alignRight / alignTop alignMiddle alignBottom'],['Oggetto','!duplicateItem !deleteItem / readDraw+']],
  Foglio:[['Foglio','!sheetSize !sheetDesc / newDraw+'],['Accessibilità','!a11yCheck']],
  Vista:[['Zoom','!zoomIn !zoomOut !zoomFit'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette !help']]}};
const TABS={i:Object.keys(RIBBON.i),d:Object.keys(RIBBON.d)};
let currentTab='Inizio';
const slug=s=>s.replace(/\s+/g,'-');
function tipText(c){const k=keysOf(c);return c.label+(k?' ('+k+')':'')}
function cmdButton(id,size,showLabel){const c=C[id];if(!c||!available(c))return '';const pressed=c.toggle?` aria-pressed="${!!safe(c.toggle)}"`:'',k=keysOf(c),keys=(k?` aria-keyshortcuts="${esc(ariaKeys(k))}"`:'')+(c.menu?' aria-haspopup="menu" aria-expanded="false"':'');
 if(size==='lg')return `<button type="button" class="tool lg" data-action="${id}"${pressed}${keys} data-tip="${esc(tipText(c))}">${ICON(c.icon)}<span class="lbl">${esc(c.short||c.label)}${c.menu?ICON('down','ico chev'):''}</span>${c.short&&c.short!==c.label?`<span class="sr-only">: ${esc(c.label)}</span>`:''}</button>`;
 return `<button type="button" class="tool" data-action="${id}"${pressed}${keys} data-tip="${esc(tipText(c))}"${showLabel?'':` aria-label="${esc(c.label)}"`}>${ICON(c.icon)}${showLabel?`<span class="lbl">${esc(c.short||c.label)}</span>${c.short&&c.short!==c.label?`<span class="sr-only">: ${esc(c.label)}</span>`:''}`:''}</button>`}
function renderGroup([name,spec],gi){let out='',stack=[[]];const flush=()=>{const rows=stack.filter(r=>r.length);if(rows.length)out+=`<div class="rbstack">${rows.map(r=>`<div class="rbrow">${r.join('')}</div>`).join('')}</div>`;stack=[[]]};
 for(const tok of spec.split(' ')){if(tok==='/'){stack.push([]);continue}if(tok[0]==='!'){flush();out+=cmdButton(tok.slice(1),'lg')}else stack.at(-1).push(cmdButton(tok.replace(/\+$/,''),'sm',tok.endsWith('+')))}
 flush();return `<div class="rbgroup" role="group" aria-labelledby="rbg${gi}"><div class="rbitems">${out}</div><div class="rb-label" id="rbg${gi}">${esc(name)}</div></div>`}
function renderTabs(){const t=TABS[state.mode[0]];if(!t.includes(currentTab))currentTab=t[0];$('tabs').innerHTML=t.map(x=>`<button type="button" role="tab" class="tab" id="tab-${slug(x)}" data-tab="${esc(x)}" aria-selected="${x===currentTab}" aria-controls="ribbon" tabindex="${x===currentTab?0:-1}">${esc(x)}</button>`).join('')}
function renderRibbon(){const groups=RIBBON[state.mode[0]][currentTab]||[];$('ribbon').setAttribute('aria-labelledby','tab-'+slug(currentTab));$('ribbon').innerHTML=`<div class="ribbon-inner">${groups.map(renderGroup).join('')}</div>`}
function selectTab(name,focus=true){currentTab=name;renderTabs();renderRibbon();if(focus)$('tab-'+slug(name))?.focus()}
