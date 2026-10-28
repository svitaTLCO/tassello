// Raccolta di elementi: frecce, forme, cornici decorative e icone semplici, disegnati qui come tracciati SVG (niente da
// scaricare). Ogni elemento è una cornice «Elemento» con il riempimento, il contorno e gli effetti delle forme; nasce
// decorativo, e se porta un significato (un'icona accanto a un numero di telefono) si descrive nel testo alternativo.
const pgPolyD=(w,h,pts)=>pts.map(([u,v],i)=>`${i?'L':'M'}${pr2(u*w)} ${pr2(v*h)}`).join('')+'Z';
const pgRectD=(x,y,w,h)=>`M${pr2(x)} ${pr2(y)}h${pr2(w)}v${pr2(h)}h${pr2(-w)}Z`;
const pgStarD=(w,h,n,r)=>pgPolyD(w,h,Array.from({length:n*2},(_,i)=>{const a=-Math.PI/2+i*Math.PI/n,k=i%2?r:1;return [.5+.5*k*Math.cos(a),.5+.5*k*Math.sin(a)]}));
// [id, nome, gruppo, disegno, opzioni]: il disegno è una funzione della larghezza e dell'altezza, oppure (con g) un tracciato
// in una griglia di g unità che resta in proporzione al centro della cornice; e usa la regola pari e dispari per i buchi.
const PG_ELEMS=[
 ['frecciaD','Freccia a destra','Frecce',(w,h)=>pgPolyD(w,h,[[0,.32],[.6,.32],[.6,.06],[1,.5],[.6,.94],[.6,.68],[0,.68]])],
 ['frecciaS','Freccia a sinistra','Frecce',(w,h)=>pgPolyD(w,h,[[1,.32],[.4,.32],[.4,.06],[0,.5],[.4,.94],[.4,.68],[1,.68]])],
 ['frecciaSu','Freccia in su','Frecce',(w,h)=>pgPolyD(w,h,[[.32,1],[.32,.4],[.06,.4],[.5,0],[.94,.4],[.68,.4],[.68,1]])],
 ['frecciaGiu','Freccia in giù','Frecce',(w,h)=>pgPolyD(w,h,[[.32,0],[.32,.6],[.06,.6],[.5,1],[.94,.6],[.68,.6],[.68,0]])],
 ['frecciaDoppia','Freccia doppia','Frecce',(w,h)=>pgPolyD(w,h,[[0,.5],[.25,.06],[.25,.32],[.75,.32],[.75,.06],[1,.5],[.75,.94],[.75,.68],[.25,.68],[.25,.94]])],
 ['gallone','Gallone','Frecce',(w,h)=>pgPolyD(w,h,[[0,0],[.62,0],[1,.5],[.62,1],[0,1],[.38,.5]])],
 ['frecciaCurva','Freccia curva','Frecce',(w,h)=>{const X=u=>pr2(u*w),Y=v=>pr2(v*h);return `M${X(.06)} ${Y(1)}C${X(.06)} ${Y(.45)} ${X(.33)} ${Y(.24)} ${X(.66)} ${Y(.24)}V${Y(0)}L${X(1)} ${Y(.38)}L${X(.66)} ${Y(.76)}V${Y(.52)}C${X(.45)} ${Y(.52)} ${X(.3)} ${Y(.66)} ${X(.3)} ${Y(1)}Z`}],
 ['nastro','Nastro','Forme',(w,h)=>pgPolyD(w,h,[[0,.12],[1,.12],[.9,.5],[1,.88],[0,.88],[.1,.5]])],
 ['etichetta','Etichetta','Forme',(w,h)=>{const r=Math.min(w,h)*.08;return pgPolyD(w,h,[[0,0],[.76,0],[1,.5],[.76,1],[0,1]])+`M${pr2(w*.78-r)} ${pr2(h/2)}a${pr2(r)} ${pr2(r)} 0 1 0 ${pr2(2*r)} 0a${pr2(r)} ${pr2(r)} 0 1 0 ${pr2(-2*r)} 0Z`},{e:1}],
 ['fumetto','Fumetto','Forme',(w,h)=>{const r=Math.min(w,h)*.08,b=h*.74,X=u=>pr2(u*w);return `M${pr2(r)} 0H${pr2(w-r)}Q${pr2(w)} 0 ${pr2(w)} ${pr2(r)}V${pr2(b-r)}Q${pr2(w)} ${pr2(b)} ${pr2(w-r)} ${pr2(b)}H${X(.42)}L${X(.16)} ${pr2(h)}L${X(.24)} ${pr2(b)}H${pr2(r)}Q0 ${pr2(b)} 0 ${pr2(b-r)}V${pr2(r)}Q0 0 ${pr2(r)} 0Z`}],
 ['bollino','Bollino dentellato','Forme',(w,h)=>pgStarD(w,h,18,.84),{k:1}],
 ['stella','Stella','Forme',(w,h)=>pgStarD(w,h,5,.42),{k:1}],
 ['cuore','Cuore','Forme',(w,h)=>{const X=u=>pr2(u*w),Y=v=>pr2(v*h);return `M${X(.5)} ${Y(.95)}C${X(.1)} ${Y(.68)} ${X(0)} ${Y(.42)} ${X(0)} ${Y(.27)}C${X(0)} ${Y(.08)} ${X(.18)} ${Y(0)} ${X(.3)} ${Y(0)}C${X(.4)} ${Y(0)} ${X(.47)} ${Y(.06)} ${X(.5)} ${Y(.16)}C${X(.53)} ${Y(.06)} ${X(.6)} ${Y(0)} ${X(.7)} ${Y(0)}C${X(.82)} ${Y(0)} ${X(1)} ${Y(.08)} ${X(1)} ${Y(.27)}C${X(1)} ${Y(.42)} ${X(.9)} ${Y(.68)} ${X(.5)} ${Y(.95)}Z`},{k:1}],
 ['onda','Fascia a onda','Forme',(w,h)=>{const X=u=>pr2(u*w),Y=v=>pr2(v*h);return `M0 ${Y(.35)}C${X(.25)} ${Y(0)} ${X(.5)} ${Y(.7)} ${X(.75)} ${Y(.3)}C${X(.86)} ${Y(.12)} ${X(.94)} ${Y(.15)} ${X(1)} ${Y(.25)}V${Y(1)}H0Z`}],
 ['bordoDoppio','Cornice a doppio filo','Cornici',(w,h)=>{const t=Math.min(w,h)*.012;return pgRectD(0,0,w,h)+pgRectD(t,t,w-2*t,h-2*t)+pgRectD(3*t,3*t,w-6*t,h-6*t)+pgRectD(3.6*t,3.6*t,w-7.2*t,h-7.2*t)},{e:1}],
 ['angoli','Angoli','Cornici',(w,h)=>{const L=Math.min(w,h)*.16,t=Math.min(w,h)*.018;return [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]].map(([x,y,sx,sy])=>`M${pr2(x)} ${pr2(y)}h${pr2(sx*L)}v${pr2(sy*t)}h${pr2(-sx*(L-t))}v${pr2(sy*(L-t))}h${pr2(-sx*t)}Z`).join('')}],
 ['filetti','Filetti sopra e sotto','Cornici',(w,h)=>{const t=Math.min(w,h)*.012;return pgRectD(0,0,w,t)+pgRectD(0,2.4*t,w,t*.6)+pgRectD(0,h-t,w,t)+pgRectD(0,h-3*t,w,t*.6)}],
 ['telefono','Telefono','Icone','M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM7.5 5v12.5h9V5zM12 18.6a1 1 0 1 0 0 2 1 1 0 1 0 0-2z',{g:24,e:1}],
 ['posta','Posta','Icone','M2 5h20v14H2zM4 7.5V17h16V7.5l-8 5.6z',{g:24,e:1}],
 ['posizione','Posizione','Icone','M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zM12 6.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 1 0 0-5.4z',{g:24,e:1}],
 ['orologio','Orologio','Icone','M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM12 4.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 1 1 0-15.6zM11 6.5h2v5l3.6 2.1-1 1.7-4.6-2.7z',{g:24,e:1}],
 ['calendario','Calendario','Icone','M3 5h18v16H3zM5 10v9h14v-9zM7 2h2v5H7zM15 2h2v5h-2zM7 12h3v3H7z',{g:24,e:1}],
 ['casa','Casa','Icone','M12 3l10 9h-3v9h-5v-6h-4v6H5v-9H2z',{g:24}],
 ['persona','Persona','Icone','M12 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9zM3 21c0-4.5 4-7.5 9-7.5s9 3 9 7.5z',{g:24}],
 ['sito','Sito internet','Icone','M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM12 3.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 1 1 0-16.4zM12 3.8c-2.3 2.3-3.6 5-3.6 8.2s1.3 5.9 3.6 8.2c2.3-2.3 3.6-5 3.6-8.2s-1.3-5.9-3.6-8.2zM12 6.2c-1.4 1.8-2 3.7-2 5.8s.6 4 2 5.8c1.4-1.8 2-3.7 2-5.8s-.6-4-2-5.8zM3.8 11.1h16.4v1.8H3.8z',{g:24,e:1}],
 ['spunta','Spunta','Icone','M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM10.4 16.6 5.6 11.8l1.5-1.5 3.3 3.3 6.5-6.5 1.5 1.5z',{g:24,e:1}],
 ['info','Informazioni','Icone','M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20zM11 10h2v8h-2zM12 5.8a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6z',{g:24,e:1}],
 ['carrello','Carrello','Icone','M2 3h3.2l.8 3H22l-2.5 8.5H8.2l.6 2.5H20v2H7.2L4 5H2zM9 20a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3zM18 20a1.5 1.5 0 1 0 0 3 1.5 1.5 0 1 0 0-3z',{g:24}]];
const PG_ELEM_BY=Object.fromEntries(PG_ELEMS.map(e=>[e[0],e])),PG_ELEM_GROUPS=['Frecce','Forme','Cornici','Icone'];
// Il tracciato di un elemento in coordinate della pagina: d e la matrice che lo porta nella cornice.
function pgElemPath(it){const E=PG_ELEM_BY[it.shape]||PG_ELEMS[0],o=E[4]||{},w=Math.abs(it.w),h=Math.abs(it.h);if(o.g){const s=Math.min(w,h)/o.g;return {d:E[3],m:[s,0,0,s,it.x+(w-s*o.g)/2,it.y+(h-s*o.g)/2],rule:o.e}}return {d:E[3](w,h),m:[1,0,0,1,it.x,it.y],rule:o.e}}
function pgElemSvg(it,paint,op){const P=pgElemPath(it);return `<path transform="matrix(${P.m.map(v=>+v.toFixed(4)).join(' ')})" d="${P.d}"${P.rule?' fill-rule="evenodd"':''} ${paint}${P.m[0]!==1?' vector-effect="non-scaling-stroke"':''} stroke-linejoin="round"${op}/>`}
// La finestra della raccolta: il gruppo e l'elenco con le anteprime; le frecce scelgono, Invio inserisce.
async function pgElemDialog(){let group='',list=[],cur=0;const prev=E=>{const s=E[4]?.k||E[4]?.g?40:E[2]==='Frecce'?[48,26]:[48,32],[w,h]=Array.isArray(s)?s:[s,s],P=pgElemPath({shape:E[0],x:0,y:0,w,h});return `<svg viewBox="-2 -2 ${w+4} ${h+4}" width="${w+4}" height="${h+4}" aria-hidden="true" focusable="false"><path transform="matrix(${P.m.join(' ')})" d="${P.d}"${P.rule?' fill-rule="evenodd"':''} fill="currentColor"/></svg>`};
 const v=await modal('Elementi',`<p id="elIntro">Frecce, forme, cornici decorative e icone, disegnati qui: frecce per scegliere, Invio per inserire. Nascono decorativi; se un’icona porta un significato, scrivilo nel testo alternativo.</p><div class="pg-tpl-bar"><div><label for="elGroup">Gruppo</label><select id="elGroup"><option value="">Tutti</option>${PG_ELEM_GROUPS.map(g=>`<option>${g}</option>`).join('')}</select></div></div><div class="lb pg-el-list" id="elList" role="listbox" tabindex="0" aria-label="Elementi" data-autofocus></div>`,[],'Inserisci',{onOpen:(pane,finish)=>{pane.setAttribute('aria-describedby','elIntro');const L=$('elList');
  const show=()=>{L.querySelectorAll('[role=option]').forEach((o,i)=>{o.setAttribute('aria-selected',i===cur);o.classList.toggle('active',i===cur)});L.setAttribute('aria-activedescendant','elo-'+cur);$('elo-'+cur)?.scrollIntoView({block:'nearest'})};
  const render=()=>{list=PG_ELEMS.filter(e=>!group||e[2]===group);cur=0;L.innerHTML=list.map((e,i)=>`<div role="option" id="elo-${i}" class="lb-item pg-el-item" aria-selected="false"><span class="pg-el-thumb">${prev(e)}</span><span class="n">${esc(e[1])}<span class="d">${esc(e[2])}</span></span></div>`).join('');show()};render();
  $('elGroup').onchange=()=>{group=$('elGroup').value;render();announce(`${list.length} elementi${group?' nel gruppo '+group:''}`)};
  L.onkeydown=e=>{const k=e.key;if(k==='ArrowDown'||k==='ArrowRight')cur=Math.min(list.length-1,cur+1);else if(k==='ArrowUp'||k==='ArrowLeft')cur=Math.max(0,cur-1);else if(k==='Home')cur=0;else if(k==='End')cur=list.length-1;else if(k==='Enter'){e.preventDefault();finish({});return}
   else if(k.length===1&&/\S/.test(k)&&!e.ctrlKey&&!e.altKey){const q=k.toLowerCase(),j=[...list.keys()].map(x=>(cur+1+x)%list.length).find(x=>list[x][1].toLowerCase().startsWith(q));if(j==null)return;cur=j}else return;e.preventDefault();show()};
  L.onclick=e=>{const o=e.target.closest('[role=option]');if(o){cur=+o.id.slice(4);show()}};L.ondblclick=e=>{if(e.target.closest('[role=option]'))finish({})}}});
 if(v&&list[cur])pgAddElem(list[cur][0])}
// Inserimento: le icone e le forme tonde quadrate, le frecce larghe, le cornici sui margini e in fondo, sotto le altre.
function pgAddElem(id){const p=Pg.p,i=pgInner(p),E=PG_ELEM_BY[id],g=E[2],m=Math.min(i.w,i.h),vert=id==='frecciaSu'||id==='frecciaGiu';
 const box=g==='Cornici'?{x:i.x,y:i.y,w:i.w,h:i.h}:g==='Icone'?{w:m*.14,h:m*.14}:E[4]?.k?{w:m*.3,h:m*.3}:g==='Frecce'?(vert?{w:m*.16,h:m*.35}:{w:m*.35,h:m*.16}):id==='nastro'?{w:i.w*.7,h:i.w*.16}:id==='fumetto'?{w:m*.45,h:m*.32}:id==='onda'?{x:0,y:p.h*.78,w:p.w,h:p.h*.22}:{w:m*.4,h:m*.2};
 const fill=g==='Cornici'?p.ps.titolo?.color||'#1b1b1b':p.ps.occhiello?.color||'#b35500',it=pgAdd('shape',{shape:id,name:pgNextElemName(p,E[1]),fill,...box});
 if(g==='Cornici'||id==='onda'){const h=pgHolder();pgEdit('In fondo',()=>{h.items.splice(h.items.indexOf(it),1);h.items.unshift(it)})}
 announce(`Inserito l’elemento «${it.name}»${g==='Cornici'?' sui margini, in fondo sotto le altre cornici':id==='onda'?' in fondo alla pagina, sotto le altre cornici':' al centro della pagina'}. È decorativo; colore e contorno sono nelle proprietà.`)}
function pgNextElemName(p,base){const used=new Set(pgAllItems(p).map(x=>x.name));let n=1;while(used.has(base+' '+n))n++;return base+' '+n}
function pgElemProps(it){const E=PG_ELEM_BY[it.shape]||PG_ELEMS[0];return ppS('shape','Elemento',it.shape,PG_ELEMS.filter(e=>e[2]===E[2]).map(e=>[e[0],e[1]]))}
