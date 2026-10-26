// Formule esportate con nomi inglesi e separatore virgola; stringhe e nomi di foglio tra apici restano intatti.
const EXPORT_NAME={CONCAT:'CONCATENATE'};EXPORT_NAME.FILTER='_xlfn._xlws.FILTER';EXPORT_NAME.SORT='_xlfn._xlws.SORT';for(const n of ['SORTBY','UNIQUE','SEQUENCE','RANDARRAY','CHOOSECOLS','CHOOSEROWS','VSTACK','HSTACK','TAKE','DROP','TOCOL','TOROW','TEXTSPLIT','XMATCH','ANCHORARRAY','IFS','SWITCH','XLOOKUP','TEXTJOIN','MAXIFS','MINIFS','IFNA','DAYS','ISOWEEKNUM','STDEV.S','STDEV.P','VAR.S','VAR.P','RANK.EQ','MODE.SNGL'])EXPORT_NAME[n]='_xlfn.'+n;
function normalizeFormula(f){const s=f.replace(/^=/,'').split(/("(?:[^"]|"")*")/).map((part,i)=>i%2?part:part.replace(/((?:'(?:[^']|'')+'|[A-Za-zÀ-ÿ_][\wÀ-ÿ.]*)!)?(\$?[A-Za-z]{1,3}\$?\d+)#/g,'_xlfn.ANCHORARRAY($1$2)')).join('');let out='',i=0;while(i<s.length){const ch=s[i];if(ch==='"'||ch==="'"){let j=i+1;while(j<s.length){if(s[j]===ch){if(s[j+1]===ch){j+=2;continue}break}j++}out+=s.slice(i,j+1);i=j+1;continue}const m=/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*/.exec(s.slice(i));if(m){const w=m[0],up=w.toUpperCase();if(/^\s*\(/.test(s.slice(i+w.length))){const en=fnCanon(w);out+=EXPORT_NAME[en]||en}else out+=up==='VERO'?'TRUE':up==='FALSO'?'FALSE':w;i+=w.length;continue}out+=ch===';'?',':ch;i++}return out}
function fxml(v,result){const f=`<f>${esc(normalizeFormula(v))}</f>`;if(typeof result==='string'&&result.startsWith('#'))return ` t="e">${f}<v>${ERR_XLSX[result]||'#VALUE!'}</v></c>`;if(typeof result==='boolean')return ` t="b">${f}<v>${result?1:0}</v></c>`;if(typeof result==='number'&&Number.isFinite(result))return `>${f}<v>${result}</v></c>`;return ` t="str">${f}<v>${esc(result)}</v></c>`}
// Proprietà del documento (titolo, lingua, autore, data), comuni a DOCX e XLSX.
const CORE_CT=ctPart('/docProps/core.xml',CT_PKG+'core-properties+xml');
const CORE_REL={id:'rIdCore',type:PKG_REL+'/metadata/core-properties',target:'docProps/core.xml'};
function coreXml(title){const stamp=new Date().toISOString().replace(/\.\d+Z$/,'Z');
 const ns={'xmlns:cp':OOXML+'package/2006/metadata/core-properties','xmlns:dc':'http://purl.org/dc/elements/1.1/','xmlns:dcterms':'http://purl.org/dc/terms/','xmlns:xsi':'http://www.w3.org/2001/XMLSchema-instance'};
 return XML_DECL+xmlEl('cp:coreProperties',ns,xmlEl('dc:title',{},esc(title))+xmlEl('dc:language',{},'it-IT')+xmlEl('dc:creator',{},'Tassello Ufficio')+xmlEl('dcterms:created',{'xsi:type':'dcterms:W3CDTF'},stamp))}
function pgSz(){const p=state.paper,letter=p.startsWith('letter'),w=letter?12240:11906,h=letter?15840:16838;return p.endsWith('landscape')?`<w:pgSz w:w="${h}" w:h="${w}" w:orient="landscape"/>`:`<w:pgSz w:w="${w}" w:h="${h}"/>`}
function docDefaults(){const d=state.doc,f=esc(d.font);return `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/><w:sz w:val="22"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="${Math.round(+d.space*20)}" w:line="${Math.round(+d.line*240)}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`}
const QUOTE_STYLE='<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>';
function indXml(node){const m=node.style?.marginLeft||'',v=parseFloat(m);return v?`<w:ind w:left="${Math.round(v*(m.endsWith('px')?15:20))}"/>`:''}
// Formule lette da un XLSX: nomi italiani e punto e virgola, come se fossero state scritte qui.
function localizeFormula(f){const s=f.replace(/_xl(fn|ws)\./gi,'').replace(/\bANCHORARRAY\(\s*((?:'(?:[^']|'')+'!|[A-Za-z_][\w.]*!)?\$?[A-Za-z]{1,3}\$?\d+)\s*\)/gi,'$1#');let out='',i=0;while(i<s.length){const ch=s[i];if(ch==='"'||ch==="'"){let j=i+1;while(j<s.length){if(s[j]===ch){if(s[j+1]===ch){j+=2;continue}break}j++}out+=s.slice(i,j+1);i=j+1;continue}const m=/^[A-Za-z_][A-Za-z0-9_.]*/.exec(s.slice(i));if(m){const w=m[0],up=w.toUpperCase();if(/^\s*\(/.test(s.slice(i+w.length)))out+=IT_NAME[fnCanon(w)]||w;else out+=up==='TRUE'?'VERO':up==='FALSE'?'FALSO':w;i+=w.length;continue}out+=ch===','?';':ch;i++}return out}
// XLSX: le formule che restituiscono matrici diventano matrici dinamiche di Excel 365 (cm="1" + xl/metadata.xml); le celle espanse portano i valori calcolati.
const META_CT=ctPart('/xl/metadata.xml',CT_SHEET+'sheetMetadata+xml');
const META_XML=()=>`${XML_DECL}<metadata xmlns="${XLS_ML}" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray"><metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes><futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata><cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>`;
// Tipo (attributo t) e contenuto di <v> per un valore calcolato: errore, booleano, numero o testo.
function cellType(v){const err=isErr(v);if(err||typeof v==='string'&&v.startsWith('#'))return ['e',ERR_XLSX[err?v.m:v]||'#VALUE!'];
 if(typeof v==='boolean')return ['b',Number(v)];if(typeof v==='number'&&Number.isFinite(v))return [null,v];return ['str',esc(v??'')]}
const inlineText=text=>xmlEl('is',{},xmlEl('t',{'xml:space':'preserve'},esc(text)));
function valueCell(attrs,v){if(v==null||v==='')return xmlEl('c',attrs);if(typeof v==='string'&&!v.startsWith('#'))return xmlEl('c',{...attrs,t:'inlineStr'},inlineText(v));
 const [t,x]=cellType(v);return xmlEl('c',{...attrs,t},xmlEl('v',{},x))}
// Valori delle matrici dinamiche oltre la cella con la formula: Excel li vuole già scritti nel foglio.
function spilledValues(s){const out=new Map();for(const a of anchorsOf(s)){let raw;try{raw=anchorRaw(a.r,a.c,s,new Set())}catch(e){continue}
 if(!isArr(raw)||spillOf(a.r,a.c,s,new Set()).blocked)continue;raw.forEach((row,i)=>row.forEach((v,j)=>{if(i||j)out.set(toRef(a.r+i,a.c+j),v)}))}return out}
function formulaCell(attrs,src,at,s,flags){let raw=null;try{raw=anchorRaw(at.r,at.c,s,new Set())}catch(e){}const dynamic=isArr(raw);let area=attrs.r;
 if(dynamic){flags.dynamic=true;const sp=spillOf(at.r,at.c,s,new Set());if(!sp.blocked)area+=':'+toRef(sp.r2,sp.c2)}
 const [t,x]=cellType(computed(at.r,at.c,s));return xmlEl('c',{...attrs,t,cm:dynamic?1:null},xmlEl('f',dynamic?{t:'array',ref:area}:{},esc(normalizeFormula(src)))+xmlEl('v',{},x))}
function literalCell(attrs,v,date){const num=date?date.v:rawNumber(v);return !Number.isNaN(num)&&(date||!/^0\d/.test(v))?xmlEl('c',attrs,xmlEl('v',{},num)):xmlEl('c',{...attrs,t:'inlineStr'},inlineText(v))}
// Larghezze di colonna: Excel le misura in caratteri, circa 7 pixel l'uno.
function colsXml(s){let list='';for(const [k,px] of Object.entries(s.widths||{})){const col=Number(k);if(!(col>=0&&col<16384))continue;list+=xmlEl('col',{min:col+1,max:col+1,width:(px/7).toFixed(2),customWidth:1})}return list&&xmlEl('cols',{},list)}
function sheetXml(s,styles,flags,drawing=false,legacy=false){const out=new Map(),spilled=spilledValues(s),put=(at,x)=>out.set(at.r*16384+at.c,x);
 for(const [ref,obj] of Object.entries(s.cells)){const at=parseRef(ref);if(!obj||!at)continue;const v=String(obj.v??'');if(!v&&!Object.keys(obj.s||{}).length&&!spilled.has(ref))continue;
  const date=v&&!v.startsWith('=')&&Number.isNaN(rawNumber(v))?parseDateText(v):null,look=date&&(!obj.s?.fmt||obj.s.fmt==='Generale')?{...obj.s,fmt:DATE_KIND[date.kind]}:obj.s||{},attrs={r:ref,s:styles.styleId(look)};
  if(v.length>1&&v.startsWith('='))put(at,formulaCell(attrs,v,at,s,flags));
  else if(v)put(at,literalCell(attrs,v,date));
  else if(spilled.has(ref)){put(at,valueCell(attrs,spilled.get(ref)));spilled.delete(ref)}
  else put(at,xmlEl('c',attrs))}
 for(const [ref,v] of spilled)put(parseRef(ref),valueCell({r:ref},v));
 const rows=new Map();for(const k of [...out.keys()].sort((a,b)=>a-b)){const r=Math.floor(k/16384);rows.set(r,(rows.get(r)||'')+out.get(k))}
 const merges=(s.merges||[]).map(m=>xmlEl('mergeCell',{ref:m}));
 return XML_DECL+xmlEl('worksheet',{xmlns:XLS_ML,'xmlns:r':DOC_REL},[xmlEl('dimension',{ref:'A1'}),xmlEl('sheetViews',{},sheetViewXml(s)),xmlEl('sheetFormatPr',{defaultRowHeight:15}),colsXml(s),
  xmlEl('sheetData',{},[...rows].map(([r,x])=>xmlEl('row',{r:r+1},x)).join('')),merges.length?xmlEl('mergeCells',{count:merges.length},merges.join('')):'',cfXml(s),dvXml(s),
  drawing?xmlEl('drawing',{'r:id':'rIdDr1'}):'',legacy?xmlEl('legacyDrawing',{'r:id':'rIdVml1'}):''].join(''))}
// Parti di un foglio oltre alle celle (grafici, note, tabelle pivot) e relazioni che le legano al foglio.
function sheetParts(s,i,add,counts,pvc){const n=i+1,links=[],charts=xlsxChartParts(s,counts.charts),notes=notesParts(s,i);
 if(charts){counts.charts+=charts.charts.length;add({name:`xl/drawings/drawing${n}.xml`,data:charts.drawing},CT_OFFICE+'drawing+xml');add({name:`xl/drawings/_rels/drawing${n}.xml.rels`,data:charts.drawingRels});
  for(const c of charts.charts)add(c,CT_OFFICE+'drawingml.chart+xml');links.push(docRel('rIdDr1','drawing',`../drawings/drawing${n}.xml`))}
 if(notes){counts.notes+=notesOf(s).length;add({name:`xl/comments${n}.xml`,data:notes.comments},CT_SHEET+'comments+xml');add({name:`xl/drawings/vmlDrawing${n}.vml`,data:notes.vml});
  links.push(docRel('rIdCm1','comments',`../comments${n}.xml`),docRel('rIdVml1','vmlDrawing',`../drawings/vmlDrawing${n}.vml`))}
 for(const pt of pivotParts(s,pvc)){const k=pt.n;
  add({name:`xl/pivotTables/pivotTable${k}.xml`,data:pt.table},CT_SHEET+'pivotTable+xml');add({name:`xl/pivotTables/_rels/pivotTable${k}.xml.rels`,data:rels([docRel('rId1','pivotCacheDefinition',`../pivotCache/pivotCacheDefinition${k}.xml`)])});
  add({name:`xl/pivotCache/pivotCacheDefinition${k}.xml`,data:pt.cache},CT_SHEET+'pivotCacheDefinition+xml');add({name:`xl/pivotCache/pivotCacheRecords${k}.xml`,data:XML_DECL+xmlEl('pivotCacheRecords',{xmlns:XLS_ML,'xmlns:r':DOC_REL,count:0})},CT_SHEET+'pivotCacheRecords+xml');
  add({name:`xl/pivotCache/_rels/pivotCacheDefinition${k}.xml.rels`,data:rels([docRel('rId1','pivotCacheRecords',`pivotCacheRecords${k}.xml`)])});
  links.push(docRel('rIdPt'+k,'pivotTable',`../pivotTables/pivotTable${k}.xml`));pvc.caches.push(k)}
 if(links.length)add({name:`xl/worksheets/_rels/sheet${n}.xml.rels`,data:rels(links)});
 return{drawing:!!charts,legacy:!!notes}}
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
function exportXlsx(){CF_DXF.length=0;const styles=xlsxStyles(),flags={dynamic:false},counts={charts:0,notes:0},pvc={n:0,skipped:0,caches:[]},extra=[],extraTypes=[];
 const add=(file,type)=>{extra.push(file);if(type)extraTypes.push(ctPart('/'+file.name,type))};
 const sheets=state.sheets.map((s,i)=>{const p=sheetParts(s,i,add,counts,pvc);return sheetXml(s,styles,flags,p.drawing,p.legacy)}),nums=sheets.map((_,i)=>i+1);
 const book=XML_DECL+xmlEl('workbook',{xmlns:XLS_ML,'xmlns:r':DOC_REL},xmlEl('sheets',{},state.sheets.map((s,i)=>xmlEl('sheet',{name:s.name,sheetId:i+1,'r:id':'rId'+(i+1)})).join(''))+definedNamesXml()
  +xmlEl('calcPr',{calcId:191029,fullCalcOnLoad:1})+(pvc.caches.length?xmlEl('pivotCaches',{},pvc.caches.map(k=>xmlEl('pivotCache',{cacheId:k,'r:id':'rIdPc'+k})).join('')):''));
 const types=typesXml([ctDefault('rels',CT_PKG+'relationships+xml'),ctDefault('xml','application/xml'),ctDefault('vml',CT_OFFICE+'vmlDrawing'),ctPart('/xl/workbook.xml',CT_SHEET+'sheet.main+xml'),ctPart('/xl/styles.xml',CT_SHEET+'styles+xml'),
  ...nums.map(n=>ctPart(`/xl/worksheets/sheet${n}.xml`,CT_SHEET+'worksheet+xml')),flags.dynamic?META_CT:'',...extraTypes,CORE_CT]);
 const bookRels=[...nums.map(n=>docRel('rId'+n,'worksheet',`worksheets/sheet${n}.xml`)),docRel('rIdStyles','styles','styles.xml'),...pvc.caches.map(k=>docRel('rIdPc'+k,'pivotCacheDefinition',`pivotCache/pivotCacheDefinition${k}.xml`)),...(flags.dynamic?[docRel('rIdMeta','sheetMetadata','metadata.xml')]:[])];
 const files=[],put=(name,data)=>files.push({name,data});
 put('[Content_Types].xml',types);put('_rels/.rels',rels([docRel('rId1','officeDocument','xl/workbook.xml'),CORE_REL]));put('xl/workbook.xml',book);put('xl/styles.xml',styles.render());put('xl/_rels/workbook.xml.rels',rels(bookRels));
 sheets.forEach((data,i)=>put(`xl/worksheets/sheet${i+1}.xml`,data));if(flags.dynamic)put('xl/metadata.xml',META_XML());files.push(...extra);put('docProps/core.xml',coreXml(state.excelTitle));
 const zip=makeZip(files);download(zip,extName(state.excelTitle,'xlsx'),CT_SHEET+'sheet');
 const info=['XLSX scaricato: '+plural(sheets.length,'foglio','fogli')];if(flags.dynamic)info.push('matrici dinamiche incluse');if(counts.charts)info.push(plural(counts.charts,'grafico','grafici'));if(counts.notes)info.push(plural(counts.notes,'nota','note'));
 if(pvc.n)info.push(plural(pvc.n,'tabella pivot','tabelle pivot')+(pvc.skipped?` (${pvc.skipped} con date raggruppate solo come valori)`:''));toast(info.join(' · '))}
