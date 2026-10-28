"""Costruisce Tassello Media: unisce i sorgenti di src/ nell'ordine indicato e scrive docs/tassello-media.html.

Il numero di versione sta in media/VERSIONE e sostituisce {{VERSIONE}} nei sorgenti.
L'impronta SHA-256 del file costruito viene registrata in docs/versioni-media.json, l'elenco delle copie
ufficiali che la pagina Verifica del sito usa per riconoscerle.

Uso: python media/build.py
     python media/build.py --prova <cartella>   copia di prova in <cartella>, senza toccare docs/
Prima di scrivere controlla che nessun nome sia dichiarato due volte, che nessun comando sia registrato
due volte e, se c'è node, che lo script si legga: un errore ferma la build.
Non servono dipendenze: basta Python 3.8 o successivo.
"""
import datetime, hashlib, json, os, pathlib, re, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).parent
SRC = HERE / 'src'
DOCS = HERE.parent / 'docs'
DEST = DOCS / 'tassello-media.html'
VERSIONS = DOCS / 'versioni-media.json'
VERSION = (HERE / 'VERSIONE').read_text(encoding='utf-8').strip()
COMMANDS = '04-commands.js'

# L'ordine conta: le costanti devono esistere prima del codice che le usa all'avvio.
ORDER = [
    '01-head.html', '02-body.html', '02b-base.js', '03-store.js', '04-commands.js', '04b-ribbon.js', '04c-tasselli.js',
    '05-codecs.js', '05b-containers.js', '05c-demux.js', '05d-mux.js',
    '06-audio-core.js', '06b-audio-view.js', '06c-audio-effects.js', '06d-record.js', '06e-mix-core.js', '06f-mix-engine.js', '06g-mix-view.js',
    '07-video-core.js', '07b-video-engine.js', '07c-video-view.js', '07d-video-text.js', '07e-video-export.js',
    '08-actions.js', '09-events.js', '10-start.js',
]

missing = [n for n in ORDER if not (SRC / n).exists()]
extra = sorted(p.name for p in SRC.iterdir() if p.name not in ORDER)
if missing or extra:
    sys.exit(f'Sorgenti non allineati. Mancano: {missing}. Non elencati in ORDER: {extra}')


def check(out):
    """Tutto il JavaScript finisce in un solo script: un nome dichiarato in due sorgenti o un comando registrato
    due volte rompono il programma, e un const ripetuto lo blocca all'avvio. Le dichiarazioni a inizio riga sono
    quelle di primo livello, quelle interne alle funzioni sono rientrate."""
    errors, seen = [], set()
    script = '\n;\n'.join(re.findall(r'<script(?![^>]*\bsrc)[^>]*>(.*?)</script>', out, re.S))
    for m in re.finditer(r'^(?:async\s+)?function\*?\s+([\w$]+)|^(?:const|let|class)\s+([\w$]+)', script, re.M):
        name = m[1] or m[2]
        if name in seen:
            errors.append(f'«{name}» è dichiarato due volte')
        seen.add(name)
    # Righe del registro: a inizio riga, subito dopo def(…,[ o dopo la riga precedente sulla stessa riga.
    row = r"(?:^\s*|^def\('[a-z]+','[^']*',\[|\],)\['([A-Za-z]\w*)','[^']*','[^']*','"
    ids = re.findall(row, (SRC / COMMANDS).read_text(encoding='utf-8'), re.M)
    errors += [f'il comando «{i}» è registrato due volte in {COMMANDS}' for i in sorted({i for i in ids if ids.count(i) > 1})]
    node = shutil.which('node')
    if node:
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(script)
        try:
            r = subprocess.run([node, '--check', f.name], capture_output=True, text=True, encoding='utf-8')
        finally:
            os.unlink(f.name)
        if r.returncode:
            errors.append('lo script non si legge: ' + ' '.join(l.strip() for l in r.stderr.splitlines() if 'Error' in l)[:300])
    else:
        print('node non trovato: salto il controllo della sintassi dello script')
    if errors:
        sys.exit('Build fermata:\n- ' + '\n- '.join(errors))


out = '\n'.join((SRC / n).read_text(encoding='utf-8').rstrip('\n') for n in ORDER) + '\n'
check(out)

# Copia di prova: stessa costruzione, versione segnata come prova, nessun file in docs/ e nessuna impronta registrata.
if sys.argv[1:2] == ['--prova']:
    if len(sys.argv) != 3:
        sys.exit(f'Uso: python {HERE.name}/build.py --prova <cartella>')
    dest = pathlib.Path(sys.argv[2])
    dest.mkdir(parents=True, exist_ok=True)
    test = dest / DEST.name
    test.write_bytes(out.replace('{{VERSIONE}}', VERSION + '-prova').encode('utf-8'))
    print(f'{test}  copia di prova della versione {VERSION}  {test.stat().st_size:,} byte')
    sys.exit()
if sys.argv[1:]:
    sys.exit(f'Opzione sconosciuta: {" ".join(sys.argv[1:])}. Uso: python {HERE.name}/build.py [--prova <cartella>]')

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
