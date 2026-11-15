/*
 * File:      definizioni.ts
 * Percorso:  src/features/tabelle-raccordo/definizioni.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Le 9 tabelle di raccordo (Impostazioni generali > Tabelle di raccordo): colonne, tabella del database e regole.
 *   rev 2 — 15/11/2026 11:56 — Rimossa colonna «fonte» dalla tabella 06 (rischio_ateco) e aggiornata descrizione normativa.
 *   rev 3 — 15/11/2026 12:45 — Rimosso gruppoSpunta da tabella 06 (è un catalogo consultativo con associazioni multiple derivate dalla Ditta).
 *   rev 4 — 15/11/2026 — Descrizione tabella 03 corretta (art. 47: fino a 15 RLS eletto/territoriale, 16-200 un RLS, 201-1.000 tre, oltre 1.000 sei; numero più alto tra dichiarati e in forza).
 *                        Descrizione tabella 07: l'indice INAIL si spunta a mano con «Applica», per ora non entra nel conteggio dei corsi.
 *
 * Ogni tabella è descritta qui; la pagina (TabellaRaccordo.tsx) è unica e generica. Le tabelle 03, 04 e 05 sono le righe di
 * «soglie_ditta» per ambito (nessuna copia dei dati). La colonna «applica» è la spunta manuale della riga da applicare.
 */
import { sb } from "@/lib/api/client";

export type TipoCampo = "testo" | "numero" | "bool" | "scelta";

export interface Colonna {
  chiave: string;
  etichetta: string;
  tipo?: TipoCampo;
  opzioni?: string[];
  obbligatorio?: boolean;
  /** Larghezza minima della colonna (classe Tailwind, es. «min-w-[12rem]»). */
  larghezza?: string;
  /** Solo lettura nel modulo di modifica. */
  soloLettura?: boolean;
}

export type Riga = Record<string, unknown> & { id: string };

export interface DefinizioneTabella {
  id: string;
  numero: string;
  titolo: string;
  /** Tabella del database; assente per la 09 (apre la tabella dei tipi di corso). */
  tabella?: string;
  descrizione: string;
  colonne: Colonna[];
  /** Valori fissi: filtrano la lettura e vengono messi nei nuovi record (es. l'ambito di soglie_ditta). */
  filtro?: Record<string, string | boolean>;
  /** Colonne di ordinamento dopo «ordine». */
  ordinaPer?: string[];
  /**
   * Spunta «Applica» esclusiva: una sola riga per gruppo. Elenco di colonne che formano il gruppo ([] = tutta la tabella).
   * Assente = spunte libere.
   */
  gruppoSpunta?: string[];
  predefiniti?: Record<string, unknown>;
  /** Blocco della cancellazione se il record è in uso (restituisce il messaggio di blocco). */
  controlloCancellazione?: (riga: Riga) => Promise<string | null>;
  /** Modifica i dati della riga prima di duplicarla (es. per togliere codici univoci). */
  alDuplicare?: (riga: Riga) => Record<string, unknown>;
  /** Documento PDF di riferimento da aprire con un clic in alto a destra. */
  documento?: { etichetta: string; url: string };
}

export const TABELLE_RACCORDO: DefinizioneTabella[] = [
  {
    id: "ruoli",
    numero: "01",
    titolo: "Ruoli di sicurezza",
    tabella: "ruoli_sicurezza",
    descrizione:
      "Ruoli della sicurezza (D.Lgs. 81/08): preposti, addetti antincendio, primo soccorso, RLS, dirigenti. La cancellazione è bloccata se il ruolo è assegnato a dei lavoratori.",
    colonne: [
      { chiave: "codice", etichetta: "Codice", obbligatorio: true },
      { chiave: "descrizione", etichetta: "Descrizione", obbligatorio: true, larghezza: "min-w-[18rem]" },
      { chiave: "categoria", etichetta: "Categoria", larghezza: "min-w-[12rem]" },
      {
        chiave: "n_assegnazioni",
        etichetta: "Assegnazioni",
        tipo: "numero",
        soloLettura: true,
      },
      { chiave: "attivo", etichetta: "Attivo", tipo: "bool" },
    ],
    predefiniti: { attivo: true },
    controlloCancellazione: async (riga) => {
      const { count, error } = await sb
        .from("dipendenti_ruoli")
        .select("id", { count: "exact", head: true })
        .eq("ruolo_id", riga.id)
        .eq("attivo", true);
      if (error) return "Impossibile verificare le assegnazioni del ruolo.";
      if ((count ?? 0) > 0) {
        return `Il ruolo è assegnato a ${count} ${count === 1 ? "lavoratore" : "lavoratori"}. Rimuovi prima le assegnazioni dalla finestra Dipendenti.`;
      }
      return null;
    },
    alDuplicare: (riga) => ({
      ...riga,
      codice: `${String(riga["codice"] ?? "")}-COPIA`,
      descrizione: `${String(riga["descrizione"] ?? "")} (copia)`,
      n_assegnazioni: 0,
    }),
  },
  {
    id: "regole-ruoli-corsi",
    numero: "02",
    titolo: "Regole ruoli e corsi",
    tabella: "regole_ruoli_corsi",
    descrizione:
      "Associazione tra ruoli della sicurezza e corsi obbligatori: indica se il corso è iniziale o di aggiornamento e quali parametri ditta lo attivano.",
    ordinaPer: ["ruolo_codice", "corso_codice"],
    colonne: [
      { chiave: "ruolo_codice", etichetta: "Codice ruolo", obbligatorio: true },
      { chiave: "corso_codice", etichetta: "Codice corso", obbligatorio: true },
      {
        chiave: "tipo_formazione",
        etichetta: "Tipo formazione",
        tipo: "scelta",
        opzioni: ["base", "aggiornamento", "entrambi"],
        obbligatorio: true,
      },
      { chiave: "condizione_ditta", etichetta: "Condizione ditta", larghezza: "min-w-[16rem]" },
      { chiave: "obbligatorio", etichetta: "Obbligatorio", tipo: "bool" },
      { chiave: "note", etichetta: "Note", larghezza: "min-w-[18rem]" },
    ],
    predefiniti: { tipo_formazione: "base", obbligatorio: true },
  },
  {
    id: "soglie-rls",
    numero: "03",
    titolo: "Soglie numero RLS",
    tabella: "soglie_ditta",
    filtro: { ambito: "rls" },
    descrizione:
      "Numero di RLS (art. 47 D.Lgs. 81/08) in base alla fascia di lavoratori: fino a 15 RLS eletto o territoriale, da 16 a 200 un RLS, da 201 a 1.000 tre RLS, oltre 1.000 sei RLS. Si usa il numero più alto tra lavoratori dichiarati e in forza nel programma: la riga della Ditta è evidenziata in giallo.",
    colonne: [
      { chiave: "da", etichetta: "Da lavoratori", tipo: "numero", obbligatorio: true },
      { chiave: "a", etichetta: "A lavoratori (vuoto = oltre)", tipo: "numero" },
      { chiave: "etichetta", etichetta: "Fascia", obbligatorio: true },
      { chiave: "esito", etichetta: "Numero RLS previsti", obbligatorio: true },
      { chiave: "note", etichetta: "Nota", larghezza: "min-w-[18rem]" },
      { chiave: "attiva", etichetta: "Attiva", tipo: "bool" },
    ],
    predefiniti: { attiva: true },
  },
  {
    id: "soglie-primo-soccorso",
    numero: "04",
    titolo: "Soglie primo soccorso",
    tabella: "soglie_ditta",
    filtro: { ambito: "primo_soccorso" },
    descrizione:
      "Classificazione aziendale per il primo soccorso (D.M. 388/2003): gruppo A (aziende ad alto rischio o oltre soglia), gruppi B e C.",
    colonne: [
      { chiave: "da", etichetta: "Da lavoratori", tipo: "numero", obbligatorio: true },
      { chiave: "a", etichetta: "A lavoratori (vuoto = oltre)", tipo: "numero" },
      { chiave: "etichetta", etichetta: "Fascia", obbligatorio: true },
      { chiave: "esito", etichetta: "Gruppo risultante", obbligatorio: true },
      { chiave: "note", etichetta: "Nota", larghezza: "min-w-[18rem]" },
      { chiave: "attiva", etichetta: "Attiva", tipo: "bool" },
    ],
    predefiniti: { attiva: true },
  },
  {
    id: "soglie-antincendio",
    numero: "05",
    titolo: "Soglie antincendio scuola",
    tabella: "soglie_ditta",
    filtro: { ambito: "antincendio_presenze" },
    descrizione:
      "Livello di rischio incendio per istituti scolastici (D.M. 26/08/1992 e D.M. 02/09/2021) in base alle presenze contemporanee massime: livello 1 (fino a 100), livello 2 (101-300), livello 3 (oltre 300).",
    colonne: [
      { chiave: "da", etichetta: "Da presenze", tipo: "numero", obbligatorio: true },
      { chiave: "a", etichetta: "A presenze (vuoto = oltre)", tipo: "numero" },
      { chiave: "etichetta", etichetta: "Tipo scuola / presenze", obbligatorio: true },
      {
        chiave: "esito",
        etichetta: "Livello antincendio risultante",
        obbligatorio: true,
      },
      { chiave: "note", etichetta: "Nota", larghezza: "min-w-[18rem]" },
      { chiave: "attiva", etichetta: "Attiva", tipo: "bool" },
    ],
    predefiniti: { attiva: true },
  },
  {
    id: "ateco",
    numero: "06",
    titolo: "Rischio per codice ATECO",
    tabella: "rischio_ateco",
    descrizione:
      "Catalogo normativo delle classi di rischio per divisione ATECO secondo l'Accordo Stato-Regioni (formazione specifica lavoratori). I codici associati alla Ditta sono evidenziati in giallo.",
    ordinaPer: ["codice"],
    colonne: [
      { chiave: "codice", etichetta: "Codice ATECO", obbligatorio: true },
      { chiave: "descrizione", etichetta: "Descrizione", larghezza: "min-w-[22rem]" },
      {
        chiave: "rischio",
        etichetta: "Rischio",
        tipo: "scelta",
        opzioni: ["basso", "medio", "alto"],
        obbligatorio: true,
      },
      { chiave: "versione_ateco", etichetta: "Versione ATECO", obbligatorio: true },
    ],
    predefiniti: { versione_ateco: "2007", rischio: "basso" },
  },
  {
    id: "primo-soccorso",
    numero: "07",
    titolo: "Gruppo di primo soccorso",
    tabella: "gruppi_primo_soccorso",
    descrizione:
      "Gruppo di primo soccorso (D.M. 388/2003) per numero di lavoratori e indice INAIL. Soglie da verificare sul testo del decreto. L'indice INAIL si sceglie a mano con «Applica» (per ora non entra nel conteggio dei corsi): la riga spuntata è in giallo, senza spunta il giallo è solo una proposta dal numero di lavoratori.",
    gruppoSpunta: [],
    colonne: [
      {
        chiave: "lavoratori",
        etichetta: "Lavoratori",
        obbligatorio: true,
        larghezza: "min-w-[14rem]",
      },
      {
        chiave: "indice_inail",
        etichetta: "Indice INAIL del gruppo di tariffa",
        obbligatorio: true,
        larghezza: "min-w-[14rem]",
      },
      {
        chiave: "gruppo",
        etichetta: "Gruppo",
        tipo: "scelta",
        opzioni: ["A", "B", "C"],
        obbligatorio: true,
      },
      { chiave: "nota", etichetta: "Nota", larghezza: "min-w-[18rem]" },
    ],
    predefiniti: { indice_inail: "qualsiasi", gruppo: "B" },
  },
  {
    id: "tariffa-inail",
    numero: "08",
    titolo: "Gruppi di tariffa INAIL",
    tabella: "gruppi_tariffa_inail",
    descrizione:
      "Voci della tariffa INAIL con tasso di premio e indice di inabilità permanente (da caricare). Il PDF dei premi 2019 è il documento fonte.",
    ordinaPer: ["gestione", "voce"],
    gruppoSpunta: [],
    documento: {
      etichetta: "Apri PDF fonte: Premi INAIL 2019",
      url: "/documenti/premi-inail-2019.pdf",
    },
    colonne: [
      {
        chiave: "gestione",
        etichetta: "Gestione",
        tipo: "scelta",
        opzioni: ["Industria", "Artigianato", "Terziario", "Altre attività"],
      },
      { chiave: "voce", etichetta: "Voce di tariffa", obbligatorio: true },
      { chiave: "attivita", etichetta: "Attività descritta", larghezza: "min-w-[20rem]" },
      {
        chiave: "tasso_medio",
        etichetta: "Tasso medio per mille",
        tipo: "numero",
        larghezza: "min-w-[12rem]",
      },
      {
        chiave: "indice_inabilita",
        etichetta: "Indice inabilità permanente",
        tipo: "numero",
        larghezza: "min-w-[14rem]",
      },
    ],
  },
  {
    id: "tipi-corso",
    numero: "09",
    titolo: "Tipi di corso (scheda Corsi)",
    descrizione:
      "La tabella completa dei corsi è consultabile e modificabile nella scheda «Corsi» qui accanto (catalogo con durate, validità in anni e categorie).",
    colonne: [],
  },
];
