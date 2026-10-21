/*
 * File:      ordinamento.ts
 * Percorso:  src/features/dipendenti/ordinamento.ts
 * Costruzione e ordinamento delle righe della tabella attestati (funzione pura).
 */
import { type Attestato, type IntegrazioneDvr } from "@/lib/api";
import { type ColonnaSortAttestati, type DirezioneSort, type RigaAttestato } from "./types";

/** Righe unificate (attestati + integrazioni DVR) di un dipendente, ordinate per la colonna scelta. */
export function costruisciRigheAttestati({
  suoi,
  suoiInteg,
  colonna,
  direzione,
}: {
  suoi: Attestato[];
  suoiInteg: IntegrazioneDvr[];
  colonna: ColonnaSortAttestati;
  direzione: DirezioneSort;
}): RigaAttestato[] {
    const lista: RigaAttestato[] = [
      ...suoi.map((a) => ({
        id: a.id,
        isAttestato: true,
        corso: a.tipi_corso?.nome_corso ?? "—",
        data: a.data_corso,
        scadenza: a.data_scadenza_calcolata,
        stato: a.stato_validazione ?? "",
        attestato: a,
      })),
      ...suoiInteg.map((i) => ({
        id: `integrazione-${i.id}`,
        isAttestato: false,
        corso: `Integrazione DVR — ${i.descrizione}`,
        data: i.data_richiesta,
        scadenza: null,
        stato: i.stato,
        integrazione: i,
      })),
    ];

    lista.sort((a, b) => {
      let valA = "";
      let valB = "";
      switch (colonna) {
        case "corso":
          valA = a.corso;
          valB = b.corso;
          break;
        case "data":
          valA = a.data ?? "";
          valB = b.data ?? "";
          break;
        case "scadenza":
          valA = a.scadenza ?? (direzione === "asc" ? "9999-99-99" : "0000-00-00");
          valB = b.scadenza ?? (direzione === "asc" ? "9999-99-99" : "0000-00-00");
          break;
        case "stato":
          valA = a.stato;
          valB = b.stato;
          break;
      }
      const cmp = valA.localeCompare(valB, "it", { numeric: true });
      return direzione === "asc" ? cmp : -cmp;
    });

  return lista;
}
