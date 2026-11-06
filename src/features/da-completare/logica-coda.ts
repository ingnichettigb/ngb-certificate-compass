/*
 * File:      logica-coda.ts
 * Percorso:  src/features/da-completare/logica-coda.ts
 * Creato:    06/11/2026
 * Regole pure della finestra «Da completare» (uno alla volta): quali dati bloccano il salvataggio,
 * come si riusa la fine contratto del record precedente, come si ordina la coda.
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import type { Dipendente } from "@/lib/api";

export type DatiForm = Omit<Dipendente, "id">;

/** Solo cognome, nome e codice fiscale bloccano il salvataggio: il resto si può completare dopo. */
export function erroreBlocco(form: Pick<DatiForm, "cognome" | "nome" | "codice_fiscale">): string | null {
  if (!form.cognome.trim() || !form.nome.trim() || !form.codice_fiscale.trim()) {
    return "Cognome, nome e codice fiscale sono obbligatori";
  }
  return null;
}

/**
 * Se è attiva l'opzione «usa la stessa fine contratto» e il lavoratore è a tempo determinato
 * senza scadenza, propone la scadenza ricordata dal record precedente. Non sovrascrive mai un dato già presente.
 */
export function precompilaFineContratto(form: DatiForm, riusa: boolean, ricordata: string): DatiForm {
  if (!riusa || !ricordata) return form;
  if (form.tipo_contratto !== "determinato" || form.data_fine_contratto) return form;
  return { ...form, data_fine_contratto: ricordata };
}

/** Coda in ordine alfabetico (cognome, poi nome). */
export function ordinaCoda<T extends Pick<Dipendente, "cognome" | "nome">>(lista: T[]): T[] {
  return [...lista].sort(
    (a, b) => a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it"),
  );
}
