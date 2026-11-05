/*
 * File:      StampePage.tsx
 * Percorso:  src/features/stampe/StampePage.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Pagina Stampe & Report: filtri a sinistra, anteprima A4 a destra, stampa/PDF.
 *   rev 2 — 03/11/2026 20:50 — Filtri dinamici da dati reali, elenco lavoratori, colonne rimovibili, esportazione PDF/Excel/CSV.
 *   rev 3 — 05/11/2026 18:30 — Selezione «Nuovi arrivati dell'anno»: limita tutte le stampe ai lavoratori assunti nel periodo.
 *   rev 4 — 05/11/2026 19:50 — Selezione «Anagrafica incompleta», striscia «Filtri attivi», titolo dinamico, messaggi di elenco vuoto.
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
  calcolaRighe, calcolaRigheLavoratori, colonnePerVista, dataIt, FILTRI_INIZIALI, messaggioVuoto, nuoviArrivati, titoloStampa, TUTTI,
  type Colonna, type FiltriStampa as Filtri,
} from "./dati-stampa";
import { scaricaCsv, scaricaExcel } from "./esporta-file";
import { FiltriStampa } from "./components/FiltriStampa";
import { FoglioStampa } from "./components/FoglioStampa";
import { ContenutoStampa } from "./components/ContenutoStampa";
import { BarraEsportazione } from "./components/BarraEsportazione";

const distinti = (v: (string | null | undefined)[]) =>
  [...new Set(v.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "it"));

export function StampePage() {
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_INIZIALI);
  const [tolte, setTolte] = useState<Colonna[]>([]);
  const att = useQuery({ queryKey: ["stampe-attestati"], queryFn: () => getAttestati("Approvato") });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: ["ditta"], queryFn: getDitta });
  const ruoliQ = useQuery({ queryKey: CHIAVE_RUOLI, queryFn: getRuoliSicurezza });
  const assQ = useQuery({ queryKey: CHIAVE_ASSEGNAZIONI_RUOLI, queryFn: getAssegnazioniRuoli });

  const conArrivi = filtri.arrivi !== "no";
  const vista = `${filtri.modello}|${conArrivi}|${filtri.incompleta}`;
  // Cambiando tipo di documento o selezione si riparte dalle colonne predefinite.
  useEffect(() => setTolte([]), [vista]);

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
  const materie = useMemo(
    () => distinti(tutti.filter((d) => filtri.reparto === TUTTI || d.reparto === filtri.reparto).map((d) => d.materia)),
    [tutti, filtri.reparto],
  );

  const arrivi = useMemo(() => nuoviArrivati(tutti, filtri.arrivi, new Date()), [tutti, filtri.arrivi]);

  const righe = useMemo(
    () => filtri.modello === "lavoratori"
      ? calcolaRigheLavoratori(tutti, filtri, assegnazioni, ruoliQ.data ?? [], att.data ?? [], arrivi.ids)
      : calcolaRighe(att.data ?? [], filtri, new Date(), assegnazioni, arrivi.ids),
    [att.data, tutti, filtri, assegnazioni, ruoliQ.data, arrivi.ids],
  );

  const colonne = colonnePerVista(filtri, righe).filter((c) => !tolte.includes(c));
  // Nella scheda individuale il nome è nell'intestazione: nei file esportati serve come colonna.
  const colonneFile: Colonna[] = filtri.modello === "scheda" ? ["lavoratore", ...colonne] : colonne;
  const titolo = titoloStampa(filtri);
  const nomeBase = titolo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const nomeRuolo = ruoliPresenti.find((r) => r.id === filtri.ruoloId)?.nome;
  const parti = [
    conArrivi && `Assunti dal ${dataIt(arrivi.inizio)}`,
    filtri.incompleta && "Solo anagrafiche incomplete",
    filtri.modello !== "lavoratori" && filtri.gruppo !== TUTTI && GRUPPI_ARGOMENTO.find((g) => g.chiave === filtri.gruppo)?.titolo,
    filtri.reparto !== TUTTI && `Reparto ${filtri.reparto}`,
    nomeRuolo && `Ruolo: ${nomeRuolo}`,
    filtri.categoria !== TUTTI && `Categoria: ${filtri.categoria}`,
    filtri.materia !== TUTTI && `Materia: ${filtri.materia}`,
    filtri.modello !== "lavoratori" && filtri.finestra === "scaduti" && "Solo scaduti",
    filtri.modello !== "lavoratori" && filtri.finestra === "270" && "Scadenza entro 9 mesi",
    filtri.modello !== "lavoratori" && ["90", "180", "365"].includes(filtri.finestra) && `Scadenza entro ${filtri.finestra} giorni`,
    filtri.includiCessati && "Inclusi cessati",
  ].filter(Boolean);
  const orizzontale = filtri.modello !== "scheda";
  const unita = filtri.modello === "lavoratori" ? "lavoratori" : "righe";
  const sottotitolo = [...parti, `${righe.length} ${unita}`].join(" · ");
  const caricamento = att.isLoading || dip.isLoading;

  async function excel() {
    try {
      await scaricaExcel(nomeBase, righe, colonneFile);
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
        </div>
      </header>
      <main className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[280px_1fr] print:block print:max-w-none print:p-0">
        <FiltriStampa
          filtri={filtri}
          onChange={setFiltri}
          reparti={reparti}
          ruoli={ruoliPresenti}
          categorie={categorie}
          materie={materie}
          dipendenti={dipendenti}
          conteggio={righe.length}
          infoArrivi={{ inizio: arrivi.inizio, senzaData: arrivi.senzaData }}
        />
        {caricamento ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Caricamento…</div>
        ) : (
          <div className="min-w-0">
            <BarraEsportazione
              colonneTolte={tolte.length}
              onRipristina={() => setTolte([])}
              onPdf={() => window.print()}
              onExcel={excel}
              onCsv={() => scaricaCsv(nomeBase, righe, colonneFile)}
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
                onRimuoviColonna={(c) => setTolte((t) => [...t, c])}
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
