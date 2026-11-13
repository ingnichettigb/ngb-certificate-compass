/*
 * File:      nominativi.ts
 * Percorso:  src/features/nomine/nominativi.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — I nominati sono quelli dell'organigramma: ruoli assegnati ai lavoratori oppure voci libere.
 *   rev 2 — 13/11/2026 13:20 — Registro antincendio, DPI e SDS leggono sia assegnazioni DB che voci organigramma.
 *   rev 3 — 13/11/2026 13:40 — Ripristinate interfacce (Nominato, DatiOrganigramma, candidatiManuali, nomeLettera, nomeCompleto).
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
  reparto?: string;
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

/** Nominativi che l'organigramma associa a questa nomina, in ordine alfabetico, senza doppioni. */
export function nominatiDaOrganigramma(voce: VoceElencoNomine, dati: DatiOrganigramma): Nominato[] {
  const visti = new Set<string>();
  const out: Nominato[] = [];
  const aggiungi = (n: Nominato) => {
    const chiave = n.nome.toLocaleLowerCase("it");
    if (visti.has(chiave)) return;
    visti.add(chiave);
    out.push(n);
  };

  const nominatoDaDipendente = (d: Dipendente, origine: "ruolo" | "voce" = "ruolo"): Nominato => {
    const tit = titoloNominato(d);
    return {
      id: d.id,
      nome: nomeCompleto(d),
      origine,
      ...(d.reparto ? { dettaglio: d.reparto, reparto: d.reparto } : {}),
      ...(tit ? { titolo: tit } : {}),
      ...(d.codice_fiscale ? { cf: d.codice_fiscale } : {}),
      ...(d.luogo_nascita ? { natoA: d.luogo_nascita } : {}),
      ...(d.data_nascita ? { dataNascita: d.data_nascita } : {}),
    };
  };

  if ("ruolo" in voce.sorgente) {
    const idRuoli = new Set(ruoliSquadra(voce.sorgente.ruolo, dati.ruoli).map((r) => r.id));
    const ids = new Set(
      dati.assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id),
    );
    for (const d of dati.dipendenti) {
      if (ids.has(d.id) && inForza(d)) {
        aggiungi(nominatoDaDipendente(d, "ruolo"));
      }
    }
  } else {
    const { voce: rx } = voce.sorgente;

    // 1. Ruoli corrispondenti già censiti nel DB
    const ruoliCorrispondenti = dati.ruoli.filter((r) => rx.test(r.nome));
    if (ruoliCorrispondenti.length > 0) {
      const idRuoli = new Set(ruoliCorrispondenti.map((r) => r.id));
      const dipendentiAssegnati = new Set(
        dati.assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id),
      );
      for (const d of dati.dipendenti) {
        if (dipendentiAssegnati.has(d.id) && inForza(d)) {
          aggiungi(nominatoDaDipendente(d, "ruolo"));
        }
      }
    }

    // 2. Voci libere dell'organigramma A3
    for (const v of normalizzaVociOrganigramma(dati.voci).filter((x) => rx.test(x.titolo))) {
      for (const grezzo of v.nomi) {
        const nome = grezzo.replace(/\s*\*+\s*$/, "").trim();
        if (nome) {
          const match = dati.dipendenti.find(
            (d) => inForza(d) && nomeCompleto(d).toLowerCase() === nome.toLowerCase(),
          );
          if (match) {
            aggiungi(nominatoDaDipendente(match, "voce"));
          } else {
            aggiungi({ id: `voce:${nome}`, nome, origine: "voce" });
          }
        }
      }
    }
  }

  return out.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

/** Lavoratori in forza che si possono aggiungere a mano ai nominati. */
export function candidatiManuali(dipendenti: Dipendente[], gia: Nominato[]): Nominato[] {
  const presenti = new Set(gia.map((n) => n.nome.toLocaleLowerCase("it")));
  return dipendenti
    .filter(inForza)
    .map((d): Nominato => {
      const tit = titoloNominato(d);
      return {
        id: d.id,
        nome: nomeCompleto(d),
        origine: "manuale",
        ...(d.reparto ? { dettaglio: d.reparto, reparto: d.reparto } : {}),
        ...(tit ? { titolo: tit } : {}),
        ...(d.codice_fiscale ? { cf: d.codice_fiscale } : {}),
        ...(d.luogo_nascita ? { natoA: d.luogo_nascita } : {}),
        ...(d.data_nascita ? { dataNascita: d.data_nascita } : {}),
      };
    })
    .filter((n) => !presenti.has(n.nome.toLocaleLowerCase("it")))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
