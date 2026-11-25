/*
 * File:      definizioni.ts
 * Percorso:  src/features/tabelle-raccordo/definizioni.ts
 * Data creaz: 14/11/2026
 * Revisioni:
 *   rev 1 — 14/11/2026 — Le 9 tabelle di raccordo (Impostazioni generali > Tabelle di raccordo): colonne, tabella del database e regole.
 *   rev 2 — 15/11/2026 11:45 — Tabella 06 (rischio_ateco): tolta la colonna «Fonte» (resta nel database, non si mostra né si esporta).
 *   rev 3 — 21/11/2026 — Punto di verità ruoli-corsi (Fase 3): colonne «riferimento» (si sceglie un ruolo o un corso, si salva il
 *            codice); 01: codice obbligatorio, maiuscolo e non più modificabile, «Richiede» è un ruolo, cancellazione bloccata se il ruolo
 *            ha regole nella 02 o è richiesto da altri ruoli; 02: ruolo per codice (ruolo_codice) e corsi scelti dal catalogo; dopo ogni
 *            salvataggio si aggiornano ruoli e regole usati da Matrice e Scadenze.
 *
 * Ogni tabella è descritta qui; la pagina (TabellaRaccordo.tsx) è unica e generica. Le tabelle 03, 04 e 05 sono le righe di
 * «soglie_ditta» per ambito (nessuna copia dei dati). La colonna «applica» è la spunta manuale della riga da applicare.
 */
import { sb } from "@/lib/api/client";
import { CHIAVE_RUOLI } from "@/lib/api/ruoli";
import { CHIAVE_REGOLE_RUOLO_CORSO } from "@/lib/api/regole-ruolo-corso";
import type { FonteRiferimento } from "./riferimenti";

export type TipoCampo = "testo" | "numero" | "bool" | "scelta" | "riferimento";

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
  /** Per il tipo «riferimento»: si sceglie un ruolo o un corso dall'elenco e si salva il suo CODICE. */
  riferimento?: FonteRiferimento;
  /** Una volta valorizzato non si cambia più (es. il codice di un ruolo: è la chiave stabile). */
  soloLetturaInModifica?: boolean;
  /** Testo libero che è un codice: si porta in maiuscolo e ammette solo lettere, numeri e il trattino (spazi e trattini bassi diventano trattini). */
  codice?: boolean;
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
  /** Altre letture (chiavi TanStack Query) da aggiornare dopo ogni modifica: dati usati da altre schermate. */
  chiaviCollegate?: readonly (readonly string[])[];
  /** Valori predefiniti di un nuovo record. */
  predefiniti?: Record<string, unknown>;
  documento?: { etichetta: string; url: string };
  /** Adatta la riga duplicata (es. nome univoco). */
  alDuplicare?: (riga: Riga) => Riga;
  /** Restituisce un messaggio se la riga non si può cancellare. */
  controlloCancellazione?: (riga: Riga) => Promise<string | null>;
}

export const TABELLE_RACCORDO: DefinizioneTabella[] = [
  {
    id: "ruoli",
    numero: "01",
    titolo: "Ruoli di sicurezza",
    tabella: "ruoli_sicurezza",
    descrizione:
      "Ruoli e incarichi del programma. Il codice è la chiave stabile per le regole (maiuscolo, con il trattino al posto degli spazi, non si cambia più); «Richiede» indica il ruolo necessario. Non si cancella un ruolo con assegnazioni, con regole nella 02 o richiesto da altri ruoli.",
    chiaviCollegate: [CHIAVE_RUOLI, CHIAVE_REGOLE_RUOLO_CORSO],
    ordinaPer: ["nome"],
    colonne: [
      {
        chiave: "codice",
        etichetta: "Codice",
        obbligatorio: true,
        codice: true,
        soloLetturaInModifica: true,
        larghezza: "min-w-[11rem]",
      },
      { chiave: "nome", etichetta: "Ruolo", obbligatorio: true, larghezza: "min-w-[16rem]" },
      {
        chiave: "tipo",
        etichetta: "Tipo",
        tipo: "scelta",
        opzioni: ["ruolo", "incarico"],
        obbligatorio: true,
      },
      {
        chiave: "richiede",
        etichetta: "Richiede",
        tipo: "riferimento",
        riferimento: "ruoli",
        larghezza: "min-w-[14rem]",
      },
      { chiave: "obbligatorio_tutti", etichetta: "Per tutti", tipo: "bool" },
      { chiave: "attivo", etichetta: "Attivo", tipo: "bool" },
    ],
    predefiniti: { tipo: "ruolo", obbligatorio_tutti: false, attivo: true },
    alDuplicare: (r) => ({ ...r, nome: `${String(r["nome"])} (copia)`, codice: null }),
    controlloCancellazione: async (r) => {
      const { count, error } = await sb
        .from("dipendenti_ruoli")
        .select("id", { count: "exact", head: true })
        .eq("ruolo_id", r.id);
      if (error)
        return `Controllo non riuscito: ${(error as { message?: string }).message ?? "errore"}`;
      if (count && count > 0)
        return `Il ruolo «${String(r["nome"])}» ha ${count} assegnazioni: cancellarlo le farebbe perdere. Disattivalo invece di cancellarlo.`;
      const codice = typeof r["codice"] === "string" ? r["codice"] : "";
      if (!codice) return null;
      const regole = await sb
        .from("regole_ruolo_corso")
        .select("id", { count: "exact", head: true })
        .eq("ruolo_codice", codice);
      if (regole.error)
        return `Controllo non riuscito: ${(regole.error as { message?: string }).message ?? "errore"}`;
      if (regole.count && regole.count > 0)
        return `Il ruolo «${String(r["nome"])}» ha ${regole.count} regole nella Tabella 02: cancellale prima o disattiva il ruolo.`;
      const richiesto = await sb
        .from("ruoli_sicurezza")
        .select("id", { count: "exact", head: true })
        .eq("richiede", codice);
      if (richiesto.error)
        return `Controllo non riuscito: ${(richiesto.error as { message?: string }).message ?? "errore"}`;
      return richiesto.count && richiesto.count > 0
        ? `Il ruolo «${String(r["nome"])}» è richiesto da ${richiesto.count} altri ruoli (colonna «Richiede»): cambia prima quelli.`
        : null;
    },
  },
  {
    id: "regole-corso",
    numero: "02",
    titolo: "Regole ruolo → corso",
    tabella: "regole_ruolo_corso",
    descrizione:
      "Quale corso (base e aggiornamento) corrisponde a ruolo e parametro: è l'unico punto che dice da quale ruolo dipende un corso. Ruolo e corsi si scelgono dall'elenco (si salvano i codici). Un corso che non compare qui non è obbligatorio per nessuno. La spunta è una sola per ogni coppia ruolo + parametro.",
    gruppoSpunta: ["ruolo_codice", "parametro"],
    chiaviCollegate: [CHIAVE_REGOLE_RUOLO_CORSO],
    colonne: [
      {
        chiave: "ruolo_codice",
        etichetta: "Ruolo",
        tipo: "riferimento",
        riferimento: "ruoli",
        obbligatorio: true,
        larghezza: "min-w-[16rem]",
      },
      {
        chiave: "parametro",
        etichetta: "Parametro",
        obbligatorio: true,
        larghezza: "min-w-[10rem]",
      },
      { chiave: "valore", etichetta: "Valore", obbligatorio: true },
      {
        chiave: "corso_base",
        etichetta: "Corso base",
        tipo: "riferimento",
        riferimento: "corsi",
        larghezza: "min-w-[18rem]",
      },
      {
        chiave: "corso_aggiornamento",
        etichetta: "Aggiornamento",
        tipo: "riferimento",
        riferimento: "corsi",
        larghezza: "min-w-[18rem]",
      },
    ],
    predefiniti: { parametro: "nessuno", valore: "—" },
    alDuplicare: (r) => ({ ...r, valore: `${String(r["valore"] ?? "—")} (copia)` }),
  },
  {
    id: "antincendio",
    numero: "03",
    titolo: "Presenze → livello antincendio",
    tabella: "soglie_ditta",
    filtro: { ambito: "antincendio_presenze" },
    descrizione:
      "Fasce di presenze contemporanee e livello antincendio. Dati di «soglie_ditta», ambito antincendio_presenze.",
    gruppoSpunta: [],
    colonne: [
      { chiave: "da", etichetta: "Da", tipo: "numero", obbligatorio: true },
      { chiave: "a", etichetta: "A", tipo: "numero" },
      { chiave: "esito", etichetta: "Livello", obbligatorio: true, larghezza: "min-w-[10rem]" },
      {
        chiave: "etichetta",
        etichetta: "Etichetta",
        obbligatorio: true,
        larghezza: "min-w-[16rem]",
      },
      { chiave: "note", etichetta: "Nota", larghezza: "min-w-[18rem]" },
      { chiave: "attiva", etichetta: "Attiva", tipo: "bool" },
    ],
    predefiniti: { attiva: true },
  },
  {
    id: "idoneita-vvf",
    numero: "04",
    titolo: "Presenze → idoneità tecnica VVF",
    tabella: "soglie_ditta",
    filtro: { ambito: "idoneita_tecnica_presenze" },
    descrizione:
      "Fasce di presenze e obbligo di idoneità tecnica dei Vigili del Fuoco. Dati di «soglie_ditta».",
    gruppoSpunta: [],
    colonne: [
      { chiave: "da", etichetta: "Da", tipo: "numero", obbligatorio: true },
      { chiave: "a", etichetta: "A", tipo: "numero" },
      { chiave: "esito", etichetta: "Esito", obbligatorio: true, larghezza: "min-w-[16rem]" },
      {
        chiave: "etichetta",
        etichetta: "Etichetta",
        obbligatorio: true,
        larghezza: "min-w-[16rem]",
      },
      { chiave: "note", etichetta: "Nota", larghezza: "min-w-[18rem]" },
      { chiave: "attiva", etichetta: "Attiva", tipo: "bool" },
    ],
    predefiniti: { attiva: true },
  },
  {
    id: "rls",
    numero: "05",
    titolo: "Lavoratori → numero di RLS",
    tabella: "soglie_ditta",
    filtro: { ambito: "rls" },
    descrizione: "Fasce di lavoratori e numero di RLS. Dati di «soglie_ditta», ambito rls.",
    gruppoSpunta: [],
    colonne: [
      { chiave: "da", etichetta: "Da", tipo: "numero", obbligatorio: true },
      { chiave: "a", etichetta: "A", tipo: "numero" },
      { chiave: "esito", etichetta: "Esito", obbligatorio: true, larghezza: "min-w-[16rem]" },
      {
        chiave: "etichetta",
        etichetta: "Etichetta",
        obbligatorio: true,
        larghezza: "min-w-[16rem]",
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
      "Classe di rischio per divisione ATECO. Fonte provvisoria: tabella Vega Formazione PS00007 rev 0.4 (ATECO 2007), non l'allegato ufficiale.",
    ordinaPer: ["codice"],
    gruppoSpunta: [],
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
      "Gruppo di primo soccorso (D.M. 388/2003) per numero di lavoratori e indice INAIL. Soglie da verificare sul testo del decreto.",
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
      { chiave: "voce", etichetta: "Voce", obbligatorio: true },
      { chiave: "descrizione", etichetta: "Descrizione", larghezza: "min-w-[22rem]" },
      { chiave: "tasso", etichetta: "Tasso", tipo: "numero" },
      { chiave: "indice_inabilita", etichetta: "Indice inabilità perm.", tipo: "numero" },
      { chiave: "anno", etichetta: "Anno", tipo: "numero" },
      { chiave: "oltre_4", etichetta: "Oltre 4", tipo: "bool" },
    ],
    predefiniti: { anno: 2019, oltre_4: false },
  },
  {
    id: "corsi",
    numero: "09",
    titolo: "Corsi",
    descrizione:
      "Tabella dei tipi di corso già presente nel programma (non duplicata): si apre con il pulsante.",
    colonne: [],
  },
];
