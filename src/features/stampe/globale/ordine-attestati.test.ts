/*
 * File:      ordine-attestati.test.ts
 * Percorso:  src/features/stampe/globale/ordine-attestati.test.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Test dell'ordine degli attestati: funzione (ordine INCARICHI), poi data di emissione dal più recente.
 */
import { describe, expect, it } from "vitest";
import type { Attestato } from "@/lib/api";
import { INCARICHI } from "@/lib/api/incarichi";
import { attestatiInOrdine, raggruppaPerFunzione } from "./ordine-attestati";

const att = (id: string, macro: string, data: string): Attestato =>
  ({
    id,
    data_corso: data,
    tipi_corso: { macro_categoria: macro, nome_corso: `Corso ${id}` },
  }) as unknown as Attestato;

describe("ordine degli attestati", () => {
  const prima = INCARICHI[0]!.categoria;
  const seconda = INCARICHI[2]!.categoria;

  it("raggruppa per funzione nell'ordine di INCARICHI, le altre in fondo", () => {
    const g = raggruppaPerFunzione([
      att("a", "Privacy", "2024-01-01"),
      att("b", seconda, "2024-01-01"),
      att("c", prima, "2024-01-01"),
    ]);
    expect(g.map((x) => x.etichetta)).toEqual([
      INCARICHI[0]!.label,
      INCARICHI[2]!.label,
      "Privacy",
    ]);
  });

  it("dentro la funzione: data di emissione dal più recente; senza data in fondo", () => {
    const o = attestatiInOrdine([
      att("vecchio", prima, "2020-05-01"),
      att("nuovo", prima, "2024-05-01"),
      att("senza", prima, ""),
      att("medio", prima, "2022-05-01"),
    ]);
    expect(o.map((x) => x.id)).toEqual(["nuovo", "medio", "vecchio", "senza"]);
  });

  it("senza tipo di corso finisce in «Altro»", () => {
    const g = raggruppaPerFunzione([{ id: "x", data_corso: "2024-01-01" } as unknown as Attestato]);
    expect(g[0]?.etichetta).toBe("Altro");
  });
});
