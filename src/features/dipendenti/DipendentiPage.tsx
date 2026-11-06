/*
 * File:      DipendentiPage.tsx
 * Percorso:  src/features/dipendenti/DipendentiPage.tsx
 * Pagina Dipendenti: compone elenco, filtri, scheda e modulo con la logica degli hook.
 * Revisioni:
 *   rev 2 — 26/10/2026 20:10 — Prop bottoniInBarra: nel Cruscotto HR i bottoni Aggancia/Aggiungi
 *            stanno nella barra fissa in alto, non nella scheda.
 *   rev 3 — 28/10/2026 10:00 — Filtro stato contrattuale (In forza/In scadenza/Cessati/Tutti).
 *   rev 4 — 05/11/2026 17:50 — Modifica anagrafica per ID con conferma (speciale se cambia il CF).
 *   rev 5 — 06/11/2026 08:20 — Finestra «Da completare» (uno alla volta) apribile dal pulsante dell'elenco e dall'esito dell'importazione;
 *            la modifica anagrafica registra classe e materia nel catalogo quando cambiano.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aggiornaAnagraficaDipendente, registraClasseEMateria, type Dipendente } from "@/lib/api";
import { CHIAVE_DITTA, getDitta } from "@/lib/api/ditta";
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
import { SelettoreStato } from "@/features/contratti/SelettoreStato";
import { DialogDaCompletare } from "@/features/da-completare/DialogDaCompletare";
import { filtraPerStato, type FiltroStato } from "@/features/contratti/contratto";

export function DipendentiPage({
  senzaIntestazione = false,
  bottoniInBarra = false,
}: { senzaIntestazione?: boolean; bottoniInBarra?: boolean } = {}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Dipendente, "id"> | null>(null);
  const [filtroReparto, setFiltroReparto] = useState(TUTTI);
  const [filtroRuolo, setFiltroRuolo] = useState(TUTTI);
  const [filtroStato, setFiltroStato] = useState<FiltroStato>("in_forza");
  const [modifica, setModifica] = useState(false);
  const [savingMod, setSavingMod] = useState(false);
  const [codaAperta, setCodaAperta] = useState(false);
  const qc = useQueryClient();
  // ATECO primario della ditta: proposto di default nei nuovi lavoratori (resta modificabile).
  const { data: dittaDb } = useQuery({ queryKey: CHIAVE_DITTA, queryFn: getDitta });
  const atecoDitta = dittaDb?.codici_ateco?.[0]?.codice ?? "";

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
    () => filtraPerStato(filtraDipendenti({ dipendenti, q, filtroReparto, filtroRuolo, ruoliCatalogo, assegnazioni, attestati }), filtroStato, new Date(), attestati),
    [filtroStato, dipendenti, q, filtroReparto, filtroRuolo, ruoliCatalogo, assegnazioni, attestati],
  );

  const corrente = dipendenti.find((d) => d.id === sel) ?? null;

  function avviaModifica() {
    if (!corrente) return;
    const { id: _id, ...dati } = corrente;
    setModifica(true);
    setForm(dati);
  }

  async function salvaModifica() {
    if (!form || !corrente) return;
    if (!form.codice_fiscale.trim() || !form.cognome.trim() || !form.nome.trim()) {
      toast.error("Cognome, nome e codice fiscale sono obbligatori");
      return;
    }
    const cambiaCF = corrente.codice_fiscale.trim().toUpperCase() !== form.codice_fiscale.trim().toUpperCase();
    const msg = cambiaCF
      ? "Stai modificando il codice fiscale del lavoratore.\n\nL'operazione aggiornerà i riferimenti associati.\n\nConfermi?"
      : "Sei sicuro di voler salvare le modifiche?";
    if (!window.confirm(msg)) return;
    setSavingMod(true);
    try {
      await aggiornaAnagraficaDipendente(corrente.id, form, corrente.codice_fiscale);
      if ((form.classe_concorso ?? "") !== (corrente.classe_concorso ?? "") || (form.materia ?? "") !== (corrente.materia ?? "")) {
        await registraClasseEMateria(form.classe_concorso, form.materia);
      }
      toast.success("Anagrafica aggiornata");
      setForm(null);
      setModifica(false);
      qc.invalidateQueries({ queryKey: ["dipendenti"] });
      qc.invalidateQueries({ queryKey: ["attestati"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingMod(false);
    }
  }
  const ruoliAttivi = ruoliCatalogo.filter((r) => r.attivo);

  return (
    <main className="min-h-screen bg-background">
      {!senzaIntestazione && (
        <IntestazioneDipendenti totale={dipendenti.length} onCompletaUnoAUno={() => setCodaAperta(true)} />
      )}

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
            onNuovo={() => {
              setModifica(false);
              setForm({ ...VUOTO, codice_ateco: atecoDitta });
            }}
          />
          <SelettoreStato
            valore={filtroStato}
            onCambia={setFiltroStato}
            dipendenti={dipendenti}
            attestati={attestati}
            onCompletaUnoAUno={() => setCodaAperta(true)}
          />
          <ListaDipendenti isLoading={isLoading} filtrati={filtrati} attestati={attestati} sel={sel} setSel={setSel} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)]">
          {form ? (
            <FormNuovoDipendente
              modo={modifica ? "modifica" : "nuovo"}
              form={form}
              setForm={setForm}
              repartiAttivi={repartiAttivi}
              saving={modifica ? savingMod : saving}
              onSalva={modifica ? salvaModifica : salva}
              onAnnulla={() => {
                setForm(null);
                setModifica(false);
              }}
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
              bottoniInBarra={bottoniInBarra}
              onCambiaReparto={(v) => cambiaReparto(corrente.id, v)}
              onSpuntaRuolo={spuntaRuolo}
              onSegnaCompletata={segnaCompletata}
              onModifica={avviaModifica}
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Seleziona un dipendente per vedere i suoi attestati, oppure aggiungine uno nuovo.
            </p>
          )}
        </div>
      </section>

      <DialogDaCompletare
        open={codaAperta}
        onClose={() => setCodaAperta(false)}
        dipendenti={dipendenti}
        repartiAttivi={repartiAttivi}
      />
    </main>
  );
}
