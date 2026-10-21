/*
 * File:      DialogElencoAi.tsx
 * Percorso:  src/features/ai/components/DialogElencoAi.tsx
 * Finestra principale «Imposta AI»: elenco dei fornitori e pulsanti generali.
 */
import { toast } from "sonner";
import { Plus, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resetAiConfig, type AIProvider, type AIConfig } from "@/lib/ai-providers";
import { CardProviderAi } from "./CardProviderAi";

export function DialogElencoAi({
  open,
  setOpen,
  config,
  testando,
  onAttiva,
  onModifica,
  onChiave,
  onTesta,
  onElimina,
  onNuova,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  config: AIConfig;
  testando: string | null;
  onAttiva: (id: string) => void;
  onModifica: (p: AIProvider) => void;
  onChiave: (p: AIProvider) => void;
  onTesta: (p: AIProvider) => void;
  onElimina: (p: AIProvider) => void;
  onNuova: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Imposta AI
          </DialogTitle>
          <DialogDescription>
            Scegli chi legge gli attestati o modifica modello, indirizzo e chiave. Le modifiche restano in questo browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <Button
            size="sm"
            onClick={onNuova}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Aggiungi nuova AI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  "Ripristinare l'elenco iniziale? Le AI personalizzate e le modifiche ai modelli verranno ripristinate.",
                )
              ) {
                resetAiConfig();
                toast.info("Elenco ripristinato");
              }
            }}
          >
            <RotateCcw className="size-3.5" /> Elenco iniziale
          </Button>
        </div>

        <div className="space-y-3 pt-1">
          {config.providers.map((p) => (
            <CardProviderAi
              key={p.id}
              p={p}
              activeId={config.activeId}
              testando={testando}
              onAttiva={onAttiva}
              onModifica={onModifica}
              onChiave={onChiave}
              onTesta={onTesta}
              onElimina={onElimina}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
