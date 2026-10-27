// Registro unico dei comandi: barra multifunzione, ricerca comandi, menu, scorciatoie e guida leggono da qui.
// modes: 'i' Immagini; Disegno userà 'd' e i comandi comuni 'id'. g: la scorciatoia vale anche dentro i campi di testo.
// ctx: la scorciatoia vale solo con il focus in quell'area (photo, list).
const C={};
function def(modes,cat,list){for(const [id,label,icon,keys,extra] of list)C[id]={id,label,icon,keys:keys||'',modes,cat,...(extra||{})}}
const isImmagini=()=>state.mode==='immagini';
def('i','File',[
 ['open','Apri una foto','open','Ctrl+O',{g:1,short:'Apri'}],
 ['export','Esporta la foto (JPEG, PNG o WebP)','save','Ctrl+S',{g:1,short:'Esporta'}],
 ['closePhoto','Chiudi la foto','close','',{short:'Chiudi'}],
 ['filePanel','Apri il menu File','file','',{}]]);
def('i','Foto',[
 ['auto','Regolazione automatica della luce e del colore','wand','Ctrl+Maiusc+U',{g:1,short:'Automatica'}],
 ['compare','Mostra l’originale','compare','\\',{short:'Originale',toggle:()=>I.compare}],
 ['resetAll','Ripristina la foto com’era','history','Ctrl+Maiusc+R',{g:1,short:'Ripristina tutto'}],
 ['readStatus','Descrivi la foto e la sua luce','speak','Alt+Maiusc+I',{g:1,short:'Descrivi'}]]);
def('i','Inquadratura',[
 ['rotateLeft','Ruota a sinistra di 90 gradi','rotateL','',{short:'Ruota a sinistra'}],
 ['rotateRight','Ruota a destra di 90 gradi','rotate','',{short:'Ruota a destra'}],
 ['flipH','Rifletti da sinistra a destra','flip','',{short:'Rifletti',toggle:()=>I.r.flip}],
 ['ratioMenu','Formato dell’inquadratura','crop','',{menu:1,short:'Formato'}],
 ['straighten','Raddrizza…','level','',{short:'Raddrizza'}],
 ['resetGeometry','Togli rotazione, ritaglio e raddrizzamento','fit','',{short:'Inquadratura originale'}]]);
def('i','Look',[
 ['lookMenu','Scegli un look','filter','',{menu:1,short:'Look'}],
 ['lutImport','Importa un look da un file LUT (.cube)…','cube','',{short:'Importa LUT'}],
 ['lookAmount','Intensità del look…','gear','',{short:'Intensità'}],
 ['lookOff','Togli il look','close','',{short:'Nessun look'}]]);
def('i','Piani',[
 ['planMenu','Scegli un piano','plan','',{menu:1,short:'Piano'}],
 ['stepNext','Passo successivo del piano','right','Ctrl+Invio',{g:1,short:'Avanti'}],
 ['stepPrev','Passo precedente del piano','left','Ctrl+Maiusc+Invio',{g:1,short:'Indietro'}],
 ['stepAuto','Applica di nuovo la proposta del passo','wand','',{short:'Proposta'}],
 ['planFree','Tutti i controlli, senza piano','gear','',{short:'Tutti i controlli'}]]);
def('i','Generale',[
 ['palette','Cerca comando','search','Alt+Q',{g:1,short:'Cerca comando'}],
 ['shortcuts','Scorciatoie da tastiera','keyboard','F1 / Ctrl+/',{g:1,short:'Scorciatoie'}],
 ['help','Informazioni e limiti','info','',{short:'Informazioni'}],
 ['nextRegion','Vai all’area successiva','','F6',{g:1}],
 ['prevRegion','Vai all’area precedente','','Maiusc+F6',{g:1}],
 ['switchImmagini','Passa a Immagini','image','Ctrl+Alt+I',{g:1}],
 ['undo','Annulla','undo','Ctrl+Z',{short:'Annulla'}],
 ['redo','Ripeti','redo','Ctrl+Y / Ctrl+Maiusc+Z',{short:'Ripeti'}],
 ['themeDark','Tema scuro','moon','',{short:'Tema scuro',toggle:()=>prefs.theme==='dark'}],
 ['contrast','Contrasto elevato','contrast','',{short:'Contrasto elevato',toggle:()=>prefs.contrast}]]);
const KEYNAME={Invio:'enter',Spazio:' ',Canc:'delete',Esc:'escape',PgSu:'pageup',PgGiù:'pagedown',Home:'home',Fine:'end','←':'arrowleft','→':'arrowright','↑':'arrowup','↓':'arrowdown',Tab:'tab'};
const keyCache=new Map();
function parseKey(s){let key,mods;if(s.endsWith('++')){key='+';mods=s.slice(0,-2).split('+')}else{const p=s.split('+');key=p.pop();mods=p}return{ctrl:mods.includes('Ctrl'),alt:mods.includes('Alt'),shift:mods.includes('Maiusc'),key:(KEYNAME[key]||key).toLowerCase()}}
const keysOf=c=>c.keys;
function parsedKeys(spec){if(!keyCache.has(spec))keyCache.set(spec,spec?spec.split(' / ').map(parseKey):[]);return keyCache.get(spec)}
function keyMatch(e,k){if((e.ctrlKey||e.metaKey)!==k.ctrl||e.altKey!==k.alt)return false;const sym=k.key.length===1&&!/[a-z0-9 ]/.test(k.key);if(!sym&&e.shiftKey!==k.shift)return false;const ek=e.key.toLowerCase();if(ek===k.key)return true;if(/^[a-z0-9]$/.test(k.key)&&(!(e.ctrlKey&&e.altKey)||/\d/.test(k.key)))return e.code===(/\d/.test(k.key)?'Digit':'Key')+k.key.toUpperCase();if(k.key===' '&&e.code==='Space')return true;return false}
function ariaKeys(spec){const M={Ctrl:'Control',Maiusc:'Shift',Alt:'Alt',Invio:'Enter',Spazio:'Space',Canc:'Delete',PgSu:'PageUp',PgGiù:'PageDown','←':'ArrowLeft','→':'ArrowRight','↑':'ArrowUp','↓':'ArrowDown',Esc:'Escape'};return spec.split(' / ').map(s=>s.split('+').map(p=>M[p]||p).join('+')).join(' ')}
const kbdHtml=spec=>spec.split(' / ').map(s=>s.split('+').map(p=>`<kbd>${esc(p)}</kbd>`).join('+')).join(' o ');
const available=c=>c.modes.includes(state.mode[0]);
function focusContext(){const a=document.activeElement;if(!a||a===document.body)return 'other';if(a.id==='photo')return 'photo';if(a.classList.contains('lb'))return 'list';if(a.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),textarea,select'))return 'input';return 'other'}
function findShortcut(e,ctx){let fallback=null;for(const c of Object.values(C)){const spec=keysOf(c);if(!spec||!available(c))continue;if(c.ctx&&c.ctx!==ctx)continue;if(ctx==='input'&&!c.g)continue;if(parsedKeys(spec).some(k=>keyMatch(e,k))){if(c.ctx===ctx)return c;fallback??=c}}return fallback}
const safe=fn=>{try{return fn()}catch(e){return false}};
async function runCommand(id){const c=C[id];if(!c)return;if(!available(c)){toast('«'+c.label+'» non è disponibile in Immagini');return}hideTip();
 try{await handleAction(id)}catch(e){console.error(e);toast(e.message||String(e));return}
 if(c.toggle&&!c.quiet){refreshToggles();announce(c.label+(safe(c.toggle)?' attivato':' disattivato'))}else{if(c.say)announce(c.say);refreshToggles()}}
let toggleTimer;function refreshToggles(){clearTimeout(toggleTimer);toggleTimer=setTimeout(()=>{for(const b of $$('#ribbon [aria-pressed][data-action],#viewbar [aria-pressed][data-action],#adjBody [aria-pressed][data-action]')){const c=C[b.dataset.action];if(c?.toggle)b.setAttribute('aria-pressed',!!safe(c.toggle))}},40)}
// Ricerca comandi (Alt+Q): combobox con elenco filtrato, navigabile con le frecce.
let palItems=[],palIdx=0,palPrev=null;
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function openPalette(){palPrev=document.activeElement;$('palettebg').hidden=false;$('palInput').value='';renderPalette();$('palInput').focus()}
function closePalette(restore=true){$('palettebg').hidden=true;if(restore)refocus(palPrev)}
function renderPalette(){const q=norm($('palInput').value.trim()),all=Object.values(C).filter(c=>available(c)&&c.id!=='palette');palItems=(q?all.map(c=>{const hay=norm(c.label+' '+(c.short||'')+' '+c.cat+' '+c.id);const sc=norm(c.label).startsWith(q)?4:hay.includes(q)?3:q.split(/\s+/).every(w=>hay.includes(w))?2:0;return[c,sc]}).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]):all).slice(0,80);palIdx=0;
 $('palList').innerHTML=palItems.length?palItems.map((c,i)=>{const k=keysOf(c),on=c.toggle?safe(c.toggle):null;return `<div role="option" id="pal-${i}" class="pal-opt" data-i="${i}" aria-selected="${i===0}">${ICON(c.icon)}<span class="pal-label">${esc(c.label)}${on===null?'':`<span class="sr-only">, ${on?'attivo':'non attivo'}</span>`}${k?`<span class="sr-only">, scorciatoia ${esc(k)}</span>`:''}</span><span class="pal-cat" aria-hidden="true">${esc(c.cat)}</span>${k?`<kbd aria-hidden="true">${esc(k)}</kbd>`:''}</div>`}).join(''):'<div class="pal-empty" role="option" aria-disabled="true" aria-selected="false" id="pal-empty">Nessun comando trovato</div>';palActive()}
function palActive(){$$('#palList [role=option]').forEach((o,i)=>o.setAttribute('aria-selected',i===palIdx&&!!palItems.length));const id=palItems.length?'pal-'+palIdx:'pal-empty';$('palInput').setAttribute('aria-activedescendant',id);$(id)?.scrollIntoView({block:'nearest'})}
function palRun(i){const c=palItems[i];if(!c)return;closePalette(true);setTimeout(()=>runCommand(c.id),0)}
// Menu contestuale generico (ruolo menu, frecce, Invio, Esc).
let menuState=null;
function openMenu(items,x,y,label='Menu',opener=null){closeMenu(false);const m=$('menu'),prev=document.activeElement;opener?.setAttribute('aria-expanded','true');m.setAttribute('aria-label',label);m.innerHTML=items.map((it,i)=>it==='-'?'<div class="menu-sep" role="separator"></div>':`<button type="button" role="${it.checked===undefined?'menuitem':'menuitemradio'}"${it.checked===undefined?'':` aria-checked="${!!it.checked}"`} tabindex="-1" data-i="${i}"${it.disabled?' aria-disabled="true"':''}>${it.checked===undefined?ICON(it.icon):`<span class="mi-check" aria-hidden="true">${it.checked?'✓':''}</span>`}<span class="mi-text"><span class="mi-label">${esc(it.label)}</span>${it.desc?`<span class="mi-desc">${esc(it.desc)}</span>`:''}</span>${it.keys?`<kbd aria-hidden="true">${esc(it.keys)}</kbd>`:''}</button>`).join('');m.hidden=false;const w=m.offsetWidth,h=m.offsetHeight;m.style.left=Math.max(4,Math.min(x,innerWidth-w-4))+'px';m.style.top=Math.max(4,Math.min(y,innerHeight-h-4))+'px';menuState={items,prev,opener};(m.querySelector('[aria-checked=true]:not([aria-disabled])')||m.querySelector('[role^=menuitem]:not([aria-disabled])'))?.focus()}
function closeMenu(restore=true){if(!menuState)return;const p=menuState.prev;menuState.opener?.setAttribute('aria-expanded','false');menuState=null;$('menu').hidden=true;if(restore)refocus(p)}
function menuRun(i){const it=menuState?.items[i];if(!it||it.disabled)return;closeMenu(true);setTimeout(()=>it.run(),0)}
const mi=(id,run)=>{const c=C[id];return{label:c.label,icon:c.icon,keys:keysOf(c),run:run||(()=>runCommand(id))}};
// Posizione per un menu aperto da un pulsante della barra, o dall'elemento con il focus.
function menuAnchor(action){const el=document.querySelector(`#ribbon [data-action="${action}"]`)||document.activeElement,r=el?.getBoundingClientRect?.()||{left:200,bottom:200};return{x:r.left,y:r.bottom,el:el?.closest?.('#ribbon')?el:null}}
// Scorciatoie che dipendono dall'area con il focus: non passano dal registro, ma la guida le elenca.
const STATIC_KEYS={g:[['Navigazione generale',[['Passa tra le aree','F6 / Maiusc+F6'],['Schede della barra multifunzione','← → poi Invio o ↓'],['Torna alla scheda dalla barra','Esc o ↑'],['Chiudi finestre e menu','Esc']]]],
 i:[['Sulla foto',[['Descrivi la foto e la sua luce','Alt+Maiusc+I'],['Mostra l’originale finché non premi di nuovo','\\'],['Menu della foto','Maiusc+F10']]],['Nei piani',[['Scegli un piano','↑ ↓'],['Primo o ultimo piano','Home / Fine'],['Inizia il piano dal primo passo','Invio']]],['Nei cursori delle regolazioni',[['Cambia il valore di un passo','← → o ↑ ↓'],['Cambia il valore di un passo ampio','PgSu / PgGiù'],['Valore minimo o massimo','Home / Fine'],['Riporta a zero','Canc']]]]};
function shortcutsHtml(){const m=state.mode[0],groups=new Map();for(const c of Object.values(C)){const k=keysOf(c);if(!k||!available(c))continue;if(!groups.has(c.cat))groups.set(c.cat,[]);groups.get(c.cat).push([c.label,k])}const table=(cap,rows,raw)=>`<table><caption>${esc(cap)}</caption><thead><tr><th scope="col">Azione</th><th scope="col">Tasti</th></tr></thead><tbody>${rows.map(([a,k])=>`<tr><th scope="row">${esc(a)}</th><td>${raw?esc(k):kbdHtml(k)}</td></tr>`).join('')}</tbody></table>`;return `<p>Scorciatoie per Immagini. Su Mac usa Cmd al posto di Ctrl. Puoi trovare ogni comando anche con <kbd>Alt</kbd>+<kbd>Q</kbd>.</p><div class="kcols">${[...STATIC_KEYS.g,...STATIC_KEYS[m]].map(([cap,rows])=>table(cap,rows,true)).join('')}${[...groups].map(([cap,rows])=>table(cap,rows)).join('')}</div>`}
async function showShortcuts(){await modal('Scorciatoie da tastiera',shortcutsHtml(),[],'Chiudi',{noCancel:true,wide:true})}
async function help(){await modal('Tassello Grafica',`<p><b>Tassello Grafica {{VERSIONE}}</b> fa parte di <b>Tassello</b>, una famiglia di piccoli strumenti liberi e gratuiti per lavorare sui propri file: un coltellino svizzero, ordinato e leggero. Sta in un solo file HTML che funziona nel browser anche senza rete, senza programmi da installare e senza account. Questa è una versione di prova: contiene <b>Immagini</b>, per migliorare le foto passo per passo; <b>Disegno</b>, per comporre immagini e grafica vettoriale, è in preparazione. Le foto restano sul tuo computer.</p><p><b>Copia ufficiale:</b> scarica Tassello solo dal sito <b>svitatlco.github.io/tassello</b> o dalle release su GitHub (<b>github.com/svitaTLCO/tassello</b>). Se questo file ti è arrivato per email, in chat o su una chiavetta, scaricalo di nuovo da lì prima di usarlo; per far conoscere Tassello, condividi il link invece del file. Sul sito puoi controllare un file con la pagina Verifica. Questo programma non si collega a internet e non chiede mai password, account o pagamenti: una copia che lo fa non è quella ufficiale.</p><p><b>Cosa non è:</b> Tassello Grafica non sostituisce i programmi di fotoritocco professionali e non è un clone delle app famose. Ha un disegno suo, con le funzioni che servono per il lavoro di tutti i giorni (una foto per i social, un ritratto, un documento da rendere leggibile) tutte raggiungibili da tastiera.</p><p><b>Accessibilità:</b> per Tassello non è un di più ma la condizione per distribuire ogni strumento: tutto si usa con uno screen reader e con la sola tastiera. F6 passa tra le aree, Alt+Q cerca qualsiasi comando, F1 elenca le scorciatoie. Alt+Maiusc+I descrive la foto: dimensioni, inquadratura, luminosità media, quanta parte è bruciata nelle luci o chiusa nelle ombre, e le regolazioni cambiate. Ogni regolazione è un cursore con il suo nome e il suo valore; Canc la riporta a zero. L’istogramma è descritto a parole sotto il grafico, e se una modifica brucia le luci o chiude le ombre lo senti subito.</p><p><b>Immagini:</b> i <b>piani</b> ti guidano secondo quello che vuoi ottenere (foto per i social, ritratto, paesaggio, documento o scontrino, prodotto su fondo chiaro): un passo alla volta, solo i controlli che servono, con una proposta automatica da accettare o ritoccare. Con <b>Tutti i controlli</b> lavori senza piano. Inquadratura: rotazione, riflessione, raddrizzamento e formati pronti (quadrato, 4:5, 9:16, 3:2, 16:9, A4). Luce: esposizione, contrasto, alte luci, ombre, bianchi e neri. Colore: temperatura, tinta, vividezza e saturazione. Vignettatura. Look pronti (bianco e nero, seppia, caldo, freddo, pellicola, vivace, tenue) e look importati da file LUT .cube, con la loro intensità. Apre JPEG, PNG, WebP, AVIF, GIF e BMP; esporta JPEG, PNG o WebP alla dimensione che scegli.</p><p><b>Privacy:</b> la foto resta nel browser e sul tuo computer; l’originale non viene mai modificato. Il file esportato non contiene i dati della fotocamera né la posizione in cui è stata scattata la foto. Questo vale per la copia ufficiale: una copia modificata da altri può comportarsi in modo diverso.</p><p><b>Limiti:</b> Immagini lavora su una foto alla volta. Le foto HEIC degli iPhone e i file RAW delle fotocamere non si aprono: esportale prima in JPEG. Non ci sono ancora pennelli, ritocchi locali, nitidezza e riduzione del rumore; l’anteprima è ridotta alla dimensione dello schermo e la foto intera viene calcolata all’esportazione. Il file esportato è in sRGB, a 8 bit per canale. Conserva sempre una copia degli originali.</p>`,[],'Chiudi',{noCancel:true})}
// Aree raggiungibili con F6 e Maiusc+F6.
function regions(){const l=[$('titlebar'),$('tabrow'),$('ribbon'),$('planList').closest('.plans'),$('stage'),$('viewbar'),$('adjBody').closest('.adjust'),$('statusbar')];return l.filter(el=>el.offsetWidth||el.offsetHeight)}
const REGION_NAME={titlebar:'Barra del titolo',tabrow:'Schede della barra multifunzione',ribbon:'Barra multifunzione',viewbar:'Vista della foto',statusbar:'Barra di stato'};
function focusRegion(el){if(el.id==='tabrow'){$('tab-'+slug(currentTab))?.focus();return}if(el.classList.contains('plans')){$('planList').focus();return}if(el.id==='stage'){(I.bmp?$('photo'):focusables(el)[0])?.focus();return}if(el.classList.contains('adjust')){(focusables($('stepHead'))[0]||focusables($('adjBody'))[0]||focusables(el)[0])?.focus();announce('Regolazioni');return}focusables(el)[0]?.focus()}
function cycleRegion(dir){const list=regions(),a=document.activeElement;let i=list.findIndex(r=>r.contains(a));i=i<0?(dir>0?0:list.length-1):(i+dir+list.length)%list.length;focusRegion(list[i]);const name=REGION_NAME[list[i].id];if(name)announce(name)}
