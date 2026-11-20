/*
 * File:          ordinamento.ts
 * Percorso:      src/features/dipendenti/ordinamento.ts
 * Data creazione: 2026-10-24
 * Revisioni:
 *   - Rev 1 (2026-10-24 16:30): Costruzione e ordinamento righe tabella attestati.
 *   - Rev 2 (2026-11-06 18:37): Mappatura ore_dichiarate e ordinamento numerico colonna "ore".
 *   - Rev 3 (2026-11-20): Ordine per gruppo (predefinito) e gruppo di ogni attestato per lo sfondo.
 */
import { type Attestato, type IntegrazioneDvr } from "@/lib/api";
import { chiaveOrdineGruppo, gruppoDelCorso } from "./ordine-gruppi-attestati";
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
      ore: a.ore_dichiarate,
      stato: a.stato_validazione ?? "",
      attestato: a,
      gruppo: gruppoDelCorso(a.tipi_corso),
    })),
    ...suoiInteg.map((i) => ({
      id: `integrazione-${i.id}`,
      isAttestato: false,
      corso: `Integrazione DVR — ${i.descrizione}`,
      data: i.data_richiesta,
      scadenza: null,
      ore: null,
      stato: i.stato,
      integrazione: i,
    })),
  ];

  lista.sort((a, b) => {
    if (colonna === "gruppo") {
      // Attestati per gruppo, poi base prima e aggiornamenti dopo, sempre dal più vecchio; integrazioni DVR in fondo.
      const ka = a.attestato ? chiaveOrdineGruppo(a.attestato.tipi_corso) : 9999;
      const kb = b.attestato ? chiaveOrdineGruppo(b.attestato.tipi_corso) : 9999;
      if (ka !== kb) return ka - kb;
      const da = (a.data ?? "").slice(0, 10);
      const db = (b.data ?? "").slice(0, 10);
      if (da !== db) return !da ? 1 : !db ? -1 : da < db ? -1 : 1;
      return a.id.localeCompare(b.id);
    }
    if (colonna === "ore") {
      const numA = a.ore ?? (direzione === "asc" ? 999999 : -1);
      const numB = b.ore ?? (direzione === "asc" ? 999999 : -1);
      return direzione === "asc" ? numA - numB : numB - numA;
    }

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
