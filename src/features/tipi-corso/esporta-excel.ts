/*
 * File:      esporta-excel.ts
 * Percorso:  src/features/tipi-corso/esporta-excel.ts
 * Data creaz: 23/10/2026
 * Revisioni:
 *   rev 1 — 23/10/2026 11:00 — Creazione esportazione CSV compatibile Excel.
 *   rev 2 — 26/10/2026 18:05 — Prefisso 030ArchAttestati_ nel nome file, ordinamento per argomento (1..7) e codice, colonna Argomento.
 *   rev 4 — 23/11/2026 10:40 — «N/A» anche in Aggiorn. (anni), Aggiorn. (ore) e Codice aggiorn. quando non applicabili.
 *   rev 3 — 15/11/2026 10:50 — Scelta del formato: Excel vero (.xlsx) oppure CSV (invariato); dati comuni in «datiTipiCorso».
 */
import {
  esportaTabella,
  type FormatoEsportazione,
  type ValoreCella,
} from "@/components/tabella-comune/esporta-tabella";
import { getTipiCorso, type TipoCorso } from "@/lib/api";
import { ordina } from "./TabellaTipiCorso";
import { assegnaGruppoArgomento } from "./tipi-raggruppamento";

const cella = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Genera il nome file con il prefisso ufficiale: 030ArchAttestati_AAMMGGhhmm_tipi-corso.csv */
export function generaNomeFileEsportazione(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const aa = String(d.getFullYear()).slice(-2);
  const mm = pad(d.getMonth() + 1);
  const gg = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `030ArchAttestati_${aa}${mm}${gg}${hh}${min}_tipi-corso.csv`;
}

/** Intestazioni e righe nell'ordine dei 7 argomenti e dei codici (comuni a Excel e CSV). */
export function datiTipiCorso(corsi: TipoCorso[]): { intest: string[]; righe: ValoreCella[][] } {
  const corsiOrdinati = ordina(corsi, { chiave: "codice", dir: "asc" });
  const intest = [
    "Argomento",
    "Codice",
    "Nome corso",
    "Macro categoria",
    "Livello",
    "Ore corso",
    "Validità (anni)",
    "Aggiorn. (anni)",
    "Aggiorn. (ore)",
    "Codice aggiorn.",
    "Visibile al lavoratore",
  ];
  const righe = corsiOrdinati.map((c) => {
    const gruppo = assegnaGruppoArgomento(c);
    return [
      `${gruppo.ordine}. ${gruppo.titolo}`,
      c.codice,
      c.nome_corso,
      c.macro_categoria,
      c.livello_specifico,
      c.ore_minime_legge,
      c.durata_validita_anni ? c.durata_validita_anni : "N/A",
      c.anni_aggiornamento ?? "N/A",
      c.ore_aggiornamento ?? "N/A",
      c.codice_corso_aggiornamento || "N/A",
      c.visibile_lavoratore ? "Sì" : "No",
    ];
  });
  return { intest, righe };
}

/** Genera il contenuto CSV rispettando rigorosamente l'ordine dei 7 argomenti e dei codici */
export function csvTipiCorso(corsi: TipoCorso[]): string {
  const { intest, righe } = datiTipiCorso(corsi);
  return "\uFEFF" + [intest, ...righe].map((r) => r.map(cella).join(";")).join("\r\n");
}

/** Esporta i tipi di corso nel formato scelto: Excel (.xlsx) oppure CSV. */
export async function esportaTipiCorso(
  formato: FormatoEsportazione,
  corsiPersonalizzati?: TipoCorso[],
) {
  if (formato === "csv") return esportaTipiCorsoExcel(corsiPersonalizzati);
  const corsi = corsiPersonalizzati ?? (await getTipiCorso());
  const { intest, righe } = datiTipiCorso(corsi);
  await esportaTabella(
    { nomeBase: "tipi-corso", foglio: "09 Corsi", intestazioni: intest, righe },
    "xlsx",
  );
}

/** Solo CSV (compatibile Excel): il nome è rimasto quello storico. */
export async function esportaTipiCorsoExcel(corsiPersonalizzati?: TipoCorso[]) {
  const corsi = corsiPersonalizzati ?? (await getTipiCorso());
  const blob = new Blob([csvTipiCorso(corsi)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = generaNomeFileEsportazione();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
