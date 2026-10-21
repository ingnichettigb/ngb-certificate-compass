/*
 * File:      filtri.ts
 * Percorso:  src/features/dipendenti/filtri.ts
 * Funzioni pure per i filtri della lista dipendenti.
 */
import {
  repartoLeggibile,
  ruoliDelDipendente,
  type AssegnazioneRuolo,
  type Attestato,
  type Dipendente,
  type Reparto,
  type RuoloSicurezza,
} from "@/lib/api";
import { NESSUNO, TUTTI } from "./types";

/** Elenco per il filtro reparto: reparti configurati + valori già presenti nei dipendenti. */
export function calcolaRepartiFiltro(repartiElenco: Reparto[], dipendenti: Dipendente[]): string[] {
    const set = new Map<string, string>();
    for (const r of repartiElenco) set.set(r.nome.toLowerCase(), r.nome);
    for (const d of dipendenti)
      if (repartoLeggibile(d.reparto) && !set.has(d.reparto.trim().toLowerCase()))
        set.set(d.reparto.trim().toLowerCase(), d.reparto.trim());
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "it"));
}

/** Dipendenti che rispettano ricerca, filtro reparto e filtro ruolo. */
export function filtraDipendenti({
  dipendenti,
  q,
  filtroReparto,
  filtroRuolo,
  ruoliCatalogo,
  assegnazioni,
  attestati,
}: {
  dipendenti: Dipendente[];
  q: string;
  filtroReparto: string;
  filtroRuolo: string;
  ruoliCatalogo: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  attestati: Attestato[];
}): Dipendente[] {
    const t = q.trim().toLowerCase();
    return dipendenti.filter((d) => {
      if (filtroReparto === NESSUNO && repartoLeggibile(d.reparto)) return false;
      if (
        filtroReparto !== TUTTI &&
        filtroReparto !== NESSUNO &&
        (d.reparto ?? "").trim().toLowerCase() !== filtroReparto.toLowerCase()
      )
        return false;
      if (filtroRuolo !== TUTTI) {
        const mieiRuoli = ruoliDelDipendente(d.id, ruoliCatalogo, assegnazioni);
        if (filtroRuolo === "__mancanti__") {
          const suoiD = attestati.filter((a) => a.dipendente_id === d.id);
          const manca = mieiRuoli.some(
            (ru) => ru.macro_categoria && !suoiD.some((a) => a.tipi_corso?.macro_categoria === ru.macro_categoria),
          );
          if (!manca) return false;
        } else if (!mieiRuoli.some((ru) => ru.id === filtroRuolo)) return false;
      }
      if (!t) return true;
      return `${d.cognome} ${d.nome} ${d.codice_fiscale} ${d.reparto ?? ""}`
        .toLowerCase()
        .includes(t);
    });
}
