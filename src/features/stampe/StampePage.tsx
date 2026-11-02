/*
 * File:      StampePage.tsx
 * Percorso:  src/features/stampe/StampePage.tsx
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Pagina Stampe & Report: filtri a sinistra, anteprima A4 a destra, stampa/PDF.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getAttestati, getDipendenti } from "@/lib/api";
import { getDitta } from "@/lib/api/ditta";
import { GRUPPI_ARGOMENTO } from "@/features/tipi-corso/tipi-raggruppamento";
import { calcolaRighe, FILTRI_INIZIALI, TITOLI_MODELLO, TUTTI, type FiltriStampa as Filtri } from "./dati-stampa";
import { FiltriStampa } from "./components/FiltriStampa";
import { FoglioStampa } from "./components/FoglioStampa";
import { ContenutoStampa } from "./components/ContenutoStampa";

export function StampePage() {
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_INIZIALI);
  const att = useQuery({ queryKey: ["stampe-attestati"], queryFn: () => getAttestati("Approvato") });
  const dip = useQuery({ queryKey: ["dipendenti"], queryFn: getDipendenti });
  const ditta = useQuery({ queryKey: ["ditta"], queryFn: getDitta });

  const dipendenti = useMemo(
    () => [...(dip.data ?? [])]
      .filter((d) => filtri.includiCessati || d.stato_lavoratore !== "cessato")
      .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it")),
    [dip.data, filtri.includiCessati],
  );
  const reparti = useMemo(() => [...new Set((dip.data ?? []).map((d) => d.reparto).filter(Boolean) as string[])].sort(), [dip.data]);
  const righe = useMemo(() => calcolaRighe(att.data ?? [], filtri), [att.data, filtri]);

  const parti = [
    filtri.gruppo !== TUTTI && GRUPPI_ARGOMENTO.find((g) => g.chiave === filtri.gruppo)?.titolo,
    filtri.reparto !== TUTTI && `Reparto ${filtri.reparto}`,
    filtri.finestra === "scaduti" && "Solo scaduti",
    ["90", "180", "365"].includes(filtri.finestra) && `Scadenza entro ${filtri.finestra} giorni`,
    filtri.includiCessati && "Inclusi cessati",
  ].filter(Boolean);
  const orizzontale = filtri.modello !== "scheda";

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
        <FiltriStampa filtri={filtri} onChange={setFiltri} reparti={reparti} dipendenti={dipendenti} conteggio={righe.length} />
        {att.isLoading || dip.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Caricamento…</div>
        ) : (
          <FoglioStampa
            titolo={TITOLI_MODELLO[filtri.modello]}
            sottotitolo={parti.length ? parti.join(" · ") : undefined}
            orizzontale={orizzontale}
            ditta={ditta.data}
            mostraFirme={filtri.mostraFirme && filtri.modello !== "scheda"}
          >
            <ContenutoStampa filtri={filtri} righe={righe} dipendenti={dip.data ?? []} ditta={ditta.data} />
          </FoglioStampa>
        )}
      </main>
    </div>
  );
}
