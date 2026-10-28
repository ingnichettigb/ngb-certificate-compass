/*
 * File:      email-esito.ts
 * Percorso:  src/lib/api/email-esito.ts
 * Costruzione dell'email di esito (mailto).
 */
import type { Attestato, Stato } from "./attestati";
import { formatData } from "./formattazione";

/**
 * Prepara il link mailto: con il messaggio di esito già scritto.
 * Non serve nessun servizio esterno: si apre l'app di posta di chi usa la dashboard.
 */
export function costruisciMailto(a: Attestato, esito: Stato): string | null {
  const email = a.dipendenti?.email?.trim();
  if (!email) return null;
  const corso = a.tipi_corso?.nome_corso ?? "corso di formazione";
  const nome = a.dipendenti?.nome ?? "";
  const dataCorso = formatData(a.data_corso);

  let oggetto: string;
  let righe: string[];
  if (esito === "Approvato") {
    oggetto = `Attestato approvato: ${corso}`;
    righe = [
      `Gentile ${nome},`,
      "",
      `il tuo attestato "${corso}" (corso del ${dataCorso}) è stato verificato e approvato.`,
      a.data_scadenza_calcolata
        ? `Scadenza: ${formatData(a.data_scadenza_calcolata)}.`
        : "Questo attestato non ha scadenza.",
      "",
      "Grazie per la collaborazione.",
    ];
  } else if (esito === "In attesa di integrazione") {
    // Rev 2 (2026-10-28 11:50): email per approvazione con integrazione SIC-SPI-04.
    oggetto = `Attestato registrato in attesa di integrazione: ${corso}`;
    righe = [
      `Gentile ${nome},`,
      "",
      `il tuo attestato "${corso}" (corso del ${dataCorso}) è stato registrato ed è in attesa di integrazione.`,
      "Il percorso si intenderà completo e approvato dopo il corso integrativo:",
      "[SIC-SPI-04] Sicurezza Specifica Rischio MEDIO integrazione al DVR Liceo Aselli.",
      ...(a.note_rifiuto?.trim() ? ["", `Note: ${a.note_rifiuto.trim()}`] : []),
      "",
      "Grazie per la collaborazione.",
    ];
  } else {
    oggetto = `Attestato respinto: ${corso}`;
    righe = [
      `Gentile ${nome},`,
      "",
      `il tuo attestato "${corso}" (corso del ${dataCorso}) non è stato accettato.`,
      "",
      `Motivo: ${a.note_rifiuto?.trim() || "non specificato"}`,
      "",
      "Puoi caricarlo di nuovo dal modulo, correggendo quanto indicato.",
      "",
      "Grazie per la collaborazione.",
    ];
  }
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
    oggetto,
  )}&body=${encodeURIComponent(righe.join("\r\n"))}`;
}

/** Apre l'app di posta con l'email di esito. Restituisce false se manca l'indirizzo. */
export function apriEmailEsito(a: Attestato, esito: Stato): boolean {
  const link = costruisciMailto(a, esito);
  if (!link) return false;
  window.location.href = link;
  return true;
}
