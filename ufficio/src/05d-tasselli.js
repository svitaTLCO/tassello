// Tasselli: i riquadri laterali si riducono a tessera, passano da un lato all'altro, si allargano trascinando la fuga
// (o con le frecce quando la fuga ha il focus) e si tolgono dal piano. Lato, larghezza e tessera restano nelle preferenze.
// In Testo, Spostamento e Commenti restano legati al documento come prima (state.layout.nav e state.showComments):
// toglierli dal piano li chiude. In Calcolo non ci sono riquadri laterali.
const PANES={
 navPane:{mode:'w',title:'Spostamento',icon:'nav',side:'left',w:250,min:190,max:440,head:'.nav-head',unit:['titolo','titoli'],count:()=>parseInt($('navCount').textContent)||0,
  on:()=>!!state.layout.nav,set:v=>{state.layout.nav=v;applyLayout();navSig='';renderNav(true);schedulePersist()},focus:()=>($('navList').querySelector('[tabindex="0"]')||$('navPane').querySelector('.pane-btn')).focus(),regions:()=>[$('navPane')]},
 cmtPane:{mode:'w',title:'Commenti',icon:'comment',side:'right',w:300,min:230,max:480,head:'.nav-head',unit:['commento','commenti'],count:()=>parseInt($('cmtCount').textContent)||0,
  on:()=>!!state.showComments,set:v=>toggleComments(v),focus:()=>($('cmtList').querySelector('button')||$('cmtAdd')).focus(),regions:()=>[$('cmtPane')]},
 pgSidePane:{mode:'p',title:'Pagine e cornici',icon:'page',side:'left',w:232,min:190,max:420,head:'.pane-head',focus:()=>$('pgPages').focus(),regions:()=>[$('pgPages'),$('pgFrames')]},
 pgPropsPane:{mode:'p',title:'Proprietà',icon:'gear',side:'right',w:320,min:250,max:480,head:'.pane-head',focus:()=>(focusables($('pgProps'))[0]||$('pgProps')).focus(),regions:()=>[$('pgProps')]}};
const PANE_SAY={open:'aperto',tessera:'ridotto a tessera',off:'tolto dal piano'};
const layoutOf=()=>prefs.layout||(prefs.layout={});
function paneState(id){const L=layoutOf(),d=PANES[id];if(!L[id])L[id]={side:d.side,w:d.w,tes:false,off:false};return L[id]}
const panesOf=m=>Object.keys(PANES).filter(id=>PANES[id].mode===m);
const paneOn=id=>{const d=PANES[id];return d.on?d.on():!paneState(id).off};
const paneSt=id=>!paneOn(id)?'off':paneState(id).tes?'tessera':'open';
// Ogni riquadro riceve una tessera (il riquadro ridotto), una fuga da trascinare e due pulsanti nell'intestazione.
for(const [id,d] of Object.entries(PANES)){const el=$(id);
 el.insertAdjacentHTML('beforebegin',`<button type="button" class="tessera" id="${id}Tes" aria-controls="${id}" aria-expanded="false" data-tip="Espandi ${esc(d.title)}" hidden>${ICON(d.icon)}<span class="badge" aria-hidden="true"></span><span class="vt" aria-hidden="true">${esc(d.title)}</span></button>`);
 el.insertAdjacentHTML('afterend',`<div class="sep" id="${id}Sep" data-pane="${id}" role="separator" tabindex="0" aria-orientation="vertical" aria-controls="${id}" aria-label="Larghezza del riquadro ${esc(d.title)}" aria-valuemin="${d.min}" aria-valuemax="${d.max}" hidden></div>`);
 el.querySelector(d.head).insertAdjacentHTML('beforeend',`<button type="button" class="pane-btn" data-pane-act="collapse" aria-label="Riduci a tessera il riquadro ${esc(d.title)}" data-tip="Riduci a tessera"></button><button type="button" class="pane-btn" data-pane-act="menu" aria-haspopup="menu" aria-expanded="false" aria-label="Opzioni del riquadro ${esc(d.title)}" data-tip="Sposta, riduci o togli">${ICON('more')}</button>`)}
// Disposizione: a sinistra dell'area centrale gli ordini 0, 2, 4…, a destra 102, 104…; la fuga sta tra riquadro e centro.
function applyTiles(){for(const m of ['w','p']){const ids=panesOf(m);ids.filter(id=>paneState(id).side==='left').forEach((id,i)=>placePane(id,2*i));ids.filter(id=>paneState(id).side==='right').forEach((id,i)=>placePane(id,102+2*i))}paneBadges()}
function placePane(id,order){const s=paneState(id),d=PANES[id],st=paneSt(id),el=$(id),sep=$(id+'Sep'),tes=$(id+'Tes'),left=s.side==='left';s.w=clamp(s.w,d.min,d.max);
 el.style.order=tes.style.order=order;sep.style.order=left?order+1:order-1;tes.dataset.side=s.side;el.style.setProperty('--w',s.w+'px');
 el.hidden=st!=='open';sep.hidden=st!=='open';tes.hidden=st!=='tessera';sep.setAttribute('aria-valuenow',s.w);sep.setAttribute('aria-valuetext',s.w+' pixel');
 el.querySelector('[data-pane-act=collapse]').innerHTML=ICON(left?'left':'right')}
function paneBadges(){for(const [id,d] of Object.entries(PANES)){const n=d.count&&safe(d.count)||0,tes=$(id+'Tes');tes.querySelector('.badge').textContent=n?String(n):'';tes.setAttribute('aria-label',`${d.title}, riquadro ridotto${n?`: ${n} ${d.unit[n===1?0:1]}`:''}. Espandi`)}}
for(const id of ['navCount','cmtCount'])new MutationObserver(paneBadges).observe($(id),{childList:true,characterData:true,subtree:true});
// Quando un riquadro sparisce con il focus dentro, il focus torna al documento, al foglio o alla pagina.
function workFocus(){if(isWord())restoreWordFocus();else if(isPage())pageFocus();else $('gridScroll').focus()}
function paneSet(id,st,{focus=false,say=true}={}){const d=PANES[id],s=paneState(id),had=$(id).contains(document.activeElement)||$(id+'Tes')===document.activeElement,on=st!=='off';
 if(d.on){if(d.on()!==on)d.set(on)}else s.off=!on;s.tes=st==='tessera';savePrefs();applyTiles();
 if(focus||had){if(st==='open')d.focus();else if(st==='tessera')$(id+'Tes').focus();else workFocus()}
 if(say)announce(d.title+': '+PANE_SAY[st]);refreshToggles()}
function paneToggle(id){const off=paneSt(id)==='off';paneSet(id,off?'open':'off',{focus:off})}
function paneMove(id){const s=paneState(id);s.side=s.side==='left'?'right':'left';savePrefs();applyTiles();announce(`${PANES[id].title} spostato a ${s.side==='left'?'sinistra':'destra'}`)}
function setW(id,w,final=true){const d=PANES[id],s=paneState(id),sep=$(id+'Sep');s.w=Math.round(clamp(w,d.min,Math.max(d.min,Math.min(d.max,innerWidth*.45))));$(id).style.setProperty('--w',s.w+'px');sep.setAttribute('aria-valuenow',s.w);sep.setAttribute('aria-valuetext',s.w+' pixel');if(final)savePrefs()}
function paneMenu(id,btn){const s=paneState(id),d=PANES[id],left=s.side==='left',r=btn.getBoundingClientRect();
 openMenu([{label:left?'Sposta a destra':'Sposta a sinistra',icon:left?'right':'left',run:()=>paneMove(id)},{label:'Riduci a tessera',icon:left?'left':'right',run:()=>paneSet(id,'tessera',{focus:true})},{label:'Larghezza iniziale',icon:'fit',run:()=>setW(id,d.w)},'-',
  {label:'Togli dal piano',desc:'Torna dal menu Tasselli, in basso a sinistra',icon:'close',run:()=>paneSet(id,'off',{focus:true})}],r.right-240,r.bottom+4,'Opzioni del riquadro '+d.title,btn)}
// Menu Tasselli nella barra di stato: quali riquadri sono sul piano e alcune disposizioni pronte.
function layoutMenu(){const m=modeKey(),ids=panesOf(m),btn=$('layoutBtn'),r=btn.getBoundingClientRect();if(!ids.length){toast('In Calcolo non ci sono riquadri da disporre');return}
 const where=id=>{const st=paneSt(id);return st==='open'?(paneState(id).side==='left'?'A sinistra':'A destra'):st==='tessera'?'Ridotto a tessera':'Tolto dal piano'};
 const items=ids.map(id=>({label:PANES[id].title,desc:where(id),check:true,checked:paneSt(id)!=='off',run:()=>paneToggle(id)}));
 items.push('-',...(m==='w'?[{label:'Scrittura',desc:'Solo il foglio: Spostamento e Commenti tolti',icon:'page',run:()=>layoutPreset('off','Scrittura: solo il foglio')},{label:'Revisione',desc:'Spostamento e Commenti aperti',icon:'comment',run:()=>layoutPreset('open','Revisione: Spostamento e Commenti aperti')}]
  :[{label:'Pagina grande',desc:'I riquadri ridotti a tessera',icon:'fit',run:()=>layoutPreset('tessera','Pagina grande')}]),{label:'Come all’inizio',desc:'Rimette ogni tassello al suo posto',icon:'history',run:layoutReset});
 openMenu(items,r.left,r.top-6,'Tasselli',btn,true)}
function layoutPreset(st,say){for(const id of panesOf(modeKey()))paneSet(id,st,{say:false});announce(say)}
function layoutReset(){const L=layoutOf();for(const id of panesOf(modeKey()))delete L[id];savePrefs();applyTiles();announce('Tasselli rimessi come all’inizio')}
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
document.addEventListener('focusin',e=>{const t=e.target.closest?.('#docRegion .tile');if(!t||t===activeTile)return;activeTile?.classList.remove('is-active');activeTile=t;t.classList.add('is-active')});
