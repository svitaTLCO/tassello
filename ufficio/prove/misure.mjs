// Prove della grammatica delle misure di Impagina. Si eseguono con:
//   node ufficio/prove/misure.mjs
// Leggono il sorgente puro, lo valutano e confrontano una tabella di casi. Non entrano nella build.
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../src/13p-page-measure.js', import.meta.url), 'utf8');
const pgMeasure = new Function(src + '\nreturn pgMeasure;')();

const MM = 96 / 25.4;
const mmPage = { w: 210 * MM, h: 297 * MM, cols: 3, gut: 5 * MM, m: { t: 15 * MM, r: 15 * MM, b: 15 * MM, l: 15 * MM } };
const pxPage = { w: 1080, h: 1350, cols: 1, gut: 36, m: { t: 90, r: 90, b: 90, l: 90 } };
const col = (180 - 10) / 3; // (interno - spazi) / colonne, in mm

let fail = 0, done = 0;
const same = (a, b) => (Number.isNaN(a) && Number.isNaN(b)) || Math.abs(a - b) < 0.01;
function test(key, text, current, expected, page = mmPage, unit = 'mm') {
  done++;
  const got = pgMeasure(text, { key, unit, page, mm: MM, current });
  if (!same(got, expected)) {
    fail++;
    console.log(`NO  ${unit} ${key} «${text}» da ${current}: atteso ${expected}, ottenuto ${got}`);
  }
}

// Numeri, unità, frazioni e percentuali.
test('x', '105', 0, 105);
test('x', '12mm', 0, 12);
test('x', '1,5cm', 0, 15);
test('x', '1/2', 0, 105);
test('w', '50%', 0, 105);
test('w', 'tre quarti', 0, 157.5);
test('w', 'due terzi', 0, 140);
test('x', '0', 0, 0);
test('h', 'pagina', 0, 297);
test('x', 'pagina', 0, NaN);

// Riferimenti alla pagina e alle colonne.
test('y', 'metà', 0, 148.5);
test('h', 'metà pagina', 0, 148.5);
test('x', 'metà pagina', 0, 105);
test('x', 'centro', 0, 105);
test('y', 'centro', 0, 148.5);
test('w', 'centro', 0, NaN);
test('w', 'spazio tra colonne', 0, 5);
test('w', '2 colonne', 0, 2 * col + 5);
test('x', 'colonna 1', 0, 15);
test('x', 'colonna 3', 0, 15 + 2 * (col + 5));
test('y', 'colonna 2', 0, NaN);
test('w', '2 colonne', 0, NaN, pxPage, 'px');
test('w', '2 colonne', 0, NaN, { ...mmPage, cols: 1 });

// Relative.
test('x', '+12', 20, 32);
test('y', '-12', 20, 8);
test('w', '+1/2', 40, 145);
test('x', '+1,5cm', 10, 25);
test('x', '+12', 0, 12);

// Pagina in pixel.
test('x', '50%', 0, 540, pxPage, 'px');
test('w', 'metà', 0, 540, pxPage, 'px');
test('x', '12mm', 0, 12 * MM, pxPage, 'px');
test('x', '1/2', 0, 540, pxPage, 'px');

// Cose che non sono misure.
for (const t of ['', '   ', 'metà paggina', 'abc', '12 parsec', '1/0', 'colonna 9', '0 colonne', 'centro pagina']) {
  test('x', t, 0, NaN);
}

if (fail) {
  console.log(`\n${fail} casi falliti su ${done}.`);
  process.exit(1);
}
console.log(`Tutti i ${done} casi passano.`);
