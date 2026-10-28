// Kit del marchio: i colori, i caratteri e il logo di chi impagina, salvati nel browser come i modelli dell'utente. Se ne
// tengono quanti se ne vuole (uno per cliente, per attività, per evento) e uno è quello in uso: Il mio marchio lo applica
// al documento come un tema (con il contrasto controllato), i Temi di colore e la galleria dei modelli li offrono tutti.
const PG_BRAND_KEY='tassello-ufficio.impagina.marchio',PG_BRANDS_KEY='tassello-ufficio.impagina.marchi';
const PG_BRAND_NEW={name:'Il mio marchio',accent:'#2457c5',dark:'#14213d',accent2:'#e8a33d',soft:'#e7edfa',head:'Georgia',body:'Segoe UI',logo:null};
Pg.brand=null;Pg.brands=[];
// Il tema del marchio: il colore principale per gli accenti, quello scuro per i titoli e i fondi scuri, il chiaro per i fondi tenui.
const pgBrandTheme=k=>({bg:'#ffffff',ink:'#1b1b1b',head:k.dark,accent:k.accent,accent2:k.accent2,soft:k.soft,dark:k.dark,light:'#ffffff'});
const pgBrandHead=/^(titolo|titoletto|occhiello|citazione)(Inverso)?$/;
const pgBrandSort=l=>l.sort((a,b)=>a.name.localeCompare(b.name,'it'));
// In IndexedDB ogni kit sta in pbrand:<id> e quello in uso anche in pbrand, dove la 1.8.0 teneva il suo unico kit (senza
// id): alla prima apertura quel kit entra nell'elenco, al posto di quello con lo stesso nome se c'è, e non si perde.
// Senza IndexedDB i kit stanno in localStorage, senza il logo.
async function pgBrandLoad(){try{let cur,list;
 if(db){cur=await storeCall(db,'readonly',st=>st.get('pbrand'));list=await storeCall(db,'readonly',st=>st.getAll(IDBKeyRange.bound('pbrand:','pbrand:￿')))}
 else{cur=JSON.parse(localStorage.getItem(PG_BRAND_KEY)||'null');list=JSON.parse(localStorage.getItem(PG_BRANDS_KEY)||'[]')}
 list=(list||[]).filter(k=>k?.id&&k.name);const old=!!cur?.name&&!list.some(k=>k.id===cur.id);
 if(old){cur.id=list.find(k=>k.name===cur.name)?.id||cur.id||uid();list=[...list.filter(k=>k.id!==cur.id),cur]}
 Pg.brands=pgBrandSort(list);Pg.brand=cur?.name&&list.find(k=>k.id===cur.id)||null;if(old)try{await pgBrandStore([cur])}catch(e){}
 for(const k of list)if(k.logo?.blob&&!Pg.imgs.has(k.logo.id))try{await pgRegister(k.logo.id,k.logo.blob,k.logo.name)}catch(e){}}catch(e){Pg.brand=null;Pg.brands=[]}}
// Scrive i kit cambiati (put), toglie quelli eliminati (del) e ricorda quello in uso.
async function pgBrandStore(put=[],del=[]){const cur=Pg.brand,bare=k=>({...k,logo:null});
 if(db){await storeCall(db,'readwrite',st=>{for(const k of put)st.put(k,'pbrand:'+k.id);for(const id of del)st.delete('pbrand:'+id);if(cur)st.put(cur,'pbrand');else st.delete('pbrand')});return}
 localStorage.setItem(PG_BRANDS_KEY,JSON.stringify(Pg.brands.map(bare)));if(cur)localStorage.setItem(PG_BRAND_KEY,JSON.stringify(bare(cur)));else localStorage.removeItem(PG_BRAND_KEY)}
// Due kit non hanno lo stesso nome: si legge nei menu e nella galleria, e deve bastare per riconoscerli.
function pgBrandName(n,id){n=String(n||'').trim().slice(0,60)||PG_BRAND_NEW.name;const taken=x=>Pg.brands.some(k=>k.id!==id&&k.name.toLowerCase()===x.toLowerCase());let s=n,i=2;while(taken(s))s=`${n} ${i++}`;return s}
// Le anteprime della galleria fatte con un kit si rifanno quando il kit cambia.
function pgBrandForget(id){for(const key of [...pgTplCache.keys()])if(key.endsWith('|b:'+id))pgTplCache.delete(key)}
// Il marchio su un documento: colori come tema, caratteri negli stili, nelle insegne e nelle tabelle, logo nelle cornici
// per immagine vuote che si chiamano «Logo». Serve Pg.p = p per la verifica del contrasto.
function pgBrandDoc(p,k=Pg.brand){const old=Pg.p;Pg.p=p;let r;try{const was=new Set([...pgLayout(p,pgViewInstances(p)).values()].filter(v=>v.over).map(v=>v.it.story));r=pgThemeDoc(p,pgBrandTheme(k));for(const [n,s] of Object.entries(p.ps))s.font=pgBrandHead.test(n)?k.head:k.body;
 for(const it of pgAllItems(p)){if(it.kind==='sign')it.font=k.head;if(it.kind==='table')it.font=k.body;if(it.kind==='image'&&/^Logo/i.test(it.name)&&!it.img&&!it.field&&k.logo&&Pg.imgs.has(k.logo.id)){Object.assign(it,{img:k.logo.id,fit:'fit',alt:'Logo di '+k.name,deco:false});r.logo=(r.logo||0)+1}}
 // Con i caratteri del marchio un testo può non entrare più: si riduce finché entra.
 const now=new Set([...pgLayout(p,pgViewInstances(p)).values()].filter(v=>v.over&&!was.has(v.it.story)).map(v=>v.it.story));if(now.size)r.fit=pgShrinkAll(p,now).done}finally{Pg.p=old}return r}
// Il kit in uso è quello di Il mio marchio e del logo; applicare un altro kit lo mette in uso.
async function pgBrandUse(k){Pg.brand=k;try{await pgBrandStore()}catch(e){toast('Kit in uso non ricordato: '+e.message)}}
async function pgBrandApply(k=Pg.brand||Pg.brands[0]){if(!k){pgBrandDialog();return}const now=Pg.brand?.id!==k.id;if(now)await pgBrandUse(k);let r;pgEdit('Marchio '+k.name,q=>{r=pgBrandDoc(q,k)},{props:true});pgStoryCss();
 announce(`Marchio «${k.name}» applicato${now&&Pg.brands.length>1?', ora è il kit in uso':''}: colori, caratteri dei titoli (${k.head}) e del testo (${k.body})${r.logo?`, logo in ${r.logo===1?'una cornice':r.logo+' cornici'}`:''}${r.fit?.length?`; testo ridotto per entrare in ${r.fit.map(x=>x.name).join(', ')}`:''}${r.fixed?`; corretti ${r.fixed===1?'uno sfondo':r.fixed+' sfondi'} per il contrasto`:''}.${r.left?` ${r.left===1?'Un testo':r.left+' testi'} da controllare con la verifica.`:''} Ctrl+Z torna a prima.`)}
// Inserisce il logo del marchio in alto a destra, dentro i margini, nelle sue proporzioni.
function pgBrandLogo(){const k=Pg.brand,m=k?.logo&&Pg.imgs.get(k.logo.id);if(!m){toast(k?`Il kit «${k.name}» non ha un logo: sceglilo in Kit del marchio`:'Prima prepara il kit del marchio, con il logo');if(!k)pgBrandDialog();return}
 const i=pgInner(Pg.p),h=Math.min(i.h*.12,i.w*.3*m.h/m.w),w=h*m.w/m.h,it=pgAdd('image',{name:'Logo',img:k.logo.id,fit:'fit',alt:'Logo di '+k.name,deco:false,x:i.x+i.w-w,y:i.y,w,h});announce(`Logo di «${k.name}» inserito in alto a destra, con il testo alternativo «${it.alt}». Spostalo con le frecce.`)}
// Anteprima di un kit, solo per chi vede (chi ascolta ha la descrizione): i quattro colori, i due caratteri e il logo.
function pgBrandSw(k){const m=k.logo&&Pg.imgs.get(k.logo.id),f=s=>esc(s).replace(/"/g,'');return `<svg viewBox="0 0 120 60" aria-hidden="true" focusable="false"><rect width="120" height="60" fill="${k.soft}"/><rect width="30" height="60" fill="${k.dark}"/><rect x="30" y="46" width="45" height="14" fill="${k.accent}"/><rect x="75" y="46" width="45" height="14" fill="${k.accent2}"/>
 <text x="36" y="26" font-family="${f(k.head)}" font-size="18" fill="${k.dark}">Aa</text><text x="36" y="39" font-family="${f(k.body)}" font-size="9" fill="#1b1b1b">Testo</text>${m?`<image href="${m.url}" x="88" y="6" width="28" height="28" preserveAspectRatio="xMidYMid meet"/>`:''}</svg>`}
const pgBrandSay=k=>`Titoli in ${k.head}, testo in ${k.body}, ${k.logo?`con il logo «${k.logo.name}»`:'senza logo'}.`;
// La finestra dei kit: l'elenco con quello in uso; frecce per scorrerlo, Invio per mettere in uso il kit scelto, F2 per
// rinominarlo, Canc per eliminarlo, e i pulsanti per modificarlo, crearne uno nuovo o duplicarlo. Come nella galleria,
// ogni azione chiude la finestra, fa il suo lavoro e la riapre sul kit giusto dicendo che cosa è successo.
async function pgBrandDialog({pick=Pg.brand?.id,say=''}={}){await pgBrandLoad();if(!Pg.brands.length){pgBrandEdit();return}
 const list=Pg.brands;let cur=Math.max(0,list.findIndex(k=>k.id===pick)),act=null;const count=()=>`${list.length===1?'Un kit':list.length+' kit'}${Pg.brand?`, in uso «${Pg.brand.name}»`:''}`;
 const body=`<p id="brandIntro">I kit restano in questo browser${db?'':' (i loghi no: questo browser non permette di salvarli)'}. Quello in uso si applica con Il mio marchio; tutti si trovano nei Temi di colore e nella galleria dei modelli. Frecce per scorrere, Invio per usare il kit scelto, F2 per rinominarlo, Canc per eliminarlo.</p>
  <p class="pg-tpl-count" id="brandCount">${esc(count())}</p><div class="lb pg-tpl-list pg-brand-list" id="brandList" role="listbox" tabindex="0" aria-labelledby="brandCount" data-autofocus>${list.map((k,i)=>`<div role="option" id="pbo-${i}" class="lb-item pg-tpl-item" aria-selected="false"><span class="pg-brand-sw">${pgBrandSw(k)}</span><span class="n"><b>${esc(k.name)}</b><span class="sr-only">. </span><span class="d">${k===Pg.brand?'In uso. ':''}${esc(pgBrandSay(k))}</span></span></div>`).join('')}</div>
  <p class="pg-btns" id="brandBtns">${[['edit','Modifica…'],['new','Nuovo kit…'],['dup','Duplica'],['rename','Rinomina…'],['delete','Elimina'],...(Pg.p?[['apply','Usa e applica al documento']]:[])].map(([k,l])=>`<button type="button" class="btn sm" data-b="${k}">${l}</button>`).join('')}</p>`;
 const v=await modal('Kit del marchio',body,[],'Usa questo kit',{wide:true,onOpen:(pane,finish)=>{pane.setAttribute('aria-describedby','brandIntro');const L=$('brandList');
  const show=()=>{L.querySelectorAll('[role=option]').forEach((o,i)=>{o.setAttribute('aria-selected',i===cur);o.classList.toggle('active',i===cur)});L.setAttribute('aria-activedescendant','pbo-'+cur);$('pbo-'+cur)?.scrollIntoView({block:'nearest'})},go=j=>{cur=clampV(j,0,list.length-1);show()},run=k=>{act=k;finish(null)};
  L.onkeydown=e=>{const k=e.key;if(k==='ArrowDown'||k==='ArrowRight')go(cur+1);else if(k==='ArrowUp'||k==='ArrowLeft')go(cur-1);else if(k==='Home')go(0);else if(k==='End')go(list.length-1);
   else if(k==='Enter')finish({});else if(k==='F2')run('rename');else if(k==='Delete')run('delete');
   else if(k.length===1&&/\S/.test(k)&&!e.ctrlKey&&!e.altKey){const q=k.toLowerCase(),j=[...list.keys()].map(x=>(cur+1+x)%list.length).find(x=>list[x].name.toLowerCase().startsWith(q));if(j!=null)go(j)}else return;e.preventDefault()};
  L.onclick=e=>{const o=e.target.closest('[role=option]');if(o){cur=+o.id.slice(4);show()}};L.ondblclick=e=>{if(e.target.closest('[role=option]'))finish({})};
  pane.querySelector('#brandBtns').onclick=e=>{const b=e.target.closest('[data-b]');if(b)run(b.dataset.b)};show();
  setTimeout(()=>announce(say+count()+'. Frecce per scegliere, Invio per usarlo.'),400)}});
 $('modal').setAttribute('aria-describedby','dlgBody');const k=list[cur];
 if(v){await pgBrandUse(k);announce(`Ora è in uso il kit «${k.name}»: Il mio marchio e Logo del marchio usano i suoi colori, caratteri e logo.`);return}
 if(act==='apply'){pgBrandApply(k);return}if(act==='edit'||act==='new'){pgBrandEdit(act==='edit'?k:null,true);return}
 if(act==='dup'){const c={...k,id:uid(),name:pgBrandName(k.name+' (copia)'),ts:Date.now()};Pg.brands=pgBrandSort([...list,c]);try{await pgBrandStore([c])}catch(e){toast('Kit non duplicato: '+e.message);return}pgBrandDialog({pick:c.id,say:`Kit duplicato: «${c.name}». `});return}
 if(act==='rename'){const r=await modal('Rinomina il kit','<p>Il nome si legge nei Temi di colore, nella galleria dei modelli e nel testo alternativo del logo che inserirai.</p>',[{id:'n',label:'Nome del kit',value:k.name}],'Rinomina');let say='';
  if(r){const was=k.name;k.name=pgBrandName(r.n,k.id);pgBrandSort(list);try{await pgBrandStore([k])}catch(e){k.name=was;toast('Kit non rinominato: '+e.message)}if(k.name!==was){pgBrandForget(k.id);say=`Kit «${was}» rinominato in «${k.name}». `}}pgBrandDialog({pick:k.id,say});return}
 if(act==='delete'){if(!(await confirmAction(`Eliminare il kit «${k.name}»? Non si può annullare. I documenti a cui l’hai già applicato restano come sono.`))){pgBrandDialog({pick:k.id});return}
  const nb=list[cur+1]||list[cur-1],was=Pg.brand;Pg.brands=list.filter(x=>x!==k);if(was===k)Pg.brand=Pg.brands[0]||null;try{await pgBrandStore([],[k.id])}catch(e){Pg.brands=list;Pg.brand=was;toast('Kit non eliminato: '+e.message);return}pgBrandForget(k.id);
  const say=`Kit «${k.name}» eliminato.${was===k&&Pg.brand?` Ora è in uso «${Pg.brand.name}».`:''} `;if(Pg.brands.length)pgBrandDialog({pick:nb?.id,say});else announce(say+'Non ci sono altri kit: Kit del marchio ne crea uno nuovo.')}}
// La finestra di un kit: nome, quattro colori, due caratteri e il logo, con l'anteprima; i colori si possono prendere dal
// documento aperto. Un kit nuovo va subito in uso. Se si arriva dall'elenco dei kit, dopo si torna lì.
async function pgBrandEdit(k=null,back=false){const base=k||{...PG_BRAND_NEW,name:pgBrandName(PG_BRAND_NEW.name)},font=(id,label,v)=>({id,label,type:'select',value:v,options:FONTS.map(f=>({value:f,label:f}))});let logo=base.logo;
 const v=await modal(k?`Modifica il kit «${k.name}»`:'Nuovo kit del marchio',`<p>I colori, i caratteri e il logo restano in questo browser${db?'':' (il logo no: questo browser non permette di salvarlo)'}. ${k?'':'Il kit nuovo diventa quello in uso: '}Il mio marchio lo applica al documento; lo trovi anche nei Temi di colore e nella galleria dei modelli.</p><div class="pg-brand-prev" id="brandPrev">${pgBrandSw(base)}</div><p class="pg-btns"><button type="button" class="btn sm" id="brandLogo">Scegli il logo…</button>${Pg.p?'<button type="button" class="btn sm" id="brandFrom">Prendi colori e caratteri dal documento</button>':''}</p><p id="brandLogoSay" class="hint" aria-live="polite">${logo?`Logo: «${esc(logo.name)}».`:'Nessun logo.'}</p>`,
  [{id:'name',label:'Nome del kit',value:base.name},{id:'accent',label:'Colore principale, per gli accenti',type:'color',value:base.accent},{id:'dark',label:'Colore scuro, per i titoli e i fondi scuri',type:'color',value:base.dark},{id:'accent2',label:'Secondo colore',type:'color',value:base.accent2},{id:'soft',label:'Colore chiaro, per i fondi tenui',type:'color',value:base.soft},font('head','Carattere dei titoli',base.head),font('body','Carattere del testo',base.body),...(logo?[{id:'nologo',label:'Togli il logo dal kit',type:'checkbox',value:false}]:[])],k?'Salva il kit':'Crea il kit',{onOpen:pane=>{
  const val=id=>pane.querySelector('#dlg_'+id)?.value,prev=()=>{pane.querySelector('#brandPrev').innerHTML=pgBrandSw({accent:val('accent'),dark:val('dark'),accent2:val('accent2'),soft:val('soft'),head:val('head'),body:val('body'),logo:pane.querySelector('#dlg_nologo')?.checked?null:logo})};const form=pane.querySelector('#dialogForm');form.addEventListener('input',prev);form.addEventListener('change',prev);
  pane.querySelector('#brandLogo').onclick=()=>{const inp=Object.assign(document.createElement('input'),{type:'file',accept:'image/*'});inp.onchange=async()=>{const f=inp.files[0];if(!f)return;logo={id:'marchio-'+uid(),blob:f,name:f.name};try{await pgRegister(logo.id,f,f.name)}catch(e){logo=null;pane.querySelector('#brandLogoSay').textContent=`«${f.name}» non è un’immagine che il browser sa leggere.`;return}pane.querySelector('#brandLogoSay').textContent=`Logo scelto: «${f.name}». Si salva con il kit.`;const no=pane.querySelector('#dlg_nologo');if(no)no.checked=false;prev()};inp.click()};
  const from=pane.querySelector('#brandFrom');if(from)from.onclick=()=>{const p=Pg.p,fills=pgAllItems(p).map(x=>x.fill).filter(c=>c&&c!=='none'),by=c=>pgLum(c)??.5,dark=[p.ps.titolo?.color,...fills].filter(Boolean).sort((a,b)=>by(a)-by(b))[0],mid=fills.find(c=>by(c)>.08&&by(c)<.5),soft=fills.find(c=>by(c)>.6&&c!==p.bg),set=(id,c)=>{if(c)pane.querySelector('#dlg_'+id).value=c};
   set('dark',dark);set('accent',p.ps.occhiello?.color||mid);set('accent2',fills.find(c=>c!==mid&&by(c)>.08&&by(c)<.6));set('soft',soft);pane.querySelector('#dlg_head').value=p.ps.titolo?.font||'Georgia';pane.querySelector('#dlg_body').value=p.ps.corpo?.font||'Segoe UI';prev();announce('Colori e caratteri presi dal documento: controllali e salva il kit')}}});
 if(!v){if(back&&Pg.brands.length)pgBrandDialog({pick:k?.id});return}if(v.nologo)logo=null;
 const nk={...base,id:k?.id||uid(),name:pgBrandName(v.name,k?.id),accent:v.accent,dark:v.dark,accent2:v.accent2,soft:v.soft,head:v.head,body:v.body,logo,ts:Date.now()},was=[Pg.brands,Pg.brand];
 Pg.brands=pgBrandSort([...Pg.brands.filter(x=>x.id!==nk.id),nk]);if(!k||Pg.brand?.id===nk.id)Pg.brand=nk;
 try{if(logo?.blob&&!Pg.imgs.has(logo.id))await pgRegister(logo.id,logo.blob,logo.name);await pgBrandStore([nk])}catch(e){[Pg.brands,Pg.brand]=was;toast('Kit non salvato: '+e.message);return}pgBrandForget(nk.id);
 const lt=pgContrast(nk.dark,'#ffffff')??0,la=pgContrast(nk.accent,'#ffffff')??0,say=`Kit «${nk.name}» ${k?'salvato':'creato e in uso'}${logo?' con il logo':''}.${lt<4.5?' Il colore scuro è poco scuro: i titoli su fondo bianco potrebbero non avere abbastanza contrasto, applicandolo Impagina li corregge.':la<3?' Il colore principale è chiaro: le scritte in quel colore su fondo bianco si leggono poco, applicandolo Impagina le corregge.':''} `;
 if(back)pgBrandDialog({pick:nk.id,say});else announce(say+'Applicalo con Il mio marchio, nei Temi di colore.')}
