// Impagina: le relazioni nello spazio dette a parole. Da dove la cornice esce dalla pagina o dai margini, quanto, e
// con quali cornici si tocca: servono alla verifica, agli annunci degli spostamenti e alla descrizione della posizione.
const PG_SIDE=['a sinistra','in alto','a destra','in basso'];
// Di quanto il riquadro (già ruotato) sporge oltre il rettangolo R, lato per lato; tol è la tolleranza.
function pgPastSides(B,R,tol){const d=[R.x-B.x,R.y-B.y,B.x+B.w-R.x-R.w,B.y+B.h-R.y-R.h];return d.map((v,i)=>({side:PG_SIDE[i],i,d:v})).filter(x=>x.d>tol)}
const pgTol=()=>pgMM()?.5*MM:2;
// I lati da cui la cornice esce dalla pagina; [] se è dentro, null se è del tutto fuori.
function pgOffPage(it,p=Pg.p){const B=pgBoxOf(it);if(B.x>=p.w||B.y>=p.h||B.x+B.w<=0||B.y+B.h<=0)return null;return pgPastSides(B,{x:0,y:0,w:p.w,h:p.h},pgTol())}
const pgSidesSay=list=>list.map(x=>`${x.side} di ${pgU(x.d)}`).join(' e ');
