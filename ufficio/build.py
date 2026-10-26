"""Costruisce Tessera Ufficio: unisce i sorgenti di src/ nell'ordine indicato e scrive docs/tessera-ufficio.html.

Uso: python ufficio/build.py
Non servono dipendenze: basta Python 3.8 o successivo.
"""
import hashlib, pathlib, sys

HERE = pathlib.Path(__file__).parent
SRC = HERE / 'src'
DEST = HERE.parent / 'docs' / 'tessera-ufficio.html'

# L'ordine conta: le costanti devono esistere prima del codice che le usa all'avvio.
ORDER = [
    '01-head.html', '02-body.html', '02b-helpers.js', '03-ui.js', '03b-sanitize.js', '03c-confirm-zip.js', '04-state.js',
    '04b-status-zoom.js', '05-commands.js', '05b-ribbon.js', '05c-word-helpers.js',
    '06-word.js', '06b-layout.js', '06c-tables.js', '06d-objects.js', '06e-review.js', '06f-tools.js', '06g-format.js',
    '06h-styles.js', '06i-sections.js', '06j-refs.js', '06k-forms.js', '06l-persist.js',
    '07b-funcs.js', '07-formula.js', '07c-calc-core.js',
    '08-excel.js', '08b-fx.js', '08c-charts.js', '08d-sheet-extras.js', '08e-pivot.js', '08f-docx-base.js',
    '11-export.js', '11b-docx.js', '11c-xlsx-extras.js', '11d-pivot-xlsx.js', '11e-docx-d.js', '11f-xlsx.js', '11g-clipboard.js',
    '09-actions.js', '10-events.js', '10b-word-events.js', '10c-print.js', '12-start.js',
]

missing = [n for n in ORDER if not (SRC / n).exists()]
extra = sorted(p.name for p in SRC.iterdir() if p.name not in ORDER)
if missing or extra:
    sys.exit(f'Sorgenti non allineati. Mancano: {missing}. Non elencati in ORDER: {extra}')

out = '\n'.join((SRC / n).read_text(encoding='utf-8').rstrip('\n') for n in ORDER) + '\n'
DEST.parent.mkdir(parents=True, exist_ok=True)
DEST.write_bytes(out.encode('utf-8'))
data = DEST.read_bytes()
print(f'{DEST.relative_to(HERE.parent)}  {len(data):,} byte  SHA-256 {hashlib.sha256(data).hexdigest()}')
