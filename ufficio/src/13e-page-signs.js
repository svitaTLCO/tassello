// Insegne: scritte d'effetto, eredi del vecchio WordArt. La scritta resta testo vero (si modifica scrivendo, si
// seleziona nel PDF, lo screen reader la legge); gli effetti (ombre, contorno doppio, neon) stanno in una copia
// disegnata con un filtro SVG sotto il testo. La scritta può seguire un arco, un cerchio o un'onda e adattarsi alla cornice.
const PG_SIGN_SHAPES=[['flat','Diritta'],['arc','Arco verso l’alto'],['arcDown','Arco verso il basso'],['circle','Cerchio'],['wave','Onda']];
const PG_SIGN_FILLS=[['solid','Colore'],['grad','Sfumatura'],['image','Immagine dentro le lettere'],['none','Nessuno, solo contorno']];
const PG_SIGN_SHADOWS=[['none','Nessuna'],['soft','Morbida'],['long','Lunga'],['3d','In rilievo']];
// Galleria di stili pronti: si parte da uno e poi ogni effetto si cambia nelle proprietà.
const PG_SIGN_BASE={font:'Georgia',bold:true,italic:false,caps:false,ls:0,align:'center',shape:'flat',curve:50,fillType:'solid',c1:'#1b1b1b',c2:'#b35500',angle:0,ow:0,oc:'#ffffff',ow2:0,oc2:'#1b1b1b',shadow:'none',shc:'#1b1b1b',glow:0,gc:'#00d5ff'};
const PG_SIGN_STYLES={
 classica:['Classica','Georgia in grassetto, nessun effetto',{}],
 tramonto:['Tramonto','Sfumatura arancio e magenta con ombra morbida',{font:'Segoe UI',fillType:'grad',c1:'#c25400',c2:'#b0124f',angle:0,shadow:'soft',shc:'#5a2a00'}],
 fumetto:['Fumetto','Giallo con contorno nero e rilievo',{font:'Verdana',caps:true,c1:'#ffd400',ow:5,oc:'#1b1b1b',shadow:'3d',shc:'#1b1b1b'}],
 neon:['Neon','Luce azzurra, da usare su fondo scuro',{font:'Segoe UI',c1:'#f2fdff',glow:55,gc:'#00d5ff'}],
 timbro:['Timbro','Lettere spaziate con doppio contorno',{caps:true,ls:8,c1:'#8a4100',ow:2.5,oc:'#ffffff',ow2:2.5,oc2:'#8a4100'}],
 ombraLunga:['Ombra lunga','Grassetto con un’ombra lunga e piena',{font:'Segoe UI',caps:true,c1:'#1b1b1b',shadow:'long',shc:'#f3c48f'}],
 contorno:['Solo contorno','Lettere vuote con il bordo',{font:'Segoe UI',caps:true,fillType:'none',ow:3,oc:'#1b1b1b'}],
 arco:['Arco','Lettere spaziate su un arco',{caps:true,ls:6,shape:'arc',curve:45,c1:'#0a5468'}],
 cerchio:['Cerchio','Scritta tutta attorno, come un bollino',{font:'Segoe UI',caps:true,ls:12,shape:'circle'}],
 onda:['Onda','Sfumatura viola e petrolio su un’onda',{font:'Verdana',shape:'wave',curve:50,fillType:'grad',c1:'#7a3db8',c2:'#0e6f8a',angle:0}],
 foto:['Foto nelle lettere','Le lettere mostrano un’immagine: sceglila dopo',{font:'Arial',caps:true,fillType:'image',ow:1,oc:'#1b1b1b'}]};
const pgSignStyle=k=>({...PG_SIGN_BASE,...(PG_SIGN_STYLES[k]||PG_SIGN_STYLES.classica)[2]});
// Il percorso della scritta curva, in coordinate della pagina, con la sua lunghezza (misurata a campioni).
function pgSignPath(it){const x0=it.x+it.w*.04,x1=it.x+it.w*.96,cx=it.x+it.w/2,cy=it.y+it.h/2,c=clampV((it.curve??50)/100,0,1),q=(a,b,k,t)=>(1-t)*(1-t)*a+2*(1-t)*t*k+t*t*b;let d,pt,off='50%';
 if(it.shape==='circle'){const r=Math.max(1,Math.min(it.w,it.h)/2*.78);return{d:`M${pr2(cx-r)} ${pr2(cy)}A${pr2(r)} ${pr2(r)} 0 1 1 ${pr2(cx+r)} ${pr2(cy)}A${pr2(r)} ${pr2(r)} 0 1 1 ${pr2(cx-r)} ${pr2(cy)}`,len:2*Math.PI*r,off:'25%',maxH:r*.42}}
 if(it.shape==='wave'){const a=it.h*.55*c,X=[x0,x0+(x1-x0)/3,x0+2*(x1-x0)/3,x1],Y=[cy,cy-a,cy+a,cy];d=`M${pr2(X[0])} ${pr2(Y[0])}C${pr2(X[1])} ${pr2(Y[1])} ${pr2(X[2])} ${pr2(Y[2])} ${pr2(X[3])} ${pr2(Y[3])}`;const b=(v,t)=>(1-t)**3*v[0]+3*(1-t)**2*t*v[1]+3*(1-t)*t*t*v[2]+t**3*v[3];pt=t=>[b(X,t),b(Y,t)];return{d,len:pgPathLen(pt),off,maxH:it.h*.4}}
 const down=it.shape==='arcDown',yb=it.y+it.h*(down?.42:.8),k=yb+(down?1:-1)*it.h*1.1*c;d=`M${pr2(x0)} ${pr2(yb)}Q${pr2(cx)} ${pr2(k)} ${pr2(x1)} ${pr2(yb)}`;pt=t=>[q(x0,x1,cx,t),q(yb,yb,k,t)];return{d,len:pgPathLen(pt),off,maxH:it.h*(down?.38:.5)}}
function pgPathLen(pt){let L=0,[px,py]=pt(0);for(let i=1;i<=48;i++){const [x,y]=pt(i/48);L+=Math.hypot(x-px,y-py);px=x;py=y}return L}
// Misure della scritta: le righe, la dimensione (adattata alla cornice o scelta) e la spaziatura tra le lettere.
function pgSignMetrics(it,ctx={}){let t=fillFields(String(it.text||''),ctx);if(it.caps)t=t.toLocaleUpperCase('it');const curved=it.shape&&it.shape!=='flat',lines=curved?[t.replace(/\s*\n\s*/g,' ')]:t.split('\n'),css=`${it.italic?'italic ':''}${it.bold?700:400} 100px ${fontStack(it.font)}`,ls=(it.ls||0)/100;
 const w100=Math.max(1,...lines.map(l=>textWidth(css,l)+Math.max(0,[...l].length-1)*ls*100)),geo=curved?pgSignPath(it):null;
 const size=it.fit===false?Math.max(1,it.size||40):Math.max(1,curved?Math.min(geo.len*.95/w100*100,geo.maxH):Math.min(it.w*.97/w100*100,it.h/(lines.length*1.12)));return{lines,size,ls:ls*size,geo,curved}}
// Filtro degli effetti: restituisce solo gli effetti (ombra, contorno esterno, alone), che vanno sotto il testo.
function pgSignFilter(id,it,size){const parts=[],res=[],col=(inp,c,op,r)=>`<feFlood flood-color="${esc(c)}" flood-opacity="${op}"/><feComposite in2="${inp}" operator="in" result="${r}"/>`;
 if(it.shadow==='soft'){parts.push(`<feGaussianBlur in="SourceAlpha" stdDeviation="${pr2(size*.045)}"/><feOffset dx="${pr2(size*.04)}" dy="${pr2(size*.06)}" result="sb"/>`+col('sb',it.shc,.55,'sh'));res.push('sh')}
 if(it.shadow==='long'||it.shadow==='3d'){const n=it.shadow==='long'?16:7,st=size*(it.shadow==='long'?.022:.014);let s='',m='';for(let i=1;i<=n;i++){s+=`<feOffset in="SourceAlpha" dx="${pr2(st*i)}" dy="${pr2(st*i)}" result="o${i}"/>`;m+=`<feMergeNode in="o${i}"/>`}parts.push(s+`<feMerge result="om">${m}</feMerge>`+col('om',it.shc,1,'ex'));res.push('ex')}
 if(it.glow>0){parts.push(`<feGaussianBlur in="SourceAlpha" stdDeviation="${pr2(size*it.glow/700)}" result="g0"/>`+col('g0',it.gc,1,'g1')+`<feGaussianBlur in="SourceAlpha" stdDeviation="${pr2(size*it.glow/250)}" result="g2"/>`+col('g2',it.gc,.85,'g3'));res.push('g3','g1')}
 if(it.ow2>0){parts.push(`<feMorphology in="SourceAlpha" operator="dilate" radius="${pr2(size*(it.ow+it.ow2)/100)}" result="d"/>`+col('d',it.oc2,1,'ol'));res.push('ol')}
 return res.length?`<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB">${parts.join('')}<feMerge>${res.map(r=>`<feMergeNode in="${r}"/>`).join('')}</feMerge></filter>`:''}
// La scritta in SVG. Gli id delle definizioni sono nuovi a ogni disegno, così pagina, miniature e stampa non si scontrano.
let pgDefSeq=0;
function pgSignSvg(it,ctx,href){const M=pgSignMetrics(it,ctx);if(!M.lines.some(l=>l.trim()))return '';const id='sg'+(++pgDefSeq),size=M.size,op=it.opacity<100?` opacity="${it.opacity/100}"`:'';let defs='',paint;
 if(it.fillType==='grad'){const a=(it.angle||0)*Math.PI/180,cx=Math.cos(a)*50,cy=Math.sin(a)*50;defs+=`<linearGradient id="${id}g" x1="${pr2(50-cx)}%" y1="${pr2(50-cy)}%" x2="${pr2(50+cx)}%" y2="${pr2(50+cy)}%"><stop offset="0" stop-color="${esc(it.c1)}"/><stop offset="1" stop-color="${esc(it.c2)}"/></linearGradient>`;paint=`url(#${id}g)`}
 else if(it.fillType==='image'){const m=it.img&&Pg.imgs.get(it.img);if(m){defs+=`<pattern id="${id}p" patternUnits="userSpaceOnUse" x="${pr2(it.x)}" y="${pr2(it.y)}" width="${pr2(it.w)}" height="${pr2(it.h)}"><image href="${esc(href(m))}" width="${pr2(it.w)}" height="${pr2(it.h)}" preserveAspectRatio="xMidYMid slice"/></pattern>`;paint=`url(#${id}p)`}else paint=esc(it.c1)}
 else paint=it.fillType==='none'?'none':esc(it.c1);
 const filter=pgSignFilter(id+'f',it,size);defs+=filter;if(M.curved)defs+=`<path id="${id}t" d="${M.geo.d}"/>`;
 const anchor=M.curved?'middle':it.align==='left'?'start':it.align==='right'?'end':'middle',ax=it.align==='left'?it.x:it.align==='right'?it.x+it.w:it.x+it.w/2,lh=size*1.12,y0=it.y+(it.h-M.lines.length*lh)/2+size*.86;
 const body=M.curved?`<textPath href="#${id}t" startOffset="${M.geo.off}">${esc(M.lines[0])}</textPath>`:M.lines.map((l,i)=>`<tspan x="${pr2(ax)}" y="${pr2(y0+i*lh)}">${esc(l)}</tspan>`).join('');
 const font=`font-family="${esc(fontStack(it.font))}" font-size="${pr2(size)}"${it.bold?' font-weight="700"':''}${it.italic?' font-style="italic"':''}${M.ls?` letter-spacing="${pr2(M.ls)}"`:''} text-anchor="${anchor}" xml:space="preserve"`,stroke=it.ow>0?` stroke="${esc(it.oc)}" stroke-width="${pr2(size*it.ow/50)}" stroke-linejoin="round" paint-order="stroke"`:'';
 return `<g${op}>${defs?`<defs>${defs}</defs>`:''}${filter?`<text ${font} fill="${paint==='none'?'#000':paint}"${stroke} filter="url(#${id}f)" aria-hidden="true">${body}</text>`:''}<text ${font} fill="${paint}"${stroke}>${body}</text></g>`}
// Inserimento e stili: senza un'insegna scelta lo stile ne crea una nuova, altrimenti cambia quella scelta.
function pgSignStylesMenu(){const it=pgSel(),a=document.querySelector('#ribbon [data-action="pgSignStyles"]')||document.querySelector('#ribbon [data-action="pgAddSign"]'),r=(a||pgStage).getBoundingClientRect();
 openMenu(Object.entries(PG_SIGN_STYLES).map(([k,[name,desc]])=>({label:name,desc,run:()=>it?.kind==='sign'?pgApplySignStyle(it,k):pgAddSign(k)})),r.left,r.bottom,it?.kind==='sign'?'Stile dell’insegna '+it.name:'Inserisci un’insegna con lo stile',a)}
function pgApplySignStyle(it,k){pgEdit('Stile dell’insegna',()=>{const keep={text:it.text,img:it.img};Object.assign(it,pgSignStyle(k),keep);it.style=k},{props:true});announce(`Insegna «${it.name}» con lo stile ${PG_SIGN_STYLES[k][0]}`);if(it.fillType==='image'&&!it.img)toast('Ora scegli l’immagine che si vede dentro le lettere')}
function pgAddSign(k='classica'){const p=Pg.p,i=pgInner(p),it=pgAdd('sign',{...pgSignStyle(k),style:k,text:'Scrivi qui',w:i.w*.85,h:Math.min(i.h*.22,i.w*.3)});announce(`Inserita l’insegna «${it.name}» con lo stile ${PG_SIGN_STYLES[k][0]}. Scrivi il testo nelle proprietà; la scritta si adatta alla cornice.`);setTimeout(()=>{$('pp-text')?.focus();$('pp-text')?.select()},0)}
// Colori della scritta per la verifica del contrasto: il pieno, i due capi della sfumatura o il contorno.
const pgSignInks=it=>it.fillType==='grad'?[it.c1,it.c2]:it.fillType==='none'?(it.ow>0?[it.oc]:[]):it.fillType==='image'?[]:[it.c1];
