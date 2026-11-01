/*
 * File:      useDittaTab.ts
 * Percorso:  src/features/impostazioni/ditta/useDittaTab.ts
 * Data creaz: 01/11/2026
 * Revisioni:
 *   rev 1 — 01/11/2026 12:00 — Hook per la gestione form e salvataggio anagrafica ditta.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDitta, salvaDitta, getSoglieDitta, DittaRecord, CodiceAteco } from "@/lib/api/ditta";

export function useDittaTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<DittaRecord | null>(null);
  const [nuovoAteco, setNuovoAteco] = useState({ codice: "", descrizione: "" });

  const { data: dittaDb, isLoading: loadingDitta } = useQuery({
    queryKey: ["ditta_anagrafica"],
    queryFn: getDitta,
  });

  const { data: soglie = [] } = useQuery({
    queryKey: ["soglie_ditta"],
    queryFn: getSoglieDitta,
  });

  useEffect(() => {
    if (dittaDb) setForm(dittaDb);
  }, [dittaDb]);

  const mutazioneSalva = useMutation({
    mutationFn: (dati: DittaRecord) => salvaDitta(dati),
    onSuccess: (datiSalvati) => {
      setForm(datiSalvati);
      qc.invalidateQueries({ queryKey: ["ditta_anagrafica"] });
      toast.success("Dati ditta salvati nel database con successo");
    },
    onError: (err: Error) => {
      toast.error("Errore salvataggio dati ditta", { description: err.message });
    },
  });

  function updateCampo<K extends keyof DittaRecord>(campo: K, valore: DittaRecord[K]) {
    if (!form) return;
    setForm({ ...form, [campo]: valore });
  }

  function aggiungiAteco() {
    if (!form || !nuovoAteco.codice.trim()) return;
    const nuovaLista: CodiceAteco[] = [
      ...form.codici_ateco,
      { codice: nuovoAteco.codice.trim().toUpperCase(), descrizione: nuovoAteco.descrizione.trim() },
    ];
    updateCampo("codici_ateco", nuovaLista);
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
