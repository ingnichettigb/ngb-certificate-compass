/*
 * File:      decisione.ts
 * Percorso:  src/features/hr/decisione.ts
 * Regole della decisione di HR (approva/respingi): validazione, dati da salvare, messaggio di esito.
 */
import { type Stato, type aggiornaAttestato } from "@/lib/api";

/** Messaggio di errore se la decisione non è ammessa (un rifiuto richiede le note), altrimenti null. */
export function erroreDecisione(esito: Stato, note: string): string | null {
  return esito === "Respinto" && !note.trim() ? "Le note di rifiuto sono obbligatorie" : null;
}

/** Dati da salvare sull'attestato quando HR approva o respinge. */
export function costruisciAggiornamento({
  tipoCorsoId,
  dataCorso,
  ore,
  esito,
  note,
  adesso,
}: {
  tipoCorsoId: string;
  dataCorso: string;
  ore: string;
  esito: Stato;
  note: string;
  adesso: Date;
}): Parameters<typeof aggiornaAttestato>[1] {
  return {
    tipo_corso_id: tipoCorsoId,
    data_corso: dataCorso,
    ore_dichiarate: ore ? Number(ore) : null,
    stato_validazione: esito,
    note_rifiuto: esito === "Respinto" ? note.trim() : null,
    data_validazione: adesso.toISOString(),
  };
}

/** Testo mostrato nella notifica dopo il salvataggio dell'esito. */
export function descrizioneEsito(inviaEmail: boolean, emailPreparata: boolean): string {
  if (!inviaEmail) return "Esito salvato.";
  return emailPreparata
    ? "Si è aperta la tua app di posta con il messaggio già scritto: premi Invia."
    : "Esito salvato, ma nessuna email preparata: il dipendente non ha un indirizzo email.";
}
