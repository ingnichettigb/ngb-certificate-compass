/*
 * File:      DipendentiPage.tsx
 * Percorso:  src/features/dipendenti/DipendentiPage.tsx
 * Pagina Dipendenti: compone elenco, filtri, scheda e modulo con la logica degli hook.
 */
import { useMemo, useState } from "react";
import { type Dipendente } from "@/lib/api";
import { TUTTI, VUOTO } from "./types";
import { calcolaRepartiFiltro, filtraDipendenti } from "./filtri";
import { IntestazioneDipendenti } from "./components/IntestazioneDipendenti";
import { FiltriDipendenti } from "./components/FiltriDipendenti";
import { ListaDipendenti } from "./components/ListaDipendenti";
import { FormNuovoDipendente } from "./components/FormNuovoDipendente";
import { SchedaDipendente } from "./components/SchedaDipendente";
import { useDatiDipendenti } from "./hooks/useDatiDipendenti";
import { useOrdinamentoAttestati } from "./hooks/useOrdinamentoAttestati";
import { useAzioniDipendente } from "./hooks/useAzioniDipendente";

export function DipendentiPage({ senzaIntestazione = false }: { senzaIntestazione?: boolean } = {}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Dipendente, "id"> | null>(null);
  const [filtroReparto, setFiltroReparto] = useState(TUTTI);
  const [filtroRuolo, setFiltroRuolo] = useState(TUTTI);

  const { repartiElenco, dipendenti, isLoading, attestati, ruoliCatalogo, assegnazioni, integrazioni } =
    useDatiDipendenti();
  const ordinamento = useOrdinamentoAttestati();
  const { saving, spuntaRuolo, segnaCompletata, salva, cambiaReparto } = useAzioniDipendente({ sel, form, setForm });

  // Reparti scelti dal lavoratore nel modulo (solo quelli attivi).
  const repartiAttivi = useMemo(
    () => repartiElenco.filter((r) => r.attivo).map((r) => r.nome),
    [repartiElenco],
  );

  // Per il filtro: elenco + valori già presenti nei dipendenti.
  const repartiFiltro = useMemo(() => calcolaRepartiFiltro(repartiElenco, dipendenti), [repartiElenco, dipendenti]);

  const filtrati = useMemo(
    () => filtraDipendenti({ dipendenti, q, filtroReparto, filtroRuolo, ruoliCatalogo, assegnazioni, attestati }),
    [dipendenti, q, filtroReparto, filtroRuolo, ruoliCatalogo, assegnazioni, attestati],
  );

  const corrente = dipendenti.find((d) => d.id === sel) ?? null;
  const ruoliAttivi = ruoliCatalogo.filter((r) => r.attivo);

  return (
    <main className="min-h-screen bg-background">
      {!senzaIntestazione && <IntestazioneDipendenti totale={dipendenti.length} />}

      <section className="mx-auto grid max-w-[1400px] gap-6 px-5 py-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
          <FiltriDipendenti
            q={q}
            setQ={setQ}
            filtroReparto={filtroReparto}
            setFiltroReparto={setFiltroReparto}
            filtroRuolo={filtroRuolo}
            setFiltroRuolo={setFiltroRuolo}
            repartiFiltro={repartiFiltro}
            ruoliAttivi={ruoliAttivi}
            onNuovo={() => setForm({ ...VUOTO })}
          />
          <ListaDipendenti isLoading={isLoading} filtrati={filtrati} attestati={attestati} sel={sel} setSel={setSel} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          {form ? (
            <FormNuovoDipendente
              form={form}
              setForm={setForm}
              repartiAttivi={repartiAttivi}
              saving={saving}
              onSalva={salva}
              onAnnulla={() => setForm(null)}
            />
          ) : corrente ? (
            <SchedaDipendente
              corrente={corrente}
              attestati={attestati}
              integrazioni={integrazioni}
              ruoliCatalogo={ruoliCatalogo}
              assegnazioni={assegnazioni}
              ruoliAttivi={ruoliAttivi}
              repartiAttivi={repartiAttivi}
              ordinamento={ordinamento}
              onCambiaReparto={(v) => cambiaReparto(corrente.id, v)}
              onSpuntaRuolo={spuntaRuolo}
              onSegnaCompletata={segnaCompletata}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Seleziona un dipendente per vedere i suoi attestati, oppure aggiungine uno nuovo.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
