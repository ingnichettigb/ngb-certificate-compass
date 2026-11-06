/*
 * File:      elenco-presenti.ts
 * Percorso:  src/features/dipendenti/import-elenco/elenco-presenti.ts
 * Creato:    05/11/2026
 * Elenco dei lavoratori «già presenti» emerso da un'importazione (in forza e cessati):
 * costruzione del testo CSV e della pagina di stampa, più le azioni «Scarica» e «Stampa».
 * Revisioni:
 *   rev 1 — 05/11/2026 21:30 — Prima stesura.
 */
import type { EsitoImportazione } from "./registra-nuovi";

export type RigaPresente = { cognome: string; nome: string; cf: string; stato: "In forza" | "Cessato" };

export function righePresenti(esito: EsitoImportazione): RigaPresente[] {
  const mappa = (stato: RigaPresente["stato"]) => (v: { cognome: string; nome: string; cf: string }): RigaPresente => ({
    cognome: v.cognome, nome: v.nome, cf: v.cf, stato,
  });
  return [...esito.presentiInForza.map(mappa("In forza")), ...esito.presentiCessati.map(mappa("Cessato"))];
}

/** CSV con separatore «;» (Excel italiano), campi tra virgolette. */
export function testoCsvPresenti(esito: EsitoImportazione): string {
  const righe = [["Cognome", "Nome", "Codice fiscale", "Stato"], ...righePresenti(esito).map((r) => [r.cognome, r.nome, r.cf, r.stato])];
  return righe.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Pagina HTML pronta per la stampa. */
export function htmlStampaPresenti(esito: EsitoImportazione, quando = new Date()): string {
  const righe = righePresenti(esito);
  const data = `${String(quando.getDate()).padStart(2, "0")}/${String(quando.getMonth() + 1).padStart(2, "0")}/${quando.getFullYear()}`;
  const corpo = righe
    .map(
      (r, i) =>
        `<tr><td class="n">${i + 1}</td><td>${esc(r.cognome)}</td><td>${esc(r.nome)}</td><td class="cf">${esc(r.cf)}</td><td>${r.stato}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Lavoratori già presenti</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;margin:24px;color:#111}
h1{font-size:16px;margin:0 0 4px}p{margin:0 0 12px;color:#444}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 6px;text-align:left}
th{background:#eee}td.n{width:28px;text-align:center}td.cf{font-family:monospace}
</style></head><body>
<h1>Lavoratori già presenti in archivio</h1>
<p>Elenco importato il ${data}: ${esito.presentiInForza.length} in forza, ${esito.presentiCessati.length} cessati. Non sono stati modificati.</p>
<table><thead><tr><th>N°</th><th>Cognome</th><th>Nome</th><th>Codice fiscale</th><th>Stato</th></tr></thead><tbody>${corpo}</tbody></table>
</body></html>`;
}

function scarica(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function scaricaPresenti(esito: EsitoImportazione, quando = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const nome = `GiaPresenti_${String(quando.getFullYear()).slice(-2)}${p(quando.getMonth() + 1)}${p(quando.getDate())}${p(quando.getHours())}${p(quando.getMinutes())}.csv`;
  scarica(new Blob(["\uFEFF" + testoCsvPresenti(esito)], { type: "text/csv;charset=utf-8" }), nome);
}

/** Stampa senza aprire finestre: usa un riquadro nascosto. */
export function stampaPresenti(esito: EsitoImportazione) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) { frame.remove(); return; }
  doc.open();
  doc.write(htmlStampaPresenti(esito));
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 2000);
  }, 200);
}
