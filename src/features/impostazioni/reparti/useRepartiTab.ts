/*
 * File:      useRepartiTab.ts
 * Percorso:  src/features/impostazioni/reparti/useRepartiTab.ts
 * Dati e azioni della scheda Reparti: elenco, aggiunta, attivazione, classe di concorso, eliminazione.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aggiungiReparto,
  eliminaReparto,
  getDipendenti,
  getReparti,
  getSottoreparti,
  impostaRepartoAttivo,
  impostaRepartoClasseConcorso,
} from "@/lib/api";
import { repartiDaImportare } from "./importa-reparti";

export function useRepartiTab() {
  const qc = useQueryClient();
  const [nuovo, setNuovo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  const {
    data: reparti = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reparti"],
    queryFn: getReparti,
    retry: false,
  });
  const { data: sottoreparti = [] } = useQuery({
    queryKey: ["sottoreparti"],
    queryFn: getSottoreparti,
    retry: false,
  });
  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
  });

  // Valori di "reparto" già scritti a mano nei dipendenti ma non ancora in elenco.
  const daImportare = useMemo(() => repartiDaImportare(dipendenti, reparti), [dipendenti, reparti]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["reparti"] });
    qc.invalidateQueries({ queryKey: ["sottoreparti"] });
  }

  function apriChiudi(id: string) {
    setAperti((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function aggiungi(nome: string) {
    const ordine = reparti.reduce((m, r) => Math.max(m, r.ordine), 0) + 1;
    setBusy("nuovo");
    try {
      await aggiungiReparto(nome, ordine);
      setNuovo("");
      refresh();
    } catch (e) {
      toast.error("Reparto non aggiunto", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaAttivo(id: string, attivo: boolean) {
    setBusy(id);
    try {
      await impostaRepartoAttivo(id, attivo);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function cambiaClasse(id: string, richiede: boolean) {
    setBusy(id);
    try {
      await impostaRepartoClasseConcorso(id, richiede);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(id: string, nome: string) {
    if (
      !window.confirm(
        `Togliere "${nome}" dall'elenco? I dipendenti che l'hanno già scelto lo mantengono.`,
      )
    )
      return;
    setBusy(id);
    try {
      await eliminaReparto(id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return {
    reparti,
    sottoreparti,
    isLoading,
    error,
    nuovo,
    setNuovo,
    busy,
    aperti,
    daImportare,
    refresh,
    apriChiudi,
    aggiungi,
    cambiaAttivo,
    cambiaClasse,
    rimuovi,
  };
}
