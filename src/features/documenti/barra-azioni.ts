/*
 * File:      barra-azioni.ts
 * Percorso:  src/features/documenti/barra-azioni.ts
 * Data creaz: 26/10/2026
 * Revisioni:
 *   rev 1 — 26/10/2026 20:10 — Creazione: collegamento tra la barra fissa del Cruscotto HR e la scheda lavoratore.
 *
 * Minimo store condiviso: la scheda lavoratore pubblica il dipendente corrente e registra i
 * comandi; la barra fissa in alto li esegue. Nessuna dipendenza esterna.
 */
import { useSyncExternalStore } from "react";
import type { Dipendente } from "@/lib/api";

export type ComandoAttestato = "caricamento" | "aggancio";

let dipendenteCorrente: Dipendente | null = null;
const ascoltatori = new Set<() => void>();
const comandi = new Map<ComandoAttestato, () => void>();

function notifica() {
  for (const ascoltatore of ascoltatori) ascoltatore();
}

function sottoscrivi(ascoltatore: () => void) {
  ascoltatori.add(ascoltatore);
  return () => {
    ascoltatori.delete(ascoltatore);
  };
}

/** La scheda lavoratore comunica chi è il dipendente aperto (null = nessuno). */
export function pubblicaDipendente(dipendente: Dipendente | null) {
  if (dipendenteCorrente === dipendente) return;
  dipendenteCorrente = dipendente;
  notifica();
}

/** La barra fissa legge il dipendente aperto per abilitare i due bottoni. */
export function usaDipendenteBarra() {
  return useSyncExternalStore(sottoscrivi, () => dipendenteCorrente);
}

/** La scheda registra cosa fare quando la barra fissa preme un comando. */
export function registraComando(comando: ComandoAttestato, esegui: () => void) {
  comandi.set(comando, esegui);
  return () => {
    if (comandi.get(comando) === esegui) comandi.delete(comando);
  };
}

/** La barra fissa esegue un comando (ignorato se nessuna scheda è aperta). */
export function eseguiComando(comando: ComandoAttestato) {
  comandi.get(comando)?.();
}
