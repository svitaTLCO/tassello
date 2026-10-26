const $=id=>document.getElementById(id), $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
const te=new TextEncoder(),td=new TextDecoder();
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const children=(node,name)=>Array.from(node?.childNodes||[]).filter(n=>n.nodeType===1&&(!name||n.localName===name));
const nodes=(node,name)=>Array.from(node?.getElementsByTagNameNS('*',name)||[]);
const first=(node,name)=>nodes(node,name)[0]||null;
const attr=(node,name)=>node?.getAttribute(name)??node?.getAttribute('w:'+name)??node?.getAttribute('r:'+name)??node?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships',name)??'';
const textNode=(node)=>node?.textContent||'';
const colName=n=>{let s='';for(n++;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
const colNo=s=>{let n=0;for(let c of s.toUpperCase())n=n*26+c.charCodeAt(0)-64;return n-1};
const toRef=(r,c)=>colName(c)+(r+1);
const parseRef=s=>{const m=/^\$?([A-Z]{1,3})\$?(\d+)$/i.exec((s||'').trim());if(!m)return null;let c=colNo(m[1]),r=+m[2]-1;return r>=0&&r<1048576&&c>=0&&c<16384?{r,c}:null};
const cleanName=s=>String(s||'Documento').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').trim().slice(0,80)||'Documento';
const extName=(name,ext)=>cleanName(name).replace(/\.(docx|xlsx|csv|html|json|txt)$/i,'')+'.'+ext;
function download(data,name,mime){const blob=data instanceof Blob?data:new Blob([data],{type:mime||'application/octet-stream'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000)}
