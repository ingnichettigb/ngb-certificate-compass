/*
 * File:      filtri.ts
 * Percorso:  src/features/scadenze/filtri.ts
 * Data creazione: 2026-10-15
 * Revisioni:
 * - Rev 1 (2026-10-15 10:00): Funzioni pure per elenchi, filtri e ordinamento.
 * - Rev 2 (2026-11-06 12:00): Righe raggruppate per lavoratore + corso; filtri per decadenza, ore parziali e giorni alla scadenza.
 * - Rev 3 (2026-11-06 18:30): Filtro per soli incarichi attualmente assegnati (esclude corsi di ruoli non più ricoperti).
 */
import {
  repartoLeggibile,
  type AssegnazioneRuolo,
  type Attestato,
  type RuoloSicurezza,
  type TipoCorso,
} from "@/lib/api";
import { trovaRuoloPerCorso } from "@/features/dipendenti/matrice/mappatura-ruoli-corsi";
import { costruisciRighe } from "./raggruppa";
import {
  TUTTI,
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
    default:
      return c.scadenzaEffettiva !== null;
  }
}

const ORDINE_STATO: Record<StatoConformita, number> = {
  decaduto: 0,
  scaduto_sanabile: 1,
  incompleto_ore: 2,
  in_scadenza: 3,
  valido: 4,
  senza_scadenza: 5,
};

/** Righe (lavoratore + corso) che rispettano vista, corso, reparto, incarico e ricerca, ordinate per colonna. */
export function filtraScadenze({
  attestati,
  vista,
  q,
  reparto,
  corsoSelezionato,
  sortCol,
  sortDir,
  oggi,
  soloIncarichiAssegnati = true,
  ruoliCatalogo = [],
  assegnazioni = [],
}: {
  attestati: Attestato[];
  vista: Vista;
  q: string;
  reparto: string;
  corsoSelezionato: string;
  sortCol: ColonnaSort;
  sortDir: DirezioneSort;
  oggi: Date;
  soloIncarichiAssegnati?: boolean;
  ruoliCatalogo?: RuoloSicurezza[];
  assegnazioni?: AssegnazioneRuolo[];
}): RigaScadenzaDati[] {
  const righe = costruisciRighe(attestati, oggi);

  // Insieme "dipendente_ruolo" per il controllo rapido delle assegnazioni attuali
  const mappaAssegnati = new Set<string>();
  for (const a of assegnazioni) {
    mappaAssegnati.add(`${a.dipendente_id}_${a.ruolo_id}`);
  }

  const filtrate = righe.filter((r) => {
    const rep = (r.attestato.dipendenti?.reparto ?? "").trim().toLowerCase();
    if (reparto !== TUTTI && rep !== reparto.toLowerCase()) return false;

    if (corsoSelezionato !== TUTTI) {
      const c = corsoSelezionato.toLowerCase();
      const trovato = r.attestatiGruppo.some(
        (a) => (a.tipi_corso?.nome_corso ?? "").trim().toLowerCase() === c,
      );
      if (!trovato) return false;
    }

    // Incarichi attualmente assegnati: un corso legato a un ruolo specifico (non obbligatorio per tutti)
    // è mostrato solo se il dipendente ha quel ruolo in dipendenti_ruoli. Senza ruolo riconosciuto: riga visibile.
    if (soloIncarichiAssegnati && ruoliCatalogo.length > 0) {
      const dipId = r.attestato.dipendente_id;
      const tc = r.attestato.tipi_corso as TipoCorso | null | undefined;
      if (dipId && tc) {
        const ruolo = trovaRuoloPerCorso(tc, ruoliCatalogo);
        if (ruolo && !ruolo.obbligatorio_tutti && !mappaAssegnati.has(`${dipId}_${ruolo.id}`)) return false;
      }
    }

    return corrispondeVista(r.ciclo, vista);
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
      default:
        cmp = testo(a.dipendenti?.cognome ?? "", b.dipendenti?.cognome ?? "");
    }
    return segno * cmp;
  });
}
