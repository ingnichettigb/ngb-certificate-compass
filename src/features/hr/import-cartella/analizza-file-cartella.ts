/*
 * File:          analizza-file-cartella.ts
 * Percorso:      src/features/hr/import-cartella/analizza-file-cartella.ts
 * Data creazione: 2026-11-07
 * Revisioni:
 *   - Rev 1 (2026-11-07 11:57): Parsing dei nomi file, estrazione codice fiscale, abbinamento
 *     anagrafico per cognome/nome e riconoscimento automatico del corso e della data.
 */
import type { Dipendente, TipoCorso } from "@/lib/api";

export type FileAttestatoScansionato = {
  id: string;
  nomeFile: string;
  percorsoRelativo: string;
  file: File;
  dimensione: number;
  dipendenteId: string | null;
  codiceFiscale: string;
  nomeLavoratore: string;
  statoAbbinamento: "univoco" | "ambiguo" | "non_trovato";
  tipoCorsoId: string;
  dataCorso: string;
  oreDichiarate: number | null;
  selezionato: boolean;
};

const ESTENSIONI_VALIDE = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

export function haEstensioneValida(nome: string): boolean {
  const lower = nome.toLowerCase();
  return ESTENSIONI_VALIDE.some((ext) => lower.endsWith(ext));
}

function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estrae eventuale codice fiscale (16 caratteri alfanumerici standard) dal nome del file. */
export function estraiCodiceFiscale(testo: string): string | null {
  const match = testo.toUpperCase().match(/\b[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]\b/);
  return match ? match[0] : null;
}

/** Tenta di estrarre una data dal nome file nei formati YYYY-MM-DD, DD-MM-YYYY o YYYYMMDD. */
export function estraiDataDalNome(testo: string): string | null {
  // 1. Formato YYYY-MM-DD oppure YYYY_MM_DD
  const mIso = testo.match(/\b(20[0-2][0-9])[-_.](0[1-9]|1[0-2])[-_.](0[1-9]|[12][0-9]|3[01])\b/);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;

  // 2. Formato DD-MM-YYYY oppure DD_MM_YYYY
  const mIta = testo.match(/\b(0[1-9]|[12][0-9]|3[01])[-_.](0[1-9]|1[0-2])[-_.](20[0-2][0-9])\b/);
  if (mIta) return `${mIta[3]}-${mIta[2]}-${mIta[1]}`;

  // 3. Formato compatto YYYYMMDD
  const mComp = testo.match(/\b(20[0-2][0-9])(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])\b/);
  if (mComp) return `${mComp[1]}-${mComp[2]}-${mComp[3]}`;

  return null;
}

/** Cerca di individuare il dipendente per CF o per somiglianza di Cognome e Nome. */
export function abbinaDipendente(
  nomeFile: string,
  dipendenti: Dipendente[],
): {
  dipendente: Dipendente | null;
  stato: "univoco" | "ambiguo" | "non_trovato";
} {
  const cf = estraiCodiceFiscale(nomeFile);
  if (cf) {
    const perCf = dipendenti.find((d) => d.codice_fiscale.toUpperCase() === cf);
    if (perCf) return { dipendente: perCf, stato: "univoco" };
  }

  const nomeFileNorm = normalizza(nomeFile);

  // Ricerca esatta: Cognome Nome o Nome Cognome entrambi presenti come parole
  const candidati = dipendenti.filter((d) => {
    const cogNorm = normalizza(d.cognome);
    const nomNorm = normalizza(d.nome);
    if (!cogNorm) return false;

    // Entrambi presenti
    const entrambi = nomeFileNorm.includes(cogNorm) && (!nomNorm || nomeFileNorm.includes(nomNorm));
    if (entrambi) return true;

    // Solo cognome se composto o molto specifico (almeno 5 caratteri)
    if (cogNorm.length >= 5 && nomeFileNorm.includes(cogNorm)) {
      return true;
    }
    return false;
  });

  if (candidati.length === 1) {
    return { dipendente: candidati[0] ?? null, stato: "univoco" };
  }
  if (candidati.length > 1) {
    // Prova a raffinare con il nome di battesimo
    const precisi = candidati.filter((d) => {
      const nomNorm = normalizza(d.nome);
      return nomNorm && nomeFileNorm.includes(nomNorm);
    });
    if (precisi.length === 1) {
      return { dipendente: precisi[0] ?? null, stato: "univoco" };
    }
    return { dipendente: candidati[0] ?? null, stato: "ambiguo" };
  }

  return { dipendente: null, stato: "non_trovato" };
}

/** Tenta di associare il corso in base al testo o codice presente nel nome file o percorso. */
export function abbinaTipoCorso(testoPercorso: string, corsi: TipoCorso[]): TipoCorso | null {
  const testoNorm = normalizza(testoPercorso);

  // 1. Corrispondenza codice corso esatto (es. PRP-BAS, SIC-GEN, ANT-L2, VFF, BLSD)
  for (const c of corsi) {
    if (c.codice) {
      const codNorm = normalizza(c.codice);
      if (codNorm && testoNorm.includes(codNorm)) return c;
    }
  }

  // 2. Corrispondenza parole chiave per i corsi principali
  const regoleKeywords: [RegExp, string][] = [
    [/prepost/i, "preposto"],
    [/antincend|vff|fuoco/i, "antincendio"],
    [/primo.*soccors|soccorrit/i, "primo soccorso"],
    [/defibril|dae|blsd/i, "defibrillatore"],
    [/rls|rappresentante.*lavoratori/i, "rls"],
    [/specific|rischio.*medio/i, "specifica"],
    [/general/i, "generale"],
    [/dirigent/i, "dirigente"],
    [/rspp/i, "rspp"],
    [/aspp/i, "aspp"],
  ];

  for (const [re, termine] of regoleKeywords) {
    if (re.test(testoPercorso)) {
      const matchCorso = corsi.find(
        (c) => normalizza(c.nome_corso).includes(termine) || (c.codice && normalizza(c.codice).includes(termine)),
      );
      if (matchCorso) return matchCorso;
    }
  }

  return null;
}
