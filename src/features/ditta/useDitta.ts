/*
 * File:          useDitta.ts
 * Percorso:      src/features/ditta/useDitta.ts
 * Data creazione: 2026-11-01
 * Revisioni:
 *   - Rev 1 (2026-11-01 12:00): Hook per dati ditta, soglie di legge e lavoratori in forza; importa una volta i dati del browser.
 *   - Rev 2 (2026-11-01 14:00): Usa le stesse chiavi di cache della scheda Ditta (si aggiorna appena si salva).
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CHIAVE_DITTA,
  CHIAVE_LAVORATORI_IN_FORZA,
  CHIAVE_SOGLIE_DITTA,
  contaLavoratoriInForza,
  getDitta,
  getSoglieDitta,
  importaDatiDalBrowserUnaVolta,
} from "@/lib/api/ditta";

export function useDitta() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });

  useEffect(() => {
    void importaDatiDalBrowserUnaVolta()
      .then((scritto) => {
        if (scritto) void qc.invalidateQueries({ queryKey: CHIAVE_DITTA });
      })
      .catch(() => {});
  }, [qc]);

  return query;
}

export function useSoglieDitta() {
  return useQuery({ queryKey: CHIAVE_SOGLIE_DITTA, queryFn: getSoglieDitta });
}

export function useLavoratoriInForza() {
  return useQuery({ queryKey: CHIAVE_LAVORATORI_IN_FORZA, queryFn: contaLavoratoriInForza });
}
