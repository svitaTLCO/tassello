<p align="center"><img src="docs/icon.svg" width="96" height="96" alt="Il marchio di Tassello: quattro tasselli colorati"></p>

<h1 align="center">Tassello</h1>

<p align="center"><b>Il necessario per lavorare sui file, in un file solo.</b><br>
Piccoli strumenti liberi e gratuiti per scrivere, compilare e fare i conti, senza suite o installazioni ingombranti. Ognuno è un solo file HTML che si apre nel browser.</p>

<p align="center">
<a href="https://svitatlco.github.io/tassello/">Sito</a> ·
<a href="https://svitatlco.github.io/tassello/tassello-ufficio.html">Prova nel browser</a> ·
<a href="https://github.com/svitaTLCO/tassello/releases/latest">Scarica</a> ·
<a href="#in-english">English</a>
</p>

> [!IMPORTANT]
> **Usa solo copie ufficiali.** Scarica Tassello solo dal [sito](https://svitatlco.github.io/tassello/) o dalle [release di questo repository](https://github.com/svitaTLCO/tassello/releases). Se qualcuno ti manda il file per email, in chat o su una chiavetta, non aprirlo: scaricalo di nuovo da uno di questi due indirizzi. [Perché è importante](#solo-dai-canali-ufficiali).

## Che cos'è

Tassello è un piccolo coltellino svizzero per i file: ordinato e leggero. Serve per la produttività di base, cioè scrivere una lettera, compilare un modulo, preparare un preventivo, tenere un elenco o fare due conti, senza dipendere da una suite da installare o da un account.

Ogni strumento della famiglia è un *tassello*: un unico file che si apre con un doppio clic e funziona anche senza rete. L'obiettivo è mettere in mano a chiunque, nel modo più semplice possibile, la capacità di lavorare sui propri file.

**Cosa non è.** Tassello non sostituisce gli strumenti da professionisti: se il tuo lavoro richiede macro, revisioni tracciate o modelli complessi, continua a usare il programma adatto. Non è nemmeno un clone delle app famose: ne apre e salva i formati per scambiare file con tutti, ma ha un disegno suo, con funzioni scelte una per una per il lavoro di tutti i giorni e tutte raggiungibili da tastiera.

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
- **Verifica una copia.** Nella pagina [Verifica una copia](https://svitatlco.github.io/tassello/verifica.html) scegli il file e il sito ti dice se è identico a una versione ufficiale; il file non lascia il tuo computer. L'elenco delle versioni con le loro impronte SHA-256 è in [`docs/versioni.json`](docs/versioni.json).
- **Controlla l'impronta da solo.** Ogni release indica l'impronta SHA-256 del file, che deve coincidere carattere per carattere. In Windows la calcoli con `certutil -hashfile tassello-ufficio.html SHA256`, in macOS e Linux con `shasum -a 256 tassello-ufficio.html`.
- **Controlla la provenienza.** Dalla versione 1.3.0 ogni file delle release ha una firma di provenienza di GitHub, che dimostra che è stato costruito da questo repository a partire dal codice pubblico: `gh attestation verify tassello-ufficio.html --repo svitaTLCO/tassello`.
- **Installa l'app.** In Chrome o in Edge apri la [versione nel browser](https://svitatlco.github.io/tassello/tassello-ufficio.html) e scegli *Installa*. L'app arriva sempre dal sito ufficiale, funziona senza rete e si aggiorna da sola; le sue bozze restano separate da quelle del file scaricato.

Il file ufficiale contiene anche una regola di sicurezza del browser (Content Security Policy) che gli impedisce di collegarsi a internet o di caricare script e immagini esterne. Non protegge da una copia alterata, che può toglierla, ma rende verificabile da chiunque che la copia ufficiale non invia dati.

## Tassello Ufficio

Il primo tassello contiene due app per i documenti di tutti i giorni:

- **Testo**, per scrivere: stili modificabili, elenchi a più livelli, tabelle, immagini e didascalie, sezioni con orientamento e intestazioni proprie, note a piè di pagina e di chiusura, sommario, indice analitico, riferimenti incrociati, citazioni e bibliografia (APA o Chicago), moduli compilabili, equazioni, commenti, stampa unione. Apre e salva **DOCX**.
- **Calcolo**, per i fogli di calcolo: più di cento funzioni in italiano o in inglese, matrici dinamiche, tabelle pivot con campi calcolati, formattazione condizionale, convalida dati, nomi definiti, note e dodici tipi di grafico. Apre e salva **XLSX** e **CSV**.

### Come si usa

1. Scarica `tassello-ufficio.html` da un canale ufficiale: il [sito](https://svitatlco.github.io/tassello/) o la [pagina delle release](https://github.com/svitaTLCO/tassello/releases/latest).
2. Aprilo con un doppio clic in Chrome o Edge recenti. Funziona anche senza rete.
3. Le bozze restano salvate nel browser; con **Salva** ottieni un file DOCX o XLSX.

## Accessibilità

Per Tassello l'accessibilità non è una funzione in più da attivare: è il requisito senza il quale un tassello non viene distribuito. Ogni comando, finestra e messaggio nasce per essere usato anche con uno screen reader o con la sola tastiera.

- <kbd>F6</kbd> passa tra le aree, <kbd>Alt</kbd>+<kbd>Q</kbd> cerca qualsiasi comando, <kbd>F1</kbd> elenca tutte le scorciatoie;
- schede, griglia, grafici, finestre e menu usano i ruoli ARIA standard e annunciano celle, valori e stati;
- i grafici si esplorano con le frecce, si leggono come tabella e si ascoltano come suoni;
- modalità lettura, contrasto elevato, tema scuro e verifica dell'accessibilità dei documenti.

Le prove fatte finora sono nel browser; le segnalazioni di chi usa NVDA, JAWS o Assistente vocale sono molto benvenute. Un problema di accessibilità è un difetto da correggere, non un miglioramento da valutare.

## Privacy

I documenti restano sul tuo dispositivo. L'unica funzione che usa un servizio esterno è la dettatura vocale: in Chrome l'audio viene inviato ai server di Google, in Edge a quelli di Microsoft.

Questo vale per la copia ufficiale. Una copia modificata da altri può comportarsi in modo diverso: è uno dei motivi per [usare solo i canali ufficiali](#solo-dai-canali-ufficiali).

## La famiglia Tassello

Ogni tassello copre un tipo di lavoro sui file e resta indipendente dagli altri: prendi solo quello che ti serve. Un nuovo strumento esce solo quando è accessibile.

| Strumento | File | App | Stato |
| --- | --- | --- | --- |
| Tassello Ufficio | `tassello-ufficio.html` | Testo, Calcolo | Disponibile |
| Tassello Media | `tassello-media.html` | Audio, Video | In arrivo |
| Tassello Grafica | `tassello-grafica.html` | Immagini, Disegno | In progetto |

## Limiti

Tassello Ufficio copre il lavoro di base, non tutto. Macro, revisioni (modifiche tracciate), slicer delle tabelle pivot e grafici combinati non sono supportati; l'apertura di DOCX e XLSX copre un sottoinsieme dei formati. Conserva sempre una copia degli originali.

## Struttura del repository

```
docs/                 sito pubblicato con GitHub Pages
  index.html          pagina di presentazione
  verifica.html       verifica di una copia
  versioni.json       versioni ufficiali con le impronte SHA-256
  tassello-ufficio.html  il programma, già costruito
  manifest.webmanifest, sw.js  app installabile e uso senza rete
  stile.css, icon*    stile del sito e marchio
ufficio/
  VERSIONE            numero di versione del programma
  build.py            costruisce docs/tassello-ufficio.html e aggiorna docs/versioni.json
  src/                sorgenti: HTML, CSS e JavaScript senza dipendenze
```

Per ricostruire il programma dopo una modifica serve solo Python 3.8 o successivo:

```
python ufficio/build.py
```

L'ordine dei file è indicato in `ufficio/build.py`. Tutto il codice gira dentro un'unica funzione: non ci sono librerie esterne né richieste di rete, e la regola di sicurezza in `ufficio/src/01-head.html` le vieta.

Ogni build registra l'impronta del file in `docs/versioni.json` per la versione scritta in `ufficio/VERSIONE`. Quando pubblichi una modifica del programma sul sito, aumenta prima il numero di versione: così ogni file pubblicato resta riconoscibile come ufficiale. La release si crea inviando l'etichetta corrispondente, per esempio `git tag v1.3.0 && git push origin v1.3.0`.

## Contribuire

Segnalazioni e proposte sono benvenute nelle [issue](https://github.com/svitaTLCO/tassello/issues), in italiano o in inglese, e quelle sull'accessibilità hanno la precedenza. Per una modifica al codice apri una pull request che tocchi i file in `ufficio/src/` e includa il file ricostruito.

## Licenza

Copyright © 2026 svitaTLCO e collaboratori. Tassello è distribuito con la [European Union Public Licence 1.2](LICENSE) (EUPL 1.2): puoi usarlo, studiarlo, modificarlo e ridistribuirlo; le versioni modificate che distribuisci devono restare libere con la stessa licenza o con una licenza compatibile e, come chiede la licenza, dire in modo evidente che sono state modificate. Una versione modificata non è una copia ufficiale di Tassello.

Microsoft, Office, Word ed Excel sono marchi di Microsoft Corporation. Tassello non è collegato a Microsoft: apre e salva i formati DOCX e XLSX per essere compatibile.

---

## In English

**Tassello** is a small family of free and open source tools for basic, everyday work on files: writing a letter, filling in a form, keeping a list, doing the numbers. Each tool is a single HTML file that runs in your browser, with no bulky suite to install, no account and no cloud. Think of it as a small, tidy Swiss Army knife for your files: not a replacement for professional software, and not a clone of famous apps.

**Only use official copies.** Download Tassello only from the [website](https://svitatlco.github.io/tassello/) or from the [releases of this repository](https://github.com/svitaTLCO/tassello/releases). Because it is a single file, anyone could alter a copy and pass it around: do not open copies you receive by email, chat or USB stick, and share the link instead of the file. Tassello never connects to the internet (dictation uses the browser's own service) and never asks for passwords, accounts or payments. The [verification page](https://svitatlco.github.io/tassello/verifica.html) tells you whether a file is identical to an official version, and in Chrome or Edge you can install Tassello Ufficio as an app that always comes from the official website and works offline.

**Tassello Ufficio** contains **Testo**, a word processor, and **Calcolo**, a spreadsheet. It opens and saves DOCX, XLSX and CSV files and works offline in recent Chrome and Edge. Accessibility is a requirement, not an add-on: no tool is released unless it works with a screen reader and with the keyboard alone. The interface is currently in Italian.

To rebuild it from source, run `python ufficio/build.py`.

Licensed under the [EUPL 1.2](LICENSE). Microsoft, Office, Word and Excel are trademarks of Microsoft Corporation; Tassello is not affiliated with Microsoft.
