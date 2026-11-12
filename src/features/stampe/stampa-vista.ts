/*
 * File:      stampa-vista.ts
 * Percorso:  src/features/stampe/stampa-vista.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: colonne per vista, titolo e messaggi di una stampa. Nessun cambio di comportamento.
 *   rev 2 — 11/11/2026 17:30 — Con «Solo cessati» l'elenco lavoratori e il registro mostrano in automatico la colonna «Data cessazione».
 */
import type { CampoAnagrafica } from "@/features/dipendenti/anagrafica-completa";
import { COLONNE_NUOVI_ARRIVATI, COLONNE_PREDEFINITE, COLONNE_SENZA_ATTESTATI } from "./stampa-tipi";
import type { Colonna, FiltriStampa, FiltroStatoLavoratore, ModoSenza, PeriodoArrivi, RigaStampa } from "./stampa-tipi";
import { inizioPeriodoArrivi } from "./stampa-selezioni";
import { TITOLI_MODELLO, dataIt } from "./stampa-formati";

/** In quale colonna compare ogni campo mancante. */
const COLONNA_DEL_CAMPO: Record<CampoAnagrafica, Colonna> = {
  cognome: "lavoratore", nome: "lavoratore", codice_fiscale: "cf", luogo_nascita: "nascita", data_nascita: "nascita",
  reparto: "reparto", data_assunzione: "assunzione", sottoreparto: "mansione", classe_concorso: "mansione",
  materia: "mansione", data_fine_contratto: "fineContratto", data_cessazione: "cessazione",
};

/** Colonne aggiunte da sole, in quest'ordine, se almeno un lavoratore mostrato ha quel dato mancante. */
const COLONNE_SE_MANCANTI: Colonna[] = ["nascita", "assunzione", "mansione", "fineContratto", "cessazione"];

/** Colonne da mostrare: dipendono dal modello, dalle selezioni attive e (per l'incompleta) dai dati mancanti. */
export function colonnePerVista(
  f: Pick<FiltriStampa, "modello" | "arrivi" | "incompleta"> & { senzaAttestati?: boolean; statoLavoratori?: FiltroStatoLavoratore },
  righe: RigaStampa[] = [],
): Colonna[] {
  const base = colonneDiBase(f, righe);
  // «Solo cessati»: la data di cessazione è il dato che serve, quindi compare da sola (si può togliere con la «x» dell'intestazione).
  const conCessazione = f.statoLavoratori === "solo_cessati" && (f.modello === "lavoratori" || f.modello === "registro");
  return conCessazione && !base.includes("cessazione") ? [...base, "cessazione"] : base;
}

function colonneDiBase(f: Pick<FiltriStampa, "modello" | "arrivi" | "incompleta"> & { senzaAttestati?: boolean }, righe: RigaStampa[]): Colonna[] {
  if (f.modello !== "lavoratori") return COLONNE_PREDEFINITE[f.modello];
  if (f.incompleta) {
    const base: Colonna[] = ["lavoratore", "cf", "reparto", "mancano"];
    const extra = COLONNE_SE_MANCANTI.filter((c) => righe.some((r) => r.mancanti.some((m) => COLONNA_DEL_CAMPO[m] === c)));
    return [...base, ...extra, ...(f.senzaAttestati ? (["corsoBase", "corsoSpecifico"] as Colonna[]) : [])];
  }
  if (f.senzaAttestati) return f.arrivi !== "no" ? COLONNE_NUOVI_ARRIVATI : COLONNE_SENZA_ATTESTATI;
  return f.arrivi !== "no" ? COLONNE_NUOVI_ARRIVATI : COLONNE_PREDEFINITE.lavoratori;
}

/** La cella è rossa «MANCA» se in quella colonna c'è almeno un campo mancante. */
export function cellaMancante(r: RigaStampa, c: Colonna): boolean {
  return r.mancanti.some((m) => COLONNA_DEL_CAMPO[m] === c);
}

/** Accende o spegne una selezione; la prima accensione porta all'elenco lavoratori, l'ultimo spegnimento torna al modello di prima. */
export function conSelezione(f: FiltriStampa, cambia: Partial<Pick<FiltriStampa, "arrivi" | "incompleta" | "senzaAttestati">>): FiltriStampa {
  const n = { ...f, ...cambia };
  const prima = f.arrivi !== "no" || f.incompleta || f.senzaAttestati;
  const dopo = n.arrivi !== "no" || n.incompleta || n.senzaAttestati;
  if (!prima && dopo) return { ...n, modelloPrima: f.modello, modello: "lavoratori" };
  if (prima && !dopo) {
    const torna = f.modello === "lavoratori" && f.modelloPrima ? f.modelloPrima : f.modello;
    return { ...n, modello: torna, modelloPrima: null };
  }
  return n;
}

/** Testo del periodo: «anno scolastico 2026/27» oppure «anno 2026». */
export function etichettaPeriodo(periodo: PeriodoArrivi, oggi = new Date()): string {
  const inizio = inizioPeriodoArrivi(periodo, oggi);
  if (!inizio) return "";
  const y = Number(inizio.slice(0, 4));
  return periodo === "scolastico" ? `anno scolastico ${y}/${String(y + 1).slice(2)}` : `anno ${y}`;
}

/** Titolo della stampa: descrive la selezione scelta. */
export function titoloStampa(f: FiltriStampa, oggi = new Date()): string {
  const base = TITOLI_MODELLO[f.modello];
  const arrivi = f.arrivi !== "no";
  if (f.modello === "lavoratori") {
    if (f.senzaAttestati) {
      return `Lavoratori senza attestati minimi (${f.senzaModo === "nessuno" ? "né base né specifico" : "manca almeno uno"})`
        + (arrivi ? ` – nuovi arrivati ${etichettaPeriodo(f.arrivi, oggi)}` : "")
        + (f.incompleta ? " – anagrafica incompleta" : "");
    }
    if (arrivi && f.incompleta) return `Nuovi arrivati con anagrafica incompleta – ${etichettaPeriodo(f.arrivi, oggi)}`;
    if (arrivi) return `Elenco nuovi arrivati – ${etichettaPeriodo(f.arrivi, oggi)}`;
    if (f.incompleta) return "Lavoratori con anagrafica incompleta";
    return base;
  }
  return base + (arrivi ? " – nuovi arrivati" : "") + (f.incompleta ? " – anagrafica incompleta" : "") + (f.senzaAttestati ? " – senza attestati minimi" : "");
}

/** Messaggio mostrato quando non ci sono righe: spiega il perché se dipende dalle selezioni. */
export function messaggioVuoto(f: Pick<FiltriStampa, "arrivi" | "incompleta"> & { senzaAttestati?: boolean; senzaModo?: ModoSenza }, inizio: string | null, senzaData: number): string | undefined {
  const arrivi = f.arrivi !== "no";
  if (f.senzaAttestati) {
    const nessuno = f.senzaModo === "nessuno";
    if (arrivi) return nessuno
      ? "Nessun nuovo arrivato è privo sia del Corso base sia del Corso specifico con i filtri scelti."
      : "Nessun nuovo arrivato ha Corso base o Corso specifico mancante con i filtri scelti.";
    return nessuno
      ? "Nessun lavoratore è privo sia del Corso base sia del Corso specifico con i filtri scelti."
      : "Tutti i lavoratori hanno Corso base e Corso specifico con i filtri scelti.";
  }
  if (arrivi && f.incompleta) return "Nessun nuovo arrivato ha l'anagrafica incompleta con i filtri scelti.";
  if (f.incompleta) return "Tutte le anagrafiche sono complete con i filtri scelti.";
  if (arrivi) {
    const base = `Nessun lavoratore con data di assunzione dal ${dataIt(inizio)}.`;
    return senzaData > 0
      ? `${base} ${senzaData} lavoratori non hanno la data di assunzione: usa «Anagrafica incompleta» per trovarli.`
      : base;
  }
  return undefined;
}
