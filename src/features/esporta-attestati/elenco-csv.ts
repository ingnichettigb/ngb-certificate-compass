/*
 * File:           elenco-csv.ts
 * Percorso:       src/features/esporta-attestati/elenco-csv.ts
 * Data creazione: 2026-10-27
 * Revisioni:
 *   - Rev 1 (2026-10-27 21:20): Filtri (tutto / categoria / corsi scelti) e CSV Excel dell'elenco attestati.
 */
import type { Attestato, TipoCorso } from "@/lib/api";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";

export type Ambito =
  | { tipo: "tutto" }
  | { tipo: "categoria"; chiave: string }
  | { tipo: "corsi"; ids: Set<string> };

export function filtraAttestati(attestati: Attestato[], corsi: TipoCorso[], ambito: Ambito): Attestato[] {
  const perId = new Map(corsi.map((c) => [c.id, c]));
  return attestati.filter((a) => {
    if (ambito.tipo === "tutto") return true;
    if (ambito.tipo === "corsi") return ambito.ids.has(a.tipo_corso_id);
    const c = a.tipi_corso ?? perId.get(a.tipo_corso_id);
    return c ? assegnaGruppoArgomento(c).chiave === ambito.chiave : false;
  });
}

const cella = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const data = (d: string | null | undefined) => {
  if (!d) return "";
  const [y, m, g] = d.slice(0, 10).split("-");
  return `${g}/${m}/${y}`;
};

export function csvElencoAttestati(attestati: Attestato[], corsi: TipoCorso[], conPercorso: boolean): string {
  const perId = new Map(corsi.map((c) => [c.id, c]));
  const intest = ["Cognome", "Nome", "Codice fiscale", "Reparto", "Cod. attestato", "Attestato", "Ore", "Fatto il", "Scadenza", "Aggiornamento"];
  if (conPercorso) intest.push("Percorso e nome file (PC)");
  const ordinati = [...attestati].sort((a, b) => {
    const x = `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""}`;
    const y = `${b.dipendenti?.cognome ?? ""} ${b.dipendenti?.nome ?? ""}`;
    return x.localeCompare(y, "it") || (a.data_corso ?? "").localeCompare(b.data_corso ?? "");
  });
  const righe = ordinati.map((a) => {
    const c = a.tipi_corso ?? perId.get(a.tipo_corso_id);
    const d = a.dipendenti;
    const reparto = [d?.reparto, d?.sottoreparto].filter(Boolean).join(" - ");
    const agg = c?.codice_corso_aggiornamento
      ? `Sì (${c.codice_corso_aggiornamento}${c.ore_aggiornamento ? ` · ${c.ore_aggiornamento} ore` : ""}${c.anni_aggiornamento ? ` ogni ${c.anni_aggiornamento} anni` : ""})`
      : "No";
    const r: unknown[] = [
      d?.cognome, d?.nome, d?.codice_fiscale ?? a.codice_fiscale, reparto,
      c?.codice, c?.nome_corso, a.ore_dichiarate ?? c?.ore_minime_legge,
      data(a.data_corso), a.data_scadenza_calcolata ? data(a.data_scadenza_calcolata) : "Non scade", agg,
    ];
    if (conPercorso) r.push(a.url_foto_fronte || "Nessun file collegato");
    return r;
  });
  return "\uFEFF" + [intest, ...righe].map((r) => r.map(cella).join(";")).join("\r\n");
}

export function nomeFileElenco(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `030ArchAttestati_${String(d.getFullYear()).slice(-2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}_elenco-attestati.csv`;
}
