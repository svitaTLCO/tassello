# Sicurezza

Tassello è fatto di file HTML singoli: chiunque può copiarli, modificarli e rimetterli in giro. Per questo la cosa più importante per la sicurezza di chi lo usa è riconoscere la copia ufficiale. Qui trovi come farlo, come segnalare una copia falsa e come segnalare un difetto di sicurezza nella copia ufficiale.

*In English: see [below](#in-english).*

## Le copie ufficiali

Le copie ufficiali si scaricano solo da due posti:

- il sito **[svitatlco.github.io/tassello](https://svitatlco.github.io/tassello/)**;
- le **[release di questo repository](https://github.com/svitaTLCO/tassello/releases)**.

La copia ufficiale **non** chiede password, account o pagamenti, **non** propone di scaricare aggiornamenti o altri programmi e **non** si collega a internet: lo vieta una regola di sicurezza del browser (Content Security Policy) scritta nel file. L'unica eccezione è la dettatura di Tassello Ufficio, che usa il servizio di riconoscimento vocale del browser.

Riceve correzioni solo l'ultima versione di ogni tassello, quella indicata come più recente nella pagina [Verifica una copia](https://svitatlco.github.io/tassello/verifica.html). Se hai una versione precedente, scarica di nuovo il file da uno dei due posti qui sopra; l'app installata dal sito si aggiorna da sola.

## Come riconoscere una copia falsa

Una copia è sospetta se:

- ti è arrivata per email, in chat, su una chiavetta o da un sito diverso da quelli ufficiali, anche da una persona di cui ti fidi;
- chiede password, un accesso, dati di pagamento o di scaricare qualcosa;
- carica immagini, caratteri o script da internet, o si comporta in modo diverso dal solito.

Per esserne sicuro:

1. Apri la pagina **[Verifica una copia](https://svitatlco.github.io/tassello/verifica.html)** e scegli il file: ti dice se è identico a una versione ufficiale. Il file non lascia il tuo computer.
2. Oppure calcola tu l'impronta SHA-256 e cercala in [`docs/versioni.json`](docs/versioni.json), [`docs/versioni-media.json`](docs/versioni-media.json) o [`docs/versioni-grafica.json`](docs/versioni-grafica.json). In Windows: `certutil -hashfile tassello-ufficio.html SHA256`; in macOS e Linux: `shasum -a 256 tassello-ufficio.html`.
3. Per i file delle release puoi controllare anche la firma di provenienza di GitHub: `gh attestation verify tassello-ufficio.html --repo svitaTLCO/tassello`.

Se la copia non è ufficiale: chiudila, cancellala e scarica di nuovo Tassello da un canale ufficiale. Se ci hai scritto una password o dati di pagamento, cambia subito quella password e avvisa la tua banca.

## Come segnalare una copia falsa

Usa il modulo **[Copia sospetta](https://github.com/svitaTLCO/tassello/issues/new?template=copia-sospetta.yml)**. La segnalazione è pubblica, quindi:

- **non allegare il file**: basta la sua impronta SHA-256, che la pagina Verifica ti mostra;
- **non incollare link cliccabili**: scrivi gli indirizzi con `hxxp` al posto di `http`, per esempio `hxxps://esempio[.]com`;
- **non scrivere dati personali**, né tuoi né di chi ti ha mandato la copia.

Se la copia coinvolge dati personali, o se ci hai già inserito password o dati di pagamento, usa invece la **[segnalazione privata](https://github.com/svitaTLCO/tassello/security/advisories/new)**: la vedono solo i responsabili del progetto.

## Come segnalare un difetto di sicurezza nella copia ufficiale

Un difetto di sicurezza si segnala **solo in privato**, con la **[segnalazione privata di GitHub](https://github.com/svitaTLCO/tassello/security/advisories/new)**, non con una segnalazione pubblica. Per esempio:

- un modo di aggirare la regola di sicurezza del file e far uscire dati verso internet;
- un documento (DOCX, XLSX, CSV, SVG, un progetto di Impagina o di Media, un feed) che, aperto in Tassello, esegue codice o legge altri dati;
- un problema nel sito, nella pagina Verifica, nell'app installabile o nella costruzione delle release.

Indica la versione (la trovi con Alt+Q, «Informazioni e limiti»), il browser, i passi per riprodurre il problema e, se puoi, un file di esempio senza dati personali. Rispondiamo appena possibile; la correzione esce come nuova versione, con la sua impronta negli elenchi delle versioni ufficiali, e la segnalazione diventa pubblica solo dopo.

Non sono difetti di sicurezza della copia ufficiale:

- una copia modificata da altri: è proprio il caso delle copie false, da segnalare come spiegato sopra;
- la dettatura di Tassello Ufficio, che manda l'audio al servizio del browser (Google in Chrome, Microsoft in Edge), come spiegato nel README;
- il comportamento di browser diversi da Chrome ed Edge recenti.

## In English

Tassello tools are single HTML files, so anyone can alter a copy and pass it around. Only download them from the [website](https://svitatlco.github.io/tassello/) or the [releases of this repository](https://github.com/svitaTLCO/tassello/releases). The official copy never asks for passwords, accounts or payments, never offers downloads and never connects to the internet (dictation in Tassello Ufficio uses the browser's speech service). Only the latest version of each tool receives fixes.

- **Check a copy** on the [verification page](https://svitatlco.github.io/tassello/verifica.html), or compare its SHA-256 with `docs/versioni*.json`, or run `gh attestation verify <file> --repo svitaTLCO/tassello` for release files.
- **Report a suspicious copy** with the [Suspicious copy form](https://github.com/svitaTLCO/tassello/issues/new?template=copia-sospetta.yml). It is public: do not attach the file (its SHA-256 is enough), write addresses as `hxxps://example[.]com` and leave out personal data. If personal data, passwords or payment details are involved, use [private reporting](https://github.com/svitaTLCO/tassello/security/advisories/new) instead.
- **Report a security vulnerability** in the official copy only through [private reporting](https://github.com/svitaTLCO/tassello/security/advisories/new), with the version, browser and steps to reproduce. Fixes ship as a new version with a new fingerprint; the report is made public afterwards.
