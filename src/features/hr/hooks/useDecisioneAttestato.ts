/*
 * File:          useDecisioneAttestato.ts
 * Percorso:      src/features/hr/hooks/useDecisioneAttestato.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Stato del modulo di validazione e decisione approva/respingi.
 *   - Rev 2 (2026-10-28 11:35): Aggiunta funzione scollegaLink per azzerare il percorso file conservando i dati del corso.
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  aggiornaAttestato,
  apriEmailEsito,
  scollegaDocumentoAttestato,
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

  /** Rimuove il link al file errato lasciando invariati corso, ore e date. */
  async function scollegaLink() {
    if (
      !confirm(
        "Vuoi rimuovere il link a questo file? L'attestato rimarrà in archivio come corso svolto, ma senza documento allegato."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await scollegaDocumentoAttestato(attestato.id);
      toast.success("Link al file rimosso", {
        description: "L'attestato rimane in archivio senza documento PDF.",
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
