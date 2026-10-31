/*
 * File:      useAzioniDipendente.ts
 * Percorso:  src/features/dipendenti/hooks/useAzioniDipendente.ts
 * Azioni sul dipendente: ruoli, integrazioni DVR, salvataggio e cambio reparto.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aggiornaRepartoDipendente,
  chiudiIntegrazioneDvr,
  impostaRuoloDipendente,
  upsertDipendente,
  type Dipendente,
  type IntegrazioneDvr,
  CHIAVE_ASSEGNAZIONI_RUOLI,
} from "@/lib/api";
import { NESSUNO } from "../types";

export function useAzioniDipendente({
  sel,
  form,
  setForm,
}: {
  sel: string | null;
  form: Omit<Dipendente, "id"> | null;
  setForm: (f: Omit<Dipendente, "id"> | null) => void;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  async function spuntaRuolo(ruoloId: string, v: boolean) {
    if (!sel) return;
    try {
      await impostaRuoloDipendente(sel, ruoloId, v);
      qc.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI });
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    }
  }

  async function segnaCompletata(i: IntegrazioneDvr) {
    if (!window.confirm(`Segnare come completata "${i.descrizione}" senza collegare un attestato?`)) return;
    try {
      await chiudiIntegrazioneDvr(i.id, null);
      qc.invalidateQueries({ queryKey: ["integrazioni-dvr"] });
      toast.success("Integrazione segnata come completata");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function salva() {
    if (!form) return;
    if (!form.codice_fiscale.trim() || !form.cognome.trim() || !form.nome.trim()) {
      toast.error("Cognome, nome e codice fiscale sono obbligatori");
      return;
    }
    setSaving(true);
    try {
      await upsertDipendente(form);
      toast.success("Dipendente salvato");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["dipendenti"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function cambiaReparto(id: string, valore: string) {
    try {
      await aggiornaRepartoDipendente(id, valore === NESSUNO ? null : valore);
      toast.success("Reparto aggiornato");
      qc.invalidateQueries({ queryKey: ["dipendenti"] });
      qc.invalidateQueries({ queryKey: ["attestati"] });
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    }
  }

  return { saving, spuntaRuolo, segnaCompletata, salva, cambiaReparto };
}
