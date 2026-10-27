"""Costruisce le pagine del sito di Tassello in ogni lingua.

I modelli delle pagine stanno in sito/pagine/, i testi in sito/testi/<lingua>.txt. Un segnaposto in minuscolo,
come {{hero.titolo}}, prende il testo della lingua; quelli in maiuscolo li calcola questo script:
{{LINGUA}}, {{BASE}} (il percorso verso la radice del sito), {{ALTERNATIVE}} (le stesse pagine nelle altre
lingue), {{LINGUE}} (il selettore della lingua) e {{TESTI_JS}} (le voci js.* per gli script delle pagine).
L'italiano va in docs/, le altre lingue in docs/<lingua>/.

Uso: python sito/build.py
Non servono dipendenze: basta Python 3.8 o successivo.
"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
DOCS = HERE.parent / 'docs'
SITE = 'https://svitatlco.github.io/tassello/'
# La prima lingua è quella della radice del sito e fa da riferimento per le altre.
LANGS = {'it': 'Italiano', 'en': 'English', 'fr': 'Français', 'es': 'Español'}
PAGES = ['index.html', 'verifica.html']
TEXT = re.compile(r'\{\{([a-z][\w.]*)\}\}')
COMPUTED = re.compile(r'\{\{([A-Z_]+)\}\}')
IN_ATTRIBUTE = re.compile(r'="[^"<>]*\{\{([a-z][\w.]*)\}\}')
GLOBE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
         'stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>'
         '<path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/></svg>')


def read_texts(lang):
    """Legge un file di testi: ogni voce comincia con [chiave] e continua fino alla voce successiva."""
    texts, key = {}, None
    path = HERE / 'testi' / f'{lang}.txt'
    for n, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        head = re.fullmatch(r'\[([a-z][\w.]*)\]', line.strip())
        if head:
            key = head[1]
            if key in texts:
                sys.exit(f'{path.name}, riga {n}: la voce [{key}] è ripetuta')
            texts[key] = []
        elif line.startswith('#') or (key is None and not line.strip()):
            continue
        elif key is None:
            sys.exit(f'{path.name}, riga {n}: testo prima della prima voce')
        else:
            texts[key].append(line.rstrip())
    # Si tolgono solo le righe vuote in testa e in coda: il rientro delle voci su più righe resta com'è.
    return {k: '\n'.join(v).strip('\n') for k, v in texts.items()}


def site_path(lang, page):
    """Percorso della pagina dalla radice del sito, come compare nell'indirizzo."""
    return ('' if lang == 'it' else lang + '/') + ('' if page == 'index.html' else page)


def link(from_lang, lang, page):
    return ('' if from_lang == 'it' else '../') + site_path(lang, page) or './'


def switcher(lang, page, label):
    items = []
    for other, name in LANGS.items():
        current = ' aria-current="page"' if other == lang else ''
        items.append(f'      <li><a href="{link(lang, other, page)}" hreflang="{other}" lang="{other}"{current}>{name}</a></li>')
    return (f'<details class="lingua">\n    <summary>{GLOBE}<span class="sr-only">{label} </span>{LANGS[lang]}</summary>\n'
            f'    <ul>\n' + '\n'.join(items) + '\n    </ul>\n  </details>')


texts = {lang: read_texts(lang) for lang in LANGS}
templates = {page: (HERE / 'pagine' / page).read_text(encoding='utf-8') for page in PAGES}

# Ogni lingua deve avere esattamente le voci dell'italiano, e ogni voce deve servire a qualche pagina.
reference = set(texts['it'])
problems = []
for lang, t in texts.items():
    if missing := sorted(reference - set(t)):
        problems.append(f'{lang}.txt: mancano {", ".join(missing)}')
    if extra := sorted(set(t) - reference):
        problems.append(f'{lang}.txt: voci in più {", ".join(extra)}')
used = {k for tpl in templates.values() for k in TEXT.findall(tpl)} | {'lingua.etichetta'}  # questa la usa switcher()
if undefined := sorted(used - reference):
    problems.append(f'voci usate nelle pagine ma non definite: {", ".join(undefined)}')
if unused := sorted(k for k in reference - used if not k.startswith('js.')):
    problems.append(f'voci definite ma non usate: {", ".join(unused)}')
# I testi dentro un attributo HTML non possono chiuderlo né contenere tag.
for page, tpl in templates.items():
    for key in IN_ATTRIBUTE.findall(tpl):
        for lang, t in texts.items():
            if any(c in t.get(key, '') for c in '"<>'):
                problems.append(f'{lang}.txt: [{key}] va in un attributo e non può contenere " < >')
if problems:
    sys.exit('Testi del sito non allineati:\n  ' + '\n  '.join(dict.fromkeys(problems)))

for lang, t in texts.items():
    for page, tpl in templates.items():
        alternates = [f'<link rel="alternate" hreflang="{other}" href="{SITE}{site_path(other, page)}">' for other in LANGS]
        alternates.append(f'<link rel="alternate" hreflang="x-default" href="{SITE}{site_path("it", page)}">')
        computed = {
            'LINGUA': lang,
            'BASE': '' if lang == 'it' else '../',
            'ALTERNATIVE': '\n'.join(alternates),
            'LINGUE': switcher(lang, page, t['lingua.etichetta']),
            'TESTI_JS': json.dumps({k[3:]: v for k, v in t.items() if k.startswith('js.')}, ensure_ascii=False),
        }
        # Prima i testi, poi i valori calcolati: così un testo può contenere {{BASE}} nei suoi collegamenti.
        out = TEXT.sub(lambda m: t[m[1]], tpl)
        out = COMPUTED.sub(lambda m: computed[m[1]], out)
        dest = DOCS / ('' if lang == 'it' else lang) / page
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(out, encoding='utf-8', newline='\n')
        print(dest.relative_to(HERE.parent))
