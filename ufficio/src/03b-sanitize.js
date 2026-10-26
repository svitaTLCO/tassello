// Pulizia dell'HTML del documento con elenchi chiusi di elementi, attributi, classi e proprietà di stile.
// Vale per bozze, progetti, testo incollato e file HTML o DOCX aperti.
const words=s=>s.trim().split(/\s+/);
const SAFE_TAGS=new Set([...words('P DIV SPAN BR HR A IMG FONT'),...words('B STRONG I EM U S STRIKE SUB SUP'),...words('H1 H2 H3 H4 H5 H6 BLOCKQUOTE UL OL LI'),...words('TABLE CAPTION THEAD TBODY TR TH TD FIGURE FIGCAPTION'),
 ...words('MATH MROW MI MN MO MS MTEXT MSPACE MFRAC MSUP MSUB MSUBSUP MSQRT MROOT MUNDER MOVER MUNDEROVER MTABLE MTR MTD MSTYLE MPADDED MPHANTOM')]);
// Elementi eliminati con tutto il contenuto; gli altri non ammessi lasciano solo il loro contenuto.
const DROP_TAGS=new Set(words('SCRIPT STYLE TEMPLATE NOSCRIPT LINK META IFRAME OBJECT EMBED CANVAS SVG VIDEO AUDIO FORM INPUT BUTTON SELECT TEXTAREA ANNOTATION ANNOTATION-XML SEMANTICS'));
const SAFE_CLASSES=new Set(words(`pagebreak toc toc-title toc-1 toc-2 toc-3 toc-4 toc-5 toc-6 footnotes fn fn-note fn-head endnotes en en-note en-head title subtitle cap-n lst-dash ml-legal
 tb-none tb-outer tb-h tb-full img-left img-center img-right cmt cmt-done mfield tab ld-dot ld-dash ld-line dropcap sect sect-cont xref xr-label xr-text xr-page xr-pos xr-num
 bm xe idx idx-title idx-letter idx-sub tof tof-title tof-fig tof-tab cite biblio biblio-title cc cc-check cc-drop cc-date cc-text cc-empty textbox tbx-left tbx-right tbx-center eq`));
const SAFE_STYLE=new Set([...words('color background-color font-family font-size font-weight font-style font-variant font-variant-caps letter-spacing text-transform'),...words('text-decoration text-decoration-line text-decoration-style text-align text-indent vertical-align line-height list-style-type'),
 ...words('margin-top margin-right margin-bottom margin-left padding width border border-top border-right border-bottom border-left'),...words('break-before break-after break-inside orphans widows --os-tabs')]);
const SAFE_ID=/^(?:(?:h|fn|fnr|en|enr|cap|bm|xe|sec|cc|bib)-[a-z0-9]{1,24}|cm-[a-z0-9]{1,24}(?:-\d{1,3})?)$/;
const styleValueOk=v=>!/[<>{}\\]|url|expression|@import|javascript|behavior/i.test(v)&&!/[()]/.test(v.replace(/rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+%?\s*)?\)/gi,''));
// Regola per ogni attributo ammesso: riceve valore ed elemento e dice se l'attributo resta.
const imgOnly=re=>(v,tag)=>tag==='IMG'&&re.test(v),fontOnly=(v,tag)=>tag==='FONT'&&!/[<>"]/.test(v),smallInt=v=>/^\d{1,3}$/.test(v);
const ATTR_RULES=new Map(Object.entries({title:()=>true,class:()=>true,style:()=>true,id:v=>SAFE_ID.test(v),
 href:(v,tag)=>tag==='A'&&/^(https?:\/\/|mailto:|#[\w-]+$)/i.test(v),src:imgOnly(/^(?:https?:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i),alt:(v,tag)=>tag==='IMG',width:imgOnly(/^\d{1,4}%?$/),height:imgOnly(/^\d{1,4}%?$/),
 scope:(v,tag)=>tag==='TH'&&/^(col|row)$/.test(v),start:(v,tag)=>tag==='OL'&&/^\d{1,4}$/.test(v),colspan:smallInt,rowspan:smallInt,align:v=>/^(left|center|right|justify)$/i.test(v),
 color:fontOnly,face:fontOnly,size:fontOnly,contenteditable:(v,tag)=>v==='false'&&['SPAN','SUP','A','DIV'].includes(tag),
 display:(v,tag)=>tag==='MATH'&&/^(block|inline)$/.test(v),mathvariant:v=>/^[a-z-]{1,24}$/.test(v)}));
const keepClasses=v=>v.split(/\s+/).filter(x=>SAFE_CLASSES.has(x)||/^st-[a-z0-9]{1,12}$/.test(x)||/^lv-\d$/.test(x)).join(' ');
function keepStyle(v){const kept=[];for(const decl of v.split(';')){const at=decl.indexOf(':');if(at<0)continue;const prop=decl.slice(0,at).trim().toLowerCase(),val=decl.slice(at+1).trim();if(SAFE_STYLE.has(prop)&&val&&val.length<200&&styleValueOk(val))kept.push(prop+':'+val)}return kept.join(';')}
function cleanAttributes(el,tag){for(const {name,value} of [...el.attributes]){const key=name.toLowerCase(),rule=ATTR_RULES.get(key);if(!rule||!rule(value,tag)){el.removeAttribute(name);continue}
 if(key==='class'||key==='style'){const kept=key==='class'?keepClasses(value):keepStyle(value);if(kept)el.setAttribute(key,kept);else el.removeAttribute(key)}
 else if(key==='title'&&value.length>2000)el.setAttribute('title',value.slice(0,2000))}}
const SVG_NS='http://www.w3.org/2000/svg';
function cleanTree(parent){for(const node of [...parent.childNodes]){
 if(node.nodeType===Node.COMMENT_NODE){node.remove();continue}
 if(node.nodeType!==Node.ELEMENT_NODE)continue;
 const tag=node.tagName.toUpperCase();
 if(SAFE_TAGS.has(tag)){cleanAttributes(node,tag);cleanTree(node);continue}
 if(DROP_TAGS.has(tag)||node.namespaceURI===SVG_NS){node.remove();continue}
 cleanTree(node);node.replaceWith(...node.childNodes)}}
function sanitizeHTML(html){const holder=document.createElement('template');holder.innerHTML=String(html||'');cleanTree(holder.content);return holder.innerHTML}
