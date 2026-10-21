/*
 * File:      useNuovaAi.ts
 * Percorso:  src/features/ai/hooks/useNuovaAi.ts
 * Aggiunta di un nuovo fornitore AI, con precompilazioni rapide.
 */
import { useState } from "react";
import { toast } from "sonner";
import { type AIProvider, type AIConfig } from "@/lib/ai-providers";
import { TEMPLATE_RAPIDI, type TemplateAiRapido } from "../template-rapidi";

export function useNuovaAi({ config, setConfig }: { config: AIConfig; setConfig: (cfg: AIConfig) => void }) {
  const [openNuova, setOpenNuova] = useState(false);
  const [nuovoNome, setNuovoNome] = useState("");
  const [nuovaBaseUrl, setNuovaBaseUrl] = useState("https://generativelanguage.googleapis.com/v1beta/openai");
  const [nuovoModello, setNuovoModello] = useState("gemini-2.0-flash");
  const [nuovaChiave, setNuovaChiave] = useState("");
  const [linkChiaveAttuale, setLinkChiaveAttuale] = useState<string | null>("https://aistudio.google.com/app/apikey");
  const [mostraNuovaChiave, setMostraNuovaChiave] = useState(false);

  function applicaTemplate(t: TemplateAiRapido) {
    setNuovoNome(t.nome);
    setNuovaBaseUrl(t.baseUrl);
    setNuovoModello(t.model);
    setLinkChiaveAttuale(t.keyUrl);
    toast.info(`Precompilati dati per ${t.etichetta}`);
  }

  /** Apre la finestra «Aggiungi nuova AI» precompilata con il primo modello rapido. */
  function apriNuova() {
    applicaTemplate(TEMPLATE_RAPIDI[0]!);
    setOpenNuova(true);
  }

  function aggiungiNuovaAi() {
    const nome = nuovoNome.trim();
    const url = nuovaBaseUrl.trim().replace(/\/+$/, "");
    const mod = nuovoModello.trim();
    const k = nuovaChiave.trim();

    if (!nome) return void toast.error("Inserisci un nome per l'AI");
    if (!url) return void toast.error("Inserisci l'indirizzo Base URL");
    if (!mod) return void toast.error("Inserisci il nome del modello");

    const id = `custom-${Date.now()}`;
    const nuova: AIProvider = {
      id,
      name: nome,
      kind: "openai",
      baseUrl: url,
      model: mod,
      apiKey: k,
      note: "Fornitore personalizzato salvato in questo browser.",
      supportaVisione: true,
      isCustom: true,
      ...(linkChiaveAttuale ? { keyUrl: linkChiaveAttuale } : {}),
    };

    setConfig({
      providers: [...config.providers, nuova],
      activeId: k ? id : config.activeId,
    });

    toast.success(`AI "${nome}" aggiunta con successo`);
    setNuovoNome("");
    setNuovoModello("");
    setNuovaChiave("");
    setOpenNuova(false);
  }

  return {
    openNuova,
    setOpenNuova,
    nuovoNome,
    setNuovoNome,
    nuovaBaseUrl,
    setNuovaBaseUrl,
    nuovoModello,
    setNuovoModello,
    nuovaChiave,
    setNuovaChiave,
    linkChiaveAttuale,
    mostraNuovaChiave,
    setMostraNuovaChiave,
    applicaTemplate,
    apriNuova,
    aggiungiNuovaAi,
  };
}
