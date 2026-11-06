/*
 * File:      analisi-elenco.ts
 * Percorso:  src/features/dipendenti/import-elenco/analisi-elenco.ts
 * Creato:    03/11/2026
 * Analizza le righe di un elenco Word/Excel (Nominativo, CF, Funzione) e propone
 * per ciascun codice fiscale: cessazione, profilo ATA, classe di concorso (Docente),
 * o nuovo ingresso. Logica pura, senza accesso al database.
 * Revisioni:
 *   rev 1 — 03/11/2026 14:30 — Prima stesura.
 *   rev 2 — 04/11/2026 10:55 — Catalogo profili ATA (CS, AA, AT, DSGA), tipo predefinito ATA/Docente e rimozione falsi positivi per città.
 *   rev 3 — 05/11/2026 21:30 — Nuova modalità «solo nuovi» (analizzaSoloNuovi): per ogni codice fiscale nuovo / già presente in forza /
 *            già presente cessato, con luogo e data di nascita, reparto dal file e testi in MAIUSCOLO; controllo di coerenza
 *            tra data di nascita e codice fiscale. La modalità di aggiornamento resta invariata.
 */
import { maiuscolo } from "@/lib/testo-maiuscolo";
import { analizzaCodiceFiscale, normalizzaOmocodia } from "../codice-fiscale/controllo-cf";

export type RigaGrezza = {
  nominativo: string;
  cf: string;
  funzione: string;
  /** Presenti solo se il file ha le colonne separate. */
  cognome?: string;
  nome?: string;
  luogoNascita?: string;
  /** Data ISO AAAA-MM-GG, vuota se assente o non riconosciuta. */
  dataNascita?: string;
};

export type TipoProposta = "cessazione" | "docente" | "ata" | "da_verificare";

export const PROFILI_ATA = [
  { codice: "CS", nome: "Collaboratore scolastico" },
  { codice: "AA", nome: "Assistente amministrativo" },
  { codice: "AT", nome: "Assistente tecnico" },
  { codice: "DSGA", nome: "Direttore dei servizi generali e amministrativi" },
] as const;

export type ProfiloAta = (typeof PROFILI_ATA)[number]["nome"];

export type Proposta = {
  riga: RigaGrezza;
  cf: string;
  cognome: string;
  nome: string;
  tipo: TipoProposta;
  /** id del dipendente già presente, null = nuovo ingresso */
  dipendenteId: string | null;
  classe: string | null;
  materia: string | null;
  sottorepartoAta: string | null;
  nota: string;
};

const CF_RE = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;

export function normalizzaCf(v: string): string {
  return (v ?? "").replace(/\s+/g, "").toUpperCase();
}

export function cfValido(cf: string): boolean {
  return CF_RE.test(cf);
}

/** Data fine servizio proposta: 31/08 dell'anno corrente (formato ISO). */
export function dataFineServizioDefault(oggi = new Date()): string {
  return `${oggi.getFullYear()}-08-31`;
}

/** "AUGELLO Fabio" → cognome AUGELLO, nome Fabio. Tutto maiuscolo: prima parola = cognome. */
export function separaNominativo(n: string): { cognome: string; nome: string } {
  const parti = n.trim().split(/\s+/).filter(Boolean);
  if (parti.length === 0) return { cognome: "", nome: "" };
  const maiuscole = parti.filter((p) => p === p.toUpperCase() && /[A-Z]/.test(p));
  if (maiuscole.length > 0 && maiuscole.length < parti.length) {
    return {
      cognome: maiuscole.join(" "),
      nome: parti.filter((p) => !maiuscole.includes(p)).join(" "),
    };
  }
  return { cognome: parti[0] ?? "", nome: parti.slice(1).join(" ") };
}

const REGEX_ATA: { re: RegExp; sotto: ProfiloAta }[] = [
  { re: /\bD\.?S\.?G\.?A\.?\b|DIRETTORE\s+(DEI\s+)?SERVIZI/, sotto: "Direttore dei servizi generali e amministrativi" },
  { re: /COLL(\.|ABORATORE)?\s*SCOL|\bC\.?S\.?\b/, sotto: "Collaboratore scolastico" },
  { re: /ASS(\.|ISTENTE)?\s*AMM|\bA\.?A\.?\b/, sotto: "Assistente amministrativo" },
  { re: /ASS(\.|ISTENTE)?\s*TEC|\bA\.?T\.?\b/, sotto: "Assistente tecnico" },
];

/** Riconosce la dicitura di profilo ATA dal testo, oppure restituisce null. */
export function trovaProfiloAta(testo: string): ProfiloAta | null {
  const t = testo.toUpperCase();
  const trovato = REGEX_ATA.find((a) => a.re.test(t));
  return trovato ? trovato.sotto : null;
}

/** Cerca nel testo un codice classe esistente, senza mai crearne di nuovi. */
export function trovaClasse(testo: string, codici: string[]): { classe: string; resto: string } | null {
  const set = new Set(codici.map((c) => c.toUpperCase()));
  const t = testo.toUpperCase();
  const compatto = t.replace(/[.\s]/g, "");
  if (/^IRC\b|^I\.R\.C/.test(t) || compatto.startsWith("IRC")) {
    if (set.has("IRC")) return { classe: "IRC", resto: "Religione cattolica" };
  }
  const m = t.match(/^\s*([A-Z]{1,2})\s*-?\s*(\d{1,3}|[A-Z]{2})\b/);
  if (!m) return null;
  const lettere = m[1] ?? "";
  const corpo = m[2] ?? "";
  const varianti = new Set<string>([lettere + corpo]);
  if (/^\d+$/.test(corpo)) {
    const n = String(Number(corpo));
    varianti.add(lettere + n);
    varianti.add(lettere + n.padStart(2, "0"));
    varianti.add(lettere + n.padStart(3, "0"));
  }
  for (const v of varianti) {
    if (set.has(v)) {
      const resto = testo.slice(m[0].length).replace(/^[\s\-–]+/, "").trim();
      return { classe: v, resto };
    }
  }
  return null;
}

export function analizzaRighe(
  righe: RigaGrezza[],
  esistenti: { id: string; codice_fiscale: string }[],
  codiciClasse: string[],
  tipoPredefinito: "ata" | "docente" | null = null,
  profiloAtaDefault: ProfiloAta = "Collaboratore scolastico",
): Proposta[] {
  const perCf = new Map(esistenti.map((d) => [normalizzaCf(d.codice_fiscale), d.id]));
  const out: Proposta[] = [];

  for (const riga of righe) {
    const cf = normalizzaCf(riga.cf);
    if (!cf) continue;
    // Con colonne separate nel file si usano cognome e nome così come sono; altrimenti si deduce dal nominativo.
    const { cognome, nome } =
      riga.cognome !== undefined && riga.nome !== undefined
        ? { cognome: maiuscolo(riga.cognome), nome: maiuscolo(riga.nome) }
        : separaNominativo(riga.nominativo);
    const funzione = riga.funzione.replace(/\u00a0/g, " ").trim();
    const F = funzione.toUpperCase();

    const base: Proposta = {
      riga,
      cf,
      cognome,
      nome,
      tipo: "da_verificare",
      dipendenteId: perCf.get(cf) ?? null,
      classe: null,
      materia: null,
      sottorepartoAta: null,
      nota: "",
    };

    if (!cfValido(cf)) {
      base.nota = "Codice fiscale non valido";
    }

    if (/NON\s+PI[UÙ]\s+IN\s+SERVIZIO|CESSAT/.test(F)) {
      base.tipo = "cessazione";
    } else if (tipoPredefinito === "ata") {
      base.tipo = "ata";
      const riconosciuto = trovaProfiloAta(funzione);
      base.sottorepartoAta = riconosciuto || profiloAtaDefault;
    } else if (tipoPredefinito === "docente") {
      base.tipo = "docente";
      const cl = trovaClasse(funzione, codiciClasse);
      if (cl) {
        base.classe = cl.classe;
        base.materia = cl.resto || null;
      } else if (funzione && repartoDaTesto(funzione) === "Docente") {
        // «docenti» indica il reparto, non una classe di concorso
        base.nota = "Scegli la classe di concorso";
      } else if (funzione) {
        base.nota = `Classe "${funzione}" non trovata: sceglila a mano`;
      }
    } else if (funzione) {
      const ata = trovaProfiloAta(funzione);
      const cl = ata ? null : trovaClasse(funzione, codiciClasse);
      if (ata) {
        base.tipo = "ata";
        base.sottorepartoAta = ata;
      } else if (cl) {
        base.tipo = "docente";
        base.classe = cl.classe;
        base.materia = cl.resto || null;
      } else {
        base.tipo = "ata";
        base.sottorepartoAta = profiloAtaDefault;
      }
    } else {
      base.tipo = "ata";
      base.sottorepartoAta = profiloAtaDefault;
    }

    out.push(base);
  }

  return out;
}

/* ------------------------------------------------------------------ */
/* Modalità «solo nuovi»                                               */
/* ------------------------------------------------------------------ */

export type RepartoImport = "Docente" | "ATA";

export type CategoriaNuovo = "nuovo" | "presente_in_forza" | "presente_cessato" | "non_valido" | "doppione";

export type EsistenteCf = {
  id: string;
  codice_fiscale: string;
  stato_lavoratore?: string | null;
};

export type RigaNuovo = {
  riga: RigaGrezza;
  cf: string;
  cognome: string;
  nome: string;
  luogoNascita: string;
  dataNascita: string;
  reparto: RepartoImport;
  categoria: CategoriaNuovo;
  /** id del lavoratore già presente (null per i nuovi). */
  dipendenteId: string | null;
  avvisi: string[];
};

/** Riconosce il reparto da un testo libero («docenti», «ATA», «collaboratore scolastico»…). */
export function repartoDaTesto(testo: string): RepartoImport | null {
  const t = (testo ?? "").toUpperCase();
  if (!t.trim()) return null;
  if (/DOCENT|INSEGNANT|PROFESSOR/.test(t)) return "Docente";
  if (/\bATA\b|COLLAB|ASSIST|DSGA|AMMINISTRAT|TECNIC|SEGRETERIA|BIDELL/.test(t)) return "ATA";
  return null;
}

const MESI_CF = "ABCDEHLMPRST";

/**
 * Confronta la data di nascita con quella scritta nel codice fiscale (anno a due cifre, mese, giorno).
 * Restituisce un avviso, oppure null se coincidono o se manca la data.
 */
export function incoerenzaCfData(cf: string, dataIso: string): string | null {
  if (!dataIso || !cfValido(cf)) return null;
  const n = normalizzaOmocodia(cf);
  const mese = MESI_CF.indexOf(cf.charAt(8)) + 1;
  let giorno = Number(n.slice(9, 11));
  if (giorno > 40) giorno -= 40;
  const [a = "", m = "", g = ""] = dataIso.split("-");
  if (a.slice(2) !== n.slice(6, 8) || Number(m) !== mese || Number(g) !== giorno) {
    return "La data di nascita non coincide con quella del codice fiscale";
  }
  return null;
}

/**
 * Per ogni riga del file stabilisce se il lavoratore è nuovo, già presente in forza o già presente cessato.
 * Cognome, nome e luogo di nascita escono sempre in MAIUSCOLO. Logica pura, senza database.
 */
export function analizzaSoloNuovi(
  righe: RigaGrezza[],
  esistenti: EsistenteCf[],
  repartoPredefinito: RepartoImport,
): RigaNuovo[] {
  const perCf = new Map(esistenti.map((d) => [normalizzaCf(d.codice_fiscale), d]));
  const visti = new Set<string>();
  const out: RigaNuovo[] = [];

  for (const riga of righe) {
    const cf = normalizzaCf(riga.cf);
    if (!cf) continue;

    const separati = riga.cognome !== undefined && riga.nome !== undefined;
    const { cognome, nome } = separati
      ? { cognome: riga.cognome as string, nome: riga.nome as string }
      : separaNominativo(riga.nominativo);

    const avvisi: string[] = [];
    const dataNascita = riga.dataNascita ?? "";
    const luogoNascita = maiuscolo(riga.luogoNascita);
    const gia = perCf.get(cf);

    let categoria: CategoriaNuovo;
    if (!cfValido(cf)) {
      categoria = "non_valido";
      avvisi.push("Codice fiscale non valido");
    } else if (visti.has(cf)) {
      categoria = "doppione";
      avvisi.push("Codice fiscale già presente più volte nel file");
    } else if (gia) {
      categoria = gia.stato_lavoratore === "cessato" ? "presente_cessato" : "presente_in_forza";
    } else {
      categoria = "nuovo";
    }
    if (cfValido(cf)) visti.add(cf);

    if (categoria === "nuovo") {
      const esitoCf = analizzaCodiceFiscale(cf);
      if (!esitoCf.valido) avvisi.push(`Codice fiscale da verificare: ${esitoCf.problemi.join("; ")}`);
      const incoerenza = incoerenzaCfData(cf, dataNascita);
      if (incoerenza) avvisi.push(incoerenza);
      if (!dataNascita) avvisi.push("Data di nascita mancante o non riconosciuta");
      if (!luogoNascita) avvisi.push("Luogo di nascita mancante");
    }

    out.push({
      riga,
      cf,
      cognome: maiuscolo(cognome),
      nome: maiuscolo(nome),
      luogoNascita,
      dataNascita,
      reparto: repartoDaTesto(riga.funzione) ?? repartoPredefinito,
      categoria,
      dipendenteId: gia?.id ?? null,
      avvisi,
    });
  }
  return out;
}
