// Misure scritte a parole per Impagina: «metà», «1/2», «50%», «2 colonne», «+12».
// Restituisce un numero nell'unità mostrata nei campi (mm o px), oppure NaN se il testo non è una misura.
// Non tocca il DOM e non lancia eccezioni: chi chiama decide il messaggio.
// ctx: {key:'x'|'y'|'w'|'h', unit:'mm'|'px', page, item, mm:MM, current}
function pgMeasure(text, ctx) {
  const raw = String(text ?? '').trim();
  if (!raw) return NaN;
  const s = raw.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, ' ');
  const unit = ctx?.unit === 'mm' ? 'mm' : 'px';
  const MM = Number(ctx?.mm) || 96 / 25.4;
  const p = ctx?.page || {};
  const key = ctx?.key;
  const cur = Number(ctx?.current);
  const shape = key === 'x' || key === 'w' ? 'w' : key === 'y' || key === 'h' ? 'h' : '';
  if (!shape) return NaN;

  // Da pixel dello spazio della pagina all'unità dei campi.
  const dim = px => (Number.isFinite(px) ? (unit === 'mm' ? px / MM : px) : NaN);
  // Una lunghezza scritta con la sua unità, portata nell'unità dei campi.
  const len = (v, u) => {
    if (!Number.isFinite(v)) return NaN;
    if (u === 'mm') return unit === 'mm' ? v : v * MM;
    if (u === 'cm') return unit === 'mm' ? v * 10 : v * 10 * MM;
    if (u === 'pt') return unit === 'mm' ? v * 25.4 / 72 : v * MM * 25.4 / 72;
    return unit === 'mm' ? v / MM : v;
  };
  const num = t => {
    const v = Number(String(t).replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  };
  const ratio = t => {
    const m = /^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/.exec(t);
    if (!m) return NaN;
    const a = num(m[1]), b = num(m[2]);
    return b ? a / b : NaN;
  };
  const colW = () => {
    const cols = Number(p.cols) || 1;
    if (cols < 2) return NaN;
    const inner = Number(p.w) - Number(p.m?.l || 0) - Number(p.m?.r || 0);
    const gut = Number(p.gut) || 0;
    return (inner - (cols - 1) * gut) / cols;
  };

  // Il segno iniziale rende la misura relativa al valore attuale.
  let rest = s, relative = false, sign = 1;
  if (/^[+-]/.test(rest)) { relative = true; sign = rest[0] === '-' ? -1 : 1; rest = rest.slice(1).trim(); }
  if (!rest) return NaN;

  let value; // nell'unità dei campi, sempre assoluto
  const ref = shape === 'w' ? dim(p.w) : dim(p.h);

  let m = /^(\d+(?:[.,]\d+)?)\s*(mm|cm|px|pt)?$/.exec(rest);
  if (m) {
    const v = num(m[1]);
    value = m[2] ? len(v, m[2]) : v;
  } else if ((m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(rest))) {
    value = num(m[1]) / 100 * ref;
  } else if (Number.isFinite(ratio(rest))) {
    value = ratio(rest) * ref;
  } else if (/^(metà|meta|mezza|mezzo|un mezzo)$/.test(rest)) {
    value = ref / 2;
  } else if (/^(metà pagina|meta pagina|mezza pagina)$/.test(rest)) {
    value = ref / 2;
  } else if (/^(pagina|pagina intera|intera)$/.test(rest)) {
    if (key !== 'w' && key !== 'h') return NaN;
    value = ref;
  } else if (rest === 'un terzo') {
    value = ref / 3;
  } else if (rest === 'due terzi') {
    value = ref * 2 / 3;
  } else if (rest === 'un quarto') {
    value = ref / 4;
  } else if (rest === 'tre quarti') {
    value = ref * 3 / 4;
  } else if (rest === 'centro') {
    if (key !== 'x' && key !== 'y') return NaN;
    value = ref / 2;
  } else if (/^(spazio tra colonne|spazio delle colonne|gutter)$/.test(rest)) {
    if (key !== 'w') return NaN;
    value = dim(p.gut);
  } else if ((m = /^colonna\s+(\d+)(?:\s+di\s+\d+)?$/.exec(rest))) {
    if (key !== 'x') return NaN;
    const n = Number(m[1]), cw = colW();
    if (!(n >= 1) || !Number.isFinite(cw)) return NaN;
    if (n > (Number(p.cols) || 1)) return NaN;
    value = dim(Number(p.m?.l || 0) + (n - 1) * (cw + Number(p.gut || 0)));
  } else if ((m = /^(\d+)\s+colonne$/.exec(rest))) {
    if (key !== 'w') return NaN;
    const n = Number(m[1]), cw = colW();
    if (!(n >= 1) || !Number.isFinite(cw)) return NaN;
    if (n > (Number(p.cols) || 1)) return NaN;
    value = dim(n * cw + (n - 1) * Number(p.gut || 0));
  } else {
    return NaN;
  }

  if (!Number.isFinite(value)) return NaN;
  return relative ? (Number.isFinite(cur) ? cur + sign * value : NaN) : value;
}
