const PKG_REL='http://schemas.openxmlformats.org/package/2006/relationships';
const DOC_REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const DOC_ML='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XLS_ML='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const typesHead='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const rels=(items)=>`${typesHead}<Relationships xmlns="${PKG_REL}">${items.map(x=>`<Relationship Id="${esc(x.id)}" Type="${esc(x.type)}" Target="${esc(x.target)}"${x.external?' TargetMode="External"':''}/>`).join('')}</Relationships>`;
function colorToHex(str){if(/^#[0-9a-f]{6}$/i.test(str||''))return str;let v=/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(str||'');if(!v)return null;return '#'+v.slice(1).map(x=>(+x).toString(16).padStart(2,'0')).join('')}
