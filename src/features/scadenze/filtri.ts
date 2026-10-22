/*
 * File:      filtri.ts
 * Percorso:  src/features/scadenze/filtri.ts
 * Funzioni pure per elenchi, filtri e ordinamento delle scadenze.
 */
import { repartoLeggibile, type Attestato } from "@/lib/api";
import { TUTTI, type ColonnaSort, type DirezioneSort, type Vista } from "./types";

/** Reparti presenti negli attestati (senza doppioni e senza valori illeggibili). */
export function elencoReparti(attestati: Attestato[]): string[] {
    const set = new Map<string, string>();
    for (const a of attestati) {
      const r = a.dipendenti?.reparto;
      if (repartoLeggibile(r) && !set.has(r.trim().toLowerCase())) {
        set.set(r.trim().toLowerCase(), r.trim());
      }
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "it"));
}

/** Nomi dei corsi presenti negli attestati (senza doppioni, ignorando le maiuscole). */
export function elencoCorsi(attestati: Attestato[]): string[] {
    const set = new Map<string, string>();
    for (const a of attestati) {
      const nome = a.tipi_corso?.nome_corso?.trim();
      if (nome && !set.has(nome.toLowerCase())) {
        set.set(nome.toLowerCase(), nome);
      }
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, "it"));
}

/** Attestati con scadenza che rispettano periodo, corso, reparto e ricerca, ordinati per colonna. */
export function filtraScadenze({
  attestati,
  vista,
  q,
  reparto,
  corsoSelezionato,
  sortCol,
  sortDir,
  oggi,
}: {
  attestati: Attestato[];
  vista: Vista;
  q: string;
  reparto: string;
  corsoSelezionato: string;
  sortCol: ColonnaSort;
  sortDir: DirezioneSort;
  /** Data di riferimento per «scaduti» e «in scadenza» (di solito la data di oggi). */
  oggi: Date;
}): Attestato[] {
    const oggiStr = oggi.toISOString().slice(0, 10);

    const d90 = new Date(oggi);
    d90.setDate(d90.getDate() + 90);
    const d90Str = d90.toISOString().slice(0, 10);

    const d6m = new Date(oggi);
    d6m.setMonth(d6m.getMonth() + 6);
    const d6mStr = d6m.toISOString().slice(0, 10);

    const d1y = new Date(oggi);
    d1y.setFullYear(d1y.getFullYear() + 1);
    const d1yStr = d1y.toISOString().slice(0, 10);

    const base = attestati.filter((a) => {
      if (!a.data_scadenza_calcolata) return false;

      if (
        reparto !== TUTTI &&
        (a.dipendenti?.reparto ?? "").trim().toLowerCase() !==
          reparto.toLowerCase()
      ) {
        return false;
      }

      if (
        corsoSelezionato !== TUTTI &&
        (a.tipi_corso?.nome_corso ?? "").trim().toLowerCase() !==
          corsoSelezionato.toLowerCase()
      ) {
        return false;
      }

      return true;
    });

    const filtrate = base.filter((a) => {
      const sc = a.data_scadenza_calcolata as string;
      if (vista === "Scaduti") return sc < oggiStr;
      if (vista === "In scadenza (90 gg)") return sc >= oggiStr && sc <= d90Str;
      if (vista === "In scadenza (6 mesi)") return sc >= oggiStr && sc <= d6mStr;
      if (vista === "In scadenza (1 anno)") return sc >= oggiStr && sc <= d1yStr;
      return true;
    });

    const t = q.trim().toLowerCase();
    const cercate = t
      ? filtrate.filter((a) =>
          `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""} ${a.codice_fiscale} ${
            a.tipi_corso?.nome_corso ?? ""
          }`
            .toLowerCase()
            .includes(t),
        )
      : filtrate;

    return [...cercate].sort((a, b) => {
      let valA = "";
      let valB = "";

      switch (sortCol) {
        case "dipendente":
          valA = `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""}`.trim();
          valB = `${b.dipendenti?.cognome ?? ""} ${b.dipendenti?.nome ?? ""}`.trim();
          break;
        case "codice_fiscale":
          valA = a.codice_fiscale ?? "";
          valB = b.codice_fiscale ?? "";
          break;
        case "reparto":
          valA = a.dipendenti?.reparto ?? "";
          valB = b.dipendenti?.reparto ?? "";
          break;
        case "corso":
          valA = a.tipi_corso?.nome_corso ?? "";
          valB = b.tipi_corso?.nome_corso ?? "";
          break;
        case "data_corso":
          valA = a.data_corso ?? "";
          valB = b.data_corso ?? "";
          break;
        case "scadenza":
          valA = a.data_scadenza_calcolata ?? "";
          valB = b.data_scadenza_calcolata ?? "";
          break;
      }

      const cmp = valA.localeCompare(valB, "it", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
}
