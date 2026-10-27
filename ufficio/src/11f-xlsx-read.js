// Stili delle celle per il file XLSX: caratteri, riempimenti, bordi e combinazioni vengono raccolti una sola volta e numerati.
// Formati numerici: quelli incorporati di Excel (0, 2, 9, 49) e quattro personalizzati da 164 in poi.
const XLSX_NUMFMT={Generale:0,Numero:2,Percentuale:9,Testo:49,Valuta:164,Data:165,Ora:166,'Data e ora':167};
const XLSX_CUSTOM_FMT=[[164,'"€" #,##0.00'],[165,'dd/mm/yyyy'],[166,'hh:mm'],[167,'dd/mm/yyyy hh:mm']];
// Raccolta numerata senza doppioni: add restituisce l'indice già assegnato alla chiave, o ne assegna uno nuovo.
function indexedPool(items,seed=[]){const index=new Map(seed);return{items,add(key,value){if(!index.has(key)){index.set(key,items.length);items.push(value)}return index.get(key)}}}
function xlsxStyles(){
 // Le prime voci sono quelle che Excel si aspetta: carattere predefinito, due riempimenti riservati, nessun bordo, stile 0.
 const fonts=indexedPool([{font:'Calibri',size:11}]),fills=indexedPool([null,null],[['',0]]),xfs=indexedPool([{fmt:0,fontId:0,fillId:0,borderId:0,wrap:false,align:'left'}]),borders=[false];
 function styleId(s={}){if(Object.keys(s).length===0)return 0;
  const font={size:s.size||11,font:s.font||'Calibri',color:s.color||'',bold:!!s.bold,underline:!!s.underline,italic:!!s.italic},fill=s.fill||'';
  if(s.border&&borders.length<2)borders.push(true);
  const xf={fontId:fonts.add(JSON.stringify(font),font),fillId:fills.add(fill,fill),borderId:s.border?1:0,wrap:!!s.wrap,align:s.align||'general',fmt:XLSX_NUMFMT[s.fmt]||0};
  return xfs.add(JSON.stringify(xf),xf)}
 const argbOf=hex=>'FF'+hex.slice(1).toUpperCase();
 const fontXml=f=>xmlEl('font',{},(f.bold?'<b/>':'')+(f.italic?'<i/>':'')+(f.underline?'<u/>':'')+xmlEl('sz',{val:Number(f.size)||11})+xmlEl('name',{val:f.font||'Calibri'})+(f.color&&/^#[0-9a-f]{6}$/i.test(f.color)?xmlEl('color',{rgb:argbOf(f.color)}):''));
 const pattern=(type,inner)=>xmlEl('fill',{},xmlEl('patternFill',{patternType:type},inner));
 const fillXml=(f,i)=>i===0?pattern('none'):i===1?pattern('gray125'):pattern('solid',xmlEl('fgColor',{rgb:argbOf(f)})+xmlEl('bgColor',{indexed:64}));
 const borderXml=on=>xmlEl('border',{},['left','right','top','bottom'].map(side=>on?xmlEl(side,{style:'thin'},xmlEl('color',{rgb:'FF666666'})):xmlEl(side)).join('')+xmlEl('diagonal'));
 const xfXml=x=>xmlEl('xf',{numFmtId:x.fmt,fontId:x.fontId,fillId:x.fillId,borderId:x.borderId,xfId:0,applyAlignment:1,applyFill:1},xmlEl('alignment',{horizontal:x.align,wrapText:x.wrap?1:0}));
 const counted=(name,items,fn)=>xmlEl(name,{count:items.length},items.map(fn).join(''));
 const render=()=>XML_DECL+xmlEl('styleSheet',{xmlns:XLS_ML},[counted('numFmts',XLSX_CUSTOM_FMT,([id,code])=>xmlEl('numFmt',{numFmtId:id,formatCode:code})),counted('fonts',fonts.items,fontXml),counted('fills',fills.items,fillXml),counted('borders',borders,borderXml),
  xmlEl('cellStyleXfs',{count:1},xmlEl('xf',{numFmtId:0,fontId:0,fillId:0,borderId:0})),counted('cellXfs',xfs.items,xfXml),xmlEl('cellStyles',{count:1},xmlEl('cellStyle',{name:'Normal',xfId:0,builtinId:0})),dxfXml()].join(''));
 return{styleId,render}}
// Lettura degli stili di un file XLSX: restituisce una funzione che dall'indice dello stile ricava grassetto, colori, formato e allineamento.
function xlsxStyleReader(doc){const fonts=children(first(doc,'fonts'),'font'),fills=children(first(doc,'fills'),'fill'),xfs=children(first(doc,'cellXfs'),'xf'),codes={};for(const n of nodes(doc,'numFmt'))codes[attr(n,'numFmtId')]=attr(n,'formatCode');
 const argb=el=>{const v=attr(el,'rgb');return /^[0-9a-f]{8}$/i.test(v)?'#'+v.slice(2):null};
 const kindOf=(id,code)=>{const bare=code.replace(/"[^"]*"/g,'');if(id===49||code==='@')return 'Testo';if(id===9||id===10||code.includes('%'))return 'Percentuale';if(id===22||id===167||(/h/i.test(code)&&/[dy]/i.test(bare)))return 'Data e ora';if([18,19,20,21,45,46,47,166].includes(id)||/h/i.test(bare))return 'Ora';if([14,15,16,17,165].includes(id)||/[dmy]/i.test(bare))return 'Data';if([43,44,164].includes(id)||/€|\$/.test(code))return 'Valuta';return id>=2&&id<=4?'Numero':''};
 return idx=>{const xf=xfs[Number(idx)||0];if(!xf)return {};const s={},font=fonts[Number(attr(xf,'fontId'))];
  if(font){for(const [tag,key] of [['b','bold'],['i','italic'],['u','underline']])if(first(font,tag))s[key]=true;const ink=argb(first(font,'color'));if(ink)s.color=ink;const size=Number(attr(first(font,'sz'),'val'));if(size>0)s.size=size}
  const bg=argb(first(fills[Number(attr(xf,'fillId'))],'fgColor'));if(bg)s.fill=bg;
  const id=Number(attr(xf,'numFmtId')),kind=kindOf(id,codes[id]||'');if(kind)s.fmt=kind;
  const al=first(xf,'alignment');if(al){const h=attr(al,'horizontal');if(CELL_ALIGNS.has(h))s.align=h;if(attr(al,'wrapText')==='1')s.wrap=true}
  return s}}
function sheetPath(target){let p=String(target).replace(/^\//,'');if(!p.startsWith('xl/'))p='xl/'+p.replace(/^\.\.\//,'');return p.replace(/\/\.\//g,'/')}
function readColWidths(doc){const w={};for(const col of nodes(first(doc,'cols'),'col')){const from=Number(attr(col,'min'))-1,to=Math.min(COLS-1,Number(attr(col,'max'))-1),px=Math.round((Number(attr(col,'width'))||13)*7);for(let c=Math.max(0,from);c<=to;c++)w[c]=px}return w}
// Nelle formule matrice resta solo la cella di partenza: le altre si ricalcolano con l'espansione.
function markArrayArea(area,at,covered){const [a,b]=String(area).split(':'),p=parseRef(a),q=parseRef(b||a);if(!p||!q)return;for(let r=p.r;r<=Math.min(q.r,ROWS-1);r++)for(let c=p.c;c<=Math.min(q.c,COLS-1);c++)if(r!==at.r||c!==at.c)covered.add(toRef(r,c))}
// Valore di una cella XLSX come lo si scriverebbe qui: formula localizzata, testo condiviso o in linea, TRUE/FALSE, numero.
function xlsxCellValue(c,shared){const f=first(c,'f'),type=attr(c,'t'),v=textNode(first(c,'v'));
 if(f&&textNode(f).trim())return '='+localizeFormula(textNode(f));if(f&&type==='str')return v;
 switch(type){case 's':return shared[Number(v)]||'';case 'inlineStr':return nodes(c,'t').map(t=>t.textContent).join('');case 'b':return v==='1'?'TRUE':'FALSE';default:return v}}
function readSheetCells(doc,shared,styleOf){const cells={},covered=new Set();let skipped=0;
 for(const c of nodes(first(doc,'sheetData'),'c')){const ref=attr(c,'r'),at=parseRef(ref);if(!at||at.r>=ROWS||at.c>=COLS){skipped++;continue}if(covered.has(ref))continue;
  const f=first(c,'f');if(f&&attr(f,'t')==='array')markArrayArea(attr(f,'ref')||ref,at,covered);
  cells[ref]={v:xlsxCellValue(c,shared),s:styleOf(attr(c,'s'))}}
 return{cells,skipped}}
// Dopo un'importazione si passa al foglio di calcolo, senza cronologia, e si ridisegna tutto.
function showWorkbook(){hist=[];redo=[];invalidate();if(!isCalc())setMode('excel');renderSheetTabs();bump()}
function importXlsx(entries){const part=name=>xml(zipText(entries,name)),book=part('xl/workbook.xml'),list=first(book,'sheets');if(!list)throw Error('Il file non contiene una cartella di lavoro XLSX');
 const relmap=Object.fromEntries(nodes(part('xl/_rels/workbook.xml.rels'),'Relationship').map(r=>[attr(r,'Id'),attr(r,'Target')]));
 const sst=zipText(entries,'xl/sharedStrings.xml'),shared=sst?nodes(xml(sst),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[];
 const styDoc=part('xl/styles.xml'),styleOf=xlsxStyleReader(styDoc),dxfs=parseDxfs(styDoc);pivotImportPrep(book,relmap,entries);
 const sheets=[];let skipped=0;
 for(const sh of nodes(list,'sheet')){const n=sheets.length+1,name=(attr(sh,'name')||'Foglio'+n).slice(0,31),path=sheetPath(relmap[attr(sh,'id')]||`worksheets/sheet${n}.xml`),raw=zipText(entries,path);if(!raw)continue;
  const doc=xml(raw),read=readSheetCells(doc,shared,styleOf);skipped+=read.skipped;
  sheets.push({name,cells:read.cells,widths:readColWidths(doc),merges:nodes(first(doc,'mergeCells'),'mergeCell').map(m=>attr(m,'ref')),charts:importCharts(entries,path,name),...importSheetExtras(doc,entries,path,read.cells,dxfs),pivots:importPivots(entries,path)});if(sheets.length>=100)break}
 if(!sheets.length)throw Error('Nel file non c\'è nessun foglio leggibile');
 Object.assign(state,{sheets,names:importNames(book),sheet:0});if(sheets.some(s=>s.pivots.length))setTimeout(()=>pivotRefreshAll(true),0);showWorkbook();
 toast('Importati '+plural(sheets.length,'foglio','fogli')+(skipped?` · ${skipped} celle oltre i limiti della griglia lasciate fuori`:''))}
// Tabella di dati dal primo foglio di un XLSX, per Impagina: i valori come sono salvati, le formule con il loro ultimo
// risultato, i numeri con la virgola e le date in italiano.
function xlsxTable(entries){const part=name=>xml(zipText(entries,name)),book=part('xl/workbook.xml'),sh=nodes(first(book,'sheets'),'sheet')[0];if(!sh)throw Error('Il file non contiene una cartella di lavoro XLSX');
 const relmap=Object.fromEntries(nodes(part('xl/_rels/workbook.xml.rels'),'Relationship').map(r=>[attr(r,'Id'),attr(r,'Target')]));
 const sst=zipText(entries,'xl/sharedStrings.xml'),shared=sst?nodes(xml(sst),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join('')):[],styleOf=xlsxStyleReader(part('xl/styles.xml')),raw=zipText(entries,sheetPath(relmap[attr(sh,'id')]||'worksheets/sheet1.xml'));if(!raw)throw Error('Nel file non c’è nessun foglio leggibile');
 const grid=[];for(const c of nodes(xml(raw),'c')){const at=parseRef(attr(c,'r'));if(!at||at.r>5000||at.c>=60)continue;const t=attr(c,'t'),v=textNode(first(c,'v'));let val=t==='s'?shared[+v]||'':t==='inlineStr'?nodes(c,'t').map(x=>x.textContent).join(''):t==='b'?(v==='1'?'VERO':'FALSO'):v;
  if(!t&&v!==''&&isFinite(+v))val=/^Data/.test(styleOf(attr(c,'s'))?.fmt||'')?new Date(Math.round((+v-25569)*864e5)).toLocaleDateString('it-IT',{timeZone:'UTC'}):(+v).toLocaleString('it-IT',{maximumFractionDigits:10,useGrouping:false});
  (grid[at.r]??=[])[at.c]=val}
 return{name:attr(sh,'name'),rows:Array.from(grid,r=>Array.from(r||[],x=>x??''))}}
// CSV: separatore riconosciuto dalla prima riga (tabulazione, punto e virgola o virgola), campi tra virgolette con "" per le virgolette.
function csvSeparator(text){const line=text.split(/\r?\n/,1)[0]||'';if(line.includes('\t'))return '\t';const count=ch=>line.split(ch).length-1;return count(';')>count(',')?';':','}
function parseCSV(text){const sep=csvSeparator(text),rows=[[]];let cur='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(quoted){if(ch!=='"')cur+=ch;else if(text[i+1]==='"'){cur+='"';i++}else quoted=false;continue}
  if(ch==='"')quoted=true;
  else if(ch===sep){rows[rows.length-1].push(cur);cur=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;rows[rows.length-1].push(cur);cur='';if(rows.length>=ROWS)return rows;rows.push([])}
  else cur+=ch}
 rows[rows.length-1].push(cur);return rows}
function importCSV(text){const cells={};parseCSV(String(text).replace(/^﻿/,'')).slice(0,ROWS).forEach((row,r)=>row.slice(0,COLS).forEach((v,c)=>{if(v)cells[toRef(r,c)]={v,s:{}}}));
 state.sheets=[{...blankSheet(),cells}];state.names=[];state.sheet=0;showWorkbook();toast('File CSV importato')}
// CSV con punto e virgola e BOM, come lo apre Excel in italiano; contiene i valori come appaiono nel foglio attivo.
const CSV_MIME='text/csv;charset=utf-8';
function exportCSV(){const s=sheet(),{rows,cols}=sheetExtent(s),field=t=>/[;"\n]/.test(t)?'"'+t.replaceAll('"','""')+'"':t;
 const lines=Array.from({length:rows+1},(_,r)=>Array.from({length:cols+1},(_,c)=>field(String(displayValue(r,c,s)))).join(';'));
 const text='\uFEFF'+lines.join('\r\n');toast('Esportato in CSV solo il foglio attivo');download(text,extName(state.excelTitle,'csv'),CSV_MIME)}
// Apertura di un file: il tipo si riconosce dall'estensione (DOCX, XLSX, CSV e TSV, HTML e testo, backup JSON).
const currentTitle=()=>isWord()?state.wordTitle:isCalc()?state.excelTitle:Pg.p?.title??'';
async function openText(file,base,ext){const body=await file.text();$('wordEditor').innerHTML=ext==='txt'?`<p>${esc(body).replace(/\n/g,'<br>')}</p>`:sanitizeHTML(body);wordHistReset();wordChanged();setMode('word');state.wordTitle=base;toast('Documento aperto'+altNotice())}
async function openSheetTable(file,base){importCSV(await file.text());state.excelTitle=base}
const OPENERS=new Map([
 ['xlsx',async(file,base)=>{importXlsx(await zipEntries(await file.arrayBuffer()));state.excelTitle=base}],
 ['docx',async(file,base)=>{importDocx(await zipEntries(await file.arrayBuffer()));state.wordTitle=base}],
 ['json',async file=>{const o=JSON.parse(await file.text());if(o?.programma==='Tassello Impagina'){setMode('impagina',{focus:false});await pageLoadProject(o,file.name);return}loadProject(o)}],
 ['csv',openSheetTable],['tsv',openSheetTable],['html',openText],['htm',openText],['txt',openText]]);
async function openFile(file){if(!file)return;if(isPage()){await pageOpenFiles([file]);return}const name=file.name||'file',ext=name.split('.').pop().toLowerCase(),base=name.replace(/\.[^.]+$/,'');
 try{status(`Apertura di ${name}…`);const open=OPENERS.get(ext);if(!open)throw Error('Formato non supportato');await open(file,base,ext);
  if(ext!=='json')$('docTitle').value=currentTitle();schedulePersist();updateTitle();status('Aperto: '+name)}
 catch(err){console.error(err);toast('Impossibile aprire il file: '+err.message);status('Errore: '+err.message)}}
async function fileSave(){if(isPage()){pageSave();return}try{(isWord()?exportDocx:exportXlsx)();await persist()}catch(err){console.error(err);toast('Impossibile salvare: '+err.message)}}
function projectBackup(){download(JSON.stringify(snapshot(),null,2),extName(currentTitle(),'json'),'application/json');toast('Copia di sicurezza del progetto scaricata')}
// Pagina HTML autonoma con il documento e uno stile essenziale.
function htmlExport(){const body=sanitizeHTML($('wordEditor').innerHTML).replace(/ contenteditable="false"/g,'');
 const head=['<meta charset="utf-8">',`<title>${esc(state.wordTitle)}</title>`,'<meta name="viewport" content="initial-scale=1,width=device-width">',`<style>${HTML_EXPORT_CSS}</style>`].join('');
 const page=`<!DOCTYPE html><html lang="it"><head>${head}</head><body>${body}</body></html>`;download(page,extName(state.wordTitle,'html'),'text/html')}
