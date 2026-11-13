/*
 * File:      organigramma-a3.ts
 * Percorso:  src/features/stampe/organigramma-a3.ts
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 16:10 — Dati della tavola «Organigramma A3» (figure di vertice, squadre, voci libere).
 *   rev 2 — 12/11/2026 — Riquadro Preposti con nomi oppure tolto; «CATEGORIE DI PREPOSTI» sempre in tavola.
 *   rev 3 — 12/11/2026 — Nomi in forma breve per tutti: COGNOME + iniziali puntate.
 *   rev 4 — 12/11/2026 21:15 — Ripristinate funzioni rev 2–3; «valido» = ciclo del gruppo in regola.
 *   rev 5 — 13/11/2026 — Nuove voci sotto il registro antincendio: DPI e SDS.
 *   rev 6 — 13/11/2026 13:20 — Voci con tipo ('ruolo' azzurro collegato a ruolo_id, 'nota' marroncino descrittiva).
 */
import type { Attestato, Dipendente } from "@/lib/api";
import { sb } from "@/lib/api/client";
import type { AssegnazioneRuolo, RuoloSicurezza } from "@/lib/api/ruoli";
import type { VoceOrganigramma } from "@/lib/api/ditta";
import { assegnaGruppoArgomento } from "@/features/tipi-corso/tipi-raggruppamento";
import { ruoliDelGruppo } from "./stampa-selezioni";
import { attestatiCorrenti } from "@/features/scadenze/preposti";

export type NomeBlocco = { testo: string; daFormare: boolean };
export type BloccoOrganigramma = { chiave: string; titolo: string; ata: NomeBlocco[]; docenti: NomeBlocco[] };

/** Riquadro Preposti: «nomi» = con i nominativi; «categorie» = senza (restano sempre le «CATEGORIE DI PREPOSTI»). */
export type ModoPreposti = "nomi" | "categorie";

export const BLOCCHI_A3 = [
  { chiave: "preposti", titolo: "Preposti" },
  { chiave: "primo-soccorso", titolo: "Addetti primo soccorso" },
  { chiave: "defibrillatore", titolo: "Addetti defibrillatore" },
  { chiave: "evacuazione", titolo: "Addetti all'evacuazione" },
  { chiave: "antincendio", titolo: "Addetti antincendio" },
  { chiave: "privacy", titolo: "Incaricati privacy" },
] as const;

/** Titolo della voce con le categorie di preposti (la ex «Preposti di laboratorio»). */
export const TITOLO_CATEGORIE_PREPOSTI = "CATEGORIE DI PREPOSTI";

/** Mini categorie sotto il registro antincendio: il responsabile si scrive tra le voci libere, come per il registro. */
export const TITOLO_RESPONSABILE_DPI = "Responsabile distribuzione D.P.I.";
export const TITOLO_RESPONSABILE_SDS = "Responsabile custodia SDS";
const eResponsabileDpi = (titolo: string) => /\bd\.?\s?p\.?\s?i\b/i.test(titolo);
const eResponsabileSds = (titolo: string) => /\bsds\b/i.test(titolo);

const eCategoriePreposti = (titolo: string) => /categori\w*\s+(di\s+)?prepost|prepost\w*\s+di\s+laborator/i.test(titolo);

/** Voci fisse proposte la prima volta: note marroncine e ruoli azzurri. */
export const VOCI_PREDEFINITE: VoceOrganigramma[] = [
  {
    titolo: "Evacuazione – figure di classe",
    nomi: ["Personale insegnante presente", "Alunni aprifila", "Alunni chiudifila", "Alunni addetti ai diversamente abili"],
    tipo: "nota",
  },
  {
    titolo: TITOLO_CATEGORIE_PREPOSTI,
    nomi: ["Professori di lab. scientifico", "Professori di lab. fisica ed ed. fisica"],
    tipo: "nota",
  },
  { titolo: "Addetto al registro antincendio", nomi: [], tipo: "ruolo" },
  { titolo: TITOLO_RESPONSABILE_DPI, nomi: [], tipo: "ruolo" },
  { titolo: TITOLO_RESPONSABILE_SDS, nomi: [], tipo: "ruolo" },
];

/**
 * Normalizza le voci dell'organigramma preservando tipo e ruolo_id.
 */
export function normalizzaVociOrganigramma(voci: VoceOrganigramma[]): VoceOrganigramma[] {
  const base = voci.length ? voci : VOCI_PREDEFINITE;
  const rinominate = base.map((v) => {
    const titolo = eCategoriePreposti(v.titolo) ? TITOLO_CATEGORIE_PREPOSTI : v.titolo;
    const tipo = v.tipo ?? (eCategoriePreposti(titolo) || titolo.startsWith("Evacuazione") ? "nota" : "ruolo");
    return { ...v, titolo, tipo };
  });
  const fisse: Array<[(t: string) => boolean, VoceOrganigramma]> = [
    [(t) => t === TITOLO_CATEGORIE_PREPOSTI, VOCI_PREDEFINITE.find((v) => v.titolo === TITOLO_CATEGORIE_PREPOSTI)!],
    [eResponsabileDpi, { titolo: TITOLO_RESPONSABILE_DPI, nomi: [], tipo: "ruolo" }],
    [eResponsabileSds, { titolo: TITOLO_RESPONSABILE_SDS, nomi: [], tipo: "ruolo" }],
  ];
  const mancanti = fisse.filter(([riconosce]) => !rinominate.some((v) => riconosce(v.titolo))).map(([, v]) => v);
  return mancanti.length ? [...rinominate, ...mancanti] : rinominate;
}

/** «categorie»: toglie il riquadro Preposti con i nominativi; «nomi»: i blocchi come sono. */
export function applicaModoPreposti(blocchi: BloccoOrganigramma[], modo: ModoPreposti): BloccoOrganigramma[] {
  return modo === "nomi" ? blocchi : blocchi.filter((b) => b.chiave !== "preposti");
}

const isoOggi = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const eDocente = (d: Dipendente) => (d.reparto ?? "").toLowerCase().startsWith("docen");

/** Iniziali puntate del nome: «Mario» → «M.», «Maria Grazia» → «M. G.», «Anna-Maria» → «A. M.». */
export function inizialiNome(nome: string): string {
  return nome
    .split(/[\s-]+/)
    .map((p) => p.replace(/^[^\p{L}]+/u, ""))
    .filter(Boolean)
    .map((p) => `${p.charAt(0).toLocaleUpperCase("it")}.`)
    .join(" ");
}

/** Forma breve di un lavoratore: COGNOME + iniziali puntate (solo il cognome se manca il nome). */
export const nomeBreve = (d: Pick<Dipendente, "cognome" | "nome">) => `${d.cognome} ${inizialiNome(d.nome ?? "")}`.trim();
const nomeEsteso = (d: Pick<Dipendente, "cognome" | "nome">) => `${d.cognome} ${d.nome ?? ""}`.trim();

/** Ruoli di squadra del gruppo (esclusi gli obblighi «per tutti» e «Lavoratore»). */
function ruoliSquadra(chiave: string, ruoli: RuoloSicurezza[]) {
  return ruoliDelGruppo(chiave, ruoli).filter((r) => !r.obbligatorio_tutti && r.nome.trim().toLowerCase() !== "lavoratore");
}

export function calcolaBlocchiA3(
  dipendenti: Dipendente[],
  attestati: Attestato[],
  ruoli: RuoloSicurezza[],
  assegnazioni: AssegnazioneRuolo[],
): BloccoOrganigramma[] {
  const oggiIso = isoOggi(new Date());
  const inForza = dipendenti.filter((d) => d.stato === "in_forza");
  const idInForza = new Set(inForza.map((d) => d.id));
  const mappaDipendenti = new Map(inForza.map((d) => [d.id, d]));

  const assegnati = assegnazioni.filter((a) => idInForza.has(a.dipendente_id));
  const mappaRuoli = new Map(ruoli.map((r) => [r.id, r]));

  const conteggiBrevi = new Map<string, number>();
  for (const d of inForza) {
    const b = nomeBreve(d);
    conteggiBrevi.set(b, (conteggiBrevi.get(b) ?? 0) + 1);
  }
  const etichettaNome = (d: Dipendente) => ((conteggiBrevi.get(nomeBreve(d)) ?? 0) > 1 ? nomeEsteso(d) : nomeBreve(d));

  return BLOCCHI_A3.map(({ chiave, titolo }) => {
    const idRuoli = new Set(ruoliSquadra(chiave, ruoli).map((r) => r.id));
    const idDip = Array.from(new Set(assegnati.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id)));

    const persone = idDip
      .map((id) => mappaDipendenti.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || (a.nome ?? "").localeCompare(b.nome ?? "", "it"));

    const creaNomeBlocco = (d: Dipendente): NomeBlocco => {
      const attValidi = attestatiCorrenti(
        attestati.filter((att) => att.dipendente_id === d.id),
        oggiIso,
      ).filter((att) => {
        const r = att.tipo_corso_id ? mappaRuoli.get(att.tipo_corso_id) : undefined;
        const arg = r?.macro_categoria ?? assegnaGruppoArgomento(att.tipo_corso_id ?? att.corso_nome ?? "");
        return ruoliDelGruppo(chiave, [{ id: "", nome: arg, descrizione: null, macro_categoria: arg, obbligatorio_tutti: false }]).length > 0;
      });
      return { testo: etichettaNome(d), daFormare: attValidi.length === 0 };
    };

    return {
      chiave,
      titolo,
      ata: persone.filter((d) => !eDocente(d)).map(creaNomeBlocco),
      docenti: persone.filter(eDocente).map(creaNomeBlocco),
    };
  });
}
