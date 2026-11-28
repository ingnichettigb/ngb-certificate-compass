/*
 * File:      filtri.ts
 * Percorso:  src/features/scadenze/filtri.ts
 * Revisione: 6 — 28/11/2026 10:01
 * Data creazione: 2026-10-15
 * Revisioni:
 * - Rev 1 (2026-10-15 10:00): Funzioni pure per elenchi, filtri e ordinamento.
 * - Rev 2 (2026-11-06 12:00): Righe raggruppate per lavoratore + corso; filtri per decadenza, ore parziali e giorni alla scadenza.
 * - Rev 3 (2026-11-06 18:30): Filtro per soli incarichi attualmente assegnati (esclude corsi di ruoli non più ricoperti).
 * - Rev 4 (2026-11-21): Il ruolo di un corso segue la Tabella 02 (parametro «regole»).
 * - Rev 5 (28/11/2026 09:11): Filtro «Ruolo» (un solo ruolo): restano le persone con l'incarico realmente assegnato e i corsi
 *   di quel ruolo; elenco corsi limitato al ruolo; viste «Scaduti o in scadenza»; ordinamento «ruolo»
 *   (per persona, prima il corso base poi gli altri per data). Con un ruolo scelto la riga mostra il corso del ruolo.
 * - Rev 6 (28/11/2026 10:01): Vista «Da formare / Mancanti»: parte dalle righe già calcolate (parametro «righeDaFormare») invece che dagli
 *   attestati; reparto, ruolo, corso, ricerca e ordinamento valgono come per le altre viste. Le altre viste non cambiano.
 */
import {
  repartoLeggibile,
  type AssegnazioneRuolo,
  type Attestato,
  type RuoloSicurezza,
  type TipoCorso,
} from "@/lib/api";
import { trovaRuoloPerCorso } from "@/features/dipendenti/matrice/mappatura-ruoli-corsi";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { costruisciRighe } from "./raggruppa";
import { attestatiDelRuolo, haIncaricoAssegnato, mappaIncarichiAssegnati } from "./ruolo-corsi";
import {
  TUTTI,
  VISTA_DA_FORMARE,
  type ColonnaSort,
  type DirezioneSort,
  type PosizioneCiclo,
  type RigaScadenzaDati,
  type StatoConformita,
  type Vista,
} from "./types";

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

const STATI_ATTIVI: StatoConformita[] = ["valido", "in_scadenza", "incompleto_ore"];

function entroGiorni(c: PosizioneCiclo, max: number): boolean {
  return (
    STATI_ATTIVI.includes(c.stato) &&
    c.giorniAllaScadenza !== null &&
    c.giorniAllaScadenza >= 0 &&
    c.giorniAllaScadenza <= max
  );
}

function corrispondeVista(c: PosizioneCiclo, vista: Vista): boolean {
  switch (vista) {
    case VISTA_DA_FORMARE:
      return c.stato === "da_formare";
    case "Scaduti":
      return c.stato === "scaduto_sanabile";
    case "Decaduti (> 10 anni)":
      return c.stato === "decaduto";
    case "Ore parziali":
      return c.oreAccumulate > 0 && c.stato !== "decaduto" && c.stato !== "senza_scadenza";
    case "In scadenza (90 gg)":
      return entroGiorni(c, 90);
    case "In scadenza (6 mesi)":
      return entroGiorni(c, 182);
    case "In scadenza (1 anno)":
      return entroGiorni(c, 365);
    case "Scaduti o in scadenza (90 gg)":
      return c.stato === "scaduto_sanabile" || entroGiorni(c, 90);
    case "Scaduti o in scadenza (6 mesi)":
      return c.stato === "scaduto_sanabile" || entroGiorni(c, 182);
    case "Scaduti o in scadenza (1 anno)":
      return c.stato === "scaduto_sanabile" || entroGiorni(c, 365);
    default:
      return c.scadenzaEffettiva !== null;
  }
}

const ORDINE_STATO: Record<StatoConformita, number> = {
  da_formare: -1,
  decaduto: 0,
  scaduto_sanabile: 1,
  incompleto_ore: 2,
  in_scadenza: 3,
  valido: 4,
  senza_scadenza: 5,
};

/** Righe (lavoratore + corso) che rispettano vista, reparto, ruolo, corso, incarico e ricerca, ordinate per colonna. */
export function filtraScadenze({
  attestati,
  vista,
  q,
  reparto,
  ruoloSelezionato = TUTTI,
  corsoSelezionato,
  sortCol,
  sortDir,
  oggi,
  soloIncarichiAssegnati = true,
  ruoliCatalogo = [],
  assegnazioni = [],
  regole,
  righeDaFormare = [],
}: {
  attestati: Attestato[];
  vista: Vista;
  q: string;
  reparto: string;
  /** Id del ruolo (ruoli_sicurezza.id) scelto nel filtro Ruolo, oppure TUTTI. */
  ruoloSelezionato?: string;
  corsoSelezionato: string;
  sortCol: ColonnaSort;
  sortDir: DirezioneSort;
  oggi: Date;
  soloIncarichiAssegnati?: boolean;
  ruoliCatalogo?: RuoloSicurezza[];
  assegnazioni?: AssegnazioneRuolo[];
  /** Tabella 02: indica il ruolo di ogni corso (undefined = non ancora caricata). */
  regole?: RegolaRuoloCorso[] | undefined;
  /** Righe «Da formare» già calcolate (da-formare.ts): servono solo alla vista «Da formare / Mancanti». */
  righeDaFormare?: RigaScadenzaDati[];
}): RigaScadenzaDati[] {
  const ruolo = ruoloSelezionato !== TUTTI ? ruoliCatalogo.find((r) => r.id === ruoloSelezionato) : undefined;
  // Ruolo scelto ma non (più) nel catalogo: nessun risultato, mai l'elenco completo per errore.
  if (ruoloSelezionato !== TUTTI && !ruolo) return [];

  // «Da formare / Mancanti» parte dai lavoratori con un corso dovuto e nessun attestato; le altre viste dagli attestati.
  const righe = vista === VISTA_DA_FORMARE ? righeDaFormare : costruisciRighe(attestati, oggi);

  // Insieme "dipendente_ruolo" per il controllo rapido degli incarichi realmente assegnati (dipendenti_ruoli)
  const mappaAssegnati = mappaIncarichiAssegnati(assegnazioni);

  // Con un ruolo scelto: 0 = la riga contiene il corso base del ruolo, 1 = solo aggiornamenti (serve all'ordinamento «ruolo»)
  const rangoRuolo = new Map<RigaScadenzaDati, number>();

  const filtrate = righe.flatMap((r): RigaScadenzaDati[] => {
    const rep = (r.attestato.dipendenti?.reparto ?? "").trim().toLowerCase();
    if (reparto !== TUTTI && rep !== reparto.toLowerCase()) return [];

    let riga = r;
    let attestatiCorso = r.attestatiGruppo;

    if (ruolo) {
      // Ruolo: solo chi ha l'incarico realmente assegnato (sempre, a prescindere dalla spunta) e solo i corsi di quel ruolo.
      if (!haIncaricoAssegnato(r.attestato.dipendente_id, ruolo, mappaAssegnati)) return [];
      const delRuolo = attestatiDelRuolo(r, ruolo, ruoliCatalogo, regole);
      if (delRuolo.length === 0) return [];
      attestatiCorso = delRuolo.map((x) => x.attestato);
      // La riga mostra il corso più recente DEL RUOLO (il gruppo può contenere anche corsi di altri ruoli).
      const piuRecente = [...attestatiCorso].sort((a, b) => (a.data_corso ?? "").localeCompare(b.data_corso ?? "")).at(-1)!;
      riga = { ...r, attestato: piuRecente };
      rangoRuolo.set(riga, delRuolo.some((x) => x.legame === "base") ? 0 : 1);
    }

    if (corsoSelezionato !== TUTTI) {
      const c = corsoSelezionato.toLowerCase();
      const trovato = attestatiCorso.some((a) => (a.tipi_corso?.nome_corso ?? "").trim().toLowerCase() === c);
      if (!trovato) return [];
    }

    // Incarichi attualmente assegnati (senza ruolo scelto): un corso legato a un ruolo specifico (non obbligatorio per tutti)
    // è mostrato solo se il dipendente ha quel ruolo in dipendenti_ruoli. Senza ruolo riconosciuto: riga visibile.
    if (!ruolo && soloIncarichiAssegnati && ruoliCatalogo.length > 0) {
      const dipId = r.attestato.dipendente_id;
      const tc = r.attestato.tipi_corso as TipoCorso | null | undefined;
      if (dipId && tc) {
        const ruoloDelCorso = trovaRuoloPerCorso(tc, ruoliCatalogo, regole);
        if (ruoloDelCorso && !ruoloDelCorso.obbligatorio_tutti && !mappaAssegnati.has(`${dipId}_${ruoloDelCorso.id}`)) return [];
      }
    }

    return corrispondeVista(r.ciclo, vista) ? [riga] : [];
  });

  const t = q.trim().toLowerCase();
  const cercate = t
    ? filtrate.filter((r) => {
        const a = r.attestato;
        const corsi = r.attestatiGruppo.map((x) => x.tipi_corso?.nome_corso ?? "").join(" ");
        return `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""} ${a.codice_fiscale} ${corsi}`
          .toLowerCase()
          .includes(t);
      })
    : filtrate;

  const segno = sortDir === "asc" ? 1 : -1;
  const testo = (a: string, b: string) => a.localeCompare(b, "it", { numeric: true });

  return [...cercate].sort((x, y) => {
    const a = x.attestato;
    const b = y.attestato;
    let cmp: number;
    switch (sortCol) {
      case "dipendente":
        cmp = testo(
          `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""}`.trim(),
          `${b.dipendenti?.cognome ?? ""} ${b.dipendenti?.nome ?? ""}`.trim(),
        );
        break;
      case "codice_fiscale":
        cmp = testo(a.codice_fiscale ?? "", b.codice_fiscale ?? "");
        break;
      case "reparto":
        cmp = testo(a.dipendenti?.reparto ?? "", b.dipendenti?.reparto ?? "");
        break;
      case "corso":
        cmp = testo(a.tipi_corso?.nome_corso ?? "", b.tipi_corso?.nome_corso ?? "");
        break;
      case "data_corso":
        cmp = testo(a.data_corso ?? "", b.data_corso ?? "");
        break;
      case "scadenza":
        // Chi non scade va sempre in fondo, in qualunque direzione.
        if (x.ciclo.scadenzaEffettiva === null || y.ciclo.scadenzaEffettiva === null) {
          return x.ciclo.scadenzaEffettiva === y.ciclo.scadenzaEffettiva
            ? 0
            : x.ciclo.scadenzaEffettiva === null
              ? 1
              : -1;
        }
        cmp = testo(x.ciclo.scadenzaEffettiva, y.ciclo.scadenzaEffettiva);
        break;
      case "stato":
        cmp = ORDINE_STATO[x.ciclo.stato] - ORDINE_STATO[y.ciclo.stato];
        break;
      case "ruolo": {
        // Per persona; poi prima il corso base, poi gli altri in ordine di data (ancora del ciclo), infine per scadenza.
        cmp = testo(
          `${a.dipendenti?.cognome ?? ""} ${a.dipendenti?.nome ?? ""}`.trim(),
          `${b.dipendenti?.cognome ?? ""} ${b.dipendenti?.nome ?? ""}`.trim(),
        );
        if (cmp === 0) cmp = (rangoRuolo.get(x) ?? 1) - (rangoRuolo.get(y) ?? 1);
        if (cmp === 0) cmp = testo(x.ciclo.dataAncora ?? a.data_corso ?? "", y.ciclo.dataAncora ?? b.data_corso ?? "");
        if (cmp === 0) cmp = testo(x.ciclo.scadenzaEffettiva ?? "9999-12-31", y.ciclo.scadenzaEffettiva ?? "9999-12-31");
        break;
      }
      default:
        cmp = testo(a.dipendenti?.cognome ?? "", b.dipendenti?.cognome ?? "");
    }
    return segno * cmp;
  });
}
