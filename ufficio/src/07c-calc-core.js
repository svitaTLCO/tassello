// Ricalcolo del foglio e operazioni sulle celle selezionate.
function invalidate(){calcMemo.clear();calcVersion+=1}
function bump(){invalidate();syncFormula();renderGrid();renderCharts();updateExcelStats();refreshToggles();schedulePersist()}
function selectedBounds(){const {r,c,r2,c2}=state.sel;return{r1:Math.min(r,r2),r2:Math.max(r,r2),c1:Math.min(c,c2),c2:Math.max(c,c2)}}
const areaSize=b=>(b.r2-b.r1+1)*(b.c2-b.c1+1),TOO_MANY_CELLS='Troppe celle selezionate: il limite è 60.000 per operazione';
function eachSelected(fn){const b=selectedBounds();if(areaSize(b)>60000){toast(TOO_MANY_CELLS);return}for(let r=b.r1;r<=b.r2;r++)for(let c=b.c1;c<=b.c2;c++)fn(r,c)}
function applyCellsStyle(prop,val,how='set'){storeHistory();const flip=how==='toggle';eachSelected((r,c)=>{const look=ensureCell(r,c).s;look[prop]=flip?!look[prop]:val});bump()}
// Area usata dal foglio (celle scritte e matrici espanse), con un minimo di righe e colonne.
function sheetExtent(s,minRow=0,minCol=0){const pts=spillCorners(s).slice();for(const ref of Object.keys(s.cells)){const at=parseRef(ref);if(at)pts.push(at)}return{rows:Math.min(ROWS-1,Math.max(minRow,...pts.map(p=>p.r))),cols:Math.min(COLS-1,Math.max(minCol,...pts.map(p=>p.c)))}}
