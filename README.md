<p align="center"><img src="docs/icon.svg" width="96" height="96" alt="Il marchio di Tessera: quattro tessere colorate"></p>

<h1 align="center">Tessera</h1>

<p align="center"><b>Un file. Tutto quello che ti serve.</b><br>
Strumenti liberi e gratuiti, ognuno in un solo file HTML: niente installazione, niente account, niente cloud.</p>

<p align="center">
<a href="https://svitatlco.github.io/tessera/">Sito</a> ·
<a href="https://svitatlco.github.io/tessera/tessera-ufficio.html">Prova nel browser</a> ·
<a href="https://github.com/svitaTLCO/tessera/releases/latest">Scarica</a> ·
<a href="#in-english">English</a>
</p>

## Tessera Ufficio

Il primo strumento della famiglia contiene due app:

- **Testo**, per scrivere: stili modificabili, elenchi a più livelli, tabelle, immagini e didascalie, sezioni con orientamento e intestazioni proprie, note a piè di pagina e di chiusura, sommario, indice analitico, riferimenti incrociati, citazioni e bibliografia (APA o Chicago), moduli compilabili, equazioni, commenti, stampa unione. Apre e salva **DOCX**.
- **Calcolo**, per i fogli di calcolo: più di cento funzioni in italiano o in inglese, matrici dinamiche, tabelle pivot con campi calcolati, formattazione condizionale, convalida dati, nomi definiti, note e dodici tipi di grafico. Apre e salva **XLSX** e **CSV**.

### Come si usa

1. Scarica `tessera-ufficio.html` dalla [pagina delle release](https://github.com/svitaTLCO/tessera/releases/latest) o dal [sito](https://svitatlco.github.io/tessera/).
2. Aprilo con un doppio clic in Chrome o Edge recenti. Funziona anche senza rete.
3. Le bozze restano salvate nel browser; con **Salva** ottieni un file DOCX o XLSX.

Per verificare il file scaricato, confronta la sua impronta SHA-256 con quella indicata nella release (in Windows: `certutil -hashfile tessera-ufficio.html SHA256`).

## Accessibilità

Tessera è pensata fin dall'inizio per chi usa uno screen reader o solo la tastiera:

- <kbd>F6</kbd> passa tra le aree, <kbd>Alt</kbd>+<kbd>Q</kbd> cerca qualsiasi comando, <kbd>F1</kbd> elenca tutte le scorciatoie;
- schede, griglia, grafici, finestre e menu usano i ruoli ARIA standard e annunciano celle, valori e stati;
- i grafici si esplorano con le frecce, si leggono come tabella e si ascoltano come suoni;
- modalità lettura, contrasto elevato, tema scuro e verifica dell'accessibilità dei documenti.

Le prove fatte finora sono nel browser; le segnalazioni di chi usa NVDA, JAWS o Assistente vocale sono molto benvenute.

## Privacy

I documenti restano sul tuo dispositivo. L'unica funzione che usa un servizio esterno è la dettatura vocale: in Chrome l'audio viene inviato ai server di Google, in Edge a quelli di Microsoft.

## La famiglia Tessera

| Strumento | File | App | Stato |
| --- | --- | --- | --- |
| Tessera Ufficio | `tessera-ufficio.html` | Testo, Calcolo | Disponibile |
| Tessera Media | `tessera-media.html` | Audio, Video | In arrivo |
| Tessera Grafica | `tessera-grafica.html` | Immagini, Disegno | In progetto |

## Limiti

Non è Microsoft Office. Macro, revisioni (modifiche tracciate), slicer delle tabelle pivot e grafici combinati non sono supportati; l'apertura di DOCX e XLSX copre un sottoinsieme dei formati. Conserva sempre una copia degli originali.

## Struttura del repository

```
docs/                 sito pubblicato con GitHub Pages
  index.html          pagina di presentazione
  tessera-ufficio.html  il programma, già costruito
  icon.svg            marchio
ufficio/
  build.py            costruisce docs/tessera-ufficio.html
  src/                sorgenti: HTML, CSS e JavaScript senza dipendenze
```

Per ricostruire il programma dopo una modifica serve solo Python 3.8 o successivo:

```
python ufficio/build.py
```

L'ordine dei file è indicato in `ufficio/build.py`. Tutto il codice gira dentro un'unica funzione: non ci sono librerie esterne né richieste di rete.

## Contribuire

Segnalazioni e proposte sono benvenute nelle [issue](https://github.com/svitaTLCO/tessera/issues), in italiano o in inglese. Per una modifica al codice apri una pull request che tocchi i file in `ufficio/src/` e includa il file ricostruito.

## Licenza

Copyright © 2026 svitaTLCO e collaboratori. Tessera è distribuita con la [European Union Public Licence 1.2](LICENSE) (EUPL 1.2): puoi usarla, studiarla, modificarla e ridistribuirla; le versioni modificate che distribuisci devono restare libere con la stessa licenza o con una licenza compatibile.

Microsoft, Office, Word ed Excel sono marchi di Microsoft Corporation. Tessera non è collegata a Microsoft: apre e salva i formati DOCX e XLSX per essere compatibile.

---

## In English

**Tessera** is a family of free and open source tools, each one a single HTML file that runs in your browser: no installation, no account, no cloud.

**Tessera Ufficio** contains **Testo**, a word processor, and **Calcolo**, a spreadsheet. It opens and saves DOCX, XLSX and CSV files, works offline in recent Chrome and Edge, and is designed from the ground up for screen reader and keyboard users. The interface is currently in Italian.

Download `tessera-ufficio.html` from the [latest release](https://github.com/svitaTLCO/tessera/releases/latest) and open it with a double click. To rebuild it from source, run `python ufficio/build.py`.

Licensed under the [EUPL 1.2](LICENSE). Microsoft, Office, Word and Excel are trademarks of Microsoft Corporation; Tessera is not affiliated with Microsoft.
