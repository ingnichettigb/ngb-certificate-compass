/*
 * File:          useDecisioneAttestato.ts
 * Percorso:      src/features/hr/hooks/useDecisioneAttestato.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Stato del modulo di validazione e decisione approva/respingi.
 *   - Rev 2 (2026-10-28 11:35): Aggiunta funzione scollegaLink per azzerare il percorso file conservando i dati del corso.
 *   - Rev 3 (2026-10-28 11:50): Aggiunta approvazione «In attesa di integrazione» con debito SIC-SPI-04.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  aggiornaAttestato,
  apriEmailEsito,
  creaIntegrazioneDvr,
  type Attestato,
  type Stato,
} from "@/lib/api";
import { erroreDecisione, costruisciAggiornamento, descrizioneEsito } from "../decisione";

export function useDecisioneAttestato({
  attestato,
  onChanged,
}: {
  attestato: Attestato;
  onChanged: () => void;
}) {
  const [tipoCorsoId, setTipoCorsoId] = useState(attestato.tipo_corso_id);
  const [dataCorso, setDataCorso] = useState(attestato.data_corso.slice(0, 10));
  const [ore, setOre] = useState(
    attestato.ore_dichiarate != null ? String(attestato.ore_dichiarate) : "",
  );
  const [note, setNote] = useState(attestato.note_rifiuto ?? "");
  const [mostraNote, setMostraNote] = useState(false);
  const [dialogIntegrazione, setDialogIntegrazione] = useState(false);
  const [busy, setBusy] = useState(false);
  const d = attestato.dipendenti;
  const haEmail = Boolean(d?.email?.trim());
  const [inviaEmail, setInviaEmail] = useState(haEmail);

  /** Approva o respinge l'attestato, salvando anche le correzioni, e prepara l'email di esito. */
  async function decidi(esito: Stato) {
    const errore = erroreDecisione(esito, note);
    if (errore) {
      setMostraNote(true);
      toast.error(errore);
      return;
    }
    setBusy(true);
    try {
      const agg = await aggiornaAttestato(
        attestato.id,
        costruisciAggiornamento({ tipoCorsoId, dataCorso, ore, esito, note, adesso: new Date() }),
      );
      const descrizione = descrizioneEsito(inviaEmail, inviaEmail ? apriEmailEsito(agg, esito) : false);
      toast.success(esito === "Approvato" ? "Attestato approvato" : "Attestato respinto", {
        description: descrizione,
        action:
          inviaEmail && haEmail
            ? { label: "Riapri email", onClick: () => apriEmailEsito(agg, esito) }
            : undefined,
      });
      onChanged();
    } catch (e) {
      toast.error("Operazione non riuscita", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Rev 3 (2026-10-28 10:55): rimuove il link errato, conferma corso/data/ore
   * e toglie l'attestato dalla lista «In attesa» (finisce in «Senza PDF»).
   */
  async function scollegaLink() {
    if (
      !confirm(
        "Rimuovere il link al file e togliere l'attestato dalla lista in attesa? Corso, data e ore restano registrati (senza PDF).",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await aggiornaAttestato(attestato.id, {
        tipo_corso_id: tipoCorsoId,
        data_corso: dataCorso,
        ore_dichiarate: ore ? Number(ore) : null,
        url_foto_fronte: null,
        url_foto_retro: null,
        stato_validazione: "Approvato",
        note_rifiuto: null,
        data_validazione: new Date().toISOString(),
      });
      toast.success("Link rimosso ed escluso dall'attesa", {
        description: "L'attestato ora si trova nella sezione «Senza PDF».",
      });
      onChanged();
    } catch (e) {
      toast.error("Errore durante la rimozione del link", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  return {
    tipoCorsoId,
    setTipoCorsoId,
    dataCorso,
    setDataCorso,
    ore,
    setOre,
    note,
    setNote,
    mostraNote,
    setMostraNote,
    busy,
    haEmail,
    inviaEmail,
    setInviaEmail,
    decidi,
    scollegaLink,
  };
}
