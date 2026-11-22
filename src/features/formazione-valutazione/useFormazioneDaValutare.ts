/*
 * File:          useFormazioneDaValutare.ts
 * Percorso:      src/features/formazione-valutazione/useFormazioneDaValutare.ts
 * Data creazione: 2026-11-21
 * Legge i dati (dipendenti, attestati, Tabella 02, grado di rischio della ditta) con le stesse cache della pagina Dipendenti e ricava
 * l'elenco «da valutare» / «decise». Finché le regole non sono arrivate l'elenco è vuoto.
 * Revisioni:
 *   - Rev 1 (2026-11-21): Prima stesura (punto di verità ruoli-corsi, Fase 5).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAttestati, getDipendenti } from "@/lib/api";
import { useContestoRegole } from "@/features/dipendenti/matrice/useContestoRegole";
import { useRegoleRuoloCorso } from "@/features/dipendenti/matrice/useRegoleRuoloCorso";
import { elencoFormazioneDaValutare, type ElencoFormazione } from "./elenco";

const VUOTO: ElencoFormazione = { pendenti: [], decise: [], rischioNonImpostato: false };

export function useFormazioneDaValutare(): { elenco: ElencoFormazione; rischioDitta: string | null } {
  const { data: dipendenti = [] } = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const { data: attestati = [] } = useQuery({ queryKey: ["attestati", "Tutti"], queryFn: () => getAttestati("Tutti") });
  const regole = useRegoleRuoloCorso();
  const contesto = useContestoRegole();

  const elenco = useMemo(
    () => (regole && regole.length > 0 ? elencoFormazioneDaValutare({ dipendenti, attestati, regole, contesto }) : VUOTO),
    [dipendenti, attestati, regole, contesto],
  );
  return { elenco, rischioDitta: contesto.rischioDitta ?? null };
}
