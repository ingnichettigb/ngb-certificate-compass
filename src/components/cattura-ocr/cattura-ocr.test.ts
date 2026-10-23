/*
 * File:      cattura-ocr.test.ts
 * Percorso:  src/components/cattura-ocr/cattura-ocr.test.ts
 * Test delle parti pure del visualizzatore: rotazione (casi senza canvas) e limiti di zoom.
 */
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ruotaDataUrl } from "./ruota-immagine";
import { useVistaPanZoom } from "./hooks/useVistaPanZoom";

describe("ruotaDataUrl", () => {
  it("non tocca l'immagine con 0° o con un giro completo", async () => {
    expect(await ruotaDataUrl("data:image/png;base64,AAA", 0)).toBe("data:image/png;base64,AAA");
    expect(await ruotaDataUrl("data:image/png;base64,AAA", 360)).toBe("data:image/png;base64,AAA");
    expect(await ruotaDataUrl("data:image/png;base64,AAA", -360)).toBe("data:image/png;base64,AAA");
  });
});

describe("useVistaPanZoom", () => {
  it("parte a 100% e centrato", () => {
    const { result } = renderHook(() => useVistaPanZoom());
    expect(result.current.zoom).toBe(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  it("lo zoom resta tra 50% e 400%", () => {
    const { result } = renderHook(() => useVistaPanZoom());
    act(() => {
      for (let i = 0; i < 20; i++) result.current.riduciZoom();
    });
    expect(result.current.zoom).toBe(0.5);
    act(() => {
      for (let i = 0; i < 40; i++) result.current.aumentaZoom();
    });
    expect(result.current.zoom).toBe(4);
  });

  it("reimposta la vista", () => {
    const { result } = renderHook(() => useVistaPanZoom());
    act(() => result.current.aumentaZoom());
    act(() => result.current.resetVista());
    expect(result.current.zoom).toBe(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });
});
