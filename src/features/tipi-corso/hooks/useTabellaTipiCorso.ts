/*
 * File:      useTabellaTipiCorso.ts
 * Percorso:  src/features/tipi-corso/hooks/useTabellaTipiCorso.ts
 * Dati e azioni della tabella tipi di corso: modifica, elimina, aggiungi, riordina, trascina.
 */
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  aggiornaTipoCorso,
  aggiungiTipoCorso,
  eliminaTipoCorso,
  getTipiCorso,
  riordinaTipiCorso,
  type TipoCorso,
} from "@/lib/api";
import { VUOTO } from "../types";
import { scambiaPosizioni, spostaId } from "../ordinamento";

export function useTabellaTipiCorso() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [nuovo, setNuovo] = useState(VUOTO);
  const trascinata = useRef<string | null>(null);
  const [sopra, setSopra] = useState<string | null>(null);

  const {
    data: corsi = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
    retry: false,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["tipi_corso"] });
    qc.invalidateQueries({ queryKey: ["categorie_corso"] });
  }

  async function salvaCampo<K extends keyof TipoCorso>(
    c: TipoCorso,
    campo: K,
    valore: TipoCorso[K],
  ) {
    if (c[campo] === valore) return;
    setBusy(c.id);
    try {
      await aggiornaTipoCorso(c.id, { [campo]: valore } as Partial<TipoCorso>);
      refresh();
    } catch (e) {
      toast.error("Modifica non riuscita", { description: (e as Error).message });
      refresh();
    } finally {
      setBusy(null);
    }
  }

  async function rimuovi(c: TipoCorso) {
    if (!window.confirm(`Eliminare definitivamente "${c.nome_corso}" dalla tabella corsi?`)) return;
    setBusy(c.id);
    try {
      await eliminaTipoCorso(c.id);
      refresh();
    } catch (e) {
      toast.error("Eliminazione non riuscita", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function inserisci() {
    if (!nuovo.nome_corso.trim()) return;
    setBusy("nuovo");
    try {
      const ordine = corsi.reduce((m, c) => Math.max(m, c.ordine), 0) + 1;
      await aggiungiTipoCorso({ ...nuovo, ordine });
      setNuovo(VUOTO);
      refresh();
    } catch (e) {
      toast.error("Corso non aggiunto", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  // Sposta un corso di una posizione su/giù: comodo su mobile dove trascinare è scomodo.
  async function sposta(index: number, direzione: -1 | 1) {
    const spostamento = scambiaPosizioni(corsi, index, direzione);
    if (!spostamento) return;
    setBusy(spostamento.idSpostato);
    try {
      await riordinaTipiCorso(spostamento.ids);
      refresh();
    } catch (e) {
      toast.error("Spostamento non riuscito", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function rilasciaSu(idDestinazione: string) {
    const idOrigine = trascinata.current;
    trascinata.current = null;
    setSopra(null);
    if (!idOrigine || idOrigine === idDestinazione) return;
    const riordinati = spostaId(
      corsi.map((c) => c.id),
      idOrigine,
      idDestinazione,
    );
    if (!riordinati) return;
    setBusy(idOrigine);
    try {
      await riordinaTipiCorso(riordinati);
      refresh();
    } catch (e) {
      toast.error("Spostamento non riuscito", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  // --- gestione del trascinamento (evidenzia la riga sotto il cursore)
  function iniziaTrascinamento(id: string) {
    trascinata.current = id;
  }
  function finisciTrascinamento() {
    trascinata.current = null;
    setSopra(null);
  }
  function trascinaSopra(id: string) {
    if (sopra !== id) setSopra(id);
  }
  function lasciaRiga(id: string) {
    setSopra((s) => (s === id ? null : s));
  }

  return {
    corsi,
    isLoading,
    error,
    busy,
    nuovo,
    setNuovo,
    sopra,
    salvaCampo,
    rimuovi,
    inserisci,
    sposta,
    rilasciaSu,
    iniziaTrascinamento,
    finisciTrascinamento,
    trascinaSopra,
    lasciaRiga,
  };
}
