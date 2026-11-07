/*
 * File:      cartelle-risoluzione.ts
 * Percorso:  src/lib/api/cartelle-risoluzione.ts
 * Data creaz: 07/11/2026
 * Revisioni:
 *   rev 1 — 07/11/2026 — Estratto da cartelle-multiple.ts: risoluzione del documento di un attestato. Nessun cambio di comportamento.
 */
import { supabase } from "@/integrations/supabase/client";
import { recuperaFileDaPercorsoInTutte } from "./cartelle-apertura";

export type RisoluzioneDocumento = {
  url: string | null;
  tipo: "locale" | "storage" | "mancante";
  isPdf: boolean;
  nomeFile: string;
  percorsoOriginale: string;
  sorgente?: "locale" | "storage" | "non_trovato";
};

export async function risolviDocumentoAttestato(
  percorso: string | null | undefined,
): Promise<RisoluzioneDocumento> {
  const r = await risolviInterno(percorso);
  return { ...r, sorgente: r.tipo === "mancante" ? "non_trovato" : r.tipo };
}

async function risolviInterno(
  percorso: string | null | undefined,
): Promise<RisoluzioneDocumento> {
  const percorsoPulito = (percorso || "").trim();
  const nomeFile = percorsoPulito.replace(/\\/g, "/").split("/").pop() || percorsoPulito;
  const isPdf = nomeFile.toLowerCase().endsWith(".pdf") || percorsoPulito.toLowerCase().includes(".pdf");

  if (!percorsoPulito) {
    return {
      url: null,
      tipo: "mancante",
      isPdf: false,
      nomeFile: "",
      percorsoOriginale: "",
    };
  }

  if (percorsoPulito.startsWith("Archivio Attestati/") || percorsoPulito.startsWith("Coda/")) {
    try {
      const { data } = await supabase.storage.from("attestati").createSignedUrl(percorsoPulito, 3600);
      if (data?.signedUrl) {
        return {
          url: data.signedUrl,
          tipo: "storage",
          isPdf,
          nomeFile,
          percorsoOriginale: percorsoPulito,
        };
      }
    } catch {
      /* Continua con fallback locale */
    }
  }

  const fileLocale = await recuperaFileDaPercorsoInTutte(percorsoPulito);
  if (fileLocale) {
    const urlBlob = URL.createObjectURL(fileLocale);
    return {
      url: urlBlob,
      tipo: "locale",
      isPdf,
      nomeFile,
      percorsoOriginale: percorsoPulito,
    };
  }

  return {
    url: null,
    tipo: "mancante",
    isPdf,
    nomeFile,
    percorsoOriginale: percorsoPulito,
  };
}
