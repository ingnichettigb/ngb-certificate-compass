/*
 * File:      DialogModificaAi.tsx
 * Percorso:  src/features/ai/components/DialogModificaAi.tsx
 * Finestra «Modifica dati AI».
 */
import { ExternalLink, Eye, EyeOff, Pencil } from "lucide-react";
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
import { useModificaAi } from "../hooks/useModificaAi";

export function DialogModificaAi({ m }: { m: ReturnType<typeof useModificaAi> }) {
  const {
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
    salvaModificheAi,
  } = m;

  return (
    <Dialog open={Boolean(modificaAi)} onOpenChange={(o) => !o && setModificaAi(null)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4 text-primary" /> Modifica dati AI
          </DialogTitle>
          <DialogDescription>
            Aggiorna il nome, l'indirizzo API o il nome del modello di <strong>{modificaAi?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1">
            <Label htmlFor="mod-nome">Nome visualizzato</Label>
            <Input id="mod-nome" value={formNome} onChange={(e) => setFormNome(e.target.value)} />
          </div>

          {modificaAi?.kind !== "default" && (
            <div className="space-y-1">
              <Label htmlFor="mod-url">Base URL API</Label>
              <Input id="mod-url" value={formBaseUrl} onChange={(e) => setFormBaseUrl(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="mod-modello">Nome Modello esatto</Label>
            <Input id="mod-modello" value={formModello} onChange={(e) => setFormModello(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              Se il fornitore ha cambiato o dismesso il modello, puoi inserire qui la versione aggiornata.
            </p>
          </div>

          {modificaAi?.kind !== "default" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="mod-chiave">Chiave API</Label>
                {modificaAi?.keyUrl && (
                  <a
                    href={modificaAi.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    Ottieni chiave <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="mod-chiave"
                  type={mostraFormChiave ? "text" : "password"}
                  value={formChiave}
                  onChange={(e) => setFormChiave(e.target.value)}
                  placeholder="Incolla chiave"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostraFormChiave(!mostraFormChiave)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label="Mostra o nascondi chiave"
                >
                  {mostraFormChiave ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setModificaAi(null)}>
            Annulla
          </Button>
          <Button onClick={salvaModificheAi}>Salva modifiche</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
