/*
 * File:      esporta-scadenze.ts
 * Percorso:  src/features/scadenze/esporta-scadenze.ts
 * Revisione: 1 — 28/11/2026 09:11
 * Data creazione: 28/11/2026 09:11
 * Esportazione (Excel o CSV) dell'elenco mostrato nella pagina Scadenze, con le stesse righe e lo stesso ordine dello schermo.
 * Usa l'esportatore comune delle tabelle (nome file 030ArchAttestati_AAMMGGhhmm_<nome>.<estensione>).
 * Revisioni:
 * - Rev 1 (28/11/2026 09:11): Prima stesura.
 */
import { formatData } from "@/lib/api";
import {
  esportaTabella,
  nomeBaseDa,
  type FormatoEsportazione,
  type TabellaDaEsportare,
} from "@/components/tabella-comune/esporta-tabella";
import type { RigaScadenzaDati, StatoConformita, Vista } from "./types";

const ETICHETTA_STATO: Record<StatoConformita, string> = {
  valido: "In regola",
  in_scadenza: "In scadenza",
  scaduto_sanabile: "Scaduto (sanabile con agg.)",
  decaduto: "Decaduto (rifare corso base)",
  incompleto_ore: "Parziale",
  senza_scadenza: "Permanente",
};

export interface OpzioniEsportaScadenze {
  vista: Vista;
  /** Nome del ruolo scelto, se c'è: aggiunge la colonna «Ruolo» e il nome al file. */
  ruoloNome?: string | null | undefined;
}

/** Note della riga, le stesse informazioni che a schermo stanno sotto corso e stato. */
function noteRiga(r: RigaScadenzaDati): string {
  const { attestato: a, ciclo } = r;
  const note: string[] = [];
  if (!a.url_foto_fronte?.trim()) note.push("Manca attestato");
  if (ciclo.stato === "scaduto_sanabile" && ciclo.limiteRecupero) {
    note.push(`Recuperabile con aggiornamento entro il ${formatData(ciclo.limiteRecupero)}`);
  }
  if (ciclo.decadutoPerRitardo && ciclo.limiteRecupero) {
    note.push(`Limite di recupero scaduto il ${formatData(ciclo.limiteRecupero)}: rifare il corso base`);
  }
  if (ciclo.stato === "scaduto_sanabile" && ciclo.oreAccumulate > 0) {
    note.push(`Ore già svolte: ${ciclo.oreAccumulate}/${ciclo.oreRichieste}`);
  }
  if (ciclo.oreDaVerificare) note.push("Ore da verificare");
  if (ciclo.motivoScadenza) note.push("Scadenza anticipata per Accordo Stato-Regioni 2025");
  return note.join(" · ");
}

/** Tabella da esportare: una riga per ogni riga mostrata, nello stesso ordine. */
export function tabellaScadenze(righe: RigaScadenzaDati[], { vista, ruoloNome }: OpzioniEsportaScadenze): TabellaDaEsportare {
  const conRuolo = !!ruoloNome;
  const intestazioni = [
    "N°",
    "Dipendente",
    "Codice fiscale",
    "Reparto",
    ...(conRuolo ? ["Ruolo"] : []),
    "Corso",
    "Data corso",
    "Ancora Base",
    "Scadenza",
    "Stato",
    "Note",
  ];
  return {
    nomeBase: ["scadenze", ruoloNome ? nomeBaseDa(ruoloNome) : "", nomeBaseDa(vista)].filter(Boolean).join("-"),
    foglio: "Scadenze",
    intestazioni,
    righe: righe.map((r, i) => {
      const a = r.attestato;
      return [
        i + 1,
        `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""}`.trim(),
        a.codice_fiscale,
        a.dipendenti?.reparto ?? "",
        ...(conRuolo ? [ruoloNome] : []),
        a.tipi_corso?.nome_corso ?? "",
        formatData(a.data_corso),
        r.ciclo.dataAncora ? formatData(r.ciclo.dataAncora) : "",
        r.ciclo.scadenzaEffettiva ? formatData(r.ciclo.scadenzaEffettiva) : "Non scade",
        ETICHETTA_STATO[r.ciclo.stato],
        noteRiga(r),
      ];
    }),
  };
}

export function esportaScadenze(
  righe: RigaScadenzaDati[],
  formato: FormatoEsportazione,
  opzioni: OpzioniEsportaScadenze,
): Promise<void> {
  return esportaTabella(tabellaScadenze(righe, opzioni), formato);
}
