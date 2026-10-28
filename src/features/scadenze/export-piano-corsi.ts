/*
 * File:      export-piano-corsi.ts
 * Percorso:  src/features/scadenze/export-piano-corsi.ts
 * Data creaz: 28/10/2026
 * Revisioni:
 *   rev 1 — 28/10/2026 17:40 — Esportazione Excel (CSV compatibile UTF-8 con BOM) del Piano Corsi aggregato e partecipanti.
 */

export interface PartecipantePiano {
  id: string;
  cognome: string;
  nome: string;
  codiceFiscale: string;
  reparto: string;
  mansione: string;
  corso: string;
  dataScadenza: string;
  stato: "scaduto" | "in_scadenza";
}

export interface GruppoPianoCorso {
  reparto: string;
  corso: string;
  scaduti: number;
  inScadenza: number;
  totale: number;
  partecipanti: PartecipantePiano[];
}

export function esportaPianoCorsiCSV(gruppi: GruppoPianoCorso[], nomeFile?: string) {
  const dataOra = new Date().toISOString().slice(2, 16).replace(/[-T:]/g, "");
  const nomeReale = nomeFile ?? `030ArchAttestati_${dataOra}_piano-corsi.csv`;

  const righe: string[] = [];

  // Sezione 1: Sintesi aggregata Reparto x Corso
  righe.push("=== SINTESI PIANO CORSI PER REPARTO ===");
  righe.push(["Reparto", "Corso Formativo", "Scaduti", "In Scadenza (90 gg)", "Totale Fabbisogno"].join(";"));

  gruppi.forEach((g) => {
    righe.push(
      [
        `"${g.reparto.replace(/"/g, '""')}"`,
        `"${g.corso.replace(/"/g, '""')}"`,
        g.scaduti,
        g.inScadenza,
        g.totale,
      ].join(";"),
    );
  });

  righe.push("");
  righe.push("=== ELENCO DETTAGLIATO PARTECIPANTI ===");
  righe.push(
    ["Cognome", "Nome", "Codice Fiscale", "Reparto", "Mansione", "Corso da Frequentare", "Data Scadenza", "Stato"].join(";"),
  );

  gruppi.forEach((g) => {
    g.partecipanti.forEach((p) => {
      righe.push(
        [
          `"${p.cognome.replace(/"/g, '""')}"`,
          `"${p.nome.replace(/"/g, '""')}"`,
          `"${p.codiceFiscale.replace(/"/g, '""')}"`,
          `"${p.reparto.replace(/"/g, '""')}"`,
          `"${p.mansione.replace(/"/g, '""')}"`,
          `"${p.corso.replace(/"/g, '""')}"`,
          p.dataScadenza || "N/D",
          p.stato === "scaduto" ? "SCADUTO" : "IN SCADENZA",
        ].join(";"),
      );
    });
  });

  const blob = new Blob(["\uFEFF" + righe.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeReale;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
