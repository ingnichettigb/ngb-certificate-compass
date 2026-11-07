/*
 * File:      stampa-selezioni.ts
 * Percorso:  src/features/stampe/stampa-selezioni.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da dati-stampa.ts: periodi, formazione, stato di validità e selezioni dei lavoratori. Nessun cambio di comportamento.
 */
import type { Attestato, Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { applicaScadenzaPreposti } from "@/features/scadenze/preposti";
import { TUTTI } from "./stampa-tipi";
import type { Finestra, ModoSenza, PeriodoArrivi, RigaStampa, StatoValidita, VoceFormazione, VoceRuolo } from "./stampa-tipi";
import { dataIt } from "./stampa-formati";

/** Primo giorno del periodo scelto (AAAA-MM-GG): 1 settembre dell'anno scolastico in corso, oppure 1 gennaio. */
export function inizioPeriodoArrivi(periodo: PeriodoArrivi, oggi = new Date()): string | null {
  if (periodo === "no") return null;
  const anno = oggi.getFullYear();
  if (periodo === "solare") return `${anno}-01-01`;
  return `${oggi.getMonth() >= 8 ? anno : anno - 1}-09-01`;
}

/**
 * Lavoratori assunti dall'inizio del periodo. Chi non ha la data di assunzione non può essere
 * collocato: viene escluso e contato in «senzaData» per avvisare l'utente.
 */
export function nuoviArrivati(
  dipendenti: Pick<Dipendente, "id" | "data_assunzione" | "stato_lavoratore">[],
  periodo: PeriodoArrivi,
  oggi = new Date(),
): { ids: Set<string> | null; inizio: string | null; senzaData: number } {
  const inizio = inizioPeriodoArrivi(periodo, oggi);
  if (!inizio) return { ids: null, inizio: null, senzaData: 0 };
  const inServizio = dipendenti.filter((d) => d.stato_lavoratore !== "cessato");
  const ids = new Set(inServizio.filter((d) => d.data_assunzione && d.data_assunzione.slice(0, 10) >= inizio).map((d) => d.id));
  return { ids, inizio, senzaData: inServizio.filter((d) => !d.data_assunzione).length };
}

/** A quale voce di formazione appartiene un corso (null = nessuna delle cinque). */
export function voceFormazione(tc: Pick<TipoCorso, "codice" | "nome_corso" | "macro_categoria">): VoceFormazione | null {
  const cod = (tc.codice ?? "").toUpperCase();
  if (cod.startsWith("SIC-GEN")) return "corsoBase";
  if (cod.startsWith("SIC-SPE")) return "corsoSpecifico";
  switch (assegnaGruppoArgomento(tc).chiave) {
    case "preposti": return "preposto";
    case "antincendio": return "antincendio";
    case "primo-soccorso": return "primoSoccorso";
    case "defibrillatore": return "defibrillatore";
    default: return null;
  }
}

/** A quale voce corrisponde un ruolo di sicurezza (stesse parole usate da trovaRuoloPerCorso); null = nessuna delle quattro. */
export function voceDelRuolo(r: Pick<RuoloSicurezza, "nome" | "macro_categoria">): VoceRuolo | null {
  const nome = (r.nome ?? "").toLowerCase().trim();
  const macro = (r.macro_categoria ?? "").toLowerCase().trim();
  if (macro.includes("defibrillatore") || nome.includes("defibrillatore") || nome.includes("blsd")) return "defibrillatore";
  if (nome === "preposto" || macro.includes("preposto")) return "preposto";
  if (macro.includes("antincendio") || nome.includes("antincendio")) return "antincendio";
  if (macro.includes("primo soccorso") || nome.includes("primo soccorso")) return "primoSoccorso";
  return null;
}

/** Per ogni lavoratore, per ogni voce: «Sì – data corso» (o «Scaduto – data corso») dell'attestato approvato più recente. */
export function formazionePerLavoratore(attestatiGrezzi: Attestato[], oggi: Date): Map<string, Partial<Record<VoceFormazione, string>>> {
  const attestati = applicaScadenzaPreposti(attestatiGrezzi, oggi);
  const ultimo = new Map<string, Map<VoceFormazione, Attestato>>();
  for (const a of attestati) {
    if (a.stato_validazione !== "Approvato" || !a.tipi_corso) continue;
    const v = voceFormazione(a.tipi_corso);
    if (!v) continue;
    const m = ultimo.get(a.dipendente_id) ?? new Map<VoceFormazione, Attestato>();
    const p = m.get(v);
    if (!p || a.data_corso > p.data_corso) m.set(v, a);
    ultimo.set(a.dipendente_id, m);
  }
  const out = new Map<string, Partial<Record<VoceFormazione, string>>>();
  for (const [dip, m] of ultimo) {
    const voci: Partial<Record<VoceFormazione, string>> = {};
    for (const [v, a] of m) {
      const scaduto = statoValidita(a.data_scadenza_calcolata, oggi).stato === "scaduto";
      voci[v] = `${scaduto ? "Scaduto" : "Sì"} – ${dataIt(a.data_corso)}`;
    }
    out.set(dip, voci);
  }
  return out;
}

/**
 * Lavoratori senza i minimi richiesti (Corso base, Corso specifico; conta solo l'attestato approvato).
 * Modo «almeno»: ne manca almeno uno dei due. Modo «nessuno»: mancano tutti e due.
 * Un corso scaduto conta come presente («Scaduto – data»).
 */
export function lavoratoriSenzaMinimi(dipendenti: Pick<Dipendente, "id">[], attestati: Attestato[], oggi = new Date(), modo: ModoSenza = "almeno"): Set<string> {
  const formazione = formazionePerLavoratore(attestati, oggi);
  return new Set(
    dipendenti
      .filter((d) => {
        const v = formazione.get(d.id);
        return modo === "nessuno" ? !v?.corsoBase && !v?.corsoSpecifico : !v?.corsoBase || !v?.corsoSpecifico;
      })
      .map((d) => d.id),
  );
}

/** Intersezione di due insiemi di id; null = nessun vincolo. */
export function intersezioneId(a: Set<string> | null, b: Set<string> | null): Set<string> | null {
  if (!a) return b;
  if (!b) return a;
  return new Set([...a].filter((id) => b.has(id)));
}

const GIORNO = 86_400_000;

export function statoValidita(scadenza: string | null, oggi: Date): { stato: StatoValidita; giorni: number | null } {
  if (!scadenza) return { stato: "senza_scadenza", giorni: null };
  const g = Math.floor((new Date(scadenza + "T00:00:00").getTime() - new Date(oggi.toDateString()).getTime()) / GIORNO);
  if (g < 0) return { stato: "scaduto", giorni: g };
  if (g <= 90) return { stato: "in_scadenza", giorni: g };
  return { stato: "valido", giorni: g };
}

export function nellaFinestra(r: RigaStampa, f: Finestra): boolean {
  if (f === "tutti") return true;
  if (r.giorniAllaScadenza === null) return false;
  if (f === "scaduti") return r.giorniAllaScadenza < 0;
  return r.giorniAllaScadenza <= Number(f);
}

type DipMinimo = Pick<Dipendente, "reparto" | "sottoreparto" | "classe_concorso" | "materia">;

/** Mansione leggibile: classe di concorso per i Docenti (il loro «profilo» SEC1/SEC2 non conta), profilo per gli ATA e gli altri. */
export function mansioneDi(d: DipMinimo): string {
  const classe = (d.classe_concorso ?? "").trim();
  if ((d.reparto ?? "").trim().toLowerCase() === "docente") return classe;
  return (d.sottoreparto ?? "").trim() || classe;
}

export function ordina(a: RigaStampa, b: RigaStampa) {
  return a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it") || a.dataCorso.localeCompare(b.dataCorso);
}

const radice = (t: string | null | undefined) =>
  (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").replace(/[aeio]$/, "");

/**
 * Ruoli di sicurezza attivi collegati a un gruppo corsi (macro-categoria o nome del ruolo che coincidono con il gruppo:
 * «Preposti» ↔ Preposto, «Antincendio» ↔ Addetto Antincendio, «Privacy» ↔ un ruolo con macro-categoria Privacy…).
 * Vuoto se nella Matrice non c'è ancora un ruolo collegato: in quel caso «Solo incarichi attualmente assegnati» non si può applicare.
 */
export function ruoliDelGruppo(chiaveGruppo: string, ruoli: RuoloSicurezza[]): RuoloSicurezza[] {
  if (chiaveGruppo === TUTTI || chiaveGruppo === "altro") return [];
  const g = radice(chiaveGruppo);
  return ruoli.filter((r) => r.attivo && (radice(r.macro_categoria) === g || radice(r.nome).includes(g)));
}

export function dipendentiConRuolo(ruoloId: string, assegnazioni: AssegnazioneRuolo[]): Set<string> {
  return new Set(assegnazioni.filter((a) => a.ruolo_id === ruoloId).map((a) => a.dipendente_id));
}
