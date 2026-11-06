/*
 * File:      anagrafica-completa.ts
 * Percorso:  src/features/dipendenti/anagrafica-completa.ts
 * Creato:    05/11/2026
 * Regola unica dei dati anagrafici mancanti di un lavoratore. La usano sia la stampa
 * «Anagrafica incompleta» sia la coda «Da completare» della pagina Dipendenti,
 * così i due elenchi non possono dare risultati diversi. Logica pura, senza database.
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura: spostata qui da stampe/dati-stampa.ts (nessun cambio di regola).
 */
import type { Dipendente } from "@/lib/api";

/** Campi anagrafici controllati dalla selezione «Anagrafica incompleta». */
export type CampoAnagrafica =
  | "cognome" | "nome" | "codice_fiscale" | "luogo_nascita" | "data_nascita" | "reparto" | "data_assunzione"
  | "sottoreparto" | "classe_concorso" | "materia" | "data_fine_contratto" | "data_cessazione";

export const ETICHETTA_CAMPO: Record<CampoAnagrafica, string> = {
  cognome: "cognome", nome: "nome", codice_fiscale: "codice fiscale", luogo_nascita: "luogo di nascita",
  data_nascita: "data di nascita", reparto: "reparto", data_assunzione: "data di assunzione",
  sottoreparto: "profilo ATA", classe_concorso: "classe di concorso", materia: "materia",
  data_fine_contratto: "data fine contratto", data_cessazione: "data di cessazione",
};

const vuoto = (v: string | null | undefined) => !v || !v.trim();

/**
 * Dati che mancano nell'anagrafica. Alcuni campi sono dovuti solo in certi casi:
 * profilo per ATA, classe e materia per Docente, fine contratto solo a tempo determinato,
 * cessazione solo per i cessati. L'email non è controllata.
 */
export function campiMancanti(d: Partial<Dipendente>): CampoAnagrafica[] {
  const m: CampoAnagrafica[] = [];
  const sempre: [CampoAnagrafica, string | null | undefined][] = [
    ["cognome", d.cognome], ["nome", d.nome], ["codice_fiscale", d.codice_fiscale], ["luogo_nascita", d.luogo_nascita],
    ["data_nascita", d.data_nascita], ["reparto", d.reparto], ["data_assunzione", d.data_assunzione],
  ];
  for (const [c, v] of sempre) if (vuoto(v)) m.push(c);
  const reparto = (d.reparto ?? "").trim().toLowerCase();
  if (reparto === "ata" && vuoto(d.sottoreparto)) m.push("sottoreparto");
  if (reparto === "docente") {
    if (vuoto(d.classe_concorso)) m.push("classe_concorso");
    if (vuoto(d.materia)) m.push("materia");
  }
  if (d.tipo_contratto === "determinato" && vuoto(d.data_fine_contratto)) m.push("data_fine_contratto");
  if (d.stato_lavoratore === "cessato" && vuoto(d.data_cessazione)) m.push("data_cessazione");
  return m;
}
