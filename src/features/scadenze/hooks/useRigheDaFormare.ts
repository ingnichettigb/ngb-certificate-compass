/*
 * File:      useRigheDaFormare.ts
 * Percorso:  src/features/scadenze/hooks/useRigheDaFormare.ts
 * Revisione: 1 — 28/11/2026 10:01
 * Data creazione: 28/11/2026 10:01
 * Righe «Da formare / Mancanti» della pagina Scadenze. Legge anagrafica, catalogo corsi
 * e dati della ditta solo quando la vista è attiva, così le altre viste non fanno richieste in più, e calcola le righe con gli stessi obblighi
 * della matrice abilitazioni e ruoli (vedi obblighi-matrice.ts e da-formare.ts).
 * Revisioni:
 * - Rev 1 (28/11/2026 10:01): Prima stesura.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDipendenti, getTipiCorso, type AssegnazioneRuolo, type Attestato, type RuoloSicurezza } from "@/lib/api";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
import type { ContestoRegole } from "@/features/dipendenti/matrice/condizioni-regole";
import { calcolaRigheDaFormare } from "../da-formare";
import { creaValutatoreObblighi } from "../obblighi-matrice";
import type { RigaScadenzaDati } from "../types";

export function useRigheDaFormare({
  attivo,
  attestati,
  assegnazioni,
  ruoli,
  regole,
}: {
  attivo: boolean;
  attestati: Attestato[];
  assegnazioni: AssegnazioneRuolo[];
  ruoli: RuoloSicurezza[];
  regole: RegolaRuoloCorso[] | undefined;
}): { righe: RigaScadenzaDati[]; isLoading: boolean } {
  // Grado di rischio della ditta (decide quali regole valgono): letto solo a vista attiva, con la cache condivisa della matrice.
  const { data: ditta } = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta, staleTime: 60_000, retry: 1, enabled: attivo });
  const rischio = ditta?.rischio_ditta ?? null;
  const contesto = useMemo<ContestoRegole>(() => ({ rischioDitta: rischio }), [rischio]);

  const { data: dipendenti = [], isLoading: caricaDipendenti } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
    enabled: attivo,
  });
  const { data: tipiCorso = [], isLoading: caricaCorsi } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
    enabled: attivo,
  });

  const righe = useMemo(() => {
    if (!attivo) return [];
    const obblighi = creaValutatoreObblighi({ attestati, assegnazioni, ruoli, regole, contesto });
    return calcolaRigheDaFormare({ dipendenti, corsi: tipiCorso, attestati, ...obblighi, oggi: new Date() });
  }, [attivo, attestati, assegnazioni, ruoli, regole, contesto, dipendenti, tipiCorso]);

  return { righe, isLoading: attivo && (caricaDipendenti || caricaCorsi) };
}
