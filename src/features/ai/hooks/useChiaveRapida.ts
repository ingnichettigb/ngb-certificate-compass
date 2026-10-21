/*
 * File:      useChiaveRapida.ts
 * Percorso:  src/features/ai/hooks/useChiaveRapida.ts
 * Inserimento rapido della sola chiave di un fornitore AI.
 */
import { useState } from "react";
import { toast } from "sonner";
import { type AIProvider, type AIConfig } from "@/lib/ai-providers";

export function useChiaveRapida({ config, setConfig }: { config: AIConfig; setConfig: (cfg: AIConfig) => void }) {
  const [editChiave, setEditChiave] = useState<AIProvider | null>(null);
  const [chiaveRapida, setChiaveRapida] = useState("");
  const [mostraChiaveRapida, setMostraChiaveRapida] = useState(false);

  /** Apre la finestra per inserire solo la chiave del fornitore. */
  function apriChiaveRapida(p: AIProvider) {
    setEditChiave(p);
    setChiaveRapida(p.apiKey);
    setMostraChiaveRapida(false);
  }

  function salvaSoloChiave() {
    if (!editChiave) return;
    const k = chiaveRapida.trim();
    setConfig({
      providers: config.providers.map((p) => (p.id === editChiave.id ? { ...p, apiKey: k } : p)),
      activeId: k ? editChiave.id : config.activeId,
    });
    toast.success(k ? "Chiave salvata e AI attivata" : "Chiave rimossa");
    setEditChiave(null);
  }

  return {
    editChiave,
    setEditChiave,
    chiaveRapida,
    setChiaveRapida,
    mostraChiaveRapida,
    setMostraChiaveRapida,
    apriChiaveRapida,
    salvaSoloChiave,
  };
}
