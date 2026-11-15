// ——— Conversione di più file in una volta. È il lavoro che in radio si fa quando arrivano dieci file da fonti
// diverse — registratori, telefonini, archivi, video — e devono uscire tutti uguali: stesso formato, stessa
// frequenza, stesso volume, stessi metadati. I file si convertono uno alla volta e alla fine arrivano in uno ZIP;
// il riepilogo dice, per ognuno, durata, volume e se ce l'ha fatta.

// Scelta dei file: la finestra del sistema, che si usa anche da tastiera. Se si annulla, la promessa si chiude vuota.
function pickAudioFiles(){return new Promise(resolve=>{const inp=document.createElement('input');inp.type='file';inp.multiple=true;
 inp.accept='audio/*,.wav,.wave,.aiff,.aif,.aifc,.mp3,.m4a,.aac,.ogg,.oga,.opus,.flac,.webm';
 inp.style.position='fixed';inp.style.left='-9999px';inp.tabIndex=-1;document.body.append(inp);
 const done=files=>{inp.remove();resolve(files)};inp.onchange=()=>done([...inp.files]);inp.oncancel=()=>done([]);inp.click()})}
// Schema del nome: {nome} il nome del file, {numero} la posizione, {data} e {ora} il giorno e l'ora, {durata} i secondi.
function batchName(pattern,{nome,numero,durata}){const d=new Date(),sec=Math.round(durata);
 const token={nome,numero:String(numero).padStart(2,'0'),data:`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`,ora:`${pad2(d.getHours())}-${pad2(d.getMinutes())}`,durata:`${Math.floor(sec/60)}m${pad2(sec%60)}`};
 return String(pattern||'{nome}').replace(/\{(nome|numero|data|ora|durata)\}/gi,(m,k)=>token[k.toLowerCase()]??m)}
// Due file con lo stesso nome non si sovrascrivono: il secondo prende -2, il terzo -3 e così via.
function uniqueName(name,used){const ext=name.slice(baseName(name).length)||'',base=baseName(name);let out=name,n=1;
 while(used.has(out.toLowerCase())){n++;out=base+'-'+n+ext}used.add(out.toLowerCase());return out}
// Converte l'elenco: ogni file passa da decodifica, consegna (canali, frequenza, volume, picco) e codifica.
// Gli errori di un file non fermano gli altri: finiscono nel riepilogo con il loro messaggio.
async function batchConvertFiles(files,opt,progress=status){const used=new Set(),out=[],rows=[];
 for(const [i,f] of files.entries()){progress(`Conversione ${i+1} di ${files.length}: ${f.name}`);
  try{const {buffer}=await decodeAudioFile(f);if(!buffer)throw Error('nessun audio in questo file');
   const prep=await prepareDelivery(buffer,opt.plan,()=>{}),src=prep.out,
    chs=Array.from({length:src.numberOfChannels},(_,c)=>src.getChannelData(c)),m=analyzeDelivery(chs,src.sampleRate),
    base=baseName(f.name)||'Senza titolo',name=uniqueName(extName(batchName(opt.pattern,{nome:base,numero:i+1,durata:m.dur}),opt.ext),used),
    tags={title:base,artist:opt.artist,comment:opt.comment,year:String(new Date().getFullYear())};
   let blob;
   if(opt.fmt==='mp3')blob=await mp3Blob(src,opt.kbps,tags);
   else if(opt.fmt.startsWith('wav')){const bex=opt.bwf?{description:opt.comment||base,originator:opt.artist||'Tassello Media',reference:name,date:new Date(),
     loudness:{value:m.lufs,range:m.lra,truePeak:m.truePeak},codingHistory:`A=PCM,F=${src.sampleRate},W=${opt.fmt.slice(3)},M=${src.numberOfChannels===1?'mono':'stereo'},T=Tassello Media {{VERSIONE}}`}:null;
    blob=wavBlob(src,Number(opt.fmt.slice(3)),[],0,src.length,{dither:opt.dither&&opt.fmt==='wav16',bext:bex})}
   else blob=await compressedBlob(src,opt.fmt,opt.kbps*1000,()=>{},tags);
   out.push({name,data:blob});rows.push({file:f.name,name,ok:true,dur:m.dur,lufs:m.lufs,tp:m.truePeak,size:blob.size,limited:prep.limited})}
  catch(e){rows.push({file:f.name,ok:false,error:e.message||String(e)})}}
 return{files:out,rows}}
function batchReport(rows,opt,zipSize){const done=rows.filter(r=>r.ok),bad=rows.filter(r=>!r.ok);
 const summary=`${done.length===rows.length?`Tutti i ${rows.length} file convertiti`:`${done.length} file su ${rows.length} convertiti`}${bad.length?`, ${bad.length===1?'uno non è riuscito':bad.length+' non sono riusciti'}`:''}.`;
 const lines=rows.map(r=>r.ok?`${r.name}: ${fmtTime(r.dur)}, ${Number.isFinite(r.lufs)?fmtNum(r.lufs,1)+' LUFS':'volume non misurabile'}, picco vero ${fmtNum(r.tp,1)} dBTP, ${fmtBytes(r.size)}`:`${r.file}: non convertito, ${r.error}`);
 const text=[`Conversione di più file — ${new Date().toLocaleString('it-IT')}`,`Formato: ${opt.fmtLabel}`,`Volume: ${opt.plan.lufs!==null?fmtNum(opt.plan.lufs,0)+' LUFS':'nessuna normalizzazione'}${opt.plan.tp!==null?`, picco vero ${fmtNum(opt.plan.tp,0)} dBTP`:''}`,`ZIP: ${fmtBytes(zipSize)}`,'',...lines].join('\n')+'\n';
 return{summary,lines,text,rows}}
function showBatchReport(rep){const trs=rep.rows.map(r=>r.ok
  ?`<tr><th scope="row">${esc(r.name)}</th><td>${esc(fmtTime(r.dur))}</td><td>${Number.isFinite(r.lufs)?esc(fmtNum(r.lufs,1))+' LUFS':'—'}</td><td>${esc(fmtNum(r.tp,1))} dBTP</td><td>${esc(fmtBytes(r.size))}</td></tr>`
  :`<tr><th scope="row">${esc(r.file)}</th><td colspan="4">Non convertito: ${esc(r.error)}</td></tr>`).join('');
 return modal('Riepilogo della conversione',`<p id="batchSum">${esc(rep.summary)}</p><table><caption>File convertiti, uno per riga</caption><thead><tr><th scope="col">File</th><th scope="col">Durata</th><th scope="col">Volume</th><th scope="col">Picco vero</th><th scope="col">Dimensione</th></tr></thead><tbody>${trs}</tbody></table>`,[],'Chiudi',{noCancel:true,wide:true,describedBy:'batchSum',
  buttons:[{label:'Salva il riepilogo',run:()=>{download(rep.text,extName('conversione - riepilogo','txt'),'text/plain');announce('Riepilogo salvato come file di testo')}}]})}

async function batchConvertDialog(){const files=await pickAudioFiles();if(!files.length)return;
 const [aac,opus]=await Promise.all([codecSupported('aac'),codecSupported('opus')]);
 const opts=[['wav16','WAV 16 bit (qualità CD)'],['wav24','WAV 24 bit (per altri programmi professionali)'],['wav32','WAV 32 bit in virgola mobile (senza perdite)'],['mp3','MP3 (playout, telefonini e archivio)'],...(aac?[['aac','M4A con AAC']]:[]),...(opus?[['opus','WebM con Opus']]:[])];
 const total=files.reduce((n,f)=>n+f.size,0),many=files.length>1;
 const r=await modal('Converti più file',
  `<p>${many?`${files.length} file, ${fmtBytes(total)} in tutto.`:`Un file, ${fmtBytes(total)}.`} Ognuno diventa un file nuovo con lo stesso formato, la stessa frequenza e lo stesso volume: alla fine arrivano in un archivio ZIP${many?'':', come singolo file'}.</p><p>Un file alla volta: i file convertiti restano in memoria fino alla fine.</p>`,
  [{id:'preset',label:'Consegna',type:'select',value:prefs.delivery||'manual',options:Object.entries(DELIVERY).map(([k,v])=>[k,v.label]),hint:'Imposta formato, frequenza, canali e volume; i campi sotto restano modificabili.'},
   {id:'fmt',label:'Formato',type:'select',value:opts.some(o=>o[0]===prefs.audioFormat)?prefs.audioFormat:'wav24',options:opts},
   {id:'rate',label:'Frequenza',type:'select',value:prefs.deliveryRate||'auto',options:[['auto','Come la sorgente'],['44100','44100 Hz (CD)'],['48000','48000 Hz (radio e video)']]},
   {id:'ch',label:'Canali',type:'select',value:prefs.deliveryCh||'auto',options:[['auto','Come la sorgente'],['1','Mono'],['2','Stereo']]},
   {id:'lufs',label:'Volume percepito',type:'select',value:prefs.deliveryLufs||'none',options:LUFS_CHOICES},
   {id:'tp',label:'Picco vero massimo',type:'select',value:prefs.deliveryTp||'-1',options:TP_CHOICES},
   {id:'dither',label:'Dither sui 16 bit',type:'checkbox',value:!!prefs.dither},
   {id:'bwf',label:'Metadati broadcast (BWF) nei WAV',type:'checkbox',value:prefs.bwf!==false},
   {id:'pattern',label:'Schema del nome',value:prefs.batchPattern||'{nome}',hint:'{nome} il nome del file, {numero} la posizione, {data} e {ora} il giorno e l’ora, {durata} i secondi.'},
   {id:'artist',label:'Autore o emittente',value:prefs.artist||''},
   {id:'comment',label:'Descrizione',value:prefs.comment||''},
   {id:'kbps',label:'Qualità dei formati compressi',type:'select',value:String(prefs.kbps||160),options:[['96','96 kbps (voce)'],['128','128 kbps'],['160','160 kbps'],['192','192 kbps (musica)'],['256','256 kbps'],['320','320 kbps (il massimo per l’MP3)']]}],
  'Converti',{onOpen:pane=>bindDeliveryPreset(pane,opts)});
 if(!r)return;
 const plan={rate:r.rate==='auto'?0:Number(r.rate),ch:r.ch==='auto'?0:Number(r.ch),lufs:r.lufs==='none'?null:Number(r.lufs),tp:r.tp==='none'?null:Number(r.tp)},
  ext=r.fmt==='mp3'?'mp3':r.fmt.startsWith('wav')?'wav':CODECS[r.fmt].ext;
 const opt={fmt:r.fmt,plan,pattern:r.pattern,artist:r.artist.trim(),comment:r.comment.trim(),dither:r.dither,bwf:r.bwf,kbps:Number(r.kbps),ext,
  fmtLabel:`${r.fmt==='mp3'?`MP3 ${r.kbps} kbps`:r.fmt.startsWith('wav')?`WAV ${r.fmt.slice(3)} bit${r.dither&&r.fmt==='wav16'?' con dither':''}`:CODECS[r.fmt].label}, ${plan.rate?fmtInt(plan.rate)+' hertz':'frequenza della sorgente'}, ${plan.ch===1?'mono':plan.ch===2?'stereo':'canali della sorgente'}`};
 prefs.delivery=r.preset;prefs.deliveryRate=r.rate;prefs.deliveryCh=r.ch;prefs.deliveryLufs=r.lufs;prefs.deliveryTp=r.tp;prefs.dither=r.dither;prefs.bwf=r.bwf;
 prefs.batchPattern=r.pattern;prefs.artist=opt.artist;prefs.comment=opt.comment;prefs.audioFormat=r.fmt;prefs.kbps=opt.kbps;savePrefs();
 const res=await work('Conversione dei file',async()=>{const conv=await batchConvertFiles(files,opt,status);
  if(!conv.files.length)return{...conv,zip:null};
  status('Creazione dell’archivio…');const zip=await zipBlob(conv.files,p=>status(`Archivio ${Math.round(p*100)}%`));
  return{...conv,zip}});
 if(!res)return;
 if(res.zip){const name=extName(many?`conversione ${new Date().toISOString().slice(0,10)}`:baseName(files[0].name)+(res.rows[0]?.ok?'':' convertito'),'zip');
  download(res.files.length===1?res.files[0].data:res.zip,res.files.length===1?res.files[0].name:name);
  toast(`Convertiti ${res.rows.filter(x=>x.ok).length} file su ${files.length}`)}
 const rep=batchReport(res.rows,opt,res.zip?.size||res.files[0]?.data.size||0);
 await showBatchReport(rep)}
