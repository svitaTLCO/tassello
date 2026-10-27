// Anteprima: la foto inquadrata alla misura dello schermo, al massimo PREVIEW_MAX pixel sul lato lungo.
// Mentre si trascina un cursore basta un'anteprima rapida di PREVIEW_FAST pixel; quella piena arriva al rilascio.
// I pixel inquadrati restano in memoria finché non cambiano inquadratura o misura: le regolazioni ripartono da lì.
const PREVIEW_MAX=2048,PREVIEW_FAST=1024;
const photoCv=$('photo'),photoCtx=photoCv.getContext('2d');
const srcCache={full:{key:'',px:null},fast:{key:'',px:null}};
let outPx=null,renderQueued=false,renderFast=false;
function previewSize(fast){const [w,h]=outSize(I.r,I.bmp.width,I.bmp.height),st=$('stage'),dpr=devicePixelRatio||1,lim=clamp(Math.round(Math.max(st.clientWidth,st.clientHeight)*dpr),640,fast?PREVIEW_FAST:PREVIEW_MAX),k=Math.min(1,lim/Math.max(w,h));return [Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k))]}
function geometryPixels(fast=false){const [w,h]=previewSize(fast),r=I.r,key=JSON.stringify([r.rot,r.flip,r.angle,r.ratio,r.cx,r.cy,w,h]),slot=srcCache[fast?'fast':'full'];if(key===slot.key&&slot.px)return slot.px;
 const cv=new OffscreenCanvas(w,h),ctx=cv.getContext('2d',{willReadFrequently:true});drawGeometry(ctx,I.bmp,r,w,h);slot.px=ctx.getImageData(0,0,w,h);slot.key=key;return slot.px}
// Le richieste nello stesso fotogramma diventano un solo disegno, rapido solo se lo erano tutte.
function requestRender(fast=false){renderFast=(renderQueued?renderFast:true)&&fast;if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;renderPhoto(renderFast)})}
function renderPhoto(fast){if(!I.bmp){I.stats=null;drawHist();drawAnts();return}const src=geometryPixels(fast);if(!outPx||outPx.width!==src.width||outPx.height!==src.height)outPx=new ImageData(src.width,src.height);
 lastMc=maskCtx(I.r,src.width,src.height,src,srcCache[fast?'fast':'full'].key);const img=I.compare?src:develop(src,outPx,I.r,lutOf(I.r.look),lastMc);if(photoCv.width!==img.width||photoCv.height!==img.height){photoCv.width=img.width;photoCv.height=img.height}photoCtx.putImageData(img,0,0);fitStage();
 const prev=I.stats;I.stats=measure(img);photoCv.classList.toggle('alpha',I.stats.alpha);drawHist();warnClipping(prev,I.stats);photoCv.setAttribute('aria-label',photoLabel());$('photoInfo').textContent=photoInfo();drawAnts()}
// La foto occupa lo spazio disponibile senza deformarsi e senza superare la sua misura reale.
function fitStage(){if(!I.bmp)return;const st=$('stage'),pad=24,[w,h]=outSize(I.r,I.bmp.width,I.bmp.height),k=Math.min((st.clientWidth-pad)/w,(st.clientHeight-pad)/h,1);photoCv.style.width=Math.max(1,Math.floor(w*k))+'px';photoCv.style.height=Math.max(1,Math.floor(h*k))+'px';placeOverlays()}
function showPhoto(){const has=!!I.bmp;photoCv.hidden=!has;if(!has){antsCv.hidden=overCv.hidden=true;endTool(false)}$('photoEmpty').hidden=has;$('compareBadge').hidden=!(has&&I.compare);if(!has){for(const slot of Object.values(srcCache))Object.assign(slot,{key:'',px:null});$('photoInfo').textContent='';$('docInfo').textContent=''}requestRender()}
const photoInfo=()=>{const [w,h]=outSize(I.r,I.bmp.width,I.bmp.height);return `${fmtInt(w)} × ${fmtInt(h)} px`+(I.r.ratio!=='orig'?' · '+I.r.ratio.replace('a4','A4'):'')};
function photoLabel(){const [w,h]=outSize(I.r,I.bmp.width,I.bmp.height),n=changedAdj(I.r).length+(I.r.look!=='none'?1:0);return `${I.compare?'Originale di ':'Foto '}«${I.name}», ${fmtInt(w)} per ${fmtInt(h)} pixel${I.r.ratio!=='orig'?', '+ratioName(I.r.ratio):''}${I.compare?'':n?`, ${n===1?'una modifica':n+' modifiche'}`:', senza modifiche'}`}
// Istogramma: luminosità come area, rosso, verde e blu come linee; segni ai bordi se ci sono luci bruciate o ombre chiuse.
const histCv=$('hist');
function drawHist(){const dpr=devicePixelRatio||1,W=Math.max(1,Math.round(histCv.clientWidth*dpr)),H=Math.max(1,Math.round(histCv.clientHeight*dpr));if(histCv.width!==W||histCv.height!==H){histCv.width=W;histCv.height=H}const ctx=histCv.getContext('2d');ctx.fillStyle=palette['hist-bg']||'#fff';ctx.fillRect(0,0,W,H);
 const st=I.stats,txt=$('histText');if(!st||!st.n){txt.textContent=I.bmp?'':'Nessuna foto aperta.';txt.classList.remove('warn');return}
 let top=1;for(const h of st.H)for(let i=2;i<254;i++)top=Math.max(top,h[i]);const scale=v=>H-2-Math.min(1,Math.sqrt(v/top))*(H-6),x=i=>i/255*(W-1);
 ctx.beginPath();ctx.moveTo(0,H);for(let i=0;i<256;i++)ctx.lineTo(x(i),scale(st.H[0][i]));ctx.lineTo(W,H);ctx.closePath();ctx.globalAlpha=.45;ctx.fillStyle=palette['hist-l'];ctx.fill();ctx.globalAlpha=1;
 if(!matchMedia('(forced-colors: active)').matches)[['hist-r',1],['hist-g',2],['hist-b',3]].forEach(([c,k])=>{ctx.beginPath();for(let i=0;i<256;i++)ctx[i?'lineTo':'moveTo'](x(i),scale(st.H[k][i]));ctx.strokeStyle=palette[c];ctx.lineWidth=dpr;ctx.globalAlpha=.8;ctx.stroke();ctx.globalAlpha=1});
 const mark=(left)=>{const s=7*dpr;ctx.beginPath();if(left){ctx.moveTo(2,2);ctx.lineTo(2+s,2);ctx.lineTo(2,2+s)}else{ctx.moveTo(W-2,2);ctx.lineTo(W-2-s,2);ctx.lineTo(W-2,2+s)}ctx.closePath();ctx.fillStyle=palette['hist-clip'];ctx.fill()};
 if(st.low>=CLIP_WARN)mark(true);if(st.high>=CLIP_WARN)mark(false);
 txt.textContent=histSentence(st);txt.classList.toggle('warn',st.low>=CLIP_WARN||st.high>=CLIP_WARN)}
// Oltre l'1% di pixel completamente bianchi o neri la foto perde dettagli: si scrive e, al primo passaggio, si annuncia.
const CLIP_WARN=.01;
function histSentence(st){const parts=[`Luminosità media ${fmtPct(st.mean)}.`];if(st.high>=CLIP_WARN)parts.push(`Luci bruciate: ${fmtPct(st.high,1)} della foto, prova ad abbassare Esposizione, Alte luci o Bianchi.`);if(st.low>=CLIP_WARN)parts.push(`Ombre chiuse: ${fmtPct(st.low,1)} della foto, prova ad alzare Ombre o Neri.`);if(st.high<CLIP_WARN&&st.low<CLIP_WARN)parts.push('Nessuna parte bruciata o chiusa.');return parts.join(' ')}
let clipSaid=0;
function warnClipping(prev,st){if(!prev||I.compare||Date.now()-clipSaid<1500)return;const msg=[];if(st.high>=CLIP_WARN&&prev.high<CLIP_WARN)msg.push(`luci bruciate, ${fmtPct(st.high,1)}`);if(st.low>=CLIP_WARN&&prev.low<CLIP_WARN)msg.push(`ombre chiuse, ${fmtPct(st.low,1)}`);if(msg.length){clipSaid=Date.now();announce('Attenzione: '+msg.join(' e '),{join:true})}}
// Piani nel riquadro di sinistra: elenco con la scelta attiva, Invio per iniziare.
let planCursor=0;
function renderPlans(){const list=$('planList');planCursor=clamp(planCursor,0,PLANS.length-1);list.innerHTML=PLANS.map((p,i)=>`<div role="option" id="plan-${p.id}" class="lb-item plan-item${i===planCursor?' active':''}" data-plan="${p.id}" aria-selected="${p.id===I.plan}"><span class="n">${esc(p.name)}</span><span class="d">${esc(p.desc)}</span></div>`).join('');list.setAttribute('aria-activedescendant','plan-'+PLANS[planCursor].id)}
function movePlanCursor(i){planCursor=clamp(i,0,PLANS.length-1);renderPlans();$('plan-'+PLANS[planCursor].id)?.scrollIntoView({block:'nearest'})}
// Pannello delle regolazioni: tutti i gruppi senza piano, solo i controlli del passo con un piano.
const GROUPS=[['Inquadratura',['rotate','ratio','cx','cy','angle']],['Luce',ADJ.filter(a=>a[2]==='Luce').map(a=>a[0])],['Curve',['curves']],['Colore',ADJ.filter(a=>a[2]==='Colore').map(a=>a[0])],['Colori per tinta',['hsl']],['Bianco e nero',['bw']],['Dettaglio',['fx:clarity','fx:dehaze','fx:sharp','fx:sharpR','fx:noise','fx:noiseC']],['Effetti',['vignette']],['Look',['look','lookAmt']],['Selezione',['selection']],['Maschere',['masks']],['Sfondo',['cutout']]];
// Cursori dell'inquadratura e del look, con lo stesso aspetto delle regolazioni. Le posizioni vanno da 0 a 100.
const posText=(v,start,end,from)=>v===50?'al centro':v===0?'tutto '+start:v===100?'tutto '+end:`${fmtInt(v)}% ${from}`;
const GEO={cx:{label:'Posizione orizzontale',min:0,max:100,step:1,get:r=>Math.round(r.cx*100),set:(r,v)=>{r.cx=v/100},fmt:v=>posText(v,'a sinistra','a destra','da sinistra'),hint:'Sposta il ritaglio a sinistra o a destra.'},
 cy:{label:'Posizione verticale',min:0,max:100,step:1,get:r=>Math.round(r.cy*100),set:(r,v)=>{r.cy=v/100},fmt:v=>posText(v,'in alto','in basso','dall’alto'),hint:'Sposta il ritaglio in alto o in basso.'},
 angle:{label:'Raddrizza',min:-15,max:15,step:.1,get:r=>r.angle,set:(r,v)=>{r.angle=v},fmt:v=>v?fmtSigned(v,1)+' gradi, '+(v>0?'in senso orario':'in senso antiorario'):'0 gradi',hint:'Ruota di poco la foto per raddrizzare l’orizzonte o un documento; i bordi si ritagliano da soli.'},
 lookAmt:{label:'Intensità del look',min:0,max:100,step:1,get:r=>r.lookAmt,set:(r,v)=>{r.lookAmt=v},fmt:v=>fmtInt(v)+'%',hint:'Quanto il look cambia la foto.',zero:100}};
const ctlDef=id=>ADJ_BY[id]?{...ADJ_BY[id],get:r=>r.adj[id],set:(r,v)=>{r.adj[id]=v}}:GEO[id]||extraCtl(id);
const zeroOf=id=>id==='cx'||id==='cy'?50:(GEO[id]||extraCtl(id))?.zero??0;
// Le posizioni servono solo nella direzione in cui il ritaglio si può spostare, l'intensità solo con un look.
function shown(id){if(id==='lookAmt')return I.r.look!=='none';if(id!=='cx'&&id!=='cy')return true;if(!I.bmp||I.r.ratio==='orig')return false;const c=cropRect(I.r,I.bmp.width,I.bmp.height);return id==='cx'?c.RW-c.cw>1:c.RH-c.ch>1}
function rangeHtml(id,showHint){const c=ctlDef(id),v=c.get(I.r),changed=v!==zeroOf(id);return `<div class="adj${changed?' changed':''}" data-ctl="${id}"><label for="ctl-${id}">${esc(c.label)}</label><output id="ctl-${id}-o" aria-hidden="true">${esc(c.fmt(v))}</output><button type="button" class="btn icon" data-reset="${id}" aria-label="${esc(c.label)}: riporta al valore iniziale" data-tip="Riporta al valore iniziale (Canc sul cursore)"${changed?'':' disabled'}>${ICON('history')}</button><input type="range" id="ctl-${id}" data-ctl="${id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${v}" aria-valuetext="${esc(c.fmt(v))}" aria-describedby="ctl-${id}-h"${I.bmp?'':' disabled'}><small class="hint${showHint?'':' sr-only'}" id="ctl-${id}-h">${esc(c.hint)}</small></div>`}
function controlHtml(id,showHint){const off=I.bmp?'':' disabled';if(PANEL_HTML[id])return PANEL_HTML[id](showHint);
 if(id==='rotate')return `<div class="insp-actions" role="group" aria-label="Rotazione"><button type="button" class="btn sm" data-action="rotateLeft"${off}>${ICON('rotateL')}Ruota a sinistra</button><button type="button" class="btn sm" data-action="rotateRight"${off}>${ICON('rotate')}Ruota a destra</button><button type="button" class="btn sm" data-action="flipH" aria-pressed="${I.r.flip}"${off}>${ICON('flip')}Rifletti</button></div>`;
 if(id==='ratio')return `<label for="ctl-ratio">Formato</label><select id="ctl-ratio" data-ctl="ratio"${off}>${RATIOS.map(([v,l])=>`<option value="${v}"${v===I.r.ratio?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
 if(id==='look')return `<label for="ctl-look">Look</label><select id="ctl-look" data-ctl="look"${off}>${lookList().map(([v,l])=>`<option value="${esc(v)}"${v===I.r.look?' selected':''}>${esc(l)}</option>`).join('')}</select><div class="insp-actions"><button type="button" class="btn sm" data-action="lutImport"${off}>${ICON('cube')}Importa un LUT…</button></div>`;
 if(!shown(id))return '';
 return rangeHtml(id,showHint)}
function renderPanel(){const plan=planOf(),body=$('adjBody'),head=$('stepHead'),focusId=document.activeElement?.closest?.('#adjBody,#stepHead')?(document.activeElement.id||document.activeElement.dataset.action):null;
 if(plan.steps){const steps=plan.steps,i=I.step,s=steps[i],last=i===steps.length-1;head.hidden=false;
  head.innerHTML=`<p class="step-count">${esc(plan.name)} · passo ${i+1} di ${steps.length}</p><h3 id="stepTitle">${esc(s.title)}</h3><p id="stepText">${esc(s.text)}</p><div class="step-nav"><button type="button" class="btn sm" data-action="stepPrev"${i?'':' disabled'}>${ICON('left')}Indietro</button>${s.auto?`<button type="button" class="btn sm" data-action="stepAuto"${I.bmp?'':' disabled'}>${ICON('wand')}Proposta</button>`:''}<span class="grow"></span>${last?`<button type="button" class="btn sm primary" data-action="export"${I.bmp?'':' disabled'}>${ICON('save')}Esporta…</button>`:`<button type="button" class="btn sm primary" data-action="stepNext">Avanti${ICON('right')}</button>`}</div>`;
  body.innerHTML=(s.controls||[]).map(id=>controlHtml(id,true)).join('')+(s.export?`<dl><dt>Formato</dt><dd>${esc(exportLabel(s.export))}</dd><dt>Dati della foto</dt><dd>Fotocamera e posizione non vengono copiate</dd></dl>`:'')}
 else{head.hidden=true;head.innerHTML='';body.innerHTML=GROUPS.map(([g,ids])=>`<h3>${esc(g)}</h3>`+ids.map(id=>controlHtml(id,false)).join('')).join('')}
 afterPanel();
 if(focusId){const el=$(focusId)||body.querySelector(`[data-action="${focusId}"]`)||head.querySelector(`[data-action="${focusId}"]`);if(el&&!el.disabled)el.focus();else (focusables(head)[0]||focusables(body)[0])?.focus()}}
// Aggiorna valori e stati senza ricostruire il pannello, così il cursore che si sta usando non perde il focus.
function syncPanel(){for(const el of $$('#adjBody [data-ctl]')){const id=el.dataset.ctl;if(el.tagName==='SELECT'){if(el.value!==I.r[id]){renderPanel();return}continue}if(el.tagName!=='INPUT')continue;const c=ctlDef(id),v=c.get(I.r),t=c.fmt(v);if(Number(el.value)!==v)el.value=v;el.setAttribute('aria-valuetext',t);$(`ctl-${id}-o`).textContent=t;const box=el.closest('.adj'),changed=v!==zeroOf(id);box.classList.toggle('changed',changed);box.querySelector('[data-reset]').disabled=!changed}
 const flip=$('adjBody').querySelector('[data-action=flipH]');flip?.setAttribute('aria-pressed',I.r.flip);
 // Se il formato o il look sono cambiati, compaiono o spariscono le posizioni del ritaglio e l'intensità.
 const stale=(['cx','cy'].some(id=>$('ctl-ratio')&&shown(id)!==!!$('ctl-'+id)))||($('ctl-look')&&shown('lookAmt')!==!!$('ctl-lookAmt'));if(stale)renderPanel();else afterPanel()}
redrawAll=()=>{drawHist();if(I.bmp)fitStage()};
