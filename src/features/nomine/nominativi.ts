/*
 * File:      nominativi.ts
 * Percorso:  src/features/nomine/nominativi.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — I nominati sono quelli dell'organigramma: ruoli assegnati ai lavoratori oppure voci libere.
 *   rev 2 — 13/11/2026 13:20 — Registro antincendio, DPI e SDS leggono sia le assegnazioni dirette nel DB (se presenti),
 *            sia la corrispondenza per nome tra voce dell'organigramma e lavoratore in forza con anagrafica completa.
 */
import type { Dipendente } from "@/lib/api";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { VoceOrganigramma } from "@/lib/api/ditta";
import { normalizzaVociOrganigramma } from "@/features/stampe/organigramma-a3";
import { ruoliDelGruppo } from "@/features/stampe/stampa-selezioni";
import type { VoceElencoNomine } from "./tipi";
import { titoloNominato } from "./titolo-nominato";

export type Nominato = {
  id: string;
  nome: string;
  titolo?: string;
  reparto?: string;
  cf?: string;
  natoA?: string;
  dataNascita?: string;
};

export function nominatiDaOrganigramma(
  tipo: VoceElencoNomine["tipo"],
  dipendenti: Dipendente[],
  ruoli: RuoloSicurezza[],
  assegnazioni: AssegnazioneRuolo[],
  vociOrganigramma: VoceOrganigramma[],
): Nominato[] {
  const inForza = dipendenti.filter((d) => d.stato === "in_forza");
  const mappaDipendenti = new Map(inForza.map((d) => [d.id, d]));
  const nomeCompleto = (d: Dipendente) => `${d.cognome} ${d.nome ?? ""}`.trim();

  // Mappa per ricerca per cognome e nome normalizzato
  const mappaPerNome = new Map<string, Dipendente>();
  for (const d of inForza) {
    mappaPerNome.set(nomeCompleto(d).toLowerCase(), d);
  }

  const nominatoDaDipendente = (d: Dipendente): Nominato => ({
    id: d.id,
    nome: nomeCompleto(d),
    ...(titoloNominato(d) ? { titolo: titoloNominato(d) } : {}),
    ...(d.reparto ? { reparto: d.reparto } : {}),
    ...(d.codice_fiscale ? { cf: d.codice_fiscale } : {}),
    ...(d.luogo_nascita ? { natoA: d.luogo_nascita } : {}),
    ...(d.data_nascita ? { dataNascita: d.data_nascita } : {}),
  });

  const daRuoli = (chiaveGruppo: string): Nominato[] => {
    const idRuoli = new Set(
      ruoliDelGruppo(chiaveGruppo, ruoli)
        .filter((r) => !r.obbligatorio_tutti && r.nome.trim().toLowerCase() !== "lavoratore")
        .map((r) => r.id),
    );
    const idDipendenti = Array.from(new Set(assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id)));
    return idDipendenti
      .map((id) => mappaDipendenti.get(id)!)
      .filter(Boolean)
      .map(nominatoDaDipendente)
      .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  };

  if (tipo === "primo-soccorso") return daRuoli("primo-soccorso");
  if (tipo === "antincendio") return daRuoli("antincendio");
  if (tipo === "evacuazione") return daRuoli("evacuazione");
  if (tipo === "dae") return daRuoli("defibrillatore");
  if (tipo === "preposto") return daRuoli("preposti");

  // Voci dell'organigramma A3
  const vociNorm = normalizzaVociOrganigramma(vociOrganigramma);
  const trovaVoce = (regex: RegExp) => vociNorm.find((v) => regex.test(v.titolo));

  let voceTrovata: VoceOrganigramma | undefined;
  let chiaveRuoloCorrispondente = "";

  if (tipo === "registro-antincendio") {
    voceTrovata = trovaVoce(/registro\s+antincendio/i);
    chiaveRuoloCorrispondente = "registro antincendio";
  } else if (tipo === "dpi") {
    voceTrovata = trovaVoce(/\bd\.?\s?p\.?\s?i\b/i);
    chiaveRuoloCorrispondente = "d.p.i";
  } else if (tipo === "sds") {
    voceTrovata = trovaVoce(/\bsds\b/i);
    chiaveRuoloCorrispondente = "sds";
  }

  // 1. Cerca prima se ci sono assegnazioni dirette nel DB per quel ruolo
  if (chiaveRuoloCorrispondente) {
    const ruoliDb = ruoli.filter((r) => r.nome.toLowerCase().includes(chiaveRuoloCorrispondente));
    if (ruoliDb.length > 0) {
      const idRuoliDb = new Set(ruoliDb.map((r) => r.id));
      const idDip = Array.from(new Set(assegnazioni.filter((a) => idRuoliDb.has(a.ruolo_id)).map((a) => a.dipendente_id)));
      if (idDip.length > 0) {
        return idDip
          .map((id) => mappaDipendenti.get(id)!)
          .filter(Boolean)
          .map(nominatoDaDipendente)
          .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
      }
    }
  }

  // 2. Se non ancora assegnati tramite DB, leggi i nominativi dalla voce dell'organigramma
  if (!voceTrovata) return [];

  return voceTrovata.nomi
    .map((testo) => {
      const pulito = testo.trim();
      const corrispondenza = mappaPerNome.get(pulito.toLowerCase());
      if (corrispondenza) {
        return nominatoDaDipendente(corrispondenza);
      }
      return {
        id: `voce:${pulito.toLowerCase()}`,
        nome: pulito,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}
