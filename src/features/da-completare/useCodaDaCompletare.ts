/*
 * File:      useCodaDaCompletare.ts
 * Percorso:  src/features/da-completare/useCodaDaCompletare.ts
 * Creato:    06/11/2026
 * Stato e azioni della finestra «Da completare»: all'apertura fotografa la coda (così l'ordine non cambia
 * mentre si salva), poi permette di salvare e passare al successivo, saltare o tornare indietro.
 * Salvando si azzera la data di cessazione (chi era stato riabilitato esce dalla coda).
 * Revisioni:
 *   rev 1 — 06/11/2026 08:20 — Prima stesura.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { aggiornaAnagraficaDipendente, registraClasseEMateria, type Dipendente } from "@/lib/api";
import { campiMancanti, ETICHETTA_CAMPO } from "@/features/dipendenti/anagrafica-completa";
import { erroreBlocco, ordinaCoda, precompilaFineContratto, type DatiForm } from "./logica-coda";
import { inCodaDaCompletare } from "./regola-coda";

export function useCodaDaCompletare(open: boolean, dipendenti: Dipendente[]) {
  const qc = useQueryClient();
  const ultimi = useRef(dipendenti);
  ultimi.current = dipendenti;

  const [ids, setIds] = useState<string[]>([]);
  const [indice, setIndice] = useState(0);
  // Il modulo è legato al lavoratore: non mostra mai per un attimo i dati del precedente.
  const [stato, setStato] = useState<{ id: string; dati: DatiForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [completati, setCompletati] = useState<string[]>([]);
  const [saltati, setSaltati] = useState<string[]>([]);
  const [finito, setFinito] = useState(false);
  const [riusaFine, setRiusaFine] = useState(false);
  const [fineRicordata, setFineRicordata] = useState("");

  // All'apertura: fotografia della coda.
  useEffect(() => {
    if (!open) return;
    const coda = ordinaCoda(ultimi.current.filter((d) => inCodaDaCompletare(d)));
    setIds(coda.map((d) => d.id));
    setIndice(0);
    setCompletati([]);
    setSaltati([]);
    setFinito(coda.length === 0);
    setRiusaFine(false);
    setFineRicordata("");
  }, [open]);

  const corrente = useMemo(
    () => dipendenti.find((d) => d.id === ids[indice]) ?? null,
    [dipendenti, ids, indice],
  );

  // Cambia il lavoratore mostrato: il modulo riparte dai suoi dati.
  const idCorrente = corrente?.id;
  useEffect(() => {
    const c = ultimi.current.find((d) => d.id === idCorrente);
    if (!c) {
      setStato(null);
      return;
    }
    const { id: _id, ...dati } = c;
    setStato({ id: c.id, dati: precompilaFineContratto(dati, riusaFine, fineRicordata) });
    // riusaFine e fineRicordata contano solo al cambio di lavoratore
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idCorrente]);

  const form = stato && corrente && stato.id === corrente.id ? stato.dati : null;
  const setForm = (f: DatiForm) => {
    if (corrente) setStato({ id: corrente.id, dati: f });
  };

  // Un lavoratore della coda che nel frattempo non esiste più (eliminato) viene saltato.
  useEffect(() => {
    if (open && !finito && ids.length > 0 && dipendenti.length > 0 && !corrente) {
      if (indice + 1 >= ids.length) setFinito(true);
      else setIndice(indice + 1);
    }
  }, [open, finito, ids, dipendenti, corrente, indice]);

  function vai(i: number) {
    if (i >= ids.length) setFinito(true);
    else setIndice(Math.max(0, i));
  }

  async function salvaEProssimo() {
    if (!form || !corrente) return;
    const errore = erroreBlocco(form);
    if (errore) {
      toast.error(errore);
      return;
    }
    setSaving(true);
    try {
      const daSalvare: DatiForm = { ...form, data_cessazione: null };
      await aggiornaAnagraficaDipendente(corrente.id, daSalvare, corrente.codice_fiscale);
      if (
        (daSalvare.classe_concorso ?? "") !== (corrente.classe_concorso ?? "") ||
        (daSalvare.materia ?? "") !== (corrente.materia ?? "")
      ) {
        await registraClasseEMateria(daSalvare.classe_concorso, daSalvare.materia);
      }
      const restano = campiMancanti(daSalvare);
      if (restano.length > 0) {
        toast.warning(`Salvato. Mancano ancora: ${restano.map((c) => ETICHETTA_CAMPO[c]).join(", ")}`);
      } else {
        toast.success("Salvato");
      }
      if (riusaFine && daSalvare.data_fine_contratto) setFineRicordata(daSalvare.data_fine_contratto);
      setCompletati((c) => (c.includes(corrente.id) ? c : [...c, corrente.id]));
      setSaltati((s) => s.filter((x) => x !== corrente.id));
      qc.invalidateQueries({ queryKey: ["dipendenti"] });
      qc.invalidateQueries({ queryKey: ["attestati"] });
      vai(indice + 1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function salta() {
    if (corrente) setSaltati((s) => (s.includes(corrente.id) || completati.includes(corrente.id) ? s : [...s, corrente.id]));
    vai(indice + 1);
  }

  function indietro() {
    if (finito) {
      setFinito(false);
      setIndice(Math.max(0, ids.length - 1));
    } else if (indice > 0) setIndice(indice - 1);
  }

  /** Riparte dai soli lavoratori saltati. */
  function rivediSaltati() {
    setIds(saltati);
    setSaltati([]);
    setIndice(0);
    setFinito(saltati.length === 0);
  }

  return {
    totale: ids.length,
    indice,
    corrente,
    form,
    setForm,
    saving,
    completati: completati.length,
    saltati: saltati.length,
    finito,
    riusaFine,
    setRiusaFine,
    fineRicordata,
    salvaEProssimo,
    salta,
    indietro,
    rivediSaltati,
  };
}
