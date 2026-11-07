/*
 * File:      matrice-lista.ts
 * Percorso:  src/features/dipendenti/matrice/matrice-lista.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da MatriceAbilitazioniRuoli.tsx: filtro per gruppo e per ricerca, ordinamento delle righe.
 *            Funzione pura, senza cambi di comportamento.
 */
import type { Dipendente, TipoCorso } from "@/lib/api";
import type { RuoloSicurezza } from "@/lib/api/ruoli";
import type { FiltroStatoLavoratori } from "./BarraFiltriGruppo";
import type { TipoOrdinamento } from "./matrice-costanti";
import { ruoliSicurezzaAssegnati } from "./mappatura-ruoli-corsi";

export interface ParametriLista {
  dipendenti: Dipendente[];
  ricerca: string;
  colonnaOrd: string;
  direzioneOrd: TipoOrdinamento;
  gruppoSelezionato: string | null;
  filtroStatoLavoratori: FiltroStatoLavoratori;
  corsiCatalogo: TipoCorso[];
  ruoli: RuoloSicurezza[];
  mappaAssegnazioni: Set<string>;
  haObbligoNelGruppo: (dipendenteId: string, gruppoChiave: string) => boolean;
  haObbligoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
}

/** Lavoratori attivi filtrati (gruppo, ricerca) e ordinati come richiesto. */
export function elaboraListaMatrice(p: ParametriLista): Dipendente[] {
  const {
    dipendenti,
    ricerca,
    colonnaOrd,
    direzioneOrd,
    gruppoSelezionato,
    filtroStatoLavoratori,
    corsiCatalogo,
    ruoli,
    mappaAssegnazioni,
    haObbligoNelGruppo,
    haObbligoCorso,
  } = p;
  let res = dipendenti.filter((d) => d.stato_lavoratore !== "cessato");

  if (gruppoSelezionato && filtroStatoLavoratori !== "tutti") {
    res = res.filter((d) => {
      const haIncarico = haObbligoNelGruppo(d.id, gruppoSelezionato);
      return filtroStatoLavoratori === "solo_assegnati" ? haIncarico : !haIncarico;
    });
  }

  if (ricerca.trim()) {
    const q = ricerca.toLowerCase().trim();
    res = res.filter(
      (d) =>
        d.cognome.toLowerCase().includes(q) ||
        d.nome.toLowerCase().includes(q) ||
        d.codice_fiscale.toLowerCase().includes(q) ||
        (d.reparto && d.reparto.toLowerCase().includes(q)) ||
        (d.materia && d.materia.toLowerCase().includes(q)) ||
        (d.classe_concorso && d.classe_concorso.toLowerCase().includes(q)),
    );
  }

  if (colonnaOrd && direzioneOrd !== "none") {
    res = [...res].sort((a, b) => {
      let comp = 0;
      if (colonnaOrd === "nominativo") {
        const nomA = `${a.cognome} ${a.nome}`.toLowerCase();
        const nomB = `${b.cognome} ${b.nome}`.toLowerCase();
        comp = nomA.localeCompare(nomB);
      } else if (colonnaOrd === "funzione") {
        const fnA = [a.reparto, a.sottoreparto, a.classe_concorso, a.materia]
          .filter(Boolean)
          .join(" - ")
          .toLowerCase();
        const fnB = [b.reparto, b.sottoreparto, b.classe_concorso, b.materia]
          .filter(Boolean)
          .join(" - ")
          .toLowerCase();
        comp = fnA.localeCompare(fnB);
      } else if (colonnaOrd === "ruolo") {
        const rA = ruoliSicurezzaAssegnati(a.id, ruoli, mappaAssegnazioni)
          .map((r) => r.nome)
          .join(", ");
        const rB = ruoliSicurezzaAssegnati(b.id, ruoli, mappaAssegnazioni)
          .map((r) => r.nome)
          .join(", ");
        comp = (rA || a.classe_concorso || "Lavoratore").localeCompare(
          rB || b.classe_concorso || "Lavoratore",
        );
      } else {
        const c = corsiCatalogo.find((x) => x.id === colonnaOrd);
        if (c) {
          const obA = haObbligoCorso(a.id, c) ? 1 : 0;
          const obB = haObbligoCorso(b.id, c) ? 1 : 0;
          comp = obA - obB;
        }
      }
      return direzioneOrd === "asc" ? comp : -comp;
    });
  }

  return res;
}
