/*
 * File:          useDecisioneAttestato.ts
 * Percorso:      src/features/hr/hooks/useDecisioneAttestato.ts
 * Data creazione: 2026-10-22
 * Revisioni:
 *   - Rev 1 (2026-10-22 10:00): Hook gestione stato validazione, aggiornamento attestato ed email.
 *   - Rev 2 (2026-10-28 11:35): Aggiunta azione scollegaLink (imposta Approvato, azzera link ed esclude dall'attesa).
 *   - Rev 3 (2026-10-28 11:50): Aggiunta azione confermaIntegrazione (stato «In attesa di integrazione» + debito formativo SIC-SPI-04).
 *   - Rev 4 (2026-10-28 14:15): Aggiunta azione approvaERinomina (rinomina file nella cartella di origine + sostituzione link nel DB).
 *   - Rev 5 (2026-10-28 14:17): Import helper da ../decisione, patch senza null non ammessi, integrazione DVR con i campi reali.
 *   - Rev 6 (2026-10-28 14:25): Ripristinata normalizzazione data corso a YYYY-MM-DD (input type=date).
 *   - Rev 7 (2026-10-29 13:25): Azione sdoppiaCorso a due passaggi (copia PDF + nuovo attestato, poi rinomina originale).
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  aggiornaAttestato,
  creaAttestato,
  creaIntegrazioneDvr,
  apriEmailEsito,
  type Attestato,
  type Stato,
  type TipoCorso,
} from "@/lib/api";
import { rinominaFileNelPercorso, duplicaFileNelPercorso } from "@/lib/api/cartelle-multiple";
import { generaNomeFileRinominato } from "../nome-file-validazione";
import {
  costruisciAggiornamento,
  descrizioneEsito,
  erroreDecisione,
} from "../decisione";

export function useDecisioneAttestato({
  attestato,
  corsi = [],
  onChanged,
}: {
  attestato: Attestato;
  corsi?: TipoCorso[];
  onChanged: () => void;
}) {
  const [tipoCorsoId, setTipoCorsoId] = useState(attestato.tipo_corso_id ?? "");
  const [dataCorso, setDataCorso] = useState((attestato.data_corso ?? "").slice(0, 10));
  const [ore, setOre] = useState(
    attestato.ore_dichiarate != null ? String(attestato.ore_dichiarate) : "",
  );
  const [note, setNote] = useState(attestato.note_rifiuto ?? "");
  const [mostraNote, setMostraNote] = useState(false);
  const [dialogIntegrazione, setDialogIntegrazione] = useState(false);
  const [busy, setBusy] = useState(false);
  const [faseSdoppia, setFaseSdoppia] = useState(false);
  const d = attestato.dipendenti;
  const haEmail = Boolean(d?.email?.trim());
  const [inviaEmail, setInviaEmail] = useState(haEmail);

  const corsoSelezionato = corsi.find((c) => c.id === tipoCorsoId) || null;

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

  /** Rinomina il file nella cartella originaria del link, aggiorna il link nel DB e approva. */
  async function approvaERinomina() {
    const linkOriginale = attestato.url_foto_fronte?.trim() || attestato.url_foto_retro?.trim();
    if (!linkOriginale) {
      toast.error("Nessun file o link associato a questo attestato");
      return;
    }

    setBusy(true);
    try {
      const nuovoNome = generaNomeFileRinominato(attestato, corsoSelezionato, ore);

      // 1. Rinomina fisica del file sul disco nella cartella da cui proviene il link
      const esitoRinomina = await rinominaFileNelPercorso(linkOriginale, nuovoNome);

      if (!esitoRinomina.success) {
        toast.error("Impossibile rinominare il file fisico", {
          description: esitoRinomina.errore || "Verifica i permessi sulla cartella locale del file",
        });
        setBusy(false);
        return;
      }

      const nuovoLink = esitoRinomina.nuovoPercorso || nuovoNome;

      // 2. Aggiornamento attestato nel database con il nuovo link e approvazione
      const agg = await aggiornaAttestato(attestato.id, {
        ...(tipoCorsoId ? { tipo_corso_id: tipoCorsoId } : {}),
        ...(dataCorso ? { data_corso: dataCorso } : {}),
        ore_dichiarate: ore ? Number(ore) : null,
        stato_validazione: "Approvato",
        url_foto_fronte: nuovoLink,
        data_validazione: new Date().toISOString(),
      });

      const descrizione = descrizioneEsito(inviaEmail, inviaEmail ? apriEmailEsito(agg, "Approvato") : false);
      toast.success("Attestato approvato e file rinominato", {
        description: `Nuovo link: ${nuovoNome}. ${descrizione}`,
        action:
          inviaEmail && haEmail
            ? { label: "Riapri email", onClick: () => apriEmailEsito(agg, "Approvato") }
            : undefined,
      });

      onChanged();
    } catch (e) {
      toast.error("Errore durante la rinomina e approvazione", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  /**
   * «Sdoppia corso cumulativo».
   * 1° click: copia il PDF nella stessa cartella col nome del 1° corso e salva un nuovo attestato Approvato.
   * 2° click: rinomina l'originale con i dati del 2° corso e approva il record corrente.
   */
  async function sdoppiaCorso() {
    if (faseSdoppia) {
      await approvaERinomina();
      setFaseSdoppia(false);
      return;
    }
    const link = attestato.url_foto_fronte?.trim() || attestato.url_foto_retro?.trim();
    if (!link) return void toast.error("Nessun file o link associato a questo attestato");
    if (!tipoCorsoId || !dataCorso) return void toast.error("Seleziona tipo corso e data del 1° corso");
    setBusy(true);
    try {
      const nome = generaNomeFileRinominato(attestato, corsoSelezionato, ore);
      const copia = await duplicaFileNelPercorso(link, nome);
      if (!copia.success) {
        toast.error("Impossibile creare la copia del PDF", {
          description: copia.errore || "Verifica i permessi sulla cartella locale del file",
        });
        return;
      }
      const nuovo = await creaAttestato({
        dipendente_id: attestato.dipendente_id,
        codice_fiscale: attestato.codice_fiscale,
        tipo_corso_id: tipoCorsoId,
        data_corso: dataCorso,
        ore_dichiarate: ore ? Number(ore) : null,
        url_foto_fronte: copia.nuovoPercorso || nome,
        url_foto_retro: null,
      });
      await aggiornaAttestato(nuovo.id, {
        stato_validazione: "Approvato",
        data_validazione: new Date().toISOString(),
      });
      setFaseSdoppia(true);
      toast.success("1° corso archiviato", { description: `Copia salvata: ${nome}` });
    } catch (e) {
      toast.error("Errore durante lo sdoppiamento", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  /** Approva «In attesa di integrazione» e crea il debito formativo SIC-SPI-04. */
  async function confermaIntegrazione(dati: { ore: number; note: string; inviaEmail: boolean }) {
    setBusy(true);
    try {
      const agg = await aggiornaAttestato(attestato.id, {
        tipo_corso_id: tipoCorsoId,
        data_corso: dataCorso,
        ore_dichiarate: ore ? Number(ore) : null,
        stato_validazione: "In attesa di integrazione",
        note_rifiuto: dati.note || null,
        data_validazione: new Date().toISOString(),
      });

      await creaIntegrazioneDvr({
        dipendente_id: attestato.dipendente_id,
        attestato_origine_id: attestato.id,
        tipo_corso_nome: "Sicurezza Specifica Rischio MEDIO integrazione al DVR Liceo Aselli",
        descrizione: "Integrazione SIC-SPI-04 (debito formativo)",
        ore: dati.ore,
        argomenti_mancanti: dati.note.trim() ? [dati.note.trim()] : [],
      });

      const descr = descrizioneEsito(
        dati.inviaEmail,
        dati.inviaEmail ? apriEmailEsito(agg, "In attesa di integrazione") : false,
      );

      toast.success("Attestato approvato con riserva di integrazione", {
        description: `Registrato debito formativo SIC-SPI-04 (${dati.ore} ore). ${descr}`,
      });
      setDialogIntegrazione(false);
      onChanged();
    } catch (e) {
      toast.error("Errore salvataggio integrazione", { description: String(e) });
    } finally {
      setBusy(false);
    }
  }

  /** Scollega il link non funzionante, imposta lo stato su Approvato ed esclude dall'attesa. */
  async function scollegaLink() {
    setBusy(true);
    try {
      await aggiornaAttestato(attestato.id, {
        url_foto_fronte: null,
        url_foto_retro: null,
        stato_validazione: "Approvato",
        data_validazione: new Date().toISOString(),
      });
      toast.success("Link rimosso ed attestato escluso dall'attesa", {
        description: "I dati del corso e le date sono stati mantenuti. L'attestato ora appare tra quelli senza PDF.",
      });
      onChanged();
    } catch (e) {
      toast.error("Errore durante lo scollegamento del link", { description: String(e) });
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
    dialogIntegrazione,
    setDialogIntegrazione,
    haEmail,
    inviaEmail,
    setInviaEmail,
    busy,
    decidi,
    approvaERinomina,
    sdoppiaCorso,
    faseSdoppia,
    annullaSdoppia: () => setFaseSdoppia(false),
    confermaIntegrazione,
    scollegaLink,
  };
}
