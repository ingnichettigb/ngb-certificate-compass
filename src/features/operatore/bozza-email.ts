/*
 * File:      bozza-email.ts
 * Percorso:  src/features/operatore/bozza-email.ts
 * Testo dell'email di esito: riepilogo per riga e bozza (destinatari, oggetto, corpo).
 */
import { formatData } from "@/lib/api";
import type { CodaRiga } from "./types";

export function riepilogo(r: CodaRiga) {
  let s = `${r.cognome} ${r.nome} (${r.codice_fiscale})\nCorso: ${r.tipo_corso_nome} — ${formatData(r.data_corso)} — ${r.ore ?? "?"} ore\nEsito: ${r.esito}`;
  if (r.esito === "Valido con integrazione DVR" && r.integrazione) s += `\nIntegrazione richiesta: ${r.integrazione}`;
  if (r.note) s += `\nNote: ${r.note}`;
  return s;
}

/** Prepara destinatari, oggetto e corpo dell'email per le righe selezionate. */
export function costruisciBozzaEmail(righe: CodaRiga[]) {
  const destinatari = [...new Set(righe.map((r) => r.email?.trim()).filter(Boolean) as string[])].join(", ");
  const persone = [...new Set(righe.map((r) => `${r.cognome} ${r.nome}`))];
  const oggetto = `Esito verifica attestati D.Lgs. 81/2008 — ${persone.join(", ")}`;
  const testoCorpo = `Gentile ${persone.length === 1 ? persone[0] : "collega"},\n\ndi seguito l'esito della verifica degli attestati di formazione sicurezza:\n\n${righe.map((r, i) => `${i + 1}) ${riepilogo(r)}`).join("\n\n")}`;
  return { destinatari, oggetto, testoCorpo };
}
