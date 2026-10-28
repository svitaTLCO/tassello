// Registro unico dei comandi: barra multifunzione, ricerca comandi, menu e guida alle scorciatoie leggono da qui.
const inEditor=()=>{const sel=getSelection();return sel.rangeCount>0&&$('wordEditor').contains(sel.anchorNode)};
const qs=cmd=>{if(!inEditor())return false;try{return document.queryCommandState(cmd)}catch(e){return false}};
const blockTag=()=>{if(!inEditor())return '';try{return String(document.queryCommandValue('formatBlock')||'').toLowerCase()}catch(e){return ''}};
const cs=key=>!!cell(state.sel.r,state.sel.c)?.s?.[key];
// Le tre app: Testo ('word', lettera w), Calcolo ('excel', x) e Impagina ('impagina', p). Ogni comando dichiara in modes le lettere delle app in cui vale.
const isWord=()=>state.mode==='word',isCalc=()=>state.mode==='excel',isPage=()=>state.mode==='impagina';
const MODE_KEY={word:'w',excel:'x',impagina:'p'},APP_NAME={word:'Testo',excel:'Calcolo',impagina:'Impagina'};
const modeKey=()=>MODE_KEY[state.mode],appName=()=>APP_NAME[state.mode];
const C={};
function def(modes,cat,list){for(const [id,label,icon,keys,extra] of list)C[id]={id,label,icon,keys:keys||'',modes,cat,...(extra||{})}}
def('wx','File',[
 ['save','Salva file (DOCX o XLSX)','save','Ctrl+S',{g:1,short:'Salva'}],
 ['backup','Salva progetto completo (JSON)','backup','',{short:'Progetto JSON'}]]);
def('wxp','File',[
 ['open','Apri file','open','Ctrl+O',{g:1,short:'Apri'}],
 ['new','Nuovo file','new','Ctrl+Alt+N',{g:1,short:'Nuovo'}],
 ['print','Stampa o salva come PDF','print','Ctrl+P',{g:1,short:'Stampa / PDF'}],
 ['filePanel','Apri il menu File','file','',{}]]);
def('w','File',[['exportHtml','Esporta come pagina HTML','export','',{short:'Esporta HTML'}]]);
def('x','File',[['exportCSV','Esporta il foglio in CSV','export','',{short:'Esporta CSV'}],['importCSV','Importa un file CSV','import','',{short:'Importa CSV'}]]);
def('wxp','Generale',[
 ['palette','Cerca comando','search','Alt+Q',{g:1,short:'Cerca comando'}],
 ['shortcuts','Scorciatoie da tastiera','keyboard','F1 / Ctrl+/',{g:1,short:'Scorciatoie'}],
 ['help','Informazioni e limiti','info','',{short:'Informazioni'}],
 ['nextRegion','Vai all’area successiva','','F6',{g:1}],
 ['prevRegion','Vai all’area precedente','','Maiusc+F6',{g:1}],
 ['switchWord','Passa a Testo','t:T','Ctrl+Alt+W',{g:1}],
 ['switchExcel','Passa a Calcolo','t:C','Ctrl+Alt+X',{g:1}],
 ['switchPage','Passa a Impagina','t:I','Ctrl+Alt+I',{g:1}],
 ['undo','Annulla','undo','Ctrl+Z',{short:'Annulla'}],
 ['redo','Ripeti','redo','Ctrl+Y / Ctrl+Maiusc+Z',{short:'Ripeti'}],
 ['zoomUp','Aumenta zoom','zoomIn','',{short:'Zoom avanti'}],
 ['zoomDown','Riduci zoom','zoomOut','',{short:'Zoom indietro'}],
 ['zoomReset','Zoom al 100%','t:1:1','',{short:'100%'}],
 ['themeDark','Tema scuro','moon','',{short:'Tema scuro',toggle:()=>prefs.theme==='dark'}],
 ['contrast','Contrasto elevato','contrast','',{short:'Contrasto elevato',toggle:()=>prefs.contrast}]]);
def('wx','Generale',[
 ['readStatus','Leggi posizione e formattazione','speak','Alt+Maiusc+I',{g:1,short:'Leggi stato'}],
 ['cut','Taglia','cut','Ctrl+X',{native:1}],
 ['copy','Copia','copy','Ctrl+C',{native:1}],
 ['paste','Incolla','paste','Ctrl+V',{native:1,short:'Incolla'}],
 ['find','Trova','search','Ctrl+F',{g:1,short:'Trova'}],
 ['replace','Sostituisci','replace','Ctrl+H',{g:1,short:'Sostituisci'}],
 ['findNext','Trova successivo','down','F3',{g:1}],
 ['findPrev','Trova precedente','up','Maiusc+F3',{g:1}]]);
def('wx','Formato carattere',[
 ['bold','Grassetto','t:<b>G</b>','Ctrl+B',{toggle:()=>isWord()?qs('bold'):isCalc()&&cs('bold')}],
 ['italic','Corsivo','t:<i>C</i>','Ctrl+I',{toggle:()=>isWord()?qs('italic'):isCalc()&&cs('italic')}],
 ['underline','Sottolineato','t:<u>S</u>','Ctrl+U',{toggle:()=>isWord()?qs('underline'):isCalc()&&cs('underline')}],
 ['fontGrow','Aumenta dimensione carattere','t:A<sup>+</sup>','Ctrl+>',{}],
 ['fontShrink','Riduci dimensione carattere','t:A<sup>−</sup>','Ctrl+<',{}],
 ['fontColorApply','Applica il colore del carattere','t:A','',{}]]);
def('w','Formato carattere',[
 ['strikeThrough','Barrato','t:<s>abc</s>','',{toggle:()=>qs('strikeThrough')}],
 ['subscript','Pedice','t:x<sub>2</sub>','',{toggle:()=>qs('subscript')}],
 ['superscript','Apice','t:x<sup>2</sup>','',{toggle:()=>qs('superscript')}],
 ['hiliteColorApply','Applica il colore di evidenziazione','highlight','',{}],
 ['clearFormat','Cancella formattazione','eraser','Ctrl+Spazio',{say:'Formattazione del carattere rimossa'}]]);
const al=(v,cmd)=>()=>isWord()?qs(cmd):isCalc()&&(cell(state.sel.r,state.sel.c)?.s?.align||'')===v;
def('wx','Paragrafo e allineamento',[
 ['justifyLeft','Allinea a sinistra','alignLeft','Ctrl+L',{kx:'',toggle:al('left','justifyLeft'),say:'Allineato a sinistra'}],
 ['justifyCenter','Centra','alignCenter','Ctrl+E',{kx:'',toggle:al('center','justifyCenter'),say:'Centrato'}],
 ['justifyRight','Allinea a destra','alignRight','Ctrl+R',{kx:'',toggle:al('right','justifyRight'),say:'Allineato a destra'}]]);
def('w','Paragrafo e allineamento',[
 ['justifyFull','Giustifica','justify','Ctrl+J',{toggle:()=>qs('justifyFull'),say:'Giustificato'}],
 ['insertUnorderedList','Elenco puntato','bullets','Ctrl+Maiusc+L',{toggle:()=>qs('insertUnorderedList')}],
 ['insertOrderedList','Elenco numerato','numbers','',{toggle:()=>qs('insertOrderedList')}],
 ['indent','Aumenta rientro','indent','Alt+Maiusc+→',{say:'Rientro aumentato'}],
 ['outdent','Riduci rientro','outdent','Alt+Maiusc+←',{say:'Rientro ridotto'}],
 ['bulletMenu','Stili dei punti elenco','down','',{menu:1}],
 ['numberMenu','Stili di numerazione','down','',{menu:1}],
 ['listMulti','Elenco a più livelli','multilevel','',{menu:1,short:'Più livelli'}],
 ['listRestart','Ricomincia la numerazione da 1','numbers','',{}],
 ['listContinue','Continua la numerazione precedente','numbers','',{}],
 ['listSetValue','Imposta il valore di numerazione','numbers','',{}],
 ['lineMenu','Interlinea e spaziatura dei paragrafi','lineSpacing','',{menu:1,short:'Interlinea'}],
 ['paraDialog','Paragrafo: rientri, spaziatura e interlinea','t:¶','',{short:'Paragrafo'}],
 ['formatP','Stile Normale','','Ctrl+Alt+0',{short:'Normale',sample:'',toggle:()=>styleNow()==='formatP',say:'Stile Normale'}],
 ['formatTitle','Stile Titolo del documento','','',{short:'Titolo',sample:'title',toggle:()=>styleNow()==='formatTitle',say:'Stile Titolo'}],
 ['formatSubtitle','Stile Sottotitolo','','',{short:'Sottotitolo',sample:'subtitle',toggle:()=>styleNow()==='formatSubtitle',say:'Stile Sottotitolo'}],
 ['formatH1','Stile Titolo 1','','Ctrl+Alt+1',{short:'Titolo 1',sample:'h1',toggle:()=>styleNow()==='formatH1',say:'Titolo 1'}],
 ['formatH2','Stile Titolo 2','','Ctrl+Alt+2',{short:'Titolo 2',sample:'h2',toggle:()=>styleNow()==='formatH2',say:'Titolo 2'}],
 ['formatH3','Stile Titolo 3','','Ctrl+Alt+3',{short:'Titolo 3',sample:'h3',toggle:()=>styleNow()==='formatH3',say:'Titolo 3'}],
 ['formatH4','Stile Titolo 4','','',{short:'Titolo 4',sample:'h4',toggle:()=>styleNow()==='formatH4',say:'Titolo 4'}],
 ['formatH5','Stile Titolo 5','','',{short:'Titolo 5',sample:'h5',toggle:()=>styleNow()==='formatH5',say:'Titolo 5'}],
 ['formatH6','Stile Titolo 6','','',{short:'Titolo 6',sample:'h6',toggle:()=>styleNow()==='formatH6',say:'Titolo 6'}],
 ['formatQuote','Stile Citazione','quote','',{short:'Citazione',sample:'q',toggle:()=>styleNow()==='formatQuote',say:'Citazione'}],
 ['stylesMenu','Tutti gli stili','down','',{menu:1,short:'Altri stili'}]]);
def('w','Inserisci',[
 ['wordChart','Inserisci grafico da Calcolo','chart','',{short:'Grafico da Calcolo'}],
 ['pageBreak','Interruzione di pagina','pageBreak','Ctrl+Invio',{short:'Interruzione di pagina'}],
 ['insertTable','Inserisci tabella','table','',{short:'Tabella'}],
 ['insertImage','Inserisci immagine','image','',{short:'Immagine'}],
 ['imgAlt','Testo alternativo dell’immagine','a11y','',{short:'Testo alternativo'}],
 ['insertLink','Inserisci collegamento','link','Ctrl+K',{short:'Collegamento'}],
 ['insertHr','Linea orizzontale','hr','',{short:'Linea'}],
 ['symbol','Inserisci simbolo','t:Ω','',{short:'Simbolo'}],
 ['dateTime','Inserisci data e ora','dateTime','Alt+Maiusc+D',{short:'Data e ora'}],
 ['toc','Inserisci o aggiorna sommario','toc','',{short:'Sommario'}],
 ['footnote','Inserisci nota a piè di pagina','t:ab<sup>1</sup>','Ctrl+Alt+F',{short:'Nota'}],
 ['headerFooter','Intestazione e piè di pagina','header','',{short:'Intestazione e piè di pagina'}],
 ['pageNumbers','Numeri di pagina','t:#','',{menu:1,short:'Numeri di pagina'}],
 ['imgFormat','Formato immagine: dimensione, posizione e didascalia','image','',{short:'Formato immagine'}],
 ['imgGrow','Ingrandisci l’immagine','zoomIn','',{short:'Ingrandisci'}],
 ['imgShrink','Riduci l’immagine','zoomOut','',{short:'Riduci'}],
 ['imgCaption','Didascalia dell’immagine','caption','',{short:'Didascalia'}],
 ['captionInsert','Inserisci didascalia (tabella o immagine)','caption','',{short:'Didascalia'}],
 ['followLink','Segui il collegamento, la voce di sommario o la nota','link','',{short:'Segui collegamento'}],
 ['nextHeading','Vai al titolo successivo','down','Alt+Maiusc+PgGiù',{}],
 ['prevHeading','Vai al titolo precedente','up','Alt+Maiusc+PgSu',{}],
 ['wordMenu','Menu del documento (tabella, immagine, paragrafo)','','Maiusc+F10',{ctx:'editor'}]]);
def('w','Formattazione',[
 ['formatPainter','Copia formato (pennello)','brush','',{short:'Copia formato',toggle:()=>painting}],
 ['formatCopy','Copia il formato del testo','brush','Alt+Maiusc+C',{}],
 ['formatPaste','Applica il formato copiato','brush','Alt+Maiusc+V',{}],
 ['caseMenu','Maiuscole e minuscole','t:Aa','',{menu:1,short:'Maiuscole'}],
 ['changeCase','Cambia maiuscole e minuscole','t:Aa','Maiusc+F3',{ctx:'editor'}],
 ['pasteSpecial','Incolla speciale','paste','Ctrl+Alt+V',{short:'Incolla speciale'}],
 ['revealFormat','Mostra formattazione','info','Maiusc+F1',{short:'Mostra formattazione'}],
 ['showMarks','Mostra segni di formattazione','t:¶','Ctrl+Maiusc+8',{short:'Segni ¶',toggle:()=>marksOn}],
 ['fontDialog','Carattere: tutte le opzioni','t:A<small>…</small>','Ctrl+D',{ctx:'editor',short:'Carattere…'}],
 ['smallCaps','Maiuscoletto','t:<small>AB</small>','Ctrl+Maiusc+K',{short:'Maiuscoletto'}],
 ['paraBorders','Bordi e sfondo del paragrafo','borders','',{short:'Bordi e sfondo'}],
 ['tabsDialog','Tabulazioni','t:⇥','',{short:'Tabulazioni'}],
 ['styleManage','Gestisci stili: modifica, nuovo, elimina','styles','',{menu:1,short:'Gestisci stili'}],
 ['newStyle','Nuovo stile dalla selezione','styles','',{short:'Nuovo stile'}],
 ['watermark','Filigrana','watermark','',{short:'Filigrana'}],
 ['pageColor','Colore pagina','fill','',{short:'Colore pagina'}],
 ['pageBorder','Bordi pagina','pageBorder','',{short:'Bordi pagina'}],
 ['dropCap','Capolettera','dropcap','',{short:'Capolettera',toggle:()=>!!(inEditor()&&curBlock()?.classList.contains('dropcap'))}]]);
def('w','Sezioni e intestazioni',[
 ['breaksMenu','Interruzioni di pagina e di sezione','pageBreak','',{menu:1,short:'Interruzioni'}],
 ['sectNext','Interruzione di sezione: pagina successiva','section','',{short:'Sezione: pagina successiva'}],
 ['sectCont','Interruzione di sezione: continua','section','',{short:'Sezione continua'}],
 ['sectSetup','Imposta la sezione: orientamento, colonne e numerazione delle pagine','section','',{short:'Imposta sezione'}],
 ['sectGoNext','Vai alla sezione successiva','down','',{}],
 ['sectGoPrev','Vai alla sezione precedente','up','',{}]]);
def('w','Riferimenti',[
 ['endnote','Inserisci nota di chiusura','t:ab<sup>i</sup>','Ctrl+Alt+O',{short:'Nota di chiusura'}],
 ['bookmark','Segnalibro','bookmark','Ctrl+Maiusc+F5',{short:'Segnalibro'}],
 ['crossRef','Riferimento incrociato','xref','',{short:'Riferimento incrociato'}],
 ['tofMenu','Indice delle figure o delle tabelle','tof','',{menu:1,short:'Indice delle figure'}],
 ['markEntry','Segna voce di indice analitico','tag','Alt+Maiusc+X',{short:'Segna voce'}],
 ['insertIndex','Inserisci o aggiorna l’indice analitico','index','',{short:'Inserisci indice'}],
 ['citeMenu','Inserisci citazione','cite','',{menu:1,short:'Inserisci citazione'}],
 ['sources','Gestisci le fonti e lo stile delle citazioni','sources','',{menu:1,short:'Gestisci fonti'}],
 ['biblio','Inserisci o aggiorna la bibliografia','biblio','',{short:'Bibliografia'}],
 ['updateFields','Aggiorna indici, riferimenti incrociati, citazioni e numeri di pagina','refresh','F9',{short:'Aggiorna tutto'}]]);
def('w','Moduli e oggetti',[
 ['controlsMenu','Controlli del modulo','form','',{menu:1,short:'Controlli modulo'}],
 ['ccCheck','Casella di controllo del modulo','check','',{short:'Casella'}],
 ['ccDrop','Elenco a discesa del modulo','dropdown','',{short:'Elenco'}],
 ['ccDate','Selezione data del modulo','calendar','',{short:'Data'}],
 ['ccText','Campo di testo del modulo','textfield','',{short:'Testo'}],
 ['formFill','Compila il modulo: Tab tra i campi, Spazio per compilare','form','',{short:'Compila modulo',toggle:()=>formMode}],
 ['ccEdit','Compila il campo del modulo al cursore','down','Alt+↓',{ctx:'editor'}],
 ['textBox','Inserisci casella di testo','textbox','',{short:'Casella di testo'}],
 ['equation','Inserisci o modifica equazione','t:π','Alt+=',{short:'Equazione'}]]);
def('w','Revisione e strumenti',[
 ['cmtNew','Nuovo commento sul testo selezionato','comment','Ctrl+Alt+M',{short:'Nuovo commento'}],
 ['cmtPane','Riquadro dei commenti','comment','',{short:'Mostra commenti',toggle:()=>!!state.showComments}],
 ['cmtNext','Commento successivo','down','',{short:'Successivo'}],
 ['cmtPrev','Commento precedente','up','',{short:'Precedente'}],
 ['cmtResolve','Risolvi o riapri il commento','t:✓','',{short:'Risolvi'}],
 ['cmtDelete','Elimina il commento','trash','',{short:'Elimina commento'}],
 ['cmtDeleteAll','Elimina tutti i commenti','trash','',{}],
 ['autoCorrect','Opzioni di correzione automatica','t:A✓','',{short:'Correzione automatica'}],
 ['readability','Leggibilità del testo (indice Gulpease)','t:G','',{short:'Leggibilità'}],
 ['dictate','Dettatura vocale','mic','Ctrl+Alt+D',{quiet:1,short:'Dettatura',toggle:()=>dictating}],
 ['readingMode','Modalità lettura','read','',{quiet:1,short:'Modalità lettura',toggle:()=>reading}],
 ['versionSave','Salva una versione nel browser','history','',{short:'Salva versione'}],
 ['versionHistory','Cronologia versioni','history','',{short:'Cronologia versioni'}],
 ['templates','Nuovo da modello: lettera, preventivo, verbale, relazione','new','',{short:'Modelli'}],
 ['nextPlaceholder','Vai al segnaposto successivo','','Alt+Maiusc+S',{}]]);
def('w','Stampa unione',[
 ['mmSource','Seleziona i destinatari da un foglio di Calcolo','sheet','',{short:'Seleziona destinatari'}],
 ['mmField','Inserisci campo unione','t:«»','',{menu:1,short:'Inserisci campo'}],
 ['mmPreview','Anteprima dei risultati','search','',{quiet:1,short:'Anteprima risultati',toggle:()=>mergeIdx>=0}],
 ['mmPrev','Destinatario precedente','left','',{short:'Precedente'}],
 ['mmNext','Destinatario successivo','right','',{short:'Successivo'}],
 ['mmFinish','Completa la stampa unione','print','',{short:'Completa e unisci'}]]);
def('w','Tabella',[
 ['tblRowAbove','Inserisci riga sopra','rowAbove','',{short:'Riga sopra'}],
 ['tblRowBelow','Inserisci riga sotto','rowBelow','',{short:'Riga sotto'}],
 ['tblColLeft','Inserisci colonna a sinistra','colLeft','',{short:'Colonna a sinistra'}],
 ['tblColRight','Inserisci colonna a destra','colRight','',{short:'Colonna a destra'}],
 ['tblDelRow','Elimina la riga della tabella','deleteRows','',{short:'Elimina riga'}],
 ['tblDelCol','Elimina la colonna della tabella','deleteCols','',{short:'Elimina colonna'}],
 ['tblDelete','Elimina la tabella','trash','',{short:'Elimina tabella'}],
 ['tblMerge','Unisci le celle selezionate','merge','',{short:'Unisci celle'}],
 ['tblSplit','Dividi la cella unita','unmerge','',{short:'Dividi cella'}],
 ['tblHeader','Riga di intestazione della tabella','headerRow','',{short:'Riga di intestazione',toggle:()=>!!(inEditor()&&curTable()?.tHead)}],
 ['tblCaption','Didascalia della tabella','caption','',{short:'Didascalia'}],
 ['tblBorders','Bordi della tabella','borders','',{menu:1,short:'Bordi'}],
 ['tblWidth','Adatta la tabella alla larghezza della pagina','autofit','',{short:'Larghezza pagina',toggle:()=>!!(inEditor()&&curTable()?.classList.contains('tb-full'))}]]);
def('w','Pagina e documento',[
 ['paperA4','Formato A4','page','',{short:'A4',toggle:()=>state.paper.startsWith('a4')}],
 ['paperLetter','Formato Lettera','page','',{short:'Lettera',toggle:()=>state.paper.startsWith('letter')}],
 ['paperLandscape','Orientamento orizzontale','landscape','',{short:'Orizzontale',toggle:()=>state.paper.endsWith('landscape')}],
 ['docReset','Ripristina formattazione del documento','eraser','',{short:'Predefinita'}],
 ['spellcheck','Controllo ortografia','t:abc✓','',{short:'Ortografia',toggle:()=>state.spell}],
 ['wordCount','Conteggio parole','t:123','Ctrl+Maiusc+G',{short:'Conteggio parole'}],
 ['readAloud','Leggi ad alta voce','speak','',{short:'Leggi ad alta voce',toggle:()=>speaking}],
 ['a11yCheck','Verifica accessibilità del documento','a11y','',{short:'Verifica accessibilità'}],
 ['marginsMenu','Margini della pagina','margins','',{menu:1,short:'Margini'}],
 ['columnsMenu','Colonne di testo','columns','',{menu:1,short:'Colonne'}],
 ['pageSetup','Imposta pagina: formato, margini e colonne','page','',{short:'Imposta pagina'}],
 ['navPane','Riquadro di spostamento','nav','',{short:'Spostamento',toggle:()=>!!state.layout.nav}],
 ['pageMarks','Mostra i confini di pagina','pageBreak','',{short:'Confini di pagina',toggle:()=>!!state.layout.marks}]]);
def('wx','Colore',[]);
def('x','Celle',[
 ['fillColorApply','Applica il colore di riempimento','fill','',{}],
 ['borders','Bordi','borders','',{toggle:()=>cs('border')}],
 ['wrap','Testo a capo','wrap','',{short:'A capo',toggle:()=>cs('wrap')}],
 ['merge','Unisci e centra','merge','',{short:'Unisci',toggle:()=>!!mergeAt(state.sel.r,state.sel.c)}],
 ['unmerge','Separa celle','unmerge','',{short:'Separa'}],
 ['currency','Formato valuta','t:€','Ctrl+Maiusc+$',{toggle:()=>cell(state.sel.r,state.sel.c)?.s?.fmt==='Valuta'}],
 ['percent','Formato percentuale','t:%','Ctrl+Maiusc+%',{toggle:()=>cell(state.sel.r,state.sel.c)?.s?.fmt==='Percentuale'}],
 ['decPlus','Aumenta decimali','t:,0<small>+</small>','',{}],
 ['decMinus','Riduci decimali','t:,0<small>−</small>','',{}],
 ['insertRows','Inserisci righe','insertRows','',{short:'Inserisci righe'}],
 ['insertCols','Inserisci colonne','insertCols','',{short:'Inserisci colonne'}],
 ['deleteRows','Elimina righe','deleteRows','',{short:'Elimina righe'}],
 ['deleteCols','Elimina colonne','deleteCols','',{short:'Elimina colonne'}],
 ['insertCells','Inserisci righe o colonne','insertRows','Ctrl++',{ctx:'grid'}],
 ['deleteCells','Elimina righe o colonne','deleteRows','Ctrl+-',{ctx:'grid'}],
 ['clearMenu','Cancella…','eraser','',{short:'Cancella'}],
 ['clearContents','Cancella contenuto','eraser','Canc',{native:1}],
 ['clearFormats','Cancella formati','eraser','',{}],
 ['clearAll','Cancella tutto','eraser','',{}],
 ['colWidth','Larghezza colonne…','colWidth','',{short:'Larghezza'}],
 ['autofit','Adatta larghezza colonne','autofit','',{short:'Adatta'}],
 ['editCell','Modifica cella','rename','F2',{native:1}],
 ['cellMenu','Menu della cella','','Maiusc+F10',{ctx:'grid'}]]);
def('x','Dati e formule',[
 ['autoSum','Somma automatica','t:Σ','Alt+=',{short:'Somma'}],
 ['fillDown','Riempi in basso','fillDown','Ctrl+D',{ctx:'grid'}],
 ['fillRight','Riempi a destra','fillRight','Ctrl+R',{ctx:'grid'}],
 ['insertDate','Inserisci la data di oggi','dateTime','Ctrl+;',{ctx:'grid'}],
 ['sortAsc','Ordina dalla A alla Z','t:A↓Z','',{short:'Ordina A→Z'}],
 ['sortDesc','Ordina dalla Z alla A','t:Z↓A','',{short:'Ordina Z→A'}],
 ['filter','Filtra righe','filter','Ctrl+Maiusc+L',{short:'Filtro',toggle:()=>!!sheet().filter?.text}],
 ['clearFilter','Rimuovi filtro','clearFilter','',{short:'Rimuovi filtro'}],
 ['autoSumMenu','Altre funzioni di Somma automatica','down','',{menu:1}],
 ['insertFunction','Inserisci funzione','t:ƒx','Maiusc+F3',{ctx:'grid',short:'Inserisci funzione'}],
 ['fxCatRecent','Funzioni usate di recente','history','',{menu:1,short:'Recenti'}],
 ['fxCatMath','Funzioni matematiche','t:π','',{menu:1,short:'Matematiche'}],
 ['fxCatStat','Funzioni statistiche','chart','',{menu:1,short:'Statistiche'}],
 ['fxCatLogic','Funzioni logiche','logic','',{menu:1,short:'Logiche'}],
 ['fxCatText','Funzioni di testo','t:Aa','',{menu:1,short:'Testo'}],
 ['fxCatDate','Funzioni di data e ora','dateTime','',{menu:1,short:'Data e ora'}],
 ['fxCatLookup','Funzioni di ricerca e riferimento','search','',{menu:1,short:'Ricerca'}],
 ['fxCatDyn','Funzioni a matrice dinamica','grid','',{menu:1,short:'Matrici dinamiche'}],
 ['fxCatFin','Funzioni finanziarie','t:€','',{menu:1,short:'Finanziarie'}],
 ['fxCatInfo','Funzioni informative','info','',{menu:1,short:'Informative'}],
 ['formulaHelp','Elenco delle funzioni','help','',{short:'Elenco funzioni'}],
 ['pasteValues','Incolla dagli appunti','paste','',{short:'Incolla'}]]);
def('x','Selezione e navigazione',[
 ['selectAll','Seleziona tutto','','Ctrl+A',{ctx:'grid'}],
 ['selectRow','Seleziona la riga','','Maiusc+Spazio',{ctx:'grid'}],
 ['selectCol','Seleziona la colonna','','Ctrl+Spazio',{ctx:'grid'}],
 ['goto','Vai alla cella o all’intervallo','goto','Ctrl+G',{g:1,short:'Vai a'}],
 ['toggleGrid','Mostra griglia','grid','',{short:'Griglia',toggle:()=>!hideGrid}]]);
def('x','Strumenti del foglio',[
 ['freezeMenu','Blocca riquadri','freeze','',{menu:1,short:'Blocca riquadri'}],
 ['cfMenu','Formattazione condizionale','cf','',{menu:1,short:'Formattazione condizionale'}],
 ['cfManage','Gestisci le regole di formattazione condizionale','cf','',{short:'Gestisci regole'}],
 ['dvDialog','Convalida dati','dv','',{short:'Convalida dati'}],
 ['dvPick','Scegli dall’elenco della cella','down','Alt+↓',{ctx:'grid'}],
 ['dvCircle','Evidenzia i dati non validi','dv','',{short:'Dati non validi',toggle:()=>dvCircle}],
 ['nameDefine','Definisci nome per la selezione','tag','',{short:'Definisci nome'}],
 ['nameManager','Gestione nomi','tag','Ctrl+F3',{short:'Gestione nomi'}],
 ['nameUse','Usa un nome nella formula','down','',{menu:1,short:'Usa nella formula'}],
 ['noteEdit','Nuova nota o modifica nota','note','Maiusc+F2',{ctx:'grid',short:'Nota'}],
 ['noteDelete','Elimina la nota','trash','',{short:'Elimina nota'}],
 ['noteNext','Nota successiva','down','',{short:'Successiva'}],
 ['notePrev','Nota precedente','up','',{short:'Precedente'}],
 ['noteList','Mostra tutte le note','note','',{short:'Tutte le note'}]]);
def('x','Tabella pivot',[
 ['pivotNew','Inserisci tabella pivot','pivot','',{short:'Tabella pivot'}],
 ['pivotFields','Campi della tabella pivot','pivot','',{short:'Campi'}],
 ['pivotFilter','Filtra i valori di un campo della tabella pivot','filter','',{short:'Filtra'}],
 ['pivotCalc','Campi calcolati della tabella pivot','t:ƒx','',{short:'Campi calcolati'}],
 ['pivotOptions','Opzioni della tabella pivot','rename','',{short:'Opzioni'}],
 ['pivotRefresh','Aggiorna la tabella pivot','refresh','Alt+F5',{short:'Aggiorna'}],
 ['pivotRefreshAll','Aggiorna tutte le tabelle pivot','refresh','Ctrl+Alt+F5',{short:'Aggiorna tutto'}],
 ['pivotDrill','Mostra i dettagli del valore della tabella pivot','search','',{short:'Mostra dettagli'}],
 ['pivotChart','Grafico dalla tabella pivot','chart','',{short:'Grafico pivot'}],
 ['pivotSelect','Seleziona la tabella pivot','','',{short:'Seleziona'}],
 ['pivotDelete','Elimina la tabella pivot','trash','',{short:'Elimina'}]]);
def('x','Grafici',[
 ['chartInsert','Inserisci grafico consigliato','chart','Alt+F1',{short:'Grafico consigliato'}],
 ['chartCol','Grafico a colonne','chartCol','',{short:'Colonne'}],['chartBar','Grafico a barre','chartBar','',{short:'Barre'}],
 ['chartLine','Grafico a linee','chartLine','',{short:'Linee'}],['chartArea','Grafico ad aree','chartArea','',{short:'Aree'}],
 ['chartPie','Grafico a torta','chartPie','',{short:'Torta'}],['chartDoughnut','Grafico ad anello','chartPie','',{short:'Anello'}],
 ['chartScatter','Grafico a dispersione','chartScatter','',{short:'Dispersione'}],
 ['chartFormat','Formato del grafico selezionato','rename','',{short:'Formato grafico'}],
 ['chartTable','Dati del grafico come tabella','table','',{short:'Tabella dati'}],
 ['chartSound','Ascolta il grafico','speak','',{short:'Ascolta'}],
 ['chartDesc','Leggi la descrizione del grafico','a11y','',{short:'Descrizione'}],
 ['chartPng','Scarica il grafico come PNG','image','',{short:'PNG'}],
 ['chartSvg','Scarica il grafico come SVG','export','',{short:'SVG'}],
 ['chartDelete','Elimina il grafico selezionato','trash','',{short:'Elimina grafico'}],
 ['chartGo','Vai ai grafici del foglio','chart','',{}]]);
def('x','Fogli',[
 ['addSheet','Nuovo foglio','new','Maiusc+F11',{short:'Nuovo foglio'}],
 ['duplicateSheet','Duplica foglio','copy','',{short:'Duplica foglio'}],
 ['renameSheet','Rinomina foglio','rename','',{short:'Rinomina'}],
 ['deleteSheet','Elimina foglio','trash','',{short:'Elimina foglio'}],
 ['moveSheetLeft','Sposta foglio a sinistra','left','',{}],
 ['moveSheetRight','Sposta foglio a destra','right','',{}],
 ['prevSheet','Foglio precedente','','Alt+PgSu',{}],
 ['nextSheet','Foglio successivo','','Alt+PgGiù',{}]]);
def('p','File',[
 ['pgTemplates','Nuovo da modello: evento, offerta, menu, citazione, prima e dopo…','new','',{short:'Modelli'}],
 ['pgSaveTpl','Salva il documento come modello','backup','',{short:'Salva come modello'}],
 ['pgSave','Salva il progetto di Impagina (un file da riaprire)','save','Ctrl+S',{g:1,short:'Salva progetto'}],
 ['pgExportPng','Esporta le pagine in PNG','image','Ctrl+Maiusc+E',{g:1,short:'Esporta PNG'}]]);
def('p','Pagine',[
 ['pgAddPage','Nuova pagina dopo quella attuale','new','Ctrl+Invio',{short:'Nuova pagina'}],
 ['pgDupPage','Duplica la pagina','copy','',{short:'Duplica pagina'}],
 ['pgDelPage','Elimina la pagina','trash','',{short:'Elimina pagina'}],
 ['pgPrevPage','Pagina precedente','up','Alt+PgSu',{short:'Pagina precedente'}],
 ['pgNextPage','Pagina successiva','down','Alt+PgGiù',{short:'Pagina successiva'}],
 ['pgDataRepeat','Ripeti la pagina per ogni riga dei dati','sheet','',{short:'Una pagina per riga',toggle:()=>!!pgCurPage()?.data}],
 ['pgPresent','Presenta a schermo intero, una pagina alla volta','present','F5',{g:1,short:'Presenta'}],
 ['pgRowPrev','Anteprima della riga dei dati precedente','left','',{short:'Riga precedente'}],
 ['pgRowNext','Anteprima della riga dei dati successiva','right','',{short:'Riga successiva'}]]);
def('p','Inserisci',[
 ['pgAddText','Inserisci una cornice di testo','textbox','',{short:'Testo'}],
 ['pgAddImage','Inserisci una cornice per immagine','image','',{short:'Immagine'}],
 ['pgAddRect','Inserisci un rettangolo','rect','',{short:'Rettangolo'}],
 ['pgAddEllipse','Inserisci un’ellisse','ellipse','',{short:'Ellisse'}],
 ['pgAddLine','Inserisci una linea','lineI','',{short:'Linea'}],
 ['pgAddTri','Inserisci un triangolo','triangle','',{short:'Triangolo'}],
 ['pgAddTable','Inserisci una tabella','table','',{short:'Tabella'}],
 ['pgBrandLogo','Inserisci il logo del kit del marchio','brand','',{short:'Logo del marchio'}],
 ['pgAddQr','Inserisci un codice QR, fatto senza internet','qr','',{short:'Codice QR'}],
 ['pgAddSign','Inserisci un’insegna, una scritta d’effetto','sign','',{short:'Insegna'}],
 ['pgSignStyles','Stili delle insegne','down','',{menu:1,short:'Stili delle insegne'}],
 ['pgPageNum','Numero di pagina nel mastro','t:#','',{short:'Numero di pagina'}],
 ['pgHeader','Intestazione nel mastro','header','',{short:'Intestazione'}],
 ['pgLogo','Logo nel mastro','image','',{short:'Logo'}],
 ['pgField','Inserisci un campo nel testo (dati, pagina, titolo)','t:«»','',{menu:1,short:'Campo'}]]);
def('p','Cornice',[
 ['pgEditText','Modifica il testo della cornice','rename','',{short:'Modifica testo'}],
 ['pgDup','Duplica la cornice','duplicate','Ctrl+D',{ctx:'page',short:'Duplica'}],
 ['pgDelete','Elimina la cornice','trash','Canc',{ctx:'page',short:'Elimina'}],
 ['pgCut','Taglia la cornice','cut','Ctrl+X',{ctx:'page',short:'Taglia'}],
 ['pgCopy','Copia la cornice','copy','Ctrl+C',{ctx:'page',short:'Copia'}],
 ['pgPaste','Incolla la cornice','paste','Ctrl+V',{ctx:'page',short:'Incolla'}],
 ['pgFront','Porta in primo piano','front','',{short:'In primo piano'}],
 ['pgBack','Porta in fondo','backL','',{short:'In fondo'}],
 ['pgForward','Porta avanti di un livello','up','',{short:'Avanti'}],
 ['pgBackward','Porta indietro di un livello','down','',{short:'Indietro'}],
 ['pgRotL','Ruota di 15 gradi in senso antiorario','rotL','Alt+←',{ctx:'page',short:'Ruota a sinistra'}],
 ['pgRotR','Ruota di 15 gradi in senso orario','rotR','Alt+→',{ctx:'page',short:'Ruota a destra'}],
 ['pgRotL1','Ruota di un grado in senso antiorario','rotL','Ctrl+Alt+←',{ctx:'page',short:'Un grado a sinistra'}],
 ['pgRotR1','Ruota di un grado in senso orario','rotR','Ctrl+Alt+→',{ctx:'page',short:'Un grado a destra'}],
 ['pgRot0','Raddrizza: togli la rotazione','rot0','',{short:'Raddrizza'}],
 ['pgAlignL','Allinea al margine sinistro','alignL','',{short:'A sinistra'}],
 ['pgAlignC','Centra in orizzontale tra i margini','alignC','',{short:'Al centro'}],
 ['pgAlignR','Allinea al margine destro','alignR','',{short:'A destra'}],
 ['pgAlignT','Allinea al margine superiore','alignT','',{short:'In alto'}],
 ['pgAlignM','Centra in verticale tra i margini','alignM','',{short:'In mezzo'}],
 ['pgAlignB','Allinea al margine inferiore','alignB','',{short:'In basso'}],
 ['pgReadUp','Sposta prima nell’ordine di lettura','up','',{short:'Leggi prima'}],
 ['pgReadDown','Sposta dopo nell’ordine di lettura','down','',{short:'Leggi dopo'}],
 ['pgReadAuto','Ordine di lettura dalla disposizione (dall’alto, per colonne)','readOrder','',{short:'Ordine automatico'}],
 ['pgLink','Fai continuare il testo in una nuova cornice','chain','',{short:'Continua in nuova cornice'}],
 ['pgLinkTo','Fai continuare il testo in una cornice esistente','chain','',{menu:1,short:'Collega a…'}],
 ['pgUnlink','Togli la cornice dalla catena del testo','unchain','',{short:'Scollega'}],
 ['pgOverflow','Vai al testo che non entra nelle cornici','overflow','',{short:'Testo in eccesso'}],
 ['pgShrink','Riduci il testo finché entra (la cornice scelta, o tutto il documento)','shrinkText','',{short:'Riduci finché entra'}],
 ['pgShrinkReset','Riporta il testo ridotto alla misura degli stili','history','',{short:'Misura degli stili'}],
 ['pgChooseImage','Scegli l’immagine della cornice','image','',{short:'Scegli immagine'}],
 ['pgTblRowAdd','Aggiungi una riga alla tabella','rowBelow','',{short:'Aggiungi riga'}],
 ['pgTblColAdd','Aggiungi una colonna alla tabella','colRight','',{short:'Aggiungi colonna'}],
 ['pgTblRowDel','Elimina la riga della tabella','deleteRows','',{short:'Elimina riga'}],
 ['pgTblColDel','Elimina la colonna della tabella','deleteCols','',{short:'Elimina colonna'}],
 ['pgTblData','Riempi la tabella dai dati: CSV, XLSX o JSON','sheet','',{menu:1,short:'Riempi dai dati'}],
 ['pgWrap','Scontorno: il testo gira attorno alla cornice','wrapText','',{menu:1,short:'Scontorno'}],
 ['pgPhotoAdj','Regolazioni della foto: luce, colore e look','sliders','',{short:'Regola la foto'}],
 ['pgPhotoAuto','Regolazione automatica della foto','wand','',{short:'Automatica'}],
 ['pgPhotoReset','Togli le regolazioni della foto','history','',{short:'Foto originale'}],
 ['pgFit','Adatta l’immagine alla cornice','fit','',{short:'Adatta',toggle:()=>pgSel()?.fit==='fit'}],
 ['pgFill','Riempi la cornice con l’immagine','fill','',{short:'Riempi',toggle:()=>pgSel()?.fit==='fill'}]]);
def('p','Pagina e griglia',[
 ['pgFormat','Formato del documento','page','',{short:'Formato'}],
 ['pgMargins','Margini, colonne e griglia','margins','',{short:'Margini e colonne'}],
 ['pgGuides','Mostra margini e colonne','columns','',{short:'Guide',toggle:()=>Pg.guides}],
 ['pgGrid','Mostra la griglia','grid','',{short:'Griglia',toggle:()=>Pg.grid}],
 ['pgSnap','Aggancia alla griglia','grid','',{short:'Aggancia',toggle:()=>!!Pg.p.snap}],
 ['pgMasterApply','Mastro della pagina','header','',{menu:1,short:'Applica mastro'}],
 ['pgMasterEdit','Modifica il mastro della pagina','rename','',{short:'Modifica mastro'}],
 ['pgMasterNew','Nuovo mastro','new','',{short:'Nuovo mastro'}],
 ['pgStyles','Stili di paragrafo e di carattere','styles','',{short:'Stili'}],
 ['pgZoomFit','Mostra tutta la pagina','zoomFit','',{short:'Tutta la pagina'}],
 ['pgBleed','Abbondanza per il taglio, per la tipografia','crop','',{short:'Abbondanza'}],
 ['pgCropMarks','Segni di taglio negli angoli del foglio','crop','',{short:'Segni di taglio',toggle:()=>!!Pg.p?.marks}],
 ['pgTiles','Stampa a tessere su più fogli da incollare','tiles','',{short:'Stampa a tessere',toggle:()=>!!Pg.p?.tiles?.on}],
 ['pgTileSetup','Fogli, margini e sovrapposizione delle tessere','margins','',{short:'Fogli e margini'}],
 ['pgFestone','Festone di lettere, una per foglio','festone','',{short:'Festone'}],
 ['pgAdapt','Adatta a un altro formato','resize','',{short:'Adatta formato'}],
 ['pgTheme','Temi di colore','palette','',{menu:1,short:'Temi di colore'}],
 ['pgBrand','Kit del marchio: colori, caratteri e logo','brand','',{short:'Kit del marchio'}],
 ['pgBrandApply','Applica il kit del marchio al documento','brand','',{short:'Il mio marchio'}],
 ['pgSmart','Guide intelligenti','magnet','',{short:'Guide intelligenti',toggle:()=>Pg.smart!==false}]]);
def('p','Più cornici',[
 ['pgSelectAll','Scegli tutte le cornici della pagina','','Ctrl+A',{ctx:'page',short:'Scegli tutte'}],
 ['pgGroup','Raggruppa le cornici scelte','group','Ctrl+G',{ctx:'page',short:'Raggruppa'}],
 ['pgUngroup','Separa il gruppo','ungroup','Ctrl+Maiusc+G',{ctx:'page',short:'Separa'}],
 ['pgLock','Blocca o sblocca le cornici scelte','lock','',{short:'Blocca',toggle:()=>{const s=pgSelItems?.()||[];return !!s.length&&s.every(x=>x.lock)}}],
 ['pgDistH','Distribuisci in orizzontale a spazi uguali','distH','',{short:'Distribuisci in orizzontale'}],
 ['pgDistV','Distribuisci in verticale a spazi uguali','distV','',{short:'Distribuisci in verticale'}],
 ['pgMask','Sagoma dell’immagine','mask','',{menu:1,short:'Sagoma'}],
 ['pgPhotoGrid','Griglia di foto','grid','',{menu:1,short:'Griglia di foto'}]]);
def('p','Fonti',[
 ['pgFolder','Collega una cartella del computer','folder','',{short:'Collega cartella'}],
 ['pgRefresh','Aggiorna dalle fonti','refresh','Alt+F5',{g:1,short:'Aggiorna dalle fonti'}],
 ['pgSources','Fonti collegate','sources','',{short:'Fonti collegate'}],
 ['pgData','Dati da un file CSV, XLSX o JSON','sheet','',{short:'Dati da file'}],
 ['pgDataSheet','Dati da un foglio di Calcolo','grid','',{short:'Dati da Calcolo'}],
 ['pgFeed','Notizie da un feed RSS o Atom salvato','feed','',{short:'Feed da file'}],
 ['pgFeedPaste','Incolla un feed RSS o Atom','paste','',{short:'Incolla feed'}],
 ['pgDocx','Importa il testo da un DOCX o da un file di testo','import','',{short:'Testo da DOCX'}]]);
def('p','Verifica',[
 ['pgCheck','Verifica dell’accessibilità','a11y','',{short:'Verifica accessibilità'}],
 ['pgDescribe','Descrivi la pagina e la cornice scelta','speak','Alt+Maiusc+I',{g:1,short:'Descrivi pagina'}]]);
def('wp','Tasselli',[
 ['layoutMenu','Tasselli: mostra, riduci o togli i riquadri','mosaic','',{short:'Tasselli'}],
 ['layoutReset','Rimetti i tasselli come all’inizio','history','',{short:'Come all’inizio'}]]);
def('p','Tasselli',[
 ['showPgSide','Mostra o togli il riquadro Pagine e cornici','page','',{short:'Pagine e cornici',quiet:1,toggle:()=>paneSt('pgSidePane')!=='off'}],
 ['showPgProps','Mostra o togli il riquadro Proprietà','gear','',{short:'Proprietà',quiet:1,toggle:()=>paneSt('pgPropsPane')!=='off'}]]);
const KEYNAME={Invio:'enter',Spazio:' ',Canc:'delete',Esc:'escape',PgSu:'pageup',PgGiù:'pagedown',Home:'home',Fine:'end','←':'arrowleft','→':'arrowright','↑':'arrowup','↓':'arrowdown',Tab:'tab'};
const keyCache=new Map();
function parseKey(s){let key,mods;if(s.endsWith('++')){key='+';mods=s.slice(0,-2).split('+')}else{const p=s.split('+');key=p.pop();mods=p}return{ctrl:mods.includes('Ctrl'),alt:mods.includes('Alt'),shift:mods.includes('Maiusc'),key:(KEYNAME[key]||key).toLowerCase()}}
const keysOf=c=>state.mode==='excel'&&c.kx!==undefined?c.kx:c.keys;
function parsedKeys(spec){if(!keyCache.has(spec))keyCache.set(spec,spec?spec.split(' / ').map(parseKey):[]);return keyCache.get(spec)}
function keyMatch(e,k){if((e.ctrlKey||e.metaKey)!==k.ctrl||e.altKey!==k.alt)return false;const sym=k.key.length===1&&!/[a-z0-9 ]/.test(k.key);if(!sym&&e.shiftKey!==k.shift)return false;const ek=e.key.toLowerCase();if(ek===k.key)return true;if(k.key==='+'&&(e.code==='NumpadAdd'||(e.shiftKey&&(ek==='='||e.code==='Equal'))))return true;if(k.key==='-'&&e.code==='NumpadSubtract')return true;if(/^[a-z0-9]$/.test(k.key)&&(!(e.ctrlKey&&e.altKey)||/\d/.test(k.key)))return e.code===(/\d/.test(k.key)?'Digit':'Key')+k.key.toUpperCase();return false}
function ariaKeys(spec){const M={Ctrl:'Control',Maiusc:'Shift',Alt:'Alt',Invio:'Enter',Spazio:'Space',Canc:'Delete',PgSu:'PageUp',PgGiù:'PageDown','←':'ArrowLeft','→':'ArrowRight','↑':'ArrowUp','↓':'ArrowDown',Esc:'Escape'};return spec.split(' / ').map(s=>(s.endsWith('++')?[...s.slice(0,-2).split('+'),'Plus']:s.split('+')).map(p=>M[p]||p).join('+')).join(' ')}
const kbdHtml=spec=>spec.split(' / ').map(s=>(s.endsWith('++')?[...s.slice(0,-2).split('+'),'+']:s.split('+')).map(p=>`<kbd>${esc(p)}</kbd>`).join('+')).join(' o ');
const available=c=>c.modes.includes(modeKey());
function focusContext(){const a=document.activeElement;if(!a||a===document.body)return 'other';if(a.closest('#wordEditor'))return 'editor';if(a.id==='pgStage'||a.id==='pgFrames')return 'page';if(a.id==='pgPages')return 'pages';if(a===$('gridScroll'))return 'grid';if(a===$('gridInput'))return 'cell';if(a.matches('input:not([type=button]):not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),textarea,select,[contenteditable="true"]'))return 'input';return 'other'}
function findShortcut(e,ctx){let fallback=null;for(const c of Object.values(C)){const spec=keysOf(c);if(!spec||c.native||!available(c))continue;if(c.ctx&&c.ctx!==ctx)continue;if((ctx==='input'||ctx==='cell')&&!c.g)continue;if(parsedKeys(spec).some(k=>keyMatch(e,k))){if(c.ctx===ctx)return c;fallback??=c}}return fallback}
const safe=fn=>{try{return fn()}catch(e){return false}};
async function runCommand(id){const c=C[id];if(!c)return;if(isWord()&&document.activeElement===$('wordEditor')&&inEditor())wordSelectionSave();if(reading&&isWord()&&!READ_OK.has(id)){toast('«'+c.label+'» non è disponibile in modalità lettura: premi Esc per tornare alla modifica');return}if(formMode&&isWord()&&!READ_OK.has(id)&&!['formFill','ccEdit','controlsMenu','save','print','exportHtml'].includes(id)){toast('«'+c.label+'» non è disponibile durante la compilazione del modulo: premi Esc per uscire');return}if(!available(c)){toast('«'+c.label+'» non è disponibile in '+appName());return}if(isCalc()&&id!=='editCell')finishCell();hideTip();await handleAction(id);if(c.toggle&&!c.quiet){refreshToggles();announce(c.label+(safe(c.toggle)?' attivato':' disattivato'))}else{if(c.say)announce(c.say);refreshToggles()}}
