const ERR_XLSX={'#DIV/0!':'#DIV/0!','#NUM!':'#NUM!','#REF!':'#REF!','#RIF!':'#REF!','#NOME?':'#NAME?','#N/D':'#N/A','#VALORE!':'#VALUE!','#ESPANDI!':'#VALUE!','#CALC!':'#VALUE!'};
class FErr{constructor(m){this.m=m}}
const isErr=x=>x instanceof FErr;
const raise=x=>{if(isErr(x))throw Error(x.m);return x};
function getSheetByName(name){const want=String(name).toLowerCase();return state.sheets.find(sh=>sh.name.toLowerCase()===want)}
// Testo → numero all'italiana: "3,5", "12%", "1.234,56". NaN se il testo non è un numero.
function rawNumber(val){switch(typeof val){case 'number':return val;case 'boolean':return NaN}const t=String(val??'').trim();if(!t)return NaN;
 const m=/^(-?\d+(?:[.,]\d+)?)(%?)$/.exec(t);if(m)return parseFloat(m[1].replace(',','.'))/(m[2]?100:1);
 return /^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(t)?parseFloat(t.replace(/\./g,'').replace(',','.')):NaN}
// Date e orari: numeri seriali come in Excel (1 = 31/12/1899 + 1 giorno; la parte decimale è l'ora).
const EPOCH=Date.UTC(1899,11,30);
const fromSerial=n=>new Date(EPOCH+Math.floor(n)*86400000);
const serialOf=(y,m,d)=>(Date.UTC(y,m,d)-EPOCH)/86400000;
const nowSerial=()=>{const d=new Date();return (Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds())-EPOCH)/86400000};
function parseDateText(s){s=String(s??'').trim();if(s.length<4||s.length>22)return null;let m,y,mo,d,h=0,mi=0,se=0,kind='d';
 if((m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4}|\d{2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))){d=+m[1];mo=+m[2];y=+m[3];if(m[3].length===2)y+=y<30?2000:1900;if(m[4]!==undefined){h=+m[4];mi=+m[5];se=+(m[6]||0);kind='dt'}}
 else if((m=/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))){y=+m[1];mo=+m[2];d=+m[3];if(m[4]!==undefined){h=+m[4];mi=+m[5];se=+(m[6]||0);kind='dt'}}
 else if((m=/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s))){h=+m[1];mi=+m[2];se=+(m[3]||0);return h>23||mi>59||se>59?null:{v:(h*3600+mi*60+se)/86400,kind:'t'}}
 else return null;
 if(mo<1||mo>12||d<1||d>31||h>23||mi>59||se>59||new Date(Date.UTC(y,mo-1,d)).getUTCDate()!==d)return null;return{v:serialOf(y,mo-1,d)+(h*3600+mi*60+se)/86400,kind}}
const numOf=v=>{if(typeof v==='number')return v;if(typeof v==='boolean')return v?1:0;let n=rawNumber(v);if(Number.isNaN(n)&&typeof v==='string'){const d=parseDateText(v);if(d)n=d.v}return n};
const flatten=args=>args.flat(Infinity);
const scalar=x=>raise(Array.isArray(x)?(x.flat(Infinity)[0]??0):x);
const numeric=x=>{const n=numOf(scalar(x));return Number.isNaN(n)?0:n};
const text=x=>{const v=scalar(x);return typeof v==='boolean'?(v?'VERO':'FALSO'):String(v??'')};
function toSerial(x){const n=numOf(scalar(x));if(Number.isNaN(n)||n<0)throw Error('#VALORE!');return n}
const pad2=n=>String(n).padStart(2,'0');
function fmtDate(v){const d=fromSerial(v);return Number.isNaN(d.getTime())||v<0?'#DATA!':`${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth()+1)}/${d.getUTCFullYear()}`}
function fmtTime(v){const t=Math.round((v-Math.floor(v))*86400)%86400,s=t%60;return `${pad2(Math.floor(t/3600))}:${pad2(Math.floor(t%3600/60))}${s?':'+pad2(s):''}`}
const wildRe=v=>new RegExp('^'+escRe(String(v).toLowerCase()).replace(/\\\*/g,'[\\s\\S]*').replace(/\\\?/g,'.')+'$');
function cmpVals(a,b){const an=typeof a==='number'?a:numOf(a),bn=typeof b==='number'?b:numOf(b);if(typeof a!=='boolean'&&typeof b!=='boolean'&&!Number.isNaN(an)&&!Number.isNaN(bn))return Math.sign(an-bn);return Math.sign(String(a??'').toLowerCase().localeCompare(String(b??'').toLowerCase(),'it'))}
function criteria(crit){const s=text(crit),m=/^(<=|>=|<>|=|<|>)?([\s\S]*)$/.exec(s),op=m[1]||'=',val=m[2],nv=numOf(val);
 return x=>{if(isErr(x))return false;const xn=numOf(x);if(val!==''&&!Number.isNaN(nv)&&!Number.isNaN(xn)&&typeof x!=='boolean'){switch(op){case '=':return xn===nv;case '<>':return xn!==nv;case '<':return xn<nv;case '>':return xn>nv;case '<=':return xn<=nv;default:return xn>=nv}}
  const xs=String(x??'').toLowerCase();if(op==='='||op==='<>'){const ok=wildRe(val).test(xs);return op==='='?ok:!ok}if(!Number.isNaN(nv)||!Number.isNaN(xn))return false;const c=xs.localeCompare(val.toLowerCase(),'it');return op==='<'?c<0:op==='>'?c>0:op==='<='?c<=0:c>=0}}
const MONTHS=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'],WEEKDAYS=['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
// TESTO(): codici di formato italiani (gg/mm/aaaa, #.##0,00) e inglesi (dd/mm/yyyy, #,##0.00).
function formatText(val,f){f=String(f??'');if(f==='@')return text(val);const bare=f.replace(/"[^"]*"/g,'');
 if(/[dgmyah]/i.test(bare)&&!/[0#?]/.test(bare)){const n=toSerial(val),d=fromSerial(n),secs=Math.round((n-Math.floor(n))*86400)%86400,hh=Math.floor(secs/3600),mi=Math.floor(secs%3600/60),ss=secs%60,toks=[],re=/"([^"]*)"|(g+|d+|m+|a+|y+|h+|s+)|([\s\S])/gi;let m;while((m=re.exec(f)))toks.push(m[1]!==undefined?{lit:m[1]}:m[2]?{t:m[2].toLowerCase()}:{lit:m[3]});
  return toks.map((k,i)=>{if(k.lit!==undefined)return k.lit;const t=k.t,c=t[0],L=t.length;if(c==='g'||c==='d')return L===1?String(d.getUTCDate()):L===2?pad2(d.getUTCDate()):L===3?WEEKDAYS[d.getUTCDay()].slice(0,3):WEEKDAYS[d.getUTCDay()];if(c==='a'||c==='y')return L<=2?String(d.getUTCFullYear()).slice(-2):String(d.getUTCFullYear());if(c==='h')return L===1?String(hh):pad2(hh);if(c==='s')return L===1?String(ss):pad2(ss);const prev=toks.slice(0,i).reverse().find(x=>x.t),next=toks.slice(i+1).find(x=>x.t);if(L<=2&&(prev?.t[0]==='h'||next?.t[0]==='s'))return L===1?String(mi):pad2(mi);const mo=d.getUTCMonth();return L===1?String(mo+1):L===2?pad2(mo+1):L===3?MONTHS[mo].slice(0,3):L===4?MONTHS[mo]:MONTHS[mo][0]}).join('')}
 const core=(/[#0?][#0?.,]*/.exec(f)||['0'])[0],i0=f.indexOf(core),pre=f.slice(0,i0).replace(/"([^"]*)"/g,'$1'),post=f.slice(i0+core.length).replace(/"([^"]*)"/g,'$1'),seps=[...core.matchAll(/[.,]/g)];let dec=null,grp=false;
 if(seps.length){const last=seps.at(-1),kinds=new Set(seps.map(s=>s[0]));if(kinds.size>1){dec=last[0];grp=true}else if(seps.length===1&&!(core.slice(last.index+1).length===3&&/#/.test(core.slice(0,last.index))))dec=last[0];else grp=true}
 const fr=dec?core.slice(core.lastIndexOf(dec)+1):'',maxD=fr.replace(/[^0#?]/g,'').length,minD=fr.replace(/[^0]/g,'').length,intZeros=((dec?core.slice(0,core.lastIndexOf(dec)):core).match(/0/g)||[]).length,x=numeric(val)*(/%/.test(pre+post)?100:1);
 let s=Math.abs(x).toLocaleString('it-IT',{minimumFractionDigits:minD,maximumFractionDigits:maxD,useGrouping:grp});if(!grp&&intZeros>1){const [a,b]=s.split(',');s=a.padStart(intZeros,'0')+(b!==undefined?','+b:'')}if(intZeros===0&&/^0,/.test(s))s=s.slice(1);return (x<0&&Math.abs(x)>=Math.pow(10,-maxD)/2?'-':'')+pre+s+post}
const LAZY=new Set(['IF','IFS','SWITCH','CHOOSE','IFERROR','IFNA','ISERROR','ISNA','ISBLANK','ISNUMBER','ISTEXT','COUNTIF','COUNTIFS','SUMIF','SUMIFS','AVERAGEIF','AVERAGEIFS','MAXIFS','MINIFS','COUNTA','COUNTBLANK','FILTER','SORT','SORTBY','UNIQUE','TRANSPOSE','CHOOSECOLS','CHOOSEROWS','VSTACK','HSTACK','TAKE','DROP','TOCOL','TOROW','XLOOKUP','XMATCH','INDEX','SEQUENCE','RANDARRAY','TEXTSPLIT']);
const first0=a=>Array.isArray(a)?a.flat(Infinity)[0]:a;
const as2d=a=>Array.isArray(a)?a.map(r=>Array.isArray(r)?r:[r]):[[a]];
// Matrici dinamiche: operatori e funzioni scalari si applicano elemento per elemento, con espansione delle dimensioni 1 come in Excel 365.
const isArr=Array.isArray;
const transpose=A=>A[0].map((_,j)=>A.map(r=>r[j]));
const asErr=e=>{if(!String(e.message).startsWith('#'))throw e;return new FErr(e.message)};
const mapArr=(v,f)=>isArr(v)?as2d(v).map(row=>row.map(x=>{try{return f(x)}catch(e){return asErr(e)}})):f(v);
function broadcast(list,f){const A=list.map(x=>isArr(x)?as2d(x):null),R=Math.max(1,...A.map(a=>a?a.length:1)),W=Math.max(1,...A.map(a=>a?Math.max(...a.map(r=>r.length)):1));if(R*W>100000)throw Error('#RANGE!');const out=[];for(let i=0;i<R;i++){const row=[];for(let j=0;j<W;j++){let miss=false;const vals=list.map((x,k)=>{const a=A[k];if(!a)return x;const rr=a.length===1?a[0]:a[i],v=rr?(rr.length===1?rr[0]:rr[j]):undefined;if(v===undefined)miss=true;return v});if(miss){row.push(new FErr('#N/D'));continue}try{row.push(f(vals))}catch(e){row.push(asErr(e))}}out.push(row)}return out}
function normArr(a){const rows=a.map(r=>isArr(r)?r:[r]);if(!rows.length)throw Error('#CALC!');const w=Math.max(...rows.map(r=>r.length));return rows.map(r=>r.length<w?[...r,...Array.from({length:w-r.length},()=>new FErr('#N/D'))]:r)}
const sortRank=v=>isErr(v)?4:v===''||v==null?3:typeof v==='number'?0:typeof v==='string'?1:2;
function sortCmp(a,b){const ra=sortRank(a),rb=sortRank(b);if(ra!==rb)return ra-rb;if(ra===0)return a-b;if(ra===1)return a.localeCompare(b,'it',{sensitivity:'base',numeric:true});if(ra===2)return (a?1:0)-(b?1:0);return 0}
function xfind(key,arr,mode,rev){const idx=[...arr.keys()];if(rev)idx.reverse();let best=null;for(const i of idx){const x=arr[i];if(isErr(x))continue;const c=mode===2?(wildRe(key).test(String(x).toLowerCase())?0:1):cmpVals(x,key);if(c===0)return i;if(mode===-1&&c<0&&(best===null||cmpVals(x,arr[best])>0))best=i;if(mode===1&&c>0&&(best===null||cmpVals(x,arr[best])<0))best=i}return best??-1}
const LIFT=new Set(['ABS','INT','MOD','ROUND','ROUNDUP','ROUNDDOWN','TRUNC','MROUND','SIGN','SQRT','POWER','LEN','UPPER','LOWER','PROPER','TRIM','LEFT','RIGHT','MID','REPT','EXACT','FIND','SEARCH','SUBSTITUTE','REPLACE','TEXT','VALUE','DATE','TIME','YEAR','MONTH','DAY','HOUR','MINUTE','SECOND','WEEKDAY','WEEKNUM','ISOWEEKNUM','DAYS','DATEDIF','EOMONTH','EDATE','IF','IFERROR','IFNA','ISBLANK','ISNUMBER','ISTEXT','ISERROR','ISNA','NOT','CHOOSE','PMT','PV','FV']);
function multiCrit(args,from){const list=[];for(let i=from;i<args.length;i+=2){const rng=[args[i]].flat(Infinity);list.push([rng,criteria(args[i+1])])}const len=list[0]?.[0].length??0;if(list.some(([r])=>r.length!==len))throw Error('#VALORE!');return i=>list.every(([r,t])=>t(r[i]))}
function ifsValues(args){const vals=[args[0]].flat(Infinity),ok=multiCrit(args,1);if(vals.length!==[args[1]].flat(Infinity).length)throw Error('#VALORE!');const out=[];vals.forEach((v,i)=>{if(!ok(i))return;raise(v);const n=typeof v==='number'?v:rawNumber(v);if(!Number.isNaN(n))out.push(n)});return out}
// Aiuti per le funzioni di riepilogo: media (errore se non ci sono numeri), minimo e massimo (0 se non ci sono numeri).
const mean=list=>{if(!list.length)throw Error('#DIV/0!');return list.reduce((t,x)=>t+x,0)/list.length};
const extreme=(name,list)=>list.length?list.reduce(name.startsWith('MIN')?(a,b)=>Math.min(a,b):(a,b)=>Math.max(a,b)):0;
const truthy=x=>Boolean(numeric(x)),boolText=v=>v?'VERO':'FALSO',MATH_1={ABS:Math.abs,SIGN:Math.sign,INT:Math.floor};
const workday=n=>{const w=fromSerial(n).getUTCDay();return w!==0&&w!==6};
function excelFunc(name,args){const n0=fnCanon(name),n=CANON[n0]||n0;if(LIFT.has(n)&&args.some(isArr))return broadcast(args,a=>excelFunc(name,a));const flat=flatten(args);if(!LAZY.has(n)){const e=flat.find(isErr);if(e)throw Error(e.m)}const numbers=[];for(const x of flat){const v=rawNumber(x);if(!Number.isNaN(v))numbers.push(v)}const sum=a=>a.reduce((s,x)=>s+x,0),need=k=>{if(args.length<k)throw Error('#VALORE!')};
 switch(n){
 case 'SUM':return sum(numbers);
 case 'PRODUCT':return numbers.length?numbers.reduce((a,b)=>a*b,1):0;
 case 'SUMPRODUCT':{const arrs=args.map(a=>[a].flat(Infinity)),len=arrs[0]?.length||0;if(arrs.some(a=>a.length!==len))throw Error('#VALORE!');let t=0;for(let i=0;i<len;i++){let p=1;for(const a of arrs){const v=a[i];p*=typeof v==='number'?v:0}t+=p}return t}
 case 'AVERAGE':return mean(numbers);
 case 'MEDIAN':{if(!numbers.length)throw Error('#NUM!');const a=[...numbers].sort((x,y)=>x-y),h=a.length>>1;return a.length%2?a[h]:(a[h-1]+a[h])/2}
 case 'MODE.SNGL':{const cnt=new Map();let best=null,bc=1;for(const x of numbers){const c=(cnt.get(x)||0)+1;cnt.set(x,c);if(c>bc){bc=c;best=x}}if(best===null)throw Error('#N/D');return best}
 case 'MIN':case 'MAX':return extreme(n,numbers);
 case 'LARGE':case 'SMALL':{const a=[args[0]].flat(Infinity).filter(v=>typeof v==='number').sort((x,y)=>n==='LARGE'?y-x:x-y),k=Math.trunc(numeric(args[1]));if(k<1||k>a.length)throw Error('#NUM!');return a[k-1]}
 case 'RANK.EQ':{const x=numeric(args[0]),a=[args[1]].flat(Infinity).filter(v=>typeof v==='number');if(!a.includes(x))throw Error('#N/D');return (args[2]!==undefined&&numeric(args[2])?a.filter(v=>v<x):a.filter(v=>v>x)).length+1}
 case 'STDEV.S':case 'STDEV.P':case 'VAR.S':case 'VAR.P':{const pop=n.endsWith('.P'),k=numbers.length;if(k<(pop?1:2))throw Error('#DIV/0!');const m=sum(numbers)/k,v=sum(numbers.map(x=>(x-m)**2))/(pop?k:k-1);return n.startsWith('VAR')?v:Math.sqrt(v)}
 case 'COUNT':return numbers.length;
 case 'COUNTA':return flat.reduce((n,v)=>v===''||v==null?n:n+1,0);
 case 'COUNTBLANK':return flat.filter(v=>v===''||v===null||v===undefined).length;
 case 'COUNTIF':return [args[0]].flat(Infinity).filter(criteria(args[1])).length;
 case 'COUNTIFS':{const ok=multiCrit(args,0),len=[args[0]].flat(Infinity).length;let c=0;for(let i=0;i<len;i++)if(ok(i))c++;return c}
 case 'SUMIF':case 'AVERAGEIF':{const rng=[args[0]].flat(Infinity),sr=args[2]!==undefined?[args[2]].flat(Infinity):rng,t=criteria(args[1]),vals=[];rng.forEach((x,i)=>{if(!t(x))return;const v=raise(sr[i]),nv=typeof v==='number'?v:rawNumber(v);if(!Number.isNaN(nv))vals.push(nv)});if(n==='SUMIF')return sum(vals);if(!vals.length)throw Error('#DIV/0!');return sum(vals)/vals.length}
 case 'SUMIFS':return sum(ifsValues(args));
 case 'AVERAGEIFS':return mean(ifsValues(args));
 case 'MAXIFS':case 'MINIFS':return extreme(n,ifsValues(args));
 case 'IF':{const chosen=numeric(args[0])?args[1]??true:args[2]??false;return scalar(chosen)}
 case 'IFS':{for(let i=0;i+1<args.length;i+=2)if(numeric(args[i]))return scalar(args[i+1]);throw Error('#N/D')}
 case 'SWITCH':{need(3);const v=scalar(args[0]);let i=1;for(;i+1<args.length;i+=2)if(cmpVals(v,scalar(args[i]))===0)return scalar(args[i+1]);if(i<args.length)return scalar(args[i]);throw Error('#N/D')}
 case 'CHOOSE':{const i=Math.trunc(numeric(args[0]));if(i<1||i>=args.length)throw Error('#VALORE!');return scalar(args[i])}
 case 'IFERROR':{const v=first0(args[0]);return isErr(v)?scalar(args[1]??''):v}
 case 'IFNA':{const v=first0(args[0]);return isErr(v)&&v.m==='#N/D'?scalar(args[1]??''):raise(v)}
 case 'ISERROR':return isErr(first0(args[0]));
 case 'ISNA':{const v=first0(args[0]);return isErr(v)&&v.m==='#N/D'}
 case 'ISBLANK':{const v=first0(args[0]);return v===''||v===undefined||v===null}
 case 'ISNUMBER':return typeof first0(args[0])==='number';
 case 'ISTEXT':{const v=first0(args[0]);return typeof v==='string'&&v!==''}
 case 'NA':throw Error('#N/D');
 case 'AND':return flat.every(truthy);
 case 'OR':return flat.some(truthy);
 case 'NOT':return !numeric(args[0]);
 case 'ROUND':case 'ROUNDUP':case 'ROUNDDOWN':case 'TRUNC':{const d=Math.max(-10,Math.min(10,Math.trunc(args[1]===undefined?0:numeric(args[1])))),f=Math.pow(10,d),x=numeric(args[0])*f;return (n==='ROUND'?Math.sign(x)*Math.round(Math.abs(x)+1e-9):n==='ROUNDUP'?Math.sign(x)*Math.ceil(Math.abs(x)-1e-9):Math.trunc(x))/f}
 case 'MROUND':{const x=numeric(args[0]),m=numeric(args[1]);if(!m)return 0;if(Math.sign(x)*Math.sign(m)<0)throw Error('#NUM!');return Math.round(x/m+1e-9*Math.sign(x/m))*m}
 case 'MOD':{const a=numeric(args[0]),b=numeric(args[1]);if(!b)throw Error('#DIV/0!');return a-b*Math.floor(a/b)}
 case 'ABS':case 'SIGN':case 'INT':return MATH_1[n](numeric(args[0]));
 case 'SQRT':{const radicand=numeric(args[0]);if(radicand<0)throw Error('#NUM!');return Math.sqrt(radicand)}
 case 'POWER':return numeric(args[0])**numeric(args[1]);
 case 'PI':return Math.PI;
 case 'RAND':return Math.random();
 case 'RANDBETWEEN':{const a=Math.ceil(numeric(args[0])),b=Math.floor(numeric(args[1]));if(b<a)throw Error('#NUM!');return a+Math.floor(Math.random()*(b-a+1))}
 case 'LEN':return text(args[0]).length;
 case 'UPPER':return text(args[0]).toUpperCase();
 case 'LOWER':return text(args[0]).toLowerCase();
 case 'PROPER':return text(args[0]).toLowerCase().replace(/(^|[^A-Za-zÀ-ÿ])([a-zà-ÿ])/g,(m,a,b)=>a+b.toUpperCase());
 case 'TRIM':return text(args[0]).trim().replace(/\s+/g,' ');
 case 'LEFT':return text(args[0]).slice(0,args[1]===undefined?1:Math.max(0,numeric(args[1])));
 case 'RIGHT':{const s=text(args[0]),k=args[1]===undefined?1:Math.max(0,numeric(args[1]));return k?s.slice(-k):''}
 case 'MID':return text(args[0]).substr(Math.max(1,numeric(args[1]))-1,Math.max(0,numeric(args[2])));
 case 'REPT':{const k=Math.max(0,Math.trunc(numeric(args[1]))),s=text(args[0]);if(s.length*k>32767)throw Error('#VALORE!');return s.repeat(k)}
 case 'EXACT':return text(args[0])===text(args[1]);
 case 'FIND':case 'SEARCH':{const f=text(args[0]),w=text(args[1]),st=args[2]===undefined?1:Math.trunc(numeric(args[2]));if(st<1||st>w.length+1)throw Error('#VALORE!');let i;if(n==='FIND')i=w.indexOf(f,st-1);else{const re=new RegExp(escRe(f.toLowerCase()).replace(/\\\*/g,'[\\s\\S]*').replace(/\\\?/g,'.')),m=re.exec(w.toLowerCase().slice(st-1));i=m?m.index+st-1:-1}if(i<0)throw Error('#VALORE!');return i+1}
 case 'SUBSTITUTE':{const s=text(args[0]),o=text(args[1]),r=text(args[2]);if(!o)return s;if(args[3]===undefined)return s.split(o).join(r);const k=Math.trunc(numeric(args[3]));let i=-1;for(let j=0;j<k;j++){i=s.indexOf(o,i+1);if(i<0)return s}return s.slice(0,i)+r+s.slice(i+o.length)}
 case 'REPLACE':{const s=text(args[0]),st=Math.max(1,Math.trunc(numeric(args[1]))),k=Math.max(0,Math.trunc(numeric(args[2])));return s.slice(0,st-1)+text(args[3])+s.slice(st-1+k)}
 case 'CONCAT':return flat.map(v=>typeof v==='boolean'?boolText(v):v).join('');
 case 'TEXTJOIN':{const d=text(args[0]),skip=!!numeric(args[1]);return flatten(args.slice(2)).map(v=>typeof v==='boolean'?boolText(v):String(v??'')).filter(v=>!skip||v!=='').join(d)}
 case 'TEXT':return formatText(scalar(args[0]),text(args[1]));
 case 'VALUE':{const v=scalar(args[0]);if(typeof v==='number')return v;const s=String(v).replace(/[€$\s]/g,''),x=numOf(s);if(Number.isNaN(x))throw Error('#VALORE!');return x}
 case 'TODAY':return Math.floor(nowSerial());
 case 'NOW':return nowSerial();
 case 'DATE':{let y=Math.trunc(numeric(args[0]));if(y<1900)y+=1900;return serialOf(y,Math.trunc(numeric(args[1]))-1,Math.trunc(numeric(args[2])))}
 case 'TIME':{const t=(numeric(args[0])*3600+numeric(args[1])*60+numeric(args[2]))/86400;return t-Math.floor(t)}
 case 'YEAR':return fromSerial(toSerial(args[0])).getUTCFullYear();
 case 'MONTH':return fromSerial(toSerial(args[0])).getUTCMonth()+1;
 case 'DAY':return fromSerial(toSerial(args[0])).getUTCDate();
 case 'HOUR':case 'MINUTE':case 'SECOND':{const v=toSerial(args[0]),t=Math.round((v-Math.floor(v))*86400)%86400;return n==='HOUR'?Math.floor(t/3600):n==='MINUTE'?Math.floor(t%3600/60):t%60}
 case 'WEEKDAY':{const w=fromSerial(toSerial(args[0])).getUTCDay(),t=args[1]===undefined?1:Math.trunc(numeric(args[1]));if(t===1)return w+1;if(t===2)return (w+6)%7+1;if(t===3)return (w+6)%7;throw Error('#NUM!')}
 case 'WEEKNUM':{const d=fromSerial(toSerial(args[0])),t=args[1]===undefined?1:Math.trunc(numeric(args[1])),jan1=Date.UTC(d.getUTCFullYear(),0,1),off=(new Date(jan1).getUTCDay()-(t===2?1:0)+7)%7;return Math.floor(((d.getTime()-jan1)/86400000+off)/7)+1}
 case 'ISOWEEKNUM':{const d=fromSerial(toSerial(args[0])),dn=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dn+3);const ft=new Date(Date.UTC(d.getUTCFullYear(),0,4));return 1+Math.round(((d-ft)/86400000-3+(ft.getUTCDay()+6)%7)/7)}
 case 'DAYS':return Math.floor(toSerial(args[0]))-Math.floor(toSerial(args[1]));
 case 'DATEDIF':{const a=Math.floor(toSerial(args[0])),b=Math.floor(toSerial(args[1])),u=({A:'Y',G:'D',MG:'MD',AM:'YM',AG:'YD'})[text(args[2]).toUpperCase()]||text(args[2]).toUpperCase();if(a>b)throw Error('#NUM!');const A=fromSerial(a),B=fromSerial(b);let months=(B.getUTCFullYear()-A.getUTCFullYear())*12+B.getUTCMonth()-A.getUTCMonth();if(B.getUTCDate()<A.getUTCDate())months--;switch(u){case 'Y':return Math.floor(months/12);case 'M':return months;case 'D':return b-a;case 'YM':return months%12;case 'MD':{let md=B.getUTCDate()-A.getUTCDate();if(md<0)md+=new Date(Date.UTC(B.getUTCFullYear(),B.getUTCMonth(),0)).getUTCDate();return md}case 'YD':{let s=Date.UTC(B.getUTCFullYear(),A.getUTCMonth(),A.getUTCDate());if(s>B.getTime())s=Date.UTC(B.getUTCFullYear()-1,A.getUTCMonth(),A.getUTCDate());return Math.round((B.getTime()-s)/86400000)}default:throw Error('#NUM!')}}
 case 'EOMONTH':case 'EDATE':{const d=fromSerial(toSerial(args[0])),k=Math.trunc(numeric(args[1])),y=d.getUTCFullYear(),m=d.getUTCMonth()+k;if(n==='EOMONTH')return serialOf(y,m+1,0);const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return serialOf(y,m,Math.min(d.getUTCDate(),last))}
 case 'NETWORKDAYS':{let a=Math.floor(toSerial(args[0])),b=Math.floor(toSerial(args[1]));const hol=new Set([args[2]??[]].flat(Infinity).map(numOf).filter(x=>!Number.isNaN(x)).map(Math.floor)),sg=a<=b?1:-1;if(sg<0)[a,b]=[b,a];if(b-a>40000)throw Error('#NUM!');let c=0;for(let x=a;x<=b;x++)if(workday(x)&&!hol.has(x))c++;return c*sg}
 case 'WORKDAY':{let x=Math.floor(toSerial(args[0])),k=Math.trunc(numeric(args[1]));const hol=new Set([args[2]??[]].flat(Infinity).map(numOf).filter(v=>!Number.isNaN(v)).map(Math.floor)),sg=k<0?-1:1;if(Math.abs(k)>20000)throw Error('#NUM!');while(k){x+=sg;if(workday(x)&&!hol.has(x))k-=sg}return x}
 case 'VLOOKUP':case 'HLOOKUP':{const key=scalar(args[0]);let tbl=as2d(args[1]);if(n==='HLOOKUP')tbl=tbl[0].map((_,c)=>tbl.map(r=>r[c]));const ci=Math.trunc(numeric(args[2])),exact=args[3]!==undefined&&!numeric(args[3]);if(ci<1||ci>(tbl[0]?.length||0))throw Error('#REF!');let hit=-1;if(exact)hit=tbl.findIndex(r=>!isErr(r[0])&&(typeof key==='string'&&/[*?]/.test(key)?wildRe(key).test(String(r[0]).toLowerCase()):cmpVals(r[0],key)===0));else for(let i=0;i<tbl.length;i++){const x=tbl[i][0];if(x===''||isErr(x))continue;if(cmpVals(x,key)<=0)hit=i;else break}if(hit<0)throw Error('#N/D');return raise(tbl[hit][ci-1])}
 case 'MATCH':{const key=scalar(args[0]),arr=[args[1]].flat(Infinity),t=args[2]===undefined?1:Math.trunc(numeric(args[2]));let hit=-1;if(t===0)hit=arr.findIndex(x=>!isErr(x)&&(typeof key==='string'&&/[*?]/.test(key)?wildRe(key).test(String(x).toLowerCase()):cmpVals(x,key)===0));else for(let i=0;i<arr.length;i++){const x=arr[i];if(x===''||isErr(x))continue;const c=cmpVals(x,key);if(t>0?c<=0:c>=0)hit=i;else break}if(hit<0)throw Error('#N/D');return hit+1}
 case 'INDEX':{const tbl=as2d(args[0]),r=Math.trunc(numeric(args[1])),c=args[2]===undefined?null:Math.trunc(numeric(args[2]));if(r<0||c<0)throw Error('#VALORE!');if(r===0&&c===null)return tbl;if(r===0){if(c>tbl[0].length)throw Error('#REF!');return tbl.map(row=>[row[c-1]])}if(r>(c===null&&tbl.length===1?tbl[0].length:tbl.length))throw Error('#REF!');if(c===0)return [tbl[r-1]];let v;if(c===null)v=tbl.length===1?tbl[0][r-1]:tbl[0].length===1?tbl[r-1][0]:null;else v=tbl[r-1]?.[c-1];if(v===null)return [tbl[r-1]];if(v===undefined)throw Error('#REF!');return raise(v)}
 case 'XLOOKUP':case 'XMATCH':{need(n==='XLOOKUP'?3:2);const key=scalar(args[0]),look=as2d(args[1]),vert=look.length>1||look[0].length===1,arr=vert?look.map(r=>r[0]):look[0],off=n==='XLOOKUP'?4:2,mode=args[off]===undefined?0:Math.trunc(numeric(args[off])),rev=args[off+1]!==undefined&&numeric(args[off+1])<0,hit=xfind(key,arr,mode,rev);if(n==='XMATCH'){if(hit<0)throw Error('#N/D');return hit+1}if(hit<0){if(args[3]!==undefined&&first0(args[3])!=='')return args[3];throw Error('#N/D')}const ret=as2d(args[2]);if(vert){const row=ret[hit];if(!row)throw Error('#VALORE!');return row.length===1?raise(row[0]):[row]}const col=ret.map(r=>r[hit]);if(col.some(v=>v===undefined))throw Error('#VALORE!');return col.length===1?raise(col[0]):col.map(v=>[v])}
 case 'FILTER':{const A=as2d(args[0]),I=as2d(args[1]);let out;if(I.length===A.length&&I[0].length===1)out=A.filter((_,i)=>numeric(I[i][0]));else if(I.length===1&&I[0].length===A[0].length){const keep=I[0].map(x=>!!numeric(x));out=A.map(r=>r.filter((_,j)=>keep[j]));if(!out[0].length)out=[]}else throw Error('#VALORE!');if(!out.length){if(args[2]!==undefined)return args[2];throw Error('#CALC!')}return out}
 case 'SORT':{const byCol=args[3]!==undefined&&!!numeric(args[3]);let A=as2d(args[0]);if(byCol)A=transpose(A);const k=args[1]===undefined?1:Math.trunc(numeric(args[1])),o=args[2]===undefined?1:numeric(args[2]);if(k<1||k>A[0].length)throw Error('#VALORE!');const out=[...A].sort((x,y)=>sortCmp(x[k-1],y[k-1])*(o<0?-1:1));return byCol?transpose(out):out}
 case 'SORTBY':{const A=as2d(args[0]),keys=[];for(let i=1;i<args.length;i+=2){const K=as2d(args[i]),col=K.length===A.length&&K[0].length===1?K.map(r=>r[0]):K.length===1&&K[0].length===A.length?K[0]:null;if(!col)throw Error('#VALORE!');keys.push([col,args[i+1]===undefined?1:numeric(args[i+1])])}return A.map((_,i)=>i).sort((x,y)=>{for(const [col,o] of keys){const d=sortCmp(col[x],col[y]);if(d)return o<0?-d:d}return x-y}).map(i=>A[i])}
 case 'UNIQUE':{const byCol=args[1]!==undefined&&!!numeric(args[1]),once=args[2]!==undefined&&!!numeric(args[2]);let A=as2d(args[0]);if(byCol)A=transpose(A);const key=r=>JSON.stringify(r.map(v=>isErr(v)?'#'+v.m:typeof v==='string'?'s'+v.toLowerCase():v)),cnt=new Map();for(const r of A)cnt.set(key(r),(cnt.get(key(r))||0)+1);const seen=new Set(),out=[];for(const r of A){const k=key(r);if(seen.has(k))continue;seen.add(k);if(!once||cnt.get(k)===1)out.push(r)}if(!out.length)throw Error('#CALC!');return byCol?transpose(out):out}
 case 'SEQUENCE':{const R=Math.trunc(numeric(args[0])),W=args[1]===undefined?1:Math.trunc(numeric(args[1])),st=args[2]===undefined?1:numeric(args[2]),stp=args[3]===undefined?1:numeric(args[3]);if(R<1||W<1)throw Error('#CALC!');if(R*W>100000)throw Error('#NUM!');return Array.from({length:R},(_,i)=>Array.from({length:W},(_,j)=>st+(i*W+j)*stp))}
 case 'RANDARRAY':{const R=args[0]===undefined?1:Math.trunc(numeric(args[0])),W=args[1]===undefined?1:Math.trunc(numeric(args[1])),lo=args[2]===undefined?0:numeric(args[2]),hi=args[3]===undefined?1:numeric(args[3]),whole=args[4]!==undefined&&!!numeric(args[4]);if(R<1||W<1)throw Error('#CALC!');if(R*W>100000||hi<lo)throw Error('#NUM!');return Array.from({length:R},()=>Array.from({length:W},()=>whole?Math.ceil(lo)+Math.floor(Math.random()*(Math.floor(hi)-Math.ceil(lo)+1)):lo+Math.random()*(hi-lo)))}
 case 'TRANSPOSE':return transpose(as2d(args[0]));
 case 'CHOOSECOLS':case 'CHOOSEROWS':{const cols=n==='CHOOSECOLS';let A=as2d(args[0]);if(cols)A=transpose(A);const ix=flatten(args.slice(1)).map(x=>Math.trunc(numeric(x)));if(!ix.length)throw Error('#VALORE!');const out=ix.map(k=>{const i=k<0?A.length+k:k-1;if(!k||i<0||i>=A.length)throw Error('#VALORE!');return A[i]});return cols?transpose(out):out}
 case 'VSTACK':case 'HSTACK':{let parts=args.filter(a=>a!==undefined).map(as2d);if(n==='HSTACK')parts=parts.map(transpose);const w=Math.max(...parts.map(p=>Math.max(...p.map(r=>r.length)))),out=[];for(const p of parts)for(const r of p)out.push(r.length<w?[...r,...Array.from({length:w-r.length},()=>new FErr('#N/D'))]:r);return n==='HSTACK'?transpose(out):out}
 case 'TAKE':case 'DROP':{const A=as2d(args[0]),k1=args[1]===undefined?null:Math.trunc(numeric(args[1])),k2=args[2]===undefined?null:Math.trunc(numeric(args[2])),sl=(len,k)=>k===null?[0,len]:n==='TAKE'?(k>=0?[0,Math.min(k,len)]:[Math.max(0,len+k),len]):(k>=0?[Math.min(k,len),len]:[0,Math.max(0,len+k)]),[r0,r1]=sl(A.length,k1),[c0,c1]=sl(A[0].length,k2);if(r1<=r0||c1<=c0)throw Error('#CALC!');return A.slice(r0,r1).map(r=>r.slice(c0,c1))}
 case 'TOCOL':case 'TOROW':{const A=as2d(args[0]),ig=args[1]===undefined?0:Math.trunc(numeric(args[1])),byCol=args[2]!==undefined&&!!numeric(args[2]),v=(byCol?transpose(A):A).flat().filter(x=>!((ig&1)&&(x===''||x==null))&&!((ig&2)&&isErr(x)));if(!v.length)throw Error('#CALC!');return n==='TOCOL'?v.map(x=>[x]):[v]}
 case 'TEXTSPLIT':{const t=text(args[0]),dl=a=>a===undefined?[]:[a].flat(Infinity).map(x=>text(x)).filter(Boolean),cd=dl(args[1]),rd=dl(args[2]),skip=args[3]!==undefined&&!!numeric(args[3]),ci=args[4]!==undefined&&!!numeric(args[4]),pad=args[5]===undefined?new FErr('#N/D'):scalar(args[5]);if(!cd.length&&!rd.length)throw Error('#VALORE!');const split=(s,ds)=>ds.length?s.split(new RegExp(ds.map(escRe).join('|'),ci?'gi':'g')):[s];let rows=split(t,rd).map(r=>split(r,cd));if(skip)rows=rows.map(r=>r.filter(x=>x!=='')).filter(r=>r.length);if(!rows.length)throw Error('#CALC!');const w=Math.max(...rows.map(r=>r.length));return rows.map(r=>[...r,...Array(w-r.length).fill(pad)])}
 case 'PMT':{const r=numeric(args[0]),k=numeric(args[1]),pv=numeric(args[2]),fv=args[3]===undefined?0:numeric(args[3]),t=args[4]===undefined?0:numeric(args[4]);if(!k)throw Error('#NUM!');if(!r)return -(pv+fv)/k;const q=Math.pow(1+r,k);return -(r*(fv+pv*q))/((1+r*t)*(q-1))}
 case 'PV':{const r=numeric(args[0]),k=numeric(args[1]),p=numeric(args[2]),fv=args[3]===undefined?0:numeric(args[3]),t=args[4]===undefined?0:numeric(args[4]);if(!r)return -(fv+p*k);const q=Math.pow(1+r,k);return -(fv+p*(1+r*t)*(q-1)/r)/q}
 case 'FV':{const r=numeric(args[0]),k=numeric(args[1]),p=numeric(args[2]),pv=args[3]===undefined?0:numeric(args[3]),t=args[4]===undefined?0:numeric(args[4]);if(!r)return -(pv+p*k);const q=Math.pow(1+r,k);return -(pv*q+p*(1+r*t)*(q-1)/r)}
 case 'NPV':{const r=numeric(args[0]);return flatten(args.slice(1)).filter(v=>typeof v==='number').reduce((s,v,i)=>s+v/Math.pow(1+r,i+1),0)}
 default:throw Error('#NOME?')}}
// Scomposizione in simboli. L'ordine delle regole conta: prima i riferimenti speciali (matrice espansa A1#,
// colonne intere A:B, righe intere 1:3), poi celle, numeri, testi, nomi di foglio tra apici, nomi e operatori.
const FORMULA_TOKENS=[/\$?[A-Za-z]{1,3}\$?\d+#/y,/\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}(?![A-Za-z0-9_.(])/y,/\$?\d+:\$?\d+(?![\d.])/y,/\$?[A-Za-z]{1,3}\$?\d+/y,/\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y,/"(?:[^"]|"")*"/y,/'(?:[^']|'')*'/y,/[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*/y,/[<>]=|<>/y,/[()+\-*\/^&%=<>:!,;]/y];
function formulaTokens(src){const out=[];let at=0;
 while(at<src.length){if(/\s/.test(src[at])){at++;continue}let tok=null;for(const rule of FORMULA_TOKENS){rule.lastIndex=at;const m=rule.exec(src);if(m){tok=m[0];break}}if(tok===null)throw Error('#FORMULA!');out.push(tok);at+=tok.length}
 return out}
const BIN_RANK={'^':5,'*':4,'/':4,'%':4,'+':3,'-':3,'&':2,'=':1,'<>':1,'<':1,'>':1,'<=':1,'>=':1};
const AFTER_PERCENT=new Set([')',',',';','+','-','*','/','&','=','<','>','<>','<=','>=']);
// Un errore come #DIV/0! dentro un argomento diventa un valore: SE.ERRORE e simili possono gestirlo.
const recoverable=e=>{const m=String(e.message);return m.startsWith('#')&&m!=='#FORMULA!'&&m!=='#CIRC!'};
function evaluateFormula(formula,curSheet,stack){const body=formula.slice(1).replace(/^\s+/,'');if(/#REF!/i.test(body))throw Error('#REF!');
 const toks=formulaTokens(body);let pos=0;
 const look=()=>toks[pos],next=()=>toks[pos++],need=t=>{if(next()!==t)throw Error('#FORMULA!')};
 const cellAt=(r,c,s)=>{try{return evaluateCell(r,c,s,stack)}catch(e){const m=String(e.message);if(m.startsWith('#')&&m!=='#CIRC!')return new FErr(m);throw e}};
 const grid=(top,bottom,left,right,s)=>{if((bottom-top+1)*(right-left+1)>100000)throw Error('#RANGE!');return Array.from({length:bottom-top+1},(_,i)=>Array.from({length:right-left+1},(_,j)=>cellAt(top+i,left+j,s)))};
 const span=(a,b)=>a<=b?[a,b]:[b,a];
 function special(tok,s){
  if(tok.endsWith('#')){const at=parseRef(tok.slice(0,-1));if(!at)throw Error('#REF!');return spillArray(at.r,at.c,s,stack)}
  let m=/^\$?([A-Za-z]{1,3}):\$?([A-Za-z]{1,3})$/.exec(tok);
  if(m){const [a,b]=span(colNo(m[1]),colNo(m[2]));if(b>=COLS)throw Error('#REF!');return grid(0,usedWithSpills(s,stack).r,a,b,s)}
  m=/^\$?(\d+):\$?(\d+)$/.exec(tok);
  if(m){const [a,b]=span(Number(m[1])-1,Number(m[2])-1);if(a<0||b>=ROWS)throw Error('#REF!');return grid(a,b,0,usedWithSpills(s,stack).c,s)}
  return null}
 function numberToken(tok){const v=Number(tok);if(look()==='%'&&(pos+1>=toks.length||AFTER_PERCENT.has(toks[pos+1]))){pos++;return v/100}return v}
 function skipArgument(){let depth=0;for(;pos<toks.length;pos++){const k=toks[pos];if(k==='(')depth++;else if(k===')'){if(!depth)return;depth--}else if((k===','||k===';')&&!depth)return}}
 function argumentList(){const args=[];if(look()===')'){pos++;return args}
  for(;;){const t=look(),start=pos;if(t===';'||t===','||t===')')args.push(undefined);else{try{args.push(parseExpr())}catch(e){if(!recoverable(e))throw e;pos=start;skipArgument();args.push(new FErr(e.message))}}
   if(look()===','||look()===';'){pos++;continue}break}
  need(')');return args}
 function parseUnit(){let tok=next();if(tok===undefined)throw Error('#FORMULA!');
  if(tok==='+'||tok==='-'){const v=parseExpr(6),neg=tok==='-';return mapArr(v,x=>{const n=numeric(x);return neg?-n:n})}
  if(tok==='('){const v=parseExpr();need(')');return v}
  if(tok.startsWith('"'))return tok.slice(1,-1).replace(/""/g,'"');
  const area=special(tok,curSheet);if(area)return area;
  if(/^\d/.test(tok))return numberToken(tok);
  let where=curSheet;
  if(look()==='!'){pos++;const title=tok.startsWith("'")?tok.slice(1,-1).replace(/''/g,"'"):tok;where=getSheetByName(title);if(!where)throw Error('#REF!');tok=next();if(!tok)throw Error('#REF!');const other=special(tok,where);if(other)return other}
  const at=parseRef(tok);
  if(at){if(look()!==':')return evaluateCell(at.r,at.c,where,stack);pos++;const end=parseRef(next());if(!end)throw Error('#REF!');const [r1,r2]=span(at.r,end.r),[c1,c2]=span(at.c,end.c);return grid(r1,r2,c1,c2,where)}
  if(look()==='('){pos++;return excelFunc(tok,argumentList())}
  const word=tok.toUpperCase();if(word==='TRUE'||word==='VERO')return true;if(word==='FALSE'||word==='FALSO')return false;
  const named=getName(tok);if(named)return nameValue(named,stack);throw Error('#NOME?')}
 function parseExpr(minRank=0){let left=parseUnit();
  while(pos<toks.length){const op=look(),rank=BIN_RANK[op]||0;if(!rank||rank<minRank)break;pos++;const right=parseExpr(op==='^'?rank:rank+1);left=isArr(left)||isArr(right)?broadcast([left,right],([u,v])=>binop(op,u,v)):binop(op,left,right)}
  return left}
 const result=parseExpr();if(look()!==undefined)throw Error('#FORMULA!');return result}
// Operatori: & unisce testi; i confronti usano i numeri quando entrambi i lati lo sono, altrimenti il testo
// senza distinguere maiuscole e minuscole; gli altri operatori sono aritmetici.
const COMPARE={'=':(a,b)=>a==b,'<>':(a,b)=>a!=b,'>':(a,b)=>a>b,'>=':(a,b)=>a>=b,'<':(a,b)=>a<b,'<=':(a,b)=>a<=b};
const ARITH={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>{if(!b)throw Error('#DIV/0!');return a/b},'%':(a,b)=>b?a%b:0,'^':(a,b)=>a**b};
function binop(op,a,b){a=raise(a);b=raise(b);if(op==='&')return text(a)+text(b);
 const compare=Object.hasOwn(COMPARE,op)?COMPARE[op]:null;
 if(compare){const x=typeof a==='boolean'?NaN:numOf(a),y=typeof b==='boolean'?NaN:numOf(b);if(!Number.isNaN(x)&&!Number.isNaN(y))return compare(x,y);
  return typeof a==='string'&&typeof b==='string'?compare(a.toLowerCase(),b.toLowerCase()):compare(a,b)}
 const apply=Object.hasOwn(ARITH,op)?ARITH[op]:ARITH['^'];return apply(numeric(a),numeric(b))}
// Espansione: la formula resta nella cella di partenza, le celle vicine mostrano il resto della matrice.
const cellKey=(s,r,c)=>state.sheets.indexOf(s)+':'+toRef(r,c);
const DYN_RE=/[:#]|SEQUENZA|SEQUENCE|MATR\.CASUALE|RANDARRAY|TESTO\.DIVIDI|TEXTSPLIT/i;
function anchorRaw(r,c,s,stack){const key=cellKey(s,r,c),mk='raw:'+key;if(calcMemo.has(mk)){const m=calcMemo.get(mk);if(m instanceof Error)throw m;return m}if(stack.has(key))throw Error('#CIRC!');stack.add(key);try{let res=evaluateFormula(cellRaw(r,c,s),s,stack);if(isArr(res)){res=normArr(res);if(res.length===1&&res[0].length===1)res=raise(res[0][0])}else res=raise(res);calcMemo.set(mk,res);return res}catch(e){if(String(e.message).startsWith('#')&&e.message!=='#CIRC!')calcMemo.set(mk,e);throw e}finally{stack.delete(key)}}
function spillOf(r,c,s,stack){const mk='sp:'+cellKey(s,r,c);if(calcMemo.has(mk))return calcMemo.get(mk);const raw=anchorRaw(r,c,s,stack),o={r1:r,c1:c,r2:r+raw.length-1,c2:c+raw[0].length-1,blocked:false,blocker:null};if(o.r2>=ROWS||o.c2>=COLS){o.blocked=true;o.blocker='edge'}else{const hit=(y,x)=>(y!==r||x!==c)&&s.cells[toRef(y,x)]&&s.cells[toRef(y,x)].v!=='';if(raw.length*raw[0].length<=Object.keys(s.cells).length*2){outer:for(let y=o.r1;y<=o.r2;y++)for(let x=o.c1;x<=o.c2;x++)if(hit(y,x)){o.blocked=true;o.blocker=toRef(y,x);break outer}}else for(const ref of Object.keys(s.cells)){const q=parseRef(ref);if(q&&q.r>=o.r1&&q.r<=o.r2&&q.c>=o.c1&&q.c<=o.c2&&hit(q.r,q.c)){o.blocked=true;o.blocker=ref;break}}}calcMemo.set(mk,o);return o}
function anchorsOf(s){const mk='an:'+state.sheets.indexOf(s);if(calcMemo.has(mk))return calcMemo.get(mk);const list=[];for(const [ref,ob] of Object.entries(s.cells)){const v=ob?.v;if(typeof v==='string'&&v.length>1&&v.startsWith('=')&&DYN_RE.test(v)){const q=parseRef(ref);if(q)list.push(q)}}list.sort((a,b)=>a.r-b.r||a.c-b.c);calcMemo.set(mk,list);return list}
function spillAt(r,c,s,stack){for(const a of anchorsOf(s)){if(a.r>r)break;if(a.c>c||(a.r===r&&a.c===c)||stack.has(cellKey(s,a.r,a.c)))continue;let raw;try{raw=anchorRaw(a.r,a.c,s,stack)}catch(e){continue}if(!isArr(raw)||r>a.r+raw.length-1||c>a.c+raw[0].length-1)continue;if(spillOf(a.r,a.c,s,stack).blocked)continue;return{ar:a.r,ac:a.c,value:raw[r-a.r][c-a.c]}}return null}
function spillArray(r,c,s,stack){const v=cellRaw(r,c,s);if(typeof v!=='string'||!v.startsWith('='))throw Error('#REF!');const raw=anchorRaw(r,c,s,stack);if(!isArr(raw))return [[raw]];if(spillOf(r,c,s,stack).blocked)throw Error('#ESPANDI!');return raw}
function usedWithSpills(s,stack){const k='ub:'+state.sheets.indexOf(s);if(calcMemo.has(k))return calcMemo.get(k);const u={...usedBounds(s)};let skipped=false;for(const a of anchorsOf(s)){if(stack.has(cellKey(s,a.r,a.c))){skipped=true;continue}try{const raw=anchorRaw(a.r,a.c,s,stack);if(isArr(raw)){u.r=Math.max(u.r,Math.min(ROWS-1,a.r+raw.length-1));u.c=Math.max(u.c,Math.min(COLS-1,a.c+raw[0].length-1))}}catch(e){}}if(!skipped)calcMemo.set(k,u);return u}
// Valore di una cella: formula (la prima cella della sua matrice), valore espanso da una matrice vicina,
// oppure il contenuto scritto letto come numero, data o testo. Il risultato resta in memoria fino alla modifica successiva.
function literalValue(v,asText){if(typeof v!=='string')return v;if(!v.trim())return '';if(asText)return v;const num=rawNumber(v);if(!Number.isNaN(num)&&!/^0\d/.test(v))return num;const dt=parseDateText(v);return dt?dt.v:v}
function evaluateCell(r,c,s=sheet(),stack=new Set()){const key=cellKey(s,r,c);if(!calcMemo.has(key)){const v=cellRaw(r,c,s);let res;
  if(typeof v==='string'&&v.length>1&&v[0]==='='){const raw=anchorRaw(r,c,s,stack);if(!isArr(raw))res=raw;else if(spillOf(r,c,s,stack).blocked)throw Error('#ESPANDI!');else res=raise(raw[0][0])}
  else if(v==null||v===''){const near=spillAt(r,c,s,stack);res=near?raise(near.value):''}
  else res=literalValue(v,cell(r,c,s)?.s?.fmt==='Testo');
  calcMemo.set(key,res)}
 return calcMemo.get(key)}
// Valore calcolato di una cella; un errore di calcolo diventa il suo codice (#DIV/0!, #RIF!…) o #ERRORE!.
function computed(r,c,s=sheet()){let value;try{value=evaluateCell(r,c,s)}catch(err){const code=String(err?.message||'');value=code.startsWith('#')?code:'#ERRORE!'}return value}
const DATE_KIND={d:'Data',t:'Ora',dt:'Data e ora'};
const CELL_FORMATS={
 Percentuale:(v,st,dp)=>(v*100).toLocaleString('it-IT',{minimumFractionDigits:st.decimal===undefined?0:dp,maximumFractionDigits:dp})+'%',
 Valuta:(v,st)=>{const d=st.decimal??2;return v.toLocaleString('it-IT',{currency:'EUR',style:'currency',maximumFractionDigits:d,minimumFractionDigits:d})},
 Numero:(v,st,dp)=>v.toLocaleString('it-IT',{minimumFractionDigits:dp,maximumFractionDigits:dp}),
 Data:v=>fmtDate(v),Ora:v=>fmtTime(v),'Data e ora':v=>v<0?'#DATA!':`${fmtDate(v)} ${fmtTime(v)}`};
function displayValue(r,c,s=sheet()){const v=computed(r,c,s),st=cell(r,c,s)?.s||{},raw=String(cellRaw(r,c,s)),isFormula=raw.startsWith('=');let fmt=st.fmt||'Generale';
 if(fmt==='Testo'&&!isFormula)return raw;
 if(typeof v==='boolean')return boolText(v);
 if(!Number.isFinite(v))return String(v??'');
 if(!isFormula&&fmt==='Generale'&&Number.isNaN(rawNumber(raw))){const dt=parseDateText(raw);if(dt)fmt=DATE_KIND[dt.kind]}
 const show=CELL_FORMATS[fmt];if(show)return show(v,st,st.decimal??2);
 return Number.isInteger(v)?String(v):Number(v.toPrecision(12)).toLocaleString('it-IT',{useGrouping:false,maximumFractionDigits:10})}
