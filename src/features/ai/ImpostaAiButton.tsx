/*
 * File:      ImpostaAiButton.tsx
 * Percorso:  src/features/ai/ImpostaAiButton.tsx
 * Bottone «AI: …» nell'intestazione e finestre di gestione dei fornitori AI.
 */
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getActiveProvider, useAiConfig } from "@/lib/ai-providers";
import { DialogElencoAi } from "./components/DialogElencoAi";
import { DialogModificaAi } from "./components/DialogModificaAi";
import { DialogChiaveRapida } from "./components/DialogChiaveRapida";
import { DialogNuovaAi } from "./components/DialogNuovaAi";
import { useAzioniProvider } from "./hooks/useAzioniProvider";
import { useModificaAi } from "./hooks/useModificaAi";
import { useChiaveRapida } from "./hooks/useChiaveRapida";
import { useNuovaAi } from "./hooks/useNuovaAi";

/** Bottone "AI: …" + finestre per scegliere, aggiungere e modificare i fornitori AI. */
export function ImpostaAiButton() {
  const [config, setConfig] = useAiConfig();
  const [open, setOpen] = useState(false);
  const azioni = useAzioniProvider({ config, setConfig });
  const modifica = useModificaAi({ config, setConfig });
  const chiave = useChiaveRapida({ config, setConfig });
  const nuova = useNuovaAi({ config, setConfig });

  const attivo = getActiveProvider(config);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="size-4 text-primary" />
        <span className="hidden sm:inline">AI:</span>
        <strong className="max-w-[160px] truncate">{(attivo.name.split("–")[0] ?? "").split("(")[0]?.trim()}</strong>
      </Button>

      <DialogElencoAi
        open={open}
        setOpen={setOpen}
        config={config}
        testando={azioni.testando}
        onAttiva={azioni.attiva}
        onModifica={modifica.apriModifica}
        onChiave={chiave.apriChiaveRapida}
        onTesta={azioni.testa}
        onElimina={azioni.eliminaProvider}
        onNuova={nuova.apriNuova}
      />
      <DialogModificaAi m={modifica} />
      <DialogChiaveRapida c={chiave} />
      <DialogNuovaAi n={nuova} />
    </>
  );
}
