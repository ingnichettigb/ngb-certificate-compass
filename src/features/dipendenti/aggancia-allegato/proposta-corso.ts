/*
 * File:          proposta-corso.ts
 * Percorso:      src/features/dipendenti/aggancia-allegato/proposta-corso.ts
 * Data creazione: 2026-11-22
 * Proposta del corso nella maschera «Aggancia attestato come allegato». Tre aiuti, tutti per CODICE e senza nomi di ruolo:
 *   1. corsoDalNomeFile: il corso si riconosce dal codice (o dal nome, se unico) scritto nel nome del file scelto;
 *   2. corsiProposti: i corsi che la Tabella 02 prevede per i ruoli del lavoratore e che non risultano svolti o sono scaduti;
 *   3. etichettaCorso: nome del corso per il documento e per il nome file, con il codice se più corsi hanno lo stesso nome
 *      (il corso base e il suo aggiornamento hanno nome uguale: senza codice il secondo file sovrascriverebbe il primo).
 * Funzioni pure. Si propone solo dove la Tabella 02 dà una risposta sicura (parametri «nessuno» e «rischio ATECO»).
 * Revisioni:
 *   - Rev 1 (2026-11-22): Prima stesura (punto di verità ruoli-corsi, Fase 7).
 */
import type { Attestato } from "@/lib/api/attestati";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";
import { normalizzaNome } from "@/lib/api/documenti";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { TipoCorso } from "@/lib/api/tipi-corso";
import { regolaDecisa, type ContestoRegole } from "../matrice/condizioni-regole";

/** Più corsi hanno lo stesso nome (es. il corso base e il suo aggiornamento)? */
function nomeCondiviso(corso: TipoCorso, corsi: TipoCorso[]): boolean {
  const nome = normalizzaNome(corso.nome_corso);
  return corsi.some((c) => c.id !== corso.id && normalizzaNome(c.nome_corso) === nome);
}

/** Nome del corso per il documento e per il nome file; con il codice tra parentesi quadre se il nome non basta a distinguerlo. */
export function etichettaCorso(corso: TipoCorso, corsi: TipoCorso[]): string {
  const codice = normalizzaCodice(corso.codice);
  return codice && nomeCondiviso(corso, corsi) ? `${corso.nome_corso} [${codice}]` : corso.nome_corso;
}

export type CorsoDalNomeFile = { corso: TipoCorso; via: "codice" | "nome" };

/**
 * Il corso scritto nel nome del file, se è uno solo. Prima per CODICE (il più lungo, es. «…-AGG» batte il corso base), poi per
 * nome del corso, ma solo se quel nome appartiene a un solo corso. Nessun risultato se è ambiguo: lo sceglie l'operatore.
 */
export function corsoDalNomeFile(nomeFile: string, corsi: TipoCorso[]): CorsoDalNomeFile | null {
  const file = `_${normalizzaNome(nomeFile.replace(/\.[A-Za-z0-9]{1,5}$/, ""))}_`;
  const contiene = (valore: string) => valore !== "" && file.includes(`_${valore}_`);

  const perCodice = corsi
    .filter((c) => normalizzaCodice(c.codice) && contiene(normalizzaNome(c.codice ?? "")))
    .sort((a, b) => normalizzaNome(b.codice ?? "").length - normalizzaNome(a.codice ?? "").length);
  if (perCodice.length > 0) {
    const lunghezza = normalizzaNome(perCodice[0]!.codice ?? "").length;
    const migliori = perCodice.filter((c) => normalizzaNome(c.codice ?? "").length === lunghezza);
    if (migliori.length === 1) return { corso: migliori[0]!, via: "codice" };
    return null;
  }

  const perNome = corsi.filter((c) => contiene(normalizzaNome(c.nome_corso)) && !nomeCondiviso(c, corsi));
  const piuLunghi = perNome.sort((a, b) => b.nome_corso.length - a.nome_corso.length);
  if (piuLunghi.length === 0) return null;
  const lunghezza = piuLunghi[0]!.nome_corso.length;
  const migliori = piuLunghi.filter((c) => c.nome_corso.length === lunghezza);
  return migliori.length === 1 ? { corso: migliori[0]!, via: "nome" } : null;
}

/** Ruoli attivi del lavoratore: quelli per tutti (es. Lavoratore) e quelli che gli sono stati assegnati. */
export function ruoliDelLavoratore(ruoli: RuoloSicurezza[], assegnazioni: AssegnazioneRuolo[], dipendenteId: string): RuoloSicurezza[] {
  const suoi = new Set(assegnazioni.filter((a) => a.dipendente_id === dipendenteId).map((a) => a.ruolo_id));
  return ruoli.filter((r) => r.attivo && (r.obbligatorio_tutti || suoi.has(r.id)));
}

export type MotivoProposta = "da-svolgere" | "scaduto";

export type CorsoProposto = {
  corso: TipoCorso;
  ruolo: RuoloSicurezza;
  motivo: MotivoProposta;
  /** Frase breve per l'operatore, es. «Addetto DAE: da svolgere». */
  dettaglio: string;
};

const oggiIso = () => new Date().toISOString().slice(0, 10);

/**
 * Corsi che la Tabella 02 prevede per i ruoli del lavoratore e che mancano: mai svolti («da svolgere») o con l'ultima evidenza scaduta
 * («scaduto»: si propone l'aggiornamento se la regola lo ha, altrimenti il corso base). Per ogni regola con corso base e aggiornamento
 * conta l'attestato più recente dei due. Si propone solo dove la regola è «decisa» (vedi regolaDecisa).
 */
export function corsiProposti(input: {
  ruoli: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  dipendenteId: string;
  regole: RegolaRuoloCorso[];
  contesto: ContestoRegole;
  corsi: TipoCorso[];
  attestati: Attestato[];
  oggi?: string;
}): CorsoProposto[] {
  const { ruoli, assegnazioni, dipendenteId, regole, contesto, corsi, attestati, oggi = oggiIso() } = input;
  const perCodice = new Map(corsi.filter((c) => normalizzaCodice(c.codice)).map((c) => [normalizzaCodice(c.codice), c] as const));
  const approvati = attestati.filter((a) => a.dipendente_id === dipendenteId && a.stato_validazione === "Approvato");
  const evidenze = (codici: string[]) =>
    approvati
      .filter((a) => codici.includes(normalizzaCodice(a.tipi_corso?.codice)))
      .sort((a, b) => (b.data_corso ?? "").localeCompare(a.data_corso ?? ""));

  const out: CorsoProposto[] = [];
  const visti = new Set<string>();
  const aggiungi = (codice: string, ruolo: RuoloSicurezza, motivo: MotivoProposta, quando?: string) => {
    const corso = perCodice.get(codice);
    if (!corso || visti.has(codice)) return;
    visti.add(codice);
    const testo = motivo === "scaduto" ? `scaduto${quando ? ` il ${quando.slice(0, 10)}` : ""}` : "da svolgere";
    out.push({ corso, ruolo, motivo, dettaglio: `${ruolo.nome}: ${testo}` });
  };

  for (const ruolo of ruoliDelLavoratore(ruoli, assegnazioni, dipendenteId)) {
    const codiceRuolo = normalizzaCodice(ruolo.codice);
    if (!codiceRuolo) continue;
    for (const regola of regole) {
      if (normalizzaCodice(regola.ruolo_codice) !== codiceRuolo || !regolaDecisa(regola, contesto)) continue;
      const base = normalizzaCodice(regola.corso_base);
      const agg = normalizzaCodice(regola.corso_aggiornamento);
      const codici = [base, agg].filter(Boolean);
      if (codici.length === 0) continue;
      const ultima = evidenze(codici)[0];
      if (!ultima) {
        if (base) aggiungi(base, ruolo, "da-svolgere");
        continue;
      }
      const scadenza = ultima.data_scadenza_calcolata;
      if (scadenza && scadenza.slice(0, 10) < oggi) aggiungi(agg || base, ruolo, "scaduto", scadenza);
    }
  }
  // Prima i scaduti, poi i da svolgere; a parità l'ordine dei ruoli
  return out.sort((a, b) => (a.motivo === b.motivo ? 0 : a.motivo === "scaduto" ? -1 : 1));
}
