/*
 * File:          useRicercaArchivio.ts
 * Percorso:      src/features/dipendenti/aggancia-allegato/useRicercaArchivio.ts
 * Data creazione: 2026-10-26
 * Revisioni:
 *   - Rev 1 (2026-10-26 15:40): Logica ricerca ricorsiva e selezione singola (ripresa da "Aggancia").
 *   - Rev 2 (2026-10-30 20:30): Stato cartelle esplicito (nessuna / da autorizzare / ok): niente più «Nessun file trovato»
 *     quando in realtà la cartella non è autorizzata; la ricerca automatica parte solo se c'è già un permesso.
 *   - Rev 3 (2026-11-22): Avanzamento (cartelle e file esaminati), pulsante Annulla, una sola ricerca per volta; se la ricerca è troppo lunga
 *     si ferma e mostra i file trovati finora, invece di girare senza fine.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AvanzamentoRicerca, FileTrovato } from "@/lib/api/cartella-locale";
import { leggiStatoCartelle } from "@/lib/api/stato-cartelle";
import { cercaConStato } from "@/features/cartelle/ricerca-cartelle";
import { useStatoCartelle } from "@/features/cartelle/useStatoCartelle";

export function useRicercaArchivio(open: boolean, cognomeIniziale: string) {
  const [chiave, setChiave] = useState("");
  const [inRicerca, setInRicerca] = useState(false);
  const [risultati, setRisultati] = useState<FileTrovato[] | null>(null);
  const [selezionato, setSelezionato] = useState<FileTrovato | null>(null);
  const [avanzamento, setAvanzamento] = useState<AvanzamentoRicerca | null>(null);
  const controllo = useRef<AbortController | null>(null);
  const numeroRicerca = useRef(0);
  const { stato: statoCartelle, aggiorna, autorizza, collega } = useStatoCartelle();

  const cerca = useCallback(
    async (testo: string, opzioni?: { daClic?: boolean }) => {
      const daClic = opzioni?.daClic ?? true;
      if (!testo.trim()) {
        toast.error("Inserisci almeno un termine per la ricerca");
        return;
      }
      controllo.current?.abort(); // una sola ricerca per volta
      const ctrl = new AbortController();
      controllo.current = ctrl;
      numeroRicerca.current += 1;
      const mia = numeroRicerca.current;
      const attuale = () => numeroRicerca.current === mia;
      setInRicerca(true);
      setSelezionato(null);
      setAvanzamento({ cartelle: 0, file: 0, trovati: 0 });
      try {
        const { stato, risultati: files, interrotta } = await cercaConStato(testo, daClic, {
          segnale: ctrl.signal,
          onAvanzamento: (a) => {
            if (attuale()) setAvanzamento(a);
          },
        });
        if (!attuale()) return; // nel frattempo è partita un'altra ricerca o la finestra è stata chiusa
        if (files === null) {
          setRisultati(null);
          if (daClic) {
            if (stato.stato === "nessuna") {
              toast.info("Nessuna cartella collegata", { description: "Usa il pulsante «Collega cartella» qui sopra." });
            } else {
              toast.warning("Permesso alla cartella non concesso", {
                description: "Usa il pulsante «Autorizza» qui sopra e conferma la richiesta del browser.",
              });
            }
          }
          return;
        }
        setRisultati(files);
        if (interrotta === "tempo") {
          toast.warning("Ricerca interrotta: l'archivio è troppo lento", {
            description: `Dopo 3 minuti mostro i ${files.length} file trovati finora. Prova con un termine più preciso.`,
          });
        } else if (interrotta === "annullata") {
          toast.info("Ricerca annullata", { description: `Mostro i ${files.length} file trovati finora.` });
        } else if (files.length === 0) {
          toast.info("Nessun file trovato nelle cartelle autorizzate", {
            ...(stato.stato === "da_autorizzare"
              ? { description: "Alcune cartelle non sono autorizzate: il file potrebbe trovarsi lì." }
              : {}),
          });
        }
      } catch (e) {
        if (attuale()) toast.error("Errore durante la ricerca", { description: (e as Error).message });
      } finally {
        if (attuale()) {
          setInRicerca(false);
          setAvanzamento(null);
        }
        void aggiorna();
      }
    },
    [aggiorna],
  );

  useEffect(() => {
    if (!open) return;
    const c = cognomeIniziale.trim();
    setChiave(c);
    setRisultati(null);
    setSelezionato(null);
    // Ricerca automatica solo se esiste già un permesso: all'apertura non c'è un clic, quindi non si può chiederlo.
    let attivo = true;
    leggiStatoCartelle().then((st) => {
      if (attivo && st.autorizzate > 0 && c) void cerca(c, { daClic: false });
    });
    return () => {
      attivo = false;
      // Chiusura della finestra (o cambio lavoratore): la ricerca in corso si ferma e il suo esito non viene più mostrato.
      numeroRicerca.current += 1;
      controllo.current?.abort();
    };
  }, [open, cognomeIniziale, cerca]);

  const annulla = useCallback(() => {
    controllo.current?.abort();
  }, []);

  async function autorizzaCartelleOra() {
    const st = await autorizza();
    if (st.autorizzate > 0 && chiave.trim()) void cerca(chiave, { daClic: false });
  }

  async function scegliCartella() {
    try {
      const nome = await collega();
      if (nome && chiave.trim()) void cerca(chiave, { daClic: false });
    } catch (e) {
      toast.error("Collegamento cartella non riuscito", { description: (e as Error).message });
    }
  }

  function scegli(f: FileTrovato) {
    setSelezionato((prev) => (prev?.percorsoRelativo === f.percorsoRelativo && prev?.cartella === f.cartella ? null : f));
  }

  return {
    chiave,
    setChiave,
    inRicerca,
    avanzamento,
    annulla,
    risultati,
    statoCartelle,
    selezionato,
    cerca,
    scegli,
    scegliCartella,
    autorizzaCartelle: autorizzaCartelleOra,
  };
}
