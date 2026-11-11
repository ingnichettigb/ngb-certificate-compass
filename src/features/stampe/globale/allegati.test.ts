/*
 * File:      allegati.test.ts
 * Percorso:  src/features/stampe/globale/allegati.test.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Riconoscimento del formato dai primi byte e inserimento di PDF e immagini in un PDF.
 */
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { appendiAllegato, riconosciFormato } from "./allegati";

// PNG 1×1 trasparente
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  ),
  (c) => c.charCodeAt(0),
);

describe("riconoscimento formato", () => {
  it("dai primi byte", () => {
    expect(riconosciFormato(new TextEncoder().encode("%PDF-1.7\n"))).toBe("pdf");
    expect(riconosciFormato(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(riconosciFormato(PNG)).toBe("png");
    expect(riconosciFormato(new TextEncoder().encode("PK\u0003\u0004"))).toBe("zip");
    expect(riconosciFormato(new TextEncoder().encode("ciao"))).toBe("sconosciuto");
  });
});

describe("inserimento nel PDF", () => {
  it("copia tutte le pagine di un PDF", async () => {
    const src = await PDFDocument.create();
    src.addPage();
    src.addPage();
    const dest = await PDFDocument.create();
    const n = await appendiAllegato(dest, { tipo: "pdf", bytes: await src.save() });
    expect(n).toBe(2);
    expect(dest.getPageCount()).toBe(2);
  });
  it("un'immagine diventa una pagina A4", async () => {
    const dest = await PDFDocument.create();
    const n = await appendiAllegato(dest, { tipo: "immagine", bytes: PNG, formato: "png" });
    expect(n).toBe(1);
    const { width, height } = dest.getPage(0).getSize();
    expect(Math.round(Math.min(width, height))).toBe(595);
    expect(Math.round(Math.max(width, height))).toBe(842);
  });
  it("mancante o non convertibile non aggiunge pagine", async () => {
    const dest = await PDFDocument.create();
    expect(await appendiAllegato(dest, { tipo: "mancante" })).toBe(0);
    expect(await appendiAllegato(dest, { tipo: "non-convertibile", motivo: "x" })).toBe(0);
    expect(dest.getPageCount()).toBe(0);
  });
});
