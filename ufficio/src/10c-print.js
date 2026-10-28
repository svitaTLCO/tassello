// Stampa del foglio di calcolo: una tabella semplice con intestazioni di riga e colonna, i valori come appaiono e i grafici.
function sheetPrintMarkup(s){const {rows,cols}=sheetExtent(s,35,9),hex=/^#[0-9a-f]{6}$/i,head=['<th></th>'],body=[];
 for(let c=0;c<=cols;c++)head.push(`<th>${colName(c)}</th>`);
 for(let r=0;r<=rows;r++){const tds=[];for(let c=0;c<=cols;c++){const st=cell(r,c,s)?.s||{},css=[st.bold&&'font-weight:bold',hex.test(st.fill||'')&&'background:'+st.fill,hex.test(st.color||'')&&'color:'+st.color].filter(Boolean).join(';');tds.push(`<td style="${css}">${esc(displayValue(r,c,s))}</td>`)}body.push(`<tr><th>${r+1}</th>${tds.join('')}</tr>`)}
 return `<h2>${esc(s.name)} · ${esc(state.excelTitle)}</h2><table class="print-grid"><thead><tr>${head.join('')}</tr></thead><tbody>${body.join('')}</tbody></table>${printCharts(s)}`}
window.addEventListener('beforeprint',()=>{if(state.mode==='excel')$('excelPrint').innerHTML=sheetPrintMarkup(sheet())});
window.addEventListener('afterprint',()=>$('excelPrint').replaceChildren());
// Senza IndexedDB la bozza va in localStorage anche alla chiusura della pagina.
window.addEventListener('beforeunload',()=>{if(db)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshot()))}catch(e){}});
// Con IndexedDB, chiudendo o ricaricando la pagina si scrivono subito le bozze che aspettavano il loro ritardo: così
// non si perde quello che è cambiato nell'ultimo secondo (il testo scritto, l'app in cui si era). La transazione si
// chiude subito con commit, perché la pagina sta per sparire; le immagini nuove di Impagina restano al salvataggio solito.
window.addEventListener('pagehide',()=>{if(!db||!draftTimer&&!(pgSaveTimer&&Pg.p))return;try{const tx=db.transaction('docs','readwrite'),st=tx.objectStore('docs');
 if(draftTimer){clearTimeout(draftTimer);draftTimer=0;st.put(snapshot(),'current')}if(pgSaveTimer&&Pg.p){clearTimeout(pgSaveTimer);pgSaveTimer=0;st.put({p:Pg.p,pi:Pg.pi,mid:Pg.mid,row:Pg.row,guides:Pg.guides,grid:Pg.grid},'impagina')}tx.commit?.()}catch(e){}});
