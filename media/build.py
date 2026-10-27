"""Costruisce Tassello Media: unisce i sorgenti di src/ nell'ordine indicato e scrive docs/tassello-media.html.

Il numero di versione sta in media/VERSIONE e sostituisce {{VERSIONE}} nei sorgenti.
L'impronta SHA-256 del file costruito viene registrata in docs/versioni-media.json, l'elenco delle copie
ufficiali che la pagina Verifica del sito usa per riconoscerle.

Uso: python media/build.py
Non servono dipendenze: basta Python 3.8 o successivo.
"""
import datetime, hashlib, json, pathlib, sys

HERE = pathlib.Path(__file__).parent
SRC = HERE / 'src'
DOCS = HERE.parent / 'docs'
DEST = DOCS / 'tassello-media.html'
VERSIONS = DOCS / 'versioni-media.json'
VERSION = (HERE / 'VERSIONE').read_text(encoding='utf-8').strip()

# L'ordine conta: le costanti devono esistere prima del codice che le usa all'avvio.
ORDER = [
    '01-head.html', '02-body.html', '02b-base.js', '03-store.js', '04-commands.js', '04b-ribbon.js',
    '05-codecs.js', '05b-containers.js', '05c-demux.js', '05d-mux.js',
    '06-audio-core.js', '06b-audio-view.js', '06c-audio-effects.js', '06d-record.js', '06e-mix-core.js', '06f-mix-engine.js', '06g-mix-view.js',
    '07-video-core.js', '07b-video-engine.js', '07c-video-view.js', '07d-video-text.js', '07e-video-export.js',
    '08-actions.js', '09-events.js', '10-start.js',
]

missing = [n for n in ORDER if not (SRC / n).exists()]
extra = sorted(p.name for p in SRC.iterdir() if p.name not in ORDER)
if missing or extra:
    sys.exit(f'Sorgenti non allineati. Mancano: {missing}. Non elencati in ORDER: {extra}')

out = '\n'.join((SRC / n).read_text(encoding='utf-8').rstrip('\n') for n in ORDER) + '\n'
out = out.replace('{{VERSIONE}}', VERSION)
DOCS.mkdir(parents=True, exist_ok=True)
DEST.write_bytes(out.encode('utf-8'))
data = DEST.read_bytes()
digest = hashlib.sha256(data).hexdigest()

# Una voce per versione, la più recente in cima. La voce della versione corrente segue il file
# costruito: cambia solo se cambia l'impronta, così una build ripetuta non modifica nulla.
listing = json.loads(VERSIONS.read_text(encoding='utf-8')) if VERSIONS.exists() else {'versioni': []}
entries = [v for v in listing['versioni'] if v['versione'] != VERSION]
current = next((v for v in listing['versioni'] if v['versione'] == VERSION), None)
if not current or current['sha256'] != digest:
    current = {'versione': VERSION, 'data': datetime.date.today().isoformat(), 'sha256': digest}
entries.insert(0, current)
listing = {'programma': 'Tassello Media', 'file': DEST.name, 'ultima': VERSION, 'versioni': entries}
VERSIONS.write_text(json.dumps(listing, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')

print(f'{DEST.relative_to(HERE.parent)}  versione {VERSION}  {len(data):,} byte  SHA-256 {digest}')
