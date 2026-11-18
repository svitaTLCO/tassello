// Vista delle tracce. Ogni traccia è una riga con l'intestazione (nome, muto, solo, volume, bilanciamento,
// impostazioni del suono) e la corsia delle regioni, che per lo screen reader è un elenco: le frecce scelgono la
// regione e la descrivono con nome, tempo, durata ed effetti. Sotto c'è l'editor della regione scelta.
const arScroll=$('arScroll'),arInner=$('arInner'),arPlayheadEl=$('arPlayhead'),HEAD_W=240;
let lastArea='tracks',lastScope='project';
document.addEventListener('focusin',e=>{if(e.target.closest?.('#editorArea,#markPane'))lastArea='editor';else if(e.target.closest?.('#arrange'))lastArea='tracks'});
const inEditorArea=()=>!!document.activeElement?.closest?.('#editorArea,#markPane')||(lastArea==='editor'&&!document.activeElement?.closest?.('#arrange'));
const panWords=v=>Math.abs(v)<0.005?'al centro':`${Math.round(Math.abs(v)*100)}% a ${v<0?'sinistra':'destra'}`;
const colorName=c=>(TRACK_COLORS.find(x=>x[0]===c)||[c,'personalizzato'])[1].toLowerCase();
function regionLabel(r,i,n){const t=trackOf(r.track),parts=[`Regione ${i+1} di ${n} della traccia «${t?.name||''}»: «${r.name}»`,`da ${sayTime(r.start)} a ${sayTime(regionEnd(r))}`,`durata ${sayTime(r.dur)}`];
 if(r.gain)parts.push('guadagno '+fmtDb(r.gain));if(r.fadeIn)parts.push('dissolvenza in entrata di '+sayTime(r.fadeIn));if(r.fadeOut)parts.push('dissolvenza in uscita di '+sayTime(r.fadeOut));if(r.markers?.length)parts.push(r.markers.length===1?'un marcatore':r.markers.length+' marcatori');if(!SOURCES.has(r.src))parts.push('audio mancante');
 parts.push(...regionRelations(r));if(A.region===r.id)parts.push('aperta nell’editor');return parts.join(', ')}
// Dove sta la regione rispetto alle altre della traccia: tutte le sovrapposizioni con la durata, e la distanza dalla
// regione che finisce prima («attaccata», «2 secondi dopo»).
function regionRelations(r){const out=[],regs=regionsOn(r.track).filter(o=>o!==r);for(const o of regs){const ov=Math.min(regionEnd(r),regionEnd(o))-Math.max(r.start,o.start);if(ov>0.01)out.push(`si sovrappone per ${sayTime(ov)} a «${o.name}»`)}
 const prev=regs.filter(o=>regionEnd(o)<=r.start+0.01).sort((a,b)=>regionEnd(a)-regionEnd(b)).at(-1);if(prev){const gap=r.start-regionEnd(prev);out.push(gap<0.01?`attaccata a «${prev.name}»`:`${sayTime(gap)} dopo «${prev.name}»`)}return out}
function arWidth(){return Math.max(arScroll.clientWidth,HEAD_W+Math.ceil((Math.max(projDur(),P.t,P.cycle.b)+30)*P.pxs))}
// Picchi dei suoni per le miniature delle regioni: il valore più alto ogni centesimo di secondo.
// Il suono aperto nell'editor ha già i suoi picchi, aggiornati a ogni modifica: la miniatura si ricava da quelli.
const PEAKS=new Map();
function srcPeaks(id){const b=SOURCES.get(id);if(!b)return null;const c=PEAKS.get(id);if(c?.buf===b)return c;const per=Math.max(1,Math.round(b.sampleRate/100)),n=Math.ceil(b.length/per),mx=new Float32Array(n),ed=b===A.buf&&getPeaks().levels[0];
 if(ed){const st=ed.st,last=st.length-2;for(let k=0,i=0;k<n;k++){const a0=k*per,b0=a0+per;while(i<last&&st[i+1]<=a0)i++;let m=0;for(let j=i;j<=last&&st[j]<b0;j++)for(const p of ed.ch){const v=p.mx[j]>-p.mn[j]?p.mx[j]:-p.mn[j];if(v>m)m=v}mx[k]=m}const out={buf:b,mx};PEAKS.set(id,out);return out}
 for(let ch=0;ch<b.numberOfChannels;ch++){const d=b.getChannelData(ch);for(let i=0;i<n;i++){let m=mx[i];const e=Math.min(d.length,(i+1)*per);for(let j=i*per;j<e;j++){const v=d[j]<0?-d[j]:d[j];if(v>m)m=v}mx[i]=m}}const out={buf:b,mx};PEAKS.set(id,out);return out}
function drawRegionWave(cv,r){const pk=srcPeaks(r.src);if(!pk)return;const {g,w,h}=fitCanvas(cv);g.clearRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.82)';const mid=h/2,k=fromDb(r.gain);
 for(let x=0;x<w;x++){const a=Math.floor((r.off+x/w*r.dur)*100),b=Math.max(a+1,Math.floor((r.off+(x+1)/w*r.dur)*100));let m=0;for(let i=a;i<b&&i<pk.mx.length;i++)if(pk.mx[i]>m)m=pk.mx[i];const y=Math.min(mid,m*k*mid);g.fillRect(x,mid-y,1,Math.max(1,2*y))}}
// Disegno delle righe: intestazioni con i controlli e corsie con le regioni.
// Ridisegnare ricrea gli elementi: il focus torna sullo stesso controllo (corsia, pulsante o cursore della traccia).
function renderArrange(){if(!isAudio())return;const act=document.activeElement,keep=act&&arInner.contains(act)?act.id:null,W=arWidth();arInner.style.width=W+'px';$('arEmpty').hidden=P.tracks.length>0;
 $('arRows').innerHTML=P.tracks.map((t,ti)=>{const regs=regionsOn(t.id),sel=t.id===P.track,act=regs.find(r=>r.id===P.sel)||regs.find(r=>r.id===TL_REGION[t.id])||regs[0];if(act)TL_REGION[t.id]=act.id;
  return `<div class="ar-row${sel?' sel':''}" id="trow-${t.id}" data-track="${t.id}" style="--tc:${t.color}"><div class="ar-head${sel?' sel':''}" role="group" aria-labelledby="trn-${t.id}"><span class="trk-color" aria-hidden="true"></span>
<button type="button" class="trk-name" id="trn-${t.id}" data-tsel="${t.id}" aria-describedby="trd-${t.id}">${esc(t.name)}</button><span class="sr-only" id="trd-${t.id}">${t.kind==='bus'?'bus':'traccia'} ${ti+1} di ${P.tracks.length}${sel?', scelta':''}${t.mute?', muta':''}${t.solo?', in solo':''}</span>
<button type="button" class="trk-btn m" id="tm-${t.id}" data-tmute="${t.id}" aria-pressed="${t.mute}" aria-label="M, muto: ${esc(t.name)}" data-tip="Muto (M)">M</button><button type="button" class="trk-btn s" id="ts-${t.id}" data-tsolo="${t.id}" aria-pressed="${t.solo}" aria-label="S, solo: ${esc(t.name)}" data-tip="Solo (S)">S</button><button type="button" class="trk-btn" id="tset-${t.id}" data-tset="${t.id}" aria-label="Suono della traccia ${esc(t.name)}" data-tip="Suono della traccia: bassi, alti, compressione, riverbero">${ICON('eq')}</button>
<div class="trk-sliders"><input type="range" id="tv-${t.id}" data-tvol="${t.id}" min="-40" max="6" step="0.5" value="${t.vol}" aria-label="Volume: ${esc(t.name)}" aria-valuetext="${esc(fmtDb(t.vol))}" data-tip="Volume"><input type="range" id="tp-${t.id}" data-tpan="${t.id}" min="-100" max="100" step="5" value="${Math.round(t.pan*100)}" aria-label="Bilanciamento: ${esc(t.name)}" aria-valuetext="${esc(panWords(t.pan))}" data-tip="Bilanciamento"></div><canvas class="trk-meter" id="tmtr-${t.id}" aria-hidden="true"></canvas></div>
<div class="ar-lane" role="listbox" aria-orientation="horizontal" tabindex="0" id="lane-${t.id}" data-lane="${t.id}" aria-label="Regioni della traccia «${esc(t.name)}», ${regs.length===0?'nessuna regione':regs.length===1?'una regione':regs.length+' regioni'}" aria-describedby="laneHint" aria-activedescendant="${act?'rg-'+act.id:'rg-none-'+t.id}"><canvas class="auto-line" id="autl-${t.id}" aria-hidden="true"></canvas>${regs.length?regs.map((r,i)=>`<div class="item k-region${r.id===act?.id?' active':''}${SOURCES.has(r.src)?'':' missing'}" role="option" id="rg-${r.id}" data-region="${r.id}" aria-selected="${r.id===P.sel}" aria-label="${esc(regionLabel(r,i,regs.length))}" style="left:${r.start*P.pxs}px;width:${Math.max(6,r.dur*P.pxs)}px;--rc:${t.color}"><canvas aria-hidden="true"></canvas><span class="rg-name">${esc(r.name)}</span><span class="edge l" aria-hidden="true"></span><span class="edge r" aria-hidden="true"></span></div>`).join(''):`<div class="lb-empty" role="option" aria-disabled="true" aria-selected="false" id="rg-none-${t.id}" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);white-space:nowrap">${t.kind==='bus'?'Bus: riceve le tracce che hanno questa uscita':'Traccia vuota: R registra qui, oppure trascina un file'}</div>`}</div></div>`}).join('');
 for(const r of P.regions){const cv=document.querySelector(`#rg-${r.id} canvas`);if(cv&&r.dur*P.pxs>12)drawRegionWave(cv,r)}
 drawAutoLines();
 drawArRuler();placeArPlayhead(MIX.playing?mixPos():P.t);updateArrangeUI();if(keep&&$(keep)&&document.activeElement!==$(keep))$(keep).focus({preventScroll:true})}
// Automazione disegnata sulla corsia: linea continua per il volume, tratteggiata per il bilanciamento; per gli altri
// parametri un indicatore compatto in alto (un quadratino colorato per parametro acceso), perché sei linee
// sovrapposte non si leggerebbero.
const AUTO_DOT={reverb:'#2457c5',low:'#1e7a46',high:'#b35500',comp:'#7a3db8'};
function drawAutoLine(cv,t){const {g,w,h}=fitCanvas(cv);g.clearRect(0,0,w,h);const vol=t.auto?.vol||[],pan=t.auto?.pan||[],dur=Math.max(projDur(),vol.at(-1)?.t||0,pan.at(-1)?.t||0,1),X=p=>p*P.pxs,Y=v=>h-clamp((v+60)/72,0,1)*h;
 if(t.autoOn?.vol&&vol.length){const list=[{t:0,v:vol[0].v},...vol,{t:dur,v:vol.at(-1).v}];
  g.strokeStyle=palette.accent;g.lineWidth=1.5;g.beginPath();list.forEach((p,i)=>i?g.lineTo(X(p.t),Y(p.v)):g.moveTo(X(p.t),Y(p.v)));g.stroke();
  g.fillStyle=palette.accent;for(const p of vol){g.beginPath();g.arc(X(p.t),Y(p.v),2.5,0,Math.PI*2);g.fill()}}
 if(t.autoOn?.pan&&pan.length){const list=[{t:0,v:pan[0].v},...pan,{t:dur,v:pan.at(-1).v}],YP=v=>h-clamp((v+1)/2,0,1)*h;
  g.strokeStyle=palette['text-3'];g.lineWidth=1;g.setLineDash([4,3]);g.beginPath();list.forEach((p,i)=>i?g.lineTo(X(p.t),YP(p.v)):g.moveTo(X(p.t),YP(p.v)));g.stroke();g.setLineDash([])}
 let x=4;for(const k of ['reverb','low','high','comp']){if(t.autoOn?.[k]&&t.auto?.[k]?.length){g.fillStyle=AUTO_DOT[k];g.fillRect(x,3,4,4);x+=7}}}
function drawAutoLines(){for(const t of P.tracks){const cv=$('autl-'+t.id);if(cv)drawAutoLine(cv,t)}}
const TL_REGION={};
function drawArRuler(){const cv=$('arRulerCanvas'),W=Math.min(arWidth()-HEAD_W,32000);cv.style.width=W+'px';const {g,w,h}=fitCanvas(cv);g.clearRect(0,0,w,h);
 if(P.grid==='beats'){const bar=barDur(),px=bar*P.pxs,every=Math.max(1,Math.ceil(70/px));g.fillStyle=palette.ruler;g.font='11px "Segoe UI",system-ui,sans-serif';g.textBaseline='top';for(let k=0;k*bar*P.pxs<w;k++){const x=Math.round(k*bar*P.pxs)+0.5;g.fillRect(x-0.5,h-(k%every?5:9),1,k%every?5:9);if(k%every===0)g.fillText(String(k+1),x+3,2);if(px>=40)for(let b=1;b<P.sig;b++){const xb=Math.round((k*bar+b*beatDur())*P.pxs)+0.5;g.fillRect(xb-0.5,h-3,1,3)}}}
 else drawTicks(g,w,h,0,P.pxs,palette.ruler);
 const cy=$('arCycle'),c=P.cycle;cy.hidden=!(c.b>c.a);if(c.b>c.a){cy.style.left=c.a*P.pxs+'px';cy.style.width=Math.max(2,(c.b-c.a)*P.pxs)+'px';cy.style.opacity=c.on?'.7':'.3'}}
function placeArPlayhead(t){const x=t*P.pxs;$('arLine').style.left=HEAD_W+x+'px';arPlayheadEl.style.left=x+'px'}
function followAr(t){const x=HEAD_W+t*P.pxs,l=arScroll.scrollLeft,w=arScroll.clientWidth;if(x>l+w-30||x<l+HEAD_W)arScroll.scrollLeft=Math.max(0,x-HEAD_W-30)}
function ensureArVisible(t){const x=HEAD_W+t*P.pxs,l=arScroll.scrollLeft,w=arScroll.clientWidth;if(x<l+HEAD_W+10||x>l+w-30)arScroll.scrollLeft=Math.max(0,x-HEAD_W-(w-HEAD_W)/3)}
function arPlayheadText(t=P.t){const parts=[sayTime(t,2)];if(P.grid==='beats'){const b=Math.floor(t/beatDur());parts.push(`battuta ${Math.floor(b/P.sig)+1}, tempo ${b%P.sig+1}`)}const here=P.regions.filter(r=>t>=r.start&&t<regionEnd(r));if(here.length)parts.push(here.map(r=>`«${r.name}» su ${trackOf(r.track)?.name}`).join(', '));else if(P.regions.length&&t<projDur())parts.push('silenzio');if(P.cycle.on&&P.cycle.b>P.cycle.a)parts.push(`ciclo da ${sayTime(P.cycle.a)} a ${sayTime(P.cycle.b)}`);return parts.join(', ')}
function updateArrangeUI(){if(!isAudio())return;const T=projDur(),t=MIX.playing?mixPos():P.t;if(!MIX.playing)$('aClock').textContent=fmtTime(t);$('aClockSub').textContent=P.tracks.length?'di '+fmtTime(T):'Progetto vuoto';
 arPlayheadEl.setAttribute('aria-valuemax',Math.ceil(Math.max(T,t)));arPlayheadEl.setAttribute('aria-valuenow',Math.round(t));if(!MIX.playing)arPlayheadEl.setAttribute('aria-valuetext',arPlayheadText(t));
 $('arTempo').textContent=`${fmtNum(P.bpm,P.bpm%1?1:0)} BPM · ${P.sig}/4`;$('arInfo').textContent=P.tracks.length?`${P.tracks.length} tracce · ${P.regions.length} regioni · ${fmtTime(T,1)}`:'';
 $('docInfo').textContent=P.tracks.length?`${P.tracks.length} tracce · ${fmtTime(T,1)} · ${fmtNum(P.bpm,0)} BPM`:'';placeArPlayhead(t);refreshToggles();updateZoomUI()}
function updateEditorBar(){const r=A.region&&regionOf(A.region);$('edInfo').textContent=r?`«${r.name}» · traccia «${trackOf(r.track)?.name||''}» · ${fmtTime(r.dur,1)}`:(A.buf?'suono non collegato a una traccia':'nessuna regione aperta');$('wave').setAttribute('aria-label',r?`Forma d’onda della regione «${r.name}»`:'Forma d’onda')}
function showEditor(on){const ea=$('editorArea');ea.classList.toggle('closed',!on);const b=ea.querySelector('[data-action=toggleEditor]');b.setAttribute('aria-label',on?'Nascondi l’editor della regione':'Mostra l’editor della regione');b.innerHTML=ICON(on?'down':'up');if(on){viewClamp();drawAudio()}refreshToggles()}
// Spostamenti dell'indicatore del brano.
function arSeek(t,{say=false}={}){t=Math.max(0,t);if(MIX.playing){mixPlay(t,{origin:MIX.origin,recording:MIX.recording})}else P.t=t;ensureArVisible(t);updateArrangeUI();schedulePersist('audio');if(say)announce(arPlayheadText(t))}
function arEdges(){const pts=new Set([0]);for(const r of P.regions){pts.add(+r.start.toFixed(4));pts.add(+regionEnd(r).toFixed(4))}return [...pts].sort((a,b)=>a-b)}
function arEdgeStep(dir){const t=MIX.playing?mixPos():P.t,pts=arEdges(),p=dir>0?pts.find(x=>x>t+1e-3):[...pts].reverse().find(x=>x<t-1e-3);if(p===undefined){toast(dir>0?'Nessun bordo di regione dopo':'Nessun bordo di regione prima');return}arSeek(p,{say:true})}
const snapGrid=t=>P.grid==='beats'?Math.round(t/beatDur())*beatDur():t;
function arZoom(f,center=P.t){const x=HEAD_W+center*P.pxs-arScroll.scrollLeft;P.pxs=clamp(P.pxs*f,1,2000);renderArrange();arScroll.scrollLeft=Math.max(0,HEAD_W+center*P.pxs-x);schedulePersist('audio')}
function arZoomFit(){P.pxs=clamp((arScroll.clientWidth-HEAD_W-30)/Math.max(5,projDur()),1,2000);renderArrange();arScroll.scrollLeft=0}
arPlayheadEl.addEventListener('focus',()=>{if(MIX.playing)playingValue(arPlayheadEl,mixPos(),arPlayheadText,true)});
function setCycleEdge(end){const t=MIX.playing?mixPos():P.t,c=P.cycle;if(end){c.b=t;if(c.a>=c.b)c.a=Math.max(0,c.b-barDur())}else{c.a=t;if(c.b<=c.a)c.b=c.a+barDur()}c.on=true;drawArRuler();refreshToggles();schedulePersist('audio');announce(`${end?'Fine':'Inizio'} del ciclo a ${sayTime(t,1)}: ciclo da ${sayTime(c.a)} a ${sayTime(c.b)}, attivo`)}
arPlayheadEl.addEventListener('keydown',e=>{const k=e.key,shift=e.shiftKey,plain=!e.ctrlKey&&!e.metaKey&&!e.altKey,t=MIX.playing?mixPos():P.t;let done=true;
 if(k==='ArrowLeft'||k==='ArrowRight'){const d=(k==='ArrowRight'?1:-1)*(shift?fineStep():gridStep());arSeek(P.grid==='beats'&&!shift?snapGrid(t+d):t+d)}else if(k==='PageUp'||k==='PageDown')arSeek(t+(k==='PageDown'?1:-1)*(P.grid==='beats'?barDur():5));
 else if(k==='Home')arSeek(0);else if(k==='End')arSeek(projDur());else if(k==='ArrowUp'||k==='ArrowDown')arEdgeStep(k==='ArrowDown'?1:-1);else if(k==='Enter'&&plain){focusLane(P.track)}
 else if(arCommonKeys(e,null))return;else if(plain&&/^[io]$/i.test(k))setCycleEdge(k.toLowerCase()==='o');else if(plain&&/^c$/i.test(k))runCommand('cycle');else done=false;if(done){e.preventDefault();e.stopPropagation()}});
// Tasti comuni a indicatore e corsie: brano, registrazione, zoom.
function arCommonKeys(e,tid){const k=e.key,plain=!e.ctrlKey&&!e.metaKey&&!e.altKey;let done=true;
 if(k===' '&&plain)songPlayPause();else if(plain&&/^r$/i.test(k)&&!e.shiftKey){if(tid)P.track=tid;runCommand('recordAudio')}else if(plain&&(k==='+'||e.code==='NumpadAdd'))arZoom(1.5);else if(plain&&(k==='-'||e.code==='NumpadSubtract'))arZoom(1/1.5);else if(plain&&k==='0'){arZoomFit();announce('Si vede tutto il brano')}
 else if(plain&&!e.shiftKey&&/^[qw]$/i.test(k)){if(tid)P.track=tid;runCommand(k.toLowerCase()==='q'?'regionTrimStart':'regionTrimEnd')}
 else if((k==='F10'&&e.shiftKey)||k==='ContextMenu')regionMenu();else done=false;if(done){e.preventDefault();e.stopPropagation()}return done}
// Corsie: scelta della regione, spostamenti nel tempo e tra le tracce, apertura nell'editor.
function focusLane(tid){const el=tid&&$('lane-'+tid);if(el)el.focus();else(P.tracks.length?$('lane-'+P.tracks[0].id):arPlayheadEl)?.focus()}
function selectRegion(r,{seek=true,focus=false}={}){P.sel=r.id;P.track=r.track;TL_REGION[r.track]=r.id;if(seek&&!MIX.playing)P.t=r.start;renderArrange();if(focus)focusLane(r.track);schedulePersist('audio')}
function laneKeys(e,tid){const regs=regionsOn(tid),i=regs.findIndex(r=>r.id===TL_REGION[tid]),k=e.key,ctrl=e.ctrlKey||e.metaKey,cur=regs[i];let done=true;
 if((k==='ArrowLeft'||k==='ArrowRight')&&ctrl&&!e.altKey){if(cur)moveRegion(cur,(k==='ArrowRight'?1:-1)*(e.shiftKey?fineStep():gridStep()))}
 else if((k==='ArrowUp'||k==='ArrowDown')&&ctrl&&!e.altKey){if(cur)regionToTrack(cur,k==='ArrowDown'?1:-1)}
 else if((k==='ArrowLeft'||k==='ArrowRight')&&!e.altKey){if(!regs.length)return true;const j=clamp(i+(k==='ArrowRight'?1:-1),0,regs.length-1);if(j===i)announce(j?'Ultima regione della traccia':'Prima regione della traccia');selectRegion(regs[j],{focus:true})}
 else if(k==='Home'||k==='End'){if(regs.length)selectRegion(regs[k==='Home'?0:regs.length-1],{focus:true})}
 else if(k==='ArrowUp'||k==='ArrowDown'){const ti=P.tracks.findIndex(t=>t.id===tid),nt=P.tracks[ti+(k==='ArrowDown'?1:-1)];if(!nt){if(k==='ArrowUp')arPlayheadEl.focus();else announce('Ultima traccia');return true}P.track=nt.id;const nr=regionsOn(nt.id),at=nr.find(r=>P.t>=r.start&&P.t<regionEnd(r))||nr.find(r=>r.id===TL_REGION[nt.id])||nr[0];if(at){P.sel=at.id;TL_REGION[nt.id]=at.id}renderArrange();focusLane(nt.id)}
 else if(k==='Enter'&&e.altKey){if(cur)regionProps(cur)}else if(k==='Enter'){if(cur)openRegion(cur)}else if(k==='F2'){if(cur)renameRegion(cur)}else if(k==='Delete'||k==='Backspace'){if(cur)deleteRegion(cur)}
 else if(!ctrl&&!e.altKey&&/^m$/i.test(k))toggleTrack(tid,'mute');else if(!ctrl&&!e.altKey&&/^s$/i.test(k))toggleTrack(tid,'solo');else if(!ctrl&&!e.altKey&&!e.shiftKey&&/^l$/i.test(k))readLevels({track:tid});
 else if(arCommonKeys(e,tid))return true;else done=false;if(done){e.preventDefault();e.stopPropagation()}return done}
arInner.addEventListener('keydown',e=>{const lane=e.target.closest?.('.ar-lane');if(lane&&e.target===lane)laneKeys(e,lane.dataset.lane)});
arInner.addEventListener('focusin',e=>{const lane=e.target.closest?.('.ar-lane');if(lane&&e.target===lane&&P.track!==lane.dataset.lane){P.track=lane.dataset.lane;const regs=regionsOn(P.track),r=regs.find(x=>x.id===TL_REGION[P.track])||regs[0];if(r){P.sel=r.id;TL_REGION[P.track]=r.id}renderArrange();$('lane-'+P.track)?.focus()}const head=e.target.closest?.('.ar-head');if(head){const tid=head.parentElement.dataset.track;if(tid&&P.track!==tid){P.track=tid;for(const row of $$('.ar-row[data-track]'))row.classList.toggle('sel',row.dataset.track===tid)}}});
// Intestazioni: nome (sceglie la traccia, doppio clic per rinominarla), muto, solo, volume, bilanciamento e suono.
arInner.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tmute)toggleTrack(b.dataset.tmute,'mute');else if(b.dataset.tsolo)toggleTrack(b.dataset.tsolo,'solo');else if(b.dataset.tset)trackSettings(trackOf(b.dataset.tset));else if(b.dataset.tsel){P.track=b.dataset.tsel;renderArrange();$('trn-'+P.track)?.focus();announce('Traccia «'+trackOf(P.track).name+'» scelta')}});
arInner.addEventListener('dblclick',e=>{const b=e.target.closest('[data-tsel]');if(b){renameTrack(trackOf(b.dataset.tsel));return}const it=e.target.closest('[data-region]');if(it){const r=regionOf(it.dataset.region);if(r)openRegion(r)}});
arInner.addEventListener('input',e=>{const el=e.target,id=el.dataset.tvol||el.dataset.tpan;if(!id)return;const t=trackOf(id);if(!t)return;if(el.dataset.tvol){t.vol=Number(el.value);el.setAttribute('aria-valuetext',fmtDb(t.vol))}else{t.pan=Number(el.value)/100;el.setAttribute('aria-valuetext',panWords(t.pan))}mixLive()});
arInner.addEventListener('change',e=>{const el=e.target,id=el.dataset.tvol||el.dataset.tpan;if(!id)return;const t=trackOf(id),v=el.dataset.tvol?Number(el.value):Number(el.value)/100,key=el.dataset.tvol?'vol':'pan',old=key==='vol'?Number(el.defaultValue):Number(el.defaultValue)/100;t[key]=old;pCommit(key==='vol'?'Volume della traccia':'Bilanciamento della traccia',()=>{t[key]=v},{live:true});requestAnimationFrame(()=>document.querySelector(`[data-t${key==='vol'?'vol':'pan'}="${id}"]`)?.focus())});
arInner.addEventListener('contextmenu',e=>{const it=e.target.closest('[data-region]');if(!it)return;e.preventDefault();const r=regionOf(it.dataset.region);if(r){selectRegion(r,{seek:false});regionMenu(e.clientX,e.clientY)}});
// Mouse: clic sul righello sposta l'indicatore; le regioni si trascinano nel tempo e su un'altra traccia,
// i bordi si trascinano per accorciarle o allungarle. Aggancio a griglia, bordi e indicatore entro 8 pixel (Alt lo sospende).
const arTAtX=x=>Math.max(0,(x-arInner.getBoundingClientRect().left-HEAD_W)/P.pxs);
$('arRuler').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();arSeek(arTAtX(e.clientX));arPlayheadEl.focus({preventScroll:true});const move=ev=>arSeek(arTAtX(ev.clientX)),up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up)};addEventListener('pointermove',move);addEventListener('pointerup',up)});
function arSnap(t,dur,exceptId,off){if(off||!prefs.snap)return t;const lim=8/P.pxs,pts=[0,P.t];for(const r of P.regions)if(r.id!==exceptId)pts.push(r.start,regionEnd(r));let best=null;for(const p of pts)for(const c of dur?[p,p-dur]:[p]){const d=Math.abs(t-c);if(c>=0&&d<=lim&&(!best||d<best.d))best={d,v:c}}if(best)return best.v;if(P.grid==='beats'){const g=snapGrid(t);if(Math.abs(g-t)<=lim*2)return g;if(dur){const ge=snapGrid(t+dur)-dur;if(Math.abs(ge-t)<=lim*2&&ge>=0)return ge}}return t}
// Il clic ridisegna la corsia: senza preventDefault il browser darebbe il focus all'area di lavoro, non alla corsia.
arInner.addEventListener('pointerdown',e=>{if(e.button!==0)return;const it=e.target.closest('[data-region]'),lane=e.target.closest('.ar-lane');if(!lane)return;e.preventDefault();
 if(!it){P.track=lane.dataset.lane;arSeek(arTAtX(e.clientX));renderArrange();focusLane(P.track);return}
 const r=regionOf(it.dataset.region);if(!r)return;const mode=e.target.classList.contains('l')?'left':e.target.classList.contains('r')?'right':'move',x0=e.clientX,orig={start:r.start,off:r.off,dur:r.dur,track:r.track},src=SOURCES.get(r.src),max=src?src.duration:r.off+r.dur;let moved=false,target=r.track;
 selectRegion(r,{seek:false});focusLane(r.track);const el=()=>$('rg-'+r.id);
 const move=ev=>{const dx=ev.clientX-x0;if(!moved&&Math.abs(dx)<4&&mode==='move'&&Math.abs(ev.clientY-e.clientY)<6)return;moved=true;const d=dx/P.pxs,item=el();if(!item)return;
  if(mode==='move'){const s=arSnap(Math.max(0,orig.start+d),orig.dur,r.id,ev.altKey);r.start=s;item.style.left=s*P.pxs+'px';const row=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('.ar-row[data-track]');target=row?.dataset.track||target;for(const rw of $$('.ar-row[data-track]'))rw.classList.toggle('drop',rw.dataset.track===target&&target!==orig.track)}
  else if(mode==='left'){const ns=clamp(arSnap(orig.start+d,0,r.id,ev.altKey),orig.start-orig.off,orig.start+orig.dur-0.02);r.start=ns;r.off=orig.off+(ns-orig.start);r.dur=orig.dur-(ns-orig.start);item.style.left=ns*P.pxs+'px';item.style.width=Math.max(6,r.dur*P.pxs)+'px'}
  else{const ne=clamp(arSnap(orig.start+orig.dur+d,0,r.id,ev.altKey),orig.start+0.02,orig.start+max-orig.off);r.dur=ne-orig.start;item.style.width=Math.max(6,r.dur*P.pxs)+'px'}};
 const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up);for(const rw of $$('.ar-row.drop'))rw.classList.remove('drop');if(!moved){if(!MIX.playing){P.t=arTAtX(e.clientX);updateArrangeUI()}return}
  const now={start:r.start,off:r.off,dur:r.dur,track:target};Object.assign(r,orig);pCommit(mode==='move'?'Sposta la regione':'Accorcia la regione',()=>Object.assign(r,now));P.track=r.track;focusLane(r.track);
  announce(mode==='move'?`«${r.name}» ${now.track!==orig.track?'sulla traccia «'+trackOf(now.track).name+'», ':''}da ${sayTime(r.start)}`:`«${r.name}» da ${sayTime(r.start)} a ${sayTime(regionEnd(r))}, durata ${sayTime(r.dur)}`)};
 addEventListener('pointermove',move);addEventListener('pointerup',up)});
arScroll.addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();arZoom(e.deltaY>0?1/1.25:1.25,arTAtX(e.clientX))}},{passive:false});
arScroll.addEventListener('scroll',()=>updateZoomUI());
// Operazioni sulle regioni.
function moveRegion(r,d){const t0=r.start,was=regionRelations(r).filter(x=>x.startsWith('si sovrappone')).length;pCommit('Sposta la regione',()=>{r.start=Math.max(0,P.grid==='beats'&&Math.abs(d)>=beatDur()-1e-9?snapGrid(r.start+d):r.start+d)});if(Math.abs(r.start-t0)<1e-9){announce('La regione è già all’inizio');return}P.t=MIX.playing?P.t:r.start;updateArrangeUI();focusLane(r.track);const now=regionRelations(r).filter(x=>x.startsWith('si sovrappone'));announce(`«${r.name}» da ${sayTime(r.start,Math.abs(d)<0.1?2:1)}${P.grid==='beats'?', '+arPlayheadText(r.start).split(', ')[1]:''}${now.length&&!was?', ora '+now[0]:!now.length&&was?', non si sovrappone più':''}`)}
function regionToTrack(r,dir){const i=P.tracks.findIndex(t=>t.id===r.track),t=P.tracks[i+dir];if(!t){toast(dir<0?'È già nella prima traccia':'È già nell’ultima traccia');return}pCommit('Sposta la regione su un’altra traccia',()=>{r.track=t.id});P.track=t.id;TL_REGION[t.id]=r.id;renderArrange();focusLane(t.id);announce(`«${r.name}» spostata sulla traccia «${t.name}»`)}
function regionAtPlayhead(){const r=selRegion(),t=P.t;if(r&&t>r.start+0.005&&t<regionEnd(r)-0.005)return r;return regionsOn(P.track).find(x=>t>x.start+0.005&&t<regionEnd(x)-0.005)||P.regions.find(x=>t>x.start+0.005&&t<regionEnd(x)-0.005)||null}
function splitRegion(){if(MIX.playing)mixStop(true);const r=regionAtPlayhead(),t=P.t;if(!r){toast('L’indicatore deve stare dentro una regione: scegli la regione e porta l’indicatore nel punto da dividere');return}let right;
 pCommit('Dividi la regione',()=>{const d=t-r.start;right={...structuredClone(r),id:uid(),start:t,off:r.off+d,dur:r.dur-d,fadeIn:0,name:r.name,markers:(r.markers||[]).map(m=>({...m,pos:m.pos-Math.round(d*(SOURCES.get(r.src)?.sampleRate||48000))})).filter(m=>m.pos>=0)};r.dur=d;r.fadeOut=0;r.markers=(r.markers||[]).filter(m=>m.pos/(SOURCES.get(r.src)?.sampleRate||48000)<=d);P.regions.push(right);P.sel=right.id});
 focusLane(r.track);announce(`«${r.name}» divisa a ${sayTime(t,2)}: la seconda parte è scelta`)}
// Accorcia la regione all'indicatore senza trascinare i bordi (WCAG 2.5.7), come Q e W in Video: l'inizio (il suono prima
// dell'indicatore resta fuori, la regione comincia lì) oppure la fine. I marcatori fuori dalla parte che resta spariscono.
function trimRegion(end){if(MIX.playing)mixStop(true);const r=regionAtPlayhead(),t=P.t;if(!r){toast('L’indicatore deve stare dentro una regione: scegli la regione e porta l’indicatore nel punto da tagliare');return}const sr=SOURCES.get(r.src)?.sampleRate||48000;
 pCommit(end?'Accorcia la fine della regione':'Accorcia l’inizio della regione',()=>{const d=t-r.start;if(end){r.dur=d;r.fadeOut=Math.min(r.fadeOut,d/2);r.markers=(r.markers||[]).filter(m=>m.pos/sr<=d)}else{r.start=t;r.off+=d;r.dur-=d;r.fadeIn=Math.min(r.fadeIn,r.dur/2);r.markers=(r.markers||[]).map(m=>({...m,pos:m.pos-Math.round(d*sr)})).filter(m=>m.pos>=0)}P.sel=r.id});
 focusLane(r.track);announce(`«${r.name}» ora ${end?'finisce':'comincia'} a ${sayTime(t,2)} e dura ${sayTime(r.dur)}`)}
function deleteRegion(r=selRegion()){if(!r){toast('Scegli prima una regione');return}const regs=regionsOn(r.track),i=regs.indexOf(r);pCommit('Elimina la regione',()=>{P.regions=P.regions.filter(x=>x!==r);const nx=regs[i+1]||regs[i-1];P.sel=nx?.id||null});focusLane(r.track);announce(`Regione «${r.name}» eliminata`)}
function duplicateRegion(r=selRegion()){if(!r){toast('Scegli prima una regione');return}let c;pCommit('Duplica la regione',()=>{c={...structuredClone(r),id:uid(),start:regionEnd(r)};P.regions.push(c);P.sel=c.id});focusLane(r.track);announce(`Copia di «${r.name}» subito dopo, da ${sayTime(c.start)}`)}
async function loopRegion(r=selRegion()){if(!r){toast('Scegli prima una regione');return}const v=await modal('Ripeti la regione',`<p>Le copie di «${esc(r.name)}» vengono messe una dopo l’altra sulla stessa traccia, come un giro che si ripete.</p>`,[{id:'n',label:'Quante volte ripeterla',type:'number',value:3}],'Ripeti',{validate:v=>num(v.n)>=1&&num(v.n)<=100?null:{msg:'Scegli un numero da 1 a 100',field:'n'}});if(!v)return;const n=Math.round(num(v.n));pCommit('Ripeti la regione',()=>{for(let k=1;k<=n;k++)P.regions.push({...structuredClone(r),id:uid(),start:r.start+k*r.dur})});focusLane(r.track);announce(`«${r.name}» ripetuta ${n} volte: ora arriva a ${sayTime(r.start+(n+1)*r.dur)}`)}
async function renameRegion(r=selRegion()){if(!r)return;const v=await modal('Rinomina la regione','',[{id:'name',label:'Nome',value:r.name}],'Rinomina');if(!v||!v.name.trim())return;pCommit('Rinomina la regione',()=>{r.name=v.name.trim().slice(0,120)});focusLane(r.track);announce('Regione rinominata «'+r.name+'»')}
async function regionProps(r=selRegion()){if(!r){toast('Scegli prima una regione');return}if(!regionAvailable(r))return;const src=SOURCES.get(r.src);
 const v=await modal('Proprietà della regione',`<p>Usa ${esc(fmtTime(r.dur,2))} del suono, da ${esc(fmtTime(r.off,2))}${src?` su ${esc(fmtTime(src.duration,2))}`:''}.${r.gainOn?' Il guadagno segue l’automazione: il campo qui sotto non conta finché resta accesa.':''}</p>`,[{id:'name',label:'Nome',value:r.name},{id:'track',label:'Traccia',type:'select',value:r.track,options:P.tracks.map(t=>[t.id,t.name])},{id:'start',label:'Inizio nel brano',type:'time',value:fmtTime(r.start,3)},{id:'gain',label:'Guadagno',type:'range',min:-24,max:12,step:0.5,value:r.gain,fmt:fmtDb},{id:'fadeIn',label:'Dissolvenza in entrata (secondi)',type:'number',min:0,max:Math.floor(r.dur*100)/100,value:r.fadeIn},{id:'fadeOut',label:'Dissolvenza in uscita (secondi)',type:'number',min:0,max:Math.floor(r.dur*100)/100,value:r.fadeOut}],'Applica',{validate:v=>parseTime(v.start)>=0?null:{msg:'Inizio nel brano: scrivi un tempo, per esempio 12,5 oppure 1:02,5.',field:'start'}});
 if(!v)return;pCommit('Proprietà della regione',()=>{r.name=v.name.trim().slice(0,120)||r.name;r.track=v.track;r.start=parseTime(v.start);r.gain=Number(v.gain);r.fadeIn=clamp(num(v.fadeIn)||0,0,r.dur);r.fadeOut=clamp(num(v.fadeOut)||0,0,r.dur)});P.track=r.track;focusLane(r.track);announce('Regione aggiornata')}
function fadeRegion(which){const r=selRegion();if(!r){toast('Scegli prima una regione');return}if(!regionAvailable(r))return;const key=which==='in'?'fadeIn':'fadeOut',on=!(r[key]>0),d=Math.min(0.5,r.dur/3);pCommit(which==='in'?'Dissolvenza in entrata':'Dissolvenza in uscita',()=>{r[key]=on?d:0});announce(`${which==='in'?'Dissolvenza in entrata':'Dissolvenza in uscita'} ${on?'di '+sayTime(d,1):'tolta'}`)}
// Marcatore all'indicatore del brano (anche durante l'ascolto): va nella regione che suona lì, sulla traccia scelta se
// ce n'è una, e si salva con la regione. Se la regione è aperta nell'editor, il marcatore entra anche lì.
function songMarker(){const t=MIX.playing?mixPos():P.t,at=x=>t>=x.start&&t<regionEnd(x),ed=A.region&&regionOf(A.region),r=(ed&&at(ed)?ed:null)||regionsOn(P.track).find(at)||P.regions.find(at);
 if(!r){toast('Nessuna regione all’indicatore: il marcatore va dentro una regione');return}const said=k=>`Marcatore ${k} aggiunto a ${sayTime(t,2)} nella regione «${r.name}» della traccia «${trackOf(r.track)?.name||''}»`;
 if(r===ed&&A.buf){markerAt(Math.round((t-r.start)*A.rate),said);return}const rate=SOURCES.get(r.src)?.sampleRate||48000,pos=Math.round((t-r.start)*rate),n=(r.markers?.length||0)+1;
 pCommit('Aggiungi marcatore',()=>{r.markers=[...(r.markers||[]),{id:uid(),pos,label:'Marcatore '+n}].sort((a,b)=>a.pos-b.pos)},{live:true});announce(said(r.markers.filter(m=>m.pos<=pos).length))}
function regionMenu(x,y){const r=selRegion(),lane=$('lane-'+P.track),it=r&&$('rg-'+r.id),rect=(it||lane||arPlayheadEl).getBoundingClientRect();
 openMenu(r?[mi('regionEdit'),mi('regionProps'),{label:'Rinomina la regione…',icon:'rename',keys:'F2',run:()=>renameRegion(r)},'-',mi('regionSplit'),mi('regionTrimStart'),mi('regionTrimEnd'),mi('regionDuplicate'),mi('regionLoop'),mi('regionDelete'),'-',mi('cut'),mi('copy'),mi('paste'),'-',mi('regionFadeIn'),mi('regionFadeOut'),mi('cycleRegion'),'-',mi('trackSettings')]:[mi('paste'),mi('recordAudio'),mi('importTrack'),mi('newTrack'),mi('trackSettings')],x??rect.left+10,y??rect.bottom,r?'Menu della regione «'+r.name+'»':'Menu della traccia')}
// Appunti delle regioni: si incollano sulla traccia scelta, all'indicatore.
function regionCopy(cut){const r=selRegion();if(!r){toast('Scegli prima una regione');return}rclip=structuredClone(r);if(cut)deleteRegion(r);else announce('Regione «'+r.name+'» copiata')}
function regionPaste(){if(!rclip){toast('Nessuna regione negli appunti: copiane una con Ctrl+C');return}const t=selTrack();if(!t){toast('Crea prima una traccia');return}let c;pCommit('Incolla la regione',()=>{c={...structuredClone(rclip),id:uid(),track:t.id,start:P.t};P.regions.push(c);P.sel=c.id});focusLane(t.id);announce(`«${c.name}» incollata sulla traccia «${t.name}», da ${sayTime(c.start)}`)}
// Operazioni sulle tracce.
function addTrack(){let t;pCommit('Nuova traccia',()=>{t=newTrack();P.tracks.push(t);P.track=t.id});focusLane(t.id);announce(`Nuova traccia «${t.name}», ${P.tracks.length} di ${P.tracks.length}: R per registrare qui`)}
function toggleTrack(tid,key){const t=trackOf(tid);if(!t)return;pCommit(key==='mute'?'Muto':'Solo',()=>{t[key]=!t[key]},{live:true});announce(`${key==='mute'?'Muto':'Solo'} ${t[key]?'attivato':'disattivato'} su «${t.name}»`)}
async function renameTrack(t=selTrack()){if(!t)return;const v=await modal('Rinomina la traccia','',[{id:'name',label:'Nome',value:t.name}],'Rinomina');if(!v||!v.name.trim())return;pCommit('Rinomina la traccia',()=>{t.name=v.name.trim().slice(0,80)});focusLane(t.id);announce('Traccia rinominata «'+t.name+'»')}
async function deleteTrack(t=selTrack()){if(!t)return;const n=P.regions.filter(r=>r.track===t.id).length;if(n&&!(await confirmAction(`Eliminare la traccia «${t.name}» con ${n===1?'la sua regione':'le sue '+n+' regioni'}?`,'Elimina')))return;const i=P.tracks.indexOf(t);pCommit('Elimina la traccia',()=>{P.tracks=P.tracks.filter(x=>x!==t);P.regions=P.regions.filter(r=>r.track!==t.id);P.track=(P.tracks[i]||P.tracks[i-1])?.id||null});focusLane(P.track);announce(`Traccia «${t.name}» eliminata`)}
function duplicateTrack(t=selTrack()){if(!t)return;let c;pCommit('Duplica la traccia',()=>{c={...structuredClone(t),id:uid(),name:t.name+' (copia)',solo:false};P.tracks.splice(P.tracks.indexOf(t)+1,0,c);for(const r of P.regions.filter(r=>r.track===t.id))P.regions.push({...structuredClone(r),id:uid(),track:c.id});P.track=c.id});focusLane(c.id);announce(`Traccia duplicata: «${c.name}»`)}
function moveTrack(dir,t=selTrack()){if(!t)return;const i=P.tracks.indexOf(t),j=i+dir;if(j<0||j>=P.tracks.length){toast(dir<0?'È già la prima traccia':'È già l’ultima traccia');return}pCommit('Sposta la traccia',()=>{P.tracks.splice(i,1);P.tracks.splice(j,0,t)});focusLane(t.id);announce(`Traccia «${t.name}» in posizione ${j+1} di ${P.tracks.length}`)}
// ——— Catena dei componenti: moduli aggiuntivi della traccia, in ordine a scelta. L'editor lavora su una copia
// (work) che si applica alla traccia per sentirne subito l'effetto; al commit la copia diventa la catena vera,
// all'annullamento della finestra la traccia torna com'era.
const CHAIN_LABELS={thr:'Soglia (dB)',ratio:'Rapporto',att:'Attacco (ms)',rel:'Rilascio (ms)',make:'Recupero (dB)',lo:'Bassi (dB)',loHz:'Bassi (Hz)',mid:'Medi (dB)',midHz:'Medi (Hz)',hi:'Alti (dB)',hiHz:'Alti (Hz)',ms:'Tempo (ms)',fb:'Retroazione (%)',mix:'Mescola (%)',wet:'Bagnato (%)',drive:'Intensità (%)',wide:'Larghezza (%)'};
const CHAIN_STEPS={thr:0.5,ratio:0.5,att:1,rel:5,make:0.5,lo:0.5,loHz:10,mid:0.5,midHz:10,hi:0.5,hiHz:50,ms:10,fb:1,mix:1,wet:1,drive:1,wide:1};
const chainRow=m=>{const def=CHAIN_TYPES[m.tipo],id=m.id;
 return `<li><b>${esc(def.name)}</b><span class="chain-btns"><button type="button" class="btn sm" data-chup="${id}" aria-label="Sposta su: ${esc(def.name)}">Su</button><button type="button" class="btn sm" data-chdn="${id}" aria-label="Sposta giù: ${esc(def.name)}">Giù</button><button type="button" class="btn sm" data-chdel="${id}" aria-label="Togli: ${esc(def.name)}">Togli</button></span>${Object.entries(def.params).map(([k,[lo,hi,df]])=>`<label class="chain-p">${esc(CHAIN_LABELS[k]||k)} <input type="number" id="ch_${id}_${k}" min="${lo}" max="${hi}" step="${CHAIN_STEPS[k]}" value="${m.params[k]??df}"></label>`).join('')}</li>`};
const chainBody=()=>`<div id="chainBox"><h3>Catena dei componenti</h3><ol id="chainList"></ol><p><label for="chainAdd">Aggiungi</label> <select id="chainAdd">${Object.entries(CHAIN_TYPES).map(([id,def])=>`<option value="${id}">${esc(def.name)}</option>`).join('')}</select> <button type="button" class="btn sm" id="chainPlus">Aggiungi</button></p><small class="hint">I moduli entrano dopo bassi, alti e compressione della traccia, prima del volume e del riverbero; si spostano con Su e Giù, fino a otto.</small></div>`;
function wireChain(work,apply){const box=$('chainBox'),list=$('chainList'),render=()=>{list.innerHTML=work.map(chainRow).join('');$('chainAdd').disabled=$('chainPlus').disabled=work.length>=8};
 const pos=id=>work.findIndex(m=>m.id===id);
 render();
 box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='chainPlus'){const tipo=$('chainAdd').value,m={id:uid(),tipo,params:Object.fromEntries(Object.entries(CHAIN_TYPES[tipo].params).map(([k,[,,df]])=>[k,df]))};work.push(m);apply();render();announce(`${CHAIN_TYPES[tipo].name} aggiunto alla catena: posizione ${work.length} di ${work.length}`);list.lastElementChild.querySelector('input')?.focus();return}
  const up=b.dataset.chup,dn=b.dataset.chdn,del=b.dataset.chdel;if(!up&&!dn&&!del)return;
  if(del){const i=pos(del),nm=CHAIN_TYPES[work[i].tipo].name;work.splice(i,1);apply();render();announce(`${nm} tolto dalla catena${work.length?`, restano ${work.length} moduli`:': ora è vuota'}`);return}
  const id=up||dn,i=pos(id),j=i+(up?-1:1);if(j<0||j>=work.length){toast(up?'È già il primo modulo':'È già l’ultimo modulo');return}
  [work[i],work[j]]=[work[j],work[i]];apply();render();announce(`${CHAIN_TYPES[work[j].tipo].name}: posizione ${j+1} di ${work.length}`)});
 box.addEventListener('input',e=>{const inp=e.target.closest('input');if(!inp?.id.startsWith('ch_'))return;const [,mid,key]=inp.id.split('_'),m=work.find(x=>x.id===mid);if(!m)return;const [lo,hi]=CHAIN_TYPES[m.tipo].params[key];m.params[key]=clamp(num(inp.value),lo,hi);apply()})}
// Suono della traccia: come i controlli rapidi di uno studio, pochi cursori chiari che si sentono subito. Qui
// stanno anche l'ingresso di registrazione e la catena dei componenti.
// Proprietà di una traccia MIDI: nome, colore, uscita (id e nome salvati, così si ritrova la porta anche se l'id
// cambia), canale e programma. Le proprietà audio (volume, effetti, ingresso) non c'entrano: il suono sta sul synth.
async function midiTrackSettings(t){await midiStart({quiet:true}).catch(()=>false);const outs=midiOutputs();
 const cur=outs.find(o=>o.id===t.midiOut?.id)||outs.find(o=>t.midiOut?.name&&o.name===t.midiOut.name)||null;
 const v=await modal('Traccia MIDI',`<p>Traccia MIDI «${esc(t.name)}»: le note suonano sul sintetizzatore collegato all’uscita scelta e non finiscono nel mix esportato.${outs.length?'':' Nessuna uscita MIDI trovata: collega un sintetizzatore o un’uscita virtuale.'}</p>`,
  [{id:'name',label:'Nome',value:t.name},{id:'color',label:'Colore',type:'select',value:t.color,options:TRACK_COLORS.map(([c,n])=>[c,n])},
   {id:'out',label:'Uscita MIDI',type:'select',value:cur?.id||'',options:[['','Prima uscita disponibile'],...outs.map(o=>[o.id,o.name||o.id])],hint:'La porta si ritrova per id e, se l’id cambia, per nome.'},
   {id:'ch',label:'Canale MIDI (1-16)',type:'number',value:t.midiCh},
   {id:'prog',label:'Programma del sintetizzatore (0-127; vuoto = nessun cambio)',type:'text',value:t.program==null?'':String(t.program)}],'Applica',
  {validate:v=>{const ch=num(v.ch),pr=String(v.prog).trim(),n=num(pr);
   return !(Number.isInteger(ch)&&ch>=1&&ch<=16)?{msg:'Canale: scrivi un numero intero da 1 a 16.',field:'ch'}:
    pr&&!(n>=0&&n<=127)?{msg:'Programma: vuoto oppure un numero da 0 a 127.',field:'prog'}:null}});
 if(!v)return;const out=outs.find(o=>o.id===v.out)||null;
 pCommit('Traccia MIDI',()=>{Object.assign(t,{name:v.name.trim().slice(0,80)||t.name,color:v.color,midiOut:out?{id:out.id,name:out.name||''}:null,midiCh:clamp(Math.round(num(v.ch)),1,16),program:String(v.prog).trim()===''?null:clamp(Math.round(num(v.prog)),0,127)})});
 renderArrange();focusLane(t.id);announce(`Traccia MIDI «${t.name}»: uscita ${out?out.name||out.id:'prima disponibile'}, canale ${t.midiCh}${t.program!=null?', programma '+t.program:''}`)}
async function trackSettings(t=selTrack()){if(!t){toast('Crea prima una traccia');return}if(t.kind==='midi')return midiTrackSettings(t);const orig={...t,chain:t.chain.map(m=>({...m,params:{...m.params}}))},live=(k,v)=>{t[k]=v;mixLive()};
 // Elenco degli ingressi per la registrazione: vale solo per le tracce audio, i bus non registrano.
 const inputs=t.kind!=='bus'?inputOptions(await recInputs().catch(()=>[])):null;
 // Copia di lavoro della catena: si applica alla traccia per l'anteprima e al commit entra nel progetto.
 const work=t.chain.map(m=>({...m,params:{...m.params}}));let finalChain=work.map(m=>({...m,params:{...m.params}}));
 const applyChain=()=>{t.chain=work.map(m=>({id:m.id,tipo:m.tipo,params:{...m.params}}));finalChain=t.chain.map(m=>({...m,params:{...m.params}}));mixLive()};
 const v=await modal('Suono della traccia',`<p>${t.kind==='bus'?'Bus':'Traccia'} «${esc(t.name)}». I cambiamenti si sentono subito se il brano sta suonando; Annulla li toglie.${t.autoOn?.vol?' Il volume segue l’automazione: il cursore qui sotto non conta finché resta accesa.':''}${t.autoOn?.pan?' Il bilanciamento segue l’automazione.':''}</p>`+chainBody(),[{id:'name',label:'Nome',value:t.name},{id:'color',label:'Colore',type:'select',value:t.color,options:TRACK_COLORS.map(([c,n])=>[c,n])},{id:'vol',label:'Volume',type:'range',min:-40,max:6,step:0.5,value:t.vol,fmt:fmtDb},{id:'pan',label:'Bilanciamento',type:'range',min:-100,max:100,step:5,value:Math.round(t.pan*100),fmt:v=>panWords(v/100)},{id:'low',label:'Bassi',type:'range',min:-12,max:12,step:0.5,value:t.low,fmt:fmtDb},{id:'high',label:'Alti',type:'range',min:-12,max:12,step:0.5,value:t.high,fmt:fmtDb},{id:'comp',label:'Compressione (voce più uniforme)',type:'range',min:0,max:100,step:5,value:t.comp,fmt:v=>v+'%'},{id:'reverb',label:'Riverbero (spazio intorno al suono)',type:'range',min:0,max:100,step:5,value:t.reverb,fmt:v=>v+'%'},{id:'duck',label:'Si abbassa quando parla la voce (dB)',type:'range',min:0,max:18,step:1,value:t.duck||0,fmt:v=>v?fmtDb(-v):'non si abbassa',hint:'Serve una traccia segnata come voce; l’abbassamento entra e esce da solo, anche nel mix esportato.'},{id:'voice',label:'È la traccia della voce',type:'checkbox',value:!!t.voice},...(inputs?[{id:'input',label:'Ingresso (registrando su questa traccia)',type:'select',value:t.input?.id||'',options:inputs,hint:'Quale microfono o ingresso usa la registrazione su questa traccia; si cambia anche nel dialogo di registrazione.'}]:[]),{id:'out',label:'Uscita',type:'select',value:t.out||'',options:[['','Master'],...P.tracks.filter(x=>x.kind==='bus'&&x.id!==t.id&&!pathOf(x).some(y=>y.id===t.id)).map(x=>[x.id,x.name])],hint:'Un bus raccoglie più tracce: il suo volume, il compressore e il riverbero valgono per tutte.'}],'Applica',
  {buttons:[{label:'Ascolta',run:()=>{if(!MIX.playing)songPlayPause()}}],onOpen:pane=>{for(const k of ['vol','pan','low','high','comp','reverb','duck'])pane.querySelector('#dlg_'+k).addEventListener('input',e=>live(k,k==='pan'?Number(e.target.value)/100:Number(e.target.value)));wireChain(work,applyChain)},onClose:()=>{Object.assign(t,orig);mixLive()}});
 if(!v)return;const changedDuck=Number(v.duck)!==orig.duck||!!v.voice!==!!orig.voice;pCommit('Suono della traccia',()=>{Object.assign(t,{name:v.name.trim().slice(0,80)||t.name,color:v.color,vol:Number(v.vol),pan:Number(v.pan)/100,low:Number(v.low),high:Number(v.high),comp:Number(v.comp),reverb:Number(v.reverb),duck:Number(v.duck)||0,out:v.out||null,chain:finalChain.map(m=>({id:m.id,tipo:m.tipo,params:{...m.params}})),...(v.input!==undefined?{input:v.input?{id:v.input,label:inputs.find(x=>x[0]===v.input)?.[1]||''}:null}:{})});if(v.voice)for(const x of P.tracks){x.voice=x.id===t.id;if(x.voice)x.duck=0}else t.voice=false},{live:true});if(changedDuck&&MIX.playing)mixRestart();renderArrange();focusLane(t.id);announce(`Suono della traccia aggiornato${v.input!==undefined?`. Ingresso: ${v.input?inputs.find(x=>x[0]===v.input)?.[1]||'scelto':'predefinito (di sistema)'}`:''}`)}
async function tempoSettings(){const v=await modal('Tempo e griglia',`<p>Con la griglia a battute regioni e indicatore si muovono di un tempo alla volta e si agganciano alle battute. La latenza compensa il ritardo tra quello che senti e quello che registri: lasciala automatica, oppure aumentala se le registrazioni risultano in ritardo.</p>`,[{id:'bpm',label:'Tempo in battiti al minuto (BPM)',type:'number',value:P.bpm},{id:'sig',label:'Tempi per battuta',type:'select',value:String(P.sig),options:[2,3,4,5,6,7].map(n=>[String(n),n+'/4'])},{id:'grid',label:'Griglia',type:'select',value:P.grid,options:[['time','Secondi'],['beats','Battute e tempi']]},{id:'metro',label:'Metronomo durante l’ascolto e la registrazione',type:'checkbox',value:P.metro},{id:'countIn',label:'Una battuta di conteggio prima di registrare',type:'checkbox',value:P.countIn},{id:'lat',label:'Compensazione della latenza in millisecondi',type:'text',value:P.latency==='auto'?'automatica':String(P.latency),hint:'Scrivi «automatica» oppure un numero da 0 a 1000, per esempio 40.'}],'Salva',{validate:v=>{const b=num(v.bpm),l=v.lat.trim(),n=num(l);return !(b>=30&&b<=300)?{msg:'Tempo in battiti al minuto: scrivi un numero da 30 a 300.',field:'bpm'}:l&&!/^auto/i.test(l)&&!(n>=0&&n<=1000)?{msg:'Compensazione della latenza: scrivi «automatica» oppure un numero da 0 a 1000.',field:'lat'}:null}});
 if(!v)return;P.metro=v.metro;P.countIn=v.countIn;P.latency=/^auto/i.test(v.lat.trim())||!v.lat.trim()?'auto':clamp(num(v.lat)||0,0,1000);pCommit('Tempo e griglia',()=>{P.bpm=num(v.bpm);P.sig=Number(v.sig);P.grid=v.grid});renderArrange();schedulePersist('audio');announce(`Tempo ${fmtNum(P.bpm,0)} BPM, ${P.sig}/4, griglia ${P.grid==='beats'?'a battute':'in secondi'}${P.metro?', metronomo attivo':''}`)}
function readSongStatus(){if(!P.tracks.length){toast('Il progetto è vuoto. Ctrl+Alt+R registra, Ctrl+I importa un file audio in una nuova traccia.');return}const t=MIX.playing?mixPos():P.t,tr=selTrack(),r=selRegion(),punch=P.punch?.on?` Punch da ${sayTime(P.punch.a,1)} a ${sayTime(P.punch.b,1)}.`:'';
 toast(`${jobNow()}${MIX.playing?'In ascolto a':'Indicatore a'} ${arPlayheadText(t)}. Brano di ${sayTime(projDur())}, ${P.tracks.length} tracce, ${fmtNum(P.bpm,0)} BPM. ${tr?`Traccia scelta «${tr.name}»: volume ${fmtDb(tr.vol)}, ${panWords(tr.pan)}${tr.mute?', muta':''}${tr.solo?', in solo':''}.`:''} ${r?`Regione scelta «${r.name}» da ${sayTime(r.start)} a ${sayTime(regionEnd(r))}.`:''}${A.region?` Nell’editor: «${regionOf(A.region)?.name||''}».`:''}`)}
function arZoomToSlider(){return Math.round(100*Math.log(P.pxs)/Math.log(2000))}
function sliderToArZoom(v){P.pxs=Math.pow(2000,v/100);renderArrange();ensureArVisible(P.t)}

// ——— Adatta alla durata e incrocio. Sono le due operazioni che servono quando un pezzo deve entrare in uno spazio
// preciso e passare al successivo senza stacchi: il ritmo cambia senza cambiare l'intonazione, la fine di una
// regione sfuma mentre l'altra entra.
async function fitDurationDialog(){const inEd=!!A.buf&&(inEditorArea()||!selRegion()),r=inEd?null:selRegion();
 if(!inEd&&!r){toast('Apri una regione nell’editor oppure scegline una nelle tracce');return}
 const cur=inEd?(hasSel()?sec(A.selB-A.selA):adur()):r.dur;
 const res=await modal('Adatta alla durata',`<p>${inEd?(hasSel()?'La selezione':'La regione nell’editor'):`La regione «${esc(r.name)}»`} dura ${sayTime(cur,2)}. Il ritmo cambia senza cambiare l’intonazione, così il pezzo entra esattamente nello spazio che hai.</p>`,
  [{id:'dur',label:'Durata da raggiungere',type:'time',value:fmtTime(cur,2),hint:'In secondi, oppure minuti:secondi; per esempio 2:30.'}],'Adatta',
  {validate:v=>{const t=parseTime(v.dur);return t>=0.2&&t<=3600?null:{msg:'Durata: scrivi un tempo tra 0,2 secondi e un’ora.',field:'dur'}}});
 if(!res)return;const target=parseTime(res.dur);if(Math.abs(target-cur)<0.005){toast('La durata è già quella');return}
 if(inEd){const [a,b]=hasSel()?[A.selA,A.selB]:[0,alen()],f=cur/target,out=await work('Adattamento della durata',()=>wsola(sliceCh(A.buf,a,b),A.rate,f));if(!out)return;
  audioEdit('Adatta alla durata',a,b,out,{mapPos:x=>Math.round(x/f),sel:[a,a+out[0].length],cursor:a});
  announce(`Da ${sayTime(cur)} a ${sayTime(target)}: ritmo al ${fmtNum(100/f,0)} per cento`);return}
 const f=r.dur/target;
 const out=await work('Adattamento della durata',()=>{const src=SOURCES.get(r.src);if(!src)throw Error('L’audio di questa regione non è disponibile');
  const a=Math.round(r.off*src.sampleRate),b=Math.min(src.length,a+Math.round(r.dur*src.sampleRate)),buf=makeBuffer(wsola(sliceCh(src,a,b),src.sampleRate,f),src.sampleRate);return buf});
 if(!out)return;
 pCommit('Adatta la regione alla durata',()=>{const id=addSource(out);r.src=id;r.off=0;r.dur=out.duration;r.markers=(r.markers||[]).map(m=>({...m,pos:Math.round(m.pos/f)})).filter(m=>m.pos<=out.length)});
 announce(`Regione «${r.name}» da ${sayTime(cur)} a ${sayTime(out.duration)}: ritmo al ${fmtNum(100/f,0)} per cento`)}
// Incrocio: la regione scelta sfuma in uscita mentre quella che segue entra, sovrapposte per la durata scelta.
async function crossfadeNext(){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}if(!regionAvailable(r))return;
 const next=regionsOn(r.track).find(x=>x.id!==r.id&&x.start>=regionEnd(r)-0.02);
 if(!next){toast('Dopo questa regione, sulla stessa traccia, non ce n’è un’altra');return}
 const gap=next.start-regionEnd(r),maxD=Math.min(r.dur,next.dur)/2;
 if(maxD<0.02){toast('Le regioni sono troppo corte per incrociarle');return}
 const def=Math.min(0.5,maxD);
 const res=await modal('Incrocia con la regione successiva',`<p>«${esc(r.name)}» e «${esc(next.name)}» si sovrappongono per la durata dell’incrocio: la prima sfuma mentre la seconda entra.${gap>0.02?` La seconda regione si sposta indietro di ${sayTime(gap+def)} e si sovrappone alla prima.`:''}</p>`,
  [{id:'dur',label:'Durata dell’incrocio',type:'time',value:fmtTime(def,2),hint:`Al massimo ${fmtTime(maxD,2)}: metà della regione più corta.`}],'Incrocia',
  {validate:v=>{const d=parseTime(v.dur);return d>=0.01&&d<=maxD?null:{msg:`Durata dell’incrocio: scrivi un tempo tra 0,01 e ${fmtTime(maxD,2)}.`,field:'dur'}}});
 if(!res)return;const d=parseTime(res.dur),end=regionEnd(r);
 pCommit('Incrocia due regioni',()=>{r.fadeOut=d;next.fadeIn=d;next.start=Math.max(0,end-d)});
 announce(`Incrocio di ${sayTime(d)} tra «${r.name}» e «${next.name}»`)}

// ——— Automazione di volume e bilanciamento: punti nel tempo, modificabili da una tabella. Con l'automazione accesa
// i valori del cursore non contano: li dà la curva, e muto e solo restano.
// Parametri che si possono automatizzare: nome, intervallo, unità e valore attuale dei cursori. La stessa tabella
// serve alla finestra, alla descrizione del brano e ai comandi rapidi.
const AUTO_UI={vol:['Volume',-60,12,'dB'],pan:['Bilanciamento',-100,100,'%'],reverb:['Riverbero',0,100,'%'],low:['Bassi',-15,15,'dB'],high:['Alti',-15,15,'dB'],comp:['Compressione',0,100,'%']};
const autoManual=(t,k)=>k==='vol'?t.vol:k==='pan'?Math.round(t.pan*100):k==='reverb'?t.reverb:k==='low'?t.low:k==='high'?t.high:t.comp;
const autoShow=(k,v)=>k==='vol'||k==='low'||k==='high'?fmtDb(v):k==='pan'?panWords(v):fmtNum(v,0)+'%';
function autoTable(kind,list){const label=AUTO_UI[kind][0];
 const rows=list.length?list.map((p,i)=>`<tr><th scope="row">${esc(fmtTime(p.t,2))}</th><td>${esc(autoShow(kind,p.v))}</td><td><button type="button" class="btn sm" data-del="${i}" aria-label="Togli il punto a ${esc(fmtTime(p.t,2))}">Togli</button></td></tr>`).join(''):'<tr><td colspan="3">Nessun punto.</td></tr>';
 return `<table><caption>Punti: ${esc(label.toLowerCase())}</caption><thead><tr><th scope="col">Tempo</th><th scope="col">Valore</th><th scope="col">Togli</th></tr></thead><tbody>${rows}</tbody></table>`}
// Un bus è una traccia senza regioni: raccoglie le tracce che lo scelgono come uscita, con un volume, un
// compressore e un riverbero soli.
function newBus(){const n=P.tracks.filter(t=>t.kind==='bus').length+1,tr=newTrack('Bus '+n);tr.kind='bus';
 pCommit('Nuovo bus',()=>{P.tracks.push(tr);P.track=tr.id});renderArrange();focusLane(tr.id);announce(`Bus «${tr.name}» creato. Scegli la sua uscita nelle proprietà delle tracce da raggruppare`)}
async function autoEditDialog(){const t=selTrack();if(!t){toast('Crea prima una traccia');return}
 const draft=Object.fromEntries(Object.keys(AUTO_UI).map(k=>[k,(t.auto?.[k]||[]).map(p=>({...p}))]));
 let param='vol';
 const render=()=>{const box=$('autoList');if(box)box.innerHTML=autoTable(param,draft[param])};
 const sync=()=>{const el=$('dlg_value');if(!el)return;const [,lo,hi]=AUTO_UI[param],last=draft[param].at(-1);
  el.min=String(lo);el.max=String(hi);el.step=param==='pan'?String(5):String(param==='vol'||param==='low'||param==='high'?0.5:1);
  el.value=String(last?(param==='pan'?last.v*100:last.v):autoManual(t,param))};
 const put=()=>{const time=parseTime($('dlg_time').value);if(!(time>=0)){toast('Tempo del punto non valido');return}
  const raw=num($('dlg_value').value);if(!Number.isFinite(raw)){toast('Valore del punto non valido');return}
  const [,lo,hi]=AUTO_UI[param],v=param==='pan'?clamp(raw/100,-1,1):clamp(raw,lo,hi),list=draft[param],at=list.findIndex(p=>Math.abs(p.t-time)<0.001),p={t:clamp(time,0,86400),v};
  if(at>=0)list[at]=p;else list.push(p);list.sort((a,b)=>a.t-b.t);render();
  announce(`Punto di ${AUTO_UI[param][0].toLowerCase()} a ${sayTime(time,2)}: ${autoShow(param,v)}`)};
 const res=await modal('Automazione della traccia',`<p id="autoIntro">Traccia «${esc(t.name)}». I punti valgono dall’inizio del brano e fra un punto e il successivo il valore cambia in linea retta (in decibel per volume, bassi e alti). Un punto allo stesso tempo sostituisce quello che c’è; con l’automazione accesa il cursore del parametro non conta.</p><div id="autoList"></div>`,
  [{id:'onVol',label:'Il volume segue l’automazione',type:'checkbox',value:!!t.autoOn?.vol},
   {id:'onPan',label:'Il bilanciamento segue l’automazione',type:'checkbox',value:!!t.autoOn?.pan},
   {id:'onReverb',label:'Il riverbero segue l’automazione',type:'checkbox',value:!!t.autoOn?.reverb},
   {id:'onLow',label:'I bassi seguono l’automazione',type:'checkbox',value:!!t.autoOn?.low},
   {id:'onHigh',label:'Gli alti seguono l’automazione',type:'checkbox',value:!!t.autoOn?.high},
   {id:'onComp',label:'La compressione segue l’automazione',type:'checkbox',value:!!t.autoOn?.comp},
   {id:'param',label:'Parametro da modificare',type:'select',value:'vol',options:Object.entries(AUTO_UI).map(([k,[l]])=>[k,l])},
   {id:'time',label:'Tempo del punto',type:'time',value:fmtTime(P.t,2)},
   {id:'value',label:'Valore del punto',type:'number',value:autoManual(t,'vol'),hint:'Nell’unità del parametro: decibel, percento oppure da sinistra (−100) a destra (100).'}],'Salva',
  {wide:true,buttons:[{label:'Aggiungi il punto',run:put}],
   onOpen:pane=>{render();sync();
    pane.querySelector('#dlg_param').addEventListener('change',e=>{param=e.target.value;render();sync();announce(`Parametro: ${AUTO_UI[param][0].toLowerCase()}`)});
    pane.addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;draft[param].splice(Number(b.dataset.del),1);render();announce('Punto tolto')})}});
 if(!res)return;
 const norm=(list,lo,hi)=>list.filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v)).map(p=>({t:clamp(p.t,0,86400),v:clamp(p.v,lo,hi)})).sort((a,b)=>a.t-b.t).slice(0,500);
 pCommit('Automazione della traccia',()=>{const out={};for(const k of Object.keys(AUTO_UI)){const [,lo,hi]=AUTO_UI[k],range=k==='pan'?[-1,1]:[lo,hi];out[k]=norm(draft[k],range[0],range[1])}
  t.auto=out;t.autoOn={vol:!!res.onVol,pan:!!res.onPan,reverb:!!res.onReverb,low:!!res.onLow,high:!!res.onHigh,comp:!!res.onComp};
  for(const k of Object.keys(AUTO_UI))if(t.autoOn[k]&&!out[k].length){const v=k==='pan'?autoManual(t,k)/100:autoManual(t,k);out[k]=[{t:0,v},{t:Math.max(projDur(),1),v}]}});
 const conta=k=>`${t.auto[k].length===1?'un punto':t.auto[k].length+' punti'} di ${AUTO_UI[k][0].toLowerCase()}`;
 announce('Automazione: '+Object.keys(AUTO_UI).filter(k=>t.autoOn[k]).map(conta).join(', '))}
function autoAddPoint(k){const t=selTrack();if(!t){toast('Crea prima una traccia');return}
 const at=clamp(MIX.playing?mixPos():P.t,0,86400),cur=autoValueAt(t.auto?.[k],at)??(k==='pan'?autoManual(t,k)/100:autoManual(t,k));
 pCommit('Punto di '+AUTO_UI[k][0].toLowerCase(),()=>{t.auto??={};const list=t.auto[k]=t.auto[k]||[],i=list.findIndex(p=>Math.abs(p.t-at)<0.001),p={t:at,v:cur};if(i>=0)list[i]=p;else list.push(p);list.sort((a,b)=>a.t-b.t);t.autoOn={...(t.autoOn||{}),[k]:true}});
 announce(`Punto di ${AUTO_UI[k][0].toLowerCase()} a ${sayTime(at,2)}: ${autoShow(k,cur)}`)}
function autoToggle(k){const t=selTrack();if(!t){toast('Crea prima una traccia');return}
 const on=!t.autoOn?.[k],label=AUTO_UI[k][0].toLowerCase();
 pCommit('Automazione del '+label,()=>{t.autoOn={...(t.autoOn||{}),[k]:on};
  if(!t.auto?.[k]?.length){const v=k==='pan'?autoManual(t,k)/100:autoManual(t,k);t.auto={...(t.auto||{}),[k]:[{t:0,v},{t:Math.max(projDur(),1),v}]}}});
 announce(`${AUTO_UI[k][0]} ${on?'automatico':'di nuovo manuale'} sulla traccia «${t.name}»`)}
async function autoClear(){const t=selTrack();if(!t){toast('Crea prima una traccia');return}
 if(!Object.keys(AUTO_UI).some(k=>t.auto?.[k]?.length)){toast('Questa traccia non ha automazione');return}
 if(!(await confirmAction(`Togliere tutti i punti di automazione della traccia «${t.name}»?`,'Togli')))return;
 pCommit('Togli l’automazione',()=>{t.auto=Object.fromEntries(Object.keys(AUTO_UI).map(k=>[k,[]]));t.autoOn={vol:false,pan:false,reverb:false,low:false,high:false,comp:false}});announce('Automazione tolta')}
// ——— Take di una regione: più registrazioni dello stesso passaggio, con un nome e una nota, una attiva alla volta.
function ensureTakes(r){if(!r.takes?.length)r.takes=[{id:uid(),src:r.src,off:r.off,dur:r.dur,name:'Take 1',note:''}]}
function activateTake(r,t){r.src=t.src;r.off=t.off;r.dur=t.dur}
function addTakeToRegion(r,buf){if(!buf?.length||!buf.duration)return null;ensureTakes(r);const n=r.takes.length+1,t={id:uid(),src:addSource(buf),off:0,dur:buf.duration,name:`Take ${n}, ${fmtTime(buf.duration)}, ${new Date().toLocaleDateString('it-IT')}`,note:''};
 r.takes.push(t);activateTake(r,t);return t}
function previewTake(r,take){const src=SOURCES.get(take?.src);if(!src){toast('Questa take non è disponibile');return}
 stopPlayback(false);stopPreview();const ctx=actxGet(),a=Math.round(take.off*src.sampleRate),len=Math.min(Math.round(take.dur*src.sampleRate),Math.round(6*src.sampleRate)),
  buf=makeBuffer(Array.from({length:src.numberOfChannels},(_,c)=>src.getChannelData(c).slice(a,a+len)),src.sampleRate);
 const s=ctx.createBufferSource();s.buffer=buf;s.connect(audioOut());s.start();previewSrc=s;announce(`Ascolto della take «${take.name}»: ${sayTime(buf.duration)}`)}
async function takesDialog(){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}if(!regionAvailable(r))return;
 const list=r.takes?.length?r.takes:[{id:'tmp',src:r.src,off:r.off,dur:r.dur,name:'Take 1',note:''}],
  active=Math.max(0,list.findIndex(t=>t.src===r.src&&Math.abs(t.off-r.off)<1e-6));
 const rows=list.map((t,i)=>`<tr><th scope="row">${i+1}</th><td>${esc(t.name)}</td><td>${esc(fmtTime(t.dur))}</td><td>${esc(t.note||'—')}</td><td>${i===active?'attiva':''}</td></tr>`).join('');
 const res=await modal('Take della regione',`<p>Regione «${esc(r.name)}». La take scelta diventa quella che si sente e la regione prende la sua durata; le take restano tutte finché non le togli.</p><table><caption>Take della regione</caption><thead><tr><th scope="col">#</th><th scope="col">Nome</th><th scope="col">Durata</th><th scope="col">Nota</th><th scope="col">Stato</th></tr></thead><tbody>${rows}</tbody></table>`,
  [{id:'take',label:'Take',type:'select',value:String(active),options:list.map((t,i)=>[String(i),`${i+1}. ${t.name}${t.note?' — '+t.note:''}`])},
   {id:'name',label:'Nome della take',value:list[active].name},
   {id:'note',label:'Nota (facoltativa)',value:list[active].note||'',hint:'Per esempio «buona», «tosse», «da rifare».'},
   {id:'only',label:'Tieni solo questa take',type:'checkbox',value:false}],
  'Salva',{wide:true,buttons:[{label:'Ascolta',run:v=>previewTake(r,list[Number(v.take)])}],onClose:stopPreview});
 if(!res)return;const chosen=list[Number(res.take)];
 pCommit('Take della regione',()=>{ensureTakes(r);if(res.only)r.takes=[chosen];chosen.name=res.name.trim().slice(0,120)||chosen.name;chosen.note=res.note.trim().slice(0,200);activateTake(r,chosen)});
 announce(`Take «${chosen.name}» attiva, ${r.takes.length===1?'unica take':r.takes.length+' take'} nella regione`)}
function takeStep(dir){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}
 if((r.takes?.length||0)<2){pCommit('Take della regione',()=>{ensureTakes(r)});toast('Questa regione ha una sola take');return}
 const i=Math.max(0,r.takes.findIndex(t=>t.src===r.src&&Math.abs(t.off-r.off)<1e-6)),j=(i+dir+r.takes.length)%r.takes.length,t=r.takes[j];
 pCommit('Cambia take',()=>activateTake(r,t));announce(`Take ${j+1} di ${r.takes.length}: ${t.name}${t.note?', '+t.note:''}`)}
async function takeDelete(){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}
 const list=r.takes||[];if(list.length<2){toast('Deve restare almeno una take');return}
 const res=await modal('Togli una take',`<p>La take tolta sparisce dalla regione; le altre restano.</p>`,
  [{id:'take',label:'Take da togliere',type:'select',value:'0',options:list.map((t,i)=>[String(i),`${i+1}. ${t.name}${t.note?' — '+t.note:''}`])}],'Togli');
 if(!res)return;const i=Number(res.take),removed=list[i];
 pCommit('Togli la take',()=>{r.takes.splice(i,1);r.comp=(r.comp||[]).filter(c=>c.take!==removed.id);if(removed.src===r.src)activateTake(r,r.takes[Math.min(i,r.takes.length-1)])});
 announce(`Take «${removed.name}» tolta; ${r.takes.length===1?'resta una take':r.takes.length+' take'}`)}

// ——— Comping: la regione suona la take attiva, tranne nelle sezioni che ne scelgono un'altra. Le sezioni non
// distruggono niente: si tolgono e l'audio torna com'era.
async function compDialog(){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}if(!regionAvailable(r))return;
 if(!r.takes?.length)pCommit('Take della regione',()=>ensureTakes(r));
 const list=r.takes.map(t=>({...t})),end=r.start+r.dur;
 let draft=(r.comp||[]).map(c=>({...c}));
 const nameOf=id=>(list.find(t=>t.id===id)||{}).name||'—';
 const table=()=>`<table><caption>Sezioni di comping</caption><thead><tr><th scope="col">Da</th><th scope="col">A</th><th scope="col">Take</th><th scope="col">Togli</th></tr></thead><tbody>${draft.length?draft.map((c,i)=>`<tr><th scope="row">${esc(fmtTime(r.start+c.from,2))}</th><td>${esc(fmtTime(r.start+c.to,2))}</td><td>${esc(nameOf(c.take))}</td><td><button type="button" class="btn sm" data-del="${i}" aria-label="Togli la sezione da ${esc(fmtTime(r.start+c.from,2))}">Togli</button></td></tr>`).join(''):'<tr><td colspan="4">Nessuna sezione: suona la take attiva.</td></tr>'}</tbody></table>`;
 const render=()=>{const box=$('compList');if(box)box.innerHTML=table()};
 const add=(from,to,take)=>{const a=Math.max(0,from-r.start),b=Math.min(r.dur,to-r.start);if(!(b>a)){toast('La sezione è fuori dalla regione o è vuota');return}
  const out=[];for(const c of draft){if(c.to<=a||c.from>=b){out.push(c);continue}if(c.from<a)out.push({from:c.from,to:a,take:c.take});if(c.to>b)out.push({from:b,to:c.to,take:c.take})}
  out.push({from:a,to:b,take});draft=out.sort((x,y)=>x.from-y.from);render();announce(`Sezione da ${sayTime(from,2)} a ${sayTime(to,2)} con la take «${nameOf(take)}»`)};
 const res=await modal('Comping della regione',`<p>Regione «${esc(r.name)}», da ${esc(fmtTime(r.start,2))} a ${esc(fmtTime(end,2))}. Dove non c’è una sezione suona la take attiva; le sezioni si sovrappongono a quelle che c’erano. Nell’editor si sente la take attiva: il comping vale nel brano e nell’esportazione.</p><div id="compList"></div>`,
  [{id:'from',label:'Da',type:'time',value:fmtTime(P.t>r.start&&P.t<end?P.t:r.start,2)},
   {id:'to',label:'A',type:'time',value:fmtTime(Math.min(end,Math.max(P.t,r.start)+1),2)},
   {id:'take',label:'Take',type:'select',value:list.find(t=>t.src===r.src)?.id||list[0].id,options:list.map(t=>[t.id,`${t.name}${t.note?' — '+t.note:''}`])}],
  'Salva',{wide:true,buttons:[{label:'Aggiungi la sezione',run:v=>{const a=parseTime(v.from),b=parseTime(v.to);if(!(a>=0&&b>a)){toast('Da e A: scrivi due tempi, con A dopo Da');return}add(a,b,v.take)}}],
   onOpen:pane=>{render();pane.addEventListener('click',e=>{const btn=e.target.closest('[data-del]');if(!btn)return;draft.splice(Number(btn.dataset.del),1);render();announce('Sezione tolta')})}});
 if(!res)return;
 pCommit('Comping',()=>{r.comp=draft.map(c=>({from:clamp(c.from,0,r.dur),to:clamp(c.to,0,r.dur),take:c.take})).filter(c=>c.to>c.from).sort((a,b)=>a.from-b.from)});
 announce(r.comp.length?`Comping: ${r.comp.length===1?'una sezione':r.comp.length+' sezioni'} su ${r.takes.length} take`:'Comping tolto: suona la take attiva')}

// ——— Punch: registrare solo fra due punti. La registrazione parte prima, così si sente l'attacco, e alla fine si
// tiene solo il tratto scelto; quello che c'era sotto viene diviso o accorciato, senza sovrapposizioni.
function punchPre(){return P.punch.pre==='bar'?barDur():(Number(P.punch.pre)||0)}
async function punchDialog(){const a0=P.punch.a||P.t,b0=Math.max(a0+0.5,P.punch.b>a0?P.punch.b:a0+2);
 const res=await modal('Punch',`<p>La registrazione parte prima del punto «Da» così senti l’attacco, ma entra solo il tratto fra «Da» e «A». Quello che c’era sotto viene accorciato o diviso: niente si sovrappone. Ferma la registrazione subito dopo «A».</p>`,
  [{id:'a',label:'Da',type:'time',value:fmtTime(a0,2)},{id:'b',label:'A',type:'time',value:fmtTime(b0,2)},
   {id:'pre',label:'Ascolta prima per',type:'select',value:String(P.punch.pre??2),options:[['0','Niente'],['1','1 secondo'],['2','2 secondi'],['3','3 secondi'],['5','5 secondi'],['bar','Una battuta']]},
   {id:'on',label:'Punch attivo',type:'checkbox',value:!!P.punch.on}],'Salva',
  {validate:v=>{const a=parseTime(v.a),b=parseTime(v.b);return a>=0&&b>a+0.05?null:{msg:'«A» deve venire dopo «Da», di almeno 0,05 secondi.',field:'b'}}});
 if(!res)return;const a=parseTime(res.a),b=parseTime(res.b);
 pCommit('Punch',()=>{P.punch={on:!!res.on,a,b,pre:res.pre==='bar'?'bar':Number(res.pre)}});
 announce(`Punch ${res.on?'attivo':'spento'}: da ${sayTime(a,2)} a ${sayTime(b,2)}${res.on?', con '+sayTime(punchPre())+' di ascolto prima':''}`)}
function punchToggle(){const a=P.punch.a||P.t,b=P.punch.b>P.punch.a?P.punch.b:P.t+2;
 pCommit('Punch',()=>{P.punch={...P.punch,on:!P.punch.on,a,b}});
 announce(P.punch.on?`Punch attivo da ${sayTime(P.punch.a,2)} a ${sayTime(P.punch.b,2)}`:'Punch spento')}
// Toglie da una traccia il tratto [a,b): le regioni che lo attraversano vengono accorciate o divise in due.
function trimRegionTo(r,at){const rate=SOURCES.get(r.src)?.sampleRate||48000,cut=Math.round((at-r.start)*rate);r.dur=Math.max(0.01,at-r.start);r.markers=(r.markers||[]).filter(m=>m.pos<=cut);if(r.gainAuto)r.gainAuto=r.gainAuto.filter(p=>p.t<=r.dur)}
function splitRegionAt(r,at){const e=regionEnd(r);if(at<=r.start+1e-6||at>=e-1e-6)return null;const rate=SOURCES.get(r.src)?.sampleRate||48000,cut=Math.round((at-r.start)*rate);
 const right={...r,id:uid(),start:at,off:r.off+(at-r.start),dur:e-at,gainAuto:(r.gainAuto||[]).map(p=>({...p,t:p.t-(at-r.start)})).filter(p=>p.t>=0),markers:(r.markers||[]).map(m=>({...m,pos:m.pos-cut})).filter(m=>m.pos>=0)};
 // Le note sono oggetti: una copia profonda, altrimenti le due metà di una regione MIDI condividerebbero l'elenco.
 if(r.kind==='midi')right.notes=(r.notes||[]).map(n=>({...n}));
 trimRegionTo(r,at);return right}
// Il tratto di registrazione che entra col punch: dal punto «Da» al punto «A», scartando l'ascolto prima.
function punchPart(buf,start,pu){const rate=buf.sampleRate,a0=Math.max(0,Math.round((pu.a-start)*rate)),b0=Math.min(buf.length,Math.round((pu.b-start)*rate));
 if(b0-a0<rate*0.02)return null;return{part:makeBuffer(sliceCh(buf,a0,b0),rate),at:pu.a}}
function clearRange(trackId,a,b){const out=[];for(const r of P.regions){if(r.track!==trackId){out.push(r);continue}const s=r.start,e=regionEnd(r);
 if(e<=a+1e-6||s>=b-1e-6){out.push(r);continue}
 if(s<a&&e>b){const right=splitRegionAt(r,b);if(right)out.push(right);trimRegionTo(r,a);out.push(r);continue}
 if(s<a){trimRegionTo(r,a);out.push(r);continue}
 if(e>b){const right=splitRegionAt(r,b);if(right)out.push(right);continue}}
 P.regions=out.filter(r=>r.dur>0.005)}

// ——— Guadagno della regione nel tempo: i punti sono relativi all'inizio della regione, ma nella finestra si
// scrivono e si leggono come tempi del brano, che è come li pensa chi lavora.
async function regionGainDialog(){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}
 let draft=(r.gainAuto||[]).map(p=>({...p}));
 const table=()=>`<table><caption>Punti del guadagno</caption><thead><tr><th scope="col">Tempo</th><th scope="col">Guadagno</th><th scope="col">Togli</th></tr></thead><tbody>${draft.length?draft.map((p,i)=>`<tr><th scope="row">${esc(fmtTime(r.start+p.t,2))}</th><td>${esc(fmtDb(p.v))}</td><td><button type="button" class="btn sm" data-del="${i}" aria-label="Togli il punto a ${esc(fmtTime(r.start+p.t,2))}">Togli</button></td></tr>`).join(''):'<tr><td colspan="3">Nessun punto.</td></tr>'}</tbody></table>`;
 const render=()=>{const box=$('rgList');if(box)box.innerHTML=table()};
 const put=()=>{const time=parseTime($('dlg_time').value);if(!(time>=0)){toast('Tempo del punto non valido');return}
  const rel=time-r.start;if(rel<-0.001||rel>r.dur+0.001){toast(`Il punto deve stare dentro la regione, da ${fmtTime(r.start,2)} a ${fmtTime(regionEnd(r),2)}`);return}
  const g=clamp(num($('dlg_gain').value),-60,24);if(!Number.isFinite(g)){toast('Guadagno non valido');return}
  const at=Math.max(0,Math.min(r.dur,rel)),i=draft.findIndex(p=>Math.abs(p.t-at)<0.001),p={t:at,v:g};if(i>=0)draft[i]=p;else draft.push(p);draft.sort((a,b)=>a.t-b.t);render();
  announce(`Punto di guadagno a ${sayTime(time,2)}: ${fmtDb(g)}`)};
 const res=await modal('Guadagno della regione',`<p>Regione «${esc(r.name)}», da ${esc(fmtTime(r.start,2))} a ${esc(fmtTime(regionEnd(r),2))}. Con l’automazione accesa i punti sostituiscono il guadagno della regione; fra un punto e il successivo il valore cambia in linea retta in decibel.</p><div id="rgList"></div>`,
  [{id:'on',label:'Il guadagno segue l’automazione',type:'checkbox',value:!!r.gainOn},
   {id:'time',label:'Tempo del punto nel brano',type:'time',value:fmtTime(P.t>=r.start&&P.t<=regionEnd(r)?P.t:r.start,2)},
   {id:'gain',label:'Guadagno del punto in dB',type:'number',min:-60,max:24,step:0.5,value:r.gain}],'Salva',
  {wide:true,buttons:[{label:'Aggiungi il punto',run:put}],
   onOpen:pane=>{render();pane.addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;draft.splice(Number(b.dataset.del),1);render();announce('Punto tolto')})}});
 if(!res)return;
 pCommit('Guadagno automatico della regione',()=>{const norm=draft.filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v)).map(p=>({t:clamp(p.t,0,r.dur),v:clamp(p.v,-60,24)})).sort((a,b)=>a.t-b.t).slice(0,500);
  r.gainAuto=norm;r.gainOn=!!res.on;if(r.gainOn&&!r.gainAuto.length)r.gainAuto=[{t:0,v:r.gain},{t:r.dur,v:r.gain}]});
 announce(r.gainOn?`Guadagno automatico: ${r.gainAuto.length===1?'un punto':r.gainAuto.length+' punti'}`:'Guadagno della regione di nuovo manuale')}
function regionGainPoint(){const r=selRegion();if(!r){toast('Scegli prima una regione nelle tracce');return}
 const at=MIX.playing?mixPos():P.t;if(at<r.start-0.001||at>regionEnd(r)+0.001){toast(`L’indicatore è fuori dalla regione: va da ${fmtTime(r.start,2)} a ${fmtTime(regionEnd(r),2)}`);return}
 const rel=clamp(at-r.start,0,r.dur),cur=autoValueAt(r.gainAuto,rel)??r.gain;
 pCommit('Punto di guadagno',()=>{const list=r.gainAuto=r.gainAuto||[],i=list.findIndex(p=>Math.abs(p.t-rel)<0.001),p={t:rel,v:cur};if(i>=0)list[i]=p;else list.push(p);list.sort((a,b)=>a.t-b.t);r.gainOn=true});
 announce(`Punto di guadagno a ${sayTime(at,2)}: ${fmtDb(cur)}`)}
// ——— Limitatore finale: il tetto nel tempo. Spento, resta quello di sempre (−1,5 dB).
async function limiterDialog(){let draft=(P.limiter?.ceil||[]).map(p=>({...p}));
 const table=()=>`<table><caption>Punti del tetto</caption><thead><tr><th scope="col">Tempo</th><th scope="col">Tetto</th><th scope="col">Togli</th></tr></thead><tbody>${draft.length?draft.map((p,i)=>`<tr><th scope="row">${esc(fmtTime(p.t,2))}</th><td>${esc(fmtDb(p.v))}</td><td><button type="button" class="btn sm" data-del="${i}" aria-label="Togli il punto a ${esc(fmtTime(p.t,2))}">Togli</button></td></tr>`).join(''):'<tr><td colspan="3">Nessun punto: il tetto è fisso a −1,5 dB.</td></tr>'}</tbody></table>`;
 const render=()=>{const box=$('limList');if(box)box.innerHTML=table()};
 const put=()=>{const time=parseTime($('dlg_time').value);if(!(time>=0)){toast('Tempo del punto non valido');return}
  const v=clamp(num($('dlg_ceil').value),-20,0);if(!Number.isFinite(v)){toast('Tetto non valido');return}
  const i=draft.findIndex(p=>Math.abs(p.t-time)<0.001),p={t:time,v};if(i>=0)draft[i]=p;else draft.push(p);draft.sort((a,b)=>a.t-b.t);render();
  announce(`Tetto a ${sayTime(time,2)}: ${fmtDb(v)}`)};
 const res=await modal('Limitatore finale',`<p>Il tetto del limitatore all’uscita del brano, nel tempo: serve a tenere i picchi più stretti o più larghi a seconda del momento. Spento, il tetto resta fisso a −1,5 dB.</p><div id="limList"></div>`,
  [{id:'on',label:'Il limitatore finale segue l’automazione',type:'checkbox',value:!!P.limiter?.on},
   {id:'time',label:'Tempo del punto',type:'time',value:fmtTime(P.t,2)},
   {id:'ceil',label:'Tetto del punto in dB',type:'number',min:-20,max:0,step:0.5,value:draft.at(-1)?.v??-1.5}],'Salva',
  {wide:true,buttons:[{label:'Aggiungi il punto',run:put}],
   onOpen:pane=>{render();pane.addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(!b)return;draft.splice(Number(b.dataset.del),1);render();announce('Punto tolto')})}});
 if(!res)return;
 pCommit('Limitatore finale',()=>{const norm=draft.filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.v)).map(p=>({t:clamp(p.t,0,86400),v:clamp(p.v,-20,0)})).sort((a,b)=>a.t-b.t).slice(0,500);
  P.limiter={on:!!res.on,ceil:norm};if(P.limiter.on&&!P.limiter.ceil.length)P.limiter.ceil=[{t:0,v:-1.5},{t:Math.max(projDur(),1),v:-1.5}]});
 announce(P.limiter.on?`Limitatore finale automatico: ${P.limiter.ceil.length===1?'un punto':P.limiter.ceil.length+' punti'}`:'Limitatore finale di nuovo fisso a −1,5 dB')}
function limiterToggle(){const on=!P.limiter?.on;pCommit('Limitatore finale',()=>{P.limiter={on,ceil:(P.limiter?.ceil||[]).length?P.limiter.ceil:[{t:0,v:-1.5},{t:Math.max(projDur(),1),v:-1.5}]}});announce(on?'Limitatore finale automatico':'Limitatore finale fisso a −1,5 dB')}
