/*
 * File:      dati-stampa.ts
 * Percorso:  src/features/stampe/dati-stampa.ts
 * Data creaz: 02/11/2026
 * Revisioni:
 *   rev 1 — 02/11/2026 11:10 — Filtri e calcolo righe per le stampe (registro, gruppi, scadenze, schede, reparti).
 *   rev 2 — 03/11/2026 20:50 — Filtri ruolo/categoria/materia, scadenza 9 mesi, modello «Elenco lavoratori in servizio»,
 *                              colonne predefinite per modello (rimovibili in anteprima).
 */
import type { Attestato, Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";

export type Modello = "registro" | "gruppo" | "scadenze" | "scheda" | "reparto" | "lavoratori";
export type Finestra = "tutti" | "scaduti" | "90" | "180" | "270" | "365";
export type StatoValidita = "valido" | "in_scadenza" | "scaduto" | "senza_scadenza";

export type Colonna =
  | "lavoratore" | "cf" | "reparto" | "mansione" | "ruoli" | "assunzione"
  | "corso" | "ore" | "numero" | "data" | "scadenza" | "stato";

export const TUTTI = "__tutti__";

export type FiltriStampa = {
  modello: Modello;
  gruppo: string; // chiave gruppo argomento o TUTTI
  reparto: string; // nome reparto o TUTTI
  ruoloId: string; // id ruolo di sicurezza o TUTTI
  categoria: string; // sottoreparto / profilo ATA o TUTTI
  materia: string; // materia docente o TUTTI
  dipendenteId: string; // id o TUTTI
  finestra: Finestra;
  includiCessati: boolean;
  soloUltimo: boolean; // solo l'attestato più recente per lavoratore+corso
  mostraFirme: boolean;
};

export const FILTRI_INIZIALI: FiltriStampa = {
  modello: "registro",
  gruppo: TUTTI,
  reparto: TUTTI,
  ruoloId: TUTTI,
  categoria: TUTTI,
  materia: TUTTI,
  dipendenteId: TUTTI,
  finestra: "tutti",
  includiCessati: false,
  soloUltimo: true,
  mostraFirme: true,
};

export type RigaStampa = {
  id: string;
  dipendenteId: string;
  cognome: string;
  nome: string;
  cf: string;
  reparto: string;
  sottoreparto: string;
  materia: string;
  mansione: string;
  ruoli: string;
  assunzione: string | null;
  corso: string;
  codice: string;
  gruppo: string;
  gruppoTitolo: string;
  ore: number | null;
  numero: string;
  dataCorso: string;
  scadenza: string | null;
  stato: StatoValidita;
  giorniAllaScadenza: number | null;
};

/** Colonne mostrate di partenza per ogni modello (l'utente può toglierle in anteprima). */
export const COLONNE_PREDEFINITE: Record<Modello, Colonna[]> = {
  registro: ["lavoratore", "cf", "reparto", "corso", "ore", "numero", "data", "scadenza", "stato"],
  scadenze: ["scadenza", "stato", "lavoratore", "cf", "reparto", "corso", "data"],
  gruppo: ["lavoratore", "cf", "reparto", "corso", "ore", "data", "scadenza", "stato"],
  reparto: ["lavoratore", "cf", "corso", "ore", "data", "scadenza", "stato"],
  scheda: ["corso", "ore", "numero", "data", "scadenza", "stato"],
  lavoratori: ["lavoratore", "cf", "reparto", "mansione", "ruoli", "assunzione"],
};

const GIORNO = 86_400_000;

export function statoValidita(scadenza: string | null, oggi: Date): { stato: StatoValidita; giorni: number | null } {
  if (!scadenza) return { stato: "senza_scadenza", giorni: null };
  const g = Math.floor((new Date(scadenza + "T00:00:00").getTime() - new Date(oggi.toDateString()).getTime()) / GIORNO);
  if (g < 0) return { stato: "scaduto", giorni: g };
  if (g <= 90) return { stato: "in_scadenza", giorni: g };
  return { stato: "valido", giorni: g };
}

function nellaFinestra(r: RigaStampa, f: Finestra): boolean {
  if (f === "tutti") return true;
  if (r.giorniAllaScadenza === null) return false;
  if (f === "scaduti") return r.giorniAllaScadenza < 0;
  return r.giorniAllaScadenza <= Number(f);
}

type DipMinimo = Pick<Dipendente, "reparto" | "sottoreparto" | "classe_concorso" | "materia">;

/** Mansione leggibile: profilo ATA oppure classe di concorso – materia per i docenti. */
export function mansioneDi(d: DipMinimo): string {
  if (d.sottoreparto) return d.sottoreparto;
  return [d.classe_concorso, d.materia].filter(Boolean).join(" – ");
}

function ordina(a: RigaStampa, b: RigaStampa) {
  return a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it") || a.dataCorso.localeCompare(b.dataCorso);
}

function dipendentiConRuolo(ruoloId: string, assegnazioni: AssegnazioneRuolo[]): Set<string> {
  return new Set(assegnazioni.filter((a) => a.ruolo_id === ruoloId).map((a) => a.dipendente_id));
}

/** Converte gli attestati approvati in righe filtrate e ordinate per cognome, nome, data corso. */
export function calcolaRighe(
  attestati: Attestato[],
  filtri: FiltriStampa,
  oggi = new Date(),
  assegnazioni: AssegnazioneRuolo[] = [],
): RigaStampa[] {
  let righe = attestati
    .filter((a) => a.stato_validazione === "Approvato" && a.dipendenti)
    .filter((a) => filtri.includiCessati || a.dipendenti!.stato_lavoratore !== "cessato")
    .map((a): RigaStampa => {
      const d = a.dipendenti!;
      const tc = a.tipi_corso;
      const g = assegnaGruppoArgomento(tc ?? {});
      const { stato, giorni } = statoValidita(a.data_scadenza_calcolata, oggi);
      return {
        id: a.id,
        dipendenteId: d.id,
        cognome: d.cognome ?? "",
        nome: d.nome ?? "",
        cf: d.codice_fiscale ?? "",
        reparto: d.reparto ?? "—",
        sottoreparto: d.sottoreparto ?? "",
        materia: d.materia ?? "",
        mansione: mansioneDi(d),
        ruoli: "",
        assunzione: null,
        corso: tc?.nome_corso ?? "—",
        codice: tc?.codice ?? "",
        gruppo: g.chiave,
        gruppoTitolo: g.titolo,
        ore: a.ore_dichiarate,
        numero: a.numero_attestato ?? "",
        dataCorso: a.data_corso,
        scadenza: a.data_scadenza_calcolata,
        stato,
        giorniAllaScadenza: giorni,
      };
    });

  if (filtri.gruppo !== TUTTI) righe = righe.filter((r) => r.gruppo === filtri.gruppo);
  if (filtri.reparto !== TUTTI) righe = righe.filter((r) => r.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) righe = righe.filter((r) => r.sottoreparto === filtri.categoria);
  if (filtri.materia !== TUTTI) righe = righe.filter((r) => r.materia === filtri.materia);
  if (filtri.dipendenteId !== TUTTI) righe = righe.filter((r) => r.dipendenteId === filtri.dipendenteId);
  if (filtri.ruoloId !== TUTTI) {
    const con = dipendentiConRuolo(filtri.ruoloId, assegnazioni);
    righe = righe.filter((r) => con.has(r.dipendenteId));
  }

  if (filtri.soloUltimo) {
    const ultimo = new Map<string, RigaStampa>();
    for (const r of righe) {
      const k = `${r.dipendenteId}|${r.codice || r.corso}`;
      const p = ultimo.get(k);
      if (!p || r.dataCorso > p.dataCorso) ultimo.set(k, r);
    }
    righe = [...ultimo.values()];
  }

  const finestra = filtri.modello === "scadenze" && filtri.finestra === "tutti" ? "365" : filtri.finestra;
  righe = righe.filter((r) => nellaFinestra(r, finestra));
  return righe.sort(ordina);
}

/** Elenco anagrafico dei lavoratori (in servizio, o anche cessati se richiesto). */
export function calcolaRigheLavoratori(
  dipendenti: Dipendente[],
  filtri: FiltriStampa,
  assegnazioni: AssegnazioneRuolo[] = [],
  ruoli: RuoloSicurezza[] = [],
): RigaStampa[] {
  let elenco = dipendenti.filter((d) => filtri.includiCessati || d.stato_lavoratore !== "cessato");
  if (filtri.reparto !== TUTTI) elenco = elenco.filter((d) => d.reparto === filtri.reparto);
  if (filtri.categoria !== TUTTI) elenco = elenco.filter((d) => d.sottoreparto === filtri.categoria);
  if (filtri.materia !== TUTTI) elenco = elenco.filter((d) => d.materia === filtri.materia);
  if (filtri.dipendenteId !== TUTTI) elenco = elenco.filter((d) => d.id === filtri.dipendenteId);
  if (filtri.ruoloId !== TUTTI) {
    const con = dipendentiConRuolo(filtri.ruoloId, assegnazioni);
    elenco = elenco.filter((d) => con.has(d.id));
  }

  const nomeRuolo = new Map(ruoli.filter((r) => r.attivo).map((r) => [r.id, r.nome]));
  const ruoliPer = new Map<string, string[]>();
  for (const a of assegnazioni) {
    const n = nomeRuolo.get(a.ruolo_id);
    if (!n) continue;
    ruoliPer.set(a.dipendente_id, [...(ruoliPer.get(a.dipendente_id) ?? []), n]);
  }

  return elenco
    .map((d): RigaStampa => ({
      id: d.id,
      dipendenteId: d.id,
      cognome: d.cognome ?? "",
      nome: d.nome ?? "",
      cf: d.codice_fiscale ?? "",
      reparto: d.reparto ?? "—",
      sottoreparto: d.sottoreparto ?? "",
      materia: d.materia ?? "",
      mansione: mansioneDi(d),
      ruoli: (ruoliPer.get(d.id) ?? []).sort((a, b) => a.localeCompare(b, "it")).join(", "),
      assunzione: d.data_assunzione ?? null,
      corso: "",
      codice: "",
      gruppo: "",
      gruppoTitolo: "",
      ore: null,
      numero: "",
      dataCorso: "",
      scadenza: null,
      stato: "senza_scadenza",
      giorniAllaScadenza: null,
    }))
    .sort(ordina);
}

/** Raggruppa le righe per una chiave mantenendo l'ordine. */
export function raggruppa<T>(righe: T[], chiave: (r: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const r of righe) {
    const k = chiave(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(r);
  }
  return [...m.entries()];
}

export function dataIt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export const ETICHETTA_STATO: Record<StatoValidita, string> = {
  valido: "Valido",
  in_scadenza: "In scadenza",
  scaduto: "Scaduto",
  senza_scadenza: "Senza scadenza",
};

export const TITOLI_MODELLO: Record<Modello, string> = {
  registro: "Registro integrale della formazione",
  gruppo: "Elenco incaricati per gruppo",
  scadenze: "Scadenzario corsi",
  scheda: "Scheda formativa individuale",
  reparto: "Report formazione per reparto",
  lavoratori: "Elenco lavoratori in servizio",
};

export const INTESTAZIONI: Record<Colonna, string> = {
  lavoratore: "Lavoratore", cf: "Codice fiscale", reparto: "Reparto", mansione: "Mansione / Materia",
  ruoli: "Ruoli sicurezza", assunzione: "Data assunzione", corso: "Corso", ore: "Ore",
  numero: "N. attestato", data: "Data corso", scadenza: "Scadenza", stato: "Stato",
};

/** Testo della cella: usato sia dall'anteprima sia dalle esportazioni (stesso contenuto). */
export function cella(r: RigaStampa, c: Colonna): string {
  switch (c) {
    case "lavoratore": return `${r.cognome} ${r.nome}`;
    case "cf": return r.cf;
    case "reparto": return r.reparto;
    case "mansione": return r.mansione || "—";
    case "ruoli": return r.ruoli || "—";
    case "assunzione": return dataIt(r.assunzione);
    case "corso": return r.codice ? `${r.codice} – ${r.corso}` : r.corso;
    case "ore": return r.ore != null ? String(r.ore) : "—";
    case "numero": return r.numero || "—";
    case "data": return dataIt(r.dataCorso);
    case "scadenza": return dataIt(r.scadenza);
    case "stato": return ETICHETTA_STATO[r.stato];
  }
}
