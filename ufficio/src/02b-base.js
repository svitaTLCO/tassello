// Strumenti di base usati in tutto il programma: DOM, testo sicuro in HTML, lettura dell'XML di Office,
// riferimenti di cella, nomi dei file scaricati e costanti dei pacchetti OOXML.
const $=id=>document.getElementById(id);
const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const te=new TextEncoder();
const td=new TextDecoder();
const HTML_ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>HTML_ESC[ch]);
const xml=src=>new DOMParser().parseFromString(src,'application/xml');
// Nell'XML di Office gli elementi hanno prefissi diversi (w:, a:, x:…): si cercano per nome locale.
function children(el,name){const out=[];for(const n of el?.childNodes||[])if(n.nodeType===1&&(!name||n.localName===name))out.push(n);return out}
function nodes(el,name){return el?[...el.getElementsByTagNameNS('*',name)]:[]}
const first=(el,name)=>nodes(el,name)[0]??null;
const OOXML='http://schemas.openxmlformats.org/',REL_NS=OOXML+'officeDocument/2006/relationships';
function attr(el,name){if(!el)return '';for(const q of [name,'w:'+name,'r:'+name]){const v=el.getAttribute(q);if(v!==null)return v}return el.getAttributeNS(REL_NS,name)??''}
const textNode=el=>el?el.textContent||'':'';
// Colonne: 0 → A, 25 → Z, 26 → AA. Righe e colonne partono da zero.
function colName(i){let s='',n=i+1;while(n>0){const m=(n-1)%26;s=String.fromCharCode(65+m)+s;n=(n-1-m)/26}return s}
const colNo=letters=>[...String(letters).toUpperCase()].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1;
const toRef=(r,c)=>`${colName(c)}${r+1}`;
const CELL_REF_RE=/^\$?([a-z]{1,3})\$?(\d+)$/i;
function parseRef(text){const m=CELL_REF_RE.exec(String(text??'').trim());if(!m)return null;const r=Number(m[2])-1,c=colNo(m[1]);return r<0||c<0||r>=1048576||c>=16384?null:{r,c}}
// Nomi dei file: niente caratteri vietati da Windows, al massimo 80 caratteri, estensione corretta.
function safeFileName(name){const s=String(name||'').replace(/[\x00-\x1f\\/:*?"<>|]/g,'_').trim().slice(0,80);return s||'Documento'}
const extName=(name,ext)=>`${safeFileName(name).replace(/\.(?:docx|xlsx|csv|html|json|txt)$/i,'')}.${ext}`;
function download(content,fileName,mime){const payload=content instanceof Blob?content:new Blob([content],{type:mime||'application/octet-stream'}),url=URL.createObjectURL(payload),link=Object.assign(document.createElement('a'),{href:url,download:fileName});link.style.display='none';document.body.append(link);link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);link.remove()}
// Pacchetti OOXML (DOCX e XLSX): dichiarazione XML, spazi dei nomi, tipi di contenuto e relazioni.
const XML_DECL='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const DOC_REL=REL_NS,PKG_REL=OOXML+'package/2006/relationships',XLS_ML=OOXML+'spreadsheetml/2006/main',DOC_ML=OOXML+'wordprocessingml/2006/main',DML=OOXML+'drawingml/2006/';
// Spazi dei nomi per le immagini DrawingML nelle parti di Word.
const PIC_NS=[['wp','wordprocessingDrawing'],['a','main'],['pic','picture']].map(([prefix,name])=>` xmlns:${prefix}="${DML}${name}"`).join('');
const WORD_NS=` xmlns:w="${DOC_ML}" xmlns:r="${DOC_REL}"`;
const CT_OFFICE='application/vnd.openxmlformats-officedocument.',CT_PKG='application/vnd.openxmlformats-package.',CT_SHEET=CT_OFFICE+'spreadsheetml.';
// Elemento XML da nome, attributi (nell'ordine dato; null e undefined vengono omessi) e contenuto già pronto;
// senza contenuto l'elemento si chiude da solo. I valori degli attributi passano sempre da esc.
function xmlEl(name,attrs={},inner){let open='<'+name;for(const [k,v] of Object.entries(attrs))if(v!=null)open+=` ${k}="${esc(v)}"`;return inner===undefined?open+'/>':`${open}>${inner}</${name}>`}
const ctDefault=(ext,type)=>xmlEl('Default',{Extension:ext,ContentType:type});
const ctPart=(part,type)=>xmlEl('Override',{PartName:part,ContentType:type});
const typesXml=items=>XML_DECL+xmlEl('Types',{xmlns:OOXML+'package/2006/content-types'},items.join(''));
const docRel=(id,kind,target)=>({id,type:DOC_REL+'/'+kind,target});
function rels(list){const items=list.map(({id,type,target,external})=>xmlEl('Relationship',{Id:id??'',Type:type??'',Target:target??'',TargetMode:external?'External':null}));return XML_DECL+xmlEl('Relationships',{xmlns:PKG_REL},items.join(''))}
// Colore CSS (#rrggbb o rgb()/rgba()) in esadecimale; null se non riconosciuto.
function colorToHex(value){const s=String(value||'');if(/^#[0-9a-f]{6}$/i.test(s))return s;const m=s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);return m?'#'+[m[1],m[2],m[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join(''):null}
