// Barra multifunzione: "!" pulsante grande, "/" nuova riga di pulsanti piccoli, suffisso "+" mostra l'etichetta.
const RIBBON={
 a:{Tracce:[['Tracce','!newTrack !importTrack !recordAudio'],['Traccia scelta','!trackSettings trackMute+ / trackSolo+ trackRename+ / trackDuplicate+ trackDelete+'],['Regione scelta','!regionEdit regionSplit+ / regionDuplicate+ regionLoop+ / regionDelete+ regionProps+'],['Tempo','!tempoSettings metronome+ / countInToggle+ / cycle+'],['Riproduzione','!playPause stop+ / cycleRegion+'],['Cronologia','!undo !redo']],
  Editor:[['Appunti','!paste cut / copy pasteMix+'],['Modifica','!deleteSel !trim silence+ / duplicate+ insertSilence+'],['Selezione','!selectAll selectRange+ / selectNone+ selMarkers+'],['Ascolto','!playRegion !playSel loop+ / scrub+'],['Cronologia','!undo !redo']],
  Effetti:[['Volume','!amplify !normalize fadeIn+ / fadeOut+'],['Tempo','!speed !tempo reverse+ / truncate+'],['Pulizia','!noiseGate captureNoise+ / !eq compressor+ / removeDC+ echo+'],['Canali','toMono+ / toStereo+ / swapChannels+'],['Formato','!resample'],['Ripeti','!repeatEffect']],
  Inserisci:[['Suoni','!insertFile !generate !recordAudio'],['Marcatori','!markerAdd markerPrev+ / markerNext+ markerRename+ / markerDelete+ markersClear+'],['Automatici','!markersFromPauses']],
  Analisi:[['Misura','!stats !readLevel'],['Pause','!prevPause !nextPause !pauseSettings'],['Distorsioni','!findClip']],
  Esporta:[['Brano','!saveAudio !exportStems !saveAudioProject'],['Regione','!exportParts'],['Marcatori','!exportLabels !importLabels']],
  Vista:[['Zoom','!zoomIn !zoomOut !zoomFit !zoomSel'],['Mostra','!toggleEditor !markPane !follow !snap'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette !help']]},
 v:{Inizio:[['Appunti','!paste cut / copy'],['File','!importMedia !addToTimeline'],['Montaggio','!split trimStart+ / trimEnd+ duplicateItem+ / deleteItem+'],['Posizione','moveEarlier+ swapPrev+ / moveLater+ swapNext+ / snap+'],['Riproduzione','!playPause stop+ / prevEdit+ nextEdit+'],['Cronologia','!undo !redo']],
  Inserisci:[['Testo','!addTitle !addSub !addCard'],['Audio','!recordVoice'],['File','!importMedia']],
  Clip:[['Transizione','!transitionMenu'],['Aspetto','!filterMenu !adjust rotate+ / flip+ fitMode+'],['Tempo e suono','!clipSpeed !clipVolume clipMute+ / fadeInV+ fadeOutV+']],
  Sottotitoli:[['Sottotitoli','!addSub !subImport !subExport'],['Visualizzazione','!subShow !subBurn']],
  Esporta:[['Video','!exportVideo !exportMix !exportFrame'],['Progetto','!saveProject !projectSettings'],['Accessibilità','!a11yCheck']],
  Vista:[['Zoom','!zoomIn !zoomOut !zoomFit'],['Mostra','!follow !subShow !snap'],['Tema','!themeDark !contrast'],['Guida','!shortcuts !palette !help']]}};
const TABS={a:Object.keys(RIBBON.a),v:Object.keys(RIBBON.v)};
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
