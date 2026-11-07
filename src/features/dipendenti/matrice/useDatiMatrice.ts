/*
 * File:      useDatiMatrice.ts
 * Percorso:  src/features/dipendenti/matrice/useDatiMatrice.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: letture dal database, mappe di assegnazioni e attestati,
 *            regole «obbligo / attestato» e assegnazione del ruolo con un clic. Nessun cambio di comportamento.
 */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDipendenti,
  getTipiCorso,
  getAttestati,
  getRuoliSicurezza,
  getAssegnazioniRuoli,
  impostaRuoloDipendente,
  type Dipendente,
  type TipoCorso,
  CHIAVE_RUOLI,
  CHIAVE_ASSEGNAZIONI_RUOLI,
} from "@/lib/api";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import {
  trovaRuoloPerCorso,
  trovaRuoloPerChiaveGruppo,
  isCorsoObbligatorioPerDipendente,
} from "./mappatura-ruoli-corsi";

export function useDatiMatrice() {
  const queryClient = useQueryClient();

  const { data: dipendenti = [] } = useQuery({
    queryKey: ["dipendenti"],
    queryFn: getDipendenti,
  });

  const { data: tipiCorso = [] } = useQuery({
    queryKey: ["tipi_corso"],
    queryFn: getTipiCorso,
  });

  const { data: attestati = [] } = useQuery({
    queryKey: ["attestati"],
    queryFn: () => getAttestati(),
  });

  const { data: ruoli = [] } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
  });

  const { data: assegnazioni = [] } = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
  });

  const corsiCatalogo = useMemo(() => {
    return [...tipiCorso].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));
  }, [tipiCorso]);

  // Conteggio corsi per gruppo
  const conteggiCorsiPerGruppo = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of corsiCatalogo) {
      const g = assegnaGruppoArgomento(c);
      counts[g.chiave] = (counts[g.chiave] || 0) + 1;
    }
    return counts;
  }, [corsiCatalogo]);

  const mappaAssegnazioni = useMemo(() => {
    const set = new Set<string>();
    for (const a of assegnazioni) {
      set.add(`${a.dipendente_id}_${a.ruolo_id}`);
    }
    return set;
  }, [assegnazioni]);

  const mappaAttestatiValidi = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const att of attestati) {
      if (att.stato_validazione !== "Approvato" && att.stato_validazione !== "In attesa") continue;
      if (!att.dipendente_id || !att.tipo_corso_id) continue;
      if (!map.has(att.dipendente_id)) {
        map.set(att.dipendente_id, new Set());
      }
      map.get(att.dipendente_id)!.add(att.tipo_corso_id);
    }
    return map;
  }, [attestati]);

  function haObbligoCorso(dipendenteId: string, corso: TipoCorso): boolean {
    return isCorsoObbligatorioPerDipendente(dipendenteId, corso, ruoli, mappaAssegnazioni);
  }

  function haAttestatoCorso(dipendenteId: string, corso: TipoCorso): boolean {
    const set = mappaAttestatiValidi.get(dipendenteId);
    return set ? set.has(corso.id) : false;
  }

  function haObbligoNelGruppo(dipendenteId: string, gruppoChiave: string): boolean {
    const ruoloDelGruppo = trovaRuoloPerChiaveGruppo(gruppoChiave, ruoli);
    if (
      ruoloDelGruppo &&
      (ruoloDelGruppo.obbligatorio_tutti ||
        mappaAssegnazioni.has(`${dipendenteId}_${ruoloDelGruppo.id}`))
    ) {
      return true;
    }
    const corsiDelGruppo = corsiCatalogo.filter(
      (c) => assegnaGruppoArgomento(c).chiave === gruppoChiave,
    );
    return corsiDelGruppo.some((c) => haObbligoCorso(dipendenteId, c));
  }

  async function handleToggleObbligo(dipendente: Dipendente, corso: TipoCorso) {
    const ruolo = trovaRuoloPerCorso(corso, ruoli);
    if (!ruolo) {
      toast.error(`Nessun ruolo di sicurezza censito per "${corso.nome_corso}"`);
      return;
    }

    const giaAssegnato = mappaAssegnazioni.has(`${dipendente.id}_${ruolo.id}`);
    const nuovoStato = !giaAssegnato;

    try {
      await impostaRuoloDipendente(dipendente.id, ruolo.id, nuovoStato);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI }),
        queryClient.invalidateQueries({ queryKey: CHIAVE_RUOLI }),
      ]);
      toast.success(
        nuovoStato
          ? `Ruolo "${ruolo.nome}" assegnato a ${dipendente.cognome} ${dipendente.nome}`
          : `Ruolo "${ruolo.nome}" rimosso per ${dipendente.cognome} ${dipendente.nome}`,
      );
    } catch (e) {
      toast.error("Errore salvataggio", { description: (e as Error).message });
    }
  }

  return {
    dipendenti,
    ruoli,
    corsiCatalogo,
    conteggiCorsiPerGruppo,
    mappaAssegnazioni,
    haObbligoCorso,
    haAttestatoCorso,
    haObbligoNelGruppo,
    handleToggleObbligo,
  };
}
