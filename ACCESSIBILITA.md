# Dichiarazione di accessibilità

Per Tassello l'accessibilità è la condizione per distribuire uno strumento, non una funzione in più. Questa dichiarazione dice che cosa abbiamo verificato, a che punto siamo e che cosa non funziona ancora bene, perché chi usa uno screen reader, la sola tastiera, l'ingrandimento o i colori forzati sappia che cosa aspettarsi.

*In English: see [below](#in-english).*

## A che cosa si riferisce

- **Tassello Ufficio 1.10.1**: Testo, Calcolo e Impagina;
- **Tassello Media 1.4.0**: Audio e Video;
- **Tassello Grafica 1.3.1**: Immagini e Disegno;
- il **sito** [svitatlco.github.io/tassello](https://svitatlco.github.io/tassello/) e la pagina **Verifica una copia**, in italiano, inglese, francese e spagnolo.

Vale per **Chrome o Edge recenti su un computer**. Le prove sono state fatte su Windows; tablet, telefoni, il Mac con VoiceOver e gli altri browser non sono ancora supportati. L'interfaccia delle app è in italiano.

Dichiarazione redatta il 29 ottobre 2026 e aggiornata il 4 novembre 2026. La aggiorniamo a ogni nuova versione.

## Stato di conformità

Tassello è **parzialmente conforme** alle [WCAG 2.2](https://www.w3.org/TR/WCAG22/), livello AA.

Le verifiche descritte sotto non trovano più difetti rispetto ai criteri di livello A e AA, tranne quelli elencati nei [limiti noti](#limiti-noti). La conformità però non è ancora confermata da prove con screen reader veri: per questo la dichiariamo parziale finché il gruppo di prova non avrà finito.

## Come l'abbiamo valutata

Il 28 e il 29 ottobre 2026:

- **Verifica WCAG 2.2 AA** in Edge su Windows, con [axe-core](https://github.com/dequelabs/axe-core) 4.14 e con controlli scritti apposta per i criteri che gli strumenti automatici non coprono: ridisposizione a 320 px, spaziatura del testo, dimensione dei bersagli, contrasto degli elementi non testuali, fuoco visibile e non coperto, ordine del fuoco, trappole della tastiera, alternative al trascinamento, messaggi di stato, nome, ruolo e valore dei comandi costruiti su misura, errori nelle finestre. Circa 1.000 stati delle sette app e del sito, in quattro temi e con i colori forzati, ripetuti dopo le correzioni.
- **Prove automatiche nel browser vero** per ogni tassello, che leggono anche il testo esatto degli annunci per lo screen reader.
- **Un'analisi dei compiti che di solito si fanno guardando**, app per app: comporre una pagina, valutare la luce di una foto, capire che cosa c'è in un video. Da questa analisi vengono le descrizioni a parole aggiunte nelle versioni attuali.
- **Prove con persone non vedenti**, in corso, con la [guida alla prova](PROVA-ACCESSIBILITA.md).

Il 4 novembre 2026, dopo aver corretto le finestre di Tassello Ufficio che cambiavano in silenzio un numero fuori dai limiti, abbiamo ripetuto le prove di Ufficio nel browser.

Non abbiamo ancora fatto noi prove sistematiche con NVDA, JAWS o l'Assistente vocale: è il compito del gruppo di prova.

## Che cosa offre Tassello

- **Tastiera.** Tutto si usa da tastiera. F6 passa tra le aree, Alt+Q cerca qualsiasi comando, F1 elenca le scorciatoie. Le descrizioni hanno lo stesso tasto in tutte le app: Alt+Maiusc+I descrive quello che hai davanti, Alt+Maiusc+D l'insieme, Alt+Maiusc+R dove sta l'elemento scelto, Alt+Maiusc+L la luce o i livelli, Alt+Maiusc+O il confronto con l'originale.
- **Il risultato visivo detto a parole e in suoni.** Alcuni esempi:
  - la posizione delle cornici e le sovrapposizioni in Impagina e in Disegno;
  - la luce, l'istogramma, le zone e i colori di una foto;
  - i grafici di Calcolo e l'istogramma di Immagini, che si percorrono con le frecce e si ascoltano;
  - le scene, la luce e il parlato di un video;
  - i livelli e l'effetto di ogni modifica in Audio;
  - i colori detti con il loro nome.
- **Documenti accessibili.** Testo, Calcolo, Impagina, Video e Disegno hanno una verifica dell'accessibilità per quello che produci: testi alternativi, contrasto, ordine di lettura, sottotitoli, lampeggiamenti. I PDF di Impagina hanno titoli, paragrafi, elenchi, immagini con il testo alternativo e l'ordine di lettura; gli SVG di Disegno hanno titolo e descrizione.
- **Vista.** Tema chiaro e scuro, contrasto elevato, colori forzati di Windows, riduzione delle animazioni, ridisposizione fino a 320 px di larghezza.

## Limiti noti

1. **Screen reader veri.** Il comportamento con NVDA, JAWS e l'Assistente vocale va ancora confermato, soprattutto per:
   - gli annunci uniti in una frase;
   - le finestre che all'apertura leggono il riassunto;
   - i messaggi che compaiono sotto un campo quando un valore non va bene;
   - le aree interattive: la foto e l'istogramma di Immagini, l'anteprima di Video, la griglia di Calcolo, il foglio di Disegno.
2. **Compiti visivi ancora difficili senza vista:**
   - in Impagina mettere le cornici nella griglia e scrivere misure relative, come «metà pagina»;
   - in Immagini seguire il bordo dello scontorno, e giudicare nitidezza e rumore;
   - in Disegno esplorare il foglio con un cursore, e disegnare con la Penna e la Matita dal cursore;
   - in Video sentire luce e colore prima e dopo; la verifica dei lampeggiamenti non riconosce ancora i lampi su una parte dello schermo né i lampi rossi;
   - in Audio registrare sentendo i livelli a parole.
3. **Descrizioni senza intelligenza artificiale.** Le descrizioni misurano pixel e suono: dicono luce, colori, zone, scene e pause, ma non riconoscono persone o oggetti.
4. **Lingua e piattaforme.** L'interfaccia è solo in italiano. Sono supportati solo Chrome ed Edge recenti su computer.

## Segnalazioni

Se qualcosa non si usa con la tecnologia che usi, segnalalo con il modulo **[Problema di accessibilità](https://github.com/svitaTLCO/tassello/issues/new?template=accessibilita.yml)**. Un problema di accessibilità per noi è un difetto da correggere, non un miglioramento da valutare, e queste segnalazioni hanno la precedenza.

Tassello è un progetto libero e volontario, non un servizio pubblico: questa dichiarazione segue la forma delle dichiarazioni di accessibilità europee per chiarezza, non per un obbligo di legge.

## In English

This statement covers Tassello Ufficio 1.10.1, Tassello Media 1.4.0, Tassello Grafica 1.3.1, the website and the verification page, used with recent Chrome or Edge on a computer (tested on Windows). The app interface is in Italian. Written on 29 October 2026, updated on 4 November 2026, and updated with every release.

**Status: partially conformant with WCAG 2.2 level AA.** An evaluation with axe-core 4.14 and custom checks on about 1,000 states of the seven apps and the website (four themes and forced colours, repeated after fixes), real-browser tests that read the exact screen reader announcements, and a task-by-task analysis of visual work found no remaining A or AA failures except the known limitations below. Conformance is not yet confirmed with real screen readers: a group of blind testers is working through the [testing guide](PROVA-ACCESSIBILITA.md).

**Known limitations:** behaviour with NVDA, JAWS and Narrator is still to be confirmed; some visual tasks are still hard without sight (placing frames on the grid in Impagina, following a cut-out edge in Immagini, exploring a drawing with a cursor in Disegno, colour changes before and after in Video, partial-screen and red flashes in the flash check, recording levels in Audio); descriptions measure pixels and sound and do not recognise people or objects; only recent Chrome and Edge on computers are supported.

**Feedback:** use the [Accessibility problem form](https://github.com/svitaTLCO/tassello/issues/new?template=accessibilita.yml). Accessibility problems are treated as bugs and come first.
