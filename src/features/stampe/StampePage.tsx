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
 *   rev 9 — 07/11/2026 — Tolta la freccia «Home»: c'è la barra di navigazione.
 *   rev 8 — 07/11/2026 — Colonne tolte/aggiunte (+) e larghezze ridimensionabili, ricordate per ogni tipo di documento; le scelte
 *                        valgono anche per stampa, CSV ed Excel. «Ripristina colonne» azzera le scelte del documento corrente.
 *   rev 10 — 08/11/2026 — Stessa pagina anche per le stampe predefinite (prop «predefinita»): filtri e colonne di partenza già
 *                         impostati, pannello filtri nascosto, raggruppamento con salto pagina.
 *   rev 12 — 08/11/2026 — Scelta Tutti / Solo docenti / Solo ATA nelle stampe di scadenza (carta con «destinatari»), righe «Manca»,
 *                        colonne spostabili (trascinamento e frecce) e ricordate per ogni stampa.
 *   rev 11 — 08/11/2026 14:40 — Integrazione BarraGruppiPredefinite nella stampa predefinita per gruppi, compattazione testata (padding py-2.5)
 *                               e filtro reattivo per singolo gruppo su tabella, PDF, CSV ed Excel.
 *   rev 12 — 08/11/2026 — «Stampa» (stampante) e «PDF» separati: il PDF si genera e si scarica direttamente, con testo reale
 *                         modificabile (esporta-pdf.ts), senza passare dalla stampante PDF installata.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAttestati, getDipendenti } from "@/lib/api";
import { CHIAVE_ASSEGNAZIONI_RUOLI, CHIAVE_RUOLI, getAssegnazioniRuoli, getRuoliSicurezza } from "@/lib/api/ruoli";
import { getDitta } from "@/lib/api/ditta";
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import {
  calcolaRighe, calcolaRigheLavoratori, colonnePerVista, dataIt, FILTRI_INIZIALI, gruppiColonne, intersezioneId, lavoratoriSenzaMinimi, messaggioVuoto, nuoviArrivati, ruoliDelGruppo, ordinaRighe, prossimoOrdine, testoTotale, titoloStampa, TUTTI, unicoPerLavoratore,
  type Colonna, type FiltriStampa as Filtri, type OrdineColonna,
} from "./dati-stampa";
import { scaricaCsv, scaricaExcel } from "./esporta-file";
import { righeLegenda, scaricaPdf, sezioniPerPdf } from "./esporta-pdf";
import {
  alternaColonna, applicaPreferenze, leggiPreferenze, PREFERENZE_VUOTE, salvaPreferenze, spostaColonna, spostaDi,
  type LarghezzeColonne, type PreferenzeColonne,
} from "./preferenze-colonne";
import { contaPubblico, ETICHETTA_PUBBLICO, filtraPerPubblico, type Pubblico } from "./stampa-pubblico";
import { conFunzione, elencoGruppi, gruppiLavoratore } from "./stampa-gruppi";
import type { StampaPredefinita } from "./stampe-predefinite";
import { FiltriStampa } from "./components/FiltriStampa";
import { FoglioStampa } from "./components/FoglioStampa";
import { ContenutoStampa } from "./components/ContenutoStampa";
import { BarraEsportazione } from "./components/BarraEsportazione";
import { BarraGruppiPredefinite } from "./components/BarraGruppiPredefinite";
import { BarraDestinatari } from "./components/BarraDestinatari";
import { GuidaStampe } from "./components/GuidaStampe";

const distinti = (v: (string | null | undefined)[]) =>
  [...new Set(v.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "it"));

/** Senza prop è la «Stampa personalizzata»; con «predefinita» filtri e colonne di partenza arrivano dalla stampa scelta. */
export function StampePage({ predefinita }: { predefinita?: StampaPredefinita } = {}) {
  const [filtri, setFiltri] = useState<Filtri>(predefinita?.filtri ?? FILTRI_INIZIALI);
  const [pref, setPref] = useState<PreferenzeColonne>(PREFERENZE_VUOTE);
  const [ordine, setOrdine] = useState<OrdineColonna | null>(null);
  const [univoco, setUnivoco] = useState(false);
  const [gruppoScelto, setGruppoScelto] = useState<string | null>(null);
  const [pubblico, setPubblico] = useState<Pubblico>("tutti");

  const att = useQuery({ queryKey: ["stampe-attestati"], queryFn: () => getAttestati("Approvato") });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: ["ditta"], queryFn: getDitta });
  const ruoliQ = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const assQ = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli });

  const conArrivi = filtri.arrivi !== "no";
  const vista = predefinita ? `pre:${predefinita.id}` : `${filtri.modello}|${conArrivi}|${filtri.incompleta}|${filtri.senzaAttestati}`;

  useEffect(() => { setPref(leggiPreferenze(vista)); setOrdine(null); setGruppoScelto(null); setPubblico("tutti"); }, [vista]);
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
  const senzaMinimi = useMemo(
    () => (filtri.senzaAttestati ? lavoratoriSenzaMinimi(tutti, att.data ?? [], new Date(), filtri.senzaModo) : null),
    [filtri.senzaAttestati, filtri.senzaModo, tutti, att.data],
  );
  const soloIds = useMemo(() => intersezioneId(arrivi.ids, senzaMinimi), [arrivi.ids, senzaMinimi]);

  const righeGrezze = useMemo(
    () => filtri.modello === "lavoratori"
      ? calcolaRigheLavoratori(tutti, filtri, assegnazioni, ruoliQ.data ?? [], att.data ?? [], soloIds)
      : calcolaRighe(att.data ?? [], filtri, new Date(), assegnazioni, soloIds, ruoliQ.data ?? [], tutti),
    [att.data, tutti, filtri, assegnazioni, ruoliQ.data, soloIds],
  );

  // Carte di scadenza: scelta del pubblico (Tutti / Solo docenti / Solo ATA); i numeri contano i lavoratori di ogni scelta.
  const conDestinatari = !!predefinita?.destinatari;
  const conteggiPubblico = useMemo(() => contaPubblico(righeGrezze), [righeGrezze]);
  const righePubblico = useMemo(
    () => (conDestinatari ? filtraPerPubblico(righeGrezze, pubblico) : righeGrezze),
    [righeGrezze, conDestinatari, pubblico],
  );

  // Per la stampa raggruppata per gruppi: elenco lavoratori con almeno un gruppo
  const righeConGruppo = useMemo(
    () => (predefinita?.raggruppaPer === "funzione" ? conFunzione(righeGrezze) : []),
    [righeGrezze, predefinita],
  );

  // Elenco dei gruppi presenti con conteggio lavoratori
  const listaGruppi = useMemo(
    () => (predefinita?.raggruppaPer === "funzione" ? elencoGruppi(righeConGruppo) : []),
    [righeConGruppo, predefinita],
  );

  const righeCalcolate = useMemo(() => {
    if (predefinita?.raggruppaPer === "funzione") {
      if (gruppoScelto) {
        return righeConGruppo.filter((r) => gruppiLavoratore(r).includes(gruppoScelto));
      }
      return righeConGruppo;
    }
    if (predefinita?.raggruppaPer === "reparto") return [...righePubblico].sort((a, b) => a.reparto.localeCompare(b.reparto, "it"));
    return righePubblico;
  }, [righePubblico, righeGrezze, righeConGruppo, predefinita, gruppoScelto]);

  const univocoNonApplicabile = filtri.modello === "lavoratori" || filtri.modello === "scheda";
  const univocoAttivo = univoco && !univocoNonApplicabile;
  const righe = useMemo(
    () => (univocoAttivo ? unicoPerLavoratore(righeCalcolate) : righeCalcolate),
    [righeCalcolate, univocoAttivo],
  );

  const colonneBase = predefinita ? predefinita.colonne : colonnePerVista(filtri, righe);
  const colonne = applicaPreferenze(colonneBase, pref, filtri.modello);
  const gruppiAggiungibili = useMemo(() => gruppiColonne(filtri.modello), [filtri.modello]);
  const alternaUnaColonna = (c: Colonna) => {
    if (colonne.includes(c) && colonne.length <= 1) return;
    cambiaPreferenze((p) => alternaColonna(colonneBase, p, c));
  };
  const cambiaLarghezze = (l: LarghezzeColonne) => cambiaPreferenze((p) => ({ ...p, larghezze: l }));
  const spostaUna = (da: Colonna, a: Colonna) => cambiaPreferenze((p) => spostaColonna(colonne, p, da, a));
  const spostaDiUno = (c: Colonna, passo: -1 | 1) => cambiaPreferenze((p) => spostaDi(colonne, p, c, passo));
  const ordineAttivo = ordine && colonne.includes(ordine.colonna) ? ordine : null;
  const righeFile = useMemo(() => ordinaRighe(righe, ordineAttivo), [righe, ordineAttivo]);

  const colonneFile: Colonna[] = filtri.modello === "scheda" ? ["lavoratore", ...colonne.filter((c) => c !== "lavoratore")] : colonne;
  const suffissoPubblico = conDestinatari && pubblico !== "tutti" ? ` – ${ETICHETTA_PUBBLICO[pubblico]}` : "";
  const titolo = predefinita ? `${gruppoScelto ? `${predefinita.titolo} – ${gruppoScelto}` : predefinita.titolo}${suffissoPubblico}` : titoloStampa(filtri);
  const nomeBase = titolo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const nomeRuolo = ruoliPresenti.find((r) => r.id === filtri.ruoloId)?.nome;
  const incarichiAttivi = filtri.modello !== "lavoratori" && filtri.soloIncarichi && ruoliDelGruppo(filtri.gruppo, ruoliCatalogo).length > 0;
  const partiPersonalizzata = [
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

  const partiPredefinita = [
    ...predefinita?.filtriApplicati ?? [],
    gruppoScelto ? `Gruppo: ${gruppoScelto}` : null,
    conDestinatari ? `Per: ${ETICHETTA_PUBBLICO[pubblico]}` : null,
  ].filter(Boolean) as string[];

  const parti = predefinita ? partiPredefinita : partiPersonalizzata;
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

  async function pdf() {
    try {
      await scaricaPdf(nomeBase, {
        titolo,
        sottotitolo,
        ditta: ditta.data,
        orizzontale,
        colonne,
        larghezze: pref.larghezze,
        sezioni: sezioniPerPdf(filtri, righeFile, ordineAttivo, tutti, predefinita?.raggruppaPer, gruppoScelto),
        totale: testoTotale(filtri.modello, righe),
        legenda: righeLegenda(colonne),
      });
    } catch (e) {
      toast.error(`Creazione del PDF non riuscita: ${(e as Error).message}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface print:hidden">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5">
          <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-xs">
            <Link to={predefinita ? "/stampe/predefinite" : "/stampe"}>
              <ArrowLeft className="size-3.5" /> {predefinita ? "Stampe predefinite" : "Scelta stampe"}
            </Link>
          </Button>
          <h1 className="text-base font-semibold">{predefinita ? predefinita.titolo : "Stampa personalizzata"}</h1>
          {!predefinita && (
            <GuidaStampe
              ruoli={ruoliCatalogo}
              onApplica={(f, t) => {
                setFiltri(f);
                toast.success(`Filtri impostati: ${t}`);
              }}
            />
          )}
        </div>
      </header>
      <main className={`mx-auto grid max-w-[1400px] gap-3 p-3 ${predefinita ? "" : "lg:grid-cols-[280px_1fr]"} print:block print:max-w-none print:p-0`}>
        {!predefinita && <FiltriStampa
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
        />}
        {caricamento ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Caricamento…</div>
        ) : (
          <div className="min-w-0">
            {/* Barra pillole per i gruppi di sicurezza */}
            {predefinita?.raggruppaPer === "funzione" && (
              <BarraGruppiPredefinite
                gruppi={listaGruppi}
                totaleLavoratori={righeConGruppo.length}
                gruppoScelto={gruppoScelto}
                onSeleziona={setGruppoScelto}
              />
            )}

            {conDestinatari && <BarraDestinatari scelto={pubblico} conteggi={conteggiPubblico} onSeleziona={setPubblico} />}

            <BarraEsportazione
              colonneTolte={pref.tolte.length}
              colonneAggiunte={pref.aggiunte.length}
              larghezzeScelte={Object.keys(pref.larghezze).length > 0}
              ordineScelto={!!pref.ordine?.length}
              onRipristina={() => cambiaPreferenze(() => PREFERENZE_VUOTE)}
              onStampa={() => window.print()}
              onPdf={pdf}
              onExcel={excel}
              onCsv={() => scaricaCsv(nomeBase, righeFile, colonneFile)}
              univoco={univocoAttivo}
              {...(predefinita ? {} : { onUnivoco: () => setUnivoco((u) => !u) })}
              univocoNonApplicabile={univocoNonApplicabile}
              disabilitato={!righe.length}
            />

            <div className="mb-2 rounded-md border border-emerald-700/40 bg-emerald-50 px-3 py-1 text-xs text-emerald-950 print:hidden dark:bg-emerald-950/30 dark:text-emerald-100">
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
                onSposta={spostaUna}
                onSpostaDi={spostaDiUno}
                ordine={ordineAttivo}
                onOrdina={(c) => setOrdine((o) => prossimoOrdine(o, c))}
                dipendenti={tutti}
                ditta={ditta.data}
                messaggioVuoto={predefinita?.messaggioVuoto ?? messaggioVuoto(filtri, arrivi.inizio, arrivi.senzaData)}
                raggruppaPer={predefinita?.raggruppaPer}
                soloGruppo={gruppoScelto}
              />
            </FoglioStampa>
          </div>
        )}
      </main>
    </div>
  );
}
