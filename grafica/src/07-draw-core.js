// Disegno: un foglio con oggetti uno sopra l'altro (rettangoli, ellissi, linee, testi e immagini), misurati in pixel
// del foglio. Si salva in SVG, che si apre in ogni browser e programma di grafica; dentro c'è anche la descrizione
// degli oggetti, così Disegno lo riapre modificabile. Gli oggetti più avanti nell'elenco stanno sopra.
const SHEETS=[['post','Post 4:5, 1080 × 1350',1080,1350],['quadrato','Quadrato, 1080 × 1080',1080,1080],['storia','Storia 9:16, 1080 × 1920',1080,1920],['video','Orizzontale 16:9, 1920 × 1080',1920,1080],['banner','Banner, 1500 × 500',1500,500],['a4','A4 verticale, 2480 × 3508 (300 dpi)',2480,3508],['a4o','A4 orizzontale, 3508 × 2480 (300 dpi)',3508,2480],['icona','Icona, 512 × 512',512,512]];
const sheetPreset=p=>(SHEETS.find(s=>s[2]===p.w&&s[3]===p.h)||[''])[0];
const FONTS=[['system-ui, sans-serif','Senza grazie del sistema'],["'Segoe UI', sans-serif",'Segoe UI'],['Arial, sans-serif','Arial'],['Verdana, sans-serif','Verdana'],["'Trebuchet MS', sans-serif",'Trebuchet MS'],['Georgia, serif','Georgia'],["'Times New Roman', serif",'Times New Roman'],["'Courier New', monospace",'Courier New']];
const KIND_NAME={rect:'Rettangolo',ellipse:'Ellisse',line:'Linea',text:'Testo',image:'Immagine',path:'Tracciato',poly:'Poligono',arrow:'Freccia',bubble:'Fumetto'};
const KIND_ICON={rect:'rect',ellipse:'ellipse',line:'lineI',text:'textI',image:'image',path:'pathI',poly:'polygon',arrow:'arrowR',bubble:'bubble'};
// Quello che si aggiunge alla descrizione di un oggetto, secondo il tipo.
const KIND_SAY={path:it=>(it.tool?`, tratto a mano libera di ${nodeList(it).length} nodi`:`, ${pathSummary(it)}`)+endsSay(it)};
const newDrawing=()=>({title:'Senza titolo',w:1080,h:1350,bg:'#ffffff',desc:'',items:[]});
// Il disegno aperto, l'oggetto scelto, la cronologia e le immagini (file originali, indirizzi per l'anteprima);
// ras sono le maschere calcolate delle immagini (lo scontorno), per id, come rasters in Immagini.
// Dw.sel è l'oggetto principale, quello delle proprietà; Dw.multi gli altri scelti con lui. tool è lo strumento del foglio.
const Dw={p:newDrawing(),sel:null,multi:{for:null,ids:[]},base:'',hist:[],redo:[],imgs:new Map(),zoom:0,clip:null,last:{label:'',t:0},guides:[],tool:'select',ras:new Map()};
const snapD=()=>JSON.stringify(Dw.p);
Dw.base=snapD();
const itemOf=id=>Dw.p.items.find(x=>x.id===id);
const selItem=()=>itemOf(Dw.sel);
function selIds(){const it=selItem();if(!it)return [];const ids=new Set([it.id,...(Dw.multi.for===Dw.sel?Dw.multi.ids:[])]);return Dw.p.items.filter(x=>ids.has(x.id)).map(x=>x.id)}
const selItems=()=>{const ids=new Set(selIds());return Dw.p.items.filter(x=>ids.has(x.id))};
// Riquadro di un oggetto senza rotazione; le linee vanno da (x, y) a (x+w, y+h) e w o h possono essere negativi.
const box=it=>it.kind==='line'?{x:Math.min(it.x,it.x+it.w),y:Math.min(it.y,it.y+it.h),w:Math.abs(it.w),h:Math.abs(it.h)}:{x:it.x,y:it.y,w:it.w,h:it.h};
// Le modifiche ravvicinate con lo stesso nome (le frecce tenute premute) diventano un solo passo da annullare.
function settleD(label,{props=false,merge=false}={}){const now=snapD();if(now===Dw.base)return false;const join=merge&&Dw.last.label===label&&Date.now()-Dw.last.t<1200&&Dw.hist.length;if(!join){Dw.hist.push({label,p:Dw.base,sel:Dw.sel});if(Dw.hist.length>200)Dw.hist.shift()}Dw.redo=[];Dw.base=now;Dw.last={label,t:Date.now()};drawingChanged({props});return true}
function editD(label,fn,opts){fn(Dw.p);return settleD(label,opts)}
function drawUndo(redo){const from=redo?Dw.redo:Dw.hist,to=redo?Dw.hist:Dw.redo,e=from.pop();if(!e){toast(redo?'Niente da ripetere':'Niente da annullare');return}to.push({label:e.label,p:snapD(),sel:Dw.sel});Dw.p=JSON.parse(e.p);Dw.base=e.p;Dw.last={label:'',t:0};
 const keep=[Dw.sel,...(Dw.multi.for===Dw.sel?Dw.multi.ids:[])].filter(itemOf);if(!itemOf(Dw.sel))Dw.sel=keep[0]||(itemOf(e.sel)?e.sel:null);Dw.multi={for:Dw.sel,ids:keep};toolReset();drawingChanged({props:true});announce((redo?'Ripetuto: ':'Annullato: ')+e.label)}
// Dopo ogni modifica: foglio, livelli, proprietà, pulsanti attivi e bozza.
function drawingChanged({props=false}={}){renderSheet();renderLayers();if(props)renderProps();else syncProps();refreshToggles();schedulePersist('disegno')}
// Testo: la misura del riquadro segue le righe scritte, il carattere e la dimensione.
const measureCtx=new OffscreenCanvas(1,1).getContext('2d');
const fontCss=it=>`${it.italic?'italic ':''}${it.bold?700:400} ${it.size}px ${it.font}`;
// Il testo che va a capo nel riquadro tiene la sua larghezza; quello lungo una curva tiene il riquadro della curva.
function measureText(it){if(it.subs)return;measureCtx.font=fontCss(it);const ls=it.ls||0,lines=textLines(it);if(!it.wrap)it.w=Math.max(1,Math.ceil(Math.max(...lines.map(l=>measureCtx.measureText(l).width+ls*[...l].length))));it.h=Math.max(1,Math.ceil(lines.length*it.size*it.lineH))}
function nextName(kind,base=KIND_NAME[kind]){let n=1;while(Dw.p.items.some(x=>x.name===base+' '+n))n++;return base+' '+n}
const KIND_DEFAULTS={rect:(p,s)=>({w:Math.round(s*.5),h:Math.round(s*.3),fill:'#0e6f8a'}),ellipse:(p,s)=>({w:Math.round(s*.35),h:Math.round(s*.35),fill:'#e8a33d'}),
 line:(p,s)=>({w:Math.round(s*.5),h:0,fill:'none',sw:Math.max(2,Math.round(s/120))}),
 text:(p,s)=>({text:'Scrivi qui',font:FONTS[0][0],size:Math.max(8,Math.round(s/12)),bold:true,italic:false,align:'left',lineH:1.2,fill:'#1b1b1b'}),
 image:()=>({adj:{},look:'none',lookAmt:100})};
// Un oggetto nuovo entra al centro del foglio, sopra gli altri, e diventa l'oggetto scelto.
function addItem(kind,extra={}){const p=Dw.p,s=Math.min(p.w,p.h),it={id:uid(),kind,name:nextName(kind),x:0,y:0,w:100,h:100,rot:0,opacity:100,fill:'#0e6f8a',stroke:'#1b1b1b',sw:0,radius:0,...KIND_DEFAULTS[kind](p,s),...extra};
 if(kind==='text')measureText(it);it.x=Math.round((p.w-it.w)/2);it.y=Math.round((p.h-it.h)/2);
 Dw.sel=it.id;editD('Inserisci '+it.name,q=>{q.items.push(it)},{props:true});announce(`Inserito l’oggetto «${it.name}» al centro del foglio, sopra gli altri. Le proprietà sono nel riquadro a destra.`);return it}
const describeItem=it=>{const b=box(it);return `${it.name}${it.name.startsWith(kindName(it))?'':', '+kindName(it).toLowerCase()}${it.kind==='text'?` «${it.text.replace(/\n/g,' ')}»`:''}${KIND_SAY[it.kind]?.(it)||''}${clipSay(it)}${styleSay(it)}, x ${fmtInt(b.x)}, y ${fmtInt(b.y)}, ${fmtInt(b.w)} per ${fmtInt(b.h)}${it.rot?`, ruotato di ${fmtNum(it.rot,0)} gradi`:''}${it.opacity<100?`, opacità ${it.opacity}%`:''}${it.hidden?', nascosto':''}${it.lock?', bloccato':''}`};
// Immagini del disegno: il file originale resta com'è; per l'anteprima e per l'esportazione si usa un indirizzo locale.
function registerImage(id,blob,name,w,h){const old=Dw.imgs.get(id);if(old)URL.revokeObjectURL(old.url);Dw.imgs.set(id,{blob,name,w,h,type:blob.type,url:URL.createObjectURL(blob),bmp:null})}
const isSvgFile=f=>/svg/i.test(f.type)||/\.svg$/i.test(f.name);
async function svgSize(file){const doc=new DOMParser().parseFromString(await file.text(),'image/svg+xml'),s=doc.documentElement,vb=(s.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number),w=parseFloat(s.getAttribute('width'))||vb[2]||300,h=parseFloat(s.getAttribute('height'))||vb[3]||150;return [Math.round(w),Math.round(h)]}
// Le immagini entrano grandi al massimo l'80% del foglio, con le loro proporzioni.
async function addImages(files){for(const f of files){let w,h;try{if(isSvgFile(f))[w,h]=await svgSize(f);else{const bmp=await decodePhoto(f);w=bmp.width;h=bmp.height;bmp.close()}}catch(e){toast(e.message);continue}
 const id=uid(),k=Math.min(1,Dw.p.w*.8/w,Dw.p.h*.8/h);registerImage(id,f,f.name,w,h);addItem('image',{img:id,w:Math.max(1,Math.round(w*k)),h:Math.max(1,Math.round(h*k)),name:safeFileName(baseName(f.name)).slice(0,40)||nextName('image')})}}
async function newDrawingCmd(){if(Dw.p.items.length&&!(await confirmAction('Il disegno attuale verrà chiuso. Se non l’hai salvato in SVG lo perdi: vuoi continuare?','Nuovo disegno')))return;Object.assign(Dw,{p:newDrawing(),sel:null,hist:[],redo:[],zoom:0});Dw.base=snapD();$('docTitle').value=Dw.p.title;updateTitle();drawingChanged({props:true});announce('Nuovo disegno vuoto, formato post 4:5. Inserisci forme, testi e immagini dalla scheda Inserisci.')}
// Bozza: il disegno a ogni modifica, ogni immagine e ogni maschera calcolata una volta sola; quelle non più usate si tolgono.
const imgSaved=new Set(),rasSaved=new Set();
const usedRasters=()=>new Set(Dw.p.items.map(x=>x.kind==='image'&&x.photo?.cut?.raster).filter(Boolean));
async function persistDrawing(){await dbPut('drawing',{p:Dw.p,sel:Dw.sel});const used=new Set(Dw.p.items.filter(x=>x.kind==='image').map(x=>x.img));
 for(const id of used){const m=Dw.imgs.get(id);if(m&&!imgSaved.has(id)){await dbPut('dimg:'+id,{blob:m.blob,name:m.name,w:m.w,h:m.h});imgSaved.add(id)}}
 const ras=usedRasters();for(const id of ras){const R=Dw.ras.get(id);if(R&&!rasSaved.has(id)){await dbPut('dras:'+id,{w:R.w,h:R.h,data:R.data});rasSaved.add(id)}}
 for(const k of await dbKeys()){const s=String(k);if(s.startsWith('dimg:')&&!used.has(s.slice(5))){await dbDel(k);imgSaved.delete(s.slice(5))}else if(s.startsWith('dras:')&&!ras.has(s.slice(5))){await dbDel(k);rasSaved.delete(s.slice(5))}}}
async function restoreDrawing(){const d=await dbGet('drawing');if(!d?.p)return;Dw.p=Object.assign(newDrawing(),d.p);
 for(const it of Dw.p.items)if(it.kind==='image'&&!Dw.imgs.has(it.img)){const m=await dbGet('dimg:'+it.img);if(m){registerImage(it.img,m.blob,m.name,m.w,m.h);imgSaved.add(it.img)}}
 for(const id of usedRasters())if(!Dw.ras.has(id)){const R=await dbGet('dras:'+id);if(R){Dw.ras.set(id,R);rasSaved.add(id)}}
 Dw.p.items=Dw.p.items.filter(it=>it.kind!=='image'||Dw.imgs.has(it.img));Dw.sel=itemOf(d.sel)?d.sel:null;Dw.base=snapD()}
