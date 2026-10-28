// Annunci per screen reader, finestre di dialogo accessibili, tooltip e preferenze di visualizzazione.
const ICON=(name,cls='ico')=>!name?'<span class="ico" aria-hidden="true"></span>':name.startsWith('t:')?`<span class="ti-text" aria-hidden="true">${name.slice(2)}</span>`:`<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
// Due messaggi in fila diventano una frase sola: il punto si aggiunge solo se manca.
const joinSay=(a,b)=>!a||a===b?b:a+(/[.!?:;…]$/.test(a)?' ':'. ')+b;
// saidN conta gli annunci: runCommand lo confronta per non aggiungere «… attivato» dopo il messaggio dell'azione.
let toastTimer,toastShow,toastNext='',saidN=0;
// Un messaggio in attesa si accoda al successivo, tranne quando a produrli è lo stesso tasto premuto di nuovo (una freccia
// tenuta giù): lì vale solo l'ultimo, cioè la posizione in cui ci si ferma.
let keySig='',keySeq=0;addEventListener('keydown',e=>{keySeq++;keySig=[e.ctrlKey,e.altKey,e.shiftKey,e.metaKey,e.key].join()},true);
const sayFrom=()=>({sig:keySig,seq:keySeq}),queueSay=(prev,from,msg)=>from&&from.seq!==keySeq&&from.sig===keySig?msg:joinSay(prev,msg);
// Messaggio temporaneo, letto dagli screen reader: si svuota e si riscrive perché venga annunciato anche se uguale. Un
// messaggio che arriva prima che il precedente sia scritto gli si accoda, e il riquadro resta in proporzione alla lunghezza.
let toastFrom=null;function toast(message){const box=$('toast');saidN++;toastNext=queueSay(toastNext,toastFrom,String(message??''));toastFrom=sayFrom();clearTimeout(toastTimer);clearTimeout(toastShow);box.textContent='';toastShow=setTimeout(()=>{box.textContent=toastNext;box.classList.add('show');toastTimer=setTimeout(()=>box.classList.remove('show'),Math.max(4200,toastNext.length*60));toastNext=''},40)}
let liveTimer,liveNext='',liveFrom=null;function announce(msg){msg=String(msg??'').trim();if(!msg)return;saidN++;const el=$('srLive');liveNext=queueSay(liveNext,liveFrom,msg);liveFrom=sayFrom();el.textContent='';clearTimeout(liveTimer);liveTimer=setTimeout(()=>{el.textContent=liveNext;liveNext=''},70)}
// Le descrizioni lunghe (più di due frasi) vanno in una finestra, che resta finché non si chiude e che lo screen reader
// legge all'apertura, una frase per paragrafo; quelle brevi restano un messaggio.
function sayLong(title,text){text=String(text??'').trim();const parts=text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Þ«"0-9])/);if(parts.length<=2&&text.length<=200)return toast(text);saidN++;
 return modal(title,parts.map(p=>`<p>${esc(p)}</p>`).join('')+'<p class="hint">Esc o Invio per chiudere.</p>',[],'Chiudi',{noCancel:true})}
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
function focusables(root){return $$(FOCUSABLE,root).filter(el=>!el.closest('[hidden]')&&(el.offsetWidth||el.offsetHeight||el===document.activeElement))}
function refocus(el){const t=el?.isConnected?el:(el?.id&&$(el.id));if(t&&t!==document.body){if(t.id==='wordEditor')restoreWordFocus();else t.focus({preventScroll:true})}}
function trapTab(e,root){if(e.key!=='Tab')return;const f=focusables(root);if(!f.length){e.preventDefault();return}const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&(i===f.length-1||i<0)){e.preventDefault();f[0].focus()}}
function modal(title,body,fields=[],actionLabel='Conferma',opts={}){return new Promise(resolve=>{const pane=$('modal'),bg=$('modalbg'),prev=document.activeElement;
 const field=x=>{const id='dlg_'+x.id,hint=x.hint?`<small class="hint" id="${id}_h">${esc(x.hint)}</small>`:'',desc=x.hint?` aria-describedby="${id}_h"`:'';
  if(x.type==='checkbox')return `<label class="check"><input type="checkbox" id="${id}"${x.value?' checked':''}${desc}> ${esc(x.label)}</label>${hint}`;
  const lab=`<label for="${id}">${esc(x.label)}</label>`;
  if(x.type==='select')return lab+`<select id="${id}"${desc}>${x.options.map(opt=>`<option value="${esc(opt.value)}"${String(opt.value)===String(x.value??'')?' selected':''}>${esc(opt.label)}</option>`).join('')}</select>`+hint;
  if(x.type==='textarea')return lab+`<textarea id="${id}" rows="${x.rows||3}"${desc}>${esc(x.value||'')}</textarea>`+hint;
  return lab+`<input id="${id}" type="${x.type||'text'}" value="${esc(x.value??'')}"${x.min!==undefined?` min="${x.min}"`:''}${x.max!==undefined?` max="${x.max}"`:''} autocomplete="off"${desc}>`+hint};
 pane.className='modal'+(opts.wide?' wide':'');pane.setAttribute('aria-describedby','dlgBody');
 pane.innerHTML=`<h2 id="dlgTitle">${esc(title)}</h2><div id="dlgBody" class="dlg-body">${body}</div><form id="dialogForm" novalidate>${fields.map(field).join('')}<div class="modal-actions">${opts.noCancel?'':'<button type="button" class="btn" id="cancelDlg">Annulla</button>'}<button class="btn primary" type="submit" id="okDlg">${esc(actionLabel)}</button></div></form>`;
 bg.hidden=false;
 const finish=v=>{bg.hidden=true;bg.onkeydown=null;bg.onmousedown=null;pane.innerHTML='';if(opts.restore!==false)refocus(prev);resolve(v)};
 if($('cancelDlg'))$('cancelDlg').onclick=()=>finish(null);
 $('dialogForm').onsubmit=e=>{e.preventDefault();const obj={};for(const x of fields){const el=$('dlg_'+x.id);obj[x.id]=x.type==='checkbox'?el.checked:el.value}finish(obj)};
 bg.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(null)}else trapTab(e,pane)};
 bg.onmousedown=e=>{if(e.target===bg)finish(null)};
 opts.onOpen?.(pane,finish);
 setTimeout(()=>{const f=fields[0]?$('dlg_'+fields[0].id):(pane.querySelector('[data-autofocus]')||$('okDlg'));f?.focus({preventScroll:!fields[0]});pane.scrollTop=0;if(f?.select&&f.type!=='checkbox')f.select()},0);
});}
const overlayOpen=()=>!$('modalbg').hidden||!$('palettebg').hidden||!$('filepanel').hidden||!$('menu').hidden;
const tip=$('tip');let tipTimer;
function showTip(el){const t=el.dataset.tip;if(!t||!el.isConnected)return;tip.textContent=t;tip.hidden=false;const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;let x=Math.min(innerWidth-w-6,Math.max(6,r.left+r.width/2-w/2)),y=r.bottom+6;if(y+h>innerHeight-4)y=r.top-h-6;tip.style.left=x+'px';tip.style.top=y+'px'}
function hideTip(){clearTimeout(tipTimer);tip.hidden=true}
const prefs={theme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light',contrast:matchMedia('(prefers-contrast: more)').matches};
// Preferenze di tema e contrasto; quelle salvate con il vecchio nome del programma vengono riprese.
const PREFS_KEY='tassello-ufficio.preferenze';
try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREFS_KEY)||localStorage.getItem('office-studio.prefs')||'{}'))}catch(e){}
function savePrefs(){try{localStorage.setItem(PREFS_KEY,JSON.stringify(prefs))}catch(e){}}
function applyPrefs(){document.documentElement.dataset.theme=prefs.theme==='dark'?'dark':'light';document.documentElement.dataset.contrast=prefs.contrast?'high':'normal'}
