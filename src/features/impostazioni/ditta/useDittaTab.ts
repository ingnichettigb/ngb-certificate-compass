/*
 * File:      useDittaTab.ts
 * Percorso:  src/features/impostazioni/ditta/useDittaTab.ts
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Hook per la gestione form e salvataggio anagrafica ditta.
 *   rev 2 — 01/11/2026 14:00 — Chiavi di cache condivise con gli avvisi in testata; codice ATECO controllato e normalizzato (con
 *                              rischio suggerito per l'Istruzione); data di aggiornamento impostata da sola quando cambia il numero.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CHIAVE_DITTA,
  CHIAVE_SOGLIE_DITTA,
  getDitta,
  salvaDitta,
  getSoglieDitta,
  DittaRecord,
  CodiceAteco,
} from "@/lib/api/ditta";
import { normalizzaAteco, suggerisciRischioAteco } from "@/features/ditta/regole-ditta";

export function useDittaTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DittaRecord | null>(null);
  const [nuovoAteco, setNuovoAteco] = useState({ codice: "", descrizione: "" });

  const { data: dittaDb, isLoading: loadingDitta } = useQuery({
    queryKey: CHIAVE_DITTA,
    queryFn: getDitta,
  });

  const { data: soglie = [] } = useQuery({
    queryKey: CHIAVE_SOGLIE_DITTA,
    queryFn: getSoglieDitta,
  });

  useEffect(() => {
    if (dittaDb) setForm(dittaDb);
  }, [dittaDb]);

  const mutazioneSalva = useMutation({
    mutationFn: (dati: DittaRecord) => salvaDitta(dati),
    onSuccess: (datiSalvati) => {
      setForm(datiSalvati);
      qc.invalidateQueries({ queryKey: CHIAVE_DITTA });
      toast.success("Dati ditta salvati nel database con successo");
    },
    onError: (err: Error) => {
      toast.error("Errore salvataggio dati ditta", { description: err.message });
    },
  });

  function updateCampo<K extends keyof DittaRecord>(campo: K, valore: DittaRecord[K]) {
    if (!form) return;
    const oggi = new Date().toISOString().slice(0, 10);
    const aggiornato: DittaRecord = { ...form, [campo]: valore };
    // Quando cambia il numero, la data di aggiornamento si imposta da sola (resta modificabile).
    if (campo === "n_lavoratori_dichiarato") {
      aggiornato.n_lavoratori_data_aggiornamento = valore === null ? null : oggi;
    }
    if (campo === "presenze_contemporanee_max") {
      aggiornato.presenze_data_aggiornamento = valore === null ? null : oggi;
    }
    setForm(aggiornato);
  }

  function aggiungiAteco() {
    if (!form || !nuovoAteco.codice.trim()) return;
    const codice = normalizzaAteco(nuovoAteco.codice);
    if (!codice) {
      toast.error("Codice ATECO non valido", { description: "Esempio: 85.31.20 oppure 85.31" });
      return;
    }
    if (form.codici_ateco.some((c) => c.codice === codice)) {
      toast.error("Codice ATECO già inserito");
      return;
    }
    const rischio = suggerisciRischioAteco(codice);
    const nuovo: CodiceAteco = {
      codice,
      descrizione: nuovoAteco.descrizione.trim(),
      ...(rischio ? { rischio } : {}),
    };
    updateCampo("codici_ateco", [...form.codici_ateco, nuovo]);
    setNuovoAteco({ codice: "", descrizione: "" });
  }

  function rimuoviAteco(index: number) {
    if (!form) return;
    const nuovaLista = form.codici_ateco.filter((_, i) => i !== index);
    updateCampo("codici_ateco", nuovaLista);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.ragione_sociale.trim()) {
      toast.error("La Ragione Sociale è obbligatoria");
      return;
    }
    mutazioneSalva.mutate(form);
  }

  return {
    form,
    soglie,
    isLoading: loadingDitta,
    isSaving: mutazioneSalva.isPending,
    nuovoAteco,
    setNuovoAteco,
    updateCampo,
    aggiungiAteco,
    rimuoviAteco,
    handleSubmit,
  };
}
