/*
 * File:      modello-excel.ts
 * Percorso:  src/features/dipendenti/import-elenco/modello-excel.ts
 * Creato:    11/11/2026
 * Genera nel browser il modello Excel per l'inserimento massivo dei lavoratori: foglio «Elenco» (intestazioni,
 * tre righe di esempio, menu a tendina «X» sulle funzioni) e foglio «Istruzioni». Le intestazioni arrivano da
 * funzioni-sicurezza.ts, le stesse che legge l'importazione. Nessun invio a server esterni.
 * Revisioni:
 *   rev 1 — 11/11/2026 — Prima stesura.
 *   rev 2 — 12/11/2026 — Righe di esempio spostate in righe-esempio.ts (all'importazione vengono ignorate); riga intera in giallo;
 *            istruzioni più semplici.
 */
import { FUNZIONI, INTESTAZIONE_CLASSE_PROFILO } from "./funzioni-sicurezza";
import { ESEMPI_MODELLO } from "./righe-esempio";

export const NOME_FILE_MODELLO = "modello_inserimento_massivo.xlsx";

const INTESTAZIONI = [
  "Cognome",
  "Nome",
  "Codice fiscale",
  "Luogo di nascita",
  "Data di nascita",
  INTESTAZIONE_CLASSE_PROFILO,
  ...FUNZIONI.map((f) => f.intestazione),
];

const PRIMA_COL_FUNZIONI = 7; // colonna G
const RIGHE_TOTALI = 300;

/** Righe di esempio: nomi di fantasia, codici fiscali formalmente validi. All'importazione vengono ignorate. */
const ESEMPI: { dati: (string | Date)[]; x: boolean[] }[] = ESEMPI_MODELLO.map((e) => ({
  dati: [e.cognome, e.nome, e.cf, e.luogo, e.nascita, e.classeProfilo],
  x: e.x,
}));

const ISTRUZIONI: [string, boolean][] = [
  ["COME COMPILARE IL MODELLO", true],
  ["Compila il foglio «Elenco» dalla riga 2, una riga per lavoratore. Le 3 righe gialle sono ESEMPI inventati: servono solo a capire come abbinare le colonne. Puoi cancellarle oppure lasciarle: l'importazione le ignora.", false],
  ["", false],
  ["Colonne obbligatorie", true],
  ["Cognome, Nome, Codice fiscale (16 caratteri), Luogo di nascita, Data di nascita (gg/mm/aaaa).", false],
  ["", false],
  ["Classe di concorso / Profilo ATA (colonna unica)", true],
  ["ATA → scrivi uno di: CS (Collaboratore scolastico), AA (Assistente amministrativo), AT (Assistente tecnico), DSGA.", false],
  ["Docenti → scrivi il codice della classe di concorso già presente in archivio (es. A027, AB24, IRC).", false],
  ["Se la classe manca o è scritta in modo diverso da quelle in archivio, il programma ti chiede a video cosa fare: sceglierne una, lasciare vuoto o crearla.", false],
  ["", false],
  ["Colonne con X (facoltative)", true],
  [`Scrivi X se il lavoratore ha la funzione, altrimenti lascia vuoto: ${FUNZIONI.map((f) => f.intestazione).join(", ")}.`, false],
  ["Le X aggiungono la funzione; non ne tolgono mai. Se il ruolo non esiste ancora nel catalogo viene creato.", false],
  ["", false],
  ["Controlli automatici all'importazione", true],
  ["Codice fiscale non valido, doppioni nel file, data di nascita incoerente con il codice fiscale, classe o profilo non riconosciuti.", false],
];

/** Genera il modello e avvia il download nel browser. */
export async function scaricaModelloElenco(): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Elenco", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = INTESTAZIONI.map((h, i) => ({
    header: h,
    width: [18, 16, 20, 20, 15, 24][i] ?? Math.max(12, h.length + 3),
  }));

  const intest = ws.getRow(1);
  intest.height = 34;
  intest.eachCell((cell, col) => {
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col >= PRIMA_COL_FUNZIONI ? "FFC55A11" : "FF1F4E79" } };
  });
  ws.getCell("F1").note = "ATA: CS, AA, AT oppure DSGA.\nDocenti: codice classe di concorso (es. A027, AB24, IRC).";

  for (let r = 2; r <= RIGHE_TOTALI; r++) {
    const riga = ws.getRow(r);
    const esempio = ESEMPI[r - 2];
    if (esempio) {
      esempio.dati.forEach((v, i) => (riga.getCell(i + 1).value = v));
      esempio.x.forEach((on, i) => {
        if (on) riga.getCell(PRIMA_COL_FUNZIONI + i).value = "X";
      });
    }
    riga.getCell(3).numFmt = "@";
    riga.getCell(5).numFmt = "DD/MM/YYYY";
    for (let c = 1; c <= INTESTAZIONI.length; c++) {
      const cell = riga.getCell(c);
      cell.font = { name: "Arial" };
      if (esempio) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
      if (c >= PRIMA_COL_FUNZIONI) {
        cell.alignment = { horizontal: "center" };
        cell.dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: ['"X"'],
          showErrorMessage: true,
          errorTitle: "Valore non valido",
          error: "Scrivi X oppure lascia vuoto",
        };
      }
    }
  }

  const ist = wb.addWorksheet("Istruzioni");
  ist.getColumn(1).width = 110;
  ISTRUZIONI.forEach(([testo, grassetto], i) => {
    const cell = ist.getCell(i + 1, 1);
    cell.value = testo;
    cell.font = { name: "Arial", bold: grassetto, size: i === 0 ? 12 : 10 };
    cell.alignment = { wrapText: true, vertical: "top" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = NOME_FILE_MODELLO;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
