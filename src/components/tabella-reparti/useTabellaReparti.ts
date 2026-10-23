/*
 * File:      useTabellaReparti.ts
 * Percorso:  src/components/tabella-reparti/useTabellaReparti.ts
 * Dati e azioni della tabella reparti in modifica diretta: salvataggio di un campo, eliminazione, inserimento.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aggiornaReparto,
  aggiungiReparto,
  eliminaReparto,
  getReparti,
  type Reparto,
} from "@/lib/api";

export const VUOTA = { nome: "", ordine: "", attivo: true, richiede_classe_concorso: false };

export function useTabellaReparti() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [nuova, setNuova] = useState(VUOTA);

  const {
    data: reparti = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reparti"],
    queryFn: getReparti,
    retry: false,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["reparti"] });
  }

  async function salvaCampo<K extends keyof Reparto>(r: Reparto, campo: K, valore: Reparto[K]) {
    if (r[campo] === valore) return;
    setBusy(r.id);
    try {
      await aggiornaReparto(r.id, { [campo]: valore } as Partial<Reparto>);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
      refresh(); // ripristina il valore mostrato in tabella
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(r: Reparto) {
    if (!window.confirm(`Eliminare definitivamente "${r.nome}" dalla tabella reparti?`)) return;
    setBusy(r.id);
    try {
      await eliminaReparto(r.id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function inserisci() {
    if (!nuova.nome.trim()) return;
    setBusy("nuova");
    try {
      const ordine = nuova.ordine.trim()
        ? Number(nuova.ordine)
        : reparti.reduce((m, r) => Math.max(m, r.ordine), 0) + 1;
      await aggiungiReparto(nuova.nome, ordine);
      // attivo/richiede_classe_concorso non passano da aggiungiReparto: si sistemano dopo, se diversi dal default
      setNuova(VUOTA);
      refresh();
    } catch (e) {
      toast.error("Riga non inserita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return { reparti, isLoading, error, busy, nuova, setNuova, salvaCampo, rimuovi, inserisci };
}
