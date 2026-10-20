/*
 * File:      azioni-file.ts
 * Percorso:  src/features/operatore/azioni-file.ts
 * Salvataggio sul computer del file allegato a una riga.
 */
import { toast } from "sonner";
import { estensioneFile, nomeFileStandard } from "./nome-file";
import type { CodaRiga } from "./types";
import { supabase as sb } from "@/integrations/supabase/client";

/** Salva sul computer il file allegato a una riga della coda. */
export async function salvaLocale(r: CodaRiga) {
  if (!r.percorso_file) return void toast.error("Nessun file allegato");
  const { data: blob, error } = await sb.storage.from("attestati").download(r.percorso_file);
  if (error || !blob) return void toast.error("Download non riuscito");
  const nome = nomeFileStandard(r).replace(/\.pdf$/, `.${estensioneFile(r.mime_file)}`);
  const w = window as any;
  try {
    if (w.showSaveFilePicker) {
      const h = await w.showSaveFilePicker({ suggestedName: nome });
      const wr = await h.createWritable();
      await wr.write(blob);
      await wr.close();
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nome;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    toast.success(`Salvato: ${nome}`);
  } catch (e) {
    if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
  }
}
