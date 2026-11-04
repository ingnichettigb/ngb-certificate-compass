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
 */

export type RigaGrezza = { nominativo: string; cf: string; funzione: string };

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
    const { cognome, nome } = separaNominativo(riga.nominativo);
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
