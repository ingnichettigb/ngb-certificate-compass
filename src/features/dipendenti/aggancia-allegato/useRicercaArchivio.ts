/*
 * File:          useRicercaArchivio.ts
 * Percorso:      src/features/dipendenti/aggancia-allegato/useRicercaArchivio.ts
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Logica ricerca ricorsiva e selezione singola (ripresa da "Aggancia").
 *   - Rev 2 (2026-10-30 20:30): Stato cartelle esplicito (nessuna / da autorizzare / ok): niente più «Nessun file trovato»
 *     quando in realtà la cartella non è autorizzata; la ricerca automatica parte solo se c'è già un permesso.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { FileTrovato } from "@/lib/api/cartella-locale";
import { leggiStatoCartelle } from "@/lib/api/stato-cartelle";
import { cercaConStato } from "@/features/cartelle/ricerca-cartelle";
import { useStatoCartelle } from "@/features/cartelle/useStatoCartelle";

export function useRicercaArchivio(open: boolean, cognomeIniziale: string) {
  const [chiave, setChiave] = useState("");
  const [inRicerca, setInRicerca] = useState(false);
  const [risultati, setRisultati] = useState<FileTrovato[] | null>(null);
  const [selezionato, setSelezionato] = useState<FileTrovato | null>(null);
  const { stato: statoCartelle, aggiorna, autorizza, collega } = useStatoCartelle();

  const cerca = useCallback(
    async (testo: string, opzioni?: { daClic?: boolean }) => {
      const daClic = opzioni?.daClic ?? true;
      if (!testo.trim()) {
        toast.error("Inserisci almeno un termine per la ricerca");
        return;
      }
      setInRicerca(true);
      setSelezionato(null);
      try {
        const { stato, risultati: files } = await cercaConStato(testo, daClic);
        if (files === null) {
          setRisultati(null);
          if (daClic) {
            if (stato.stato === "nessuna") {
              toast.info("Nessuna cartella collegata", { description: "Usa il pulsante «Collega cartella» qui sopra." });
            } else {
              toast.warning("Permesso alla cartella non concesso", {
                description: "Usa il pulsante «Autorizza» qui sopra e conferma la richiesta del browser.",
              });
            }
          }
          return;
        }
        setRisultati(files);
        if (files.length === 0) {
          toast.info("Nessun file trovato nelle cartelle autorizzate", {
            ...(stato.stato === "da_autorizzare"
              ? { description: "Alcune cartelle non sono autorizzate: il file potrebbe trovarsi lì." }
              : {}),
          });
        }
      } catch (e) {
        toast.error("Errore durante la ricerca", { description: (e as Error).message });
      } finally {
        setInRicerca(false);
        void aggiorna();
      }
    },
    [aggiorna],
  );

  useEffect(() => {
    if (!open) return;
    const c = cognomeIniziale.trim();
    setChiave(c);
    setRisultati(null);
    setSelezionato(null);
    // Ricerca automatica solo se esiste già un permesso: all'apertura non c'è un clic, quindi non si può chiederlo.
    leggiStatoCartelle().then((st) => {
      if (st.autorizzate > 0 && c) void cerca(c, { daClic: false });
    });
  }, [open, cognomeIniziale, cerca]);

  async function autorizzaCartelleOra() {
    const st = await autorizza();
    if (st.autorizzate > 0 && chiave.trim()) void cerca(chiave, { daClic: false });
  }

  async function scegliCartella() {
    try {
      const nome = await collega();
      if (nome && chiave.trim()) void cerca(chiave, { daClic: false });
    } catch (e) {
      toast.error("Collegamento cartella non riuscito", { description: (e as Error).message });
    }
  }

  function scegli(f: FileTrovato) {
    setSelezionato((prev) => (prev?.percorsoRelativo === f.percorsoRelativo && prev?.cartella === f.cartella ? null : f));
  }

  return {
    chiave,
    setChiave,
    inRicerca,
    risultati,
    statoCartelle,
    selezionato,
    cerca,
    scegli,
    scegliCartella,
    autorizzaCartelle: autorizzaCartelleOra,
  };
}
