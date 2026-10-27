// Ritocco: correttivo puntuale, timbro clone e occhi rossi. Ogni ritocco è un'operazione nella ricetta (r.heal), in
// unità della foto: centro x y, raggio r, e per correttivo e timbro la sorgente sx sy da cui si copia. Si applicano ai
// pixel di partenza prima di tutto il resto, alla misura dell'anteprima o della foto intera: restano non distruttivi.
// heal copia e adatta il colore ai dintorni; clone copia e basta; eye toglie il rosso dalla pupilla.
function retouch(img,ops,mc){const w=img.width,h=img.height,d=img.data;
 for(const op of ops){const [x,y]=toPx(mc,op.x,op.y),R=Math.max(1,op.r*mc.k);if(op.t==='eye'){redEye(d,w,h,x,y,R);continue}
  const [sx,sy]=toPx(mc,op.sx,op.sy),ox=Math.round(sx-x),oy=Math.round(sy-y),x0=Math.max(0,Math.floor(x-R)),x1=Math.min(w-1,Math.ceil(x+R)),y0=Math.max(0,Math.floor(y-R)),y1=Math.min(h-1,Math.ceil(y+R));if(x1<x0||y1<y0)continue;
  // Prima si copia la sorgente, così una zona che si sovrappone alla destinazione non ricopia se stessa.
  const bw=x1-x0+1,buf=new Uint8ClampedArray(bw*(y1-y0+1)*4);for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const X=clamp(xx+ox,0,w-1),Y=clamp(yy+oy,0,h-1),o=(Y*w+X)*4,b=((yy-y0)*bw+xx-x0)*4;buf[b]=d[o];buf[b+1]=d[o+1];buf[b+2]=d[o+2]}
  // Ripara: la differenza media di colore tra l'anello intorno alla destinazione e quello intorno alla sorgente.
  const off=[0,0,0];if(op.t==='heal'){let n=0;const s=[0,0,0];for(let k=0;k<32;k++){const a=k/32*Math.PI*2,rx=Math.cos(a)*R*1.2,ry=Math.sin(a)*R*1.2,A=clamp(Math.round(x+rx),0,w-1),B=clamp(Math.round(y+ry),0,h-1),C=clamp(Math.round(sx+rx),0,w-1),D=clamp(Math.round(sy+ry),0,h-1),o1=(B*w+A)*4,o2=(D*w+C)*4;for(let c=0;c<3;c++)s[c]+=d[o1+c]-d[o2+c];n++}for(let c=0;c<3;c++)off[c]=s[c]/n}
  const hd=clamp(op.h??(op.t==='heal'?.3:.6),0,.95);
  for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){const t=Math.hypot(xx+.5-x,yy+.5-y)/R;if(t>=1)continue;const k=t<=hd?1:1-smooth((t-hd)/(1-hd)),o=(yy*w+xx)*4,b=((yy-y0)*bw+xx-x0)*4;for(let c=0;c<3;c++)d[o+c]+=(buf[b+c]+off[c]-d[o+c])*k}}}
// Occhi rossi: dove il rosso supera di molto verde e blu diventa la loro media, più scura; il bordo del cerchio sfuma.
function redEye(d,w,h,cx,cy,R){for(let y=Math.max(0,Math.floor(cy-R));y<=Math.min(h-1,Math.ceil(cy+R));y++)for(let x=Math.max(0,Math.floor(cx-R));x<=Math.min(w-1,Math.ceil(cx+R));x++){const t=Math.hypot(x+.5-cx,y+.5-cy)/R;if(t>=1)continue;
 const o=(y*w+x)*4,r=d[o],g=d[o+1],b=d[o+2],m=(g+b)/2,k=(t<.7?1:1-smooth((t-.7)/.3))*clamp((r/(m+8)-1.3)/.7,0,1);if(k<=0)continue;d[o]=r+(m*.85-r)*k;d[o+1]=g*(1-.15*k);d[o+2]=b*(1-.15*k)}}
// Correttivo: la sorgente si sceglie una volta, sui pixel dell'anteprima, tra sedici direzioni a due distanze, cercando
// l'anello di pixel che somiglia di più a quello intorno alla macchia; poi resta nella ricetta.
function spotSource([u,v]){const px=lastMc.px,w=px.width,h=px.height,d=px.data,cx=u*w,cy=v*h,R=Math.max(2,T.size/2*lastMc.k),at=(X,Y)=>(clamp(Math.round(Y),0,h-1)*w+clamp(Math.round(X),0,w-1))*4;let best=null,bs=Infinity;
 for(let k=0;k<16;k++){const a=k/16*Math.PI*2;for(const f of [2.3,3.2]){const sx=cx+Math.cos(a)*R*f,sy=cy+Math.sin(a)*R*f;if(sx<R||sy<R||sx>w-R||sy>h-R)continue;let e=0;
  for(let j=0;j<24;j++){const b=j/24*Math.PI*2;for(const q of [1.1,1.4]){const rx=Math.cos(b)*R*q,ry=Math.sin(b)*R*q,o1=at(cx+rx,cy+ry),o2=at(sx+rx,sy+ry);e+=(d[o1]-d[o2])**2+(d[o1+1]-d[o2+1])**2+(d[o1+2]-d[o2+2])**2}}if(e<bs){bs=e;best=[sx/w,sy/h]}}}
 return best}
function addRetouch(op,label,say){if(!edit(label,r=>{r.heal=[...(r.heal||[]),op]},{panel:true}))return;announce(say+` Ritocchi: ${I.r.heal.length}.`)}
function retouchSpot(p){if(!lastMc)return;const s=spotSource(p);if(!s){announce('Non c’è spazio intorno per prendere una zona sana: avvicinati al centro o rimpicciolisci il cerchio');return}const [x,y]=uvUnits(p),[sx,sy]=uvUnits(s);
 addRetouch({t:'heal',x,y,sx,sy,r:U5(T.size/2)},'Correttivo puntuale',`Corretto a ${posSay(p)}, con la zona ${placeDir(p,s)}.`)}
const placeDir=(p,s)=>{const a=Math.atan2(s[1]-p[1],s[0]-p[0])*180/Math.PI,dirs=['a destra','in basso a destra','sotto','in basso a sinistra','a sinistra','in alto a sinistra','sopra','in alto a destra'];return dirs[Math.round(((a+360)%360)/45)%8]};
function retouchClone(a,b){const [sx,sy]=uvUnits(a),[x,y]=uvUnits(b);addRetouch({t:T.heal?'heal':'clone',x,y,sx,sy,r:U5(T.size/2),h:T.hard},T.heal?'Timbro con riparazione':'Timbro clone',`Copiata la zona a ${posSay(a)} su ${posSay(b)}.`)}
function retouchEye(p){const [x,y]=uvUnits(p);addRetouch({t:'eye',x,y,r:U5(T.size/2)},'Occhi rossi',`Rosso tolto a ${posSay(p)}.`)}
function retouchLast(){if(!I.r.heal?.length){toast('Non ci sono ritocchi');return}edit('Togli l’ultimo ritocco',r=>{r.heal=r.heal.slice(0,-1)},{panel:true});announce(`Tolto l’ultimo ritocco: ne restano ${I.r.heal.length}`)}
function retouchClear(){if(!I.r.heal?.length){toast('Non ci sono ritocchi');return}edit('Togli tutti i ritocchi',r=>{r.heal=[]},{panel:true});announce('Tolti tutti i ritocchi: Ctrl+Z per riaverli')}
function retouchSay(r=I.r){const l=r.heal||[],n=t=>l.filter(o=>o.t===t).length,pl=(k,one,many)=>k===1?one:k+' '+many;
 return l.length?`Ritocchi: ${[[n('heal'),'una riparazione','riparazioni'],[n('clone'),'un timbro','timbri'],[n('eye'),'un occhio rosso','occhi rossi']].filter(x=>x[0]).map(x=>pl(...x)).join(', ')}.`:'Nessun ritocco.'}
Object.assign(TOOLS,{
 spot:{label:'Correttivo puntuale',kind:'click',opts:['size'],keys:'Clic su una macchia, un brufolo o un granello di polvere: si copre con una zona vicina simile e il colore si adatta. Da tastiera: Invio sul punto. Parentesi quadre cambiano la dimensione del cerchio.',at:p=>retouchSpot(p)},
 clone:{label:'Timbro clone',kind:'two',opts:['size','hard','heal'],first:'Zona da copiare',second:'dove incollarla',keys:'Trascina dalla zona da copiare al punto dove incollarla. Da tastiera: Invio sulla zona da copiare, poi Invio dove incollarla. Con Ripara il colore si adatta ai dintorni. Parentesi quadre cambiano la dimensione.',
  drawTwo:(c,a,b,line,dpr)=>{const R=Math.max(3,brushDisp()*dpr);line(()=>c.arc(a[0],a[1],R,0,Math.PI*2));line(()=>{c.moveTo(...a);c.lineTo(...b)});line(()=>c.arc(b[0],b[1],R,0,Math.PI*2),false)},two:(a,b)=>retouchClone(a,b)},
 redeye:{label:'Occhi rossi',kind:'click',opts:['size'],keys:'Clic al centro di un occhio rosso, con il cerchio grande come l’occhio. Da tastiera: Invio sul punto. Parentesi quadre cambiano la dimensione del cerchio.',at:p=>retouchEye(p)}});
PANEL_HTML.retouch=()=>`<div class="tool-grid" role="group" aria-label="Strumenti di ritocco">${['toolSpot','toolClone','toolRedEye'].map(id=>cmdButton(id)).join('')}</div><div class="insp-actions">${['retouchLast','retouchClear'].map(id=>cmdButton(id)).join('')}</div><p class="sel-desc">${esc(retouchSay())}</p>`;
Object.assign(PHOTO_TOOL_ACTIONS,{toolSpot:()=>setTool('spot'),toolClone:()=>setTool('clone'),toolRedEye:()=>setTool('redeye'),retouchLast,retouchClear});
