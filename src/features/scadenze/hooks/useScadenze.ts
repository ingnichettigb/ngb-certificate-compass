/*
 * File:      useScadenze.ts
 * Percorso:  src/features/scadenze/hooks/useScadenze.ts
 * Revisione: 4 — 28/11/2026 09:11
 * Dati, filtri e ordinamento della pagina Scadenze.
 * Revisioni:
 * - Rev 2 (2026-11-06 18:30): Integrazione ruoli/assegnazioni e filtro «Solo incarichi attualmente assegnati».
 * - Rev 3 (2026-11-21): Legge la Tabella 02 e la passa al filtro: il ruolo di un corso segue le regole.
 * - Rev 4 (28/11/2026 09:11): Filtro «Ruolo» (un solo ruolo, dal catalogo ruoli_sicurezza); i corsi proposti sono quelli del ruolo;
 *   scelto un ruolo l'ordine diventa «per persona, prima il corso base, poi gli altri per data»; il corso si azzera al cambio ruolo.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CHIAVE_ASSEGNAZIONI_RUOLI,
  CHIAVE_RUOLI,
  getAssegnazioniRuoli,
  getAttestati,
  getRuoliSicurezza,
} from "@/lib/api";
import { TUTTI, type Vista, type ColonnaSort, type DirezioneSort } from "../types";
import { elencoReparti, elencoCorsi, filtraScadenze } from "../filtri";
import { elencoCorsiDelRuolo, ruoliPerFiltro } from "../ruolo-corsi";
import { useRegoleRuoloCorso } from "@/features/dipendenti/matrice/useRegoleRuoloCorso";

export function useScadenze() {
  const [vista, setVista] = useState<Vista>("Scaduti");
  const [q, setQ] = useState("");
  const [reparto, setReparto] = useState(TUTTI);
  const [ruoloSelezionato, setRuoloSelezionato] = useState(TUTTI);
  const [corsoSelezionato, setCorsoSelezionato] = useState(TUTTI);
  const [sortCol, setSortCol] = useState<ColonnaSort>("scadenza");
  const [sortDir, setSortDir] = useState<DirezioneSort>("asc");
  const [soloIncarichiAssegnati, setSoloIncarichiAssegnati] = useState(true);

  const { data: attestati = [], isLoading: loadingAttestati } = useQuery({
    queryKey: ["attestati", "Tutti"],
    queryFn: () => getAttestati("Tutti"),
  });

  const { data: ruoliCatalogo = [], isLoading: loadingRuoli } = useQuery({
    queryKey: CHIAVE_RUOLI,
    queryFn: getRuoliSicurezza,
  });

  const { data: assegnazioni = [], isLoading: loadingAssegnazioni } = useQuery({
    queryKey: CHIAVE_ASSEGNAZIONI_RUOLI,
    queryFn: getAssegnazioniRuoli,
  });

  const regole = useRegoleRuoloCorso();

  const reparti = useMemo(() => elencoReparti(attestati), [attestati]);
  const ruoli = useMemo(() => ruoliPerFiltro(ruoliCatalogo, regole), [ruoliCatalogo, regole]);
  const ruolo = useMemo(
    () => (ruoloSelezionato === TUTTI ? undefined : ruoliCatalogo.find((r) => r.id === ruoloSelezionato)),
    [ruoloSelezionato, ruoliCatalogo],
  );
  // Con un ruolo scelto il menù Corso propone solo i corsi di quel ruolo (prima il base, poi gli aggiornamenti).
  const corsi = useMemo(
    () => (ruolo ? elencoCorsiDelRuolo(attestati, ruolo, ruoliCatalogo, regole) : elencoCorsi(attestati)),
    [attestati, ruolo, ruoliCatalogo, regole],
  );

  /** Cambio ruolo: il corso si azzera; l'ordine diventa «per ruolo» (per persona, base e poi per data), tornando a «Scadenza» senza ruolo. */
  function cambiaRuolo(id: string) {
    setRuoloSelezionato(id);
    setCorsoSelezionato(TUTTI);
    setSortCol(id === TUTTI ? "scadenza" : "ruolo");
    setSortDir("asc");
  }

  function cambiaOrdinamento(colonna: ColonnaSort) {
    if (sortCol === colonna) {
      setSortDir((prec) => (prec === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(colonna);
      setSortDir("asc");
    }
  }

  const righe = useMemo(
    () =>
      filtraScadenze({
        attestati,
        vista,
        q,
        reparto,
        ruoloSelezionato,
        corsoSelezionato,
        sortCol,
        sortDir,
        oggi: new Date(),
        soloIncarichiAssegnati,
        ruoliCatalogo,
        assegnazioni,
        regole,
      }),
    [attestati, vista, q, reparto, ruoloSelezionato, corsoSelezionato, sortCol, sortDir, soloIncarichiAssegnati, ruoliCatalogo, assegnazioni, regole],
  );

  return {
    vista,
    setVista,
    q,
    setQ,
    reparto,
    setReparto,
    ruoloSelezionato,
    cambiaRuolo,
    ruoli,
    ruolo,
    corsoSelezionato,
    setCorsoSelezionato,
    sortCol,
    sortDir,
    isLoading: loadingAttestati || loadingRuoli || loadingAssegnazioni,
    reparti,
    corsi,
    righe,
    cambiaOrdinamento,
    soloIncarichiAssegnati,
    setSoloIncarichiAssegnati,
  };
}
