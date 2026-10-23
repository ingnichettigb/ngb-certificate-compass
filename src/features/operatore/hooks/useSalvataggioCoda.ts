/*
 * File:      useSalvataggioCoda.ts
 * Percorso:  src/features/operatore/hooks/useSalvataggioCoda.ts
 * Salvataggio in coda, modifica, duplicazione ed eliminazione delle righe.
 */
import { useState } from "react";
import { toast } from "sonner";
import { estraiPagine, parsePagine } from "@/lib/pdf-pagine";
import { estensioneFile, nomeFileStandard } from "../nome-file";
import { VUOTA } from "../types";
import type { CodaRiga, Riga } from "../types";
import { supabase as sb } from "@/integrations/supabase/client";
import type { useDocumento } from "./useDocumento";
import type { useFormRiga } from "./useFormRiga";

export function useSalvataggioCoda({
  formRiga,
  documento,
  righeCoda,
  ricarica,
  archivia,
  nuovo,
}: {
  formRiga: ReturnType<typeof useFormRiga>;
  documento: ReturnType<typeof useDocumento>;
  righeCoda: CodaRiga[];
  ricarica: () => unknown;
  archivia: (righe: CodaRiga[]) => Promise<void>;
  nuovo: () => void;
}) {
  const db = sb as any;
  const [salvando, setSalvando] = useState(false);
  const { form, setForm, idInModifica, setIdInModifica } = formRiga;
  const { file, setFile, setAnteprima, setAnteprimaMime, pagine, setPagine, totPagine, setTotPagine } = documento;

  async function salvaInCoda(archiviaSubito: boolean) {
    if (!form.cognome || !form.codice_fiscale) return void toast.error("Servono almeno cognome e codice fiscale");
    if (form.esito === "Non valido" && !form.note.trim()) return void toast.error("Indica il motivo del rifiuto nelle note");
    setSalvando(true);
    try {
      let percorso: string | null = idInModifica ? righeCoda.find((r) => r.id === idInModifica)?.percorso_file ?? null : null;
      let mime: string | null = idInModifica ? righeCoda.find((r) => r.id === idInModifica)?.mime_file ?? null : null;
      if (file) {
        let blob: Blob = file;
        mime = file.type;
        if (file.type === "application/pdf" && pagine.trim() && totPagine > 0) {
          const idx = parsePagine(pagine, totPagine).map((n) => n - 1);
          if (idx.length) blob = await estraiPagine(file, idx);
        }
        percorso = `Coda/${crypto.randomUUID()}.${estensioneFile(mime)}`;
        const { error } = await sb.storage.from("attestati").upload(percorso, blob, { contentType: mime });
        if (error) throw error;
      }
      const { file_blob: _b, nome_file_originale: _n, pagine_salvate: _p, tipo_corso_codice: _c, ...dati } = form as Riga;
      const payload = {
        ...dati,
        data_nascita: dati.data_nascita || null,
        data_corso: dati.data_corso || null,
        percorso_file: percorso,
        mime_file: mime,
        nome_file: nomeFileStandard(form).replace(/\.pdf$/, `.${estensioneFile(mime)}`),
      };
      const res = idInModifica
        ? await db.from("coda_valutazioni").update(payload).eq("id", idInModifica).select().single()
        : await db.from("coda_valutazioni").insert(payload).select().single();
      if (res.error) throw res.error;
      if (archiviaSubito) await archivia([{ ...VUOTA, ...res.data } as CodaRiga]);
      else toast.success(idInModifica ? "Valutazione aggiornata" : "Aggiunto alla coda di lavoro");
      nuovo();
      ricarica();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function modifica(r: CodaRiga) {
    const base = { ...VUOTA } as Record<string, unknown>;
    for (const k of Object.keys(VUOTA)) base[k] = (r as any)[k] ?? (VUOTA as any)[k];
    setForm(base as Omit<Riga, "id">);
    setIdInModifica(r.id);
    setFile(null);
    setPagine("");
    setTotPagine(0);
    setAnteprimaMime(r.mime_file);
    setAnteprima(r.percorso_file ? (await sb.storage.from("attestati").createSignedUrl(r.percorso_file, 3600)).data?.signedUrl ?? null : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function duplica(r: CodaRiga) {
    const { id: _i, created_at: _c, updated_at: _u, ...resto } = r as any;
    const { error } = await db.from("coda_valutazioni").insert({ ...resto, archiviato: false, inviato: false, tipo_corso_id: null, tipo_corso_nome: "" });
    if (error) return void toast.error(error.message);
    toast.success("Riga duplicata: scegli il secondo corso con la matita");
    ricarica();
  }

  async function cancella(r: CodaRiga) {
    if (!window.confirm(`Eliminare dalla coda ${r.cognome} ${r.nome} — ${r.tipo_corso_nome}?`)) return;
    const altri = righeCoda.filter((x) => x.id !== r.id && x.percorso_file === r.percorso_file);
    if (r.percorso_file && !altri.length && !r.archiviato) await sb.storage.from("attestati").remove([r.percorso_file]);
    await db.from("coda_valutazioni").delete().eq("id", r.id);
    ricarica();
  }

  return { salvando, salvaInCoda, modifica, duplica, cancella };
}
