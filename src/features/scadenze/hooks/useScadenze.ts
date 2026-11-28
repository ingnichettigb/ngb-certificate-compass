/*
 * File:      useScadenze.ts
 * Percorso:  src/features/scadenze/hooks/useScadenze.ts
 * Revisione: 5 — 28/11/2026 10:01
 * Dati, filtri e ordinamento della pagina Scadenze.
 * Revisioni:
 * - Rev 2 (2026-11-06 18:30): Integrazione ruoli/assegnazioni e filtro «Solo incarichi attualmente assegnati».
 * - Rev 3 (2026-11-21): Legge la Tabella 02 e la passa al filtro: il ruolo di un corso segue le regole.
 * - Rev 4 (28/11/2026 09:11): Filtro «Ruolo» (un solo ruolo, dal catalogo ruoli_sicurezza); i corsi proposti sono quelli del ruolo;
 *   scelto un ruolo l'ordine diventa «per persona, prima il corso base, poi gli altri per data»; il corso si azzera al cambio ruolo.
 * - Rev 5 (28/11/2026 10:01): Vista «Da formare / Mancanti» (righe da useRigheDaFormare); in quella vista il menù Corso propone i corsi attesi
 *   e il corso si azzera quando si entra o si esce dalla vista.
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
import { TUTTI, VISTA_DA_FORMARE, type Vista, type ColonnaSort, type DirezioneSort } from "../types";
import { elencoReparti, elencoCorsi, filtraScadenze } from "../filtri";
import { elencoCorsiDelRuolo, ruoliPerFiltro } from "../ruolo-corsi";
import { nomiCorsiDaFormare } from "../da-formare";
import { useRegoleRuoloCorso } from "@/features/dipendenti/matrice/useRegoleRuoloCorso";
import { useRigheDaFormare } from "./useRigheDaFormare";

export function useScadenze() {
  const [vista, setVistaGrezza] = useState<Vista>("Scaduti");
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

  const daFormare = vista === VISTA_DA_FORMARE;
  const { righe: righeDaFormare, isLoading: loadingDaFormare } = useRigheDaFormare({
    attivo: daFormare,
    attestati,
    assegnazioni,
    ruoli: ruoliCatalogo,
    regole,
  });

  /** Cambio vista: entrando o uscendo da «Da formare / Mancanti» l'elenco dei corsi cambia, quindi il corso scelto si azzera. */
  function setVista(v: Vista) {
    if ((v === VISTA_DA_FORMARE) !== daFormare) setCorsoSelezionato(TUTTI);
    setVistaGrezza(v);
  }

  const reparti = useMemo(() => elencoReparti(attestati), [attestati]);
  const ruoli = useMemo(() => ruoliPerFiltro(ruoliCatalogo, regole), [ruoliCatalogo, regole]);
  const ruolo = useMemo(
    () => (ruoloSelezionato === TUTTI ? undefined : ruoliCatalogo.find((r) => r.id === ruoloSelezionato)),
    [ruoloSelezionato, ruoliCatalogo],
  );
  // Con un ruolo scelto il menù Corso propone solo i corsi di quel ruolo (prima il base, poi gli aggiornamenti).
  const corsi = useMemo(() => {
    // «Da formare»: i corsi proposti sono quelli attesi, anche se nessuno li ha mai svolti (non sono negli attestati).
    if (daFormare) return nomiCorsiDaFormare(righeDaFormare, ruolo, ruoliCatalogo, regole);
    return ruolo ? elencoCorsiDelRuolo(attestati, ruolo, ruoliCatalogo, regole) : elencoCorsi(attestati);
  }, [daFormare, righeDaFormare, attestati, ruolo, ruoliCatalogo, regole]);

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
        righeDaFormare,
      }),
    [attestati, vista, q, reparto, ruoloSelezionato, corsoSelezionato, sortCol, sortDir, soloIncarichiAssegnati, ruoliCatalogo, assegnazioni, regole, righeDaFormare],
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
    isLoading: loadingAttestati || loadingRuoli || loadingAssegnazioni || loadingDaFormare,
    reparti,
    corsi,
    righe,
    cambiaOrdinamento,
    soloIncarichiAssegnati,
    setSoloIncarichiAssegnati,
  };
}
