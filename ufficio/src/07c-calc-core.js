function invalidate(){calcVersion++;calcMemo.clear()}
function bump(){invalidate();renderGrid();syncFormula();updateExcelStats();schedulePersist();refreshToggles();renderCharts()}
function eachSelected(fn){const a=state.sel,rs=Math.min(a.r,a.r2),re=Math.max(a.r,a.r2),cs=Math.min(a.c,a.c2),ce=Math.max(a.c,a.c2);if((re-rs+1)*(ce-cs+1)>60000){toast('Selezione troppo grande: massimo 60.000 celle per operazione');return}for(let r=rs;r<=re;r++)for(let c=cs;c<=ce;c++)fn(r,c)}
function selectedBounds(){let a=state.sel;return{r1:Math.min(a.r,a.r2),r2:Math.max(a.r,a.r2),c1:Math.min(a.c,a.c2),c2:Math.max(a.c,a.c2)}}
function applyCellsStyle(key,value,mode='set'){storeHistory();eachSelected((r,c)=>{let s=ensureCell(r,c).s;if(mode==='toggle')s[key]=!s[key];else s[key]=value});bump()}
