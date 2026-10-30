/*
 * File:          avvisi-cartella.ts
 * Percorso:      src/features/cartelle/avvisi-cartella.ts
 * Data creazione: 2026-10-30
 * Revisioni:
 *   - Rev 1 (2026-10-30 20:30): Messaggi (toast) condivisi per i casi: nessuna cartella, permesso mancante, popup bloccato.
 *   - Rev 2 (2026-10-30 20:30): mostraErroreRinomina e avvisoCopiaLocale per rinomina/sdoppia e salvataggio locale.
 */
import { toast } from "sonner";
import { autorizzaCartelle, collegaCartella } from "@/lib/api/stato-cartelle";
import type { EsitoRinomina, EsitoSalvataggioLocale } from "@/lib/api/cartelle-multiple";

/** Toast «Nessuna cartella collegata» con pulsante che apre la selezione cartella. */
export function avvisoNessunaCartella(opzioni?: { titolo?: string; descrizione?: string }) {
  toast.info(opzioni?.titolo ?? "Nessuna cartella collegata", {
    description: opzioni?.descrizione ?? "Collega la cartella dell'archivio per usare i file salvati sul PC.",
    duration: 15000,
    action: {
      label: "Collega cartella",
      onClick: async () => {
        try {
          const nome = await collegaCartella();
          if (nome) toast.success(`Cartella «${nome}» collegata`, { description: "Ripeti l'operazione." });
        } catch (e) {
          toast.error("Collegamento cartella non riuscito", { description: (e as Error).message });
        }
      },
    },
  });
}

/**
 * Toast «permesso mancante». Se `riprova` è indicato, il pulsante chiede il permesso e rilancia l'operazione;
 * altrimenti chiede solo il permesso e invita a ripetere l'azione.
 */
export function avvisoPermesso(opzioni: {
  cartelle: string[];
  modo?: "read" | "readwrite";
  titolo?: string;
  descrizione?: string;
  riprova?: () => void;
}) {
  const modo = opzioni.modo ?? "read";
  const elenco = opzioni.cartelle.join(", ");
  toast.warning(opzioni.titolo ?? "Permesso alla cartella non concesso", {
    description:
      opzioni.descrizione ??
      `Il browser non ha dato l'accesso${modo === "readwrite" ? " in scrittura" : ""} a: ${elenco}.`,
    duration: 15000,
    action: {
      label: opzioni.riprova ? "Autorizza e riprova" : "Autorizza",
      onClick: async () => {
        const stato = await autorizzaCartelle(modo);
        if (stato.autorizzate === 0) {
          toast.error("Permesso ancora negato", { description: "Conferma la richiesta del browser per la cartella." });
          return;
        }
        if (opzioni.riprova) opzioni.riprova();
        else toast.success("Cartella autorizzata", { description: "Ripeti l'operazione." });
      },
    },
  });
}

export function avvisoPopupBloccato() {
  toast.warning("Il browser ha bloccato l'apertura", {
    description: "Consenti i popup per questo sito (icona nella barra degli indirizzi) e riprova.",
  });
}

/** Errore di rinomina/copia fisica del file: mostra il motivo esatto e, dove serve, il pulsante per rimediare. */
export function mostraErroreRinomina(titolo: string, esito: EsitoRinomina) {
  const descrizione = esito.errore || "Verifica i permessi sulla cartella locale del file";
  if (esito.motivo === "nessuna_cartella") {
    avvisoNessunaCartella({ titolo, descrizione });
    return;
  }
  if (esito.motivo === "permesso") {
    avvisoPermesso({ cartelle: esito.cartelleSenzaPermesso ?? [], modo: "readwrite", titolo, descrizione });
    return;
  }
  toast.error(titolo, { description: descrizione });
}

/** Copia locale non salvata dopo il caricamento online: lo dice chiaramente e permette di riprovare. */
export function avvisoCopiaLocale(esito: Exclude<EsitoSalvataggioLocale, { esito: "ok" }>, riprova: () => void) {
  if (esito.esito === "nessuna_cartella") {
    avvisoNessunaCartella({
      titolo: "Copia locale non salvata",
      descrizione: "L'attestato è online, ma non c'è nessuna cartella collegata dove salvare la copia sul PC.",
    });
    return;
  }
  avvisoPermesso({
    cartelle: esito.cartelle,
    modo: "readwrite",
    titolo: "Copia locale non salvata",
    descrizione: `L'attestato è online, ma il browser non ha dato il permesso di scrittura a: ${esito.cartelle.join(", ")}.`,
    riprova,
  });
}
