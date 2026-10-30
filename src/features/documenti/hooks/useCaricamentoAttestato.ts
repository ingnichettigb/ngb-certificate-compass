/*
 * File:      useCaricamentoAttestato.ts
 * Percorso:  src/features/documenti/hooks/useCaricamentoAttestato.ts
 * Stato e logica del caricamento di un attestato PDF (campi, file, anteprima, salvataggio).
 * Revisioni:
 *   - Rev 2 (2026-10-30 20:30): Copia locale: permesso chiesto subito al clic, esito esplicito (nessuna cartella / permesso)
 *     con pulsante «Autorizza e riprova»; il messaggio finale dice se la copia locale non è stata salvata.
 */
import {
  salvaInCartellaSceltaEsito,
  preautorizzaCartellaScelta,
  getUltimaCartella,
} from "@/lib/api/cartelle-multiple";
import { avvisoCopiaLocale } from "@/features/cartelle/avvisi-cartella";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  caricaDocumento,
  cartellaDipendente,
  nomeFilePdf,
  supportaCartellaLocale,
  type Dipendente,
} from "@/lib/api";

export function useCaricamentoAttestato({
  dipendente,
  open,
  onOpenChange,
  onDone,
}: {
  dipendente: Dipendente;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [tipo, setTipo] = useState("");
  const [altro, setAltro] = useState("");
  const [dataCorso, setDataCorso] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [anteprima, setAnteprima] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anchLocale, setAnchLocale] = useState(false);
  const [cartellaDest, setCartellaDest] = useState<string | null>(() => getUltimaCartella());

  useEffect(() => {
    if (!file) {
      setAnteprima(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setAnteprima(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) {
      setTipo("");
      setAltro("");
      setDataCorso("");
      setScadenza("");
      setFile(null);
      setDrag(false);
    }
  }, [open]);

  const etichetta = tipo === "Altro" ? altro.trim() : tipo;
  const nomeFinale = useMemo(() => {
    if (!etichetta || !dataCorso || !scadenza || !file) return null;
    return nomeFilePdf(dipendente.cognome, dipendente.nome, etichetta, dataCorso, dipendente.codice_fiscale);
  }, [etichetta, dataCorso, scadenza, file, dipendente]);

  function accetta(f: File | null | undefined) {
    if (!f) return;
    const ok = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!ok) {
      toast.error("Sono ammessi solo file PDF");
      return;
    }
    setFile(f);
  }

  async function conferma() {
    if (!nomeFinale || !file) return;
    const nomeFile = nomeFinale;
    const pdf = file;
    const destinazione = cartellaDest;
    const sottocartella = cartellaDipendente(dipendente);

    /** Scrive la copia sul PC. Restituisce true se salvata; altrimenti avvisa con il motivo preciso. */
    async function tentaCopiaLocale(): Promise<boolean> {
      try {
        const r = await salvaInCartellaSceltaEsito(destinazione, pdf, nomeFile, sottocartella);
        if (r.esito === "ok") {
          toast.success(`Copia salvata nella cartella "${r.cartella}"`);
          return true;
        }
        avvisoCopiaLocale(r, () => void tentaCopiaLocale());
        return false;
      } catch (e) {
        if ((e as DOMException)?.name !== "AbortError") {
          toast.error("Copia locale non riuscita", { description: (e as Error).message });
        }
        return false;
      }
    }

    setBusy(true);
    try {
      // Il permesso di scrittura si chiede ora (subito dopo il clic): dopo il caricamento online il browser lo rifiuterebbe.
      if (anchLocale && supportaCartellaLocale()) {
        try {
          await preautorizzaCartellaScelta(destinazione);
        } catch {
          /* l'esito preciso viene gestito dopo il caricamento */
        }
      }
      await caricaDocumento({
        dipendente,
        tipo,
        tipoPersonalizzato: tipo === "Altro" ? altro.trim() : null,
        dataCorso,
        dataScadenza: scadenza,
        file,
      });
      let copiaLocaleSalvata = true;
      if (anchLocale) {
        if (!supportaCartellaLocale()) {
          toast.info("Salvataggio locale non supportato", {
            description:
              "La copia in cartella locale funziona solo su Chrome o Edge da computer. Il file è stato salvato online.",
          });
        } else {
          copiaLocaleSalvata = await tentaCopiaLocale();
        }
      }
      toast.success("Attestato caricato", {
        description: copiaLocaleSalvata ? nomeFile : `${nomeFile} · copia locale NON salvata`,
      });
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error("Caricamento non riuscito", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return {
    tipo, setTipo,
    altro, setAltro,
    dataCorso, setDataCorso,
    scadenza, setScadenza,
    file,
    anteprima,
    drag, setDrag,
    busy,
    anchLocale, setAnchLocale,
    cartellaDest, setCartellaDest,
    nomeFinale,
    accetta,
    conferma,
  };
}
