/*
 * File:      stampa-testo.ts
 * Percorso:  src/features/stampe/stampa-testo.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: raggruppamento, etichette e testo delle celle. Nessun cambio di comportamento.
 *   rev 2 — 08/11/2026 — Colonne «Luogo di nascita» e «Data di nascita» (intestazioni e testo delle celle).
 */
import { ETICHETTA_CAMPO } from "@/features/dipendenti/anagrafica-completa";
import type { CampoAnagrafica } from "@/features/dipendenti/anagrafica-completa";
import { VOCI_CON_RUOLO } from "./stampa-tipi";
import type { Colonna, FiltriStampa, RigaStampa, VoceRuolo } from "./stampa-tipi";
import { cellaMancante } from "./stampa-vista";
import { ETICHETTA_STATO, dataIt } from "./stampa-formati";

/** Raggruppa le righe per una chiave mantenendo l'ordine. */
export function raggruppa<T>(righe: T[], chiave: (r: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const r of righe) {
    const k = chiave(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return [...m.entries()];
}

export const INTESTAZIONI: Record<Colonna, string> = {
  lavoratore: "Lavoratore", cf: "Codice fiscale", reparto: "Reparto", mansione: "Mansione / Classe di concorso",
  ruoli: "Ruoli sicurezza", assunzione: "Data assunzione", nascita: "Luogo e data di nascita",
  luogoNascita: "Luogo di nascita", dataNascita: "Data di nascita",
  corsoBase: "Corso base", corsoSpecifico: "Corso specifico", preposto: "Preposto", antincendio: "Antincendio",
  primoSoccorso: "Primo soccorso", defibrillatore: "Defibrillatore", mancano: "Cosa manca",
  fineContratto: "Fine contratto", cessazione: "Data cessazione", corso: "Corso", ore: "Ore",
  numero: "N. attestato", data: "Data corso", scadenza: "Scadenza", stato: "Stato",
  categoria: "Categoria / Profilo", argomento: "Argomento corso", giorni: "Giorni alla scadenza",
};

/** Testo della cella: usato sia dall'anteprima sia dalle esportazioni (stesso contenuto). */
export function cella(r: RigaStampa, c: Colonna): string {
  if (r.mancanti.length && cellaMancante(r, c)) return cellaConMancanti(r, c);
  switch (c) {
    case "mancano": return testoMancanti(r);
    case "fineContratto": return dataIt(r.fineContratto);
    case "cessazione": return dataIt(r.cessazione);
    case "lavoratore": return `${r.cognome} ${r.nome}`;
    case "cf": return r.cf;
    case "reparto": return r.reparto;
    case "mansione": return r.mansione || "—";
    case "ruoli": return r.ruoli || "—";
    case "assunzione": return dataIt(r.assunzione);
    case "luogoNascita": return r.luogoNascita || "—";
    case "dataNascita": return dataIt(r.dataNascita);
    case "nascita": return [r.luogoNascita, r.dataNascita ? dataIt(r.dataNascita) : ""].filter(Boolean).join(", ") || "—";
    case "corsoBase":
    case "corsoSpecifico": return r.formazione[c] ?? "No";
    case "preposto":
    case "antincendio":
    case "primoSoccorso":
    case "defibrillatore": return r.formazione[c] ?? (r.ruoliVoci?.includes(c) ? "No" : "NA");
    case "corso": return r.codice ? `${r.codice} – ${r.corso}` : r.corso;
    case "ore": return r.ore != null ? String(r.ore) : "—";
    case "numero": return r.numero || "—";
    case "data": return dataIt(r.dataCorso);
    case "scadenza": return dataIt(r.scadenza);
    case "stato": return ETICHETTA_STATO[r.stato];
    case "categoria": return r.sottoreparto || "—";
    case "argomento": return r.gruppoTitolo || "—";
    case "giorni": return r.giorniAllaScadenza != null ? String(r.giorniAllaScadenza) : "—";
  }
}

/** Totale in fondo al documento: elenco lavoratori = lavoratori; negli altri documenti righe e lavoratori distinti. */
export function testoTotale(modello: FiltriStampa["modello"], righe: RigaStampa[]): string {
  const lavoratori = new Set(righe.map((r) => r.dipendenteId)).size;
  return modello === "lavoratori" ? `${righe.length} lavoratori` : `${righe.length} righe · ${lavoratori} lavoratori`;
}

/** Ha l'attestato ma non il ruolo di sicurezza assegnato: la cella va in neretto (anche in stampa). */
export function attestatoSenzaRuolo(r: RigaStampa, c: Colonna): boolean {
  return (VOCI_CON_RUOLO as readonly Colonna[]).includes(c) && Boolean(r.formazione[c as VoceRuolo]) && !r.ruoliVoci?.includes(c as VoceRuolo);
}

/** Testo della cella quando in quella colonna manca qualcosa (es. «MANCA data di nascita»). */
function cellaConMancanti(r: RigaStampa, c: Colonna): string {
  const manca = (campo: CampoAnagrafica) => r.mancanti.includes(campo);
  switch (c) {
    case "lavoratore": return `${manca("cognome") ? "MANCA cognome" : r.cognome} ${manca("nome") ? "MANCA nome" : r.nome}`;
    case "nascita":
      return [
        manca("luogo_nascita") ? "MANCA luogo" : r.luogoNascita,
        manca("data_nascita") ? "MANCA data" : dataIt(r.dataNascita),
      ].join(", ");
    case "mansione":
      return [r.mansione, ...(["sottoreparto", "classe_concorso", "materia"] as const).filter(manca).map((m) => `MANCA ${ETICHETTA_CAMPO[m]}`)]
        .filter(Boolean).join(" · ");
    default: return "MANCA";
  }
}

/** Elenco a parole dei dati mancanti: «Data di nascita, Materia». */
export function testoMancanti(r: RigaStampa): string {
  const t = r.mancanti.map((m) => ETICHETTA_CAMPO[m]).join(", ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}
