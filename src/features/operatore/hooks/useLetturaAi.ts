/*
 * File:      useLetturaAi.ts
 * Percorso:  src/features/operatore/hooks/useLetturaAi.ts
 * Caricamento del documento e lettura automatica dei dati con l'AI.
 */
import { useState } from "react";
import { toast } from "sonner";
import { estraiAttestato } from "@/lib/estrazione.functions";
import { getActiveProvider, useAiConfig } from "@/lib/ai-providers";
import { contaPagine, piuSimile, renderizzaPrimaPaginaPdf } from "@/lib/pdf-pagine";
import { pulisciCF } from "@/lib/api";
import { NOTA_PREDEFINITA, VUOTA } from "../types";
import type { TipoCorso } from "../types";
import { supabase as sb } from "@/integrations/supabase/client";
import type { useDocumento } from "./useDocumento";
import type { useFormRiga } from "./useFormRiga";

export function useLetturaAi({
  tipi,
  formRiga,
  documento,
}: {
  tipi: TipoCorso[];
  formRiga: ReturnType<typeof useFormRiga>;
  documento: ReturnType<typeof useDocumento>;
}) {
  const [aiConfig] = useAiConfig();
  const aiAttiva = getActiveProvider(aiConfig);
  const [lettura, setLettura] = useState(false);
  const { setForm, setIdInModifica } = formRiga;
  const { setFile, setAnteprima, setAnteprimaMime, setPagine, setTotPagine } = documento;

  async function scegliFile(f: File) {
    if (!(f.type === "application/pdf" || f.type.startsWith("image/"))) return void toast.error("Carica un PDF o una foto");
    setFile(f);
    setAnteprima(URL.createObjectURL(f));
    setAnteprimaMime(f.type);
    setIdInModifica(null);
    setForm(VUOTA);
    setPagine("");
    setTotPagine(f.type === "application/pdf" ? await contaPagine(f).catch(() => 0) : 0);
    setLettura(true);

    try {
      const accettaPdfDiretto =
        aiAttiva.kind === "default" ||
        aiAttiva.id.includes("gemini") ||
        aiAttiva.model.toLowerCase().includes("gemini");

      let payloadBase64 = "";
      let payloadMime = f.type;

      if (f.type === "application/pdf" && !accettaPdfDiretto) {
        toast.info("Conversione PDF per l'AI in uso...");
        const img = await renderizzaPrimaPaginaPdf(f);
        payloadBase64 = img.base64;
        payloadMime = img.mime;
      } else {
        const buf = await f.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
        payloadBase64 = btoa(bin);
      }

      const r = await estraiAttestato({
        data: {
          base64: payloadBase64,
          mime: payloadMime,
          nomeFile: f.name,
          tipiCorso: tipi.map((t) => t.nome_corso),
          argomenti: [],
          aiConfig: { kind: aiAttiva.kind, baseUrl: aiAttiva.baseUrl, model: aiAttiva.model, apiKey: aiAttiva.apiKey },
        },
      });

      if (!r.ok) return void toast.error(r.errore);
      const d = r.dati;
      const tipo = tipi.find((t) => t.nome_corso.toLowerCase() === d.tipo_corso.toLowerCase()) ?? piuSimile(d.tipo_corso, tipi).tipo;

      const cf = pulisciCF(d.codice_fiscale);
      const { data: esistente } = cf
        ? await sb.from("dipendenti").select("*").eq("codice_fiscale", cf).maybeSingle()
        : { data: null };

      setForm({
        ...VUOTA,
        cognome: (d.cognome || "").toUpperCase(),
        nome: (d.nome || "").toUpperCase(),
        codice_fiscale: cf,
        data_nascita: d.data_nascita || "",
        luogo_nascita: d.luogo_nascita || "",
        codice_ateco: d.codice_ateco || esistente?.codice_ateco || "",
        email: esistente?.email ?? "",
        reparto: esistente?.reparto ?? "",
        tipo_corso_id: tipo?.id ?? null,
        tipo_corso_nome: tipo?.nome_corso ?? d.tipo_corso,
        data_corso: d.data_corso,
        ore: d.ore,
        ente: d.ente,
        argomenti: d.argomenti,
        esito: d.valutazione,
        note: d.motivazione || NOTA_PREDEFINITA,
        integrazione: "",
      });
      toast.success(esistente ? "Dati estratti (dipendente già presente)" : "Dati estratti con successo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLettura(false);
    }
  }

  return { aiAttiva, lettura, scegliFile };
}
