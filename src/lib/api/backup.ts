/*
 * File:      backup.ts
 * Percorso:  src/lib/api/backup.ts
 * Data creaz: 20/10/2026
 * Revisioni:
 *   rev 1 — 20/10/2026 14:00 — Esportazione e importazione database JSON.
 *   rev 2 — 26/10/2026 17:30 — Naming 030ArchAttestati_AAMMGGhhmm_ e lettura selettiva backup.
 */
import { supabase } from "@/integrations/supabase/client";
import { leggiTutto, sb } from "./client";

export const PREFISSO_BACKUP = "030ArchAttestati_";

export interface InfoFileBackup {
  nome: string;
  dataFormattata: string;
  dimensioneKb: number;
  dataCreazione: Date;
  fileHandle?: FileSystemFileHandle;
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

/** Esporta l'intero database in formato JSON salvato con il nome standard. */
export async function esportaDb() {
  const [dipTutti, attTutti] = await Promise.all([
    leggiTutto(() => sb.from("dipendenti").select("*").order("id")),
    leggiTutto(() => sb.from("attestati_caricati").select("*").order("id")),
  ]);
  const [tipi, rep, sot, cat, classi, mat] = await Promise.all([
    supabase.from("tipi_corso").select("*"),
    sb.from("reparti").select("*"),
    sb.from("sottoreparti").select("*"),
    sb.from("categorie_corso").select("*"),
    sb.from("classi_concorso").select("*"),
    sb.from("materie").select("*"),
  ]);
  const dump = {
    esportato_il: new Date().toISOString(),
    versione: 3,
    dipendenti: dipTutti ?? [],
    tipi_corso: tipi.data ?? [],
    attestati_caricati: attTutti ?? [],
    reparti: rep.data ?? [],
    sottoreparti: sot.data ?? [],
    categorie_corso: cat.data ?? [],
    classi_concorso: classi.data ?? [],
    materie: mat.data ?? [],
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const nome = generaNomeFileBackup();

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
      return dump;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
  return dump;
}

/** Ripristina un backup JSON nel database previa verifica del prefisso 030ArchAttestati_. */
export async function importaDb(file: File) {
  if (!file.name.startsWith(PREFISSO_BACKUP)) {
    throw new Error(`Il file deve iniziare con '${PREFISSO_BACKUP}'. Scelto: '${file.name}'`);
  }
  const dump = JSON.parse(await file.text());
  let dipCount = 0;
  let attCount = 0;

  if (Array.isArray(dump.tipi_corso) && dump.tipi_corso.length) {
    await supabase.from("tipi_corso").upsert(dump.tipi_corso, { onConflict: "id" });
  }
  if (Array.isArray(dump.dipendenti)) {
    for (let i = 0; i < dump.dipendenti.length; i += 200) {
      const chunk = dump.dipendenti.slice(i, i + 200);
      const { error } = await supabase.from("dipendenti").upsert(chunk, { onConflict: "codice_fiscale" });
      if (error) throw error;
      dipCount += chunk.length;
    }
  }
  if (Array.isArray(dump.reparti) && dump.reparti.length) {
    await sb.from("reparti").upsert(dump.reparti, { onConflict: "nome" });
  }
  if (Array.isArray(dump.sottoreparti) && dump.sottoreparti.length) {
    await sb.from("sottoreparti").upsert(dump.sottoreparti, { onConflict: "id" });
  }
  if (Array.isArray(dump.classi_concorso) && dump.classi_concorso.length) {
    await sb.from("classi_concorso").upsert(dump.classi_concorso, { onConflict: "codice" });
  }
  if (Array.isArray(dump.materie) && dump.materie.length) {
    await sb.from("materie").upsert(dump.materie, { onConflict: "id" });
  }
  if (Array.isArray(dump.categorie_corso) && dump.categorie_corso.length) {
    await sb.from("categorie_corso").upsert(dump.categorie_corso, { onConflict: "macro_categoria" });
  }
  if (Array.isArray(dump.attestati_caricati)) {
    for (let i = 0; i < dump.attestati_caricati.length; i += 200) {
      const chunk = dump.attestati_caricati.slice(i, i + 200);
      const { error } = await supabase.from("attestati_caricati").upsert(chunk, { onConflict: "id" });
      if (error) throw error;
      attCount += chunk.length;
    }
  }
  return { dipCount, attCount };
}
