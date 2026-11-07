/*
 * File:      StampePage.tsx
 * Percorso:  src/features/stampe/StampePage.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Pagina Stampe & Report: filtri a sinistra, anteprima A4 a destra, stampa/PDF.
 *   rev 2 — 03/11/2026 20:50 — Filtri dinamici da dati reali, elenco lavoratori, colonne rimovibili, esportazione PDF/Excel/CSV.
 *   rev 3 — 05/11/2026 18:30 — Selezione «Nuovi arrivati dell'anno»: limita tutte le stampe ai lavoratori assunti nel periodo.
 *   rev 4 — 05/11/2026 19:50 — Selezione «Anagrafica incompleta», striscia «Filtri attivi», titolo dinamico, messaggi di elenco vuoto.
 *   rev 5 — 06/11/2026 — Ordinamento A→Z / Z→A dalle intestazioni e pulsante «Univoco»; stampa ed esportazioni seguono la stessa vista.
 *   rev 7 — 07/11/2026 — Guida (i) con ricette «Applica questi filtri»; filtro «Classe di concorso»; «Solo incarichi attualmente assegnati»;
 *                        striscia filtri «Per attestato» / «Per incarico».
 *   rev 6 — 06/11/2026 — Selezione «Senza attestati» (manca Corso base e/o Corso specifico), combinabile con le altre.
 *   rev 8 — 07/11/2026 — Colonne tolte/aggiunte (+) e larghezze ridimensionabili, ricordate per ogni tipo di documento; le scelte
 *                        valgono anche per stampa, CSV ed Excel. «Ripristina colonne» azzera le scelte del documento corrente.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAttestati, getDipendenti } from "@/lib/api";
import { CHIAVE_ASSEGNAZIONI_RUOLI, CHIAVE_RUOLI, getAssegnazioniRuoli, getRuoliSicurezza } from "@/lib/api/ruoli";
import { getDitta } from "@/lib/api/ditta";
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import {
  calcolaRighe, calcolaRigheLavoratori, colonnePerVista, dataIt, FILTRI_INIZIALI, gruppiColonne, intersezioneId, lavoratoriSenzaMinimi, messaggioVuoto, nuoviArrivati, ruoliDelGruppo, ordinaRighe, prossimoOrdine, titoloStampa, TUTTI, unicoPerLavoratore,
  type Colonna, type FiltriStampa as Filtri, type OrdineColonna,
} from "./dati-stampa";
import { scaricaCsv, scaricaExcel } from "./esporta-file";
import {
  alternaColonna, applicaPreferenze, leggiPreferenze, PREFERENZE_VUOTE, salvaPreferenze,
  type LarghezzeColonne, type PreferenzeColonne,
} from "./preferenze-colonne";
import { FiltriStampa } from "./components/FiltriStampa";
import { FoglioStampa } from "./components/FoglioStampa";
import { ContenutoStampa } from "./components/ContenutoStampa";
import { BarraEsportazione } from "./components/BarraEsportazione";
import { GuidaStampe } from "./components/GuidaStampe";

const distinti = (v: (string | null | undefined)[]) =>
  [...new Set(v.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "it"));

export function StampePage() {
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_INIZIALI);
  const [pref, setPref] = useState<PreferenzeColonne>(PREFERENZE_VUOTE);
  const [ordine, setOrdine] = useState<OrdineColonna | null>(null);
  const [univoco, setUnivoco] = useState(false);
  const att = useQuery({ queryKey: ["stampe-attestati"], queryFn: () => getAttestati("Approvato") });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: ["ditta"], queryFn: getDitta });
  const ruoliQ = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const assQ = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli });

  const conArrivi = filtri.arrivi !== "no";
  const vista = `${filtri.modello}|${conArrivi}|${filtri.incompleta}|${filtri.senzaAttestati}`;
  // Cambiando tipo di documento o selezione si ritrovano le colonne e le larghezze che l'utente aveva scelto per quel documento
  // (se non ne ha scelte, quelle predefinite).
  useEffect(() => { setPref(leggiPreferenze(vista)); setOrdine(null); }, [vista]);
  const cambiaPreferenze = (cambia: (p: PreferenzeColonne) => PreferenzeColonne) =>
    setPref((p) => {
      const n = cambia(p);
      salvaPreferenze(vista, n);
      return n;
    });

  const tutti = dip.data ?? [];
  const assegnazioni = assQ.data ?? [];
  const dipendenti = useMemo(
    () => [...tutti]
      .filter((d) => filtri.includiCessati || d.stato_lavoratore !== "cessato")
      .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it")),
    [tutti, filtri.includiCessati],
  );
  const reparti = useMemo(() => distinti(tutti.map((d) => d.reparto)), [tutti]);
  // Solo valori realmente presenti nel database.
  const ruoliPresenti = useMemo(() => {
    const usati = new Set(assegnazioni.map((a) => a.ruolo_id));
    return (ruoliQ.data ?? []).filter((r) => r.attivo && usati.has(r.id)).sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  }, [ruoliQ.data, assegnazioni]);
  const categorie = useMemo(
    () => distinti(tutti.filter((d) => filtri.reparto === TUTTI || d.reparto === filtri.reparto).map((d) => d.sottoreparto)),
    [tutti, filtri.reparto],
  );
  const classi = useMemo(
    () => distinti(tutti.filter((d) => filtri.reparto === TUTTI || d.reparto === filtri.reparto).map((d) => d.classe_concorso)),
    [tutti, filtri.reparto],
  );
  const ruoliCatalogo = useMemo(() => (ruoliQ.data ?? []).filter((r) => r.attivo), [ruoliQ.data]);

  const arrivi = useMemo(() => nuoviArrivati(tutti, filtri.arrivi, new Date()), [tutti, filtri.arrivi]);

  // «Senza attestati»: lavoratori a cui manca il Corso base e/o il Corso specifico; si somma ai nuovi arrivati.
  const senzaMinimi = useMemo(
    () => (filtri.senzaAttestati ? lavoratoriSenzaMinimi(tutti, att.data ?? [], new Date(), filtri.senzaModo) : null),
    [filtri.senzaAttestati, filtri.senzaModo, tutti, att.data],
  );
  const soloIds = useMemo(() => intersezioneId(arrivi.ids, senzaMinimi), [arrivi.ids, senzaMinimi]);

  const righeCalcolate = useMemo(
    () => filtri.modello === "lavoratori"
      ? calcolaRigheLavoratori(tutti, filtri, assegnazioni, ruoliQ.data ?? [], att.data ?? [], soloIds)
      : calcolaRighe(att.data ?? [], filtri, new Date(), assegnazioni, soloIds, ruoliQ.data ?? []),
    [att.data, tutti, filtri, assegnazioni, ruoliQ.data, soloIds],
  );

  // «Univoco» non ha senso dove c'è già un lavoratore per riga (elenco lavoratori) o per sezione (schede).
  const univocoNonApplicabile = filtri.modello === "lavoratori" || filtri.modello === "scheda";
  const univocoAttivo = univoco && !univocoNonApplicabile;
  const righe = useMemo(
    () => (univocoAttivo ? unicoPerLavoratore(righeCalcolate) : righeCalcolate),
    [righeCalcolate, univocoAttivo],
  );

  const colonneBase = colonnePerVista(filtri, righe);
  const colonne = applicaPreferenze(colonneBase, pref, filtri.modello);
  const gruppiAggiungibili = useMemo(() => gruppiColonne(filtri.modello), [filtri.modello]);
  const alternaUnaColonna = (c: Colonna) => {
    // Non si può togliere l'ultima colonna rimasta.
    if (colonne.includes(c) && colonne.length <= 1) return;
    cambiaPreferenze((p) => alternaColonna(colonneBase, p, c));
  };
  const cambiaLarghezze = (l: LarghezzeColonne) => cambiaPreferenze((p) => ({ ...p, larghezze: l }));
  // L'ordine vale solo se la colonna è ancora visibile.
  const ordineAttivo = ordine && colonne.includes(ordine.colonna) ? ordine : null;
  const righeFile = useMemo(() => ordinaRighe(righe, ordineAttivo), [righe, ordineAttivo]);
  // Nella scheda individuale il nome è nell'intestazione: nei file esportati serve come colonna.
  const colonneFile: Colonna[] = filtri.modello === "scheda" ? ["lavoratore", ...colonne.filter((c) => c !== "lavoratore")] : colonne;
  const titolo = titoloStampa(filtri);
  const nomeBase = titolo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const nomeRuolo = ruoliPresenti.find((r) => r.id === filtri.ruoloId)?.nome;
  const incarichiAttivi = filtri.modello !== "lavoratori" && filtri.soloIncarichi && ruoliDelGruppo(filtri.gruppo, ruoliCatalogo).length > 0;
  const parti = [
    conArrivi && `Assunti dal ${dataIt(arrivi.inizio)}`,
    filtri.incompleta && "Solo anagrafiche incomplete",
    filtri.senzaAttestati && (filtri.senzaModo === "nessuno" ? "Senza Corso base né Corso specifico" : "Manca Corso base o Corso specifico"),
    filtri.modello !== "lavoratori" && filtri.gruppo !== TUTTI && `Per attestato: ${GRUPPI_ARGOMENTO.find((g) => g.chiave === filtri.gruppo)?.titolo}`,
    incarichiAttivi && "Solo con incarico assegnato",
    filtri.reparto !== TUTTI && `Reparto ${filtri.reparto}`,
    nomeRuolo && `Per incarico: ${nomeRuolo}`,
    filtri.categoria !== TUTTI && `Categoria: ${filtri.categoria}`,
    filtri.classe !== TUTTI && `Classe di concorso: ${filtri.classe}`,
    filtri.modello !== "lavoratori" && filtri.finestra === "scaduti" && "Solo scaduti",
    filtri.modello !== "lavoratori" && filtri.finestra === "270" && "Scadenza entro 9 mesi",
    filtri.modello !== "lavoratori" && ["90", "180", "365"].includes(filtri.finestra) && `Scadenza entro ${filtri.finestra} giorni`,
    filtri.includiCessati && "Inclusi cessati",
    univocoAttivo && "Univoco: un lavoratore per riga (scadenza più urgente)",
  ].filter(Boolean);
  const orizzontale = filtri.modello !== "scheda";
  const unita = filtri.modello === "lavoratori" || univocoAttivo ? "lavoratori" : "righe";
  const sottotitolo = [...parti, `${righe.length} ${unita}`].join(" · ");
  const caricamento = att.isLoading || dip.isLoading;

  async function excel() {
    try {
      await scaricaExcel(nomeBase, righeFile, colonneFile);
    } catch (e) {
      toast.error(`Esportazione Excel non riuscita: ${(e as Error).message}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <h1 className="text-lg font-semibold">Stampe & Report</h1>
          <GuidaStampe
            ruoli={ruoliCatalogo}
            onApplica={(f, titolo) => {
              setFiltri(f);
              toast.success(`Filtri impostati: ${titolo}`);
            }}
          />
        </div>
      </header>
      <main className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[280px_1fr] print:block print:max-w-none print:p-0">
        <FiltriStampa
          filtri={filtri}
          onChange={setFiltri}
          reparti={reparti}
          ruoli={ruoliPresenti}
          categorie={categorie}
          classi={classi}
          ruoliCatalogo={ruoliCatalogo}
          dipendenti={dipendenti}
          conteggio={righe.length}
          infoArrivi={{ inizio: arrivi.inizio, senzaData: arrivi.senzaData }}
        />
        {caricamento ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Caricamento…</div>
        ) : (
          <div className="min-w-0">
            <BarraEsportazione
              colonneTolte={pref.tolte.length}
              colonneAggiunte={pref.aggiunte.length}
              larghezzeScelte={Object.keys(pref.larghezze).length > 0}
              onRipristina={() => cambiaPreferenze(() => PREFERENZE_VUOTE)}
              onPdf={() => window.print()}
              onExcel={excel}
              onCsv={() => scaricaCsv(nomeBase, righeFile, colonneFile)}
              univoco={univocoAttivo}
              onUnivoco={() => setUnivoco((u) => !u)}
              univocoNonApplicabile={univocoNonApplicabile}
              disabilitato={!righe.length}
            />
            <div className="mb-2 rounded-md border border-emerald-700/40 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-950 print:hidden dark:bg-emerald-950/30 dark:text-emerald-100">
              <b>Filtri attivi:</b> {parti.length ? parti.join(" · ") : "nessuno"} — <b>{righe.length} {unita}</b>
            </div>
            <FoglioStampa
              titolo={titolo}
              sottotitolo={sottotitolo}
              orizzontale={orizzontale}
              ditta={ditta.data}
              mostraFirme={filtri.mostraFirme && filtri.modello !== "scheda"}
            >
              <ContenutoStampa
                filtri={filtri}
                righe={righe}
                colonne={colonne}
                onRimuoviColonna={alternaUnaColonna}
                larghezze={pref.larghezze}
                onLarghezze={cambiaLarghezze}
                gruppiColonne={gruppiAggiungibili}
                onAlternaColonna={alternaUnaColonna}
                ordine={ordineAttivo}
                onOrdina={(c) => setOrdine((o) => prossimoOrdine(o, c))}
                dipendenti={tutti}
                ditta={ditta.data}
                messaggioVuoto={messaggioVuoto(filtri, arrivi.inizio, arrivi.senzaData)}
              />
            </FoglioStampa>
          </div>
        )}
      </main>
    </div>
  );
}
