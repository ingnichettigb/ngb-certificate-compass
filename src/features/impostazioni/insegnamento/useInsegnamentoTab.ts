/*
 * File:      useInsegnamentoTab.ts
 * Percorso:  src/features/impostazioni/insegnamento/useInsegnamentoTab.ts
 * Dati e azioni della scheda Classi di concorso e materie.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aggiungiClasseConcorso,
  eliminaClasseConcorso,
  eliminaMateria,
  getClassiConcorso,
  getMaterie,
  impostaClasseAttiva,
} from "@/lib/api";
import { filtraClassi } from "./filtra-classi";

export function useInsegnamentoTab() {
  const qc = useQueryClient();
  const [codice, setCodice] = useState("");
  const [denominazione, setDenominazione] = useState("");
  const [filtro, setFiltro] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const {
    data: classi = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["classi_concorso"],
    queryFn: getClassiConcorso,
    retry: false,
  });
  const { data: materie = [] } = useQuery({
    queryKey: ["materie"],
    queryFn: getMaterie,
    retry: false,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["classi_concorso"] });
    qc.invalidateQueries({ queryKey: ["materie"] });
  }

  const classiFiltrate = useMemo(() => filtraClassi(classi, filtro), [classi, filtro]);

  async function aggiungi() {
    setBusy("nuovo");
    try {
      await aggiungiClasseConcorso(codice, denominazione);
      setCodice("");
      setDenominazione("");
      refresh();
    } catch (e) {
      toast.error("Classe non aggiunta", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaAttiva(id: string, attivo: boolean) {
    setBusy(id);
    try {
      await impostaClasseAttiva(id, attivo);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(id: string, etichetta: string) {
    if (!window.confirm(`Eliminare "${etichetta}" dai suggerimenti?`)) return;
    setBusy(id);
    try {
      await eliminaClasseConcorso(id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuoviMateria(id: string, nome: string) {
    if (!window.confirm(`Eliminare la materia "${nome}" dai suggerimenti?`)) return;
    setBusy(id);
    try {
      await eliminaMateria(id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return {
    classi,
    classiFiltrate,
    materie,
    isLoading,
    error,
    busy,
    codice,
    setCodice,
    denominazione,
    setDenominazione,
    filtro,
    setFiltro,
    aggiungi,
    cambiaAttiva,
    rimuovi,
    rimuoviMateria,
  };
}
