/*
 * File:      stampa-addetti.ts
 * Percorso:  src/features/stampe/stampa-addetti.ts
 * Data creaz: 22/11/2026
 * Revisioni:
 *   rev 1 — 22/11/2026 — Due viste esclusive per le carte di squadra: «Tutti gli addetti» (l'intera squadra nominata) e
 *            «Richiedono formazione» (scaduti + chi ha l'incarico ma non ha il corso, «Manca»).
 *   rev 3 — 22/11/2026 — diagnosiAddetti: per ogni addetto le righe e il motivo per cui richiede (o no) la formazione (pannello «Controllo»).
 *   rev 2 — 22/11/2026 — Le viste mostrano TUTTE le righe di ogni lavoratore scelto (es. «Manca corso base» + aggiornamento); i numeri contano lavoratori distinti.
 *
 * Regole:
 * - Un lavoratore «richiede formazione» se almeno una sua riga del gruppo è «Scaduto» oppure «Manca»
 *   (anche «Manca corso base»: aggiornamento svolto ma corso base assente). Gli «In scadenza» NON richiedono formazione.
 * - Le due viste mostrano tutte le righe dei lavoratori scelti; i numeri dei pulsanti sono lavoratori distinti.
 * Funzioni pure, senza dipendenze dall'interfaccia.
 */
import type { RigaStampa, StatoValidita } from "./stampa-tipi";
import { dataIt } from "./stampa-formati";

export type VistaAddetti = "tutti" | "formazione";

export const ETICHETTA_VISTA_ADDETTI: Record<VistaAddetti, string> = {
  tutti: "Tutti gli addetti",
  formazione: "Richiedono formazione",
};

/** Urgenza dello stato: più basso = più urgente. */
const URGENZA: Record<StatoValidita, number> = { manca: 0, scaduto: 1, in_scadenza: 2, valido: 3, senza_scadenza: 4 };

/** Vero se tra le righe di un lavoratore c'è un «Scaduto» o un «Manca». */
export function richiedeFormazione(righe: Pick<RigaStampa, "stato">[]): boolean {
  return righe.some((r) => r.stato === "manca" || r.stato === "scaduto");
}

/** La riga che rappresenta il lavoratore: stato più urgente; a parità, il corso più recente. */
export function rigaRappresentativa(righe: RigaStampa[]): RigaStampa {
  return [...righe].sort((a, b) => URGENZA[a.stato] - URGENZA[b.stato] || b.dataCorso.localeCompare(a.dataCorso))[0]!;
}

function perLavoratore(righe: RigaStampa[]): RigaStampa[][] {
  const mappa = new Map<string, RigaStampa[]>();
  for (const r of righe) {
    const g = mappa.get(r.dipendenteId);
    if (g) g.push(r);
    else mappa.set(r.dipendenteId, [r]);
  }
  return [...mappa.values()];
}

/** Righe della vista scelta: tutte le righe dei lavoratori che ne fanno parte, nell'ordine originale. */
export function righePerVistaAddetti(righe: RigaStampa[], vista: VistaAddetti): RigaStampa[] {
  if (vista === "tutti") return righe;
  const ammessi = new Set<string>();
  for (const gruppo of perLavoratore(righe)) if (richiedeFormazione(gruppo)) ammessi.add(gruppo[0]!.dipendenteId);
  return righe.filter((r) => ammessi.has(r.dipendenteId));
}

/** Numeri dei due pulsanti (lavoratori distinti). */
export function contaVistaAddetti(righe: RigaStampa[]): Record<VistaAddetti, number> {
  const gruppi = perLavoratore(righe);
  return { tutti: gruppi.length, formazione: gruppi.filter(richiedeFormazione).length };
}

export type DiagnosiAddetto = {
  dipendenteId: string;
  lavoratore: string;
  richiede: boolean;
  /** Una voce per riga: corso, stato, data corso e scadenza. */
  righe: { corso: string; stato: StatoValidita; dataCorso: string; scadenza: string }[];
  motivo: string;
};

/** Sequenza di controllo: per ogni addetto, perché richiede (o no) la formazione. Ordinata per cognome. */
export function diagnosiAddetti(righe: RigaStampa[]): DiagnosiAddetto[] {
  return perLavoratore(righe)
    .map((g): DiagnosiAddetto => {
      const motivi: string[] = [];
      for (const r of g) {
        if (r.stato === "manca") motivi.push(r.testoManca ?? "Manca il corso");
        else if (r.stato === "scaduto") motivi.push(`Scaduto il ${dataIt(r.scadenza ?? "")} (${r.codice || r.corso} del ${dataIt(r.dataCorso)})`);
      }
      return {
        dipendenteId: g[0]!.dipendenteId,
        lavoratore: `${g[0]!.cognome} ${g[0]!.nome}`.trim(),
        richiede: motivi.length > 0,
        righe: g.map((r) => ({ corso: r.codice || r.corso, stato: r.stato, dataCorso: r.dataCorso ? dataIt(r.dataCorso) : "—", scadenza: r.scadenza ? dataIt(r.scadenza) : "—" })),
        motivo: motivi.length ? motivi.join("; ") : "Corso in regola",
      };
    })
    .sort((a, b) => a.lavoratore.localeCompare(b.lavoratore, "it"));
}
