/*
 * File:      stampa-gruppi.ts
 * Percorso:  src/features/stampe/stampa-gruppi.ts
 * Data creaz: 08/11/2026
 * Revisioni:
 *   rev 1 — 08/11/2026 — Raggruppamento dell'elenco lavoratori per reparto o per funzione di sicurezza (stampe predefinite 2 e 3).
 *   rev 3 — 09/11/2026 20:00 — Le righe dell'Organigramma portano la propria squadra: appartengono solo a quella.
 *   rev 2 — 08/11/2026 14:40 — Raggruppamento per Gruppi di sicurezza (Preposti, Antincendio, Primo soccorso, Defibrillatore, Evacuazione, Privacy, Sicurezza lavoratori) al posto delle singole funzioni, con filtro rapido e conteggi.
 */
import type { RigaStampa } from "./stampa-tipi";
import { raggruppa } from "./stampa-testo";

export type RaggruppaPer = "reparto" | "funzione";
export type GruppoStampa = { titolo: string; righe: RigaStampa[] };
export type InfoGruppo = { nome: string; conteggio: number };

const ORDINE_ALFABETICO = new Intl.Collator("it", { sensitivity: "base" });

/** Ordine standard canonico delle macro-aree della sicurezza per la barra e la stampa. */
export const ORDINE_MACRO_GRUPPI = [
  "Preposti",
  "Antincendio",
  "Primo soccorso",
  "Defibrillatore",
  "Evacuazione ed emergenze",
  "Privacy",
  "Sicurezza lavoratori",
] as const;

/**
 * Risolve la macro-categoria o il gruppo omogeneo partendo dal nome del ruolo
 * o dell'attestato di sicurezza.
 */
export function gruppoDiRuolo(nomeRuolo: string): string {
  const n = nomeRuolo.toLowerCase().trim();
  if (n.includes("preposto")) return "Preposti";
  if (n.includes("antincendio") || n.includes("vvff")) return "Antincendio";
  if (n.includes("primo soccorso")) return "Primo soccorso";
  if (n.includes("defibrillatore") || n.includes("blsd") || n.includes("dae")) return "Defibrillatore";
  if (n.includes("evacuaz") || n.includes("emergenz")) return "Evacuazione ed emergenze";
  if (n.includes("privac")) return "Privacy";
  if (n.includes("sicurezza") || n.includes("lavorator") || n.includes("aspp") || n.includes("dvr")) {
    return "Sicurezza lavoratori";
  }
  return "Altro";
}

/**
 * Ricava l'insieme univoco dei gruppi a cui appartiene un lavoratore,
 * valutando sia i suoi ruoli sia eventuali attestati registrati.
 */
export function gruppiLavoratore(r: RigaStampa): string[] {
  if (r.squadra) return [r.squadra];
  const gruppi = new Set<string>();
  for (const ruolo of r.ruoliElenco ?? []) {
    const g = gruppoDiRuolo(ruolo);
    if (g && g !== "Altro") gruppi.add(g);
  }
  // Se ha esplicitamente attestati di Privacy
  if (
    r.codice?.toUpperCase().startsWith("PRIV") ||
    r.corso?.toLowerCase().includes("privac") ||
    r.gruppo?.toLowerCase().includes("privac")
  ) {
    gruppi.add("Privacy");
  }
  return [...gruppi];
}

const NOME_REPARTO_PLURALE: Record<string, string> = { docente: "Docenti", ata: "ATA" };
const RANGO_REPARTO: Record<string, number> = { docente: 0, ata: 1 };

/**
 * Sezioni per reparto dei documenti di scadenza: prima i Docenti, poi gli ATA, poi gli altri reparti in ordine alfabetico.
 * Le righe di ogni sezione mantengono l'ordine con cui arrivano.
 */
export function sezioniPerReparto(righe: RigaStampa[]): GruppoStampa[] {
  const chiave = (r: RigaStampa) => (r.reparto ?? "").trim().toLowerCase();
  const ordinate = [...righe].sort((a, b) => {
    const ra = RANGO_REPARTO[chiave(a)] ?? 2;
    const rb = RANGO_REPARTO[chiave(b)] ?? 2;
    return ra - rb || (ra === 2 ? ORDINE_ALFABETICO.compare(a.reparto, b.reparto) : 0);
  });
  return raggruppa(ordinate, (r) => r.reparto).map(([reparto, rr]) => ({
    titolo: `${NOME_REPARTO_PLURALE[reparto.trim().toLowerCase()] ?? reparto} – ${new Set(rr.map((r) => r.dipendenteId)).size} lavoratori`,
    righe: rr,
  }));
}

/** Tiene solo i lavoratori che appartengono ad almeno un gruppo di sicurezza. */
export function conFunzione(righe: RigaStampa[]): RigaStampa[] {
  return righe.filter((r) => gruppiLavoratore(r).length > 0);
}

/**
 * Ricava l'elenco dei gruppi presenti nei lavoratori filtrati,
 * ordinati secondo la sequenza logica di riferimento, con il conteggio dei lavoratori per ciascuno.
 */
export function elencoGruppi(righe: RigaStampa[]): InfoGruppo[] {
  const conteggi = new Map<string, number>();
  for (const r of righe) {
    for (const g of new Set(gruppiLavoratore(r))) {
      conteggi.set(g, (conteggi.get(g) ?? 0) + 1);
    }
  }

  const risultato: InfoGruppo[] = [];
  // 1. Inserisce prima i gruppi nell'ordine canonico stabilito
  for (const g of ORDINE_MACRO_GRUPPI) {
    const c = conteggi.get(g);
    if (c && c > 0) {
      risultato.push({ nome: g, conteggio: c });
      conteggi.delete(g);
    }
  }
  // 2. Aggiunge eventuali altri gruppi residuali in ordine alfabetico
  const residuali = [...conteggi.entries()]
    .sort(([a], [b]) => ORDINE_ALFABETICO.compare(a, b))
    .map(([nome, conteggio]) => ({ nome, conteggio }));

  return [...risultato, ...residuali];
}

/**
 * Divide le righe in gruppi, ciascuno da stampare su una pagina nuova.
 * - reparto: un gruppo per reparto, in ordine alfabetico.
 * - funzione: un gruppo per macro-area di sicurezza (oppure solo quello scelto dal filtro pillola).
 */
export function gruppiLavoratori(righe: RigaStampa[], per: RaggruppaPer, soloGruppo?: string | null): GruppoStampa[] {
  if (per === "reparto") {
    const ordinate = [...righe].sort((a, b) => ORDINE_ALFABETICO.compare(a.reparto, b.reparto));
    return raggruppa(ordinate, (r) => r.reparto).map(([reparto, rr]) => ({
      titolo: `Reparto: ${reparto} – ${rr.length} lavoratori`,
      righe: rr,
    }));
  }

  // Se è selezionato un singolo gruppo tramite la pillola in alto
  if (soloGruppo) {
    const filtrate = righe.filter((r) => gruppiLavoratore(r).includes(soloGruppo));
    return [{ titolo: `Gruppo: ${soloGruppo} – ${filtrate.length} lavoratori`, righe: filtrate }];
  }

  const perGruppo = new Map<string, RigaStampa[]>();
  for (const r of righe) {
    for (const g of new Set(gruppiLavoratore(r))) {
      const lista = perGruppo.get(g) ?? [];
      lista.push(r);
      perGruppo.set(g, lista);
    }
  }

  const risultato: GruppoStampa[] = [];
  for (const g of ORDINE_MACRO_GRUPPI) {
    const rr = perGruppo.get(g);
    if (rr && rr.length > 0) {
      risultato.push({ titolo: `Gruppo: ${g} – ${rr.length} lavoratori`, righe: rr });
      perGruppo.delete(g);
    }
  }
  for (const [g, rr] of [...perGruppo.entries()].sort(([a], [b]) => ORDINE_ALFABETICO.compare(a, b))) {
    risultato.push({ titolo: `Gruppo: ${g} – ${rr.length} lavoratori`, righe: rr });
  }

  return risultato;
}
