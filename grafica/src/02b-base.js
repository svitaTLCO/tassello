// Strumenti di base usati in tutto il programma: DOM, testo sicuro in HTML, nomi dei file scaricati,
// numeri scritti e letti all'italiana.
const $=id=>document.getElementById(id);
const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const HTML_ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>HTML_ESC[ch]);
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const uid=()=>Math.random().toString(36).slice(2,10);
// Nomi dei file: niente caratteri vietati da Windows, al massimo 80 caratteri, estensione corretta.
const IMG_EXT=/\.(?:jpe?g|png|webp|avif|gif|bmp|heic|heif|tiff?|cube|json|cr2|cr3|nef|nrw|arw|srf|sr2|orf|rw2|raf|dng|pef|srw|x3f|3fr|iiq)$/i;
function safeFileName(name){const s=String(name||'').replace(/[\x00-\x1f\\/:*?"<>|]/g,'_').trim().slice(0,80);return s||'Senza titolo'}
const baseName=name=>String(name||'').replace(IMG_EXT,'');
const extName=(name,ext)=>`${safeFileName(baseName(name))}.${ext}`;
function download(content,fileName,mime){const payload=content instanceof Blob?content:new Blob([content],{type:mime||'application/octet-stream'}),url=URL.createObjectURL(payload),link=Object.assign(document.createElement('a'),{href:url,download:fileName});link.style.display='none';document.body.append(link);link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);link.remove()}
// Numeri all'italiana: quelli scritti dall'utente con la virgola o il punto, quelli mostrati con la virgola,
// il segno meno tipografico e, per le regolazioni, il segno più.
const num=v=>{const s=String(v??'').trim().replace(/\s/g,'').replace(/−/g,'-').replace(',','.');return s===''?NaN:Number(s)};
const fmtNum=(n,d=1)=>Number(n).toLocaleString('it-IT',{minimumFractionDigits:d,maximumFractionDigits:d}).replace(/^-/,'−');
const fmtInt=n=>Math.round(n).toLocaleString('it-IT');
const fmtSigned=(n,d=0)=>(n>0?'+':'')+fmtNum(n,d);
const fmtPct=(f,d=0)=>fmtNum(f*100,d)+'%';
const fmtBytes=n=>n>=1e9?fmtNum(n/1e9,2)+' GB':n>=1e6?fmtNum(n/1e6,1)+' MB':fmtInt(n/1e3)+' kB';
// Annunci per screen reader, finestre di dialogo accessibili, tooltip e preferenze di visualizzazione.
const ICON=(name,cls='ico')=>!name?'<span class="ico" aria-hidden="true"></span>':name.startsWith('t:')?`<span class="ti-text" aria-hidden="true">${name.slice(2)}</span>`:`<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
let toastTimer;
// Messaggio temporaneo, letto dagli screen reader: si svuota e si riscrive perché venga annunciato anche se uguale.
function toast(message){const box=$('toast');clearTimeout(toastTimer);box.textContent='';setTimeout(()=>{box.textContent=message;box.classList.add('show')},40);toastTimer=setTimeout(()=>box.classList.remove('show'),Math.max(4200,String(message).length*55))}
// Con join il messaggio si aggiunge a quello appena annunciato invece di sostituirlo (per esempio un avviso dopo Annulla).
let liveTimer,lastSaid={t:0,msg:''};function announce(msg,{join=false}={}){const el=$('srLive');if(join&&Date.now()-lastSaid.t<800)msg=lastSaid.msg+' '+msg;lastSaid={t:Date.now(),msg};el.textContent='';clearTimeout(liveTimer);liveTimer=setTimeout(()=>{el.textContent=msg},70)}
const FOCUSABLE='a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
function focusables(root){return $$(FOCUSABLE,root).filter(el=>!el.closest('[hidden],.hidden')&&(el.offsetWidth||el.offsetHeight||el===document.activeElement))}
function refocus(el){const t=el?.isConnected?el:(el?.id&&$(el.id));if(t&&t!==document.body)t.focus({preventScroll:true})}
function trapTab(e,root){if(e.key!=='Tab')return;const f=focusables(root);if(!f.length){e.preventDefault();return}const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus()}else if(!e.shiftKey&&(i===f.length-1||i<0)){e.preventDefault();f[0].focus()}}
// Finestra di dialogo modale con campi etichettati. Campi: text, number, select, textarea, checkbox, range, color.
// opts.buttons aggiunge pulsanti (per esempio Anteprima) che ricevono i valori correnti; opts.validate può rifiutare
// i valori con un messaggio, che resta nella finestra ed è annunciato.
function modal(title,body,fields=[],actionLabel='Conferma',opts={}){return new Promise(resolve=>{const pane=$('modal'),bg=$('modalbg'),prev=document.activeElement;
 const field=x=>{const id='dlg_'+x.id,hint=x.hint?`<small class="hint" id="${id}_h">${esc(x.hint)}</small>`:'',desc=x.hint?` aria-describedby="${id}_h"`:'';
  if(x.type==='checkbox')return `<label class="check"><input type="checkbox" id="${id}"${x.value?' checked':''}${desc}> ${esc(x.label)}</label>${hint}`;
  const lab=`<label for="${id}">${esc(x.label)}</label>`;
  if(x.type==='select')return lab+`<select id="${id}"${desc}>${x.options.map(opt=>{const [v,l]=Array.isArray(opt)?opt:[opt.value,opt.label];return `<option value="${esc(v)}"${String(v)===String(x.value??'')?' selected':''}>${esc(l)}</option>`}).join('')}</select>`+hint;
  if(x.type==='textarea')return lab+`<textarea id="${id}" rows="${x.rows||3}"${desc}>${esc(x.value||'')}</textarea>`+hint;
  if(x.type==='range'){const f=x.fmt||String;return lab+`<div class="rangebox"><input type="range" id="${id}" min="${x.min}" max="${x.max}" step="${x.step||1}" value="${esc(x.value)}" aria-valuetext="${esc(f(Number(x.value)))}"${desc}><output id="${id}_o" aria-hidden="true">${esc(f(Number(x.value)))}</output></div>`+hint}
  // I numeri sono campi di testo: si possono scrivere con la virgola, come si usa in italiano.
  const decimal=x.type==='number',type=decimal?'text':x.type||'text',value=x.type==='number'&&typeof x.value==='number'?fmtNum(x.value,x.value%1?Math.min(3,String(x.value).split('.')[1]?.length||1):0).replace(/\./g,''):x.value;
  return lab+`<input id="${id}" type="${type}" value="${esc(value??'')}" autocomplete="off" spellcheck="false"${decimal?' inputmode="decimal"':''}${desc}>`+hint};
 pane.className='modal'+(opts.wide?' wide':'');
 const extra=(opts.buttons||[]).map((b,i)=>`<button type="button" class="btn${i?'':' left'}" id="dlgBtn${i}">${esc(b.label)}</button>`).join('');
 pane.innerHTML=`<h2 id="dlgTitle">${esc(title)}</h2><div id="dlgBody" class="dlg-body">${body}</div><form id="dialogForm" novalidate>${fields.map(field).join('')}<p class="hint" id="dlgErr" role="alert"></p><div class="modal-actions">${extra}${opts.noCancel?'':'<button type="button" class="btn" id="cancelDlg">Annulla</button>'}<button class="btn primary" type="submit" id="okDlg">${esc(actionLabel)}</button></div></form>`;
 bg.hidden=false;
 const values=()=>{const obj={};for(const x of fields){const el=$('dlg_'+x.id);obj[x.id]=x.type==='checkbox'?el.checked:el.value}return obj};
 for(const x of fields)if(x.type==='range'){const el=$('dlg_'+x.id),f=x.fmt||String;el.addEventListener('input',()=>{const t=f(Number(el.value));$('dlg_'+x.id+'_o').textContent=t;el.setAttribute('aria-valuetext',t)})}
 const finish=v=>{opts.onClose?.();bg.hidden=true;bg.onkeydown=null;bg.onmousedown=null;pane.innerHTML='';if(opts.restore!==false)refocus(prev);resolve(v)};
 if($('cancelDlg'))$('cancelDlg').onclick=()=>finish(null);
 (opts.buttons||[]).forEach((b,i)=>{$('dlgBtn'+i).onclick=()=>b.run(values(),pane)});
 $('dialogForm').onsubmit=e=>{e.preventDefault();const v=values(),bad=opts.validate?.(v);if(bad){const err=typeof bad==='string'?{msg:bad}:bad;$('dlgErr').textContent=err.msg;if(err.field)$('dlg_'+err.field)?.focus();return}finish(v)};
 bg.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(null)}else trapTab(e,pane)};
 bg.onmousedown=e=>{if(e.target===bg)finish(null)};
 opts.onOpen?.(pane,finish);
 setTimeout(()=>{const f=fields[0]?$('dlg_'+fields[0].id):(pane.querySelector('[data-autofocus]')||$('okDlg'));f?.focus({preventScroll:!fields[0]});pane.scrollTop=0;if(f?.select&&f.type==='text')f.select()},0);
});}
async function confirmAction(message,label='Continua'){return (await modal('Conferma',esc(message),[],label))!==null}
const overlayOpen=()=>!$('modalbg').hidden||!$('palettebg').hidden||!$('filepanel').hidden||!$('menu').hidden;
const tip=$('tip');let tipTimer;
function showTip(el){const t=el.dataset.tip;if(!t||!el.isConnected)return;tip.textContent=t;tip.hidden=false;const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;let x=Math.min(innerWidth-w-6,Math.max(6,r.left+r.width/2-w/2)),y=r.bottom+6;if(y+h>innerHeight-4)y=r.top-h-6;tip.style.left=x+'px';tip.style.top=y+'px'}
function hideTip(){clearTimeout(tipTimer);tip.hidden=true}
// Preferenze: tema, contrasto e ultime scelte di esportazione.
const prefs={theme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light',contrast:matchMedia('(prefers-contrast: more)').matches,exportFormat:'jpeg',exportQuality:90,exportSize:'orig',drawFormat:'png'};
const PREFS_KEY='tassello-grafica.preferenze';
try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREFS_KEY)||'{}'))}catch(e){}
function savePrefs(){try{localStorage.setItem(PREFS_KEY,JSON.stringify(prefs))}catch(e){}}
function applyPrefs(){document.documentElement.dataset.theme=prefs.theme==='dark'?'dark':'light';document.documentElement.dataset.contrast=prefs.contrast?'high':'normal';themeChanged()}
// Colori del tema letti dalle variabili CSS, per disegnare l'istogramma anche in contrasto elevato.
let palette={};
function themeChanged(){const probe=document.createElement('span');document.body.append(probe);const read=v=>{probe.style.color=`var(${v})`;return getComputedStyle(probe).color};palette=Object.fromEntries(['--hist-bg','--hist-l','--hist-r','--hist-g','--hist-b','--hist-clip','--accent','--text-3','--line'].map(v=>[v.slice(2),read(v)]));probe.remove();redrawAll?.()}
let redrawAll=null;
// Lavori lunghi: messaggio nella barra di stato e cursore di attesa; gli errori diventano un messaggio leggibile.
async function work(label,fn){status(label+'…');document.body.style.cursor='progress';await new Promise(r=>setTimeout(r,30));try{return await fn()}catch(e){console.error(e);toast(e.message||String(e));return null}finally{document.body.style.cursor='';status()}}
function status(text){$('statusText').textContent=text||'Pronto'}
