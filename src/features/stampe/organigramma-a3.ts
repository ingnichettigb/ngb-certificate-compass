/*
 * File:      organigramma-a3.ts
 * Percorso:  src/features/stampe/organigramma-a3.ts
 * Data creaz: 10/11/2026
 * Revisioni:
 *   rev 1 — 10/11/2026 16:10 — Dati della tavola «Organigramma A3» (come il modello del Liceo): figure di vertice dalla Ditta,
 *            blocchi Preposti / Primo soccorso / Defibrillatore / Evacuazione / Antincendio dagli incarichi assegnati
 *            (ATA prima, poi Docenti), «*» = da formare (nessun attestato valido del gruppo), voci libere salvate nella Ditta.
 *   rev 2 — 12/11/2026 — Riquadro Preposti con nomi oppure tolto (ModoPreposti, applicaModoPreposti). La voce «Preposti di laboratorio» diventa
 *            «CATEGORIE DI PREPOSTI» e resta sempre in tavola (normalizzaVociOrganigramma: rinomina la vecchia voce, la aggiunge se manca).
 *   rev 3 — 12/11/2026 — Nomi in forma breve per tutti: COGNOME + iniziali puntate (Mario → «M.», Maria Grazia → «M. G.»). Se due persone della tavola
 *            avrebbero lo stesso testo (stesso cognome e stesse iniziali) restano scritte per esteso, così non ci si confonde.
 *   rev 4 — 12/11/2026 21:15 — Ripristinate le funzioni rev 2–3 perse; mantenuto «valido» = ciclo del gruppo in regola (attestatiCorrenti, tolleranza Primo Soccorso).
 *   rev 5 — 13/11/2026 — Nuove voci sotto il registro antincendio: «Responsabile distribuzione D.P.I.» e «Responsabile custodia SDS» (nominativo da
 *            scrivere tra le voci, come il registro antincendio). Compaiono sempre (normalizzaVociOrganigramma le aggiunge se mancano).
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

/**
 * Le «CATEGORIE DI PREPOSTI» restano sempre in tavola: la vecchia voce «Preposti di laboratorio» (anche se già salvata nella Ditta)
 * prende il nuovo titolo con i suoi nominativi; se non c'è più, torna quella predefinita. Lo stesso per «Responsabile distribuzione
 * D.P.I.» e «Responsabile custodia SDS» (se la voce c'è già, con qualsiasi nominativo, resta com'è).
 */
export function normalizzaVociOrganigramma(voci: VoceOrganigramma[]): VoceOrganigramma[] {
  const base = voci.length ? voci : VOCI_PREDEFINITE;
  const rinominate = base.map((v) => (eCategoriePreposti(v.titolo) ? { ...v, titolo: TITOLO_CATEGORIE_PREPOSTI } : v));
  const fisse: Array<[(t: string) => boolean, VoceOrganigramma]> = [
    [(t) => t === TITOLO_CATEGORIE_PREPOSTI, VOCI_PREDEFINITE.find((v) => v.titolo === TITOLO_CATEGORIE_PREPOSTI)!],
    [eResponsabileDpi, { titolo: TITOLO_RESPONSABILE_DPI, nomi: [] }],
    [eResponsabileSds, { titolo: TITOLO_RESPONSABILE_SDS, nomi: [] }],
  ];
  const mancanti = fisse.filter(([riconosce]) => !rinominate.some((v) => riconosce(v.titolo))).map(([, v]) => v);
  return mancanti.length ? [...rinominate, ...mancanti] : rinominate;
}

/** «categorie»: toglie il riquadro Preposti con i nominativi; «nomi»: i blocchi come sono. Le categorie (voce libera) non si toccano. */
export function applicaModoPreposti(blocchi: BloccoOrganigramma[], modo: ModoPreposti): BloccoOrganigramma[] {
  return modo === "nomi" ? blocchi : blocchi.filter((b) => b.chiave !== "preposti");
}

/** Voci fisse proposte la prima volta (modificabili e ampliabili dalla pagina). */
export const VOCI_PREDEFINITE: VoceOrganigramma[] = [
  { titolo: "Evacuazione – figure di classe", nomi: ["Personale insegnante presente", "Alunni aprifila", "Alunni chiudifila", "Alunni addetti ai diversamente abili"] },
  { titolo: TITOLO_CATEGORIE_PREPOSTI, nomi: ["Professori di lab. scientifico", "Professori di lab. fisica ed ed. fisica"] },
  { titolo: "Addetti registro antincendio", nomi: [] },
  { titolo: TITOLO_RESPONSABILE_DPI, nomi: [] },
  { titolo: TITOLO_RESPONSABILE_SDS, nomi: [] },
];

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
  oggi = new Date(),
): BloccoOrganigramma[] {
  const oggiIso = isoOggi(oggi);
  // Scadenza del ciclo del gruppo (non del singolo attestato); i Base già rinnovati non contano.
  const correnti = attestatiCorrenti(attestati.filter((a) => a.stato_validazione === "Approvato"), oggi);
  const perId = new Map(dipendenti.filter((d) => d.stato_lavoratore !== "cessato").map((d) => [d.id, d]));
  const perBlocco = BLOCCHI_A3.map(({ chiave, titolo }) => {
    const idRuoli = new Set(ruoliSquadra(chiave, ruoli).map((r) => r.id));
    const ids = new Set(assegnazioni.filter((a) => idRuoli.has(a.ruolo_id)).map((a) => a.dipendente_id));
    const membri = [...ids].map((id) => perId.get(id)).filter(Boolean) as Dipendente[];
    membri.sort((a, b) => a.cognome.localeCompare(b.cognome, "it") || a.nome.localeCompare(b.nome, "it"));
    return { chiave, titolo, membri };
  });
  // Forma breve uguale per due persone diverse della tavola (stesso cognome e stesse iniziali): queste restano per esteso
  const persone = new Map<string, Set<string>>();
  for (const { membri } of perBlocco) for (const d of membri) persone.set(nomeBreve(d), (persone.get(nomeBreve(d)) ?? new Set()).add(d.id));
  const etichetta = (d: Dipendente) => ((persone.get(nomeBreve(d))?.size ?? 0) > 1 ? nomeEsteso(d) : nomeBreve(d));
  return perBlocco.map(({ chiave, titolo, membri }) => {
    const voce = (d: Dipendente): NomeBlocco => {
      const valido = correnti.some(
        (a) =>
          a.dipendente_id === d.id &&
          a.stato_validazione === "Approvato" &&
          assegnaGruppoArgomento(a.tipi_corso ?? {}).chiave === chiave &&
          (!a.data_scadenza_calcolata || a.data_scadenza_calcolata >= oggiIso),
      );
      return { testo: etichetta(d), daFormare: !valido };
    };
    return {
      chiave,
      titolo,
      ata: membri.filter((d) => !eDocente(d)).map(voce),
      docenti: membri.filter(eDocente).map(voce),
    };
  });
}

/** Salva solo le voci libere dell'organigramma nella riga Ditta. */
export async function salvaVociOrganigramma(voci: VoceOrganigramma[]) {
  const pulite = voci
    .map((v) => ({ titolo: v.titolo.trim(), nomi: v.nomi.map((n) => n.trim()).filter(Boolean) }))
    .filter((v) => v.titolo);
  const { error } = await sb.from("ditta").update({ organigramma_voci: pulite }).eq("id", true);
  if (error) throw error;
  return pulite;
}
