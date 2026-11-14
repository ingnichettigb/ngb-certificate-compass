/*
 * File:      backup.ts
 * Percorso:  src/lib/api/backup.ts
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Esportazione e importazione database JSON.
 *   rev 2 — 26/10/2026 17:30 — Naming 030ArchAttestati_AAMMGGhhmm_ e lettura selettiva backup.
 *   rev 3 — 01/11/2026 12:35 — Salvataggio automatico diretto nella sottocartella "Backup DB" della cartella archivio.
 *   rev 4 — 13/11/2026 — Backup COMPLETO (versione 5): tutte le tabelle (prima 10 su 19: mancavano incarichi, ruoli, sedi, nomine,
 *            documenti, integrazioni DVR, coda valutazioni…), lettura a blocchi senza il limite di 1000 righe, ripristino nell'ordine
 *            delle dipendenze con rimappatura degli id (sedi, ruoli, lavoratori) e errori che nominano la tabella.
 *   rev 5 — 14/11/2026 — Ripristino lavoratori: «id» sempre presente in ogni riga (prima, con un file che conteneva sia lavoratori già
 *            presenti sia mancanti, il database rifiutava l'intero blocco: id nullo).
 */
import { leggiTutto, sb } from "./client";
import { getCartellaArchivio, leggiPercorsoTestuale } from "./cartella-locale";

export const PREFISSO_BACKUP = "030ArchAttestati_";
export const SOTTOCARTELLA_BACKUP_DB = "Backup DB";
export const VERSIONE_BACKUP = 5;

/**
 * TUTTE le tabelle dell'archivio, nell'ordine di ripristino (prima le tabelle da cui dipendono le altre).
 * «chiave» = colonna usata per ordinare la lettura a blocchi. Una tabella nuova nelle migrazioni va aggiunta qui:
 * il test backup-copertura.test.ts fallisce se manca.
 */
export const TABELLE_BACKUP = [
  { tabella: "tipi_corso", chiave: "id" },
  { tabella: "categorie_corso", chiave: "macro_categoria" },
  { tabella: "argomenti_corso", chiave: "id" },
  { tabella: "reparti", chiave: "id" },
  { tabella: "sottoreparti", chiave: "id" },
  { tabella: "classi_concorso", chiave: "id" },
  { tabella: "materie", chiave: "id" },
  { tabella: "note_valutazione", chiave: "id" },
  { tabella: "opzioni_integrazione", chiave: "id" },
  { tabella: "modelli_nomina", chiave: "tipo" },
  { tabella: "ditta", chiave: "id" },
  { tabella: "soglie_ditta", chiave: "id" },
  { tabella: "ruoli_sicurezza", chiave: "id" },
  { tabella: "sedi", chiave: "id" },
  { tabella: "dipendenti", chiave: "id" },
  { tabella: "dipendenti_ruoli", chiave: "id" },
  { tabella: "attestati_caricati", chiave: "id" },
  { tabella: "documenti_attestati", chiave: "id" },
  { tabella: "integrazioni_dvr", chiave: "id" },
  { tabella: "coda_valutazioni", chiave: "id" },
] as const;

type Riga = Record<string, unknown>;
export type DumpBackup = { esportato_il: string; versione: number } & Record<string, unknown>;

export interface InfoFileBackup {
  nome: string;
  dataFormattata: string;
  dimensioneKb: number;
  dataCreazione: Date;
  fileHandle?: FileSystemFileHandle;
}

export interface EsitoEsportazioneDb {
  dump: DumpBackup & { dipendenti: unknown[]; attestati_caricati: unknown[] };
  nomeFile: string;
  percorsoSalvataggio: string;
  salvatoInCartellaLocale: boolean;
}

/** Genera il nome file: 030ArchAttestati_AAMMGGhhmm_archivio-attestati.json */
export function generaNomeFileBackup(data: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const aa = String(data.getFullYear()).slice(-2);
  const mm = pad(data.getMonth() + 1);
  const gg = pad(data.getDate());
  const hh = pad(data.getHours());
  const min = pad(data.getMinutes());
  return `${PREFISSO_BACKUP}${aa}${mm}${gg}${hh}${min}_archivio-attestati.json`;
}

/** Estrae data e ora leggibile dal nome del file (formato AAMMGGhhmm). */
export function estraiDataDaNomeBackup(nomeFile: string): { data: string; dateObj: Date } {
  const match = nomeFile.match(/^030ArchAttestati_(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (match) {
    const [, aa = "", mm = "", gg = "", hh = "", min = ""] = match;
    const anno = 2000 + parseInt(aa, 10);
    const dateObj = new Date(anno, parseInt(mm, 10) - 1, parseInt(gg, 10), parseInt(hh, 10), parseInt(min, 10));
    return {
      data: `${gg}/${mm}/${anno} ore ${hh}:${min}`,
      dateObj,
    };
  }
  return { data: "Data sconosciuta", dateObj: new Date(0) };
}

/** Restituisce l'handle della sottocartella "Backup DB" nella cartella archivio principale (creandola se non esiste). */
export async function getCartellaBackupDb(creaSeManca = true): Promise<{
  cartellaHandle: FileSystemDirectoryHandle;
  nomePercorso: string;
} | null> {
  const root = await getCartellaArchivio(true);
  if (!root) return null;
  try {
    const backupDir = await root.getDirectoryHandle(SOTTOCARTELLA_BACKUP_DB, { create: creaSeManca });
    const percorso = await leggiPercorsoTestuale();
    const nomePercorso = percorso ? `${percorso}\\${SOTTOCARTELLA_BACKUP_DB}` : `${root.name}/${SOTTOCARTELLA_BACKUP_DB}`;
    return { cartellaHandle: backupDir, nomePercorso };
  } catch {
    return null;
  }
}

/** Scansiona una cartella restituendo SOLO i file che iniziano per 030ArchAttestati_ e finiscono per .json. */
export async function elencaBackupDaCartella(dirHandle: FileSystemDirectoryHandle): Promise<InfoFileBackup[]> {
  const risultati: InfoFileBackup[] = [];
  const entries = (dirHandle as unknown as { values: () => AsyncIterable<FileSystemHandle> }).values();
  for await (const entry of entries) {
    if (entry.kind === "file" && entry.name.startsWith(PREFISSO_BACKUP) && entry.name.endsWith(".json")) {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const { data, dateObj } = estraiDataDaNomeBackup(entry.name);
      risultati.push({
        nome: entry.name,
        dataFormattata: data,
        dimensioneKb: Math.round(file.size / 1024),
        dataCreazione: dateObj.getTime() > 0 ? dateObj : new Date(file.lastModified),
        fileHandle,
      });
    }
  }
  return risultati.sort((a, b) => b.dataCreazione.getTime() - a.dataCreazione.getTime());
}

/** Legge TUTTE le tabelle (a blocchi da 1000) e costruisce il dump. Se una tabella non si legge, fallisce nominandola. */
export async function costruisciDump(): Promise<DumpBackup & { dipendenti: unknown[]; attestati_caricati: unknown[] }> {
  const lette = await Promise.all(
    TABELLE_BACKUP.map(async ({ tabella, chiave }) => {
      try {
        return [tabella, await leggiTutto<Riga>(() => sb.from(tabella).select("*").order(chiave))] as const;
      } catch (e) {
        throw new Error(`Backup non riuscito: tabella «${tabella}» non leggibile (${(e as { message?: string })?.message ?? e})`);
      }
    }),
  );
  return {
    esportato_il: new Date().toISOString(),
    versione: VERSIONE_BACKUP,
    ...Object.fromEntries(lette),
    dipendenti: lette.find(([t]) => t === "dipendenti")![1],
    attestati_caricati: lette.find(([t]) => t === "attestati_caricati")![1],
  };
}

/** Esporta l'intero database in formato JSON, salvandolo direttamente nella sottocartella "Backup DB". */
export async function esportaDb(): Promise<EsitoEsportazioneDb | null> {
  const dump = await costruisciDump();
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const nome = generaNomeFileBackup();

  // 1. Prova salvataggio diretto nella sottocartella "Backup DB" della cartella archivio configurata
  try {
    const destinazione = await getCartellaBackupDb(true);
    if (destinazione) {
      const fileHandle = await destinazione.cartellaHandle.getFileHandle(nome, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {
        dump,
        nomeFile: nome,
        percorsoSalvataggio: destinazione.nomePercorso,
        salvatoInCartellaLocale: true,
      };
    }
  } catch {
    // Prosegue con il fallback manuale
  }

  // 2. Fallback con showSaveFilePicker del browser
  const w = window as unknown as {
    showSaveFilePicker?: (o: unknown) => Promise<{
      createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }>;
    }>;
  };
  if (w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: nome,
        types: [{ description: "Backup JSON Archivio Attestati", accept: { "application/json": [".json"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {
        dump,
        nomeFile: nome,
        percorsoSalvataggio: "Cartella scelta manualmente",
        salvatoInCartellaLocale: false,
      };
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
    }
  }

  // 3. Fallback classico download browser
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
  return {
    dump,
    nomeFile: nome,
    percorsoSalvataggio: "Cartella Download",
    salvatoInCartellaLocale: false,
  };
}

const righeDi = (dump: Record<string, unknown>, tabella: string): Riga[] => (Array.isArray(dump[tabella]) ? (dump[tabella] as Riga[]) : []);

/** Scrive a blocchi da 200; in caso di errore dice QUALE tabella ha fallito (prima gli errori venivano ignorati). */
async function scrivi(tabella: string, righe: Riga[], onConflict: string) {
  for (let i = 0; i < righe.length; i += 200) {
    const { error } = await sb.from(tabella).upsert(righe.slice(i, i + 200), { onConflict });
    if (error) throw new Error(`Ripristino interrotto sulla tabella «${tabella}»: ${(error as { message?: string }).message ?? error}`);
  }
}

/**
 * Ripristina un backup JSON (solo aggiunta/aggiornamento: non cancella nulla) previa verifica del prefisso 030ArchAttestati_.
 * Gli id di sedi, ruoli e lavoratori del file vengono ricondotti a quelli presenti nel database (stessa sede principale,
 * stesso nome ruolo, stesso codice fiscale), così gli incarichi restano agganciati anche su un database ricreato.
 */
export async function importaDb(file: File) {
  if (!file.name.startsWith(PREFISSO_BACKUP)) {
    throw new Error(`Il file deve iniziare con '${PREFISSO_BACKUP}'. Scelto: '${file.name}'`);
  }
  const dump = JSON.parse(await file.text()) as Record<string, unknown>;
  const conteggi: Record<string, number> = {};
  const conta = (tabella: string, n: number) => {
    conteggi[tabella] = n;
  };
  const semplice = async (tabella: string, onConflict: string) => {
    const righe = righeDi(dump, tabella);
    if (righe.length) await scrivi(tabella, righe, onConflict);
    conta(tabella, righe.length);
  };

  // 1. Anagrafiche di base
  await semplice("tipi_corso", "id");
  await semplice("categorie_corso", "macro_categoria");
  await semplice("argomenti_corso", "id");
  await semplice("reparti", "nome");
  await semplice("sottoreparti", "id");
  await semplice("classi_concorso", "codice");
  await semplice("materie", "id");
  await semplice("note_valutazione", "id");
  await semplice("opzioni_integrazione", "id");
  await semplice("modelli_nomina", "tipo");
  await semplice("ditta", "id");
  await semplice("soglie_ditta", "id");

  // 2. Ruoli: stesso nome = stesso ruolo (si aggiorna), altrimenti si inserisce
  const mappaRuoli = new Map<string, string>();
  const ruoliDump = righeDi(dump, "ruoli_sicurezza");
  if (ruoliDump.length) {
    const esistenti = await leggiTutto<{ id: string; nome: string }>(() => sb.from("ruoli_sicurezza").select("id, nome").order("id"));
    const perNome = new Map(esistenti.map((r) => [r["nome"], r["id"]]));
    const nuovi: Riga[] = [];
    for (const r of ruoliDump) {
      const idDb = perNome.get(String(r["nome"]));
      if (idDb) {
        mappaRuoli.set(String(r["id"]), idDb);
        const { id: _id, ...resto } = r;
        const { error } = await sb.from("ruoli_sicurezza").update(resto).eq("id", idDb);
        if (error) throw new Error(`Ripristino interrotto sulla tabella «ruoli_sicurezza»: ${(error as { message?: string }).message ?? error}`);
      } else {
        mappaRuoli.set(String(r["id"]), String(r["id"]));
        nuovi.push(r);
      }
    }
    if (nuovi.length) await scrivi("ruoli_sicurezza", nuovi, "id");
  }
  conta("ruoli_sicurezza", ruoliDump.length);

  // 3. Sedi: la principale è una sola e già presente nel database; le sedi del file puntano a quella
  const mappaSedi = new Map<string, string>();
  const sediDump = righeDi(dump, "sedi");
  if (sediDump.length) {
    const { data, error } = await sb.from("sedi").select("id").eq("is_principale", true).limit(1);
    if (error) throw new Error(`Ripristino interrotto sulla tabella «sedi»: ${(error as { message?: string }).message ?? error}`);
    const principaleDb = (data?.[0] as { id?: string } | undefined)?.id;
    const secondarie: Riga[] = [];
    for (const sd of sediDump) {
      if (sd["is_principale"] && principaleDb) {
        mappaSedi.set(String(sd["id"]), principaleDb);
        const { id: _id, is_principale: _p, ...resto } = sd;
        const { error: e2 } = await sb.from("sedi").update(resto).eq("id", principaleDb);
        if (e2) throw new Error(`Ripristino interrotto sulla tabella «sedi»: ${(e2 as { message?: string }).message ?? e2}`);
      } else {
        mappaSedi.set(String(sd["id"]), String(sd["id"]));
        secondarie.push(sd);
      }
    }
    if (secondarie.length) await scrivi("sedi", secondarie, "id");
  }
  conta("sedi", sediDump.length);

  // 4. Lavoratori: stesso codice fiscale = stessa persona (si mantiene l'id già presente nel database)
  const dipDump = righeDi(dump, "dipendenti");
  const cfDiDump = new Map(dipDump.map((d) => [String(d["id"]), String(d["codice_fiscale"])]));
  if (dipDump.length) {
    const esistenti = await leggiTutto<{ id: string; codice_fiscale: string }>(() => sb.from("dipendenti").select("id, codice_fiscale").order("id"));
    const idPerCf = new Map(esistenti.map((d) => [d["codice_fiscale"], d["id"]]));
    const righe = dipDump.map((d) => {
      const { id, sede_id, ...resto } = d;
      const riga: Riga = { ...resto };
      // L'id c'è SEMPRE in tutte le righe: già presente = id del database, mancante = id del file. Se in un blocco alcune righe
      // avessero l'id e altre no, PostgREST manderebbe id = NULL alle seconde e il ripristino si fermerebbe («id» non può essere vuoto).
      riga["id"] = idPerCf.get(String(d["codice_fiscale"])) ?? id;
      const sede = sede_id ? (mappaSedi.get(String(sede_id)) ?? String(sede_id)) : null;
      if (sede) riga["sede_id"] = sede; // senza sede ci pensa il database (sede principale)
      return riga;
    });
    await scrivi("dipendenti", righe, "codice_fiscale");
  }
  conta("dipendenti", dipDump.length);

  // id lavoratore del file → id nel database (tramite codice fiscale)
  const mappaDip = new Map<string, string>();
  if (cfDiDump.size) {
    const ora = await leggiTutto<{ id: string; codice_fiscale: string }>(() => sb.from("dipendenti").select("id, codice_fiscale").order("id"));
    const idPerCf = new Map(ora.map((d) => [d["codice_fiscale"], d["id"]]));
    for (const [idDump, cf] of cfDiDump) {
      const idDb = idPerCf.get(cf);
      if (idDb) mappaDip.set(idDump, idDb);
    }
  }
  const conDip = (r: Riga): Riga => (r["dipendente_id"] ? { ...r, dipendente_id: mappaDip.get(String(r["dipendente_id"])) ?? r["dipendente_id"] } : r);

  // 5. Incarichi per sede
  const incDump = righeDi(dump, "dipendenti_ruoli");
  if (incDump.length) {
    const viste = new Set<string>();
    const righe: Riga[] = [];
    for (const r of incDump) {
      const { id: _id, ...resto } = conDip(r);
      const riga: Riga = { ...resto, ruolo_id: mappaRuoli.get(String(r["ruolo_id"])) ?? r["ruolo_id"] };
      if (r["sede_id"]) riga["sede_id"] = mappaSedi.get(String(r["sede_id"])) ?? r["sede_id"];
      const k = `${riga["dipendente_id"]}|${riga["ruolo_id"]}|${riga["sede_id"] ?? ""}`;
      if (viste.has(k)) continue;
      viste.add(k);
      righe.push(riga);
    }
    await scrivi("dipendenti_ruoli", righe, "dipendente_id,ruolo_id,sede_id");
  }
  conta("dipendenti_ruoli", incDump.length);

  // 6. Attestati, documenti, integrazioni, coda di valutazione
  for (const tabella of ["attestati_caricati", "documenti_attestati", "integrazioni_dvr"] as const) {
    const righe = righeDi(dump, tabella).map(conDip);
    if (righe.length) await scrivi(tabella, righe, "id");
    conta(tabella, righe.length);
  }
  await semplice("coda_valutazioni", "id");

  return { dipCount: conteggi["dipendenti"] ?? 0, attCount: conteggi["attestati_caricati"] ?? 0, incarichiCount: incDump.length, sediCount: sediDump.length, conteggi };
}
