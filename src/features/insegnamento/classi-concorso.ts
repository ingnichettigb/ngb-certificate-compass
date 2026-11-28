/*
 * File:      classi-concorso.ts
 * Percorso:  src/features/insegnamento/classi-concorso.ts
 * Data creaz: 28/11/2026
 * Revisioni:
 *   rev 1 — 28/11/2026 10:30 — Dicitura unica «CODICE — Denominazione» della classe di concorso, letta dal catalogo del database.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClassiConcorso } from "@/lib/api";

/** Catalogo in memoria codice -> denominazione (riempito da useCatalogoClassi). */
const catalogo = new Map<string, string>();

export function impostaCatalogoClassi(classi: { codice: string; denominazione: string | null }[]) {
  catalogo.clear();
  for (const c of classi) if (c.denominazione?.trim()) catalogo.set(c.codice.trim().toUpperCase(), c.denominazione.trim());
}

export function denominazioneClasse(codice: string | null | undefined): string | null {
  const c = (codice ?? "").trim().toUpperCase();
  return c ? (catalogo.get(c) ?? null) : null;
}

/** «A027 — Matematica e fisica»; solo il codice se la denominazione non è in catalogo; "" se manca il codice. */
export function etichettaClasse(codice: string | null | undefined): string {
  const c = (codice ?? "").trim();
  if (!c) return "";
  const d = denominazioneClasse(c);
  return d ? `${c} — ${d}` : c;
}

/** Carica il catalogo delle classi e lo rende disponibile a etichettaClasse; restituisce l'elenco (per le dipendenze dei calcoli). */
export function useCatalogoClassi() {
  const { data } = useQuery({ queryKey: ["classi_concorso"], queryFn: getClassiConcorso });
  if (data) impostaCatalogoClassi(data);
  useEffect(() => { if (data) impostaCatalogoClassi(data); }, [data]);
  return data;
}
