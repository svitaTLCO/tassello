<p align="center"><img src="docs/icon.svg" width="96" height="96" alt="Il marchio di Tassello: quattro tasselli colorati"></p>

<h1 align="center">Tassello</h1>

<p align="center"><b>Il necessario per lavorare sui file, in un file solo.</b><br>
Piccoli strumenti liberi e gratuiti per scrivere, compilare, fare i conti, registrare e montare audio e video, senza suite o installazioni ingombranti. Ognuno è un solo file HTML che si apre nel browser.</p>

<p align="center">
<a href="https://svitatlco.github.io/tassello/">Sito</a> ·
<a href="https://svitatlco.github.io/tassello/tassello-ufficio.html">Prova Ufficio</a> ·
<a href="https://svitatlco.github.io/tassello/tassello-media.html">Prova Media</a> ·
<a href="https://github.com/svitaTLCO/tassello/releases">Scarica</a> ·
<a href="#in-english">English</a>
</p>

> [!IMPORTANT]
> **Usa solo copie ufficiali.** Scarica Tassello solo dal [sito](https://svitatlco.github.io/tassello/) o dalle [release di questo repository](https://github.com/svitaTLCO/tassello/releases). Se qualcuno ti manda il file per email, in chat o su una chiavetta, non aprirlo: scaricalo di nuovo da uno di questi due indirizzi. [Perché è importante](#solo-dai-canali-ufficiali).

## Che cos'è

Tassello è un piccolo coltellino svizzero per i file: ordinato e leggero. Serve per la produttività di base, cioè scrivere una lettera, compilare un modulo, preparare un preventivo, tenere un elenco, fare due conti, ripulire una registrazione o montare un video, senza dipendere da una suite da installare o da un account.

Ogni strumento della famiglia è un *tassello*: un unico file che si apre con un doppio clic e funziona anche senza rete. L'obiettivo è mettere in mano a chiunque, nel modo più semplice possibile, la capacità di lavorare sui propri file.

**Cosa non è.** Tassello non sostituisce gli strumenti da professionisti: se il tuo lavoro richiede macro, revisioni tracciate, un montaggio professionale o strumenti virtuali e MIDI, continua a usare il programma adatto. Non è nemmeno un clone delle app famose: ne apre e salva i formati per scambiare file con tutti, ma ha un disegno suo, con funzioni scelte una per una per il lavoro di tutti i giorni e tutte raggiungibili da tastiera.

**L'accessibilità è la condizione, non un di più.** Un tassello viene distribuito solo se si usa con uno screen reader e con la sola tastiera. Vedi [Accessibilità](#accessibilità).

## Solo dai canali ufficiali

Tassello è leggero perché sta in un unico file HTML. Per lo stesso motivo chiunque può copiarlo, modificarlo e rimetterlo in giro: una copia alterata può sembrare identica all'originale e intanto leggere i tuoi documenti o chiederti dati personali.

I canali ufficiali sono due:

- il sito **[svitatlco.github.io/tassello](https://svitatlco.github.io/tassello/)**;
- la pagina delle **[release su GitHub](https://github.com/svitaTLCO/tassello/releases)**, in questo repository.

Qualche regola semplice:

- **Non aprire copie ricevute.** Un file arrivato per email, in chat, su una chiavetta o da un altro sito non è affidabile, anche se ti fidi di chi te lo manda. Scaricalo di nuovo da un canale ufficiale.
- **Condividi il link, non il file.** Per consigliare Tassello a qualcuno, mandagli l'indirizzo del sito.
- **Aggiorna dallo stesso posto.** Le nuove versioni escono solo sui canali ufficiali: un "aggiornamento" arrivato per altre vie non è ufficiale.
- **Riconosci una copia falsa.** Tassello non si collega a internet (la dettatura usa il servizio del browser) e non chiede mai password, account o pagamenti. Una copia che lo fa non è quella ufficiale: chiudila e cancellala.
- **Verifica una copia.** Nella pagina [Verifica una copia](https://svitatlco.github.io/tassello/verifica.html) scegli il file e il sito ti dice se è identico a una versione ufficiale; il file non lascia il tuo computer. Gli elenchi delle versioni con le loro impronte SHA-256 sono in [`docs/versioni.json`](docs/versioni.json) (Tassello Ufficio) e [`docs/versioni-media.json`](docs/versioni-media.json) (Tassello Media).
- **Controlla l'impronta da solo.** Ogni release indica l'impronta SHA-256 del file, che deve coincidere carattere per carattere. In Windows la calcoli con `certutil -hashfile tassello-ufficio.html SHA256`, in macOS e Linux con `shasum -a 256 tassello-ufficio.html` (per Tassello Media il file è `tassello-media.html`).
- **Controlla la provenienza.** Ogni file delle release (Tassello Ufficio dalla versione 1.3.0, Tassello Media dalla prima release) ha una firma di provenienza di GitHub, che dimostra che è stato costruito da questo repository a partire dal codice pubblico: `gh attestation verify tassello-ufficio.html --repo svitaTLCO/tassello` (o `tassello-media.html`).
- **Installa l'app.** In Chrome o in Edge apri [Tassello Ufficio](https://svitatlco.github.io/tassello/tassello-ufficio.html) o [Tassello Media](https://svitatlco.github.io/tassello/tassello-media.html) nel browser e scegli *Installa*. L'app arriva sempre dal sito ufficiale, funziona senza rete e si aggiorna da sola; le sue bozze restano separate da quelle del file scaricato.

Ogni file ufficiale contiene anche una regola di sicurezza del browser (Content Security Policy) che gli impedisce di collegarsi a internet o di caricare script, immagini e suoni esterni. Non protegge da una copia alterata, che può toglierla, ma rende verificabile da chiunque che la copia ufficiale non invia dati.

## Tassello Ufficio

Il primo tassello contiene tre app per i documenti di tutti i giorni:

- **Testo**, per scrivere: stili modificabili, elenchi a più livelli, tabelle, immagini e didascalie, sezioni con orientamento e intestazioni proprie, note a piè di pagina e di chiusura, sommario, indice analitico, riferimenti incrociati, citazioni e bibliografia (APA o Chicago), moduli compilabili, equazioni, commenti, stampa unione. Apre e salva **DOCX**.
- **Calcolo**, per i fogli di calcolo: più di cento funzioni in italiano o in inglese, matrici dinamiche, tabelle pivot con campi calcolati, formattazione condizionale, convalida dati, nomi definiti, note e dodici tipi di grafico. Apre e salva **XLSX** e **CSV**.
- **Impagina**, per comporre pagine: post e caroselli per i social, storie, volantini, brochure, newsletter e presentazioni, con formati pronti, margini, colonne, griglia e pagine mastro. Il testo scorre da una cornice all'altra, anche tra pagine, con stili di paragrafo e di carattere; le immagini si adattano o riempiono la cornice attorno a un punto focale. Le fonti sono locali: una cartella del computer (anche quella sincronizzata da Google Drive, OneDrive o Dropbox) che si rilegge con *Aggiorna dalle fonti*, dati CSV, XLSX o JSON per creare una pagina per riga come in una stampa unione, feed RSS o Atom salvati o incollati, testo da DOCX. Esporta **PNG** per i social e **PDF** con la stampa del browser. Per i lavori in grande ci sono i poster A2, A1 e A0 e lo striscione, che si stampano *a tessere* su fogli A4, A3 o A5 con la sovrapposizione per incollarli, i segni di taglio e un foglio di montaggio, e il *festone*, una lettera per foglio da appendere a un filo. Le *insegne* sono scritte d'effetto (sfumature, immagine nelle lettere, contorni, ombre, neon, testo su arco, cerchio o onda) che restano testo vero, leggibile dallo screen reader.

### Come si usa

1. Scarica `tassello-ufficio.html` da un canale ufficiale: il [sito](https://svitatlco.github.io/tassello/) o la [pagina delle release](https://github.com/svitaTLCO/tassello/releases/latest).
2. Aprilo con un doppio clic in Chrome o Edge recenti. Funziona anche senza rete.
3. Le bozze restano salvate nel browser; con **Salva** ottieni un file DOCX o XLSX, in Impagina il progetto da riaprire.

## Tassello Media

Il secondo tassello contiene due app per i suoni e i filmati di tutti i giorni:

- **Audio**, per registrare, montare e modificare: un progetto a più tracce, ognuna con volume, bilanciamento, muto, solo, bassi, alti, compressione e riverbero; regioni da spostare, accorciare, dividere, duplicare e ripetere; tempo e griglia a battute, metronomo, ciclo e registrazione sulla traccia mentre si ascoltano le altre. Ogni regione si apre nell'editor della forma d'onda: registrazione dal microfono con indicatore di livello e avvisi letti dallo screen reader quando è troppo alto o troppo basso, taglia, copia, incolla anche mescolando, duplica, ritaglia, silenzia, marcatori con nome, amplificazione, normalizzazione al picco o al volume percepito (LUFS), dissolvenze, velocità, ritmo senza cambiare intonazione, equalizzatore con filtri, compressore, riduzione del rumore di fondo, accorcia le pause, eco, mono e stereo, statistiche e ricerca delle distorsioni. Apre **WAV**, **MP3**, **M4A**, **OGG**, **Opus**, **FLAC** e l'audio dei video; esporta il brano mixato, le tracce separate o la sola regione in **WAV** con i marcatori e, se il browser lo permette, **M4A** (AAC) e **WebM** (Opus); salva il progetto in un file **ZIP** con i suoi suoni.
- **Video**, per montare: raccolta dei file, traccia video con divisione, tagli, spostamenti, velocità, volume, dissolvenze, transizioni, filtri, luce e colore, rotazione; cartelli, titoli, una traccia audio per musica e voce fuori campo, sottotitoli da scrivere, importare ed esportare in **SRT** e **WebVTT**; verifica dell'accessibilità con controllo di sottotitoli, tempi di lettura, contrasto e lampeggiamenti pericolosi. Esporta **MP4** o **WebM** un fotogramma alla volta, anche con la scheda in secondo piano, oppure solo l'audio o un singolo fotogramma, e salva il progetto in un file **ZIP** con i suoi file.

### Come si usa

1. Scarica `tassello-media.html` da un canale ufficiale: il [sito](https://svitatlco.github.io/tassello/) o la [pagina delle release](https://github.com/svitaTLCO/tassello/releases).
2. Aprilo con un doppio clic in Chrome o Edge recenti. Funziona anche senza rete.
3. Il progetto audio e il progetto video restano salvati nel browser come bozza; con **Esporta** ottieni i file da condividere, con **Salva progetto** un file ZIP da riaprire.

## Accessibilità

Per Tassello l'accessibilità non è una funzione in più da attivare: è il requisito senza il quale un tassello non viene distribuito. Ogni comando, finestra e messaggio nasce per essere usato anche con uno screen reader o con la sola tastiera.

- <kbd>F6</kbd> passa tra le aree, <kbd>Alt</kbd>+<kbd>Q</kbd> cerca qualsiasi comando, <kbd>F1</kbd> elenca tutte le scorciatoie;
- schede, griglia, grafici, finestre e menu usano i ruoli ARIA standard e annunciano celle, valori e stati;
- i grafici si esplorano con le frecce, si leggono come tabella e si ascoltano come suoni;
- in Audio ogni traccia è un elenco di regioni che si scorre con le frecce, con muto, solo, volume e bilanciamento etichettati e annunciati; nell'editor della regione la forma d'onda è un cursore che fa ascoltare il punto in cui ti trovi: Ctrl+frecce salta da una pausa all'altra del parlato, P e D ascoltano prima e dopo, I e O fissano la selezione anche durante l'ascolto, ogni effetto ha l'anteprima;
- in Video ogni traccia è un elenco che si scorre con le frecce, ogni proprietà ha un campo con il suo nome e la verifica controlla sottotitoli, contrasto e lampeggiamenti;
- modalità lettura, contrasto elevato, tema scuro e verifica dell'accessibilità dei documenti.

Le prove fatte finora sono nel browser; le segnalazioni di chi usa NVDA, JAWS o Assistente vocale sono molto benvenute. Un problema di accessibilità è un difetto da correggere, non un miglioramento da valutare.

## Privacy

I documenti restano sul tuo dispositivo. L'unica funzione che usa un servizio esterno è la dettatura vocale di Tassello Ufficio: in Chrome l'audio viene inviato ai server di Google, in Edge a quelli di Microsoft. Tassello Media usa il microfono solo quando lo chiedi tu e le registrazioni restano sul dispositivo.

Questo vale per la copia ufficiale. Una copia modificata da altri può comportarsi in modo diverso: è uno dei motivi per [usare solo i canali ufficiali](#solo-dai-canali-ufficiali).

## La famiglia Tassello

Ogni tassello copre un tipo di lavoro sui file e resta indipendente dagli altri: prendi solo quello che ti serve. Un nuovo strumento esce solo quando è accessibile.

| Strumento | File | App | Stato |
| --- | --- | --- | --- |
| Tassello Ufficio | `tassello-ufficio.html` | Testo, Calcolo, Impagina | Disponibile |
| Tassello Media | `tassello-media.html` | Audio, Video | Disponibile |
| Tassello Grafica | `tassello-grafica.html` | Immagini, Disegno | In progetto |

## Limiti

Tassello Ufficio copre il lavoro di base, non tutto. Macro, revisioni (modifiche tracciate), slicer delle tabelle pivot e grafici combinati non sono supportati; l'apertura di DOCX e XLSX copre un sottoinsieme dei formati. In Impagina le cornici non si ruotano, il testo va a capo senza sillabazione e usa i caratteri installati sul computer; la cartella collegata si autorizza di nuovo a ogni sessione.

Tassello Media copre il lavoro di base. In Audio le tracce sono solo audio (niente strumenti virtuali né MIDI), gli effetti di traccia sono semplici, la latenza della registrazione è stimata e regolabile, e i progetti molto lunghi richiedono molta memoria. In Video l'esportazione procede un fotogramma alla volta e la sua velocità dipende dal computer; se un file del montaggio usa un formato che il browser non sa decodificare, l'esportazione avviene invece in tempo reale, quindi dura quanto il montaggio e la scheda va lasciata in primo piano; MP4 dipende dal browser, altrimenti si ottiene WebM; non ci sono fotogrammi chiave né più tracce video sovrapposte; si importano solo i formati che il browser sa riprodurre.

Conserva sempre una copia degli originali.

## Struttura del repository

```
docs/                 sito pubblicato con GitHub Pages
  index.html          pagina di presentazione (generata da sito/)
  verifica.html       verifica di una copia (generata da sito/)
  en/, fr/, es/       le stesse pagine in inglese, francese e spagnolo (generate da sito/)
  versioni.json       versioni ufficiali con le impronte SHA-256
  versioni-media.json versioni ufficiali di Tassello Media
  versioni-grafica.json versioni di Tassello Grafica (in preparazione, non ancora pubblicato)
  tassello-ufficio.html, tassello-media.html  i programmi, già costruiti
  tassello-grafica.html  Tassello Grafica in preparazione: Immagini e Disegno
  manifest.webmanifest, manifest-media.webmanifest, sw.js  app installabili e uso senza rete
  stile.css, icon*    stile del sito e marchio
ufficio/
  VERSIONE            numero di versione del programma
  build.py            costruisce docs/tassello-ufficio.html e aggiorna docs/versioni.json
  src/                sorgenti: HTML, CSS e JavaScript senza dipendenze
media/
  VERSIONE            numero di versione di Tassello Media
  build.py            costruisce docs/tassello-media.html e aggiorna docs/versioni-media.json
  src/                sorgenti: HTML, CSS e JavaScript senza dipendenze
grafica/
  VERSIONE            numero di versione di Tassello Grafica
  build.py            costruisce docs/tassello-grafica.html e aggiorna docs/versioni-grafica.json
  src/                sorgenti: HTML, CSS e JavaScript senza dipendenze
sito/
  build.py            costruisce le pagine del sito in ogni lingua
  pagine/             modelli della pagina iniziale e della pagina Verifica
  testi/              testi del sito: it.txt è il riferimento, poi en.txt, fr.txt, es.txt
```

Per ricostruire un programma o il sito dopo una modifica serve solo Python 3.8 o successivo:

```
python ufficio/build.py
python media/build.py
python grafica/build.py
python sito/build.py
```

Le pagine del sito non si modificano direttamente in `docs/`: si cambiano il modello in `sito/pagine/` o i testi in `sito/testi/` e si ricostruisce. Ogni lingua deve avere le stesse voci dell'italiano; se ne manca una, o ne avanza una, `sito/build.py` si ferma e dice quale.

L'ordine dei file è indicato in ogni `build.py`. Tutto il codice gira dentro un'unica funzione: non ci sono librerie esterne né richieste di rete, e la regola di sicurezza in `src/01-head.html` le vieta.

Ogni build registra l'impronta del file nel suo elenco (`docs/versioni.json`, `docs/versioni-media.json` o `docs/versioni-grafica.json`) per la versione scritta nel suo `VERSIONE`. Quando pubblichi una modifica del programma sul sito, aumenta prima il numero di versione: così ogni file pubblicato resta riconoscibile come ufficiale. La release si crea inviando l'etichetta corrispondente: `v` per Tassello Ufficio, per esempio `git tag v1.3.0 && git push origin v1.3.0`, e `media-v` per Tassello Media, per esempio `git tag media-v1.0.0 && git push origin media-v1.0.0`, e `grafica-v` per Tassello Grafica.

## Contribuire

Segnalazioni e proposte sono benvenute nelle [issue](https://github.com/svitaTLCO/tassello/issues), in italiano o in inglese, e quelle sull'accessibilità hanno la precedenza. Per una modifica al codice apri una pull request che tocchi i file in `ufficio/src/`, `media/src/` o `grafica/src/` e includa il file ricostruito. Correzioni alle traduzioni del sito, o una lingua nuova, si propongono in `sito/testi/`.

## Licenza

Copyright © 2026 svitaTLCO e collaboratori. Tassello è distribuito con la [European Union Public Licence 1.2](LICENSE) (EUPL 1.2): puoi usarlo, studiarlo, modificarlo e ridistribuirlo; le versioni modificate che distribuisci devono restare libere con la stessa licenza o con una licenza compatibile e, come chiede la licenza, dire in modo evidente che sono state modificate. Una versione modificata non è una copia ufficiale di Tassello.

Microsoft, Office, Word ed Excel sono marchi di Microsoft Corporation. Tassello non è collegato a Microsoft: apre e salva i formati DOCX e XLSX per essere compatibile.

---

## In English

The website is available in [English](https://svitatlco.github.io/tassello/en/), [French](https://svitatlco.github.io/tassello/fr/) and [Spanish](https://svitatlco.github.io/tassello/es/) as well as Italian.

**Tassello** is a small family of free and open source tools for basic, everyday work on files: writing a letter, filling in a form, keeping a list, doing the numbers. Each tool is a single HTML file that runs in your browser, with no bulky suite to install, no account and no cloud. Think of it as a small, tidy Swiss Army knife for your files: not a replacement for professional software, and not a clone of famous apps.

**Only use official copies.** Download Tassello only from the [website](https://svitatlco.github.io/tassello/) or from the [releases of this repository](https://github.com/svitaTLCO/tassello/releases). Because it is a single file, anyone could alter a copy and pass it around: do not open copies you receive by email, chat or USB stick, and share the link instead of the file. Tassello never connects to the internet (dictation uses the browser's own service) and never asks for passwords, accounts or payments. The [verification page](https://svitatlco.github.io/tassello/verifica.html) tells you whether a file is identical to an official version, and in Chrome or Edge you can install each tool as an app that always comes from the official website and works offline.

**Tassello Ufficio** contains **Testo**, a word processor, **Calcolo**, a spreadsheet, and **Impagina**, a multi-page layout editor for social posts, flyers, brochures, newsletters, posters, banners and slides, with text threaded across frames and pages, master pages, decorative text effects that stay real text, posters printed as tiles across standard sheets, and local sources only (a linked folder, CSV, XLSX or JSON data merged into pages, saved RSS or Atom feeds, DOCX text). It opens and saves DOCX, XLSX and CSV files, exports PNG and PDF, and works offline in recent Chrome and Edge. **Tassello Media** contains **Audio**, a multitrack recorder and editor with per-track volume, pan, mute, solo, EQ, compression and reverb, regions, tempo grid, metronome, cycle and overdubbing, plus a waveform editor with markers, noise reduction and loudness normalization (WAV, M4A and WebM export), and **Video**, a timeline editor with titles, a music and voice-over track, captions in SRT and WebVTT and an accessibility check for captions, contrast and flashing (MP4 or WebM export). Accessibility is a requirement, not an add-on: no tool is released unless it works with a screen reader and with the keyboard alone. The interface is currently in Italian.

To rebuild them from source, run `python ufficio/build.py` and `python media/build.py`; the website pages are built with `python sito/build.py` from the templates in `sito/pagine/` and the texts in `sito/testi/`.

Licensed under the [EUPL 1.2](LICENSE). Microsoft, Office, Word and Excel are trademarks of Microsoft Corporation; Tassello is not affiliated with Microsoft.
