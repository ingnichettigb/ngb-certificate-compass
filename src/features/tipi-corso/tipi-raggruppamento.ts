/*
 * File:           tipi-raggruppamento.ts
 * Percorso:       src/features/tipi-corso/tipi-raggruppamento.ts
 * Data creazione: 2026-10-26
 *
 * Revisioni:
 * - Rev 1: 2026-10-26 17:15 - Ordine argomenti, sfondi tenui e catalogo corsi protetti.
 * - Rev 2: 2026-10-27 20:55 - Evacuazione viola (più leggibile), Defibrillatore teal, protetti EME-PRO-02/EME-EAA-02.
 */

export type GruppoArgomento = {
  chiave: string;
  titolo: string;
  ordine: number;
  coloreSfondo: string;
  coloreTesto: string;
};

export const GRUPPI_ARGOMENTO: GruppoArgomento[] = [
  { chiave: "sicurezza-lavoratori", titolo: "Sicurezza lavoratori", ordine: 1, coloreSfondo: "bg-emerald-500/10 hover:bg-emerald-500/15", coloreTesto: "text-emerald-700 dark:text-emerald-300" },
  { chiave: "preposti", titolo: "Preposti", ordine: 2, coloreSfondo: "bg-amber-500/10 hover:bg-amber-500/15", coloreTesto: "text-amber-700 dark:text-amber-300" },
  { chiave: "evacuazione", titolo: "Evacuazione", ordine: 3, coloreSfondo: "bg-violet-500/15 hover:bg-violet-500/20", coloreTesto: "text-violet-700 dark:text-violet-300" },
  { chiave: "antincendio", titolo: "Antincendio", ordine: 4, coloreSfondo: "bg-rose-500/10 hover:bg-rose-500/15", coloreTesto: "text-rose-700 dark:text-rose-300" },
  { chiave: "primo-soccorso", titolo: "Primo soccorso", ordine: 5, coloreSfondo: "bg-sky-500/10 hover:bg-sky-500/15", coloreTesto: "text-sky-700 dark:text-sky-300" },
  { chiave: "defibrillatore", titolo: "Defibrillatore", ordine: 6, coloreSfondo: "bg-teal-500/15 hover:bg-teal-500/20", coloreTesto: "text-teal-700 dark:text-teal-300" },
  { chiave: "altro", titolo: "Altro", ordine: 7, coloreSfondo: "bg-slate-500/10 hover:bg-slate-500/15", coloreTesto: "text-slate-700 dark:text-slate-300" },
];

/** Codici dei corsi standard del programma: non modificabili né eliminabili. */
export const CODICI_STANDARD_PROTETTI = new Set<string>([
  "SIC-GEN-04", "SIC-SPE-04", "SIC-SPE-08", "SIC-SPE-12", "SIC-AGG-06",
  "PRP-BAS-12", "PRP-AGG-06", "EME-PRO-02", "EME-EVA-02", "EME-EAA-02",
  "ANT-L1B-04", "ANT-L1A-02", "ANT-L2B-08", "ANT-L2A-05",
  "VFF-FOR1-4", "VFF-FOR1A2", "VFF-FOR2-8", "VFF-FOR2A5", "VFF-FOR316", "VFF-FOR3A8",
  "PSO-GAB-16", "PSO-GAA-06", "PSO-BCB-12", "PSO-AGB-04", "PSO-AGA-04",
  "BLS-BAS-05", "BLS-AGG-02",
]);

export function assegnaGruppoArgomento(c: {
  macro_categoria?: string | null;
  codice?: string | null;
  nome_corso?: string | null;
}): GruppoArgomento {
  const cat = (c.macro_categoria ?? "").toLowerCase();
  const cod = (c.codice ?? "").toUpperCase();
  const nome = (c.nome_corso ?? "").toLowerCase();
  if (cat.includes("sicurezza") || cod.startsWith("SIC-")) return GRUPPI_ARGOMENTO[0]!;
  if (cat.includes("preposto") || cod.startsWith("PRP-") || nome.includes("preposto")) return GRUPPI_ARGOMENTO[1]!;
  if (cat.includes("evacuaz") || cat.includes("emergenz") || cod.startsWith("EME-") || nome.includes("evacuazione")) return GRUPPI_ARGOMENTO[2]!;
  if (cat.includes("antincendio") || cod.startsWith("ANT-") || cod.startsWith("VFF-") || nome.includes("vvff") || nome.includes("antincendio")) return GRUPPI_ARGOMENTO[3]!;
  if (cat.includes("primo soccorso") || cod.startsWith("PSO-") || nome.includes("primo soccorso")) return GRUPPI_ARGOMENTO[4]!;
  if (cat.includes("defibrillatore") || cod.startsWith("BLS-") || nome.includes("dae") || nome.includes("blsd")) return GRUPPI_ARGOMENTO[5]!;
  return GRUPPI_ARGOMENTO[6]!;
}

export function isCorsoProtetto(c: { codice?: string | null }): boolean {
  return Boolean(c.codice && CODICI_STANDARD_PROTETTI.has(c.codice.trim().toUpperCase()));
}
