/*
 * File:          stato-fabbisogno.ts
 * Percorso:      src/features/dipendenti/stato-fabbisogno.ts
 * Data creazione: 2026-11-08
 * Revisioni:
 *   - Rev 1 (2026-11-08 11:10): Calcolo dello stato di conformità del corso nel fabbisogno (valido/in_corso/scaduto/mancante)
 *     con formattazione sintetica della data MM-AA («entro MM-AA» o «scaduto MM-AA»).
 */
import { type Attestato, type TipoCorso } from "@/lib/api";

export type StatoFabbisogno = "valido" | "in_corso" | "scaduto" | "mancante";

export interface EsitoFabbisognoCorso {
  stato: StatoFabbisogno;
  colore: "verde" | "arancione" | "rosso";
  etichettaData: string | null;
  descrizione: string;
}

/** Formatta una data ISO YYYY-MM-DD nel formato sintetico MM-AA (es. «2026-11-06» → «11-26»). */
export function formattaMeseAnno(dataIso: string | null | undefined): string {
  if (!dataIso || dataIso.length < 7) return "";
  const parti = dataIso.slice(0, 10).split("-");
  if (parti.length < 2) return "";
  const anno = parti[0] ?? "";
  const mese = parti[1];
  return `${mese}-${anno.slice(2)}`;
}

/** Data odierna nel formato ISO YYYY-MM-DD locale. */
function oggiIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Valuta lo stato di un corso richiesto nel fabbisogno formativo del lavoratore:
 * - VERDE (In regola): attestato valido e non scaduto.
 * - ARANCIONE («entro MM-AA»): formazione pregressa valida, aggiornamento da completare prima della scadenza naturale.
 * - ROSSO («scaduto MM-AA» o «da svolgere»): termine superato oppure nessun corso mai effettuato.
 */
export function valutaStatoFabbisognoCorso({
  corso,
  attestati,
  dipendenteId,
  oggi = oggiIso(),
}: {
  corso: TipoCorso;
  attestati: Attestato[];
  dipendenteId: string;
  oggi?: string;
}): EsitoFabbisognoCorso {
  const nomeC = (corso.nome_corso || "").toLowerCase().trim();
  const codC = (corso.codice || "").toLowerCase().trim();
  const macroC = (corso.macro_categoria || "").toLowerCase().trim();

  // Attestati approvati del dipendente
  const approvati = attestati.filter(
    (a) => a.stato_validazione === "Approvato" && a.dipendente_id === dipendenteId,
  );

  // 1. Verifica se ha svolto direttamente questo specifico corso
  const svoltiDiretti = approvati.filter((a) => {
    const nomeA = (a.tipi_corso?.nome_corso || "").toLowerCase().trim();
    const codA = (a.tipi_corso?.codice || "").toLowerCase().trim();
    if (codC && codA === codC) return true;
    return nomeA === nomeC;
  });

  if (svoltiDiretti.length > 0) {
    // Ordina dal più recente
    svoltiDiretti.sort((a, b) => (b.data_corso || "").localeCompare(a.data_corso || ""));
    const piuRecente = svoltiDiretti[0]!;
    const scadenza = piuRecente.data_scadenza_calcolata;

    if (!scadenza) {
      return {
        stato: "valido",
        colore: "verde",
        etichettaData: null,
        descrizione: "Attestato valido senza scadenza",
      };
    }

    if (scadenza < oggi) {
      const mmAa = formattaMeseAnno(scadenza);
      return {
        stato: "scaduto",
        colore: "rosso",
        etichettaData: `scaduto ${mmAa}`,
        descrizione: `Corso scaduto il ${scadenza}`,
      };
    }

    return {
      stato: "valido",
      colore: "verde",
      etichettaData: null,
      descrizione: `Attestato valido fino al ${scadenza}`,
    };
  }

  // 2. Se è un corso di aggiornamento, cerchiamo nella stessa macro-categoria la formazione pregressa
  const eAggiornamento = nomeC.includes("aggiornamento") || codC.includes("agg");
  if (eAggiornamento && macroC) {
    const pertinentiFamiglia = approvati.filter((a) => {
      const macroA = (a.tipi_corso?.macro_categoria || "").toLowerCase().trim();
      return macroA === macroC;
    });

    if (pertinentiFamiglia.length > 0) {
      // Troviamo la scadenza di riferimento più recente
      pertinentiFamiglia.sort((a, b) =>
        (b.data_scadenza_calcolata || b.data_corso || "").localeCompare(
          a.data_scadenza_calcolata || a.data_corso || "",
        ),
      );
      const rif = pertinentiFamiglia[0]!;
      const scadenza = rif.data_scadenza_calcolata;

      if (scadenza) {
        const mmAa = formattaMeseAnno(scadenza);
        if (scadenza >= oggi) {
          return {
            stato: "in_corso",
            colore: "arancione",
            etichettaData: `entro ${mmAa}`,
            descrizione: `Aggiornamento da svolgere entro il ${scadenza}`,
          };
        } else {
          return {
            stato: "scaduto",
            colore: "rosso",
            etichettaData: `scaduto ${mmAa}`,
            descrizione: `Formazione pregressa scaduta il ${scadenza}: aggiornamento necessario`,
          };
        }
      }
    }
  }

  // 3. Nessuna evidenza formativa trovata
  return {
    stato: "mancante",
    colore: "rosso",
    etichettaData: "da svolgere",
    descrizione: "Nessun attestato registrato: corso da svolgere",
  };
}
