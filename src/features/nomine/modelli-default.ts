/*
 * File:      modelli-default.ts
 * Percorso:  src/features/nomine/modelli-default.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Testi di partenza delle nomine, ricavati dalle lettere del Liceo «G. Aselli» 2026-2027.
 *            Nome dell'istituto, luogo, data, protocollo e firmatario sono segnaposto: cambiando ditta cambiano da soli.
 *            Le righe numerate si numerano da sole (la numerazione ripetuta nei PDF originali è stata sistemata).
 */
import type { ModelloNomina, TipoNomina } from "./tipi";

const ART_43 =
  "Si evidenzia che a norma dell’articolo 43 comma 3, Lei non può, se non per giustificato motivo, rifiutare la designazione (in tal caso la motivazione dovrà essere comunicata per iscritto) e che l’incarico avrà durata fino a revoca.";
const ART_37 =
  "Vi comunichiamo inoltre che, al fine di adempiere al Vostro incarico, a norma dell’art. 37 del D.Lgs. n. 81/2008, riceverete un’adeguata e specifica formazione e un aggiornamento periodico in ordine ai propri compiti in materia di salute e sicurezza sul lavoro.";
const ART_37_LEI =
  "Le comunichiamo inoltre che, al fine di adempiere al Suo incarico, a norma dell’art. 37 del D.Lgs. n. 81/2008, riceverete un’adeguata e specifica formazione e un aggiornamento periodico in ordine ai propri compiti in materia di salute e sicurezza sul lavoro.";
const SALUTI = "Distinti saluti.";
const NOTA_FIRMA =
  "f.to Digitalmente\n“Firma autografa omessa ai sensi dell’art. 3 del D. Lgs. n. 39/1993”.";

const INTRO_ART_18 = (cosa: string, designato = "è stato designato") =>
  `Con la presente Le comunico che, in base all’art. 18, c. 1, lett. b) e art. 43 comma 1 lett. b) del D. L.gs 9 aprile 2008, n° 81, ${designato}, previa consultazione con il Rappresentante dei Lavoratori per la sicurezza, quale lavoratore incaricato ${cosa}.\n\nTale attività sarà prestata presso {{istituto}}, conformemente alla Sua formazione e alle disposizioni e istruzioni impartite dal Piano di emergenza.\n\nDi seguito si elencano i principali compiti:`;

const RISERVATEZZA =
  "Riservatezza: è necessario mantenere sempre e comunque la massima riservatezza su tutti i dati, i fatti e le notizie acquisite nell’ambito lavorativo, ed è necessario mantenere una condotta equipollente al segreto professionale e al segreto d’ufficio, che si estende anche e soprattutto all’esterno dell’Istituto, anche dopo la cessazione del rapporto lavorativo; si ricorda che la violazione del segreto d’ufficio è punibile con la reclusione fino a tre anni e con l’obbligo, ai sensi dell’art. 2050 del Codice Civile, di risarcire il danno eventualmente causato come conseguenza della violazione del segreto d’ufficio e più in generale come conseguenza del trattamento;";

export const MODELLI_DEFAULT: Record<TipoNomina, ModelloNomina> = {
  "primo-soccorso": {
    tipo: "primo-soccorso",
    titolo: "DESIGNAZIONE DEI LAVORATORI INCARICATI DELL’ATTUAZIONE DEL PRIMO SOCCORSO",
    oggetto: "Nomina addetti all’attuazione del PRIMO SOCCORSO ( Art. 18 del D.Lgs. 81/08)",
    introduzione: INTRO_ART_18("dell’attuazione delle misure di primo soccorso dell' Istituto"),
    corpo: [
      "Portarsi immediatamente sul luogo in cui è stata segnalata l’emergenza;",
      "accertarsi delle condizioni di salute della persona infortunata;",
      "indossare i dispositivi di protezione individuale;",
      "eseguire i primi interventi conformemente alla formazione ricevuta allontanando le persone non interessate;",
      "segnalare l’infortunio al Coordinatore delle emergenze (in segreteria);",
      "se necessario contattare i soccorsi sanitari esterni direttamente o attraverso il Coordinatore delle emergenze.",
      "attendere con l’infortunato l’arrivo dei soccorsi esterni.",
      "Se è necessario accompagnare l’infortunato al pronto soccorso ed attendere l’arrivo dei famigliari.",
      "sorvegliare quotidianamente nella rispettiva zona di competenza che le disposizione e i cartelli destinati al primo soccorso siano posizionati correttamente e perfettamente visibili.",
      "sorvegliare quotidianamente che l'attrezzatura destinata all'uso durante le fasi di primo soccorso sia posizionata correttamente, perfettamente funzionante e fruibile.",
      "che il materiale contenuto nelle cassette di primo soccorso non sia scaduto o mancante.",
      "coordinamento della squadra di primo soccorso.",
    ].join("\n"),
    chiusura: [ART_43, ART_37, SALUTI].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "Per presa visione",
    formazione: "ADDETTO AL PRIMO SOCCORSO",
  },

  antincendio: {
    tipo: "antincendio",
    titolo:
      "DESIGNAZIONE DEI LAVORATORI INCARICATI DELL’ATTUAZIONE DELLE MISURE DI PREVENZIONE INCENDI, LOTTA ANTINCENDIO.",
    oggetto:
      "Nomina addetti all’attuazione PREVENZIONE INCENDI, LOTTA ANTINCENDIO ( Art. 18 del D.Lgs. 81/08)",
    introduzione: INTRO_ART_18(
      "delle misure di prevenzione incendi, lotta antincendio, dell' Istituto",
    ),
    corpo: [
      "portarsi rapidamente sul luogo dell’emergenza, segnalando tempestivamente (sistema porta a porta) lo stato di pericolo alle persone presenti nei locali ubicati nelle vicinanze della fonte di pericolo;",
      "prestare il primo soccorso agli infortunati;",
      "mettere in azione gli estintori in caso di incendio;",
      "segnalare o fa segnalare l’emergenza (se necessario) a tutta la scuola con il sistema di allarme;",
      "su indicazione del coordinatore dell’emergenza o in sua assenza allertare i Vigili del Fuoco (115) e/o Pronto Soccorso (118);",
      "controllare (dopo essersi disposti in punti strategici per il controllo della evacuazione delle classi) che il personale attui l’evacuazione nel rispetto di quanto stabilito dal piano di emergenza;",
      "ispezionare, se le condizioni ambientali lo consentono, i locali di piano (raggiungendo p. es. i locali tecnici defilati, i servizi igienici, ecc. oppure eventuali prestatori d’opera occasionali) prima di abbandonare la sezione di edificio di propria competenza, controllando che l’area sia stata interamente evacuata, chiudendo le porte lasciate aperte;",
      "disattivare gli impianti, in particolare i quadri elettrici",
      "coadiuvare il responsabile dell’area di raccolta nella verifica delle presenze nel punto esterno di raccolta.",
      "sorvegliare quotidianamente nella rispettiva zona di competenza che le disposizione e i cartelli destinati all'ANTINCENDIO ed EVACUAZIONE siano posizionati correttamente e perfettamente visibili.",
      "sorvegliare quotidianamente che l'attrezzatura destinata all'uso durante le fasi di LOTTA ANTINCENDIO sia posizionata correttamente, perfettamente funzionante e fruibile.",
      "che il materiale contenuto nelle cassette ANTINCENDIO non sia scaduto o mancante.",
      "coordinamento della squadra antincendio",
    ].join("\n"),
    chiusura: [ART_43, ART_37, SALUTI].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "Per presa visione",
    formazione: "ADDETTO ALL'ANTINCENDIO",
  },

  evacuazione: {
    tipo: "evacuazione",
    titolo: "DESIGNAZIONE DEI LAVORATORI INCARICATI DELL’ATTUAZIONE DELL’EVACUAZIONE",
    oggetto: "Nomina addetti all’attuazione dell’evacuazione ( Art. 18 del D.Lgs. 81/08)",
    introduzione: INTRO_ART_18("dell’attuazione dell'evacuazione dell' Istituto"),
    corpo: [
      "portarsi rapidamente sul luogo dell’emergenza, segnalando tempestivamente (sistema porta a porta) lo stato di pericolo alle persone presenti nei locali ubicati nelle vicinanze della fonte di pericolo;",
      "segnalare o fa segnalare l’emergenza (se necessario) a tutta la scuola con il sistema di allarme;",
      "su indicazione del coordinatore dell’emergenza o in sua assenza allertare il (112);",
      "controllare (dopo essersi disposti in punti strategici per il controllo della evacuazione delle classi) che il personale attui l’evacuazione nel rispetto di quanto stabilito dal piano di emergenza;",
      "ispezionare, se le condizioni ambientali lo consentono, i locali di piano (raggiungendo p. es. i locali tecnici defilati, i servizi igienici, ecc. oppure eventuali prestatori d’opera occasionali) prima di abbandonare la sezione di edificio di propria competenza, controllando che l’area sia stata interamente evacuata, chiudendo le porte lasciate aperte;",
      "disattivare gli impianti, in particolare i quadri elettrici.",
      "coadiuvare il responsabile dell’area di raccolta nella verifica delle presenze nel punto esterno di raccolta come da Piano di emergenza.",
      "eseguire i compiti indicati nel piano di evacuazione.",
      "sorvegliare quotidianamente nella rispettiva zona di competenza che le disposizione e i cartelli destinati all'evacuazione siano posizionati correttamente e perfettamente visibili.",
      "sorvegliare quotidianamente che l'attrezzatura destinata all'uso durante le fasi di evacuazione sia posizionata correttamente, perfettamente funzionante e fruibile.",
      "che il materiale contenuto nelle cassette per l'evacuazione sia completo e funzionante.",
      "coordinamento della squadra di evacuazione.",
    ].join("\n"),
    chiusura: [ART_43, ART_37, SALUTI].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "Per accettazione",
    formazione: "ADDETTO ALL'EVACUAZIONE",
  },

  "registro-antincendio": {
    tipo: "registro-antincendio",
    titolo: "DESIGNAZIONE DEI LAVORATORI INCARICATI IN QUALITA' GESTIONE DEL REGISTRO ANTINCENDIO",
    oggetto: "Nomina INCARICATO ALLA GESTIONE DEL REGISTRO ANTINCENDIO",
    introduzione:
      "Con la presente Le comunico che, è stato/a designato/a, alla funzione di INCARICATO ALLA GESTIONE DEL REGISTRO ANTINCENDIO in base al D. L.gs 9 aprile 2008, n° 81,\n\nL'incarico in questione comporterà, da parte Sua, l'assolvimento degli obblighi di cui al D.Lgs. 81/08.\n\nL’incaricato è tenuto a svolgere con continuità, precisione e senso di responsabilità le seguenti attività:",
    corpo: [
      "# 1. Custodia e aggiornamento del registro:",
      "> Conservare il registro dei presidi antincendio in luogo sicuro e accessibile, garantendone l’integrità, la disponibilità per le verifiche interne ed esterne, e la continuità della compilazione.",
      "# 2. Annotazione delle attività di sorveglianza",
      "> Registrare puntualmente le verifiche visive e funzionali dei presidi antincendio (estintori, idranti, porte REI, segnaletica, ecc.), indicando la data, l’esito, le eventuali anomalie riscontrate e il nominativo dell’operatore che ha effettuato il controllo.",
      "> Le annotazioni devono rispettare la periodicità prevista dal piano di sorveglianza e seguire la struttura del registro in uso.",
      "# 3. Documentazione degli interventi di manutenzione ordinaria e straordinaria",
      "> Inserire nel registro tutte le attività di manutenzione eseguite da ditte esterne o personale interno, specificando:",
      "- la tipologia dell’intervento (es. ricarica estintori, sostituzione, collaudo, riparazione);",
      "- la data di esecuzione;",
      "- il soggetto esecutore (nome della ditta o del tecnico);",
      "- eventuali note tecniche o allegati (es. rapporti di intervento, certificazioni).",
      "# 4. Promozione della compilazione da parte delle squadre coinvolte",
      "> Ricordare periodicamente ai referenti delle squadre interne (es. collaboratori scolastici, addetti antincendio, manutentori) l’obbligo di compilare i report di controllo previsti dal registro, favorendo una cultura della sicurezza documentata e condivisa.",
      "> Stimolare la partecipazione attiva e la puntualità nella registrazione delle attività svolte.",
      "# 5. Monitoraggio delle scadenze e supporto al datore di lavoro",
      "> Segnalare tempestivamente al datore di lavoro o al RSPP eventuali presidi scaduti, anomalie non risolte, interventi urgenti da pianificare o documentazione mancante.",
      "> Collaborare alla programmazione degli interventi futuri e alla verifica della conformità normativa.",
      "# 6. Verifica della coerenza tra registro e realtà operativa",
      "> Effettuare controlli incrociati tra quanto riportato nel registro e lo stato effettivo dei presidi presenti in sede, segnalando eventuali discrepanze o necessità di aggiornamento.",
      "# 7. Supporto in caso di ispezioni o audit",
      "> Rendere disponibile il registro agli organi di vigilanza (Vigili del Fuoco, ATS, RSPP, consulenti esterni), fornendo chiarimenti sulle annotazioni e collaborando alla ricostruzione delle attività svolte.",
      "# 8. Riservatezza e responsabilità documentale",
      "> Garantire la riservatezza delle informazioni contenute nel registro e la correttezza formale delle annotazioni, evitando cancellature, sovrascritture o modifiche non tracciate.",
    ].join("\n"),
    chiusura: [
      "La presente nomina decorre dalla data odierna e resta valida, salvo revoca o sostituzione.",
      SALUTI,
    ].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "Firma",
    formazione: "",
  },

  dpi: {
    tipo: "dpi",
    titolo:
      "DESIGNAZIONE DEI LAVORATORI INCARICATI IN QUALITA' DI DISTRIBUZIONE E CUSTODIA DPI (Dispositivi di protezione individuale)",
    oggetto:
      "Nomina INCARICATO ALLA DISTRIBUZIONE E CUSTODIA DEI DPI (dispositivi di protezione individuale)",
    introduzione:
      "Con la presente Le comunico che, è stato/a designato/a, alla funzione di INCARICATO ALLA DISTRIBUZIONE E CUSTODIA DEI DPI in base al D. L.gs 9 aprile 2008, n° 81,\n\nL'incarico in questione comporterà, da parte Sua, l'assolvimento degli obblighi di cui al D.Lgs. 81/08.\n\nDi seguito si elencano i principali obblighi:",
    corpo: [
      "Gestire la fornitura, la distribuzione e la custodia dei DPI all'interno dell’Istituto Scolastico: questo ruolo è particolarmente importante per garantire la sicurezza dei lavoratori e la prevenzione di incidenti sul lavoro.",
      "Identificare con certezza il soggetto interessato al quale i DPI devono essere consegnati in base alla funzione lavorativa;",
      "Verificare ed accertare eventuali situazioni di fragilità del soggetto interessato, che richiedano la consegna di DPI differenti da quelli previsti dalla dotazione standard prevista dall’Istituto;",
      "Annotare su apposito registro i seguenti dati:",
      "> a. nome e cognome del soggetto interessato",
      "> b. data di consegna dei DPI",
      "> c. DPI consegnati",
      "> d. firma di chi consegna i DPI",
      "> e. firma di chi riceve i DPI",
      "> f. eventuali note.",
      "Custodire in sicurezza il Registro della consegna dei DPI;",
      "Acquisizione dei DPI: l'incaricato si occupa dell'acquisizione dei DPI necessari (promuovendo e/o attivando la procedura di acquisto), in base alle specifiche dell’Istituto Scolastico e alle normative di legge, verificando la loro conformità alle norme di sicurezza e assicurandosi che siano disponibili in quantità sufficiente per il personale.",
      "Pianificazione delle attività: l'incaricato alla distribuzione e custodia dei DPI deve pianificare le attività relative alla gestione dei DPI, in modo da garantire che i lavoratori dispongano dei dispositivi necessari per svolgere il proprio lavoro in modo sicuro.",
      "Conservazione dei DPI: l'incaricato deve censire e conservare i DPI in modo corretto, verificandone la corretta manutenzione e il rinnovo, quando necessario. Inoltre, l'incaricato deve verificare che i DPI non siano danneggiati o scaduti controllando la loro integrità, sostituendoli quando necessario e che siano prontamente disponibili per il personale.",
      "Distribuzione dei DPI: l'incaricato deve distribuire i DPI ai lavoratori, verificando che siano correttamente utilizzati e che siano disponibili in quantità sufficiente per ogni dipendente in base alle loro necessità e alle loro mansioni.",
      "Coordinamento con il medico competente: l'incaricato deve coordinarsi con il medico competente dell'organizzazione per valutare l'efficacia dei DPI e per individuare eventuali situazioni di rischio che richiedano l'adozione di ulteriori misure di protezione.",
      "Addestramento: l'incaricato fornisce ai lavoratori le informazioni e le istruzioni necessarie per utilizzare correttamente i DPI, promuovendo l'uso consapevole dei dispositivi di protezione.",
      "Monitoraggio: l'incaricato monitora l'uso dei DPI dell’Istituto Scolastico, verificando che vengano utilizzati correttamente e adottando eventuali misure correttive in caso di violazione delle norme di sicurezza relative all’uso improprio dei DPI avvisando prontamente DS, DSGA e RSPP.",
      "Verifica dell'efficacia dei DPI: l'incaricato deve monitorare l'efficacia dei DPI, verificando che siano in grado di proteggere i lavoratori dai rischi sul lavoro e intervenendo, se necessario, per adottare misure correttive.",
      "Conservazione: la documentazione dei DPI deve essere conservata in modo sicuro e accessibile, in modo da poter essere facilmente trovata in caso di emergenza sia in cartaceo che raccolte in files digitali.",
      "Aggiornamento: in caso di DPI più performanti e di nuova produzione si informa il Datore di Lavoro per una eventuale surroga.",
      "Condivisione: la documentazione dei DPI deve essere condivisa con i lavoratori che ne hanno bisogno. Inoltre, è importante che la documentazione dei DPI sia disponibile per le autorità competenti, in caso di emergenze o ispezioni.",
      "Formazione: chi gestisce la conservazione dei DPI deve assicurarsi che le persone che li utilizzano siano adeguatamente formate per comprendere le informazioni fornite e le precauzioni di sicurezza da adottare. La formazione dovrebbe includere come accedere alla documentazione dei DPI, come leggerla e come utilizzare le informazioni contenute.",
      RISERVATEZZA,
      "In caso di dubbio contattare il Dirigente Scolastico o il DSGA;",
    ].join("\n"),
    chiusura: [
      "In generale, l'incaricato alla distribuzione e custodia dei DPI (Dispositivi di Protezione Individuale) ha il compito di gestire la fornitura, la distribuzione e la custodia dei DPI all'interno dell’Istituto Scolastico. Questo ruolo è particolarmente importante per garantire la sicurezza dei lavoratori e la prevenzione di incidenti sul lavoro.",
      "La preghiamo di restituirci il presente atto, da Lei firmato per ricevuta, presa visione ed accettazione dei compiti e funzioni dell'incaricato alla distribuzione e custodia dei DPI.",
      ART_37_LEI,
      SALUTI,
    ].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "L'Incaricato della distribuzione dei DPI — Firma",
    formazione: "",
  },

  sds: {
    tipo: "sds",
    titolo:
      "DESIGNAZIONE DELL'INCARICATO/A ALLA DISTRIBUZIONE E CUSTODIA DELLE SCHEDE DI SICUREZZA.",
    oggetto: "NOMINA INCARICATO/A ALLA DISTRIBUZIONE E CUSTODIA DELLE SCHEDE DI SICUREZZA.",
    introduzione:
      "Con la presente Le comunico che, è stato/a designato/a, alla funzione di INCARICATO/A ALLA DISTRIBUZIONE E CUSTODIA DELLE SCHEDE DI SICUREZZA in base al D. L.gs 9 aprile 2008, n° 81.\n\nL'incarico in questione comporterà, da parte Sua, l'assolvimento degli obblighi di cui al D.Lgs. 81/08.\n\nL'incaricato alla distribuzione e della custodia delle schede di sicurezza ha il compito di gestire la fornitura, la distribuzione e la custodia delle schede di sicurezza all'interno dell’Istituto Scolastico. Questo ruolo è particolarmente importante per garantire la sicurezza dei lavoratori e la prevenzione di incidenti sul lavoro.\n\nDi seguito si elencano i principali obblighi:",
    corpo: [
      "Identificare con certezza il soggetto interessato a ricevere le schede di sicurezza che devono essere consegnate in base alla funzione lavorativa;",
      "Verificare ed accertare eventuali situazioni di fragilità del soggetto interessato;",
      "Annotare su apposito registro i seguenti dati:",
      "> a. nome e cognome del soggetto interessato",
      "> b. data di consegna delle schede di sicurezza",
      "> c. schede di sicurezza consegnate",
      "> d. firma di chi consegna le schede di sicurezza",
      "> e. firma di chi riceve le schede di sicurezza",
      "> f. eventuali note.",
      "Custodire in sicurezza il Registro della consegna delle schede di sicurezza;",
      "Custodire in sicurezza il Registro delle schede di sicurezza;",
      "Acquisizione delle schede di sicurezza: l'incaricato si occupa dell'acquisizione delle schede di sicurezza necessarie (attivando la procedura di acquisto), in base alle specifiche dell’Istituto Scolastico e alle normative di legge, verificando la loro conformità alle norme di sicurezza e assicurandosi che siano disponibili in quantità sufficiente per il personale.",
      "Pianificazione delle attività: l'incaricato alla distribuzione delle schede di sicurezza deve pianificare le attività relative alla gestione delle schede di sicurezza, in modo da garantire che i lavoratori dispongano delle schede di sicurezza necessarie per svolgere il proprio lavoro in modo sicuro.",
      "Addestramento: l'incaricato fornisce ai lavoratori le informazioni e le istruzioni necessarie per utilizzare correttamente le schede di sicurezza, promuovendo l'uso consapevole dei prodotti chimici.",
      "Monitoraggio: l'incaricato monitora l'uso delle schede di sicurezza dell’Istituto Scolastico, verificando che vengano utilizzate correttamente e adottando eventuali misure correttive in caso di violazione delle norme di sicurezza relative all’uso improprio dei prodotti chimici avvisando prontamente DS, DSGA e RSPP.",
      "Conservazione: le schede di sicurezza devono essere conservate in modo sicuro e accessibile, in modo da poter essere facilmente trovate in caso di emergenza sia cartacee che raccolte in files digitali.",
      "Aggiornamento: le schede di sicurezza devono essere regolarmente aggiornate per riflettere le ultime informazioni sul prodotto o sulla sostanza che descrivono. Questo può includere informazioni su pericoli emergenti, modifiche alla composizione del prodotto o informazioni aggiuntive sulla sicurezza.",
      "Condivisione: le schede di sicurezza devono essere condivise con le persone che ne hanno bisogno, come i lavoratori che manipolano il prodotto o la sostanza descritta. Inoltre, è importante che le schede di sicurezza siano disponibili per le autorità competenti, in caso di emergenze o ispezioni.",
      "Formazione: chi gestisce la conservazione delle schede di sicurezza deve assicurarsi che le persone che le utilizzano siano adeguatamente formate per comprendere le informazioni fornite e le precauzioni di sicurezza da adottare. La formazione dovrebbe includere come accedere alle schede di sicurezza, come leggerle e come utilizzare le informazioni contenute.",
      RISERVATEZZA,
    ].join("\n"),
    chiusura: [
      "In generale, l'incaricato alla distribuzione delle schede di sicurezza ha il compito di gestire la fornitura, la distribuzione delle stesse all'interno dell’Istituto Scolastico. Questo ruolo è particolarmente importante per garantire la sicurezza dei lavoratori e la prevenzione di incidenti sul lavoro.",
      "La preghiamo di restituirci il presente atto, da Lei firmato per ricevuta, per presa visione ed accettazione dei compiti e funzioni dell'incaricato alla custodia e distribuzione delle schede di sicurezza.",
      ART_37_LEI,
      SALUTI,
    ].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma:
      "Il responsabile della custodia e distribuzione delle schede di sicurezza — Firma",
    formazione: "",
  },

  dae: {
    tipo: "dae",
    titolo: "DESIGNAZIONE DEI LAVORATORI INCARICATI ALL'USO DEL DEFIBRILLATORE",
    oggetto: "Nomina addetti ALL'USO DEL DEFIBRILLATORE",
    introduzione: [
      "Con la presente Le comunico che, in base all’art. 18, c. 1, lett. b) e art. 43 comma 1 lett. b) del D. L.gs 9 aprile 2008, n° 81, e dell’art. 2, comma 1, lettera b) del D.L.vo 9 aprile 2008, n° 81 e s.m.i. è stato designato, previa consultazione con il Rappresentante dei Lavoratori per la sicurezza, quale lavoratore incaricato dell’attuazione delle misure di primo soccorso dell' Istituto.",
      "VERIFICATO che la collocazione dei DAE presso il complesso scolastico di competenza della scrivente Istituzione ne garantisce la piena disponibilità e la facilità di accesso, oltre la presenza del cartello di segnalazione del posto in cui sono posizionati i defibrillatori;",
      "Tale attività sarà prestata presso {{istituto}}, conformemente alla Sua formazione e alle disposizioni e istruzioni impartite dal Piano di emergenza.",
      "Di seguito si elencano i principali compiti:",
    ].join("\n\n"),
    corpo: [
      "# 1. Controlli e manutenzione giornaliera:",
      "- Assenza di segnali di malfunzionamento (es. spia rossa, allarme sonoro);",
      "- Presenza di spia lampeggiante verde;",
      "# 2. Controlli e manutenzione settimanali:",
      "- Verifica a vista dell'assenza di sporco o di contaminazione dell'unità e degli accessori. In tal caso provvedere alla pulizia del dispositivo e degli accessori;",
      "- Verifica a vista dell'assenza di danneggiamenti dell'unità e degli accessori. In tal caso informare immediatamente il Datore di lavoro per l'invio del dispositivo in assistenza;",
      "- Controllo della scadenza delle batterie e degli elettrodi. In caso di superamento della data di scadenza, informare immediatamente il Datore di lavoro per la sollecita sostituzione.",
      "# 3. Controlli e manutenzione mensili:",
      "- Esecuzione autotest manuale;",
      "- Controllo della disponibilità di pacchi batteria e di elettrodi di scorta. In caso negativo, informare immediatamente il Datore di lavoro per la reintegrazione;",
      "# Controllo della presenza di:",
      "- almeno n. 2 pocket mask;",
      "- forbici taglia abiti;",
      "- almeno n. 2 rasoi;",
      "- almeno n. 5 confezioni di garze non sterili;",
      "- almeno n. 3 confezioni di guanti monouso.",
      "# In caso di soccorso compito dell’Addetto all’uso del defibrillatore sarà di:",
      "- attuare le misure di soccorso in conformità alla formazione ricevuta come da attestato di formazione",
    ].join("\n"),
    chiusura: [
      "Si ricorda che nell’ambito delle attribuzioni conferite, i componenti del Servizio Gestione Emergenze, opereranno nel rispetto della vigente normativa, in particolare, le SS.LL. sono tenute al segreto, in ordine alle situazioni di cui vengano a conoscenza nell'esercizio delle funzioni svolte.",
      ART_43,
      ART_37,
      SALUTI,
    ].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "Per presa visione",
    formazione: "ADDETTO AL PRIMO SOCCORSO",
  },

  preposto: {
    tipo: "preposto",
    titolo: "DESIGNAZIONE DEI LAVORATORI INCARICATI IN QUALITA' DI PREPOSTI",
    oggetto: "Nomina del Preposto alla sicurezza ( Art. 19 del D.Lgs. 81/08)",
    introduzione:
      "Con la presente Le comunico che, in base all’art. 19 del D. L.gs 9 aprile 2008, n° 81, è stato designato, alla funzione di PREPOSTO.\n\nL'incarico in questione comporterà, da parte Sua, l'assolvimento degli obblighi di cui al D.Lgs. 81/08.\n\nDi seguito si elencano i principali obblighi:",
    corpo: [
      "sovrintendere e vigilare sulla osservanza da parte dei singoli lavoratori dei loro obblighi di legge, nonché delle disposizioni aziendali in materia di salute e sicurezza sul lavoro e di uso dei mezzi di protezione collettivi e dei dispositivi di protezione individuale messi a loro disposizione e, in caso di persistenza della inosservanza, informare i loro superiori diretti;",
      "verificare affinché soltanto i lavoratori che hanno ricevuto adeguate istruzioni accedano alle zone che li espongono ad un rischio grave e specifico;",
      "richiedere l’osservanza delle misure per il controllo delle situazioni di rischio in caso di emergenza e dare istruzioni affinché i lavoratori, in caso di pericolo grave, immediato e inevitabile, abbandonino il posto di lavoro o la zona pericolosa;",
      "informare il più presto possibile i lavoratori esposti al rischio di un pericolo grave e immediato circa il rischio stesso e le disposizioni prese o da prendere in materia di protezione;",
      "astenersi, salvo eccezioni debitamente motivate, dal richiedere ai lavoratori di riprendere la loro attività in una situazione di lavoro in cui persiste un pericolo grave ed immediato;",
      "segnalare tempestivamente al datore di lavoro o al dirigente sia le deficienze dei mezzi e delle attrezzature di lavoro e dei dispositivi di protezione individuale, sia ogni altra condizione di pericolo che si verifichi durante il lavoro, delle quali venga a conoscenza sulla base della formazione ricevuta;",
      "frequentare appositi corsi di formazione secondo quanto previsto dall’articolo 3",
    ].join("\n"),
    chiusura: [ART_37, SALUTI].join("\n\n"),
    nota_firma: NOTA_FIRMA,
    etichetta_firma: "Per presa visione",
    formazione: "PREPOSTO",
  },
};

export function modelloDefault(tipo: TipoNomina): ModelloNomina {
  return { ...MODELLI_DEFAULT[tipo] };
}
