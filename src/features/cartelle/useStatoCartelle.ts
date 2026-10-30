/*
 * File:          useStatoCartelle.ts
 * Percorso:      src/features/cartelle/useStatoCartelle.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:30): Hook che tiene aggiornato lo stato delle cartelle collegate (all'apertura, al ritorno
 *     sulla scheda e quando cambiano cartelle o permessi).
 */
import { useCallback, useEffect, useState } from "react";
import { EVENTO_CARTELLE_CAMBIATE, supportaCartellaLocale } from "@/lib/api/cartella-locale";
import {
  autorizzaCartelle,
  collegaCartella,
  leggiStatoCartelle,
  type StatoCartelle,
} from "@/lib/api/stato-cartelle";

export function useStatoCartelle() {
  const [stato, setStato] = useState<StatoCartelle | null>(null);
  const supportata = supportaCartellaLocale();

  const aggiorna = useCallback(async () => {
    if (!supportaCartellaLocale()) return;
    try {
      setStato(await leggiStatoCartelle());
    } catch {
      /* stato sconosciuto: nessun indicatore */
    }
  }, []);

  useEffect(() => {
    void aggiorna();
    const su = () => void aggiorna();
    window.addEventListener(EVENTO_CARTELLE_CAMBIATE, su);
    window.addEventListener("focus", su);
    document.addEventListener("visibilitychange", su);
    return () => {
      window.removeEventListener(EVENTO_CARTELLE_CAMBIATE, su);
      window.removeEventListener("focus", su);
      document.removeEventListener("visibilitychange", su);
    };
  }, [aggiorna]);

  /** Da chiamare da un clic: chiede il permesso per le cartelle non autorizzate. */
  const autorizza = useCallback(async () => {
    const nuovo = await autorizzaCartelle("read");
    setStato(nuovo);
    return nuovo;
  }, []);

  /** Da chiamare da un clic: apre la selezione cartella. */
  const collega = useCallback(async () => {
    const nome = await collegaCartella();
    await aggiorna();
    return nome;
  }, [aggiorna]);

  return { stato, supportata, aggiorna, autorizza, collega };
}
