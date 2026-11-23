/*
 * File:          stato-fabbisogno.ts
 * Percorso:      src/features/dipendenti/stato-fabbisogno.ts
 * Data creazione: 2026-11-08
 * Revisioni:
 *   - Rev 1 (2026-11-08 11:10): Calcolo dello stato di conformità del corso nel fabbisogno (valido/in_corso/scaduto/mancante)
 *     con formattazione sintetica della data MM-AA («entro MM-AA» o «scaduto MM-AA»).
 *   - Rev 2 (2026-11-10): Stato «esente» (grigio) per l'aggiornamento Preposto di chi ha un RSPP valido.
 *   - Rev 3 (2026-11-12): La scadenza è quella del ciclo del gruppo (Base + aggiornamenti), non del singolo attestato: un Base
 *     scaduto con un aggiornamento valido risulta valido. Primo Soccorso oltre la tolleranza: «da rifare corso base».
 *   - Rev 4 (2026-11-22): Punto di verità ruoli-corsi (Fase 6). Il corso svolto si riconosce per CODICE quando ci sono i codici (prima
 *     bastava lo stesso nome: il corso base faceva risultare «valido» anche il suo aggiornamento, che ha nome uguale). La famiglia di un
 *     aggiornamento di attrezzatura è la sua attrezzatura, non tutta la macro-categoria «Sicurezza lavoratori», e la famiglia della
 *     macro-categoria non comprende più le attrezzature. Nuovo stato «in_attesa»: formazione Lavoratore non completa (parametro «attesa»).
 */
import { type Attestato, type TipoCorso } from "@/lib/api";
import {
  eAggiornamentoPreposto,
  motivoEsenzioneRspp,
  type ValiditaRspp,
} from "@/features/scadenze/esenzioni-rspp";
import { applicaScadenzaCicli } from "@/features/scadenze/preposti";
import { codiceRuoloAttrezzatura } from "@/lib/api/codici-ruoli";

export type StatoFabbisogno = "valido" | "in_corso" | "scaduto" | "mancante" | "esente" | "in_attesa";

export interface EsitoFabbisognoCorso {
  stato: StatoFabbisogno;
  colore: "verde" | "arancione" | "rosso" | "grigio";
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
  rspp = null,
  attesa = null,
}: {
  corso: TipoCorso;
  attestati: Attestato[];
  dipendenteId: string;
  oggi?: string;
  /** RSPP valido del lavoratore: se presente, l'aggiornamento Preposto non è dovuto. */
  rspp?: ValiditaRspp | null;
  /**
   * Perché il corso non può ancora essere svolto (es. formazione Lavoratore non completa, prerequisito di un'attrezzatura).
   * Vale solo se il corso non risulta svolto: al posto di «da svolgere» lo stato è «in attesa».
   */
  attesa?: string | null;
}): EsitoFabbisognoCorso {
  if (rspp && eAggiornamentoPreposto(corso)) {
    return {
      stato: "esente",
      colore: "grigio",
      etichettaData: "esente",
      descrizione: motivoEsenzioneRspp(rspp),
    };
  }

  const nomeC = (corso.nome_corso || "").toLowerCase().trim();
  const codC = (corso.codice || "").toLowerCase().trim();
  const macroC = (corso.macro_categoria || "").toLowerCase().trim();

  // Attestati approvati del dipendente
  const approvati = applicaScadenzaCicli(
    attestati.filter((a) => a.stato_validazione === "Approvato" && a.dipendente_id === dipendenteId),
    oggi ? new Date(`${oggi}T12:00:00`) : new Date(),
  );

  // 1. Verifica se ha svolto direttamente questo specifico corso
  const svoltiDiretti = approvati.filter((a) => {
    const nomeA = (a.tipi_corso?.nome_corso || "").toLowerCase().trim();
    const codA = (a.tipi_corso?.codice || "").toLowerCase().trim();
    // Con i codici da entrambe le parti conta solo il codice: base e aggiornamento hanno spesso lo stesso nome
    if (codC && codA) return codA === codC;
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
      const daRifare = (piuRecente as { daRifareBase?: boolean }).daRifareBase === true;
      return {
        stato: "scaduto",
        colore: "rosso",
        etichettaData: daRifare ? `da rifare dopo ${mmAa}` : `scaduto ${mmAa}`,
        descrizione: daRifare
          ? `Scaduto il ${scadenza}, limite di recupero superato: va rifatto il corso base`
          : `Corso scaduto il ${scadenza}`,
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
  // Attrezzatura (LAV-…): la famiglia è la sua attrezzatura. Per gli altri corsi la macro-categoria, senza le attrezzature.
  const attrezzatura = codiceRuoloAttrezzatura(corso.codice);
  if (eAggiornamento && (attrezzatura || macroC)) {
    const pertinentiFamiglia = approvati.filter((a) => {
      const attrezzaturaA = codiceRuoloAttrezzatura(a.tipi_corso?.codice);
      if (attrezzatura) return attrezzaturaA === attrezzatura;
      if (attrezzaturaA) return false;
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

  // 3. Nessuna evidenza formativa trovata: se c'è un prerequisito mancante, il corso è «in attesa» e non «da svolgere»
  if (attesa) {
    return {
      stato: "in_attesa",
      colore: "grigio",
      etichettaData: "in attesa",
      descrizione: `In attesa della formazione Lavoratore: ${attesa}`,
    };
  }
  return {
    stato: "mancante",
    colore: "rosso",
    etichettaData: "da svolgere",
    descrizione: "Nessun attestato registrato: corso da svolgere",
  };
}
