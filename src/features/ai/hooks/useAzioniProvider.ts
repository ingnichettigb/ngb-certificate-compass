/*
 * File:      useAzioniProvider.ts
 * Percorso:  src/features/ai/hooks/useAzioniProvider.ts
 * Azioni sull'elenco dei fornitori AI: attiva, elimina, testa.
 */
import { useState } from "react";
import { toast } from "sonner";
import { type AIProvider, type AIConfig } from "@/lib/ai-providers";
import { testaFornitoreAi } from "@/lib/ai-test.functions";

export function useAzioniProvider({ config, setConfig }: { config: AIConfig; setConfig: (cfg: AIConfig) => void }) {
  const [testando, setTestando] = useState<string | null>(null);

  function attiva(id: string) {
    setConfig({ ...config, activeId: id });
    toast.success(`AI attiva: ${config.providers.find((p) => p.id === id)?.name}`);
  }

  function eliminaProvider(p: AIProvider) {
    if (!p.isCustom) return;
    if (!confirm(`Vuoi davvero eliminare l'AI "${p.name}"?`)) return;

    const nuoviProviders = config.providers.filter((item) => item.id !== p.id);
    const nuovoActiveId = config.activeId === p.id ? "lovable-default" : config.activeId;

    setConfig({
      providers: nuoviProviders,
      activeId: nuovoActiveId,
    });

    toast.info(`AI "${p.name}" eliminata`);
  }

  async function testa(p: AIProvider) {
    if (p.kind === "default") return void toast.success("L'AI integrata è sempre configurata.");
    setTestando(p.id);
    const r = await testaFornitoreAi({ data: { baseUrl: p.baseUrl, model: p.model, apiKey: p.apiKey } }).catch(
      (e: Error) => ({ ok: false, messaggio: e.message }),
    );
    setTestando(null);
    if (r.ok) toast.success(r.messaggio);
    else toast.error(r.messaggio);
  }

  return { testando, attiva, eliminaProvider, testa };
}
