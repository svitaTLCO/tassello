// Audio detto a parole: il brano descritto (Alt+Maiusc+D), i livelli nel punto in cui si è (Alt+Maiusc+L) e l'effetto
// di ogni elaborazione, prima e dopo (Alt+Maiusc+O). Le misure sono quelle dei misuratori: picco, volume medio, volume
// percepito (LUFS) e rumore di fondo, dette con le parole dei livelli. Le descrizioni lunghe vanno in una finestra con
// titoli e tabelle, che resta finché la si chiude; le frasi brevi in un messaggio.

// Misure di un tratto (un array per canale). Il rumore di fondo è il 10° percentile del livello a finestre di 10 ms,
// lo stesso calcolo della soglia automatica delle pause.
function measureCh(ch,rate){let pk=0,sq=0,n=0;const len=ch[0]?.length||0,win=Math.max(1,Math.round(rate/100)),lv=[];
 for(const d of ch)for(let i=0;i<d.length;i++){const x=d[i],v=x<0?-x:x;if(v>pk)pk=v;sq+=x*x;n++}
 for(let a=0;a+win<=len;a+=win){let best=0;for(const d of ch){let s=0;for(let i=a;i<a+win;i++)s+=d[i]*d[i];if(s>best)best=s}lv.push(best>0?10*Math.log10(best/win):-120)}
 lv.sort((x,y)=>x-y);return{peak:toDb(pk),rms:n&&sq?10*Math.log10(sq/n):-Infinity,lufs:len>=rate*0.4?loudness(ch,rate):-Infinity,floor:lv.length?Math.max(-120,lv[Math.floor(lv.length*0.1)]):-Infinity,dur:len/rate}}
const fmtLufs=v=>Number.isFinite(v)?fmtNum(v,1)+' LUFS':'troppo silenzioso per il volume percepito';
const dbDiff=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)?b-a:Number.isFinite(a)===Number.isFinite(b)?0:Infinity;
const signedDb=d=>(d>0?'+':'')+fmtDb(d);
// Livelli a parole: «picco −3,1 dB, forte; volume percepito −18,2 LUFS; rumore di fondo −62 dB».
function levelSentence(m,{floor=true}={}){const parts=[`picco ${fmtDb(m.peak)}, ${levelWords(m.peak)}`];if(Number.isFinite(m.lufs))parts.push('volume percepito '+fmtLufs(m.lufs));else if(Number.isFinite(m.rms))parts.push('volume medio '+fmtDb(m.rms));
 if(floor&&Number.isFinite(m.floor)&&m.floor>-119&&m.peak-m.floor>12)parts.push('rumore di fondo '+fmtDb(m.floor));return parts.join('; ')}
// Che cosa è cambiato tra due misure: solo le misure cambiate di almeno 0,5 dB, buone notizie comprese. Vuoto se niente.
function changeWords(b,a){const out=[],big=(x,y)=>Math.abs(dbDiff(x,y))>=0.5;
 if(Math.abs(a.dur-b.dur)>=0.05)out.push(`durata da ${sayTime(b.dur)} a ${sayTime(a.dur)}`);
 if(big(b.lufs,a.lufs))out.push(Number.isFinite(b.lufs)&&Number.isFinite(a.lufs)?`volume percepito da ${fmtNum(b.lufs,1)} a ${fmtNum(a.lufs,1)} LUFS (${signedDb(a.lufs-b.lufs)})`:`volume percepito ${Number.isFinite(a.lufs)?fmtLufs(a.lufs):'ora troppo basso per misurarlo'}`);
 else if(big(b.rms,a.rms))out.push(`volume medio da ${fmtDb(b.rms)} a ${fmtDb(a.rms)}`);
 if(big(b.floor,a.floor)&&b.floor>-119)out.push(`rumore di fondo da ${fmtDb(b.floor)} a ${fmtDb(a.floor)}`);
 if(big(b.peak,a.peak))out.push(`picco da ${fmtDb(b.peak)} a ${fmtDb(a.peak)}`+(a.peak>-1?', al limite: rischio di distorsione':''));else if(out.length)out.push(`picco invariato, ${fmtDb(a.peak)}`);
 return out.join(', ')}
const capital=s=>s.charAt(0).toUpperCase()+s.slice(1);

// ——— Prima e dopo degli effetti. applyEffect misura il tratto prima e dopo; il confronto a orecchio tiene sei secondi
// dell'originale (non tutto l'audio), dal cursore se era dentro il tratto.
let fxCompare=null,cmpSrc=null;
function keepCompare(label,a,b,inp,out,mapPos,cursor,text){const w0=cursor>a&&cursor<b?cursor-a:0,n=Math.round(A.rate*6),before=inp.map(d=>d.slice(w0,w0+n)),at=a+clamp(mapPos?mapPos(w0):w0,0,out[0].length);
 fxCompare={label,version:A.version,before,at,n:Math.min(n,out[0].length-(at-a)),text}}
function stopCompare(){const s=cmpSrc;cmpSrc=null;if(s){s.onended=null;try{s.stop()}catch(e){}}}
// Alt+Maiusc+O: lo stesso tratto prima con l'audio di prima dell'ultimo effetto, poi con quello di adesso.
function compareBeforeAfter(){if(cmpSrc){stopCompare();announce('Confronto fermato');return}const c=fxCompare;
 if(!c||!A.buf){toast('Nessun effetto da confrontare: applica un effetto, poi Alt+Maiusc+O fa sentire prima e dopo');return}
 if(c.version!==A.version){toast(`L’audio è cambiato dopo «${c.label}»: il confronto non vale più. Annulla e ripeti l’effetto per confrontarlo di nuovo`);return}
 stopPlayback(false);stopPreview();const ctx=actxGet(),play=(ch,next)=>{const s=ctx.createBufferSource();s.buffer=makeBuffer(ch,A.rate);s.connect(audioOut());s.onended=()=>{if(cmpSrc===s)next()};cmpSrc=s;s.start(ctx.currentTime+0.6)};
 const after=sliceCh(A.buf,c.at,c.at+Math.max(1,c.n));announce(`Prima di «${c.label}»`);
 play(c.before,()=>{announce('Dopo');play(after,()=>{cmpSrc=null;announce(`Fine del confronto. ${c.text?capital(c.text)+'.':'Le misure non sono cambiate.'}`)})})}

// ——— Leggi i livelli (Alt+Maiusc+L): nell'editor la selezione, o tre secondi intorno al cursore (gli ultimi tre se si
// ascolta); sulle tracce l'uscita del brano intorno all'indicatore, il lavoro del limitatore e le tracce a confronto.
async function readLevels({track=null}={}){if(inEditorArea()&&!track){if(!A.buf){toast('Nessuna regione nell’editor');return}const sel=hasSel(),pos=aplay.playing?Math.round(playPos()):A.cursor,half=Math.round(A.rate*1.5),
  [a,b]=sel?[A.selA,A.selB]:aplay.playing?[Math.max(0,pos-2*half),pos]:[Math.max(0,pos-half),Math.min(alen(),pos+half)];if(b-a<A.rate*0.05){toast('Il tratto è troppo corto per misurarlo');return}
  const m=measureCh(sliceCh(A.buf,a,b),A.rate);toast(`Livelli ${sel?`della selezione (${sayTime(sec(b-a))})`:aplay.playing?'degli ultimi secondi ascoltati':`intorno al cursore, da ${sayTime(sec(a))} a ${sayTime(sec(b))}`}: ${levelSentence(m)}.`);return}
 if(!P.regions.length){toast('Il progetto è vuoto: niente da misurare');return}
 const t=MIX.playing?mixPos():P.t,from=Math.max(0,Math.min(t-1.5,projDur()-3)),to=Math.min(projDur(),from+3),here=P.regions.filter(r=>r.start<to&&regionEnd(r)>from);
 if(!here.length){toast(`Silenzio intorno a ${sayTime(t)}: nessuna regione suona tra ${sayTime(from)} e ${sayTime(to)}`);return}
 const res=await work('Misura dei livelli',async()=>{const solo=P.tracks.some(x=>x.solo),live=P.tracks.filter(x=>here.some(r=>r.track===x.id)&&!x.mute&&(!solo||x.solo)&&(!track||x.id===track));
  const ms=b=>measureCh([b.getChannelData(0),b.getChannelData(1)],b.sampleRate);if(track){const tr=trackOf(track);return{track:tr,m:tr&&live.length?ms(await renderMix({only:track,from,to})):null}}
  const out=ms(await renderMix({from,to})),raw=ms(await renderMix({from,to,limit:false})),per=[];for(const x of live)per.push({t:x,m:ms(await renderMix({only:x.id,from,to}))});return{out,raw,per}});if(!res)return;
 const where=`intorno a ${sayTime(t)}`;if(track){toast(res.m?`Traccia «${res.track.name}» ${where}: ${levelSentence(res.m,{floor:false})}.`:`La traccia «${res.track?.name||''}» non suona ${where}${res.track?.mute?': è muta':''}.`);return}
 const red=res.raw.peak-res.out.peak,lim=red>=0.5?`Il limitatore abbassa i picchi di ${fmtDb(red)}.`:'Il limitatore non interviene.',lv=x=>Number.isFinite(x.m.lufs)?x.m.lufs:x.m.rms,per=res.per.filter(x=>Number.isFinite(lv(x))).sort((x,y)=>lv(y)-lv(x));
 let cmp='';if(per.length>1){const unit=per.every(x=>Number.isFinite(x.m.lufs))?' LUFS':' dB';cmp=' '+per.map(x=>`${x.t.name} ${fmtNum(lv(x),1)}${unit}`).join(', ')+`: «${per[0].t.name}» sta ${fmtNum(lv(per[0])-lv(per[1]),1)} dB sopra «${per[1].t.name}».`}
 else if(per.length===1)cmp=` Suona solo la traccia «${per[0].t.name}».`;
 toast(`Uscita ${where}: ${levelSentence(res.out,{floor:false})}. ${lim}${cmp}`)}

// ——— Descrivi il brano (Alt+Maiusc+D): una finestra con il riassunto (letto all'apertura), che cosa suona insieme nel
// tempo e una tabella per traccia con regioni, spazi vuoti e sovrapposizioni.
function trackWords(t){const w=[];if(t.mute)w.push('muta');if(t.solo)w.push('in solo');if(t.vol)w.push('volume '+fmtDb(t.vol));if(Math.abs(t.pan)>=0.005)w.push('bilanciamento '+panWords(t.pan));
 if(t.low)w.push('bassi '+signedDb(t.low));if(t.high)w.push('alti '+signedDb(t.high));if(t.comp)w.push('compressione '+t.comp+'%');if(t.reverb)w.push('riverbero '+t.reverb+'%');w.push('colore '+colorName(t.color));return w.join(', ')}
// Tratti di tempo con le tracce che suonano: da un bordo di regione al successivo, unendo i tratti uguali.
function songSpans(){const pts=arEdges().filter(p=>p<=projDur()+1e-6),out=[];for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1];if(b-a<0.02)continue;const m=(a+b)/2,on=P.tracks.filter(t=>P.regions.some(r=>r.track===t.id&&r.start<=m&&regionEnd(r)>m)).map(t=>t.name+(t.mute?' (muta)':''));
  const key=on.join('|');if(out.length&&out.at(-1).key===key)out.at(-1).b=b;else out.push({a,b,key,on})}return out}
const andList=l=>l.length<2?(l[0]||''):l.slice(0,-1).join(', ')+' e '+l.at(-1);
function describeSong(){if(!P.tracks.length){toast('Il progetto è vuoto. Ctrl+Alt+R registra, Ctrl+I importa un file audio in una nuova traccia.');return}
 const T=projDur(),rows=[],sum=[`Brano di ${sayTime(T)}, ${P.tracks.length===1?'una traccia':P.tracks.length+' tracce'}, ${P.regions.length===1?'una regione':P.regions.length+' regioni'}, ${fmtNum(P.bpm,0)} BPM.`];let overlaps=0;
 const tables=P.tracks.map(t=>{const regs=regionsOn(t.id),lines=[];let prevEnd=0;
  regs.forEach((r,i)=>{const gap=r.start-prevEnd;if(gap>=1)lines.push([`spazio vuoto`,sayTime(prevEnd),sayTime(r.start),sayTime(gap),'']);const notes=[];if(r.gain)notes.push('guadagno '+fmtDb(r.gain));if(r.fadeIn)notes.push('entrata di '+sayTime(r.fadeIn));if(r.fadeOut)notes.push('uscita di '+sayTime(r.fadeOut));if(r.markers?.length)notes.push(r.markers.length===1?'un marcatore':r.markers.length+' marcatori');
   for(const o of regs.slice(i+1)){const ov=Math.min(regionEnd(r),regionEnd(o))-o.start;if(ov>0.01){notes.push(`si sovrappone a «${o.name}» per ${sayTime(ov)}`);overlaps++}}
   lines.push([`«${r.name}»`,sayTime(r.start),sayTime(regionEnd(r)),sayTime(r.dur),notes.join(', ')]);prevEnd=Math.max(prevEnd,regionEnd(r))});
  const first=regs[0],lastEnd=regs.reduce((x,r)=>Math.max(x,regionEnd(r)),0);
  sum.push(`${t.name}: ${!regs.length?'vuota':regs.length===1&&first.start<=0.05*T&&lastEnd>=0.95*T?'una regione per tutto il brano':`${regs.length===1?'una regione':regs.length+' regioni'} da ${sayTime(first.start)} a ${sayTime(lastEnd)}`}${t.mute?', muta':''}${t.solo?', in solo':''}.`);
  return `<h3>Traccia «${esc(t.name)}»</h3><p>${esc(capital(trackWords(t)))}.</p>`+(lines.length?`<table><caption>Regioni della traccia «${esc(t.name)}»</caption><thead><tr><th scope="col">Regione</th><th scope="col">Da</th><th scope="col">A</th><th scope="col">Durata</th><th scope="col">Note</th></tr></thead><tbody>${lines.map(l=>`<tr><th scope="row">${esc(l[0])}</th>${l.slice(1).map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<p>Nessuna regione.</p>')});
 if(overlaps)sum.push(overlaps===1?'Una sovrapposizione sulla stessa traccia.':overlaps+' sovrapposizioni sulla stessa traccia.');
 const spans=songSpans(),together=spans.map(s=>`<tr><th scope="row">${esc(sayTime(s.a))} – ${esc(sayTime(s.b))}</th><td>${esc(s.on.length?andList(s.on):'silenzio')}</td></tr>`).join('');
 modal('Descrizione del brano',`<p id="songSum">${esc(sum.join(' '))}</p><h3>Che cosa suona insieme</h3><table><caption>Tracce che suonano, tratto per tratto</caption><thead><tr><th scope="col">Tratto</th><th scope="col">Suonano</th></tr></thead><tbody>${together}</tbody></table>${tables.join('')}`,[],'Chiudi',{noCancel:true,wide:true,describedBy:'songSum'})}
