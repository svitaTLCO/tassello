// Editor delle note di una regione MIDI. La tabella è la superficie principale: chi usa uno screen reader naviga
// righe e colonne come in una griglia, e ogni modifica è annunciata da sola (la navigazione no: la legge il focus).
// Il piano roll (canvas) resta solo visivo e non è mai l'unico modo per fare qualcosa. Le note restano in tick
// relativi alla regione; ogni operazione è un passo di cronologia (Ctrl+Z), fusa con la precedente se è lo stesso
// comando sulla stessa selezione entro 700 ms (frecce tenute).
const ME={open:false,region:null,regionObj:null,bpm:0,rows:[],byNote:new Map(),order:[],sel:new Set(),focus:0,col:0,anchor:null,
 hiddenNote:false,grid:'16',last:null,lastPitch:60};
const ME_COLS=5,ME_NAMES=['Do','Do diesis','Re','Re diesis','Mi','Fa','Fa diesis','Sol','Sol diesis','La','La diesis','Si'];
// Durate nominate: base, puntate (×3/2) e terzine (×2/3) a PPQ 480. Il riconoscimento accetta ±2 tick perché i
// file .mid con PPQ insoliti vengono riscalati a 480 con arrotondamento (per esempio una croma di terzina a PPQ 100
// è 33 tick nel file e diventa 158 qui, due sotto 160). I tick reali si dicono sempre.
const ME_DUR_BASE={1920:'semibreve',960:'minima',480:'semiminima',240:'croma',120:'semicroma',60:'biscroma',30:'semibiscroma'},
 ME_DUR={},ME_DUR_TOL=2;
for(const [d,n] of Object.entries(ME_DUR_BASE)){ME_DUR[d]=n;ME_DUR[Math.round(d*1.5)]=n+' puntata';ME_DUR[Math.round(d*2/3)]=n+' in terzina'}
const meDurationName=d=>{if(ME_DUR[d])return ME_DUR[d];let best=null,bd=ME_DUR_TOL+1;
 for(const [k,n] of Object.entries(ME_DUR)){const e=Math.abs(Number(k)-d);if(e<=ME_DUR_TOL&&e<bd){best=n;bd=e}}
 return best};
const meGridTicks=()=>MIDIPPQ*4/Number(ME.grid);
// Convenzione scientifica dichiarata: la nota 60 è Do 4, il Do centrale (Yamaha e parte della didattica dicono Do 3).
const meNoteName=p=>{const n=Number(p)|0;return ME_NAMES[((n%12)+12)%12]+' '+(Math.floor(n/12)-1)+(n===60?', Do centrale':'')};
const meVelWords=v=>v<=20?'pianissimo':v<=40?'piano':v<=60?'mezzo piano':v<=80?'mezzo forte':v<=100?'forte':'fortissimo';
const meTimeWords=(r,n)=>{const abs=r.startT-r.offT+n.t,b=Math.floor(abs/(MIDIPPQ*P.sig)),rest=abs-b*MIDIPPQ*P.sig,beat=Math.floor(rest/MIDIPPQ),tick=rest%MIDIPPQ;
 return `battuta ${b+1}, tempo ${beat+1}${tick?', tick '+tick:''}`};
const meDurWords=d=>{const s=midiSec(d),name=meDurationName(d);return (name?name+', ':'')+d+' tick, '+fmtNum(s,2)+' s'};
// Per il parlato la virgola decimale si perde («0 25 s»): sotto il secondo si dicono i millisecondi, sopra i
// secondi e i millisecondi. La cella visibile continua a mostrare «0,25 s».
const meDurSpoken=d=>{const s=midiSec(d),ms=Math.round(s*1000),name=meDurationName(d),head=name?name+', ':'';
 if(ms<1000)return head+d+' tick, '+ms+' millisecondi';
 const sec=Math.floor(ms/1000),rest=ms%1000;return head+d+' tick, '+sec+(sec===1?' secondo':' secondi')+(rest?' e '+rest+' millisecondi':'')};
const meVisible=n=>{const r=ME.regionObj;return !!r&&n.t>=r.offT&&n.t<r.offT+r.durT};
const meEditorActive=()=>!!(ME.open&&ME.regionObj&&regionOf(ME.region)===ME.regionObj);
const meSelNotes=()=>ME.order.filter(n=>ME.sel.has(n));
function meNoteList(){const r=ME.regionObj;if(!r)return[];
 return (r.notes||[]).filter(n=>ME.hiddenNote||meVisible(n)).sort((a,b)=>a.t-b.t||a.p-b.p)}
function meCounts(){if(!ME.regionObj)return;const hidden=(ME.regionObj.notes||[]).length-ME.order.length,sel=ME.sel.size;
 $('meCount').textContent=`${ME.order.length} ${ME.order.length===1?'nota':'note'}${hidden>0?`, ${hidden} fuori dalla regione`:''}${sel>1?`, ${sel} scelte`:''}`;
 $('midiNotes').setAttribute('aria-rowcount',String(ME.order.length+1))}
// Costruzione incrementale: le righe si creano all'apertura e si aggiornano; un cambio di intensità o altezza non
// ricostruisce la tabella, così una freccia tenuta su 2000 note resta immediata.
function meRow(n){const tr=document.createElement('tr');tr.setAttribute('role','row');const cells=[];
 for(let c=0;c<ME_COLS;c++){const td=document.createElement('td');td.setAttribute('role','gridcell');td.tabIndex=-1;td.dataset.c=String(c);tr.appendChild(td);cells.push(td)}
 const row={n,tr,cells};ME.byNote.set(n,row);meFill(row);return row}
function meFill(row){const r=ME.regionObj,n=row.n,c=row.cells;
 // Ogni cella ha un nome accessibile: NVDA annuncia il cambio della cella che ha il focus anche quando il testo
 // visibile è breve o ha una virgola decimale.
 c[0].textContent=meTimeWords(r,n);c[0].setAttribute('aria-label',meTimeWords(r,n));
 c[1].textContent=meNoteName(n.p);c[1].setAttribute('aria-label',`${meNoteName(n.p)}, ${meTimeWords(r,n)}`);
 c[2].textContent=meDurWords(n.d);c[2].setAttribute('aria-label',meDurSpoken(n.d));
 c[3].textContent=`${n.v} (${meVelWords(n.v)})`;c[3].setAttribute('aria-label',`Intensità ${n.v}, ${meVelWords(n.v)}`);
 c[4].textContent=meVisible(n)?'nella regione':'fuori dalla regione';c[4].setAttribute('aria-label',meVisible(n)?'Nella regione':'Fuori dalla regione: non si sente');
 if(ME.sel.size>1&&ME.sel.has(n))row.tr.setAttribute('aria-selected','true');else row.tr.removeAttribute('aria-selected')}
function meRenderAll(){const body=$('meBody');body.textContent='';ME.byNote=new Map();ME.order=meNoteList();
 const frag=document.createDocumentFragment();ME.rows=[];
 for(const n of ME.order){const row=meRow(n);ME.rows.push(row);frag.appendChild(row.tr)}
 body.appendChild(frag);mePaint();meCounts();meDrawRoll()}
function mePaint(){for(const row of ME.rows){if(ME.sel.size>1&&ME.sel.has(row.n))row.tr.setAttribute('aria-selected','true');else row.tr.removeAttribute('aria-selected');for(const td of row.cells)td.tabIndex=-1}
 const active=ME.rows[ME.focus];if(active)active.cells[ME.col].tabIndex=0}
function meFocus(idx,col,doFocus=true){if(!ME.order.length)return;
 ME.focus=clamp(idx,0,ME.order.length-1);ME.col=clamp(col,0,ME_COLS-1);mePaint();
 const row=ME.rows[ME.focus];if(row&&doFocus)row.cells[ME.col].focus({preventScroll:true})}
function meSelectOne(idx){if(!ME.order.length)return;ME.anchor=null;ME.focus=clamp(idx,0,ME.order.length-1);ME.sel=new Set([ME.order[ME.focus]]);mePaint();meCounts()}
function meSelectRange(to){if(!ME.order.length)return;if(ME.anchor===null)ME.anchor=ME.focus;
 const a=Math.min(ME.anchor,clamp(to,0,ME.order.length-1)),b=Math.max(ME.anchor,clamp(to,0,ME.order.length-1));
 ME.focus=clamp(to,0,ME.order.length-1);ME.sel=new Set(ME.order.slice(a,b+1));mePaint();meCounts()}
// ——— Apertura, chiusura, sincronizzazione con il progetto ———
function midiEditorShowUI(){$('midiEd').hidden=false;$('wave').closest('.wave-wrap').hidden=true;$('selbar').hidden=true;$('aOverviewBox').hidden=true}
function midiEditorHideUI(){$('midiEd').hidden=true;$('wave').closest('.wave-wrap').hidden=false;$('selbar').hidden=false;$('aOverviewBox').hidden=false}
function midiEditorOpen(r,{focus=true,quiet=false}={}){
 midiEditorShowUI();ME.open=true;ME.region=r.id;ME.regionObj=r;ME.bpm=P.bpm;ME.last=null;ME.anchor=null;
 const list=meNoteList();ME.sel=new Set(list.length?[list[0]]:[]);ME.focus=0;ME.col=1;
 $('edTitle').textContent='Editor della regione MIDI';$('edInfo').textContent=`«${r.name}» · traccia «${trackOf(r.track)?.name||''}» · ${r.notes?.length||0} note`;
 $('meGrid').value=ME.grid;$('meHidden').checked=ME.hiddenNote;
 meRenderAll();if(focus&&list.length)meFocus(0,1,true);else if(focus)$('midiNotes').focus();
 if(!quiet)announce(`Editor MIDI, ${list.length} ${list.length===1?'nota':'note'}${(r.notes?.length||0)>list.length?`, ${r.notes.length-list.length} fuori dalla regione`:''}`);
 return true}
function midiEditorClose(){if(!ME.open)return;meStopPreview();ME.open=false;ME.region=null;ME.regionObj=null;ME.rows=[];ME.byNote=new Map();ME.order=[];ME.sel.clear();
 midiEditorHideUI();$('edTitle').textContent='Editor della regione';updateEditorBar()}
function midiEditorSync(){if(!ME.open)return;const r=ME.region&&regionOf(ME.region);
 if(!r||r.kind!=='midi'){midiEditorClose();return}
 if(r!==ME.regionObj||P.bpm!==ME.bpm){
  // Dopo annulla/ripeti pSnap ricrea gli oggetti delle note: si ritrovano per (tempo, altezza), non per identità.
  const hadFocus=$('midiNotes').contains(document.activeElement),col=ME.col,idx=ME.focus,
   focusKey=ME.order[ME.focus]?ME.order[ME.focus].t+'|'+ME.order[ME.focus].p:null,
   keys=[...ME.sel].map(n=>n.t+'|'+n.p),prevObj=ME.regionObj;
  ME.regionObj=r;ME.bpm=P.bpm;ME.last=null;meRenderAll();
  const byKey=new Map(ME.order.map(n=>[n.t+'|'+n.p,n]));
  ME.sel=new Set(keys.map(k=>byKey.get(k)).filter(Boolean));
  const fi=focusKey&&byKey.has(focusKey)?ME.order.indexOf(byKey.get(focusKey)):clamp(idx,0,Math.max(0,ME.order.length-1));
  ME.focus=fi;
  if(!ME.sel.size&&ME.order.length)ME.sel=new Set([ME.order[clamp(fi,0,ME.order.length-1)]]);
  mePaint();meCounts();
  if(hadFocus&&ME.order.length)meFocus(clamp(fi,0,ME.order.length-1),col,true);
  void prevObj}
 $('edTitle').textContent='Editor della regione MIDI';
 $('edInfo').textContent=`«${r.name}» · traccia «${trackOf(r.track)?.name||''}» · ${r.notes?.length||0} note`}
// ——— Modifiche ———
function meApply(label,fn,say,changed,focusNote){
 const r=ME.regionObj,hlen=phist.length,key=label+'|'+r.id+'|'+ME.focus+'|'+ME.order.length+'|'+ME.sel.size,now=performance.now(),
  merge=ME.last&&ME.last.key===key&&now-ME.last.t<700&&phist.length>0&&phist.at(-1)===ME.last.entry;
 if(merge){fn();ME.last.t=now;const e=ME.last.entry;e.after=pSnap();projectChanged({live:true})}
 else{pCommit(label,fn,{live:true});ME.last=phist.length>hlen?{key,t:now,entry:phist.at(-1)}:null}
 meRefresh(changed,focusNote);updateEditorBarNeeds();
 if(say)announce(say);return true}
function updateEditorBarNeeds(){if(!ME.regionObj)return;$('edTitle').textContent='Editor della regione MIDI';
 $('edInfo').textContent=`«${ME.regionObj.name}» · traccia «${trackOf(ME.regionObj.track)?.name||''}» · ${ME.regionObj.notes?.length||0} note`}
function meRefresh(changed,focusNote){const r=ME.regionObj,prev=new Set(ME.sel);
 for(const n of changed||[]){const row=ME.byNote.get(n);if(row)meFill(row)}
 const list=meNoteList(),sameOrder=ME.order.length===list.length&&list.every((n,i)=>ME.order[i]===n);
 if(sameOrder){ME.order=list;if(focusNote){const i=ME.order.indexOf(focusNote);if(i>=0){ME.focus=i;ME.sel=new Set([focusNote]);meFocus(i,ME.col,true)}}
  mePaint();meCounts();return}
 const set=new Set(list),sameNotes=set.size===ME.order.length&&ME.order.every(n=>set.has(n));
 if(!sameNotes){meRenderAll();ME.sel=new Set(ME.order.filter(n=>prev.has(n)));
  if(focusNote){const i=ME.order.indexOf(focusNote);if(i>=0){ME.focus=i;ME.sel=new Set([focusNote]);meFocus(i,ME.col,true)}}
  mePaint();meCounts();meDrawRoll();return}
 ME.order=list;const frag=document.createDocumentFragment();for(const n of list)frag.appendChild(ME.byNote.get(n).tr);$('meBody').appendChild(frag);
 if(focusNote){const i=ME.order.indexOf(focusNote);if(i>=0){ME.focus=i;ME.sel=new Set([focusNote]);meFocus(i,ME.col,true)}}
 else if(ME.order.length)ME.focus=Math.min(ME.focus,ME.order.length-1);
 mePaint();meCounts();meDrawRoll()}
// ——— Operazioni ———
function meAddNote(){const r=ME.regionObj;if(!r)return;if((r.notes||[]).length>=2000){toast('La regione ha già 2000 note: non se ne possono aggiungere altre');return}
 const cur=ME.order[ME.focus];let t;
 if(P.t>=r.start&&P.t<r.start+r.dur)t=Math.max(0,midiTick(P.t)-(r.startT-r.offT));
 else if(cur)t=Math.max(0,cur.t+meGridTicks());else t=0;
 const n={t,d:meGridTicks(),p:ME.lastPitch,v:100};
 meApply('Aggiungi nota',()=>{r.notes.push(n);r.notes.sort((a,b)=>a.t-b.t||a.p-b.p)},`Nota aggiunta: ${meNoteName(n.p)}, ${meTimeWords(r,n)}, ${meDurWords(n.d)}`,[n],n)}
async function meDeleteNotes(){const sel=meSelNotes();if(!sel.length){toast('Nessuna nota scelta');return}
 if(sel.length>10&&!(await confirmAction(`Togliere ${sel.length} note?`,'Togli')))return;
 const r=ME.regionObj,idx=ME.order.indexOf(sel[0]);
 meApply('Elimina note',()=>{r.notes=(r.notes||[]).filter(n=>!ME.sel.has(n))},`${sel.length===1?'Nota tolta':'Note tolte: '+sel.length}`,null,null);
 if(!ME.order.length){$('midiNotes').focus();return}
 const i=Math.min(idx,ME.order.length-1);ME.focus=i;meSelectOne(i);meFocus(i,ME.col,true)}
function meTranspose(delta,label){const sel=meSelNotes();if(!sel.length){toast('Nessuna nota scelta');return}
 const notes=sel.filter(n=>n.p+delta>=0&&n.p+delta<=127),skipped=sel.length-notes.length;
 if(!notes.length){toast('Altezza fuori dai limiti MIDI (0-127)');return}
 // L'annuncio deve dire la nota NUOVA: va calcolata prima della modifica, non letta dopo (il valore vecchio è
 // quello che ancora c'è quando si prepara la frase).
 const np=notes[0].p+delta;
 meApply(label,()=>{for(const n of notes)n.p+=delta},ME.sel.size===1&&ME.col===1?null:(notes.length===1?meNoteName(np):`${notes.length} note spostate${skipped?`, ${skipped} fuori dai limiti`:''}`),notes,notes[0]);
 ME.lastPitch=clamp(np,0,127)}
function meMoveTime(dir){const sel=meSelNotes();if(!sel.length)return;const step=meGridTicks()*dir,notes=sel;
 // La cella Tempo aggiorna il suo nome: se il focus è lì e la nota resta visibile, parla da sé e la live region
 // tace. Se la nota esce dalla finestra (la riga può sparire) o il focus è altrove, l'annuncio ci vuole.
 meApply('Sposta nel tempo',()=>{for(const n of notes)n.t=Math.max(0,n.t+step)},null,notes,notes[0]);
 const hidden=notes.filter(n=>!meVisible(n)).length;
 if(!(ME.sel.size===1&&ME.col===0&&notes.every(meVisible)))
  announce(`${notes.length===1?`Spostata a ${meTimeWords(ME.regionObj,notes[0])}`:`${notes.length} note spostate di ${Math.abs(step)} tick`}${hidden?', fuori dalla regione: non si sente':''}`)}
function meSetDuration(dir){const sel=meSelNotes();if(!sel.length)return;const step=meGridTicks()*dir,max=8*MIDIPPQ*P.sig,notes=sel,nd=clamp(notes[0].d+step,1,max);
 meApply('Durata',()=>{for(const n of notes)n.d=clamp(n.d+step,1,max)},ME.sel.size===1&&ME.col===2?null:(notes.length===1?`Durata: ${meDurSpoken(nd)}`:`Durate cambiate per ${notes.length} note`),notes,notes[0])}
function meSetVelocity(delta){const sel=meSelNotes();if(!sel.length)return;const nv=clamp(sel[0].v+delta,1,127);
 meApply('Intensità',()=>{for(const n of sel)n.v=clamp(n.v+delta,1,127)},ME.sel.size===1&&ME.col===3?null:(sel.length===1?`Intensità ${nv}`:`Intensità cambiata per ${sel.length} note`),sel,sel[0])}
function meVelocityDigit(d){const table=[127,13,25,38,51,64,76,89,102,114],v=table[Number(d)%10],sel=meSelNotes();if(!sel.length)return;
 meApply('Intensità',()=>{for(const n of sel)n.v=v},ME.sel.size===1&&ME.col===3?null:`Intensità ${v}`,sel,sel[0])}
async function meNoteProps(){const n=ME.order[ME.focus];if(!n){toast('Nessuna nota scelta');return}const r=ME.regionObj;
 const v=await fieldModal('Proprietà della nota',`<p>${esc(meNoteName(n.p))}, ${esc(meTimeWords(r,n))}.</p>`,
  [{id:'t',label:'Tempo dall’inizio della regione, in tick',type:'number',value:n.t},{id:'p',label:'Altezza (0-127)',type:'number',value:n.p},
   {id:'d',label:'Durata in tick',type:'number',value:n.d},{id:'v',label:'Intensità (1-127)',type:'number',value:n.v}],'Applica',
  {validate:v=>{const t=num(v.t),p=num(v.p),d=num(v.d),vel=num(v.v);
   return !(t>=0)?{msg:'Tempo: un numero di tick da zero in su.',field:'t'}:!(Number.isInteger(p)&&p>=0&&p<=127)?{msg:'Altezza: un numero intero da 0 a 127.',field:'p'}:!(d>=1)?{msg:'Durata: almeno un tick.',field:'d'}:!(vel>=1&&vel<=127)?{msg:'Intensità: un numero da 1 a 127.',field:'v'}:null}});
 if(!v)return;const t=Math.round(num(v.t)),p=Math.round(num(v.p)),d=Math.round(num(v.d)),vel=Math.round(num(v.v));
 meApply('Proprietà della nota',()=>{n.t=t;n.p=p;n.d=d;n.v=vel},`${meNoteName(p)}, ${meTimeWords(r,n)}, ${meDurWords(d)}, intensità ${vel}`,[n],n);ME.lastPitch=p}
function meReadNote(){const n=ME.order[ME.focus];if(!n){toast('Nessuna nota nella regione');return}const r=ME.regionObj,sel=ME.sel.size;
 announce(`Nota ${ME.focus+1} di ${ME.order.length}${sel>1?`, ${sel} scelte`:''}: ${meNoteName(n.p)}, ${meTimeWords(r,n)}, durata ${meDurSpoken(n.d)}, intensità ${n.v} ${meVelWords(n.v)}${meVisible(n)?'':' , fuori dalla regione: non si sente'}`)}
function meToggleHidden(on=!ME.hiddenNote){ME.hiddenNote=on;const before=new Set(ME.sel);$('meHidden').checked=on;meRenderAll();
 ME.sel=new Set(ME.order.filter(n=>before.has(n)));mePaint();meCounts();
 if(ME.open)meDrawRoll();
 announce(on?'Note fuori dalla regione mostrate':`Note fuori dalla regione nascoste${ME.regionObj.notes.length-ME.order.length>0?': '+ (ME.regionObj.notes.length-ME.order.length):''}`)}
function meEnsure(){if(meEditorActive())return true;const r=selRegion();if(r&&r.kind==='midi'){openRegion(r);return true}toast('Scegli una regione MIDI');return false}
// ——— Piano roll (solo visivo) ———
function meDrawRoll(){const cv=$('meRoll');if(!cv||cv.offsetParent===null)return;const r=ME.regionObj;if(!r)return;
 const dpr=window.devicePixelRatio||1,w=cv.clientWidth||600,h=cv.clientHeight||140;if(!w||!h)return;
 if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}
 const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
 const all=r.notes||[],notes=all.length?all:[{p:60}];let lo=Math.min(...notes.map(n=>n.p),60)-1,hi=Math.max(...notes.map(n=>n.p),60)+1;
 if(hi-lo<12){const c=(lo+hi)/2;lo=Math.round(c-6);hi=Math.round(c+6)}
 const x=t=>(t-r.offT)/Math.max(1,r.durT)*w,y=p=>h-((p-lo)/Math.max(1,hi-lo))*h,rh=Math.max(2,h/Math.max(1,hi-lo)-1);
 g.strokeStyle='rgba(120,120,120,.25)';g.lineWidth=1;
 for(let p=Math.ceil(lo/12)*12;p<=hi;p+=12){const yy=y(p);g.beginPath();g.moveTo(0,yy);g.lineTo(w,yy);g.stroke()}
 const bar=MIDIPPQ*P.sig;g.strokeStyle='rgba(120,120,120,.45)';
 for(let t=r.offT;t<=r.offT+r.durT;t+=bar){const xx=x(t);g.beginPath();g.moveTo(xx,0);g.lineTo(xx,h);g.stroke()}
 for(const n of all){const hidden=!meVisible(n);if(hidden&&!ME.hiddenNote)continue;
  const xx=x(n.t);if(xx>w||xx+2<0)continue;
  g.fillStyle=ME.sel.has(n)?'#2457c5':hidden?'rgba(120,120,120,.35)':'#4a7fd4';
  g.fillRect(xx,y(n.p)-(rh+1)/2,Math.max(2,x(n.t+n.d)-xx),rh)}
 if(MIX.playing){const px=((mixPos()-r.start)/Math.max(1e-6,r.dur))*w;if(px>=0&&px<=w){g.strokeStyle='#b0306a';g.lineWidth=2;g.beginPath();g.moveTo(px,0);g.lineTo(px,h);g.stroke()}}}
// ——— Ascolto ———
// Spazio suona la regione dall'inizio con il trasporto normale e si ferma alla fine della regione (senza toccare il
// ciclo del progetto, che finirebbe nella cronologia e nel salvataggio); Maiusc+Spazio suona la nota scelta.
const meAud={on:false,timer:0,roll:0,end:0};
ME.preview=null;
function meStopAudition(){clearInterval(meAud.timer);clearInterval(meAud.roll);meAud.on=false;meAud.timer=meAud.roll=0}
function mePlayRegion(){if(meAud.on){mixStop(true);meStopAudition();announce('Regione ferma');meDrawRoll();return}
 const r=ME.regionObj;if(!r)return;meStopPreview();
 mixPlay(r.start,{origin:r.start});meAud.on=true;meAud.end=r.start+r.dur;
 meAud.timer=setInterval(()=>{if(!MIX.playing){meStopAudition();meDrawRoll();return}if(mixPos()>=meAud.end-0.005){mixStop(true);meStopAudition();announce('Fine della regione');meDrawRoll()}},25);
 meAud.roll=setInterval(meDrawRoll,80);announce('Ascolto della regione')}
// L'anteprima è una sola alla volta: con le frecce tenute (circa 30 passi al secondo) le note si accavallerebbero in
// un grappolo, quindi quando ne parte una nuova la precedente si spegne subito.
function meStopPreview(){const x=ME.preview;if(!x)return;clearTimeout(x.timer);midiNoteOff(x.port,x.ch,x.p,0);ME.preview=null}
function mePlayNote(){const n=ME.order[ME.focus],r=ME.regionObj;if(!n||!r)return;const tr=trackOf(r.track);if(!tr)return;
 const send=()=>{if(ME.preview)meStopPreview();const port=midiOutputFor(tr);if(!port){announce('Nessuna uscita MIDI: la nota non si sente');return}
  const ch=clamp((tr.midiCh||1)-1,0,15);midiNoteOn(port,ch,n.p,n.v,0,tr.id);
  const timer=setTimeout(()=>{if(ME.preview&&ME.preview.timer===timer)ME.preview=null;midiNoteOff(port,ch,n.p,0)},Math.max(120,Math.min(2000,midiSec(n.d)*1000)));
  ME.preview={port,ch,p:n.p,timer};announce(meNoteName(n.p))};
 // Con l'accesso già concesso la nota parte subito, così le frecce tenute spengono la precedente in ordine; al primo
 // uso l'accesso si chiede e le anteprime in coda si spegnono comunque l'una con l'altra.
 if(MIDI.access)send();else midiStart({quiet:true}).then(ok=>{if(ok)send()}).catch(()=>{})}
function meMaybePreview(){if(!meEditorActive()||!$('mePreview')?.checked)return;mePlayNote()}
// ——— Tocco umano ———
// Sposta nel tempo e varia l'intensità con un PRNG a seme (mulberry32, lo stesso del riverbero), per un risultato
// riproducibile. Scorre le note ordinate per (tempo, altezza, indice) e per ogni nota estrae SEMPRE prima il tempo
// e poi l'intensità, anche se uno dei due massimi è zero: cambiando solo l'intensità, gli spostamenti nel tempo non
// cambiano. Le note visibili restano nella finestra, non superano la partenza della successiva della stessa altezza
// (il nostro scheduler manda note off indipendenti: una sovrapposizione taglierebbe la seconda), le note già fuori
// restano come sono.
function meHumanizeTarget(){if(ME.open&&ME.sel.size>1){const notes=meSelNotes();return{notes,regions:[ME.regionObj],label:'alla selezione dell’editor'}}
 const r=selRegion();if(r&&r.kind==='midi')return{notes:null,regions:[r],label:`alla regione «${r.name}»`};
 const t=selTrack();if(t?.kind==='midi'){const rs=P.regions.filter(x=>x.track===t.id&&x.kind==='midi');if(!rs.length)return null;return{notes:null,regions:rs,label:`alla traccia «${t.name}»`}}
 return null}
function meHumanizeApply(target,maxT,maxV,seed){
 const rng=mulberry32(seed>>>0),ops=[];let total=0,outside=0,skipped=0;
 for(const reg of target.regions){
  const winA=reg.offT,winB=reg.offT+reg.durT,all=(reg.notes||[]).map((n,i)=>({n,i})).sort((a,b)=>a.n.t-b.n.t||a.n.p-b.n.p||a.i-b.i);
  outside+=all.filter(x=>x.n.t<winA||x.n.t>=winB).length;
  const chosen=all.filter(x=>!target.notes||target.notes.includes(x.n)),vis=chosen.filter(x=>x.n.t>=winA&&x.n.t<winB);
  for(const x of vis){x.dt=Math.round((rng()*2-1)*maxT);x.dv=Math.round((rng()*2-1)*maxV)}
  total+=vis.length;
  const groups=new Map();for(const x of all){if(!groups.has(x.n.p))groups.set(x.n.p,[]);groups.get(x.n.p).push(x)}
  // Il taglio dipende dalla FINE: la nota non deve finire oltre la partenza della successiva della stessa altezza.
  // Per le coppie che in origine non si sovrapponevano si tengono entrambi i vincoli (fine dentro la partenza
  // successiva, inizio dopo la fine precedente); per quelle già sovrapposte resta solo l'ordine delle partenze.
  for(const g of groups.values()){let prevOrigEnd=-Infinity,prevNewT=winA-1,prevNewEnd=winA-1;
   for(let i=0;i<g.length;i++){const x=g[i],nextStart=i+1<g.length?g[i+1].n.t:winB,vis=x.dt!==undefined&&x.n.t>=winA&&x.n.t<winB;
    if(!vis){prevOrigEnd=x.n.t+x.n.d;prevNewT=x.n.t;prevNewEnd=x.n.t+x.n.d;continue}
    const overlapNext=x.n.t+x.n.d>nextStart,overlapPrev=prevOrigEnd>x.n.t;
    let t;
    if(nextStart<=x.n.t){t=x.n.t;skipped++}
    else{const hi=Math.min(winB-1,overlapNext?nextStart-1:nextStart-x.n.d),lo=Math.max(winA,overlapPrev?prevNewT+1:prevNewEnd);
     t=clamp(x.n.t+x.dt,lo,hi);if(hi<lo){t=x.n.t;skipped++}}
    ops.push({n:x.n,nt:t,v:clamp(x.n.v+x.dv,1,127)});prevOrigEnd=x.n.t+x.n.d;prevNewT=t;prevNewEnd=t+x.n.d}}
 }
 if(!total){toast('Nessuna nota dentro la regione da umanizzare');return null}
 const changed=ops.filter(o=>o.nt!==o.n.t||o.v!==o.n.v).length;
 if(changed)pCommit('Tocco umano',()=>{for(const o of ops){o.n.t=o.nt;o.n.v=o.v}for(const reg of target.regions)(reg.notes||[]).sort((a,b)=>a.t-b.t||a.p-b.p)},{live:true});
 if(ME.open&&target.regions.includes(ME.regionObj)){const sel=new Set(ME.sel);meRenderAll();ME.sel=new Set(ME.order.filter(n=>sel.has(n)));mePaint();meCounts()}
 updateEditorBarNeeds();
 announce(changed?`Tocco umano: ${changed} ${changed===1?'nota':'note'}, tempo ±${maxT} tick, intensità ±${maxV}, seme ${seed}${skipped?`, ${skipped} non spostate per non sovrapporsi`:''}${outside?`; ${outside} fuori dalla regione lasciate come sono`:''}`:'Tocco umano: nessuna nota è cambiata');
 return{changed,skipped,outside,total}
}
async function midiHumanizeDialog(){const target=meHumanizeTarget();if(!target||!target.regions.length){toast('Scegli una regione o una traccia MIDI');return}
 const seed=1+Math.floor(Math.random()*99999);
 const v=await fieldModal('Tocco umano',`<p>Sposta le note nel tempo e cambia l’intensità, mantenendole dentro la regione e senza che si accavallino con la nota successiva della stessa altezza. Il seme rende il risultato ripetibile: stesso seme e stesse note danno la stessa variazione. Si applica ${esc(target.label)}.</p>`,
  [{id:'tick',label:'Spostamento massimo nel tempo (tick, 0–120)',type:'number',value:15,hint:`Si applica ${target.label}.`},
   {id:'vel',label:'Variazione massima di intensità (punti, 0–63)',type:'number',value:10},
   {id:'seed',label:'Seme (intero da 1 a 99999)',type:'number',value:seed}],'Applica',
  {validate:v=>{const t=num(v.tick),vel=num(v.vel),sd=num(v.seed);
   return !(Number.isFinite(t)&&t>=0&&t<=120)?{msg:'Tempo: un numero da 0 a 120 tick.',field:'tick'}:
    !(Number.isFinite(vel)&&vel>=0&&vel<=63)?{msg:'Intensità: un numero da 0 a 63 punti.',field:'vel'}:
    !(Number.isInteger(sd)&&sd>=1&&sd<=99999)?{msg:'Seme: un intero da 1 a 99999.',field:'seed'}:null}});
 if(!v)return;if(num(v.tick)===0&&num(v.vel)===0){toast('Nessuna variazione: tempo e intensità sono a zero');return}
 meHumanizeApply(target,Math.round(num(v.tick)),Math.round(num(v.vel)),Math.round(num(v.seed)))}
// ——— Tastiera della griglia ———
function meKey(e){if(!meEditorActive())return;meSyncFocus();const k=e.key,ctrl=e.ctrlKey||e.metaKey,alt=e.altKey,shift=e.shiftKey;let done=true;
 if(!ME.order.length&&k!=='Enter'&&k!=='F2'&&!(alt&&k==='Enter'))return;
 if(ctrl&&/^a$/i.test(k)){ME.anchor=0;ME.sel=new Set(ME.order);mePaint();meCounts();announce(`Selezionate ${ME.sel.size} note`)}
 else if(alt&&!ctrl&&(k==='ArrowUp'||k==='ArrowDown'))meTranspose((k==='ArrowDown'?-1:1)*(shift?12:1),shift?'Ottava':'Semitono');
 else if(alt&&!ctrl&&(k==='ArrowLeft'||k==='ArrowRight'))meMoveTime(k==='ArrowRight'?1:-1);
 else if(ctrl&&!alt&&(k==='ArrowLeft'||k==='ArrowRight'))meSetDuration(k==='ArrowRight'?1:-1);
 else if(k==='ArrowUp'||k==='ArrowDown'){const to=clamp(ME.focus+(k==='ArrowDown'?1:-1),0,ME.order.length-1);if(shift)meSelectRange(to);else meSelectOne(to);meFocus(to,ME.col,true)}
 else if(k==='ArrowLeft')meFocus(ME.focus,ME.col-1,true);
 else if(k==='ArrowRight')meFocus(ME.focus,ME.col+1,true);
 else if(k==='Home'){meSelectOne(0);meFocus(0,ME.col,true)}
 else if(k==='End'){meSelectOne(ME.order.length-1);meFocus(ME.order.length-1,ME.col,true)}
 else if(k==='+'||k==='=')meSetVelocity(5);
 else if(k==='-'||k==='_')meSetVelocity(-5);
 else if(/^[0-9]$/.test(k)&&!ctrl&&!alt)meVelocityDigit(k);
 else if(k==='Enter'&&!alt)meAddNote();
 else if(k==='Delete'||k==='Backspace')meDeleteNotes();
 else if(k==='F2'||(alt&&k==='Enter'))meNoteProps();
 else if(k===' '&&shift)mePlayNote();
 else if(k===' ')mePlayRegion();
 else done=false;
 if(done){e.preventDefault();e.stopPropagation();
  if(!alt&&!ctrl&&(k.startsWith('Arrow')||k==='Home'||k==='End'))meMaybePreview()}}
// La posizione interna della griglia si riallinea alla cella che ha davvero il focus al primo tasto: così mouse, F6,
// programmi di prova o NVDA che spostano il focus non lasciano la freccia successiva ripartire dalla riga 1.
function meSyncFocus(){const td=document.activeElement;if(!td||td.tagName!=='TD'||!$('midiNotes').contains(td))return;
 const tr=td.closest('tr'),i=tr?[...$('meBody').children].indexOf(tr):-1;if(i<0)return;
 ME.focus=i;ME.col=clamp(Number(td.dataset.c)||0,0,ME_COLS-1);
 if(!ME.sel.has(ME.order[i]))meSelectOne(i)}
$('midiNotes').addEventListener('keydown',meKey);
$('meGrid').addEventListener('change',e=>{ME.grid=e.target.value;announce('Griglia '+ (ME.grid==='16'?'un sedicesimo':ME.grid==='8'?'un ottavo':'un quarto'))});
$('meHidden').addEventListener('change',e=>meToggleHidden(e.target.checked));
addEventListener('resize',()=>{if(ME.open)meDrawRoll()});
