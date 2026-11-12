/*
 * File:      nominativi.ts
 * Percorso:  src/features/nomine/nominativi.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — I nominati sono quelli dell'organigramma: ruoli assegnati ai lavoratori (primo soccorso, antincendio,
 *            evacuazione, defibrillatore, preposti) oppure voci libere dell'organigramma (registro antincendio, DPI, SDS).
 *            Cognome e nome per esteso (la forma breve dell'organigramma non va bene su una lettera di nomina).
 */
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { VoceOrganigramma } from "@/lib/api/ditta";
import { normalizzaVociOrganigramma } from "@/features/stampe/organigramma-a3";
import { ruoliDelGruppo } from "@/features/stampe/stampa-selezioni";
import type { VoceElencoNomine } from "./tipi";

export type Nominato = {
  /** Identificativo stabile: id del lavoratore, oppure «voce:<nome>» / «manuale:<nome>». */
  id: string;
  /** Cognome e nome, come scritto sulla lettera. */
  nome: string;
  origine: "ruolo" | "voce" | "manuale";
  /** Reparto del lavoratore (se noto), mostrato nell'indice. */
  dettaglio?: string;
};

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
  if ("ruolo" in voce.sorgente) {
    const idRuoli = new Set(ruoliSquadra(voce.sorgente.ruolo, dati.ruoli).map((r) => r.id));
    const ids = new Set(
      dati.assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id),
    );
    for (const d of dati.dipendenti) {
      if (ids.has(d.id) && inForza(d))
        aggiungi({
          id: d.id,
          nome: nomeCompleto(d),
          origine: "ruolo",
          ...(d.reparto ? { dettaglio: d.reparto } : {}),
        });
    }
  } else {
    const { voce: rx } = voce.sorgente;
    for (const v of normalizzaVociOrganigramma(dati.voci).filter((x) => rx.test(x.titolo))) {
      for (const grezzo of v.nomi) {
        const nome = grezzo.replace(/\s*\*+\s*$/, "").trim();
        if (nome) aggiungi({ id: `voce:${nome}`, nome, origine: "voce" });
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
    .map((d): Nominato => ({
      id: d.id,
      nome: nomeCompleto(d),
      origine: "manuale",
      ...(d.reparto ? { dettaglio: d.reparto } : {}),
    }))
    .filter((n) => !presenti.has(n.nome.toLocaleLowerCase("it")))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
