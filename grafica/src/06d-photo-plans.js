// Piani: percorsi guidati secondo quello che si vuole ottenere. Sono dati, non codice: ogni passo dice quali
// controlli mostrare, che cosa spiegare e quale proposta applicare la prima volta che ci si arriva.
// auto: 'light' (luce automatica), 'color' (bilanciamento del bianco automatico), 'all', valori della ricetta,
// oppure un elenco di questi applicati in ordine. export: le scelte proposte nella finestra Esporta.
const PLANS=[
 {id:'libera',name:'Tutti i controlli',desc:'Nessun piano: inquadratura, luce, colore, effetti e look insieme.'},
 {id:'social',name:'Foto per i social',desc:'Il formato giusto, una luce viva e un file leggero.',steps:[
  {title:'Formato',text:'Scegli il formato: 4:5 per i post, 9:16 per le storie, quadrato per tutto il resto. Poi sposta il ritaglio sul soggetto.',controls:['ratio','cx','cy'],auto:{ratio:'4:5'}},
  {title:'Luce',text:'La proposta porta la luce a un livello medio e recupera le zone troppo chiare o troppo scure. Ritocca a occhio.',controls:['exposure','contrast','highlights','shadows'],auto:'light'},
  {title:'Colore',text:'Vividezza ravviva i colori spenti senza esagerare con la pelle; un look dà carattere a tutta la foto.',controls:['vibrance','temp','look','lookAmt'],auto:{adj:{vibrance:20}}},
  {title:'Esporta',text:'JPEG di 2048 pixel sul lato lungo: nitido sui telefoni e leggero da inviare.',export:{format:'jpeg',size:'2048',quality:85}}]},
 {id:'ritratto',name:'Ritratto',desc:'Pelle naturale, volto in luce, sfondo che non distrae.',steps:[
  {title:'Inquadratura',text:'Il formato verticale 4:5 o 2:3 lascia spazio al volto. Raddrizza se la foto è storta.',controls:['ratio','cx','cy','angle'],auto:{ratio:'4:5'}},
  {title:'Luce sul volto',text:'Apri le ombre per schiarire il viso senza bruciare le parti chiare.',controls:['exposure','shadows','highlights','contrast'],auto:['light',{adj:{contrast:0}}]},
  {title:'Pelle',text:'Temperatura e tinta tolgono le dominanti: la pelle deve sembrare naturale. Meglio la vividezza della saturazione.',controls:['temp','tint','vibrance','saturation'],auto:'color'},
  {title:'Rifinitura',text:'Una vignettatura leggera porta lo sguardo al centro.',controls:['vignette','look','lookAmt'],auto:{adj:{vignette:-20}}},
  {title:'Esporta',text:'JPEG alla dimensione originale, di alta qualità.',export:{format:'jpeg',size:'orig',quality:92}}]},
 {id:'paesaggio',name:'Paesaggio',desc:'Orizzonte dritto, cielo e ombre con i loro dettagli, colori vivi.',steps:[
  {title:'Orizzonte',text:'Raddrizza l’orizzonte e scegli il formato: il panoramico 16:9 o il 3:2 danno respiro.',controls:['angle','ratio','cx','cy']},
  {title:'Luce',text:'Abbassa le alte luci per ritrovare il cielo e apri le ombre per i dettagli a terra.',controls:['exposure','highlights','shadows','whites','blacks'],auto:['light',{adj:{highlights:-30,shadows:20}}]},
  {title:'Colore',text:'Vividezza e una temperatura un po’ più calda o più fredda cambiano l’atmosfera.',controls:['vibrance','saturation','temp','look','lookAmt'],auto:{adj:{vibrance:25}}},
  {title:'Esporta',text:'JPEG alla dimensione originale, di alta qualità.',export:{format:'jpeg',size:'orig',quality:92}}]},
 {id:'documento',name:'Documento o scontrino',desc:'Dritto, ritagliato e leggibile, in bianco e nero.',steps:[
  {title:'Raddrizza',text:'Ruota la foto finché il testo è orizzontale; Raddrizza corregge di pochi gradi.',controls:['rotate','angle']},
  {title:'Ritaglia',text:'Il formato A4 va bene per i fogli; per uno scontrino lascia il formato della foto.',controls:['ratio','cx','cy']},
  {title:'Leggibilità',text:'La proposta toglie il colore, rende bianco il fondo e scuro il testo. Se le lettere si perdono, abbassa Bianchi o Contrasto.',controls:['exposure','contrast','whites','blacks'],auto:{adj:{saturation:-100,contrast:40,whites:45,blacks:-25}}},
  {title:'Esporta',text:'PNG: le lettere restano nitide. Per un file più leggero scegli JPEG.',export:{format:'png',size:'orig'}}]},
 {id:'prodotto',name:'Prodotto su fondo chiaro',desc:'Fondo bianco pulito e colori fedeli, per un negozio online.',steps:[
  {title:'Formato',text:'I negozi online preferiscono il quadrato: centra il prodotto.',controls:['ratio','cx','cy'],auto:{ratio:'1:1'}},
  {title:'Fondo bianco',text:'Alza Bianchi ed Esposizione finché il fondo è bianco, senza bruciare il prodotto.',controls:['exposure','whites','highlights','shadows'],auto:['light',{adj:{whites:40}}]},
  {title:'Colori fedeli',text:'Togli le dominanti con Temperatura e Tinta: il colore deve essere quello vero.',controls:['temp','tint','vibrance'],auto:'color'},
  {title:'Esporta',text:'JPEG quadrato di 2000 pixel, adatto alla maggior parte dei negozi online.',export:{format:'jpeg',size:'2000',quality:90}}]}];
const planOf=()=>PLANS.find(p=>p.id===I.plan)||PLANS[0];
const planSteps=()=>planOf().steps||[];
const LIGHT_KEYS=['exposure','contrast','highlights','shadows','whites','blacks'];
function proposalValues(auto){const out={adj:{}};for(const p of [].concat(auto)){if(typeof p==='string'){const v=autoValues(geometryPixels()),keys=p==='light'?LIGHT_KEYS:p==='color'?['temp','tint']:[...LIGHT_KEYS,'temp','tint'];for(const k of keys)out.adj[k]=v[k]}else for(const [k,v] of Object.entries(p))if(k==='adj')Object.assign(out.adj,v);else out[k]=v}return out}
function describeChanges(a,b){const out=[];if(a.ratio!==b.ratio)out.push('formato '+ratioName(b.ratio));for(const [id,label,,,,,fmt] of ADJ)if(a.adj[id]!==b.adj[id])out.push(label+' '+fmt(b.adj[id]));if(a.look!==b.look)out.push('look '+lookName(b.look));return out.join(', ')}
// Applica una proposta come una sola modifica, che si annulla con Ctrl+Z; restituisce che cosa è cambiato.
function applyProposal(auto,label){if(!I.bmp)return '';const before=JSON.parse(snap()),p=proposalValues(auto);edit(label,r=>{Object.assign(r.adj,p.adj);for(const [k,v] of Object.entries(p))if(k!=='adj')r[k]=v},{panel:true});return describeChanges(before,I.r)}
function applyAuto(){if(!I.bmp){toast('Apri prima una foto');return}const said=applyProposal('all','Regolazione automatica');announce(said?'Regolazione automatica: '+said:'La foto non ha bisogno di correzioni automatiche')}
const stepIntro=()=>{const p=planOf(),s=p.steps[I.step];return `${p.name}, passo ${I.step+1} di ${p.steps.length}: ${s.title}. ${s.text}`};
// Arrivando a un passo per la prima volta con questa foto si applica la sua proposta.
function enterStep(){const p=planOf(),s=p.steps?.[I.step];if(!s)return '';let said='';const key=p.id+':'+I.step;if(I.bmp&&s.auto&&!I.seen.has(key)){I.seen.add(key);said=applyProposal(s.auto,'Proposta: '+s.title)}return stepIntro()+(said?' Proposta applicata: '+said+'.':'')}
function choosePlan(id){const p=PLANS.find(x=>x.id===id);if(!p)return;I.plan=id;I.step=0;planCursor=PLANS.indexOf(p);renderPlans();renderPanel();refreshToggles();schedulePersist('immagini');announce(p.steps?enterStep():'Tutti i controlli, senza piano')}
function stepGo(dir){const steps=planSteps();if(!steps.length){toast('Scegli prima un piano: Foto per i social, Ritratto, Documento…');return}const i=clamp(I.step+dir,0,steps.length-1);if(i===I.step){toast(dir>0?'È l’ultimo passo: esporta la foto':'È il primo passo');return}I.step=i;renderPanel();schedulePersist('immagini');announce(enterStep())}
function stepAuto(){const s=planSteps()[I.step];if(!s?.auto){toast('Questo passo non ha una proposta');return}if(!I.bmp){toast('Apri prima una foto');return}const said=applyProposal(s.auto,'Proposta: '+s.title);announce(said?'Proposta applicata: '+said:'La proposta è già applicata')}
function planMenu(){const a=menuAnchor('planMenu');openMenu(PLANS.map(p=>({label:p.name,desc:p.desc,checked:p.id===I.plan,run:()=>choosePlan(p.id)})),a.x,a.y,'Piani',a.el)}
