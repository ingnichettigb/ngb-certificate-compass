/*
 * File:      useFormRiga.ts
 * Percorso:  src/features/operatore/hooks/useFormRiga.ts
 * Modulo dei dati: valori, riga in modifica, campo OCR attivo, copia anagrafica.
 */
import { useState } from "react";
import { toast } from "sonner";
import { pulisciCF } from "@/lib/api";
import { ETICHETTE_OCR, dataDaTesto, pulisciTestoOcr } from "../ocr-testo";
import { NOTA_PREDEFINITA, VUOTA } from "../types";
import type { CampoOcr, CodaRiga, Riga } from "../types";

export function useFormRiga() {
  const [form, setForm] = useState<Omit<Riga, "id">>(VUOTA);
  const [idInModifica, setIdInModifica] = useState<string | null>(null);
  const [campoOcr, setCampoOcr] = useState<CampoOcr | null>(null);

  const set = <K extends keyof Riga>(k: K, v: Riga[K]) => setForm((f) => ({ ...f, [k]: v }));

  function incollaOcr(testoGrezzo: string) {
    if (!campoOcr) return;
    const testo = pulisciTestoOcr(testoGrezzo, campoOcr);
    if (!testo) return void toast.error("Nessun testo valido riconosciuto: riprova con un rettangolo più mirato");
    const c = campoOcr;
    if (c === "codice_fiscale") set("codice_fiscale", pulisciCF(testo));
    else if (c === "cognome" || c === "nome") set(c, testo);
    else if (c === "email") set("email", testo);
    else if (c === "data_corso") {
      const d = dataDaTesto(testo);
      if (!d) return void toast.error(`Data non riconosciuta in: "${testo}"`);
      set("data_corso", d);
    } else if (c === "ore") {
      const n = Number((testo.match(/\d+([.,]\d+)?/)?.[0] ?? "").replace(",", "."));
      if (!n) return void toast.error("Numero ore non trovato");
      set("ore", n);
    } else if (c === "note") set("note", form.note ? form.note + " " + testo : testo);
    else set(c, testo);
    toast.success(`${ETICHETTE_OCR[c]}: ${testo}`);
    setCampoOcr(null);
  }

  function copiaSoloAnagrafica(r: CodaRiga) {
    setForm((f) => ({
      ...f,
      cognome: (r.cognome || "").toUpperCase(),
      nome: (r.nome || "").toUpperCase(),
      codice_fiscale: r.codice_fiscale || "",
      data_nascita: r.data_nascita || "",
      luogo_nascita: r.luogo_nascita || "",
      codice_ateco: r.codice_ateco || "",
      email: r.email || "",
      reparto: r.reparto || "",
      tipo_corso_id: null,
      tipo_corso_nome: "",
      data_corso: "",
      ore: null,
      ente: "",
      argomenti: [],
      esito: "Valido",
      note: NOTA_PREDEFINITA,
      integrazione: "",
    }));
    setIdInModifica(null);
    toast.success(`Anagrafica di ${r.cognome} ${r.nome} copiata nel modulo`);
  }

  /** Riporta il modulo allo stato iniziale. */
  function resetForm() {
    setForm(VUOTA);
    setIdInModifica(null);
    setCampoOcr(null);
  }

  return { form, setForm, set, idInModifica, setIdInModifica, campoOcr, setCampoOcr, incollaOcr, copiaSoloAnagrafica, resetForm };
}
