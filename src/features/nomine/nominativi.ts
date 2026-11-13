/*
 * File:      nominativi.ts
 * Percorso:  src/features/nomine/nominativi.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — I nominati sono quelli dell'organigramma: ruoli assegnati ai lavoratori (primo soccorso, antincendio,
 *            evacuazione, defibrillatore, preposti) oppure voci libere dell'organigramma (registro antincendio, DPI, SDS).
 *            Cognome e nome per esteso (la forma breve dell'organigramma non va bene su una lettera di nomina).
 *   rev 2 — 13/11/2026 13:20 — Registro antincendio, DPI e SDS leggono sia le assegnazioni dirette nel DB (se presenti),
 *            sia la corrispondenza per nome tra voce dell'organigramma e lavoratore in forza con anagrafica completa.
 *   rev 3 — 13/11/2026 — Ripristinata l'interfaccia usata da pagine e test (nominatiDaOrganigramma(voce, dati), nomeLettera, nomeCompleto,
 *            candidatiManuali, DatiOrganigramma, origine/dettaglio) e mantenuta la logica rev 2; lavoratore in forza = stato_lavoratore
 *            diverso da «cessato» (il campo «stato» non esiste).
 */
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { VoceOrganigramma } from "@/lib/api/ditta";
import { normalizzaVociOrganigramma } from "@/features/stampe/organigramma-a3";
import { ruoliDelGruppo } from "@/features/stampe/stampa-selezioni";
import type { VoceElencoNomine } from "./tipi";
import { titoloNominato } from "./titolo-nominato";

export type Nominato = {
  /** Identificativo stabile: id del lavoratore, oppure «voce:<nome>» / «manuale:<nome>». */
  id: string;
  /** Cognome e nome, come scritto sulla lettera. */
  nome: string;
  origine: "ruolo" | "voce" | "manuale";
  /** Reparto del lavoratore (se noto), mostrato nell'indice. */
  dettaglio?: string;
  /** «Prof.» / «Prof.ssa» per i docenti: sulla lettera precede il nome. */
  titolo?: string;
  /** Anagrafica del lavoratore, quando il nominato corrisponde a un lavoratore. */
  cf?: string;
  natoA?: string;
  dataNascita?: string;
};

/** Come compare il nominato sulla lettera: titolo (se c'è) e poi cognome e nome. */
export const nomeLettera = (n: Pick<Nominato, "nome" | "titolo">, conTitolo = true) =>
  conTitolo && n.titolo ? `${n.titolo} ${n.nome}` : n.nome;

export const nomeCompleto = (d: Pick<Dipendente, "cognome" | "nome">) =>
  `${d.cognome} ${d.nome ?? ""}`.trim();

const inForza = (d: Dipendente) => d.stato_lavoratore !== "cessato";

/** Chiave per confrontare i nomi senza badare a maiuscole e spazi doppi. */
const chiaveNome = (t: string) => t.replace(/\s+/g, " ").trim().toLocaleLowerCase("it");

/** Ruoli di squadra del gruppo, senza gli obblighi «per tutti» e il generico «Lavoratore» (come nella tavola dell'organigramma). */
function ruoliSquadra(chiave: string, ruoli: RuoloSicurezza[]) {
  return ruoliDelGruppo(chiave, ruoli).filter(
    (r) => !r.obbligatorio_tutti && r.nome.trim().toLowerCase() !== "lavoratore",
  );
}

export type DatiOrganigramma = {
  dipendenti: Dipendente[];
  ruoli: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  voci: VoceOrganigramma[];
};

const daDipendente = (d: Dipendente, origine: Nominato["origine"]): Nominato => ({
  id: d.id,
  nome: nomeCompleto(d),
  origine,
  ...(d.reparto ? { dettaglio: d.reparto } : {}),
  ...(titoloNominato(d) ? { titolo: titoloNominato(d) } : {}),
  ...(d.codice_fiscale ? { cf: d.codice_fiscale } : {}),
  ...(d.luogo_nascita ? { natoA: d.luogo_nascita } : {}),
  ...(d.data_nascita ? { dataNascita: d.data_nascita } : {}),
});

/** Nominativi che l'organigramma associa a questa nomina, in ordine alfabetico, senza doppioni. */
export function nominatiDaOrganigramma(voce: VoceElencoNomine, dati: DatiOrganigramma): Nominato[] {
  const visti = new Set<string>();
  const out: Nominato[] = [];
  const aggiungi = (n: Nominato) => {
    const chiave = chiaveNome(n.nome);
    if (visti.has(chiave)) return;
    visti.add(chiave);
    out.push(n);
  };
  const lavoratoriConRuoli = (idRuoli: Set<string>) => {
    const ids = new Set(dati.assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id));
    return dati.dipendenti.filter((d) => ids.has(d.id) && inForza(d));
  };

  if ("ruolo" in voce.sorgente) {
    const idRuoli = new Set(ruoliSquadra(voce.sorgente.ruolo, dati.ruoli).map((r) => r.id));
    for (const d of lavoratoriConRuoli(idRuoli)) aggiungi(daDipendente(d, "ruolo"));
  } else {
    const { voce: rx } = voce.sorgente;
    // 1. Assegnazioni dirette nel DB: un ruolo il cui nome corrisponde alla voce (es. «Responsabile custodia SDS»).
    const direttamente = lavoratoriConRuoli(new Set(dati.ruoli.filter((r) => rx.test(r.nome)).map((r) => r.id)));
    if (direttamente.length) {
      for (const d of direttamente) aggiungi(daDipendente(d, "ruolo"));
    } else {
      // 2. Nominativi scritti nella voce dell'organigramma; se coincidono con un lavoratore in forza si usa la sua anagrafica.
      const perNome = new Map(dati.dipendenti.filter(inForza).map((d) => [chiaveNome(nomeCompleto(d)), d]));
      for (const v of normalizzaVociOrganigramma(dati.voci).filter((x) => rx.test(x.titolo))) {
        for (const grezzo of v.nomi) {
          const nome = grezzo.replace(/\s*\*+\s*$/, "").trim();
          if (!nome) continue;
          const lavoratore = perNome.get(chiaveNome(nome));
          aggiungi(lavoratore ? daDipendente(lavoratore, "voce") : { id: `voce:${nome}`, nome, origine: "voce" });
        }
      }
    }
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Lavoratori in forza che si possono aggiungere a mano ai nominati. */
export function candidatiManuali(dipendenti: Dipendente[], gia: Nominato[]): Nominato[] {
  const presenti = new Set(gia.map((n) => chiaveNome(n.nome)));
  return dipendenti
    .filter(inForza)
    .map((d) => daDipendente(d, "manuale"))
    .filter((n) => !presenti.has(chiaveNome(n.nome)))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
