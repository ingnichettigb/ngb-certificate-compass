/*
 * File:          useRicercaArchivio.ts
 * Percorso:      src/features/dipendenti/aggancia-allegato/useRicercaArchivio.ts
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Logica ricerca ricorsiva e selezione singola (ripresa da "Aggancia").
 */
import { cercaInTutteLeCartelle } from "@/lib/api/cartelle-multiple";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getCartellaArchivio,
  scegliCartellaLocale,
  type FileTrovato,
} from "@/lib/api/cartella-locale";

export function useRicercaArchivio(open: boolean, cognomeIniziale: string) {
  const [chiave, setChiave] = useState("");
  const [inRicerca, setInRicerca] = useState(false);
  const [risultati, setRisultati] = useState<FileTrovato[] | null>(null);
  const [haCartella, setHaCartella] = useState<boolean | null>(null);
  const [selezionato, setSelezionato] = useState<FileTrovato | null>(null);

  const cerca = useCallback(async (testo: string) => {
    if (!testo.trim()) {
      toast.error("Inserisci almeno un termine per la ricerca");
      return;
    }
    setInRicerca(true);
    setSelezionato(null);
    try {
      let root = await getCartellaArchivio(true);
      if (!root) {
        root = await scegliCartellaLocale();
        if (!root) {
          toast.info("Seleziona prima la cartella archivio");
          return;
        }
        setHaCartella(true);
      }
      const files = await cercaInTutteLeCartelle(testo);
      setRisultati(files);
      if (files.length === 0) toast.info("Nessun file trovato nelle cartelle");
    } catch (e) {
      toast.error("Errore durante la ricerca", { description: (e as Error).message });
    } finally {
      setInRicerca(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const c = cognomeIniziale.trim();
    setChiave(c);
    setRisultati(null);
    setSelezionato(null);
    getCartellaArchivio(false).then((h) => {
      setHaCartella(Boolean(h));
      if (h && c) cerca(c);
    });
  }, [open, cognomeIniziale, cerca]);

  async function scegliCartella() {
    const h = await scegliCartellaLocale();
    setHaCartella(Boolean(h));
    if (h && chiave) cerca(chiave);
  }

  function scegli(f: FileTrovato) {
    setSelezionato((prev) => (prev?.percorsoRelativo === f.percorsoRelativo && prev?.cartella === f.cartella ? null : f));
  }

  return { chiave, setChiave, inRicerca, risultati, haCartella, selezionato, cerca, scegli, scegliCartella };
}
