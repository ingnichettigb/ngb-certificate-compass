/*
 * File:      dipendenti.ts
 * Percorso:  src/lib/api/dipendenti.ts
 * Data creazione: 20/10/2026
 * Anagrafica dipendenti.
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Modello iniziale anagrafica e upsert.
 *   rev 2 — 05/11/2026 17:50 — aggiornaAnagraficaDipendente (modifica per ID, allineamento CF).
 *   rev 3 — 05/11/2026 21:30 — Cognome, nome e luogo di nascita salvati sempre in MAIUSCOLO; la modifica anagrafica
 *                              salva anche profilo, classe di concorso e materia; nuova riabilitaDipendenti (cessati che tornano in forza).
 *   rev 4 — 07/11/2026 13:15 — cercaDipendentePerAnagrafica (ricerca flessibile per CF o cognome+nome) e recuperaAtecoPredefinito.
 */
import { leggiTutto, sb } from "./client";
import { registraClasseEMateria } from "./insegnamento";
import { maiuscolo } from "@/lib/testo-maiuscolo";

export type Dipendente = {
  id: string;
  codice_fiscale: string;
  cognome: string;
  nome: string;
  email: string | null;
  reparto: string | null;
  /** Sottoreparto scelto dentro il reparto (es. "Assistente amministrativo" per ATA). */
  sottoreparto: string | null;
  /** Solo per i reparti che la richiedono (es. Docente): es. "A-26". */
  classe_concorso: string | null;
  /** Materia insegnata, testo libero con suggerimenti. */
  materia: string | null;
  luogo_nascita: string | null;
  data_nascita: string | null;
  /** Codici ATECO letti dall'attestato (testo libero, anche più codici). */
  codice_ateco?: string | null;
  /** Gestione contrattuale (rev 28/10/2026). */
  tipo_contratto?: "indeterminato" | "determinato" | string;
  data_assunzione?: string | null;
  data_fine_contratto?: string | null;
  /** "in_forza" oppure "cessato" (limbo: mai cancellato). */
  stato_lavoratore?: "in_forza" | "cessato" | string;
  data_cessazione?: string | null;
  note_contratto?: string | null;
};

export type DatiContratto = Pick<
  Dipendente,
  "tipo_contratto" | "data_assunzione" | "data_fine_contratto" | "stato_lavoratore" | "data_cessazione" | "note_contratto"
>;

/** Aggiorna i dati contrattuali (riconferma, termine, riattivazione). */
export async function aggiornaContrattoDipendente(id: string, dati: DatiContratto) {
  const pulito = Object.fromEntries(
    Object.entries(dati).map(([k, v]) => [k, v === "" ? null : v]),
  );
  const { error } = await sb.from("dipendenti").update(pulito).eq("id", id);
  if (error) throw error;
}

/** Cambia il reparto di un dipendente già in archivio. */
export async function aggiornaRepartoDipendente(
  id: string,
  reparto: string | null,
  sottoreparto: string | null = null,
) {
  const { error } = await sb
    .from("dipendenti")
    .update({ reparto: reparto || null, sottoreparto: sottoreparto || null })
    .eq("id", id);
  if (error) throw error;
}

/** Aggiorna solo il sottoreparto (il reparto resta quello che è). */
export async function aggiornaSottorepartoDipendente(id: string, sottoreparto: string | null) {
  const { error } = await sb
    .from("dipendenti")
    .update({ sottoreparto: sottoreparto || null })
    .eq("id", id);
  if (error) throw error;
}

/** Aggiorna classe di concorso e materia di un docente già in archivio. */
export async function aggiornaInsegnamentoDipendente(
  id: string,
  classe_concorso: string | null,
  materia: string | null,
) {
  const { error } = await sb
    .from("dipendenti")
    .update({
      classe_concorso: classe_concorso?.trim().toUpperCase() || null,
      materia: materia?.trim() || null,
    })
    .eq("id", id);
  if (error) throw error;
  await registraClasseEMateria(classe_concorso, materia);
}

export async function getDipendenti(): Promise<Dipendente[]> {
  return leggiTutto<Dipendente>(() => sb.from("dipendenti").select("*").order("cognome").order("id"));
}

/**
 * Recupera il codice ATECO predefinito della ditta (es. '85' per scuola).
 */
export async function recuperaAtecoPredefinito(): Promise<string> {
  try {
    const { data } = await sb.from("ditta").select("codici_ateco").eq("id", true).maybeSingle();
    const arr = Array.isArray(data?.codici_ateco) ? (data.codici_ateco as Array<{ codice: string }>) : [];
    return arr[0]?.codice?.trim() || "85";
  } catch {
    return "85";
  }
}

/**
 * Cerca un lavoratore nel database:
 * 1. Per codice fiscale (se fornito).
 * 2. In fallback per cognome e nome normalizzati (match esatto, invertito o per insieme parole per cognomi composti).
 */
export async function cercaDipendentePerAnagrafica(opts: {
  codice_fiscale?: string | null;
  cognome?: string | null;
  nome?: string | null;
}): Promise<Dipendente | null> {
  const cf = (opts.codice_fiscale || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cf) {
    const { data } = await sb.from("dipendenti").select("*").eq("codice_fiscale", cf).maybeSingle();
    if (data) return data as Dipendente;
  }

  const cogNorm = (opts.cognome || "").trim().toUpperCase().replace(/\s+/g, " ");
  const nomNorm = (opts.nome || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!cogNorm && !nomNorm) return null;

  const tutti = await getDipendenti();

  // 1. Corrispondenza esatta cognome + nome
  const esatto = tutti.find(
    (d) => d.cognome.trim().toUpperCase() === cogNorm && d.nome.trim().toUpperCase() === nomNorm,
  );
  if (esatto) return esatto;

  // 2. Corrispondenza con nome e cognome invertiti
  const invertito = tutti.find(
    (d) => d.cognome.trim().toUpperCase() === nomNorm && d.nome.trim().toUpperCase() === cogNorm,
  );
  if (invertito) return invertito;

  // 3. Corrispondenza per insieme di parole (es. cognomi composti come "ISABELLA VALENZI")
  const paroleInput = new Set(`${cogNorm} ${nomNorm}`.split(" ").filter(Boolean));
  if (paroleInput.size >= 2) {
    const perParole = tutti.find((d) => {
      const paroleD = new Set(`${d.cognome.trim().toUpperCase()} ${d.nome.trim().toUpperCase()}`.split(" ").filter(Boolean));
      if (paroleInput.size !== paroleD.size) return false;
      for (const p of paroleInput) {
        if (!paroleD.has(p)) return false;
      }
      return true;
    });
    if (perParole) return perParole;
  }

  return null;
}

/**
 * Modifica l'anagrafica di un lavoratore esistente tramite ID (rev 05/11/2026 17:50).
 * Se cambia il CF, gli attestati seguono via ON UPDATE CASCADE; i documenti PDF vengono allineati.
 */
export async function aggiornaAnagraficaDipendente(
  id: string,
  d: Omit<Dipendente, "id">,
  vecchioCF: string,
): Promise<void> {
  const nuovoCF = d.codice_fiscale.trim().toUpperCase();
  const payload = {
    cognome: maiuscolo(d.cognome),
    nome: maiuscolo(d.nome),
    codice_fiscale: nuovoCF,
    email: d.email?.trim() || null,
    reparto: d.reparto || null,
    sottoreparto: d.sottoreparto?.trim() || null,
    classe_concorso: d.classe_concorso?.trim().toUpperCase() || null,
    materia: d.materia?.trim() || null,
    codice_ateco: d.codice_ateco?.trim() || null,
    luogo_nascita: maiuscolo(d.luogo_nascita) || null,
    data_nascita: d.data_nascita || null,
    tipo_contratto: d.tipo_contratto,
    data_assunzione: d.data_assunzione || null,
    data_fine_contratto: d.data_fine_contratto || null,
    data_cessazione: d.data_cessazione || null,
    note_contratto: d.note_contratto?.trim() || null,
  };
  const { error } = await sb.from("dipendenti").update(payload).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("Esiste già un lavoratore con lo stesso codice fiscale.");
    throw error;
  }
  if (vecchioCF.trim().toUpperCase() !== nuovoCF) {
    const { error: e2 } = await sb
      .from("documenti_attestati")
      .update({ codice_fiscale: nuovoCF })
      .eq("dipendente_id", id);
    if (e2) throw e2;
  }
}

export async function upsertDipendente(d: Omit<Dipendente, "id">): Promise<Dipendente> {
  const payload = {
    ...d,
    cognome: maiuscolo(d.cognome),
    nome: maiuscolo(d.nome),
    luogo_nascita: d.luogo_nascita ? maiuscolo(d.luogo_nascita) : d.luogo_nascita,
    codice_fiscale: d.codice_fiscale.trim().toUpperCase(),
    data_nascita: d.data_nascita || null,
    sottoreparto: d.sottoreparto?.trim() || null,
    classe_concorso: d.classe_concorso?.trim().toUpperCase() || null,
    materia: d.materia?.trim() || null,
    ...(d.data_assunzione !== undefined && { data_assunzione: d.data_assunzione || null }),
    ...(d.data_fine_contratto !== undefined && { data_fine_contratto: d.data_fine_contratto || null }),
    ...(d.data_cessazione !== undefined && { data_cessazione: d.data_cessazione || null }),
    ...(d.note_contratto !== undefined && { note_contratto: d.note_contratto?.trim() || null }),
  };
  const { data, error } = await sb
    .from("dipendenti")
    .upsert(payload, { onConflict: "codice_fiscale" })
    .select()
    .single();
  if (error) throw error;
  return data as Dipendente;
}

/**
 * Riabilita i lavoratori cessati che tornano in servizio.
 */
export async function riabilitaDipendenti(ids: string[], dataAssunzione: string): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await sb
    .from("dipendenti")
    .update({
      stato_lavoratore: "in_forza",
      data_assunzione: dataAssunzione,
      tipo_contratto: "determinato",
      data_fine_contratto: null,
    })
    .in("id", ids);
  if (error) throw error;
}
