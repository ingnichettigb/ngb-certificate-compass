/*
 * File:      genera.ts
 * Percorso:  src/features/stampe/globale/genera.ts
 * Data creaz: 11/11/2026
 * Revisioni:
 *   rev 1 — 11/11/2026 — Regia della «Stampa globale»: prepara i lavoratori, stima la dimensione (intestazioni HTTP dei file, senza
 *            scaricarli), divide in blocchi e genera un blocco alla volta: copertina → (solo blocco 1) organigramma A3 →
 *            per ogni lavoratore scheda + PDF degli attestati → indice e controlli. Un blocco alla volta in memoria.
 *            Si può annullare in ogni momento (AbortSignal).
 *   rev 2 — 12/11/2026 06:53 — Logo della copertina dalla stessa anagrafica aziendale dei PDF A3/A4.
 */
import { PDFDocument } from "pdf-lib";
import type { Attestato, Dipendente } from "@/lib/api";
import type { DittaRecord, VoceOrganigramma } from "@/lib/api/ditta";
import { ruoliDelDipendente, type AssegnazioneRuolo, type RuoloSicurezza } from "@/lib/api/ruoli";
import { byteLogoDitta } from "@/lib/identita-ditta";
import { calcolaBlocchiA3, VOCI_PREDEFINITE } from "../organigramma-a3";
import {
  COLONNE_TAVOLA,
  impaginaPerFunzione,
  type ElementoFunzionale,
} from "../impagina-organigramma-a3";
import { costruisciRiquadriPdf, creaPdfOrganigrammaA3 } from "../esporta-organigramma-a3-pdf";
import { appendiAllegato, dimensioneAllegato, leggiAllegato, type EsitoAllegato } from "./allegati";
import { raggruppaPerFunzione } from "./ordine-attestati";
import {
  BYTE_SCHEDA,
  dividiInBlocchi,
  etichettaIntervallo,
  nomeFileBlocco,
  ordinaLavoratori,
  type Blocco,
  type VoceStima,
} from "./piano-blocchi";
import {
  applicaPiedeDiPagina,
  caricaCaratteri,
  disegnaCopertina,
  disegnaPaginaFinale,
  disegnaScheda,
  type Problema,
  type VoceIndice,
} from "./pagine-fisse";

export type DatiStampaGlobale = {
  dipendenti: Dipendente[];
  /** Attestati approvati (con tipi_corso collegato). */
  attestati: Attestato[];
  ruoli: RuoloSicurezza[];
  assegnazioni: AssegnazioneRuolo[];
  ditta: DittaRecord | null | undefined;
};

export type OpzioniStampaGlobale = {
  includiCessati: boolean;
  limiteByte: number;
  indicazioni: string;
};

export type LavoratoreScheda = { dip: Dipendente; attestati: Attestato[] };

export const INDICAZIONI_PREDEFINITE =
  "Fascicolo di tutti i lavoratori in ordine alfabetico.\nPer ciascuno: scheda con dati anagrafici, funzioni a cui è incaricato ed elenco degli attestati, seguita dai documenti.\nL'organigramma della sicurezza (formato A3) è la seconda pagina del primo blocco.";

export type PianoStampa = {
  blocchi: Blocco[];
  lavoratori: LavoratoreScheda[];
  byteTotali: number;
  senzaFile: number;
};

export function preparaLavoratori(
  dati: DatiStampaGlobale,
  includiCessati: boolean,
): LavoratoreScheda[] {
  const per = new Map<string, Attestato[]>();
  for (const a of dati.attestati)
    per.set(a.dipendente_id, [...(per.get(a.dipendente_id) ?? []), a]);
  const dip = dati.dipendenti.filter((d) => includiCessati || d.stato_lavoratore !== "cessato");
  return ordinaLavoratori(dip).map((d) => ({ dip: d, attestati: per.get(d.id) ?? [] }));
}

const fileDi = (a: Attestato) =>
  [a.url_foto_fronte, a.url_foto_retro].filter((x): x is string => !!x && x.trim() !== "");

/** Esegue `compito` su tutti gli elementi con al massimo `n` richieste insieme. */
async function inParallelo<T>(
  elementi: T[],
  n: number,
  compito: (e: T) => Promise<void>,
  segnale?: AbortSignal,
) {
  let i = 0;
  const lavora = async () => {
    while (i < elementi.length) {
      if (segnale?.aborted) throw new DOMException("Annullato", "AbortError");
      await compito(elementi[i++] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(n, elementi.length) }, lavora));
}

export async function stimaPiano(
  dati: DatiStampaGlobale,
  opz: OpzioniStampaGlobale,
  avanzamento?: (fatti: number, totale: number) => void,
  segnale?: AbortSignal,
): Promise<PianoStampa> {
  const lavoratori = preparaLavoratori(dati, opz.includiCessati);
  const compiti = lavoratori.flatMap((l) =>
    l.attestati.flatMap((a) => fileDi(a).map((p) => ({ id: l.dip.id, p }))),
  );
  const byte = new Map<string, number>();
  let fatti = 0;
  let senzaFile = lavoratori.reduce(
    (n, l) => n + l.attestati.filter((a) => fileDi(a).length === 0).length,
    0,
  );
  await inParallelo(
    compiti,
    6,
    async (c) => {
      const d = await dimensioneAllegato(c.p);
      if (d === 0) senzaFile++;
      byte.set(c.id, (byte.get(c.id) ?? 0) + d);
      avanzamento?.(++fatti, compiti.length);
    },
    segnale,
  );
  const voci: VoceStima[] = lavoratori.map((l) => ({
    id: l.dip.id,
    cognome: l.dip.cognome,
    nome: l.dip.nome,
    byte: (byte.get(l.dip.id) ?? 0) + BYTE_SCHEDA * (1 + Math.ceil(l.attestati.length / 20)),
  }));
  const blocchi = dividiInBlocchi(voci, opz.limiteByte);
  return { blocchi, lavoratori, byteTotali: blocchi.reduce((s, b) => s + b.byte, 0), senzaFile };
}

const annoScolastico = (d = new Date()) => {
  const y = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
};

/** Stessi dati e stessa disposizione della pagina «Organigramma A3» (carta 01), per riusarne il PDF come seconda pagina. */
async function pdfOrganigramma(dati: DatiStampaGlobale): Promise<Uint8Array> {
  const blocchi = calcolaBlocchiA3(dati.dipendenti, dati.attestati, dati.ruoli, dati.assegnazioni);
  const voci: VoceOrganigramma[] = dati.ditta?.organigramma_voci?.length
    ? dati.ditta.organigramma_voci
    : VOCI_PREDEFINITE;
  const vociVisibili = voci.filter((v) => v.titolo.trim());
  const elementi: ElementoFunzionale[] = [
    ...blocchi.map((b) => ({
      id: b.chiave,
      titolo: b.titolo,
      righe: b.ata.length + b.docenti.length,
      separatori: b.ata.length > 0 && b.docenti.length > 0 ? 1 : 0,
    })),
    ...vociVisibili.map((v, i) => ({
      id: `voce-${i}`,
      titolo: v.titolo,
      righe: v.nomi.filter((n) => n.trim()).length,
    })),
  ];
  const colonne = costruisciRiquadriPdf(
    impaginaPerFunzione(elementi, COLONNE_TAVOLA),
    blocchi,
    vociVisibili,
  );
  return creaPdfOrganigrammaA3({
    ditta: dati.ditta ?? undefined,
    annoScolastico: annoScolastico(),
    colonne,
  });
}

function caricaLogo(d?: DittaRecord | null): { bytes: Uint8Array; formato: "png" } | null {
  const bytes = byteLogoDitta(d);
  return bytes ? { bytes, formato: "png" } : null;
}

export type RisultatoBlocco = {
  nomeFile: string;
  bytes: Uint8Array;
  pagine: number;
  problemi: Problema[];
};

const descrizioneEsito = (e: EsitoAllegato): string =>
  e.tipo === "mancante"
    ? "file mancante"
    : e.tipo === "non-convertibile"
      ? `non convertibile: ${e.motivo}`
      : "";

/** Genera un blocco intero del piano. `organigramma` (già calcolato) serve solo per il blocco 1. */
export async function generaBlocco(
  dati: DatiStampaGlobale,
  piano: PianoStampa,
  blocco: Blocco,
  opz: OpzioniStampaGlobale,
  dataStampa: Date,
  avanzamento?: (testo: string, fatti: number, totale: number) => void,
  segnale?: AbortSignal,
): Promise<RisultatoBlocco> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Stampa globale – blocco ${blocco.numero}`);
  doc.setCreationDate(dataStampa);
  const c = await caricaCaratteri(doc);
  const intervallo = etichettaIntervallo(blocco.da, blocco.a);
  const d = dati.ditta;
  const riferimenti = [d?.indirizzo, d?.cap, d?.comune].filter(Boolean).join(" ");

  await disegnaCopertina(doc, c, {
    ditta: d?.ragione_sociale || "DITTA",
    logo: caricaLogo(d),
    numero: blocco.numero,
    totale: piano.blocchi.length,
    intervallo,
    lavoratori: blocco.voci.length,
    dataStampa,
    indicazioni: opz.indicazioni,
    ...(riferimenti ? { riferimenti } : {}),
  });

  if (blocco.numero === 1) {
    avanzamento?.("Organigramma A3", 0, blocco.voci.length);
    const a3 = await PDFDocument.load(await pdfOrganigramma(dati));
    const [pagina] = await doc.copyPages(a3, [0]);
    doc.addPage(pagina);
  }

  const perId = new Map(piano.lavoratori.map((l) => [l.dip.id, l]));
  const indice: VoceIndice[] = [];
  const problemi: Problema[] = [];
  let fatti = 0;

  for (const v of blocco.voci) {
    if (segnale?.aborted) throw new DOMException("Annullato", "AbortError");
    const l = perId.get(v.id);
    if (!l) continue;
    const nomeCompleto = `${l.dip.cognome} ${l.dip.nome}`;
    avanzamento?.(nomeCompleto, fatti, blocco.voci.length);

    const gruppi = raggruppaPerFunzione(l.attestati);
    const esiti = new Map<string, string>();
    const allegati: { attestato: Attestato; esiti: EsitoAllegato[] }[] = [];

    for (const a of gruppi.flatMap((g) => g.attestati)) {
      const percorsi = fileDi(a);
      const letti: EsitoAllegato[] = percorsi.length
        ? await Promise.all(percorsi.map((p) => leggiAllegato(p)))
        : [{ tipo: "mancante" }];
      allegati.push({ attestato: a, esiti: letti });
    }

    // Prima si inseriscono gli allegati in un documento temporaneo per conoscere l'esito reale (file rotti compresi)…
    const temp = await PDFDocument.create();
    const paginePerAttestato = new Map<string, number>();
    for (const { attestato, esiti: letti } of allegati) {
      let tot = 0;
      const motivi: string[] = [];
      for (const e of letti) {
        try {
          tot += await appendiAllegato(temp, e);
          const m = descrizioneEsito(e);
          if (m) motivi.push(m);
        } catch (err) {
          motivi.push(`errore: file danneggiato (${(err as Error).message})`);
        }
      }
      paginePerAttestato.set(attestato.id, tot);
      const corso = attestato.tipi_corso?.nome_corso ?? "Corso";
      if (motivi.length)
        problemi.push({ lavoratore: nomeCompleto, corso, motivo: motivi[0] ?? "" });
      esiti.set(
        attestato.id,
        motivi.length && tot === 0 ? (motivi[0] ?? "") : tot ? `allegato (${tot} pag.)` : "—",
      );
    }

    // …poi la scheda (che li elenca) e subito dopo i documenti.
    indice.push({ nome: nomeCompleto, pagina: doc.getPageCount() + 1 });
    await disegnaScheda(doc, c, {
      dip: l.dip,
      funzioni: ruoliDelDipendente(l.dip.id, dati.ruoli, dati.assegnazioni).map((r) => r.nome),
      gruppi,
      esitoPerAttestato: esiti,
    });
    if (temp.getPageCount()) {
      const copiate = await doc.copyPages(temp, temp.getPageIndices());
      copiate.forEach((p) => doc.addPage(p));
    }
    fatti++;
    avanzamento?.(nomeCompleto, fatti, blocco.voci.length);
  }

  disegnaPaginaFinale(doc, c, indice, problemi);
  applicaPiedeDiPagina(doc, c.n, blocco.numero, piano.blocchi.length);
  const bytes = await doc.save();
  return {
    nomeFile: nomeFileBlocco({
      numero: blocco.numero,
      data: dataStampa,
      ditta: d?.ragione_sociale,
      da: blocco.da,
      a: blocco.a,
    }),
    bytes,
    pagine: doc.getPageCount(),
    problemi,
  };
}
