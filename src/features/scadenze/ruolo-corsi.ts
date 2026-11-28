/*
 * File:      ruolo-corsi.ts
 * Percorso:  src/features/scadenze/ruolo-corsi.ts
 * Revisione: 1 — 28/11/2026 09:11
 * Data creazione: 28/11/2026 09:11
 * Funzioni pure per il filtro «Ruolo» della pagina Scadenze.
 * - I ruoli vengono dal catalogo ruoli_sicurezza (Tabella 01, unica fonte dei ruoli).
 * - I corsi di ogni ruolo (base e aggiornamento) vengono dalla Tabella 02 (regole_ruolo_corso).
 * - L'incarico è «realmente assegnato» solo se esiste la riga in dipendenti_ruoli (o il ruolo è obbligatorio per tutti).
 * Senza Tabella 02 (non caricata o vuota) vale il riconoscimento di prima (trovaRuoloPerCorso), così la pagina non si rompe.
 * Revisioni:
 * - Rev 1 (28/11/2026 09:11): Prima stesura.
 */
import type { AssegnazioneRuolo, Attestato, RuoloSicurezza, TipoCorso } from "@/lib/api";
import { normalizzaCodice } from "@/lib/api/codici-ruoli";
import type { RegolaRuoloCorso } from "@/lib/api/regole-ruolo-corso";
import { trovaRuoloPerCorso } from "@/features/dipendenti/matrice/mappatura-ruoli-corsi";
import { corsiDelRuolo } from "@/features/dipendenti/matrice/regole-ruolo-corso";
import type { RigaScadenzaDati } from "./types";

/** Come un corso entra nel ruolo: «base» (formazione iniziale) o «aggiornamento». */
export type LegameCorsoRuolo = "base" | "aggiornamento";

type CorsoDelRuolo = Pick<TipoCorso, "nome_corso" | "macro_categoria" | "livello_specifico" | "codice"> | null | undefined;

function eCorsoAggiornamento(tc: CorsoDelRuolo): boolean {
  const livello = (tc?.livello_specifico ?? "").trim().toLowerCase();
  const codice = normalizzaCodice(tc?.codice);
  return livello === "aggiornamento" || /(?:^|-)AGG(?:-|$)/.test(codice);
}

/**
 * Dice se un corso appartiene al ruolo e come: «base» o «aggiornamento» (null = non è un corso di quel ruolo).
 * Con la Tabella 02 decide solo lei; senza, vale il riconoscimento precedente.
 */
export function legameCorsoRuolo(
  tc: CorsoDelRuolo,
  ruolo: RuoloSicurezza,
  ruoliCatalogo: RuoloSicurezza[],
  regole?: RegolaRuoloCorso[],
): LegameCorsoRuolo | null {
  if (!tc) return null;
  if (regole && regole.length > 0) {
    const codiceRuolo = normalizzaCodice(ruolo.codice);
    const cod = normalizzaCodice(tc.codice);
    if (!codiceRuolo || !cod) return null;
    const corsi = corsiDelRuolo(regole, codiceRuolo);
    if (corsi.base.includes(cod)) return "base";
    if (corsi.aggiornamento.includes(cod)) return "aggiornamento";
    return null;
  }
  const trovato = trovaRuoloPerCorso(tc as TipoCorso, ruoliCatalogo);
  if (!trovato || trovato.id !== ruolo.id) return null;
  return eCorsoAggiornamento(tc) ? "aggiornamento" : "base";
}

/** Ruoli attivi del catalogo da proporre nel filtro (con almeno un corso nella Tabella 02, se è caricata), in ordine di tabella. */
export function ruoliPerFiltro(ruoliCatalogo: RuoloSicurezza[], regole?: RegolaRuoloCorso[]): RuoloSicurezza[] {
  return ruoliCatalogo
    .filter((r) => {
      if (!r.attivo) return false;
      if (!regole || regole.length === 0) return true;
      const codice = normalizzaCodice(r.codice);
      if (!codice) return false;
      const corsi = corsiDelRuolo(regole, codice);
      return corsi.base.length + corsi.aggiornamento.length > 0;
    })
    .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0) || a.nome.localeCompare(b.nome, "it"));
}

/** Chiave «dipendente_ruolo» per il controllo rapido degli incarichi realmente assegnati (tabella dipendenti_ruoli). */
export function mappaIncarichiAssegnati(assegnazioni: AssegnazioneRuolo[]): Set<string> {
  const mappa = new Set<string>();
  for (const a of assegnazioni) mappa.add(`${a.dipendente_id}_${a.ruolo_id}`);
  return mappa;
}

/** true se il dipendente ha davvero l'incarico (o il ruolo vale per tutti). */
export function haIncaricoAssegnato(
  dipendenteId: string | null | undefined,
  ruolo: RuoloSicurezza,
  assegnati: Set<string>,
): boolean {
  if (ruolo.obbligatorio_tutti) return true;
  return !!dipendenteId && assegnati.has(`${dipendenteId}_${ruolo.id}`);
}

export interface AttestatoDelRuolo {
  attestato: Attestato;
  legame: LegameCorsoRuolo;
}

/** Attestati della riga (lavoratore + corso) che appartengono al ruolo, con il loro legame. */
export function attestatiDelRuolo(
  riga: RigaScadenzaDati,
  ruolo: RuoloSicurezza,
  ruoliCatalogo: RuoloSicurezza[],
  regole?: RegolaRuoloCorso[],
): AttestatoDelRuolo[] {
  const trovati: AttestatoDelRuolo[] = [];
  for (const attestato of riga.attestatiGruppo) {
    const legame = legameCorsoRuolo(attestato.tipi_corso, ruolo, ruoliCatalogo, regole);
    if (legame) trovati.push({ attestato, legame });
  }
  return trovati;
}

/** Nomi dei corsi del ruolo presenti negli attestati: prima i corsi base, poi gli aggiornamenti, ciascun gruppo in ordine alfabetico. */
export function elencoCorsiDelRuolo(
  attestati: Attestato[],
  ruolo: RuoloSicurezza,
  ruoliCatalogo: RuoloSicurezza[],
  regole?: RegolaRuoloCorso[],
): string[] {
  const nomi = new Map<string, { nome: string; rango: number }>();
  for (const a of attestati) {
    const nome = a.tipi_corso?.nome_corso?.trim();
    if (!nome) continue;
    const legame = legameCorsoRuolo(a.tipi_corso, ruolo, ruoliCatalogo, regole);
    if (!legame) continue;
    const chiave = nome.toLowerCase();
    const rango = legame === "base" ? 0 : 1;
    const gia = nomi.get(chiave);
    if (!gia || rango < gia.rango) nomi.set(chiave, { nome, rango });
  }
  return Array.from(nomi.values())
    .sort((a, b) => a.rango - b.rango || a.nome.localeCompare(b.nome, "it"))
    .map((v) => v.nome);
}
