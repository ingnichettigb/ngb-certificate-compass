/*
 * File:      DialogChiaveRapida.tsx
 * Percorso:  src/features/ai/components/DialogChiaveRapida.tsx
 * Finestra per inserire solo la chiave di un fornitore AI.
 */
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChiaveRapida } from "../hooks/useChiaveRapida";

export function DialogChiaveRapida({ c }: { c: ReturnType<typeof useChiaveRapida> }) {
  const {
    editChiave,
    setEditChiave,
    chiaveRapida,
    setChiaveRapida,
    mostraChiaveRapida,
    setMostraChiaveRapida,
    salvaSoloChiave,
  } = c;

  return (
    <Dialog open={Boolean(editChiave)} onOpenChange={(o) => !o && setEditChiave(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chiave di accesso</DialogTitle>
          <DialogDescription>{editChiave?.name}</DialogDescription>
        </DialogHeader>
        {editChiave?.keyUrl && (
          <div className="rounded-md bg-muted p-3 text-xs">
            1. Apri il sito e accedi · 2. Crea la chiave · 3. Copiala e incollala qui sotto.
            <a
              href={editChiave.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Crea la chiave <ExternalLink className="size-3" />
            </a>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="chiave-rapida">Chiave</Label>
          <div className="relative">
            <Input
              id="chiave-rapida"
              type={mostraChiaveRapida ? "text" : "password"}
              value={chiaveRapida}
              onChange={(e) => setChiaveRapida(e.target.value)}
              placeholder="Incolla qui la chiave"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setMostraChiaveRapida(!mostraChiaveRapida)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="Mostra o nascondi chiave"
            >
              {mostraChiaveRapida ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditChiave(null)}>
            Annulla
          </Button>
          <Button onClick={salvaSoloChiave}>Salva e attiva</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
