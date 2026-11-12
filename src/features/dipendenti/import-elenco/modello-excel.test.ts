/*
 * File:      modello-excel.test.ts
 * Percorso:  src/features/dipendenti/import-elenco/modello-excel.test.ts
 * Creato:    11/11/2026
 * Genera il modello Excel e lo rilegge con lo stesso lettore usato dall'importazione: i tre esempi di fantasia devono
 * tornare come tre righe valide, con classe/profilo e X al posto giusto.
 * Revisioni:
 *   rev 1 — 11/11/2026 — Prima stesura.
 */
import { describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { scaricaModelloElenco } from "./modello-excel";
import { tabellaInRighe, type Cella } from "./leggi-file";
import { analizzaSoloNuovi } from "./analisi-elenco";

describe("modello Excel inserimento massivo", () => {
  it("il file generato si rilegge con l'importazione", async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => { blob = b; return "blob:test"; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await scaricaModelloElenco();
    expect(blob).toBeDefined();

    const buf = await new Promise<ArrayBuffer>((ok) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result as ArrayBuffer);
      fr.readAsArrayBuffer(blob!);
    });
    const wb = XLSX.read(buf, { type: "array" });
    expect(wb.SheetNames).toEqual(["Elenco", "Istruzioni"]);

    const celle = XLSX.utils.sheet_to_json<Cella[]>(wb.Sheets["Elenco"]!, { header: 1, raw: true, defval: "" });
    const righe = tabellaInRighe(celle);
    expect(righe).toHaveLength(3);
    expect(righe.map((r) => r.cognome)).toEqual(["ROSSI", "BIANCHI", "VERDI"]);
    expect(righe[0]?.dataNascita).toBe("1980-01-01");

    const analisi = analizzaSoloNuovi(righe, [], "ATA", ["A027"]);
    expect(analisi.map((r) => r.categoria)).toEqual(["nuovo", "nuovo", "nuovo"]);
    expect(analisi.map((r) => r.classe ?? r.sottorepartoAta)).toEqual(["A027", "Collaboratore scolastico", "Direttore dei servizi generali e amministrativi"]);
    expect(analisi[2]?.funzioni).toEqual({ preposto: true, antincendio: true, defibrillatore: true, privacy: true });
    expect(analisi.every((r) => r.avvisi.length === 0)).toBe(true);
  });
});
