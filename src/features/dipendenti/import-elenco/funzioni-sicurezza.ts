/*
 * File:      funzioni-sicurezza.ts
 * Percorso:  src/features/dipendenti/import-elenco/funzioni-sicurezza.ts
 * Creato:    11/11/2026
 * Le «funzioni» di sicurezza che si possono indicare con una X nel file di inserimento massivo
 * (Preposto, Antincendio, Primo soccorso, Defibrillatore, Addetto all'evacuazione, Privacy) e il loro
 * collegamento ai ruoli del catalogo. Le intestazioni qui sotto sono usate sia dal modello Excel scaricabile
 * sia dalla lettura del file: così i due non possono più divergere.
 * Revisioni:
 *   rev 1 — 11/11/2026 — Prima stesura.
 */
import { aggiungiRuolo, getRuoliSicurezza, type RuoloSicurezza } from "@/lib/api/ruoli";

export type ChiaveFunzione =
  | "preposto"
  | "antincendio"
  | "primoSoccorso"
  | "defibrillatore"
  | "evacuazione"
  | "privacy";

/** Funzioni segnate con la X per un lavoratore. Una chiave assente = non segnata. */
export type FunzioniImport = Partial<Record<ChiaveFunzione, true>>;

export type DefinizioneFunzione = {
  chiave: ChiaveFunzione;
  /** Intestazione della colonna nel modello Excel. */
  intestazione: string;
  /** Riconosce l'intestazione di colonna scritta dall'utente (testo già in minuscolo non obbligatorio). */
  riconosciIntestazione: RegExp;
  /** Nome e macro-categoria del ruolo creato se nel catalogo manca. */
  ruoloPredefinito: { nome: string; macro: string };
  /** Riconosce il ruolo nel catalogo (testo già normalizzato: minuscolo, senza accenti né apostrofi). */
  riconosciRuolo: (nome: string, macro: string) => boolean;
  /** Etichetta breve per l'anteprima. */
  breve: string;
};

export const INTESTAZIONE_CLASSE_PROFILO = "Classe di concorso / Profilo ATA";

export const FUNZIONI: DefinizioneFunzione[] = [
  {
    chiave: "preposto",
    intestazione: "Preposto",
    riconosciIntestazione: /^preposto/i,
    ruoloPredefinito: { nome: "Preposto", macro: "Preposto" },
    riconosciRuolo: (n) => n.includes("preposto") && !n.includes("laboratorio"),
    breve: "Prep.",
  },
  {
    chiave: "antincendio",
    intestazione: "Antincendio",
    riconosciIntestazione: /antincendio/i,
    ruoloPredefinito: { nome: "Addetto Antincendio", macro: "Antincendio" },
    riconosciRuolo: (n) => n.includes("antincendio"),
    breve: "Antinc.",
  },
  {
    chiave: "primoSoccorso",
    intestazione: "Primo soccorso",
    riconosciIntestazione: /primo\s*soccorso/i,
    ruoloPredefinito: { nome: "Addetto Primo Soccorso", macro: "Primo Soccorso" },
    // «Addetto BLSD / Defibrillatore» non vale come Primo soccorso.
    riconosciRuolo: (n) => n.includes("primo soccorso") && !n.includes("defibrill") && !n.includes("blsd"),
    breve: "P. socc.",
  },
  {
    chiave: "defibrillatore",
    intestazione: "Defibrillatore (BLSD)",
    riconosciIntestazione: /defibrill|blsd|\bdae\b/i,
    ruoloPredefinito: { nome: "Addetto BLSD / Defibrillatore", macro: "Defibrillatore" },
    riconosciRuolo: (n) => n.includes("defibrill") || n.includes("blsd"),
    breve: "DAE",
  },
  {
    chiave: "evacuazione",
    intestazione: "Addetto all'evacuazione",
    riconosciIntestazione: /evacuaz/i,
    ruoloPredefinito: { nome: "Addetto all'evacuazione", macro: "Emergenze" },
    riconosciRuolo: (n) => n.includes("evacuazione"),
    breve: "Evac.",
  },
  {
    chiave: "privacy",
    intestazione: "Privacy",
    riconosciIntestazione: /privacy/i,
    ruoloPredefinito: { nome: "Referente Privacy", macro: "Privacy" },
    riconosciRuolo: (n, m) => n.includes("privac") || m.includes("privac"),
    breve: "Privacy",
  },
];

const normalizza = (t: string | null | undefined) =>
  (t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** «X», «x», «✓», «SI», «sì», «1»… = funzione segnata. Vuoto o altro = non segnata. */
export function cellaSegnata(testo: string): boolean {
  const t = (testo ?? "").trim().toUpperCase();
  return /^(X|✓|✔|✔️|SI|SÌ|S|1|VERO|TRUE|YES)$/.test(t);
}

export function haFunzioni(f: FunzioniImport | undefined): boolean {
  return !!f && Object.values(f).some(Boolean);
}

export function chiaviSegnate(f: FunzioniImport | undefined): ChiaveFunzione[] {
  return FUNZIONI.filter((d) => f?.[d.chiave]).map((d) => d.chiave);
}

/** Ruolo del catalogo che corrisponde alla funzione (attivo; se più d'uno, quello col nome identico al predefinito). */
export function trovaRuoloFunzione(ruoli: RuoloSicurezza[], chiave: ChiaveFunzione): RuoloSicurezza | undefined {
  const def = FUNZIONI.find((d) => d.chiave === chiave);
  if (!def) return undefined;
  const candidati = ruoli.filter((r) => r.attivo && def.riconosciRuolo(normalizza(r.nome), normalizza(r.macro_categoria)));
  return (
    candidati.find((r) => normalizza(r.nome) === normalizza(def.ruoloPredefinito.nome)) ?? candidati[0]
  );
}

/**
 * Per le funzioni richieste crea nel catalogo i ruoli che mancano (es. «Referente Privacy») e rilegge il catalogo.
 * Restituisce il catalogo aggiornato e i nomi dei ruoli creati.
 */
export async function assicuraRuoliFunzioni(
  ruoli: RuoloSicurezza[],
  richieste: ChiaveFunzione[],
): Promise<{ ruoli: RuoloSicurezza[]; creati: string[] }> {
  const mancanti = richieste.filter((c) => !trovaRuoloFunzione(ruoli, c));
  if (mancanti.length === 0) return { ruoli, creati: [] };

  const creati: string[] = [];
  let ordine = ruoli.reduce((m, r) => Math.max(m, r.ordine ?? 0), 0);
  for (const chiave of mancanti) {
    const def = FUNZIONI.find((d) => d.chiave === chiave);
    if (!def) continue;
    ordine += 1;
    await aggiungiRuolo({ nome: def.ruoloPredefinito.nome, macro_categoria: def.ruoloPredefinito.macro, ordine });
    creati.push(def.ruoloPredefinito.nome);
  }
  return { ruoli: await getRuoliSicurezza(), creati };
}
