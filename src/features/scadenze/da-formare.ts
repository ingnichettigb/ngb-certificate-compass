/*
 * File:      da-formare.ts
 * Percorso:  src/features/scadenze/da-formare.ts
 * Revisione: 1 — 28/11/2026 10:01
 * Data creazione: 28/11/2026 10:01
 * Righe «Da formare» della pagina Scadenze: lavoratori in forza con un corso dovuto e NESSUN attestato nel ciclo formativo,
 * che quindi non hanno una riga nata dagli attestati (il motore delle scadenze parte solo dagli attestati registrati).
 * Che cosa è dovuto lo decide la matrice abilitazioni e ruoli, attraverso le funzioni passate come parametro (vedi obblighi-matrice.ts):
 * qui non c'è nessuna regola sui corsi.
 * Regole:
 *   1. Si considerano i lavoratori non cessati.
 *   2. Un corso dovuto genera la riga solo se il lavoratore non ha NESSUN attestato (escluso il respinto) nello stesso ciclo formativo
 *      (stessa chiave di raggruppamento della tabella Scadenze). Se c'è anche solo l'attestato di base, la riga esiste già e dice lei
 *      se è scaduto o in scadenza.
 *   3. Esenti (RSPP valido) e corsi «in attesa» della formazione Lavoratore non generano la riga (nella matrice non sono «!»).
 *   4. Una riga per lavoratore e ciclo: se sono dovuti sia il base sia l'aggiornamento (o più corsi dello stesso ciclo) si mostra il
 *      corso di partenza (base, poi specifico, poi aggiornamento); gli altri restano nel gruppo per i filtri Ruolo e Corso.
 *   5. Termine: «Da svolgere entro <data di assunzione>» se la data c'è in anagrafica, altrimenti solo «Da svolgere».
 * Funzioni pure, senza accesso al database.
 * Revisioni:
 * - Rev 1 (28/11/2026 10:01): Prima stesura.
 */
import { formatData, type Attestato, type Dipendente, type RuoloSicurezza, type TipoCorso } from "@/lib/api";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { chiaveGruppo } from "./raggruppa";
import { oggiIso } from "./esenzioni-rspp";
import { legameCorsoRuolo } from "./ruolo-corsi";
import type { PosizioneCiclo, RigaScadenzaDati } from "./types";

export interface ParametriDaFormare {
  dipendenti: Dipendente[];
  /** Catalogo dei tipi di corso. */
  corsi: TipoCorso[];
  attestati: Attestato[];
  haObbligoCorso: (dipendenteId: string, corso: TipoCorso) => boolean;
  motivoEsenzione?: (dipendenteId: string, corso: TipoCorso) => string | null;
  motivoInAttesa?: (dipendenteId: string, corso: TipoCorso) => string | null;
  oggi: Date;
}

/** Testo da mostrare al posto della scadenza. Senza data di assunzione: solo «Da svolgere». */
export function testoDaSvolgere(dataAssunzione: string | null | undefined): string {
  return dataAssunzione ? `Da svolgere entro ${formatData(dataAssunzione)}` : "Da svolgere";
}

function eAggiornamento(c: TipoCorso): boolean {
  const livello = (c.livello_specifico ?? "").trim().toLowerCase();
  const codice = (c.codice ?? "").trim().toUpperCase();
  return livello === "aggiornamento" || /(?:^|-)AGG(?:-|$)/.test(codice);
}

/** Ordine di partenza: 0 base, 1 specifico, 2 altro, 3 aggiornamento. */
function rangoPartenza(c: TipoCorso): number {
  if (eAggiornamento(c)) return 3;
  const livello = (c.livello_specifico ?? "").trim().toLowerCase();
  if (livello === "base") return 0;
  if (livello === "specifico") return 1;
  return 2;
}

/** Attestato fittizio (mai salvato): porta solo il lavoratore e il corso atteso, così tabella, filtri ed esportazione lo trattano come gli altri. */
function attestatoFittizio(dip: Dipendente, corso: TipoCorso): Attestato {
  return {
    id: `da-formare|${dip.id}|${corso.id}`,
    dipendente_id: dip.id,
    codice_fiscale: dip.codice_fiscale,
    tipo_corso_id: corso.id,
    data_corso: "",
    data_scadenza_calcolata: null,
    ore_dichiarate: null,
    url_foto_fronte: null,
    url_foto_retro: null,
    stato_validazione: "In attesa",
    note_rifiuto: null,
    data_validazione: null,
    created_at: "",
    dipendenti: dip,
    tipi_corso: corso,
  };
}

function cicloDaFormare(dataAssunzione: string | null, oggi: string): PosizioneCiclo {
  return {
    dataAncora: null,
    // Il termine indicato (data di assunzione) serve anche all'ordinamento per scadenza.
    scadenzaEffettiva: dataAssunzione,
    oreRichieste: 0,
    oreAccumulate: 0,
    stato: "da_formare",
    giorniAllaScadenza: null,
    anniDallUltimoCorso: 0,
    richiedeNuovoCorsoBase: false,
    dataUltimaEvidenza: null,
    oreDaVerificare: false,
    aggiornamentiIgnorati: 0,
    durataCicloAnni: 0,
    dataValutazione: oggi,
    dataTaglio: null,
    scadenzaPortataAlTaglio: false,
    regolaPreposti: false,
    motivoScadenza: null,
    cicli: [],
    eventi: [],
  };
}

/** Righe «Da formare»: una per lavoratore e ciclo formativo senza alcun attestato. */
export function calcolaRigheDaFormare({
  dipendenti,
  corsi,
  attestati,
  haObbligoCorso,
  motivoEsenzione,
  motivoInAttesa,
  oggi,
}: ParametriDaFormare): RigaScadenzaDati[] {
  // Cicli in cui il lavoratore ha già almeno un attestato (come costruisciRighe: i respinti non contano).
  const presenti = new Set<string>();
  for (const a of attestati) {
    if (a.stato_validazione === "Respinto") continue;
    presenti.add(chiaveGruppo(a));
  }

  const dataOggi = oggiIso(oggi);
  const righe: RigaScadenzaDati[] = [];
  // Ordine del catalogo: a parità di lavoratore le righe escono sempre nello stesso ordine.
  const corsiOrdinati = [...corsi].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));

  for (const dip of dipendenti) {
    if (dip.stato_lavoratore === "cessato") continue;

    const mancanti = new Map<string, TipoCorso[]>();
    for (const corso of corsiOrdinati) {
      if (!haObbligoCorso(dip.id, corso)) continue;
      if (motivoEsenzione?.(dip.id, corso)) continue;
      if (motivoInAttesa?.(dip.id, corso)) continue;
      const gruppo = chiaveGruppo(attestatoFittizio(dip, corso));
      if (presenti.has(gruppo)) continue;
      const lista = mancanti.get(gruppo);
      if (lista) lista.push(corso);
      else mancanti.set(gruppo, [corso]);
    }

    const assunzione = dip.data_assunzione?.trim() ? dip.data_assunzione.trim().slice(0, 10) : null;
    for (const [gruppo, lista] of mancanti) {
      // Come per gli attestati: il corso di partenza (da mostrare) è l'ultimo dell'elenco.
      const ordinati = [...lista].sort(
        (a, b) => rangoPartenza(b) - rangoPartenza(a) || (b.ordine ?? 999) - (a.ordine ?? 999),
      );
      const fittizi = ordinati.map((c) => attestatoFittizio(dip, c));
      righe.push({
        chiave: `da-formare|${gruppo}`,
        attestato: fittizi[fittizi.length - 1]!,
        attestatiGruppo: fittizi,
        ciclo: cicloDaFormare(assunzione, dataOggi),
        daFormare: { dataAssunzione: assunzione },
      });
    }
  }
  return righe;
}

/**
 * Nomi dei corsi attesi nelle righe «Da formare» (per il menù Corso): con un ruolo scelto solo quelli del ruolo,
 * prima i corsi base e poi gli aggiornamenti; senza ruolo in ordine alfabetico.
 */
export function nomiCorsiDaFormare(
  righe: RigaScadenzaDati[],
  ruolo?: RuoloSicurezza,
  ruoliCatalogo: RuoloSicurezza[] = [],
  regole?: RegolaRuoloCorso[],
): string[] {
  const nomi = new Map<string, { nome: string; rango: number }>();
  for (const r of righe) {
    for (const a of r.attestatiGruppo) {
      const nome = a.tipi_corso?.nome_corso?.trim();
      if (!nome) continue;
      let rango = 0;
      if (ruolo) {
        const legame = legameCorsoRuolo(a.tipi_corso, ruolo, ruoliCatalogo, regole);
        if (!legame) continue;
        rango = legame === "base" ? 0 : 1;
      }
      const chiave = nome.toLowerCase();
      const gia = nomi.get(chiave);
      if (!gia || rango < gia.rango) nomi.set(chiave, { nome, rango });
    }
  }
  return Array.from(nomi.values())
    .sort((a, b) => a.rango - b.rango || a.nome.localeCompare(b.nome, "it"))
    .map((v) => v.nome);
}
