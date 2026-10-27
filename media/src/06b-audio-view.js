// Vista dell'audio: forma d'onda con selezione, marcatori e cursore; righello dei tempi; panoramica del file.
// Chi usa lo screen reader legge la stessa informazione dalla forma d'onda, che è un cursore (slider) con
// posizione, selezione e marcatore descritti a parole.
const AV={start:0,spp:1,anchor:null,drag:null};
const waveEl=$('wave');
function waveWidth(){return Math.max(50,waveEl.clientWidth)}
const fitSpp=()=>Math.max(0.02,alen()/waveWidth());
const MIN_SPP=0.02;
function viewClamp(){const W=waveWidth(),L=alen();AV.spp=clamp(AV.spp||fitSpp(),MIN_SPP,Math.max(MIN_SPP,fitSpp()));AV.start=clamp(AV.start,0,Math.max(0,L-W*AV.spp))}
function zoomFitAudio(){AV.spp=fitSpp();AV.start=0;viewClamp();drawAudio();updateZoomUI()}
function zoomAudio(factor,center=aplay.playing?playPos():A.cursor){const W=waveWidth(),x=(center-AV.start)/AV.spp,rel=x>=0&&x<=W?x:W/2;AV.spp=AV.spp*factor;viewClamp();AV.start=center-rel*AV.spp;viewClamp();drawAudio();updateZoomUI();announce('Zoom: si vedono '+sayTime(W*AV.spp/A.rate))}
function zoomToSel(){if(!hasSel()){toast('Nessuna selezione');return}const W=waveWidth(),n=A.selB-A.selA;AV.spp=n/(W*0.9);viewClamp();AV.start=A.selA-n*0.05;viewClamp();drawAudio();updateZoomUI()}
function ensureVisible(pos){const W=waveWidth(),end=AV.start+W*AV.spp;if(pos<AV.start||pos>end){AV.start=pos-W*AV.spp*(pos<AV.start?0.8:0.2);viewClamp()}}
// Il cursore dello zoom va da tutto il file (0) a circa 50 pixel per campione (100), in scala logaritmica.
function zoomToSlider(){const f=fitSpp();return f<=MIN_SPP?100:Math.round(100*Math.log(f/AV.spp)/Math.log(f/MIN_SPP))}
// La barra di stato regola lo zoom delle tracce in Audio e della linea temporale in Video.
function updateZoomUI(){const s=$('zoomSlider');if(isAudio()){s.value=clamp(arZoomToSlider(),0,100);const vis=(arScroll.clientWidth-HEAD_W)/P.pxs;s.setAttribute('aria-valuetext','Tracce: si vedono '+sayTime(Math.max(0,vis)));$('zoomText').textContent=fmtTime(Math.max(0,vis),0)}else updateTimelineZoomUI()}
function sliderToZoom(v){const f=fitSpp();AV.spp=f*Math.pow(MIN_SPP/f,v/100);const c=aplay.playing?playPos():A.cursor;AV.start=c-waveWidth()*AV.spp/2;viewClamp();drawAudio();updateZoomUI()}
// Disegno: una corsia per canale, colonne con minimo e massimo e una banda più chiara con il volume medio.
function fitCanvas(cv){const r=cv.getBoundingClientRect(),dpr=devicePixelRatio||1,w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}const g=cv.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return{g,w:r.width,h:r.height}}
let drawPending=false;
function drawAudio(){if(drawPending)return;drawPending=true;requestAnimationFrame(()=>{drawPending=false;if(isAudio())drawAudioNow()})}
function columnStats(c,a,b){const pk=getPeaks();let lo=1e9,hi=-1e9,sq=0,n=0;const spp=b-a;
 if(spp<PEAK_BLOCK||!pk.levels.length){const d=A.buf.getChannelData(c),e=Math.min(d.length,Math.ceil(b));for(let i=Math.max(0,Math.floor(a));i<e;i++){const x=d[i];if(x<lo)lo=x;if(x>hi)hi=x;sq+=x*x;n++}return n?{lo,hi,rms:Math.sqrt(sq/n)}:null}
 let lv=pk.levels[0];for(const l of pk.levels)if(l.block<=spp)lv=l;return levelStats(lv,c,a,b)}
function drawAudioNow(){const {g,w,h}=fitCanvas($('waveCanvas')),P=palette;g.fillStyle=P['wave-bg'];g.fillRect(0,0,w,h);
 $('waveEmpty').hidden=!!A.buf;$('aOverviewBox').style.visibility=A.buf?'':'hidden';
 if(!A.buf){drawRuler();return}
 const nch=A.nch,lane=h/nch,xOf=pos=>(pos-AV.start)/AV.spp;
 if(hasSel()){const x0=Math.max(0,xOf(A.selA)),x1=Math.min(w,xOf(A.selB));if(x1>0&&x0<w){g.fillStyle=P['wave-sel'];g.fillRect(x0,0,Math.max(1,x1-x0),h)}}
 for(let c=0;c<nch;c++){const mid=lane*c+lane/2,amp=lane/2-3;g.fillStyle=P['wave-mid'];g.fillRect(0,Math.round(mid),w,1);if(c)g.fillRect(0,Math.round(lane*c),w,1);
  if(AV.spp<1){g.strokeStyle=P.wave;g.lineWidth=1.5;g.beginPath();const d=A.buf.getChannelData(c),i0=Math.max(0,Math.floor(AV.start)),i1=Math.min(d.length-1,Math.ceil(AV.start+w*AV.spp)+1);for(let i=i0;i<=i1;i++){const x=xOf(i),y=mid-d[i]*amp;i===i0?g.moveTo(x,y):g.lineTo(x,y)}g.stroke();if(AV.spp<0.2){g.fillStyle=P.wave;for(let i=i0;i<=i1;i++)g.fillRect(xOf(i)-2,mid-d[i]*amp-2,4,4)}continue}
  for(let x=0;x<w;x++){const a=AV.start+x*AV.spp;if(a>=alen())break;const s=columnStats(c,a,a+AV.spp);if(!s)continue;const y0=mid-s.hi*amp,y1=mid-s.lo*amp;g.fillStyle=P.wave;g.fillRect(x,y0,1,Math.max(1,y1-y0));const r=Math.min(s.rms,Math.max(Math.abs(s.hi),Math.abs(s.lo)));g.fillStyle=P['wave-rms'];g.fillRect(x,mid-r*amp,1,Math.max(1,2*r*amp));if(s.hi>=0.999||s.lo<=-0.999){g.fillStyle=P.playhead;g.fillRect(x,lane*c,1,4);g.fillRect(x,lane*(c+1)-4,1,4)}}}
 g.font='11px "Segoe UI",system-ui,sans-serif';g.textBaseline='top';
 for(const [i,m] of A.markers.entries()){const x=Math.round(xOf(m.pos))+0.5;if(x<-200||x>w+2)continue;g.fillStyle=P.marker;g.fillRect(x-0.5,0,2,h);const t=`${i+1}. ${m.label}`,tw=Math.min(180,g.measureText(t).width+8);g.fillRect(x,0,tw,15);g.fillStyle=P['wave-bg'];g.save();g.beginPath();g.rect(x,0,tw,15);g.clip();g.fillText(t,x+4,2);g.restore()}
 const cx=xOf(A.cursor);if(cx>=-1&&cx<=w+1){g.fillStyle=aplay.playing?P['text-3']:P.playhead;g.fillRect(Math.round(cx)-1,0,2,h)}
 saveLayer($('waveCanvas'),w,h);layerKey=viewKey();if(aplay.playing){const px=xOf(playPos());g.fillStyle=P.playhead;g.fillRect(Math.round(px)-1,0,2,h)}
 drawRuler();drawOverview()}
// Durante l'ascolto si muove solo l'indicatore: forma d'onda e panoramica restano in un'immagine, che a ogni fotogramma
// si copia aggiungendo l'indicatore. Si ridisegna tutto solo quando cambia la vista (zoom, scorrimento, modifiche).
const layers=new Map();let layerKey='';
const viewKey=()=>[A.version,AV.start,AV.spp,aplay.playing,$('waveCanvas').width,$('waveCanvas').height].join('|');
function saveLayer(cv,w,h){let l=layers.get(cv);if(!l){l=document.createElement('canvas');layers.set(cv,l)}if(l.width!==cv.width||l.height!==cv.height){l.width=cv.width;l.height=cv.height}l.cw=w;l.ch=h;const g=l.getContext('2d');g.clearRect(0,0,l.width,l.height);g.drawImage(cv,0,0)}
function restoreLayer(cv){const l=layers.get(cv);if(!l||l.width!==cv.width||l.height!==cv.height)return null;const g=cv.getContext('2d'),dpr=devicePixelRatio||1;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);g.drawImage(l,0,0);g.setTransform(dpr,0,0,dpr,0,0);return{g,w:l.cw,h:l.ch}}
function drawPlayheadOnly(pos){const a=restoreLayer($('waveCanvas')),o=restoreLayer($('aOverview'));if(!a||!o){drawAudioNow();return}
 a.g.fillStyle=palette.playhead;a.g.fillRect(Math.round((pos-AV.start)/AV.spp)-1,0,2,a.h);o.g.fillStyle=palette.playhead;o.g.fillRect(pos/alen()*o.w-1,0,2,o.h)}
function niceStep(pxPerSec,minPx=90){const steps=[0.001,0.002,0.005,0.01,0.02,0.05,0.1,0.2,0.5,1,2,5,10,15,30,60,120,300,600,900,1800,3600];return steps.find(s=>s*pxPerSec>=minPx)||7200}
function drawTicks(g,w,h,t0,pxPerSec,color){const step=niceStep(pxPerSec),dec=step<0.01?3:step<0.1?2:step<1?1:0,first=Math.ceil(t0/step)*step;g.fillStyle=color;g.strokeStyle=color;g.font='11px "Segoe UI",system-ui,sans-serif';g.textBaseline='top';
 for(let t=first;(t-t0)*pxPerSec<w;t+=step){const x=Math.round((t-t0)*pxPerSec)+0.5;g.fillRect(x-0.5,h-7,1,7);g.fillText(fmtTime(t,dec),x+3,2);const sub=step/5;for(let k=1;k<5;k++){const xs=Math.round((t-t0+k*sub)*pxPerSec)+0.5;if(xs<w)g.fillRect(xs-0.5,h-3,1,3)}}}
function drawRuler(){const {g,w,h}=fitCanvas($('aRuler'));g.clearRect(0,0,w,h);if(!A.buf)return;drawTicks(g,w,h,AV.start/A.rate,A.rate/AV.spp,palette.ruler)}
function drawOverview(){const {g,w,h}=fitCanvas($('aOverview')),P=palette;g.fillStyle=P['wave-bg'];g.fillRect(0,0,w,h);if(!A.buf)return;const L=alen(),lv=getPeaks().levels.at(-1),mid=h/2;g.fillStyle=P.wave;
 for(let x=0;x<w;x++){let hi=0;for(let c=0;c<A.nch;c++){const s=levelStats(lv,c,x/w*L,(x+1)/w*L);if(s)hi=Math.max(hi,s.hi,-s.lo)}g.fillRect(x,mid-hi*(mid-2),1,Math.max(1,2*hi*(mid-2)))}
 const vx=AV.start/L*w,vw=Math.max(3,waveWidth()*AV.spp/L*w);g.strokeStyle=P.accent;g.lineWidth=2;g.strokeRect(vx+1,1,vw-2,h-2);saveLayer($('aOverview'),w,h);g.fillStyle=P.playhead;g.fillRect((aplay.playing?playPos():A.cursor)/L*w-1,0,2,h)}
function drawMeter(cv,db){const {g,w,h}=fitCanvas(cv);g.clearRect(0,0,w,h);const f=v=>clamp((v+60)/60,0,1),x=f(db)*w;g.fillStyle='#1e7a46';g.fillRect(0,0,Math.min(x,f(-12)*w),h);if(x>f(-12)*w){g.fillStyle='#b38600';g.fillRect(f(-12)*w,0,Math.min(x,f(-3)*w)-f(-12)*w,h)}if(x>f(-3)*w){g.fillStyle='#c50f1f';g.fillRect(f(-3)*w,0,x-f(-3)*w,h)}g.fillStyle=palette['text-3'];for(const d of [-48,-36,-24,-12,-6,-3])g.fillRect(f(d)*w,h-4,1,4)}
const meterBuf=new Float32Array(2048);
function aTick(){if(!aplay.playing)return;const pos=playPos();if(prefs.follow){const W=waveWidth(),end=AV.start+W*AV.spp;if(pos>end||pos<AV.start){AV.start=pos-W*AV.spp*0.05;viewClamp()}}
 if(layerKey!==viewKey())drawAudioNow();else drawPlayheadOnly(pos);if(aplay.analyser){aplay.analyser.getFloatTimeDomainData(meterBuf);let pk=0;for(const x of meterBuf)pk=Math.max(pk,Math.abs(x));drawMeter($('aMeter'),toDb(pk))}aplay.raf=requestAnimationFrame(aTick)}
function playUI(on){const b=document.querySelector('#editorArea [data-action=playRegion]');if(b)b.textContent=on?'Pausa':'Ascolta la regione';if(!on)drawMeter($('aMeter'),-Infinity)}
// Testi per gli screen reader: posizione, selezione e marcatore sotto il cursore.
const timeDec=()=>prefs.step<0.1?2:1;
function waveValueText(){if(!A.buf)return 'Nessuna regione nell’editor: scegli una regione nelle tracce e premi Invio';let t=sayTime(sec(A.cursor),timeDec());const m=A.markers.findIndex(m=>Math.abs(m.pos-A.cursor)<=A.rate*0.005);if(m>=0)t+=`, marcatore ${m+1} «${A.markers[m].label}»`;if(hasSel())t+=`, selezionati ${sayTime(sec(A.selB-A.selA),timeDec())}`;return t}
function updateAudioUI(){if(!isAudio())return;const w=waveEl;w.setAttribute('aria-valuemax',Math.ceil(adur()));w.setAttribute('aria-valuenow',Math.round(sec(A.cursor)));w.setAttribute('aria-valuetext',waveValueText());
 for(const [id,val] of [['selCursor',A.cursor],['selStart',hasSel()?A.selA:null],['selEnd',hasSel()?A.selB:null]]){const el=$(id);if(document.activeElement!==el)el.value=val===null?'':fmtTime(sec(val))}
 $('selStart').placeholder=$('selEnd').placeholder='nessuna';$('selLen').textContent=hasSel()?fmtTime(sec(A.selB-A.selA)):'—';
 renderMarkers();updateZoomUI()}
// Spostamenti del cursore: senza Maiusc la selezione si chiude, con Maiusc si estende dal punto fermo (ancora).
function moveCursor(pos,extend=false,{listen=true,note=''}={}){if(!A.buf)return;pos=clamp(Math.round(pos),0,alen());
 if(extend){const anchor=hasSel()?(A.cursor===A.selA?A.selB:A.cursor===A.selB?A.selA:A.selA):A.cursor;A.selA=Math.min(anchor,pos);A.selB=Math.max(anchor,pos)}else{A.selA=A.selB=0}
 A.cursor=pos;ensureVisible(pos);drawAudio();updateAudioUI();schedulePersist('audio');if(listen)snippet(pos);if(note)announce(note)}
function setSelection(a,b,{announceIt=true}={}){a=clamp(Math.round(a),0,alen());b=clamp(Math.round(b),0,alen());if(b<a)[a,b]=[b,a];A.selA=a;A.selB=b;A.cursor=a;ensureVisible(a);audioMetaChanged();if(announceIt)announce(b>a?`Selezionati ${sayTime(sec(b-a),2)}, da ${sayTime(sec(a),2)} a ${sayTime(sec(b),2)}`:'Nessuna selezione')}
function jumpPause(dir,extend){if(!A.buf)return;const pts=pauseBoundaries(),cur=A.cursor,pt=dir>0?pts.find(p=>p.pos>cur+1):[...pts].reverse().find(p=>p.pos<cur-1);
 if(!pt){moveCursor(dir>0?alen():0,extend,{note:dir>0?'Nessun’altra pausa: fine del file':'Nessuna pausa prima: inizio del file'});return}
 const len=sayTime(sec(pt.p.b-pt.p.a),1);moveCursor(pt.pos,extend,{note:pt.kind==='start'?`Inizia una pausa di ${len}`:`Finisce una pausa di ${len}, riprende il suono`})}
function setSelEdge(end){const pos=Math.round(aplay.playing?playPos():A.cursor);if(!A.buf)return;let a=hasSel()?A.selA:pos,b=hasSel()?A.selB:pos;if(end){b=pos;if(b<a)a=b}else{a=pos;if(b<a)b=a;if(!hasSel())b=a}
 A.selA=a;A.selB=b;if(!aplay.playing)A.cursor=end?b:a;drawAudio();updateAudioUI();schedulePersist('audio');announce(`${end?'Fine':'Inizio'} selezione a ${sayTime(sec(pos),2)}${b>a?', selezionati '+sayTime(sec(b-a),2):''}`)}
waveEl.addEventListener('keydown',e=>{if(e.defaultPrevented)return;const k=e.key,shift=e.shiftKey,ctrl=e.ctrlKey||e.metaKey,plain=!ctrl&&!e.altKey;const step=Math.max(1,Math.round(prefs.step*A.rate)),pos=A.cursor;let handled=true;
 if((k==='ArrowLeft'||k==='ArrowRight')&&!e.altKey){const dir=k==='ArrowRight'?1:-1;if(aplay.playing&&!shift&&!ctrl){const p=clamp(playPos()+dir*5*A.rate,0,alen()-1);playRange(p,aplay.isLoop?aplay.to:alen(),{loop:aplay.isLoop,origin:aplay.origin});announce((dir>0?'Avanti':'Indietro')+' di 5 secondi')}else if(ctrl)jumpPause(dir,shift);else moveCursor(pos+dir*step,shift)}
 else if((k==='PageUp'||k==='PageDown')&&!e.altKey)moveCursor(pos+(k==='PageDown'?1:-1)*5*A.rate,shift);
 else if(k==='Home'&&!e.altKey)moveCursor(0,shift);else if(k==='End'&&!e.altKey)moveCursor(alen(),shift,{listen:false});
 else if(k===' '&&!ctrl&&!e.altKey){shift?runCommand('playSel'):runCommand('playPause')}
 else if(plain&&!shift&&/^[pd]$/i.test(k))runCommand(k.toLowerCase()==='p'?'playBefore':'playAfter');
 else if(plain&&/^[io]$/i.test(k))setSelEdge(k.toLowerCase()==='o');
 else if(plain&&/^m$/i.test(k))runCommand('markerAdd');
 else if(plain&&/^l$/i.test(k))runCommand('readLevel');
 else if(plain&&/^z$/i.test(k))zoomToSel();
 else if(plain&&(k==='+'||e.code==='NumpadAdd'))zoomAudio(0.5);else if(plain&&(k==='-'||e.code==='NumpadSubtract'))zoomAudio(2);else if(plain&&k==='0'){zoomFitAudio();announce('Si vede tutto il file')}
 else if(k==='Delete'||k==='Backspace'){if(!ctrl)runCommand('deleteSel')}
 else if(k==='Escape'){if(aplay.playing)audioStop();else if(hasSel()){A.selA=A.selB=0;audioMetaChanged();announce('Selezione tolta')}else handled=false}
 else if((k==='F10'&&shift)||k==='ContextMenu')waveMenu();
 else handled=false;
 if(handled){e.preventDefault();e.stopPropagation()}});
function waveMenu(x,y){const r=waveEl.getBoundingClientRect(),cx=x??clamp(r.left+(A.cursor-AV.start)/AV.spp,r.left+10,r.right-240),cy=y??r.top+30;openMenu([mi('cut'),mi('copy'),mi('paste'),mi('pasteMix'),mi('deleteSel'),mi('trim'),mi('silence'),'-',mi('markerAdd'),mi('selMarkers'),mi('selectAll'),'-',mi('fadeIn'),mi('fadeOut'),mi('normalize'),mi('amplify'),mi('captureNoise'),'-',mi('playSel'),mi('stats')],cx,cy,'Menu della forma d’onda')}
// Mouse e tocco: clic sposta il cursore, trascinare seleziona, Maiusc+clic estende, doppio clic seleziona la frase tra due pause.
const posAtX=clientX=>{const r=waveEl.getBoundingClientRect();return clamp(Math.round(AV.start+(clientX-r.left)*AV.spp),0,alen())};
waveEl.addEventListener('pointerdown',e=>{if(e.button!==0||!A.buf)return;waveEl.focus({preventScroll:true});const p=posAtX(e.clientX);
 if(aplay.playing){const loop=aplay.isLoop;playRange(p,loop?aplay.to:alen(),{loop:loop&&p<aplay.to,origin:p});A.cursor=p;return}
 if(e.shiftKey)moveCursor(p,true,{listen:false});else{A.selA=A.selB=0;A.cursor=p;AV.anchor=p;drawAudio();updateAudioUI()}
 AV.drag={anchor:e.shiftKey?(p===A.selA?A.selB:A.selA):p};waveEl.setPointerCapture(e.pointerId)});
waveEl.addEventListener('pointermove',e=>{if(!AV.drag)return;const p=posAtX(e.clientX),a=AV.drag.anchor;A.selA=Math.min(a,p);A.selB=Math.max(a,p);A.cursor=p===A.selA?A.selA:A.selB;const r=waveEl.getBoundingClientRect();if(e.clientX>r.right-8){AV.start+=AV.spp*12;viewClamp()}else if(e.clientX<r.left+8){AV.start-=AV.spp*12;viewClamp()}drawAudio();updateAudioUI()});
waveEl.addEventListener('pointerup',()=>{if(!AV.drag)return;AV.drag=null;if(hasSel()&&A.selB-A.selA<2){A.selA=A.selB=0}else if(hasSel())A.cursor=A.selA;audioMetaChanged()});
waveEl.addEventListener('dblclick',e=>{if(!A.buf)return;const p=posAtX(e.clientX),list=getPauses().list;let a=0,b=alen();for(const q of list){if(q.b<=p)a=Math.max(a,q.b);if(q.a>=p){b=Math.min(b,q.a);break}}setSelection(a,b)});
waveEl.addEventListener('contextmenu',e=>{e.preventDefault();waveMenu(e.clientX,e.clientY)});
waveEl.addEventListener('wheel',e=>{if(!A.buf)return;e.preventDefault();if(e.ctrlKey){zoomAudio(e.deltaY>0?1.25:0.8,posAtX(e.clientX))}else{AV.start+=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*AV.spp;viewClamp();drawAudio();updateZoomUI()}},{passive:false});
$('aOverviewBox').addEventListener('pointerdown',e=>{if(!A.buf)return;const move=ev=>{const r=$('aOverviewBox').getBoundingClientRect();AV.start=(ev.clientX-r.left)/r.width*alen()-waveWidth()*AV.spp/2;viewClamp();drawAudio()};move(e);const up=()=>{removeEventListener('pointermove',move);removeEventListener('pointerup',up)};addEventListener('pointermove',move);addEventListener('pointerup',up)});
$('aRuler').parentElement.addEventListener('pointerdown',e=>{if(!A.buf)return;moveCursor(posAtX(e.clientX),e.shiftKey,{listen:false});waveEl.focus({preventScroll:true})});
// Campi del tempo: si scrive un tempo e Invio lo applica; Esc torna alla forma d'onda.
function applyTimeField(el){const t=parseTime(el.value);if(el.value.trim()===''&&el.id!=='selCursor'){A.selA=A.selB=0;audioMetaChanged();return true}if(!Number.isFinite(t)||t<0){toast('Tempo non valido: scrivi per esempio 83,5 oppure 1:23,5');updateAudioUI();return false}
 const p=smp(t);if(el.id==='selCursor')moveCursor(p,false,{listen:false});else if(el.id==='selStart')setSelection(p,hasSel()?Math.max(p,A.selB):alen());else setSelection(hasSel()?Math.min(A.selA,p):0,p);return true}
for(const id of ['selCursor','selStart','selEnd']){const el=$(id);el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(applyTimeField(el))announce('Applicato')}else if(e.key==='Escape'){e.preventDefault();updateAudioUI();waveEl.focus()}});el.addEventListener('change',()=>applyTimeField(el));el.addEventListener('focus',()=>el.select())}
$('stepSel').addEventListener('change',e=>{prefs.step=Number(e.target.value);savePrefs();announce('Passo delle frecce: '+e.target.selectedOptions[0].text)});
$('aRate').addEventListener('change',e=>{aplay.rate=Number(e.target.value);if(aplay.playing){const p=playPos();playRange(p,aplay.isLoop?aplay.to:alen(),{loop:aplay.isLoop&&p<aplay.to,origin:aplay.origin})}announce('Velocità di ascolto '+e.target.selectedOptions[0].text)});
// Marcatori: elenco con il ruolo listbox; il marcatore attivo segue il cursore.
let markActive=null;
function renderMarkers(){const list=$('markList');$('markCount').textContent=A.markers.length?A.markers.length+'':'';if(!A.markers.length){list.innerHTML='<li class="lb-empty" role="option" aria-selected="false" aria-disabled="true" id="mk-none">Nessun marcatore. Ctrl+M ne aggiunge uno al cursore.</li>';list.setAttribute('aria-activedescendant','mk-none');return}
 if(!A.markers.some(m=>m.id===markActive))markActive=nearestMarker()?.id;list.innerHTML=A.markers.map((m,i)=>`<li class="lb-item${m.id===markActive?' active':''}" role="option" id="mk-${m.id}" data-id="${m.id}" aria-selected="${m.id===markActive}"><span class="t" aria-hidden="true">${fmtTime(sec(m.pos),1)}</span><span class="n">${i+1}. ${esc(m.label)}</span><span class="sr-only">, a ${esc(sayTime(sec(m.pos)))}</span></li>`).join('');list.setAttribute('aria-activedescendant','mk-'+markActive);$('mk-'+markActive)?.scrollIntoView({block:'nearest'})}
function markerAt(pos=A.cursor){const id=uid(),n=A.markers.length+1;metaEdit('Aggiungi marcatore',()=>{A.markers.push({id,pos:Math.round(pos),label:'Marcatore '+n});A.markers.sort((a,b)=>a.pos-b.pos)});markActive=id;renderMarkers();const i=A.markers.findIndex(m=>m.id===id);announce(`Marcatore ${i+1} aggiunto a ${sayTime(sec(pos),2)}. F2 nel riquadro dei marcatori per dargli un nome`)}
function markerStep(dir){if(!A.markers.length){toast('Nessun marcatore');return}const cur=aplay.playing?playPos():A.cursor,m=dir>0?A.markers.find(x=>x.pos>cur+1):[...A.markers].reverse().find(x=>x.pos<cur-1);if(!m){toast(dir>0?'Nessun marcatore dopo il cursore':'Nessun marcatore prima del cursore');return}if(aplay.playing){playRange(m.pos,alen(),{origin:m.pos})}markActive=m.id;moveCursor(m.pos,false,{listen:!aplay.playing});announce(`Marcatore ${A.markers.indexOf(m)+1} «${m.label}» a ${sayTime(sec(m.pos))}`)}
async function markerRename(m=A.markers.find(x=>x.id===markActive)||nearestMarker()){if(!m){toast('Nessun marcatore');return}const r=await modal('Rinomina il marcatore',`<p>Marcatore a ${esc(fmtTime(sec(m.pos)))}.</p>`,[{id:'name',label:'Nome',value:m.label},{id:'time',label:'Posizione',type:'time',value:fmtTime(sec(m.pos)),hint:'Per esempio 1:23,5'}],'Rinomina',{validate:v=>Number.isFinite(parseTime(v.time))?null:{msg:'Tempo non valido',field:'time'}});if(!r)return;metaEdit('Rinomina marcatore',()=>{m.label=r.name.trim()||m.label;m.pos=smp(parseTime(r.time));A.markers.sort((a,b)=>a.pos-b.pos)});announce('Marcatore rinominato «'+m.label+'»')}
function markerDelete(m=A.markers.find(x=>x.id===markActive)||nearestMarker()){if(!m){toast('Nessun marcatore');return}const i=A.markers.indexOf(m);metaEdit('Elimina marcatore',()=>{A.markers=A.markers.filter(x=>x!==m)});markActive=A.markers[Math.min(i,A.markers.length-1)]?.id;renderMarkers();announce('Marcatore «'+m.label+'» eliminato')}
function selBetweenMarkers(){if(!A.buf)return;const p=A.cursor,before=[...A.markers].reverse().find(m=>m.pos<=p),after=A.markers.find(m=>m.pos>p);setSelection(before?.pos??0,after?.pos??alen())}
$('markList').addEventListener('keydown',e=>{const list=A.markers,i=list.findIndex(m=>m.id===markActive);let j=null;
 if(e.key==='ArrowDown')j=Math.min(list.length-1,i+1);else if(e.key==='ArrowUp')j=Math.max(0,i-1);else if(e.key==='Home')j=0;else if(e.key==='End')j=list.length-1;
 if(j!==null&&list.length){e.preventDefault();markActive=list[j].id;renderMarkers();return}
 const m=list[i];if(!m)return;
 if(e.key==='Enter'){e.preventDefault();if(e.shiftKey){const next=list[i+1];setSelection(m.pos,next?next.pos:alen())}else{moveCursor(m.pos,false);announce('Cursore sul marcatore «'+m.label+'»')}}
 else if(e.key==='F2'){e.preventDefault();markerRename(m)}else if(e.key==='Delete'){e.preventDefault();markerDelete(m)}else if(e.key===' '){e.preventDefault();A.cursor=m.pos;audioPlayPause()}});
$('markList').addEventListener('click',e=>{const li=e.target.closest('[data-id]');if(!li)return;markActive=li.dataset.id;const m=A.markers.find(x=>x.id===markActive);renderMarkers();if(m)moveCursor(m.pos,false,{listen:false})});
$('markList').addEventListener('dblclick',e=>{const li=e.target.closest('[data-id]');if(li)markerRename(A.markers.find(x=>x.id===li.dataset.id))});
addEventListener('resize',relayout);
