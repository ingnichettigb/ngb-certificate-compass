/*
 * File:      backup.ts
 * Percorso:  src/lib/api/backup.ts
 * Esportazione e importazione del database.
 */
import { supabase } from "@/integrations/supabase/client";
import { leggiTutto, sb } from "./client";

/** Esporta l'intero database in un file JSON salvato sul dispositivo. */
export async function esportaDb() {
  const [dipTutti, attTutti] = await Promise.all([
    leggiTutto(() => sb.from("dipendenti").select("*").order("id")),
    leggiTutto(() => sb.from("attestati_caricati").select("*").order("id")),
  ]);
  const dip = { data: dipTutti };
  const att = { data: attTutti };
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
    dipendenti: dip.data ?? [],
    tipi_corso: tipi.data ?? [],
    attestati_caricati: att.data ?? [],
    reparti: rep.data ?? [],
    sottoreparti: sot.data ?? [],
    categorie_corso: cat.data ?? [],
    classi_concorso: classi.data ?? [],
    materie: mat.data ?? [],
  };
  const blob = new Blob([JSON.stringify(dump, null, 2)], {
    type: "application/json",
  });
  const nome = `archivio-attestati-${new Date().toISOString().slice(0, 10)}.json`;

  const w = window as unknown as {
    showSaveFilePicker?: (o: unknown) => Promise<{
      createWritable: () => Promise<{
        write: (b: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };
  if (w.showSaveFilePicker) {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: nome,
        types: [{ description: "Backup JSON", accept: { "application/json": [".json"] } }],
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

/** Ripristina un backup JSON nel database (unisce, non cancella). */
export async function importaDb(file: File) {
  const dump = JSON.parse(await file.text());
  let dipCount = 0;
  let attCount = 0;

  if (Array.isArray(dump.tipi_corso) && dump.tipi_corso.length) {
    await supabase.from("tipi_corso").upsert(dump.tipi_corso, { onConflict: "id" });
  }
  if (Array.isArray(dump.dipendenti)) {
    for (let i = 0; i < dump.dipendenti.length; i += 200) {
      const chunk = dump.dipendenti.slice(i, i + 200);
      const { error } = await supabase
        .from("dipendenti")
        .upsert(chunk, { onConflict: "codice_fiscale" });
      if (error) throw error;
      dipCount += chunk.length;
    }
  }
  // Reparti e categorie (ignorati se le tabelle non esistono ancora)
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
    await sb
      .from("categorie_corso")
      .upsert(dump.categorie_corso, { onConflict: "macro_categoria" });
  }
  if (Array.isArray(dump.attestati_caricati)) {
    for (let i = 0; i < dump.attestati_caricati.length; i += 200) {
      const chunk = dump.attestati_caricati.slice(i, i + 200);
      const { error } = await supabase
        .from("attestati_caricati")
        .upsert(chunk, { onConflict: "id" });
      if (error) throw error;
      attCount += chunk.length;
    }
  }
  return { dipCount, attCount };
}
