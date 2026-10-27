/*
 * File:      useCaricamentoAttestato.ts
 * Percorso:  src/features/documenti/hooks/useCaricamentoAttestato.ts
 * Stato e logica del caricamento di un attestato PDF (campi, file, anteprima, salvataggio).
 */
import { salvaInCartellaScelta, getUltimaCartella } from "@/lib/api/cartelle-multiple";
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
    setBusy(true);
    try {
      await caricaDocumento({
        dipendente,
        tipo,
        tipoPersonalizzato: tipo === "Altro" ? altro.trim() : null,
        dataCorso,
        dataScadenza: scadenza,
        file,
      });
      if (anchLocale) {
        if (!supportaCartellaLocale()) {
          toast.info("Salvataggio locale non supportato", {
            description:
              "La copia in cartella locale funziona solo su Chrome o Edge da computer. Il file è stato salvato online.",
          });
        } else {
          try {
            const scritto = await salvaInCartellaScelta(
              cartellaDest,
              file,
              nomeFinale,
              cartellaDipendente(dipendente),
            );
            if (scritto) toast.success(`Copia salvata nella cartella "${scritto}"`);
          } catch (e) {
            if ((e as DOMException)?.name !== "AbortError")
              toast.error("Copia locale non riuscita", {
                description: (e as Error).message,
              });
          }
        }
      }
      toast.success("Attestato caricato", { description: nomeFinale });
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
