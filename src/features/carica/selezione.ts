/*
 * File:      selezione.ts
 * Percorso:  src/features/carica/selezione.ts
 * Funzioni pure del modulo: categorie, livelli, corsi, suggerimenti, scadenza e validazione.
 */

import { type Suggerimento } from "@/components/CampoSuggerito";
import { type ClasseConcorso, type Materia, type TipoCorso } from "@/lib/api";
import { LIVELLI, type Anagrafica } from "./types";

/** Categorie di corso che il lavoratore può scegliere (esclude quelle nascoste). */
export function macroDisponibili(corsiVisibili: TipoCorso[], nascoste: string[]): string[] {
  return Array.from(
    new Set(
      corsiVisibili
        .filter((c) => !nascoste.includes(c.macro_categoria))
        .map((c) => c.macro_categoria),
    ),
  ).sort();
}

/** Livelli disponibili per una categoria. */
export function livelliDisponibili(corsiVisibili: TipoCorso[], macro: string) {
  return LIVELLI.filter((l) =>
    corsiVisibili.some((c) => c.macro_categoria === macro && c.livello_specifico === l),
  );
}

/** Corsi di una categoria, eventualmente ristretti a un livello. */
export function corsiDelLivello(corsiVisibili: TipoCorso[], macro: string, livello: string): TipoCorso[] {
  return corsiVisibili.filter(
    (c: TipoCorso) => c.macro_categoria === macro && (!livello || c.livello_specifico === livello),
  );
}

/** Suggerimenti: prima le classi più usate, poi tutte quelle in elenco. */
export function suggerimentiClassi(classi: ClasseConcorso[]): Suggerimento[] {
  return classi
    .filter((c) => c.attivo)
    .sort((a, b) => b.usi - a.usi || a.codice.localeCompare(b.codice, "it"))
    .map((c) => ({ valore: c.codice, dettaglio: c.denominazione }));
}

/** Materie: prima quelle collegate alla classe di concorso digitata. */
export function suggerimentiMaterie(materie: Materia[], classeConcorso: string): Suggerimento[] {
  const classe = classeConcorso.trim().toUpperCase();
  const collegate = materie.filter((m) => classe && m.classe_concorso === classe);
  const altre = materie.filter((m) => !classe || m.classe_concorso !== classe);
  return [...collegate, ...altre].map((m) => ({
    valore: m.nome,
    dettaglio: m.classe_concorso,
  }));
}

/** Data di scadenza (formato italiano) = data del corso + anni di validità. */
export function scadenzaCalcolata(dataCorso: string, anni: number): string {
  return new Date(
    new Date(dataCorso).setFullYear(new Date(dataCorso).getFullYear() + anni),
  ).toLocaleDateString("it-IT");
}

/** Primo errore del modulo (nell'ordine in cui va mostrato), oppure null se è tutto a posto. */
export function erroreModulo({
  anagrafica,
  numReparti,
  numSottoreparti,
  chiedeInsegnamento,
  corsoId,
  dataCorso,
  fronte,
}: {
  anagrafica: Anagrafica;
  numReparti: number;
  numSottoreparti: number;
  chiedeInsegnamento: boolean;
  corsoId: string;
  dataCorso: string;
  fronte: File | null;
}): { titolo: string; descrizione?: string } | null {
  const cf = anagrafica.codice_fiscale.trim().toUpperCase();
  if (cf.length !== 16) return { titolo: "Codice fiscale non valido", descrizione: "Deve contenere 16 caratteri." };
  if (numReparti > 0 && !anagrafica.reparto) return { titolo: "Scegli il tuo reparto" };
  if (numSottoreparti > 0 && !anagrafica.sottoreparto) return { titolo: "Scegli il tuo profilo dentro il reparto" };
  if (chiedeInsegnamento && !anagrafica.classe_concorso.trim()) return { titolo: "Indica la classe di concorso" };
  if (chiedeInsegnamento && !anagrafica.materia.trim()) return { titolo: "Indica la materia insegnata" };
  if (!corsoId || !dataCorso) return { titolo: "Completa corso e data del corso" };
  if (!fronte) return { titolo: "Allega almeno la foto del fronte dell'attestato" };
  return null;
}
