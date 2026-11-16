# Dichiarazione di accessibilità

Per Tassello l'accessibilità è la condizione per distribuire uno strumento, non una funzione in più. Questa dichiarazione dice che cosa abbiamo verificato, a che punto siamo e che cosa non funziona ancora bene, perché chi usa uno screen reader, la sola tastiera, l'ingrandimento o i colori forzati sappia che cosa aspettarsi.

*In English: see [below](#in-english).*

## A che cosa si riferisce

- **Tassello Ufficio 1.12.1**: Testo, Calcolo e Impagina;
- **Tassello Media 1.19.0**: Audio e Video;
- **Tassello Grafica 1.4.8**: Immagini e Disegno;
- il **sito** [svitatlco.github.io/tassello](https://svitatlco.github.io/tassello/) e la pagina **Verifica una copia**, in italiano, inglese, francese e spagnolo.

Vale per **Chrome o Edge recenti su un computer**. Le prove sono state fatte su Windows; tablet, telefoni, il Mac con VoiceOver e gli altri browser non sono ancora supportati. L'interfaccia delle app è in italiano.

Dichiarazione redatta il 29 ottobre 2026 e aggiornata il 16 novembre 2026. La aggiorniamo a ogni nuova versione.

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

Il 15 novembre 2026 abbiamo fatto una campagna con NVDA 2026.2 su Windows 11, in Chrome, su circa 45 superfici delle tre app: finestre di dialogo, messaggi d'errore, slider, report, elenchi e tabelle. L'interfaccia era pilotata con tasti inviati al documento e il log di sintesi di NVDA è stato letto per intero. Il 16 novembre 2026 abbiamo provato con NVDA 2026.2, in Chrome su Windows 11, le misure scritte in Impagina: `metà`, `1/2`, `50%`, `2 colonne`, `+12`. NVDA dice il valore risolto («Titolo: x 540 px (metà)»), avvisa quando la cornice esce dai margini, legge il messaggio specifico quando la misura non si capisce, e legge i comandi «Metti sotto…», «Stessa misura…» e «Distanza da…» con il risultato. Anche Invio applica il campo, come il passaggio a un altro campo, e conferma le finestre anche quando il fuoco è su un elenco a discesa.

Lo stesso giorno abbiamo provato la registrazione in Audio: NVDA legge le nuove opzioni, «Prova il livello» annuncia la prova di tre secondi e il guadagno consigliato («Sei 7 dB troppo alto: abbassa di 7 dB»), «Tempo e livello» dice livello e picco. Gli impulsi del livello sono suono, non parlato: dicono se si è troppo alti o troppo bassi senza interrompere la frase, e tacciono quando suona il metronomo.

Sempre il 16 novembre abbiamo provato la verifica dei lampeggiamenti su un video di prova con un lampo a schermo intero, uno sulla metà destra e uno rosso: NVDA legge tre punti, ognuno con il tempo, la zona («su tutto lo schermo», «nella metà destra») e la percentuale d'area, e i pulsanti «Vai» e «Mostra dove». Il riquadro sull'anteprima è per chi guarda; chi non vede ha la zona a parole.

Queste prove dicono che cosa NVDA pronuncia, non se il ritmo e i tempi sono comodi; non sostituiscono una prova con tastiera e computer reali, né con JAWS, Narrator, VoiceOver o TalkBack.

Cosa manca, e cosa chiediamo alla community. Non abbiamo ancora provato JAWS e Narrator su Windows, VoiceOver su macOS e iOS, TalkBack su Android, né fatto una valutazione con persone. Chiediamo a chi può: provare le tre app con il proprio screen reader e la propria tastiera, seguendo la [guida alla prova](PROVA-ACCESSIBILITA.md); segnalare che cosa non viene annunciato, dove il fuoco si sposta male e quali descrizioni non bastano, indicando app, versione, browser, screen reader, passi e risultato atteso. Ogni segnalazione passa dal [modulo Problema di accessibilità](https://github.com/svitaTLCO/tassello/issues/new?template=accessibilita.yml) e per noi è un difetto.

## Che cosa offre Tassello

- **Tastiera.** Tutto si usa da tastiera. F6 passa tra le aree, Alt+Q cerca qualsiasi comando, Ctrl+/ elenca le scorciatoie (F1 lo tiene Chrome per la sua guida). Le descrizioni hanno lo stesso tasto in tutte le app: Alt+Maiusc+I descrive quello che hai davanti, Alt+Maiusc+D l'insieme, Alt+Maiusc+R dove sta l'elemento scelto, Alt+Maiusc+L la luce o i livelli, Alt+Maiusc+O il confronto con l'originale.
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
   - in Immagini seguire il bordo dello scontorno, e giudicare nitidezza e rumore;
   - in Disegno esplorare il foglio con un cursore, e disegnare con la Penna e la Matita dal cursore;
   - in Video sentire luce e colore prima e dopo;
3. **Descrizioni senza intelligenza artificiale.** Le descrizioni misurano pixel e suono: dicono luce, colori, zone, scene e pause, ma non riconoscono persone o oggetti.
4. **Lingua e piattaforme.** L'interfaccia è solo in italiano. Sono supportati solo Chrome ed Edge recenti su computer.

## Segnalazioni

Se qualcosa non si usa con la tecnologia che usi, segnalalo con il modulo **[Problema di accessibilità](https://github.com/svitaTLCO/tassello/issues/new?template=accessibilita.yml)**. Un problema di accessibilità per noi è un difetto da correggere, non un miglioramento da valutare, e queste segnalazioni hanno la precedenza.

Tassello è un progetto libero e volontario, non un servizio pubblico: questa dichiarazione segue la forma delle dichiarazioni di accessibilità europee per chiarezza, non per un obbligo di legge.

## In English

This statement covers Tassello Ufficio 1.12.1, Tassello Media 1.19.0, Tassello Grafica 1.4.8, the website and the verification page, used with recent Chrome or Edge on a computer (tested on Windows). The app interface is in Italian. Written on 29 October 2026, updated on 16 November 2026, and updated with every release.

**Status: partially conformant with WCAG 2.2 level AA.** An evaluation with axe-core 4.14 and custom checks on about 1,000 states of the seven apps and the website (four themes and forced colours, repeated after fixes), real-browser tests that read the exact screen reader announcements, and a task-by-task analysis of visual work found no remaining A or AA failures except the known limitations below. NVDA 2026.2 has been tested on Windows 11 in Chrome across about 45 surfaces of the three apps, driving the interface with keys sent to the document and reading the speech log in full: that says what NVDA announces, not whether pacing is comfortable. On 16 November 2026 NVDA 2026.2 was used on Windows 11 in Chrome to test the written measures in Impagina (`metà`, `1/2`, `50%`, `2 colonne`, `+12`): it announces the resolved value («Titolo: x 540 px (metà)»), warns when the frame leaves the margins, reads the specific message when a measure is not understood, and reads the «Metti sotto…», «Stessa misura…» and «Distanza da…» commands with their result. Enter now applies a field as well as moving away, and confirms dialogs when focus is on a drop-down list. On the same day we tested recording in Audio: NVDA reads the new options, «Prova il livello» announces the three-second test and the suggested gain («Sei 7 dB troppo alto: abbassa di 7 dB»), and «Tempo e livello» reports level and peak. The level pulses are sound, not speech: they say whether the level is too high or too low without interrupting the sentence, and they fall silent while the metronome plays. Also on 16 November we tested the flash check on a fixture with a full-screen flash, one on the right half and one red: NVDA reads three items, each with time, zone («su tutto lo schermo», «nella metà destra») and area percentage, plus the «Vai» and «Mostra dove» buttons. The box on the preview is for sighted users; without sight, the zone is in words.

JAWS, Narrator, VoiceOver and TalkBack have not been tested, and no evaluation with people has been done yet.

**Known limitations:** NVDA has been tested automatically on Windows 11 by reading its speech log; JAWS, Narrator, VoiceOver and TalkBack are still to be confirmed; some visual tasks are still hard without sight (following a cut-out edge in Immagini, exploring a drawing with a cursor in Disegno, colour changes before and after in Video); descriptions measure pixels and sound and do not recognise people or objects; only recent Chrome and Edge on computers are supported.

**What we ask the community:** try the three apps with your own screen reader and keyboard (JAWS and Narrator on Windows, VoiceOver on macOS and iOS, TalkBack on Android), following the [testing guide](PROVA-ACCESSIBILITA.md); report what is not announced, where focus moves badly and which descriptions are not enough, giving app, version, browser, screen reader, steps and expected result, through the [Accessibility problem form](https://github.com/svitaTLCO/tassello/issues/new?template=accessibilita.yml).

**Feedback:** use the [Accessibility problem form](https://github.com/svitaTLCO/tassello/issues/new?template=accessibilita.yml). Accessibility problems are treated as bugs and come first.
