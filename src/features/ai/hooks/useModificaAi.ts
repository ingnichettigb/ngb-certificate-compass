/*
 * File:      useModificaAi.ts
 * Percorso:  src/features/ai/hooks/useModificaAi.ts
 * Modifica completa di un fornitore AI: nome, indirizzo, modello e chiave.
 */
import { useState } from "react";
import { toast } from "sonner";
import { type AIProvider, type AIConfig } from "@/lib/ai-providers";

export function useModificaAi({ config, setConfig }: { config: AIConfig; setConfig: (cfg: AIConfig) => void }) {
  const [modificaAi, setModificaAi] = useState<AIProvider | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formModello, setFormModello] = useState("");
  const [formChiave, setFormChiave] = useState("");
  const [mostraFormChiave, setMostraFormChiave] = useState(false);

  function apriModifica(p: AIProvider) {
    setModificaAi(p);
    setFormNome(p.name);
    setFormBaseUrl(p.baseUrl);
    setFormModello(p.model);
    setFormChiave(p.apiKey);
    setMostraFormChiave(false);
  }

  function salvaModificheAi() {
    if (!modificaAi) return;
    const nome = formNome.trim();
    const url = formBaseUrl.trim().replace(/\/+$/, "");
    const mod = formModello.trim();
    const key = formChiave.trim();

    if (!nome) return void toast.error("Il nome non può essere vuoto");
    if (!url && modificaAi.kind !== "default") return void toast.error("L'URL Base non può essere vuoto");
    if (!mod) return void toast.error("Il nome del modello non può essere vuoto");

    setConfig({
      ...config,
      providers: config.providers.map((p) =>
        p.id === modificaAi.id
          ? {
              ...p,
              name: nome,
              baseUrl: url,
              model: mod,
              apiKey: key,
            }
          : p,
      ),
    });

    toast.success(`Dati di "${nome}" aggiornati con successo`);
    setModificaAi(null);
  }

  return {
    modificaAi,
    setModificaAi,
    formNome,
    setFormNome,
    formBaseUrl,
    setFormBaseUrl,
    formModello,
    setFormModello,
    formChiave,
    setFormChiave,
    mostraFormChiave,
    setMostraFormChiave,
    apriModifica,
    salvaModificheAi,
  };
}
