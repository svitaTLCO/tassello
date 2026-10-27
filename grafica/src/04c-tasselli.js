// Tasselli: i riquadri laterali si riducono a tessera, passano da un lato all'altro, si allargano trascinando la fuga
// (o con le frecce quando la fuga ha il focus) e si tolgono dal piano. La disposizione di ogni app resta nelle preferenze.
// La foto e il foglio si ridisegnano da soli quando cambia la loro larghezza: qui basta spostare i riquadri.
const PANES={
 planPane:{mode:'i',title:'Piani',icon:'plan',side:'left',w:240,min:190,max:420,focus:()=>$('planList').focus()},
 adjPane:{mode:'i',title:'Regolazioni',icon:'light',side:'right',w:310,min:250,max:480,focus:()=>(focusables($('stepHead'))[0]||focusables($('adjBody'))[0]||$('adjBody')).focus()},
 layPane:{mode:'d',title:'Livelli',icon:'level',side:'left',w:240,min:190,max:420,count:()=>Dw.p.items.length,unit:['oggetto','oggetti'],focus:()=>$('layList').focus()},
 propPane:{mode:'d',title:'Proprietà',icon:'gear',side:'right',w:310,min:250,max:480,focus:()=>(focusables($('propBody'))[0]||$('propBody')).focus()}};
const PANE_SAY={open:'aperto',tessera:'ridotto a tessera',off:'tolto dal piano'};
const layoutOf=()=>prefs.layout||(prefs.layout={});
function paneState(id){const L=layoutOf(),d=PANES[id];if(!L[id])L[id]={side:d.side,w:d.w,st:'open'};return L[id]}
const panesOf=m=>Object.keys(PANES).filter(id=>PANES[id].mode===m);
// Ogni riquadro riceve una tessera (il riquadro ridotto), una fuga da trascinare e due pulsanti nell'intestazione.
for(const [id,d] of Object.entries(PANES)){const el=$(id);
 el.insertAdjacentHTML('beforebegin',`<button type="button" class="tessera" id="${id}Tes" aria-controls="${id}" aria-expanded="false" data-tip="Espandi ${esc(d.title)}" hidden>${ICON(d.icon)}<span class="badge" aria-hidden="true"></span><span class="vt" aria-hidden="true">${esc(d.title)}</span></button>`);
 el.insertAdjacentHTML('afterend',`<div class="sep" id="${id}Sep" data-pane="${id}" role="separator" tabindex="0" aria-orientation="vertical" aria-controls="${id}" aria-label="Larghezza del riquadro ${esc(d.title)}" aria-valuemin="${d.min}" aria-valuemax="${d.max}"></div>`);
 el.querySelector('.pane-head').insertAdjacentHTML('beforeend',`<button type="button" class="pane-btn" data-pane-act="collapse" aria-label="Riduci a tessera il riquadro ${esc(d.title)}" data-tip="Riduci a tessera"></button><button type="button" class="pane-btn" data-pane-act="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Opzioni del riquadro ${esc(d.title)}" data-tip="Sposta, riduci o togli">${ICON('more')}</button>`)}
// Disposizione: a sinistra dell'area centrale gli ordini 0, 2, 4…, a destra 102, 104…; la fuga sta tra riquadro e centro.
function applyLayout(){for(const m of ['i','d']){const ids=panesOf(m);ids.filter(id=>paneState(id).side==='left').forEach((id,i)=>placePane(id,2*i));ids.filter(id=>paneState(id).side==='right').forEach((id,i)=>placePane(id,102+2*i))}paneBadges()}
function placePane(id,order){const s=paneState(id),d=PANES[id],el=$(id),sep=$(id+'Sep'),tes=$(id+'Tes'),left=s.side==='left';s.w=clamp(s.w,d.min,d.max);
 el.style.order=tes.style.order=order;sep.style.order=left?order+1:order-1;tes.dataset.side=s.side;el.style.setProperty('--w',s.w+'px');
 el.hidden=s.st!=='open';sep.hidden=s.st!=='open';tes.hidden=s.st!=='tessera';sep.setAttribute('aria-valuenow',s.w);sep.setAttribute('aria-valuetext',s.w+' pixel');
 el.querySelector('[data-pane-act=collapse]').innerHTML=ICON(left?'left':'right')}
function paneBadges(){for(const [id,d] of Object.entries(PANES)){const n=d.count&&safe(d.count)||0,tes=$(id+'Tes');tes.querySelector('.badge').textContent=n?String(n):'';tes.setAttribute('aria-label',`${d.title}, riquadro ridotto${n?`: ${n} ${d.unit[n===1?0:1]}`:''}. Espandi`)}}
new MutationObserver(paneBadges).observe($('layList'),{childList:true});
// Quando un riquadro sparisce con il focus dentro, il focus torna sulla foto o sul foglio.
function workFocus(){const w=lastWork?.isConnected&&lastWork.offsetParent&&!lastWork.closest('.pane')?lastWork:null;(w||workHome()).focus()}
function paneSet(id,st,{focus=false,say=true}={}){const s=paneState(id),d=PANES[id],had=$(id).contains(document.activeElement)||$(id+'Tes')===document.activeElement;s.st=st;savePrefs();applyLayout();
 if(focus||had){if(st==='open')d.focus();else if(st==='tessera')$(id+'Tes').focus();else workFocus()}
 if(say)announce(d.title+': '+PANE_SAY[st]);refreshToggles()}
function paneToggle(id){const off=paneState(id).st==='off';paneSet(id,off?'open':'off',{focus:off})}
function paneMove(id){const s=paneState(id);s.side=s.side==='left'?'right':'left';savePrefs();applyLayout();announce(`${PANES[id].title} spostato a ${s.side==='left'?'sinistra':'destra'}`)}
function setW(id,w,final=true){const d=PANES[id],s=paneState(id),sep=$(id+'Sep');s.w=Math.round(clamp(w,d.min,Math.max(d.min,Math.min(d.max,innerWidth*.45))));$(id).style.setProperty('--w',s.w+'px');sep.setAttribute('aria-valuenow',s.w);sep.setAttribute('aria-valuetext',s.w+' pixel');if(final)savePrefs()}
function paneMenu(id,btn){const s=paneState(id),d=PANES[id],left=s.side==='left',r=btn.getBoundingClientRect();
 openMenu([{label:left?'Sposta a destra':'Sposta a sinistra',icon:left?'right':'left',run:()=>paneMove(id)},{label:'Riduci a tessera',icon:left?'left':'right',run:()=>paneSet(id,'tessera',{focus:true})},{label:'Larghezza iniziale',icon:'fit',run:()=>setW(id,d.w)},'-',
  {label:'Togli dal piano',desc:'Torna dal menu Tasselli, in basso a sinistra',icon:'close',run:()=>paneSet(id,'off',{focus:true})}],r.right-240,r.bottom+4,'Opzioni del riquadro '+d.title,btn)}
// Menu Tasselli nella barra di stato: quali riquadri sono sul piano e alcune disposizioni pronte.
function layoutMenu(){const m=state.mode[0],btn=$('layoutBtn'),r=btn.getBoundingClientRect(),ids=panesOf(m),img=m==='i';
 const where=id=>{const s=paneState(id);return s.st==='open'?(s.side==='left'?'A sinistra':'A destra'):s.st==='tessera'?'Ridotto a tessera':'Tolto dal piano'};
 const items=ids.map(id=>({label:PANES[id].title,desc:where(id),box:true,checked:paneState(id).st!=='off',run:()=>paneToggle(id)}));
 items.push('-',{label:img?'Foto grande':'Foglio grande',desc:'I riquadri ridotti a tessera',icon:'fit',run:()=>layoutPreset('tessera')},{label:'Come all’inizio',desc:'Rimette ogni tassello al suo posto',icon:'history',run:layoutReset});
 openMenu(items,r.left,r.top-6,'Tasselli',btn,true)}
function layoutPreset(st){for(const id of panesOf(state.mode[0]))paneState(id).st=st;savePrefs();applyLayout();announce(isImmagini()?'Foto grande':'Foglio grande')}
function layoutReset(){const L=layoutOf();for(const id of panesOf(state.mode[0]))delete L[id];savePrefs();applyLayout();announce('Tasselli rimessi come all’inizio')}
// Fuga: si trascina con il mouse o con il dito; con il focus, le frecce allargano e stringono (con Maiusc di più).
document.addEventListener('pointerdown',e=>{const sep=e.target.closest?.('.sep');if(!sep||e.button!==0)return;e.preventDefault();sep.setPointerCapture(e.pointerId);sep.classList.add('dragging');
 const id=sep.dataset.pane,x0=e.clientX,w0=paneState(id).w,dir=paneState(id).side==='right'?-1:1;
 const move=ev=>setW(id,w0+dir*(ev.clientX-x0),false);
 const up=()=>{sep.removeEventListener('pointermove',move);sep.removeEventListener('pointerup',up);sep.removeEventListener('pointercancel',up);sep.classList.remove('dragging');savePrefs()};
 sep.addEventListener('pointermove',move);sep.addEventListener('pointerup',up);sep.addEventListener('pointercancel',up)});
document.addEventListener('keydown',e=>{const sep=e.target.closest?.('.sep');if(!sep||e.ctrlKey||e.altKey||e.metaKey)return;const step=e.shiftKey?64:16,id=sep.dataset.pane,d=PANES[id],s=paneState(id),grow=s.side==='left'?'ArrowRight':'ArrowLeft',shrink=s.side==='left'?'ArrowLeft':'ArrowRight';
 if(e.key==='Enter'){e.preventDefault();paneSet(id,'tessera',{focus:true});return}
 const v=e.key===grow?s.w+step:e.key===shrink?s.w-step:e.key==='Home'?d.min:e.key==='End'?d.max:null;if(v===null)return;e.preventDefault();setW(id,v)});
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-pane-act]');if(b){const id=b.closest('.pane').id;if(b.dataset.paneAct==='collapse')paneSet(id,'tessera',{focus:true});else paneMenu(id,b);return}
 const t=e.target.closest?.('.tessera');if(t)paneSet(t.getAttribute('aria-controls'),'open',{focus:true})});
// L'angolo piegato segna il tassello in cui si lavora: resta sull'ultimo anche quando il focus passa alla barra.
let activeTile=null;
document.addEventListener('focusin',e=>{const t=e.target.closest?.('#workRegion .tile');if(!t||t===activeTile)return;activeTile?.classList.remove('is-active');activeTile=t;t.classList.add('is-active')});
