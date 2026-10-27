// Impagina: documenti a più pagine fatti di cornici (testo, immagini e forme) su pagine con margini, colonne,
// griglia e mastri. Le misure sono in pixel CSS (96 per pollice): i documenti da stampa le mostrano in millimetri
// e il corpo dei caratteri in punti, quelli per lo schermo in pixel. Il testo vive nelle storie: ogni storia ha la sua
// catena di cornici e scorre dall'una all'altra, anche da una pagina alla successiva.
const MM=96/25.4;
// Formati pronti: id, nome, larghezza e altezza, unità, margini (alto, destra, basso, sinistra), colonne,
// spazio tra le colonne, pagine iniziali e corpo del testo, tutto in pixel.
// I margini della copertina di Facebook e del banner di LinkedIn lasciano fuori le parti tagliate sul telefono e quella
// coperta dalla foto del profilo.
const PG_PRESETS=[
 ['post','Post 4:5 (1080 × 1350 px)',1080,1350,'px',[96,90,110,90],1,36,1,38],
 ['quadrato','Post quadrato 1:1 (1080 × 1080 px)',1080,1080,'px',[90,90,90,90],1,36,1,36],
 ['carosello','Carosello di post 4:5, 5 pagine',1080,1350,'px',[96,90,130,90],1,36,5,38],
 ['storia','Storia 9:16 (1080 × 1920 px)',1080,1920,'px',[250,90,340,90],1,36,1,46],
 ['fbcover','Copertina Facebook (1640 × 624 px)',1640,624,'px',[60,280,60,280],1,36,1,36],
 ['linkedin','Banner LinkedIn (1584 × 396 px)',1584,396,'px',[48,80,48,420],1,32,1,34],
 ['miniatura','Miniatura video 16:9 (1280 × 720 px)',1280,720,'px',[56,64,72,64],1,32,1,40],
 ['a4','Volantino A4 (210 × 297 mm)',210*MM,297*MM,'mm',[15,15,15,15].map(v=>v*MM),1,5*MM,1,15],
 ['letter','Volantino Letter USA (8,5 × 11 pollici)',8.5*96,11*96,'mm',[15,15,15,15].map(v=>v*MM),1,5*MM,1,15],
 ['a5','Volantino A5 (148 × 210 mm)',148*MM,210*MM,'mm',[12,12,12,12].map(v=>v*MM),1,4*MM,1,13.3],
 ['a3','Locandina A3 (297 × 420 mm)',297*MM,420*MM,'mm',[15,15,15,15].map(v=>v*MM),1,6*MM,1,20],
 ['brochure','Brochure A4 a due colonne, 4 pagine',210*MM,297*MM,'mm',[18,16,22,16].map(v=>v*MM),2,6*MM,4,13.3],
 ['newsletter','Newsletter A4, 2 pagine',210*MM,297*MM,'mm',[22,15,20,15].map(v=>v*MM),3,5*MM,2,12.7],
 ['biglietto','Biglietto da visita (85 × 55 mm), fronte e retro',85*MM,55*MM,'mm',[5,5,5,5].map(v=>v*MM),1,3*MM,2,12.7],
 ['cartolina','Cartolina A6 (148 × 105 mm), fronte e retro',148*MM,105*MM,'mm',[8,8,8,8].map(v=>v*MM),1,4*MM,2,13.3],
 ['invito','Invito DL (99 × 210 mm)',99*MM,210*MM,'mm',[10,10,10,10].map(v=>v*MM),1,4*MM,1,13.3],
 ['segnalibro','Segnalibro (50 × 200 mm), fronte e retro',50*MM,200*MM,'mm',[6,6,6,6].map(v=>v*MM),1,3*MM,2,12.7],
 ['attestato','Attestato A4 orizzontale (297 × 210 mm)',297*MM,210*MM,'mm',[18,18,18,18].map(v=>v*MM),1,6*MM,1,16],
 ['a2','Poster A2 (420 × 594 mm)',420*MM,594*MM,'mm',[20,20,20,20].map(v=>v*MM),1,8*MM,1,28],
 ['a1','Poster A1 (594 × 841 mm)',594*MM,841*MM,'mm',[28,28,28,28].map(v=>v*MM),1,10*MM,1,40],
 ['a0','Poster A0 (841 × 1189 mm)',841*MM,1189*MM,'mm',[40,40,40,40].map(v=>v*MM),1,14*MM,1,56],
 ['striscione','Striscione 300 × 50 cm',3000*MM,500*MM,'mm',[40,60,40,60].map(v=>v*MM),1,20*MM,1,110],
 ['slide','Presentazione 16:9 (1920 × 1080 px)',1920,1080,'px',[96,120,120,120],1,48,3,40]];
const PG_KIND={text:'Testo',image:'Immagine',sign:'Insegna',rect:'Rettangolo',ellipse:'Ellisse',tri:'Triangolo',line:'Linea'};
const PG_ICON={text:'textbox',image:'image',sign:'sign',rect:'rect',ellipse:'ellipse',tri:'triangle',line:'lineI'};
// Caratteri: quelli del sistema, con la famiglia generica di riserva.
const fontStack=f=>`'${String(f).replace(/['"]/g,'')}', ${/^(Georgia|Cambria|Times New Roman)$/.test(f)?'serif':f==='Consolas'?'monospace':'sans-serif'}`;
const r1=v=>Math.round(v*10)/10,pr2=v=>Math.round(v*100)/100,clampV=(v,a,b)=>Math.max(a,Math.min(b,v));
// Stili iniziali, proporzionati al corpo del testo b. «next» è lo stile del paragrafo che segue quando si va a capo.
function pgStyles(b){const s=(name,o)=>({name,font:'Segoe UI',size:r1(b),lh:1.35,bold:false,italic:false,caps:false,color:'#1b1b1b',align:'left',before:0,after:r1(b*.5),bullet:false,next:'',...o});
 return {ps:{titolo:s('Titolo',{font:'Georgia',size:r1(b*2.4),lh:1.1,bold:true,after:r1(b*.6),next:'corpo'}),sottotitolo:s('Sottotitolo',{size:r1(b*1.4),lh:1.2,color:'#3d3d3d',after:r1(b*.7),next:'corpo'}),
  occhiello:s('Occhiello',{size:r1(Math.max(b*.8,12)),bold:true,caps:true,color:'#8a4100',after:r1(b*.35),next:'titolo'}),titoletto:s('Titoletto',{size:r1(b*1.15),lh:1.2,bold:true,before:r1(b*.7),after:r1(b*.3),next:'corpo'}),
  corpo:s('Corpo del testo'),elenco:s('Elenco puntato',{bullet:true,after:r1(b*.25)}),citazione:s('Citazione',{font:'Georgia',size:r1(b*1.2),italic:true,color:'#3d3d3d',before:r1(b*.3),after:r1(b*.7)}),
  didascalia:s('Didascalia',{size:r1(Math.max(b*.8,12)),italic:true,color:'#575757'}),note:s('Note',{size:r1(Math.max(b*.85,12)),color:'#575757',after:0}),numero:s('Numero di pagina',{size:r1(Math.max(b*.85,12)),color:'#575757',align:'right',after:0}),
  titoloInverso:s('Titolo su fondo scuro',{font:'Georgia',size:r1(b*2.2),lh:1.1,bold:true,color:'#ffffff',after:r1(b*.5),next:'corpoInverso'}),corpoInverso:s('Testo su fondo scuro',{color:'#ffffff'})},
  cs:{forte:{name:'Forte',bold:true},enfasi:{name:'Enfasi',italic:true},evidenza:{name:'Evidenza',bold:true,color:'#8a4100'}}}}
// Lo stato di Impagina: il documento, la vista (pagina o mastro), la cornice scelta, la riga dei dati in anteprima,
// la cronologia e le immagini (file originali con l'indirizzo locale per vederle).
const Pg={p:null,pi:0,mid:'',sel:null,row:0,zoom:0,guides:true,grid:false,clip:null,hist:[],redo:[],base:'',last:{label:'',t:0},imgs:new Map(),folder:null,ver:0};
const pgSnap=()=>JSON.stringify(Pg.p);
const P=(ps,t)=>({ps,runs:[{t,cs:''}]});
const pgInner=p=>({x:p.m.l,y:p.m.t,w:p.w-p.m.l-p.m.r,h:p.h-p.m.t-p.m.b});
function newPub(id){const [pid,label,w,h,unit,m,cols,gut,npages,b]=PG_PRESETS.find(x=>x[0]===id)||PG_PRESETS[0];
 const p={v:1,title:label.replace(/ \(.*$|,.*$/g,''),preset:pid,w,h,unit,m:{t:m[0],r:m[1],b:m[2],l:m[3]},cols,gut,step:unit==='mm'?5*MM:Math.round(w/36),snap:false,bg:'#ffffff',tiles:pgTilesDefault(PG_TILED.has(pid)),...pgStyles(b),stories:{},masters:[{id:uid(),name:'Mastro A',items:[],read:[]}],pages:[],data:null,folder:''};
 for(let i=0;i<npages;i++)p.pages.push(pgBlankPage(p));return p}
const pgBlankPage=p=>({id:uid(),master:p.masters[0]?.id||'',items:[],read:[],data:false,alt:''});
// Nomi delle cornici: «Testo 1», «Immagine 2»… unici in tutto il documento.
function pgNextName(p,kind){const base=PG_KIND[kind],used=new Set(pgAllItems(p).map(x=>x.name));let n=1;while(used.has(base+' '+n))n++;return base+' '+n}
const pgAllItems=p=>[...p.masters,...p.pages].flatMap(h=>h.items);
const PG_DEF={text:p=>({story:'',cols:1,gut:p.gut,pad:0,valign:'top'}),image:()=>({img:'',fit:'fill',fx:50,fy:50,field:'',file:''}),sign:()=>({...pgSignStyle('classica'),style:'classica',text:'Scrivi qui',fit:true,size:48,img:''}),rect:()=>({fill:'#f6e8da'}),ellipse:()=>({fill:'#f6e8da'}),tri:()=>({fill:'#f6e8da'}),line:p=>({h:0,sw:Math.max(1,Math.round(p.w/400))})};
function pgMk(p,kind,o={}){return {id:uid(),kind,name:o.name||pgNextName(p,kind),x:0,y:0,w:100,h:100,fill:'none',stroke:'#1b1b1b',sw:0,radius:0,opacity:100,alt:'',deco:!['text','image','sign'].includes(kind),...PG_DEF[kind](p),...o}}
function pgPut(holder,it){holder.items.push(it);holder.read.push(it.id);return it}
function pgNewStory(p,paras){const id=uid();p.stories[id]={paras:paras.length?paras:[P('corpo','')],chain:[],src:''};return id}
function pgPutText(p,holder,o,paras){const it=pgPut(holder,pgMk(p,'text',{...o,story:pgNewStory(p,paras)}));p.stories[it.story].chain.push(it.id);return it}
// Una cornice che continua la catena di un'altra.
function pgPutLinked(p,holder,prev,o){const it=pgPut(holder,pgMk(p,'text',{...o,story:prev.story}));p.stories[prev.story].chain.push(it.id);return it}
// Contenuti di esempio: cornici già al loro posto, con testi che spiegano che cosa fare.
const PG_SAMPLE=['Questo è un testo di esempio: sostituiscilo con il tuo scrivendo nel riquadro Testo, a destra, oppure importa un DOCX dalla scheda Fonti.','Il testo scorre da solo nelle cornici collegate, anche da una pagina all’altra. Se non entra, la cornice mostra un segno rosso e la verifica dell’accessibilità te lo segnala.','Gli stili di paragrafo e di carattere tengono il documento coerente: cambia uno stile e cambiano tutti i paragrafi che lo usano.'];
function pgStarter(p){const i=pgInner(p),M=p.masters[0],pg=p.pages,b=p.ps.corpo.size,num=o=>pgPutText(p,M,{name:'Numero di pagina',...o},[P('numero','«Pagina» / «Pagine»')]),body=()=>PG_SAMPLE.map(t=>P('corpo',t));
 const img=(h,o)=>pgPut(h,pgMk(p,'image',o));
 switch(p.preset){
  case 'post':pgPutText(p,pg[0],{name:'Titolo',x:i.x,y:i.y,w:i.w,h:i.h*.3},[P('occhiello','Novità'),P('titolo','Il titolo del tuo post')]);img(pg[0],{name:'Foto',x:i.x,y:i.y+i.h*.32,w:i.w,h:i.h*.48});pgPutText(p,pg[0],{name:'Messaggio',x:i.x,y:i.y+i.h*.83,w:i.w,h:i.h*.17},[P('corpo','Scrivi qui il messaggio: due righe che invitano a leggere.')]);break;
  case 'carosello':num({x:p.w-p.m.r-240,y:p.h-p.m.b+30,w:240,h:b*1.6});
   pgPutText(p,pg[0],{name:'Copertina',x:i.x,y:i.y,w:i.w,h:i.h*.42},[P('occhiello','Guida in 5 passi'),P('titolo','Il titolo del carosello')]);img(pg[0],{name:'Foto di copertina',x:i.x,y:i.y+i.h*.45,w:i.w,h:i.h*.55});
   for(let k=1;k<pg.length;k++)pgPutText(p,pg[k],{name:'Passo '+k,x:i.x,y:i.y,w:i.w,h:i.h,valign:'middle'},k<pg.length-1?[P('titoletto',`${k}. Il passo numero ${k}`),P('corpo',PG_SAMPLE[(k-1)%3])]:[P('titolo','Ti è stato utile?'),P('corpo','Salva il post e condividilo con chi ne ha bisogno.')]);break;
  case 'storia':img(pg[0],{name:'Sfondo',x:0,y:0,w:p.w,h:p.h});pgPut(pg[0],pgMk(p,'rect',{name:'Fascia',x:0,y:p.h*.6,w:p.w,h:p.h*.4,fill:'#1b1b1b'}));
   pgPutText(p,pg[0],{name:'Titolo',x:i.x,y:p.h*.6+70,w:i.w,h:p.h-p.m.b-p.h*.6-70},[P('titoloInverso','Il titolo della storia'),P('corpoInverso','Una frase breve, che si legga anche di corsa.')]);break;
  case 'a4':case 'a5':pgPutText(p,pg[0],{name:'Titolo',x:i.x,y:i.y,w:i.w,h:i.h*.22},[P('occhiello','Sabato 14 marzo, ore 18'),P('titolo','Il titolo del volantino')]);img(pg[0],{name:'Foto',x:i.x,y:i.y+i.h*.24,w:i.w,h:i.h*.4});
   pgPutText(p,pg[0],{name:'Testo',x:i.x,y:i.y+i.h*.67,w:i.w,h:i.h*.25},body().slice(0,2));pgPutText(p,pg[0],{name:'Contatti',x:i.x,y:i.y+i.h*.94,w:i.w,h:i.h*.06},[P('note','Indirizzo · telefono · sito')]);break;
  case 'brochure':{num({x:i.x,y:p.h-p.m.b+6*MM,w:i.w,h:b*1.6});pgPutText(p,pg[0],{name:'Copertina',x:i.x,y:i.y,w:i.w,h:i.h*.3},[P('occhiello','Brochure'),P('titolo','Il titolo della brochure'),P('sottotitolo','Una frase che riassume il contenuto')]);img(pg[0],{name:'Foto di copertina',x:i.x,y:i.y+i.h*.34,w:i.w,h:i.h*.66});
   let prev=pgPutText(p,pg[1],{name:'Testo pagina 2',x:i.x,y:i.y,w:i.w,h:i.h,cols:2},[P('titoletto','Chi siamo'),...body(),P('titoletto','Che cosa facciamo'),P('elenco','Pagine e cornici si scelgono anche con le frecce'),P('elenco','Ogni proprietà ha un campo con il suo nome'),P('elenco','Alt+Maiusc+I descrive la pagina'),P('citazione','«Una buona impaginazione si nota poco: fa leggere meglio.»'),...body(),P('titoletto','Dove trovarci'),...body()]);
   for(let k=2;k<pg.length;k++)prev=pgPutLinked(p,pg[k],prev,{name:'Testo pagina '+(k+1),x:i.x,y:i.y,w:i.w,h:i.h,cols:2});break}
  case 'newsletter':{pgPutText(p,M,{name:'Intestazione',x:i.x,y:8*MM,w:i.w,h:b*1.6},[P('note','«Titolo del documento» · «Data di oggi»')]);num({x:i.x,y:p.h-p.m.b+6*MM,w:i.w,h:b*1.6});
   pgPutText(p,pg[0],{name:'Testata',x:i.x,y:i.y,w:i.w,h:i.h*.12},[P('titolo','Il nome della newsletter')]);pgPut(pg[0],pgMk(p,'line',{name:'Filetto',x:i.x,y:i.y+i.h*.125,w:i.w}));img(pg[0],{name:'Foto in apertura',x:i.x,y:i.y+i.h*.14,w:i.w,h:i.h*.3});
   const first=pgPutText(p,pg[0],{name:'Articolo',x:i.x,y:i.y+i.h*.47,w:i.w,h:i.h*.53,cols:3},[P('titoletto','La notizia del mese'),...body(),P('titoletto','Dalla redazione'),...body(),P('titoletto','Appuntamenti'),P('elenco','Lunedì: riunione'),P('elenco','Giovedì: presentazione'),...body(),...body()]);
   pgPutLinked(p,pg[1],first,{name:'Articolo, seguito',x:i.x,y:i.y,w:i.w,h:i.h,cols:3});break}
  case 'a2':case 'a1':case 'a0':pgPut(pg[0],pgMk(p,'sign',{...pgSignStyle('tramonto'),style:'tramonto',name:'Titolo',text:'Il titolo del poster',x:i.x,y:i.y,w:i.w,h:i.h*.16}));img(pg[0],{name:'Foto',x:i.x,y:i.y+i.h*.19,w:i.w,h:i.h*.5});
   pgPutText(p,pg[0],{name:'Testo',x:i.x,y:i.y+i.h*.73,w:i.w,h:i.h*.2,cols:2,gut:p.gut},[P('titoletto','Dove e quando'),P('corpo',PG_SAMPLE[0])]);pgPutText(p,pg[0],{name:'Contatti',x:i.x,y:i.y+i.h*.95,w:i.w,h:i.h*.05},[P('note','Indirizzo · telefono · sito')]);break;
  case 'striscione':pgPut(pg[0],pgMk(p,'sign',{...pgSignStyle('tramonto'),style:'tramonto',name:'Scritta',text:'Benvenuti!',x:i.x,y:i.y,w:i.w,h:i.h}));break;
  case 'slide':num({x:p.w-p.m.r-300,y:p.h-p.m.b+40,w:300,h:b*1.4});pgPutText(p,pg[0],{name:'Titolo',x:i.x,y:i.y,w:i.w,h:i.h,valign:'middle'},[P('titolo','Il titolo della presentazione'),P('sottotitolo','Nome, data, occasione')]);
   pgPutText(p,pg[1],{name:'Punti',x:i.x,y:i.y,w:i.w,h:i.h},[P('titoletto','Tre punti da ricordare'),P('elenco','Il primo punto, in una riga'),P('elenco','Il secondo punto'),P('elenco','Il terzo punto')]);
   pgPutText(p,pg[2],{name:'Testo',x:i.x,y:i.y,w:i.w*.48,h:i.h},[P('titoletto','Un’immagine e il suo commento'),P('corpo',PG_SAMPLE[0])]);img(pg[2],{name:'Foto',x:i.x+i.w*.52,y:i.y,w:i.w*.48,h:i.h});break}
 return p}
// Cronologia: ogni modifica salva il documento com'era; quelle ravvicinate con lo stesso nome diventano un passo solo.
function pgSettle(label,{props=false,merge=false}={}){const now=pgSnap();if(now===Pg.base)return false;const join=merge&&Pg.last.label===label&&Date.now()-Pg.last.t<1200&&Pg.hist.length;if(!join){Pg.hist.push({label,p:Pg.base,sel:Pg.sel,pi:Pg.pi,mid:Pg.mid});if(Pg.hist.length>150)Pg.hist.shift()}Pg.redo=[];Pg.base=now;Pg.last={label,t:Date.now()};pgChanged({props});return true}
function pgEdit(label,fn,opts){fn(Pg.p);return pgSettle(label,opts)}
function pgUndo(redo){const from=redo?Pg.redo:Pg.hist,to=redo?Pg.hist:Pg.redo,e=from.pop();if(!e){toast(redo?'Niente da ripetere':'Niente da annullare');return}to.push({label:e.label,p:pgSnap(),sel:Pg.sel,pi:Pg.pi,mid:Pg.mid});Pg.p=JSON.parse(e.p);Pg.base=e.p;Pg.last={label:'',t:0};Pg.pi=Math.min(e.pi,Pg.p.pages.length-1);Pg.mid=Pg.p.masters.some(m=>m.id===e.mid)?e.mid:'';Pg.sel=pgHolder()?.items.some(x=>x.id===e.sel)?e.sel:null;if(isPage()&&$('docTitle').value!==Pg.p.title){$('docTitle').value=Pg.p.title;updateTitle()}pgChanged({props:true,story:true});announce((redo?'Ripetuto: ':'Annullato: ')+e.label)}
// Dove si lavora: la pagina attuale o il mastro aperto, e la cornice scelta.
const pgCurPage=()=>Pg.p&&!Pg.mid?Pg.p.pages[Pg.pi]:null;
const pgHolder=()=>Pg.p?(Pg.mid?Pg.p.masters.find(m=>m.id===Pg.mid):Pg.p.pages[Pg.pi]):null;
const pgSel=()=>pgHolder()?.items.find(x=>x.id===Pg.sel)||null;
const pgMasterOf=pg=>Pg.p.masters.find(m=>m.id===pg?.master)||null;
function pgWhere(id){const p=Pg.p;for(const [i,pg] of p.pages.entries()){const it=pg.items.find(x=>x.id===id);if(it)return{it,holder:pg,pi:i}}for(const m of p.masters){const it=m.items.find(x=>x.id===id);if(it)return{it,holder:m,mid:m.id}}return null}
// Ordine di lettura della pagina: quello scritto in read, con in coda le cornici che mancano.
function pgReadOrder(h){const byId=new Map(h.items.map(x=>[x.id,x])),out=[];for(const id of h.read||[]){const it=byId.get(id);if(it){out.push(it);byId.delete(id)}}return out.concat([...byId.values()])}
// Le copie delle pagine che finiscono nel PDF e nei PNG: una per pagina, oppure una per riga dei dati se la pagina si ripete.
function pgInstances(p){const out=[],rows=p.data?.rows||[];p.pages.forEach((pg,i)=>{if(pg.data&&rows.length)rows.forEach((row,ri)=>out.push({pg,i,row,ri}));else out.push({pg,i,row:null,ri:-1})});out.forEach((I,k)=>{I.n=k+1;I.total=out.length});out.total=out.length;return out}
// Nell'editor ogni pagina compare una volta: le pagine dai dati con la riga in anteprima.
function pgViewInstances(p){const all=pgInstances(p),rows=p.data?.rows.length||0,r=Math.min(Pg.row,Math.max(0,rows-1)),out=all.filter(I=>I.ri<0||I.ri===r);out.total=all.total;return out}
// Campi nel testo: «Pagina», «Pagine», «Titolo del documento», «Data di oggi» e i campi dei dati. Un campo è un nome breve
// senza punteggiatura: le citazioni tra virgolette basse («Una frase.») restano testo.
const FIELD_RE=/«([^«»\n.,;:!?]{1,40})»/g;
const PG_BUILTIN={pagina:c=>String(c.n),pagine:c=>String(c.total),'titolo del documento':c=>c.title,'data di oggi':c=>c.date};
function pgFieldValue(name,ctx){if(ctx.raw)return null;const low=name.trim().toLowerCase(),d=Pg.p.data;if(d&&ctx.row){const i=d.fields.findIndex(f=>f.toLowerCase()===low);if(i>=0)return String(ctx.row[i]??'')}return PG_BUILTIN[low]?PG_BUILTIN[low](ctx):null}
const fillFields=(t,ctx)=>t.includes('«')?t.replace(FIELD_RE,(m,f)=>pgFieldValue(f,ctx)??m):t;
// Misura del testo con il canvas, ricordata per carattere e parola.
const pgCanvas=new OffscreenCanvas(1,1).getContext('2d'),pgWidths=new Map();let pgFontNow='';
function textWidth(font,s){const k=font+'|'+s;let w=pgWidths.get(k);if(w===undefined){if(pgFontNow!==font){pgCanvas.font=font;pgFontNow=font}w=pgCanvas.measureText(s).width;if(pgWidths.size>40000)pgWidths.clear();pgWidths.set(k,w)}return w}
// Stile di un pezzo di testo: quello del paragrafo con sopra lo stile del carattere.
function runSt(p,ps,cs){const c=cs&&p.cs[cs],st={font:ps.font,size:ps.size,bold:ps.bold,italic:ps.italic,color:ps.color,caps:ps.caps,under:false};if(c){if(c.bold)st.bold=true;if(c.italic)st.italic=true;if(c.under)st.under=true;if(c.color)st.color=c.color;if(c.font)st.font=c.font}st.css=`${st.italic?'italic ':''}${st.bold?700:400} ${st.size}px ${fontStack(st.font)}`;return st}
// Colonne di una cornice di testo, al netto del margine interno.
function frameRegions(it){const pad=Math.max(0,it.pad||0),x=it.x+pad,y=it.y+pad,w=Math.max(1,it.w-2*pad),h=Math.max(1,it.h-2*pad),n=Math.max(1,Math.min(12,it.cols|0||1)),g=n>1?Math.max(0,it.gut||0):0,cw=Math.max(1,(w-(n-1)*g)/n);return Array.from({length:n},(_,k)=>({x:x+k*(cw+g),y,w:cw,h}))}
// Scorrimento del testo: i paragrafi vanno a capo parola per parola nelle regioni (le colonne delle cornici della
// catena, in ordine). Ritorna le righe, con la regione e la linea di base, e quanti caratteri restano fuori.
function flowStory(p,s,regions,ctx){const lines=[],fallback=p.ps.corpo||Object.values(p.ps)[0];let ri=0,R=regions[0],y=R?R.y:0,top=true,over=0;
 for(const para of s.paras){const ps=p.ps[para.ps]||fallback,atoms=[];
  for(const run of para.runs){const st=runSt(p,ps,run.cs);let t=fillFields(run.t,ctx);if(st.caps)t=t.toLocaleUpperCase('it');for(const m of t.matchAll(/\s+|\S+/g)){const sp=/^\s/.test(m[0]),tx=sp?' ':m[0];atoms.push({t:tx,st,sp,w:textWidth(st.css,tx)})}}
  if(!R){over+=atoms.reduce((n,a)=>n+a.t.length,0)+1;continue}
  if(!top)y+=ps.before;
  const pst=runSt(p,ps,''),bw=ps.bullet?textWidth(pst.css,'•')+ps.size*.6:0;let i=0,firstLine=true;
  while(firstLine||i<atoms.length){if(!R){over+=atoms.slice(i).reduce((n,a)=>n+a.t.length,0)+1;break}
   if(!firstLine){while(i<atoms.length&&atoms[i].sp)i++;if(i>=atoms.length)break}
   const avail=Math.max(1,R.w-bw);let j=i,used=0,size=0;
   while(j<atoms.length){const a=atoms[j];
    // Una parola più larga della colonna si spezza dove serve.
    if(!a.sp&&j===i&&a.w>avail&&a.t.length>1){let k=1;while(k<a.t.length-1&&textWidth(a.st.css,a.t.slice(0,k+1))<=avail)k++;const rest=a.t.slice(k);atoms.splice(j+1,0,{...a,t:rest,w:textWidth(a.st.css,rest)});a.t=a.t.slice(0,k);a.w=textWidth(a.st.css,a.t)}
    if(!a.sp&&j>i&&used+a.w>avail+.01)break;used+=a.w;size=Math.max(size,a.st.size);j++}
   let end=j;while(end>i&&atoms[end-1].sp)end--;let w=0;for(let k=i;k<end;k++)w+=atoms[k].w;
   if(!size)size=ps.size;const lh=size*ps.lh;
   if(y+lh>R.y+R.h+.5){ri++;R=regions[ri];if(R){y=R.y;top=true}continue}
   const ext=avail-w,last=j>=atoms.length;let x=R.x+bw,gap=0;
   if(ps.align==='center')x+=ext/2;else if(ps.align==='right')x+=ext;else if(ps.align==='justify'&&!last){const n=atoms.slice(i,end).filter(a=>a.sp).length;if(n)gap=ext/n}
   const pieces=firstLine&&ps.bullet?[{x:R.x,t:'•',st:pst}]:[];let cur=null;
   for(let k=i;k<end;k++){const a=atoms[k];if(gap&&a.sp){x+=a.w+gap;cur=null;continue}if(cur&&cur.st===a.st)cur.t+=a.t;else pieces.push(cur={x,t:a.t,st:a.st});x+=a.w}
   lines.push({r:ri,top:y,lh,base:y+(lh-size)/2+size*.8,pieces});y+=lh;top=false;firstLine=false;i=j}
  if(R)y+=ps.after}
 return{lines,over}}
// Impaginazione di un gruppo di copie di pagina: per ogni storia le cornici della catena nell'ordine giusto.
// Le storie delle pagine normali scorrono attraverso le pagine; quelle dei mastri e delle pagine dai dati
// si impaginano a parte in ogni copia, con il suo numero di pagina e la sua riga dei dati.
const pgToday=()=>new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});
function pgLayout(p,insts,{raw=false}={}){const res=new Map(),jobs=new Map(),total=insts.total??insts.length,date=pgToday();
 insts.forEach((I,ii)=>{const ctx={n:I.n,total,row:I.row,title:p.title,date,raw},m=pgMasterOf(I.pg),list=[...(m?m.items.map(it=>[it,'m'+ii]):[]),...I.pg.items.map(it=>[it,I.row?'d'+ii:'n'])];
  for(const [it,key] of list){if(it.kind!=='text'||!p.stories[it.story])continue;const k=key+'|'+it.story;let j=jobs.get(k);if(!j)jobs.set(k,j={s:p.stories[it.story],frames:[],ctx});j.frames.push([it,ii])}});
 for(const j of jobs.values()){const order=j.s.chain;j.frames.sort((a,b)=>order.indexOf(a[0].id)-order.indexOf(b[0].id));const regions=[];
  for(const [it,ii] of j.frames){const key=ii+'|'+it.id;res.set(key,{lines:[],over:0,it});for(const r of frameRegions(it))regions.push({...r,key})}
  const out=flowStory(p,j.s,regions,j.ctx);for(const ln of out.lines)res.get(regions[ln.r].key).lines.push(ln);
  const lastKey=j.frames.at(-1)[1]+'|'+j.frames.at(-1)[0].id;if(out.over)res.get(lastKey).over=out.over;
  // Allineamento verticale: vale per la cornice a una colonna in cui il testo finisce.
  if(!out.over)for(const [it,ii] of j.frames){const f=res.get(ii+'|'+it.id);if(it.valign==='top'||!it.valign||(it.cols||1)>1||!f.lines.length)continue;const later=j.frames.slice(j.frames.findIndex(x=>x[0]===it&&x[1]===ii)+1).some(([i2,k2])=>res.get(k2+'|'+i2.id).lines.length);if(later)continue;
   const r=frameRegions(it)[0],free=r.y+r.h-(f.lines.at(-1).top+f.lines.at(-1).lh),d=free*(it.valign==='middle'?.5:1);if(d>0)f.lines=f.lines.map(l=>({...l,top:l.top+d,base:l.base+d}))}}
 return res}
// Immagine di una cornice: quella scelta, oppure quella che ha per nome il valore del campo dei dati.
function pgImgFor(it,ctx){if(it.field&&ctx?.row&&Pg.p.data){const i=Pg.p.data.fields.indexOf(it.field),v=i<0?'':String(ctx.row[i]??'').trim();if(v){const m=pgFieldImage(v);if(m)return m}}return it.img?Pg.imgs.get(it.img)||null:null}
// Posizione dell'immagine nella cornice: «Adatta» la mostra tutta, «Riempi» copre la cornice tenendo al centro il punto focale.
function pgFitBox(it,m){const k=it.fit==='fit'?Math.min(it.w/m.w,it.h/m.h):Math.max(it.w/m.w,it.h/m.h),dw=m.w*k,dh=m.h*k,fx=(it.fx??50)/100,fy=(it.fy??50)/100;
 return it.fit==='fit'?[(it.w-dw)*fx,(it.h-dh)*fy,dw,dh]:[clampV(it.w/2-dw*fx,it.w-dw,0),clampV(it.h/2-dh*fy,it.h-dh,0),dw,dh]}
// Disegno in SVG: una pagina è lo sfondo, le cornici del mastro e quelle della pagina, una sopra l'altra.
function pgTextSvg(lines){return lines.filter(l=>l.pieces.length).map(l=>`<text xml:space="preserve">${l.pieces.map(pc=>{const st=pc.st;return `<tspan x="${pr2(pc.x)}" y="${pr2(l.base)}" font-family="${esc(fontStack(st.font))}" font-size="${pr2(st.size)}"${st.bold?' font-weight="700"':''}${st.italic?' font-style="italic"':''} fill="${esc(st.color)}"${st.under?' text-decoration="underline"':''}>${esc(pc.t)}</tspan>`}).join('')}</text>`).join('')}
// Rotazione: in gradi in senso orario, da -180 a 180, attorno al centro della cornice. Le linee non la usano: girano
// spostando i due capi attorno al punto di mezzo.
const pgRot=it=>it.kind==='line'?0:+it.rot||0,pgRotNorm=a=>{a=((a%360)+540)%360-180;return a===-180?180:Math.round(a*10)/10||0};
const pgRotT=it=>{const r=pgRot(it);return r?` transform="rotate(${pr2(r)} ${pr2(it.x+it.w/2)} ${pr2(it.y+it.h/2)})"`:''};
// Un punto della cornice com'è disegnato sulla pagina (back: dalla pagina alla cornice diritta).
function pgTurn(it,x,y,back=false){const r=pgRot(it)*Math.PI/180*(back?-1:1);if(!r)return{x,y};const cx=it.x+it.w/2,cy=it.y+it.h/2,c=Math.cos(r),s=Math.sin(r),dx=x-cx,dy=y-cy;return{x:cx+dx*c-dy*s,y:cy+dx*s+dy*c}}
// L'ombra sta fuori dalla rotazione, così cade sempre dalla stessa parte.
function pgItemSvg(it,L,ctx,href){let s=pgItemBody(it,L,ctx,href);if(!s)return s;const t=pgRotT(it);if(t)s=`<g${t}>${s}</g>`;const f=it.kind!=='sign'&&it.shadow&&it.shadow!=='none'&&pgFrameShadow(it,L);return f?`<defs>${f.def}</defs><g filter="url(#${f.id})">${s}</g>`:s}
// Riempimento: un colore o una sfumatura (lineare, con la sua direzione, o radiale); contorno pieno o tratteggiato.
const PG_DASHES=[['','Continuo'],['dash','Tratteggiato'],['long','A tratti lunghi'],['dot','Punteggiato'],['dashdot','Tratto e punto']];
const pgDashAttr=(it,w,cap=true)=>{const k={dash:[2,3],long:[5,3.5],dot:[0,2],dashdot:[3,2.5,0,2.5]}[it.dash];return k?` stroke-dasharray="${k.map(v=>pr2(v*w)).join(' ')}"${cap?' stroke-linecap="round"':''}`:''};
function pgGrad(id,type,c1,c2,angle){const stops=`<stop offset="0" stop-color="${esc(c1)}"/><stop offset="1" stop-color="${esc(c2)}"/>`;if(type==='rad')return `<radialGradient id="${id}" cx="50%" cy="50%" r="70%">${stops}</radialGradient>`;const a=(angle||0)*Math.PI/180,cx=Math.cos(a)*50,cy=Math.sin(a)*50;return `<linearGradient id="${id}" x1="${pr2(50-cx)}%" y1="${pr2(50-cy)}%" x2="${pr2(50+cx)}%" y2="${pr2(50+cy)}%">${stops}</linearGradient>`}
// Misura dell'ombra: il corpo più grande del testo su fondo trasparente, altrimenti il lato corto della cornice, entro un quarto della pagina.
function pgFrameShadow(it,L){let s=0;if(it.kind==='text'&&it.fill==='none')for(const l of L?.lines||[])for(const pc of l.pieces)s=Math.max(s,pc.st.size);if(!s)s=clampV(Math.min(Math.abs(it.w),Math.abs(it.h))*.8,Math.max(it.sw||0,1)*8,Math.min(Pg.p.w,Pg.p.h)*.25);
 const fx=pgShadowFx(it.shadow,it.shc||'#1b1b1b',s);if(!fx)return null;const id='fx'+(++pgDefSeq);return{id,def:`<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">${fx[0]}<feMerge><feMergeNode in="${fx[1]}"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`}}
function pgItemBody(it,L,ctx,href){if(it.hidden)return '';const gid=it.grad&&it.fill!=='none'&&it.fill2?'gr'+(++pgDefSeq):'',fv=gid?`url(#${gid})`:it.fill==='none'?'none':esc(it.fill),body=pgItemShape(it,L,ctx,href,fv,it.sw>0&&it.stroke!=='none');return gid&&body?`<defs>${pgGrad(gid,it.grad,it.fill,it.fill2,it.gangle??90)}</defs>${body}`:body}
function pgItemShape(it,L,ctx,href,fv,edge){const op=it.opacity<100?` opacity="${it.opacity/100}"`:'',stroke=edge?` stroke="${esc(it.stroke)}" stroke-width="${pr2(it.sw)}"${pgDashAttr(it,it.sw)}`:'',paint=`fill="${fv}"${stroke}`,box=`x="${pr2(it.x)}" y="${pr2(it.y)}" width="${pr2(Math.max(0,it.w))}" height="${pr2(Math.max(0,it.h))}"`,rx=it.radius?` rx="${pr2(it.radius)}"`:'',bg=it.fill!=='none'||it.sw>0?`<rect ${box}${rx} ${paint}/>`:'';
 switch(it.kind){
  case 'rect':return `<rect ${box}${it.radius?` rx="${pr2(it.radius)}"`:''} ${paint}${op}/>`;
  case 'ellipse':return `<ellipse cx="${pr2(it.x+it.w/2)}" cy="${pr2(it.y+it.h/2)}" rx="${pr2(Math.abs(it.w/2))}" ry="${pr2(Math.abs(it.h/2))}" ${paint}${op}/>`;
  case 'line':return `<line x1="${pr2(it.x)}" y1="${pr2(it.y)}" x2="${pr2(it.x+it.w)}" y2="${pr2(it.y+it.h)}" stroke="${esc(it.stroke)}" stroke-width="${pr2(Math.max(it.sw,.5))}" stroke-linecap="round"${pgDashAttr(it,Math.max(it.sw,.5),false)}${op}/>`;
  case 'text':return `<g${op}>${bg}${pgTextSvg(L?.lines||[])}</g>`;
  case 'tri':return `<polygon points="${pr2(it.x)},${pr2(it.y)} ${pr2(it.x+it.w)},${pr2(it.y)} ${pr2(it.x+it.w/2)},${pr2(it.y+it.h)}" ${paint} stroke-linejoin="round"${op}/>`;
  case 'sign':return pgSignSvg(it,ctx,href);
  case 'image':{const m=pgImgFor(it,ctx),d=pgMaskPath(it),pic=()=>{const [ox,oy,dw,dh]=pgFitBox(it,m);return `<svg ${box} viewBox="0 0 ${pr2(Math.max(1,it.w))} ${pr2(Math.max(1,it.h))}" overflow="hidden" preserveAspectRatio="none"><image href="${esc(href(m))}" x="${pr2(ox)}" y="${pr2(oy)}" width="${pr2(dw)}" height="${pr2(dh)}" preserveAspectRatio="none"/></svg>`};
   // Il contorno va sopra la foto, che altrimenti ne coprirebbe metà.
   if(!d){const back=it.fill!=='none'?`<rect ${box}${rx} fill="${fv}"/>`:'',line=edge?`<rect ${box}${rx} fill="none"${stroke}/>`:'';if(!m)return back||line?`<g${op}>${back}${line}</g>`:'';return `<g${op}>${back}${pic()}${line}</g>`}
   // Con una sagoma, la foto, lo sfondo e il contorno seguono la forma.
   const id='mk'+(++pgDefSeq),line=edge?`<path d="${d}" fill="none"${stroke} stroke-linejoin="round"/>`:'',back=it.fill!=='none'?`<path d="${d}" fill="${fv}"/>`:'';
   return `<g${op}>${back}${m?`<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${pic()}</g>`:''}${line}</g>`}}
 return ''}
function pgPageSvg(p,I,ii,lay,href=m=>m.url){const m=pgMasterOf(I.pg),ctx={row:I.row,n:I.n,total:I.total,title:p.title,date:pgToday()};return (p.bg&&p.bg!=='none'?`<rect width="${pr2(p.w)}" height="${pr2(p.h)}" fill="${esc(p.bg)}"/>`:'')+[...(m?m.items:[]),...I.pg.items].map(it=>pgItemSvg(it,lay.get(ii+'|'+it.id),ctx,href)).join('')}
// Misure per l'interfaccia: millimetri e punti nei documenti da stampa, pixel in quelli per lo schermo.
const pgMM=()=>Pg.p?.unit==='mm';
const toU=v=>pgMM()?v/MM:v,fromU=v=>pgMM()?v*MM:v,pgToPt=v=>pgMM()?v*.75:v,pgFromPt=v=>pgMM()?v/.75:v;
const pgFmt=(v,d=1)=>Number(v).toLocaleString('it-IT',{maximumFractionDigits:d,useGrouping:false});
const fmtU=v=>pgFmt(toU(v),pgMM()?1:0),unitName=()=>pgMM()?'mm':'px',ptName=()=>pgMM()?'pt':'px';
const pgNum=s=>{const t=String(s??'').trim().replace(/\s/g,'').replace(',','.');return t===''?NaN:Number(t)};
const storyText=s=>s.paras.map(pa=>pa.runs.map(r=>r.t).join('')).join('\n');
// Colori e contrasto secondo le WCAG.
function pgLum(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||'');if(!m)return null;const v=parseInt(m[1],16);return [v>>16,v>>8&255,v&255].map(c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((s,c,i)=>s+c*[.2126,.7152,.0722][i],0)}
const pgContrast=(a,b)=>{const x=pgLum(a),y=pgLum(b);return x==null||y==null?null:(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
