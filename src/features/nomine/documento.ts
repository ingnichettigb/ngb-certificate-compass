/*
 * File:      documento.ts
 * Percorso:  src/features/nomine/documento.ts
 * Data creaz: 12/11/2026
 * Revisioni:
 *   rev 1 — 12/11/2026 — Dal modello e dai dati (ditta, nominato, protocollo…) costruisce l'elenco dei blocchi del documento.
 *            Anteprima a schermo e PDF leggono la stessa lista, così sono sempre uguali.
 */
import type { DittaRecord } from "@/lib/api/ditta";
import type { ModelloNomina } from "./tipi";

export type DatiNomina = {
  nome: string;
  anno: string;
  protocollo: string;
  /** Data già formattata gg/mm/aaaa. */
  data: string;
};

export type Blocco =
  | { t: "titolo"; testo: string }
  | { t: "protocollo"; protocollo: string; anno: string }
  | { t: "destinatario"; nome: string }
  | { t: "oggetto"; testo: string }
  | { t: "paragrafo"; testo: string }
  | { t: "sottotitolo"; testo: string }
  | { t: "voce"; numero: number; testo: string }
  | { t: "puntato"; testo: string }
  | { t: "rientrato"; testo: string }
  | {
      t: "firma-dirigente";
      luogo: string;
      data: string;
      qualifica: string;
      nome: string;
      note: string[];
    }
  | { t: "presa-visione"; etichetta: string; nome: string }
  | { t: "formazione"; figura: string; nome: string; data: string };

/** Anno scolastico/di lavoro: da settembre in poi «2026-2027», prima «2025-2026». */
export function annoScolastico(oggi = new Date()): string {
  const a = oggi.getFullYear();
  const inizio = oggi.getMonth() >= 8 ? a : a - 1;
  return `${inizio}-${inizio + 1}`;
}

export function dataItaliana(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Valori dei segnaposto che dipendono dalla ditta. */
export function valoriDitta(ditta: Partial<DittaRecord> | null | undefined) {
  return {
    istituto: ditta?.ragione_sociale?.trim() || "—",
    luogo: ditta?.comune?.trim() || "",
    firmatario: ditta?.datore_di_lavoro?.trim() || "",
    qualifica_firmatario: ditta?.e_scuola ? "Il Dirigente Scolastico" : "Il Datore di Lavoro",
  };
}

/** Sostituisce {{chiave}}; un segnaposto sconosciuto resta com'è, così si vede l'errore di battitura. */
export function sostituisciSegnaposto(testo: string, valori: Record<string, string>): string {
  return testo.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/gi,
    (tutto, k: string) => valori[k.toLowerCase()] ?? tutto,
  );
}

/** Righe del corpo → blocchi. «# » sottotitolo, «- » puntato, «> » rientrato, altrimenti voce numerata. */
export function blocchiCorpo(corpo: string): Blocco[] {
  const out: Blocco[] = [];
  let n = 0;
  for (const grezza of corpo.split(/\r?\n/)) {
    const riga = grezza.trim();
    if (!riga) continue;
    if (riga.startsWith("# ")) out.push({ t: "sottotitolo", testo: riga.slice(2).trim() });
    else if (riga.startsWith("- ")) out.push({ t: "puntato", testo: riga.slice(2).trim() });
    else if (riga.startsWith("> ")) out.push({ t: "rientrato", testo: riga.slice(2).trim() });
    else out.push({ t: "voce", numero: ++n, testo: riga });
  }
  return out;
}

const paragrafi = (testo: string) =>
  testo
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

/** Costruisce tutti i blocchi di una nomina. */
export function costruisciDocumento(
  modello: ModelloNomina,
  ditta: Partial<DittaRecord> | null | undefined,
  dati: DatiNomina,
): Blocco[] {
  const d = valoriDitta(ditta);
  const valori: Record<string, string> = {
    ...d,
    nome: dati.nome,
    anno: dati.anno,
    protocollo: dati.protocollo,
    data: dati.data,
  };
  const s = (t: string) => sostituisciSegnaposto(t, valori);
  const out: Blocco[] = [
    { t: "titolo", testo: s(modello.titolo) },
    { t: "protocollo", protocollo: dati.protocollo, anno: dati.anno },
    { t: "destinatario", nome: dati.nome },
    { t: "oggetto", testo: s(modello.oggetto) },
    ...paragrafi(modello.introduzione).map((testo): Blocco => ({
      t: "paragrafo",
      testo: s(testo),
    })),
    ...blocchiCorpo(modello.corpo).map((b): Blocco =>
      "testo" in b ? { ...b, testo: s(b.testo) } : b,
    ),
  ];
  const chiusura = paragrafi(modello.chiusura).map(s);
  // L'ultimo paragrafo «Distinti saluti.» resta attaccato alla firma: qui si emettono gli altri.
  for (const p of chiusura) out.push({ t: "paragrafo", testo: p });
  out.push({
    t: "firma-dirigente",
    luogo: d.luogo,
    data: dati.data,
    qualifica: d.qualifica_firmatario,
    nome: d.firmatario,
    note: modello.nota_firma
      .split(/\r?\n/)
      .map((r) => s(r).trim())
      .filter(Boolean),
  });
  if (modello.formazione.trim())
    out.push({ t: "formazione", figura: s(modello.formazione), nome: dati.nome, data: dati.data });
  out.push({ t: "presa-visione", etichetta: s(modello.etichetta_firma), nome: dati.nome });
  return out;
}

/** Testo semplice del documento (per i test e per controllare che i segnaposto siano stati tutti sostituiti). */
export function testoDocumento(blocchi: Blocco[]): string {
  return blocchi
    .map((b) => {
      switch (b.t) {
        case "titolo":
        case "oggetto":
        case "paragrafo":
        case "sottotitolo":
        case "puntato":
        case "rientrato":
          return b.testo;
        case "voce":
          return `${b.numero}. ${b.testo}`;
        case "protocollo":
          return `prot. N° ${b.protocollo} ${b.anno}`;
        case "destinatario":
          return `Spett.le ${b.nome}`;
        case "firma-dirigente":
          return [b.luogo, b.data, b.qualifica, b.nome, ...b.note].join(" ");
        case "presa-visione":
          return `${b.etichetta} ${b.nome}`;
        case "formazione":
          return `${b.figura} ${b.nome}`;
      }
    })
    .join("\n");
}
