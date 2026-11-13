/*
 * File: aiuto-testi.ts
 * Percorso: src/components/ui/aiuto-testi.ts
 * Data creazione: 13/11/2026
 * Revisioni:
 *   rev 1 — 13/11/2026 09:55 — Dizionario spiegazioni comandi/campi e calcolo posizione fumetto nello schermo.
 */

/** Spiegazioni standard dei comandi ricorrenti (chiave: inizio dell'etichetta, minuscolo). */
export const DIZIONARIO_COMANDI: Array<[RegExp, string]> = [
  [/^salva/, "Salva le modifiche nell'archivio."],
  [/^annulla/, "Chiude senza salvare le modifiche."],
  [/^chiudi/, "Chiude questa finestra."],
  [/^(elimina|cancella|rimuovi)/, "Elimina l'elemento selezionato (operazione da confermare)."],
  [/^modifica/, "Apre l'elemento per modificarne i dati."],
  [/^approva/, "Approva l'attestato e lo inserisce nello storico del lavoratore."],
  [/^respingi/, "Respinge l'attestato indicando la causale; resta consultabile."],
  [/^sdoppia/, "Divide un attestato cumulativo in due corsi distinti."],
  [/^(aggiungi|nuovo|nuova|\+)/, "Aggiunge un nuovo elemento."],
  [/^genera pdf/, "Crea direttamente il file PDF, senza passare dalla stampante."],
  [/^(stampa|print)/, "Apre la finestra di stampa del browser."],
  [/^esporta/, "Scarica i dati visualizzati in un file."],
  [/^(scarica|download)/, "Scarica il file sul computer."],
  [/^(carica|importa|upload)/, "Seleziona un file dal computer e lo carica nell'archivio."],
  [/^(cerca|filtra)/, "Filtra l'elenco in base al testo o ai criteri scelti."],
  [/^aggancia/, "Collega un file PDF all'attestato selezionato."],
  [/^(apri|visualizza|vedi|mostra)/, "Apre il dettaglio o il documento."],
  [/^(indietro|torna)/, "Torna alla schermata precedente."],
  [/^(aggiorna|ricarica)/, "Ricarica i dati più recenti."],
  [/^(seleziona tutt|tutti|tutte)/, "Seleziona tutte le voci."],
  [/^(deseleziona|nessuno)/, "Toglie tutte le selezioni."],
  [/^backup|salva db/, "Salva una copia di sicurezza dell'archivio."],
  [/^ripristina/, "Riporta l'archivio a una copia di sicurezza salvata."],
];

function pulisci(t: string | null | undefined) {
  return (t ?? "").replace(/\s+/g, " ").trim();
}

/** Ricava il testo del fumetto per un elemento; stringa vuota se non c'è nulla di utile. */
export function testoAiuto(el: HTMLElement): string {
  const esplicito = pulisci(el.dataset["aiuto"]) || pulisci(el.title) || pulisci(el.dataset["aiutoTitolo"]);
  if (esplicito) return esplicito;
  const etichetta = pulisci(el.getAttribute("aria-label"));
  const testo = pulisci(el.innerText);
  if (el.matches("input, textarea, select")) {
    const tipo = el.getAttribute("type");
    if (tipo === "hidden" || tipo === "checkbox" || tipo === "radio") return etichetta;
    const ph = pulisci(el.getAttribute("placeholder"));
    const nome = etichetta || pulisci((el as HTMLInputElement).labels?.[0]?.innerText);
    if (tipo === "date") return `${nome ? nome + ": " : ""}inserisci la data (gg/mm/aaaa).`;
    if (tipo === "file") return "Scegli un file dal computer.";
    if (el.tagName === "SELECT") return `${nome ? nome + ": " : ""}scegli una voce dall'elenco.`;
    if (ph) return `${nome ? nome + ": " : ""}${ph}`;
    return nome ? `Digita: ${nome}` : "";
  }
  const chiave = (etichetta || testo).toLowerCase();
  if (!chiave || chiave.length > 60) return etichetta;
  for (const [re, spiegazione] of DIZIONARIO_COMANDI) if (re.test(chiave)) return spiegazione;
  // Bottone solo icona: almeno il nome del comando.
  return !testo && etichetta ? etichetta : "";
}

/** Posiziona il fumetto sotto (o sopra se manca spazio) restando a 12 px dai bordi. */
export function posizionaFumetto(r: { left: number; top: number; bottom: number; width: number }, w: number, h: number, vw: number, vh: number) {
  const m = 12, gap = 6;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(m, Math.min(left, vw - w - m));
  let top = r.bottom + gap;
  if (top + h > vh - m) top = r.top - gap - h;
  top = Math.max(m, Math.min(top, vh - h - m));
  return { left, top };
}
