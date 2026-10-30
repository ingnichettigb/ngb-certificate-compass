/*
 * File:      useModuloCarica.ts
 * Percorso:  src/features/carica/hooks/useModuloCarica.ts
 * Data creazione: 2026-09-19
 * Revisioni:
 *   - Rev 2 (2026-10-30 20:25): Aggiunta cambiaClasseConcorso con precompilazione automatica della materia ufficiale.
 * Stato del modulo di invio attestato e valori derivati (categorie, livelli, corsi, suggerimenti).
 */
import { useMemo, useState } from "react";
import { ANAGRAFICA_VUOTA, type Anagrafica } from "../types";
import {
  macroDisponibili,
  livelliDisponibili,
  corsiDelLivello,
  suggerimentiClassi,
  suggerimentiMaterie,
} from "../selezione";
import { useDatiCarica } from "./useDatiCarica";

export function useModuloCarica(dati: ReturnType<typeof useDatiCarica>) {
  const { corsi, sottorepartiElenco, classi, materie, nascoste, reparti } = dati;

  const [anagrafica, setAnagrafica] = useState<Anagrafica>(ANAGRAFICA_VUOTA);
  const [macro, setMacro] = useState("");
  const [livello, setLivello] = useState<string>("");
  const [corsoId, setCorsoId] = useState("");
  const [dataCorso, setDataCorso] = useState("");
  const [ore, setOre] = useState("");
  const [fronte, setFronte] = useState<File | null>(null);
  const [retro, setRetro] = useState<File | null>(null);

  // Solo i corsi che il lavoratore può scegliere: rispetta sia il nascondimento
  // per macro-categoria sia l'interruttore per singolo corso (tabella corsi).
  const corsiVisibili = useMemo(() => corsi.filter((c) => c.visibile_lavoratore), [corsi]);

  const macros = useMemo(() => macroDisponibili(corsiVisibili, nascoste), [corsiVisibili, nascoste]);
  const livelli = useMemo(() => livelliDisponibili(corsiVisibili, macro), [corsiVisibili, macro]);
  const corsiFiltrati = useMemo(
    () => corsiDelLivello(corsiVisibili, macro, livello),
    [corsiVisibili, macro, livello],
  );
  const corsoSelezionato = corsi.find((c) => c.id === corsoId);

  // Reparto scelto -> sottoreparti disponibili e obbligo di classe di concorso.
  const repartoScelto = useMemo(
    () => reparti.find((r) => r.nome === anagrafica.reparto) ?? null,
    [reparti, anagrafica.reparto],
  );
  const sottoreparti = useMemo(
    () =>
      repartoScelto
        ? sottorepartiElenco.filter((s) => s.reparto_id === repartoScelto.id && s.attivo)
        : [],
    [sottorepartiElenco, repartoScelto],
  );
  const chiedeInsegnamento = !!repartoScelto?.richiede_classe_concorso;

  // Suggerimenti: prima le classi più usate, poi tutte quelle in elenco.
  const suggerimentiClassiElenco = useMemo(() => suggerimentiClassi(classi), [classi]);
  const suggerimentiMaterieElenco = useMemo(
    () => suggerimentiMaterie(materie, anagrafica.classe_concorso),
    [materie, anagrafica.classe_concorso],
  );

  function set(k: keyof Anagrafica, v: string) {
    setAnagrafica((a) => ({ ...a, [k]: v }));
  }

  /** Cambio classe di concorso: imposta la classe e precompila la materia con la denominazione ufficiale */
  function cambiaClasseConcorso(v: string) {
    const pulito = v.trim().toUpperCase();
    const trovata = classi.find((c) => c.codice.toUpperCase() === pulito);
    setAnagrafica((a) => ({
      ...a,
      classe_concorso: v,
      materia: trovata?.denominazione ? trovata.denominazione : a.materia,
    }));
  }

  /** Cambio reparto: azzera profilo, classe di concorso e materia. */
  function cambiaReparto(v: string) {
    setAnagrafica((a) => ({
      ...a,
      reparto: v,
      sottoreparto: "",
      classe_concorso: "",
      materia: "",
    }));
  }
  function cambiaMacro(v: string) {
    setMacro(v);
    setLivello("");
    setCorsoId("");
  }
  function cambiaLivello(v: string) {
    setLivello(v);
    setCorsoId("");
  }
  function scegliCorso(v: string) {
    setCorsoId(v);
    const c = corsi.find((x) => x.id === v);
    if (c?.ore_minime_legge) setOre(String(c.ore_minime_legge));
  }
  /** «Carica un altro attestato»: svuota corso, data, ore e foto (i dati anagrafici restano). */
  function azzeraCorso() {
    setCorsoId("");
    setDataCorso("");
    setOre("");
    setFronte(null);
    setRetro(null);
  }

  return {
    anagrafica,
    set,
    cambiaReparto,
    cambiaClasseConcorso,
    macro,
    macros,
    livello,
    livelli,
    cambiaMacro,
    cambiaLivello,
    corsiFiltrati,
    corsoSelezionato,
    corsoId,
    scegliCorso,
    dataCorso,
    setDataCorso,
    ore,
    setOre,
    fronte,
    setFronte,
    retro,
    setRetro,
    sottoreparti,
    chiedeInsegnamento,
    suggerimentiClassiElenco,
    suggerimentiMaterieElenco,
    azzeraCorso,
  };
}
