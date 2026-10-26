// Stampa del foglio di calcolo: una tabella semplice con intestazioni di riga e colonna, i valori come appaiono e i grafici.
function sheetPrintMarkup(s){const {rows,cols}=sheetExtent(s,35,9),hex=/^#[0-9a-f]{6}$/i,head=['<th></th>'],body=[];
 for(let c=0;c<=cols;c++)head.push(`<th>${colName(c)}</th>`);
 for(let r=0;r<=rows;r++){const tds=[];for(let c=0;c<=cols;c++){const st=cell(r,c,s)?.s||{},css=[st.bold&&'font-weight:bold',hex.test(st.fill||'')&&'background:'+st.fill,hex.test(st.color||'')&&'color:'+st.color].filter(Boolean).join(';');tds.push(`<td style="${css}">${esc(displayValue(r,c,s))}</td>`)}body.push(`<tr><th>${r+1}</th>${tds.join('')}</tr>`)}
 return `<h2>${esc(s.name)} · ${esc(state.excelTitle)}</h2><table class="print-grid"><thead><tr>${head.join('')}</tr></thead><tbody>${body.join('')}</tbody></table>${printCharts(s)}`}
window.addEventListener('beforeprint',()=>{if(state.mode==='excel')$('excelPrint').innerHTML=sheetPrintMarkup(sheet())});
window.addEventListener('afterprint',()=>$('excelPrint').replaceChildren());
// Senza IndexedDB la bozza va in localStorage anche alla chiusura della pagina.
window.addEventListener('beforeunload',()=>{if(db)return;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshot()))}catch(e){}});
