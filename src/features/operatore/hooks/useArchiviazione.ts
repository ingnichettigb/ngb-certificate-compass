/*
 * File:      useArchiviazione.ts
 * Percorso:  src/features/operatore/hooks/useArchiviazione.ts
 * Archiviazione delle righe della coda nel database (dipendente, attestato, integrazione DVR).
 * Revisioni:
 *   - Rev 2 (2026-10-30 10:40): Numero attestato (automatico AAMMGG-CODICE se assente) e blocco doppioni.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { generaNumeroAttestato, pulisciCF, upsertDipendente, CARTELLA_ARCHIVIO, cartellaDipendente, creaIntegrazioneDvr } from "@/lib/api";
import { estensioneFile, nomeFileStandard } from "../nome-file";
import { riepilogo } from "../bozza-email";
import type { CodaRiga } from "../types";
import { supabase as sb } from "@/integrations/supabase/client";

export function useArchiviazione(ricarica: () => unknown) {
  const qc = useQueryClient();
  const db = sb as any;
  const [archiviando, setArchiviando] = useState(false);

  async function archivia(righe: CodaRiga[]) {
    if (!righe.length) return;
    const daSalvare = righe.filter((r) => !r.archiviato);
    if (daSalvare.length === 0) {
      toast.info("Tutti gli attestati selezionati risultano già archiviati nel database");
      return;
    }

    setArchiviando(true);
    let ok = 0;
    try {
      const { data: listaCorsi } = await sb.from("tipi_corso").select("id, codice");
      const codici = new Map<string, string | null>((listaCorsi ?? []).map((c: any) => [c.id, c.codice ?? null]));
      for (const r of daSalvare) {
        try {
          if (!r.tipo_corso_id) throw new Error(`${r.cognome}: scegli il tipo di corso`);
          if (!r.data_corso) throw new Error(`${r.cognome}: manca la data del corso`);
          const dip = await upsertDipendente({
            codice_fiscale: pulisciCF(r.codice_fiscale),
            cognome: r.cognome,
            nome: r.nome,
            email: r.email || null,
            reparto: r.reparto || null,
            sottoreparto: null,
            classe_concorso: null,
            materia: null,
            luogo_nascita: r.luogo_nascita || null,
            data_nascita: r.data_nascita || null,
            ...(r.codice_ateco ? { codice_ateco: r.codice_ateco } : {}),
          });
          const codiceCorso = r.tipo_corso_codice || codici.get(r.tipo_corso_id) || null;
          const numero = (r.numero_attestato || "").trim() || generaNumeroAttestato(r.data_corso, codiceCorso);
          const { data: gia } = await db
            .from("attestati_caricati")
            .select("id, created_at")
            .eq("dipendente_id", dip.id)
            .eq("tipo_corso_id", r.tipo_corso_id)
            .eq("data_corso", r.data_corso)
            .neq("stato_validazione", "Respinto")
            .limit(1);
          if (gia?.length) {
            const quando = new Date(gia[0].created_at).toLocaleDateString("it-IT");
            if (!window.confirm(`${r.cognome} ${r.nome}: attestato «${r.tipo_corso_nome}» del ${r.data_corso} già presente (registrato il ${quando}).\n\nRegistrarlo comunque?`)) {
              throw new Error(`${r.cognome}: attestato già presente, non registrato`);
            }
          }
          let percorsoFinale = r.percorso_file;
          if (r.percorso_file) {
            const nomeDoc = nomeFileStandard({ ...r, tipo_corso_codice: r.tipo_corso_codice || codici.get(r.tipo_corso_id) || null });
            percorsoFinale = `${CARTELLA_ARCHIVIO}/${cartellaDipendente(dip)}/${nomeDoc.replace(/\.pdf$/, `.${estensioneFile(r.mime_file)}`)}`;
            const { data: blob } = await sb.storage.from("attestati").download(r.percorso_file);
            if (blob) await sb.storage.from("attestati").upload(percorsoFinale, blob, { upsert: true, ...(r.mime_file ? { contentType: r.mime_file } : {}) });
            else percorsoFinale = r.percorso_file;
          }
          const { data: att, error } = await db.from("attestati_caricati").insert({
            dipendente_id: dip.id,
            codice_fiscale: dip.codice_fiscale,
            tipo_corso_id: r.tipo_corso_id,
            data_corso: r.data_corso,
            ore_dichiarate: r.ore,
            numero_attestato: numero,
            url_foto_fronte: percorsoFinale,
            url_foto_retro: null,
            stato_validazione: r.esito === "Non valido" ? "Respinto" : "Approvato",
            note_rifiuto: r.esito === "Valido" ? r.note || null : riepilogo(r),
            data_validazione: new Date().toISOString(),
          }).select("id").single();
          if (error) throw error;
          if (r.esito === "Valido con integrazione DVR") {
            await creaIntegrazioneDvr({
              dipendente_id: dip.id,
              attestato_origine_id: att?.id ?? null,
              tipo_corso_nome: r.tipo_corso_nome || null,
              descrizione: r.integrazione || r.note || "Integrazione DVR richiesta",
              ore: Number(r.integrazione?.match(/(\d+)\s*or/)?.[1]) || null,
              argomenti_mancanti: r.argomenti_mancanti ?? [],
            }).catch((e) => toast.error(`Integrazione DVR non registrata: ${(e as Error).message}`));
          }
          await db.from("coda_valutazioni").update({ archiviato: true, ...(percorsoFinale !== r.percorso_file ? { percorso_file: percorsoFinale } : {}) }).eq("id", r.id);
          if (r.percorso_file && percorsoFinale !== r.percorso_file && r.percorso_file.startsWith("Coda/")) {
            const { count } = await db.from("coda_valutazioni").select("id", { count: "exact", head: true }).eq("percorso_file", r.percorso_file);
            if (!count) await sb.storage.from("attestati").remove([r.percorso_file]);
          }
          ok++;
        } catch (e) {
          toast.error((e as Error).message);
        }
      }
      if (ok) toast.success(`${ok} attestat${ok === 1 ? "o archiviato" : "i archiviati"} nel database`);
      ricarica();
      qc.invalidateQueries();
    } finally {
      setArchiviando(false);
    }
  }

  return { archiviando, archivia };
}
